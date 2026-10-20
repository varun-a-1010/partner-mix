import Fastify, { type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import { randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import { briefSchema, entitySchema, offerSchema, versionSchema } from '../shared/validation';
import { emptyOffer, seedKinds, type StoredWorkspace, type WorkspaceView } from '../shared/model';
import { hash, newWorkspace, sameHash } from './data';
import { AppError, FileStore } from './store';
import { createQloo, type Qloo } from './qloo';
import { exportBrief, inputFingerprint, solve } from './solver';
import { runComparison } from './workflow';

const idOf = (r: FastifyRequest) => (r.params as { id: string }).id;
const cookieName = (id: string) => `pm_${id.replaceAll('-', '')}`;
const versionBody = z.object({ version: versionSchema });
export async function buildApp(
  store: FileStore,
  options: {
    qloo?: Qloo;
    origin?: string;
    production?: boolean;
    staticRoot?: string;
  } = {},
) {
  if (options.production && !options.origin)
    throw new Error('APP_ORIGIN is required in production.');
  const qloo = options.qloo ?? createQloo();
  const active = new Set<string>();
  const app = Fastify({ logger: false, bodyLimit: 32_768, trustProxy: false });
  await app.register(cookie);
  await app.register(rateLimit, { max: 180, timeWindow: '1 minute' });
  app.addHook('onRequest', async (request, reply) => {
    reply
      .header('Referrer-Policy', 'no-referrer')
      .header('X-Content-Type-Options', 'nosniff')
      .header('X-Frame-Options', 'DENY');
    if (request.url.startsWith('/api')) reply.header('Cache-Control', 'no-store');
    if (options.production)
      reply.header(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
      );
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const allowed = options.origin ?? `${request.protocol}://${request.headers.host}`;
      if (request.headers.origin !== allowed)
        throw new AppError(403, 'Open Partner Mix directly and try again.');
    }
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError)
      return reply.code(error.statusCode).send({ error: error.message });
    if (error instanceof ZodError)
      return reply.code(400).send({ error: error.issues.map((i) => i.message).join(' ') });
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return reply.code(status).send({
      error:
        status === 429
          ? 'Too many requests. Try again shortly.'
          : 'The request could not be completed. Your saved campaign is unchanged.',
    });
  });
  function view(w: StoredWorkspace): WorkspaceView {
    const { ownerHash: _secret, ...workspace } = w;
    return {
      ...workspace,
      provider: qloo.status,
      planning: solve(workspace),
      selectionStale: !!w.selection && w.selection.inputFingerprint !== inputFingerprint(w),
    };
  }
  async function owner(r: FastifyRequest) {
    const id = idOf(r);
    const w = await store.get(id);
    const secret = r.cookies[cookieName(id)];
    if (!w || !secret || !sameHash(w.ownerHash, hash(secret)))
      throw new AppError(404, 'This campaign is not available in this browser.');
    return w;
  }
  async function mutate(r: FastifyRequest, change: (w: StoredWorkspace) => void) {
    await owner(r);
    const { version } = versionBody.parse(r.body);
    return view(await store.update(idOf(r), version, change));
  }
  app.get('/api/health', async () => ({ ok: true, qloo: qloo.status }));
  app.post(
    '/api/workspaces',
    { config: { rateLimit: { max: 12, timeWindow: '1 hour' } } },
    async (r, reply) => {
      const { demo } = z.object({ demo: z.boolean().default(false) }).parse(r.body);
      const { workspace, secret } = newWorkspace(demo);
      await store.create(workspace);
      reply.setCookie(cookieName(workspace.id), secret, {
        httpOnly: true,
        sameSite: 'strict',
        secure: options.origin?.startsWith('https://') ?? false,
        path: '/api',
        maxAge: 60 * 60 * 24 * 90,
      });
      return reply.code(201).send(view(workspace));
    },
  );
  app.get('/api/w/:id', async (r) => view(await owner(r)));
  app.patch('/api/w/:id/brief', async (r) => {
    const { brief } = z.object({ brief: briefSchema }).parse(r.body);
    return mutate(r, (w) => {
      if (brief.currency !== w.brief.currency && w.selection)
        throw new AppError(422, 'Start a new campaign to change currency after choosing a mix.');
      if (brief.currency !== w.brief.currency && w.candidates.some((c) => c.offer.amount !== null))
        throw new AppError(
          422,
          'Clear partner amounts before changing currency. Values are never converted automatically.',
        );
      w.brief = brief;
    });
  });
  app.post(
    '/api/w/:id/search',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (r) => {
      const w = await owner(r);
      if (w.demo) throw new AppError(400, 'Start a real campaign to use live entity search.');
      const { query, kind } = z
        .object({ query: z.string().trim().min(2).max(160), kind: z.enum(seedKinds) })
        .parse(r.body);
      return { entities: await qloo.search(query, kind) };
    },
  );
  app.post('/api/w/:id/candidates', async (r) => {
    const input = z
      .object({
        name: z.string().trim().min(1).max(200),
        kind: z.enum(['artist', 'podcast']),
        entity: entitySchema.optional(),
      })
      .parse(r.body);
    return mutate(r, (w) => {
      if (w.candidates.length >= 24) throw new AppError(422, 'Keep the shortlist to 24 partners.');
      if (input.entity && input.entity.kind !== input.kind)
        throw new AppError(400, 'Partner type does not match the entity.');
      if (input.entity && w.candidates.some((c) => c.entityId === input.entity!.entityId))
        throw new AppError(422, 'This partner is already on the shortlist.');
      w.candidates.push({
        id: randomUUID(),
        name: input.entity?.name ?? input.name,
        kind: input.kind,
        description: input.entity?.description ?? '',
        entityId: input.entity?.entityId,
        source: input.entity ? 'qloo' : 'manual',
        locked: false,
        excluded: false,
        offer: emptyOffer(),
      });
    });
  });
  app.patch('/api/w/:id/candidates/:candidate', async (r) => {
    const input = z
      .object({
        offer: offerSchema.optional(),
        locked: z.boolean().optional(),
        excluded: z.boolean().optional(),
        entity: entitySchema.optional(),
      })
      .parse(r.body);
    return mutate(r, (w) => {
      const c = w.candidates.find((c) => c.id === (r.params as { candidate: string }).candidate);
      if (!c) throw new AppError(404, 'Partner not found.');
      if (input.offer) c.offer = input.offer;
      if (input.locked !== undefined) c.locked = input.locked;
      if (input.excluded !== undefined) c.excluded = input.excluded;
      if (input.entity) {
        if (w.demo) throw new AppError(400, 'Sample entities cannot be relinked to live partners.');
        if (input.entity.kind !== c.kind)
          throw new AppError(400, 'Partner type does not match the entity.');
        if (
          w.candidates.some(
            (other) => other.id !== c.id && other.entityId === input.entity!.entityId,
          )
        )
          throw new AppError(422, 'This Qloo entity is already on the shortlist.');
        c.entityId = input.entity.entityId;
        c.name = input.entity.name;
        c.description = input.entity.description;
        c.source = 'qloo';
      }
    });
  });
  app.delete('/api/w/:id/candidates/:candidate', async (r) =>
    mutate(r, (w) => {
      const id = (r.params as { candidate: string }).candidate;
      if (w.candidates.find((c) => c.id === id)?.locked)
        throw new AppError(422, 'Unlock this partner before removing them.');
      w.candidates = w.candidates.filter((c) => c.id !== id);
    }),
  );
  app.post(
    '/api/w/:id/compare',
    { config: { rateLimit: { max: 6, timeWindow: '1 minute' } } },
    async (r) => {
      const w = await owner(r);
      const { version, discover } = versionBody
        .extend({ discover: z.boolean().default(false) })
        .parse(r.body);
      if (w.version !== version)
        throw new AppError(409, 'The campaign changed. Reload before comparing.');
      if (active.has(w.id))
        throw new AppError(409, 'A comparison is already running for this campaign.');
      active.add(w.id);
      try {
        const result = await runComparison(w, qloo, discover);
        return view(
          await store.update(w.id, version, (current) => {
            current.candidates = result.candidates;
            current.evidence = result.evidence;
            current.run = result.run;
          }),
        );
      } finally {
        active.delete(w.id);
      }
    },
  );
  app.post('/api/w/:id/select', async (r) => {
    const { packageId } = z.object({ packageId: z.string().min(1).max(30) }).parse(r.body);
    return mutate(r, (w) => {
      const p = solve(w).options.find((p) => p.id === packageId);
      if (!p) throw new AppError(409, 'This option changed. Choose a current package.');
      const old = w.selection;
      w.selection = {
        package: p,
        partners: w.candidates.filter((c) => p.partnerIds.includes(c.id)),
        brief: structuredClone(w.brief),
        evidence: structuredClone(w.evidence),
        chosenAt: new Date().toISOString(),
        inputFingerprint: inputFingerprint(w),
      };
      if (old)
        w.revision = {
          previous: old,
          added: p.partnerIds.filter((id) => !old.package.partnerIds.includes(id)),
          removed: old.package.partnerIds.filter((id) => !p.partnerIds.includes(id)),
          retained: p.partnerIds.filter((id) => old.package.partnerIds.includes(id)),
          costChange: p.total - old.package.total,
        };
    });
  });
  app.get('/api/w/:id/brief.md', async (r, reply) => {
    const w = await owner(r);
    return reply
      .type('text/markdown; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="partner-mix-decision.md"')
      .send(exportBrief(w));
  });
  if (options.staticRoot) {
    await app.register(staticFiles, { root: options.staticRoot });
    app.setNotFoundHandler((r, reply) =>
      r.url.startsWith('/api') || !['GET', 'HEAD'].includes(r.method)
        ? reply.code(404).send({ error: 'Not found.' })
        : reply.sendFile('index.html'),
    );
  }
  return app;
}
