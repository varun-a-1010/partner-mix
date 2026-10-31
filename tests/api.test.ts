import { createPairReport } from '../server/partnership';
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Candidate, Comparison, WorkspaceView } from '../shared/model';
import { omitUncompared } from '../server/workflow';
import { buildApp } from '../server/app';
import { FileStore } from '../server/store';
import type { Qloo } from '../server/qloo';
import { legacyWorkspace } from './legacy-fixture';
import { attachTestStrategy, mockAnalyst } from './brand-fixture';

const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn();
});
async function setup(qloo?: Qloo) {
  const dir = await mkdtemp(join(tmpdir(), 'partner-mix-test-'));
  cleanups.push(() => rm(dir, { recursive: true, force: true }));
  const store = new FileStore(dir),
    app = await buildApp(store, { qloo, analyst: mockAnalyst() });
  cleanups.push(() => app.close());
  const headers = { host: 'localhost:5193', origin: 'http://localhost:5193' };
  const created = await app.inject({
    method: 'POST',
    url: '/api/workspaces',
    headers,
    payload: { demo: false },
  });
  const original = (await store.get(created.json<WorkspaceView>().id))!;
  const fixture = legacyWorkspace().workspace;
  attachTestStrategy(fixture);
  await store.create({ ...fixture, id: original.id, ownerHash: original.ownerHash });
  const cookie = created.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const w = (
    await app.inject({ url: `/api/w/${original.id}`, headers: { ...headers, cookie } })
  ).json<WorkspaceView>();
  return { app, store, w, headers: { ...headers, cookie }, dir, created };
}
describe('qloo omissions during discovery', () => {
  it('leaves out a discovered partner Qloo did not compare, but keeps the planner choices', () => {
    const candidate = (id: string) => ({ id, name: id, kind: 'artist' }) as Candidate;
    const comparison = {
      kind: 'artist',
      candidateIds: ['kept', 'omitted', 'mine'],
      results: [{ candidateId: 'kept' }],
    } as Comparison;
    const w = { candidates: ['kept', 'omitted', 'mine'].map(candidate) };
    expect(omitUncompared(w, [comparison], new Set(['kept', 'omitted']))).toEqual(['omitted']);
    expect(w.candidates.map((c) => c.id)).toEqual(['kept', 'mine']);
    expect(comparison.candidateIds).toEqual(['kept', 'mine']);
  });
});
describe('behind the local proxy', () => {
  it('limits each forwarded client separately', async () => {
    const { app, headers } = await setup();
    const create = (client: string) =>
      app.inject({
        method: 'POST',
        url: '/api/workspaces',
        headers: { ...headers, 'x-forwarded-for': client },
        payload: { demo: false },
      });
    for (let i = 0; i < 12; i++) expect((await create('203.0.113.1')).statusCode).toBe(201);
    expect((await create('203.0.113.1')).statusCode).toBe(429);
    expect((await create('203.0.113.2')).statusCode).toBe(201);
  });
});
describe('private campaign API', () => {
  it('requires the campaign cookie, removes server secrets and persists across reads', async () => {
    const { app, w, headers, store, created, dir } = await setup();
    expect(created.statusCode).toBe(201);
    expect(created.body).not.toContain('ownerHash');
    expect(created.headers['set-cookie']).toContain('HttpOnly');
    expect((await app.inject({ url: `/api/w/${w.id}` })).statusCode).toBe(404);
    const response = await app.inject({ url: `/api/w/${w.id}`, headers });
    expect(response.json().brief.campaign).toBe(w.brief.campaign);
    expect((await store.get(w.id))?.ownerHash.length).toBe(64);
    expect((await stat(join(dir, `${w.id}.json`))).mode & 0o777).toBe(0o600);
    expect((await new FileStore(dir).get(w.id))?.candidates).toHaveLength(8);
  });
  it('checks origins and accepts the browser host preserved by the Vite proxy', async () => {
    const { app, w, headers } = await setup();
    for (const origin of ['https://other.example', undefined]) {
      const requestHeaders: Record<string, string> = { ...headers };
      if (origin) requestHeaders.origin = origin;
      else delete requestHeaders.origin;
      const result = await app.inject({
        method: 'PATCH',
        url: `/api/w/${w.id}/brief`,
        headers: requestHeaders,
        payload: { version: w.version, brief: w.brief },
      });
      expect(result.statusCode).toBe(403);
    }
    const result = await app.inject({
      method: 'PATCH',
      url: `/api/w/${w.id}/brief`,
      headers,
      payload: { version: w.version, brief: w.brief },
    });
    expect(result.statusCode).toBe(200);
  });
  it('rejects stale writes and invalid dates without changing saved data', async () => {
    const { app, w, headers, store } = await setup();
    const patch = (version: number, brief: unknown) =>
      app.inject({
        method: 'PATCH',
        url: `/api/w/${w.id}/brief`,
        headers,
        payload: { version, brief },
      });
    expect((await patch(w.version, { ...w.brief, start: '2026-02-30' })).statusCode).toBe(400);
    expect((await patch(w.version, { ...w.brief, campaign: 'Changed' })).statusCode).toBe(200);
    expect((await patch(w.version, w.brief)).statusCode).toBe(409);
    expect((await store.get(w.id))?.brief.campaign).toBe('Changed');
  });
  it('does not relabel old amounts by changing currency', async () => {
    const { app, w, headers } = await setup();
    const r = await app.inject({
      method: 'PATCH',
      url: `/api/w/${w.id}/brief`,
      headers,
      payload: { version: w.version, brief: { ...w.brief, currency: 'EUR' } },
    });
    expect(r.statusCode).toBe(422);
  });
  it('keeps the previous decision and a revision receipt when the mix changes', async () => {
    const { app, w, headers } = await setup();
    let current = w;
    async function mutate(
      path: string,
      payload: Record<string, unknown>,
      method: 'POST' | 'PATCH' = 'POST',
    ) {
      const r = await app.inject({
        method,
        url: `/api/w/${w.id}${path}`,
        headers,
        payload: { ...payload, version: current.version },
      });
      expect(r.statusCode, r.body).toBe(200);
      current = r.json();
    }
    await mutate('/select', { packageId: current.planning.options[0].id });
    expect(current.selectionStale).toBe(false);
    const old = current.selection!.package;
    const anchor = current.candidates[0],
      artist = current.candidates[5];
    await mutate(`/candidates/${anchor.id}`, { locked: true }, 'PATCH');
    await mutate(
      `/candidates/${artist.id}`,
      { offer: { ...artist.offer, amount: 400_000 } },
      'PATCH',
    );
    expect(current.selectionStale).toBe(true);
    await mutate('/select', { packageId: current.planning.options[0].id });
    expect(current.revision?.retained).toContain(anchor.id);
    expect(current.revision?.removed).toContain(artist.id);
    expect(current.revision?.previous.package).toEqual(old);
    expect(current.selectionStale).toBe(false);
    const exported = await app.inject({ url: `/api/w/${w.id}/brief.md`, headers });
    expect(exported.body).toContain('Fictional sample');
    expect(exported.headers['content-disposition']).toContain('attachment');
    expect((await app.inject({ url: `/api/w/${w.id}/brief.md` })).statusCode).toBe(404);
  });
  it('never sends fictional sample IDs to Qloo', async () => {
    let calls = 0;
    const { app, w, headers } = await setup({
      status: 'configured',
      partnership: async () => {
        throw new Error('Unused pair request');
      },
      demographics: async () => [],
      search: async () => {
        calls++;
        return [];
      },
      insights: async () => {
        calls++;
        throw new Error('Should not run');
      },
    });
    const r = await app.inject({
      method: 'POST',
      url: `/api/w/${w.id}/compare`,
      headers,
      payload: { version: w.version, discover: true },
    });
    expect(r.statusCode).toBe(400);
    expect(calls).toBe(0);
  });
  it('discards a provider result if the user edits during the request', async () => {
    let started!: () => void, release!: () => void;
    const begun = new Promise<void>((r) => {
      started = r;
    });
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const qloo: Qloo = {
      status: 'configured',
      partnership: async () => {
        throw new Error('Unused pair request');
      },
      demographics: async () => [],
      search: async () => [],
      insights: async (kind, seedIds, ids = []) => {
        started();
        await gate;
        return {
          id: randomUUID(),
          fetchedAt: new Date().toISOString(),
          seedIds,
          results: ids.map((entityId, i) => ({
            entity: { entityId, kind, name: 'Provider partner', description: '' },
            rank: i + 1,
            contributingSeedIds: [],
          })),
        };
      },
    };
    const { app, w, headers, store } = await setup(qloo);
    await store.update(w.id, w.version, (current) => {
      current.demo = false;
    });
    const pending = app
      .inject({
        method: 'POST',
        url: `/api/w/${w.id}/compare`,
        headers,
        payload: { version: 2, discover: false },
      })
      .then((r) => r);
    await begun;
    await store.update(w.id, 2, (current) => {
      current.brief.campaign = 'Edited while comparing';
    });
    release();
    const response = await pending;
    expect(response.statusCode).toBe(409);
    const saved = await store.get(w.id);
    expect(saved?.brief.campaign).toBe('Edited while comparing');
    expect(saved?.evidence?.comparisons[0].source).toBe('sample');
    expect(saved?.version).toBe(3);
  });
  it('persists private audience context without changing package order or accepting unowned requests', async () => {
    const qloo: Qloo = {
      status: 'configured',
      partnership: async () => {
        throw new Error('Unused pair request');
      },
      search: async () => [],
      insights: async () => {
        throw new Error('unused');
      },
      demographics: async (ids) =>
        ids.map((entityId) => ({
          entityId,
          status: 'available',
          age: { '55_and_older': 0.4 },
          gender: {},
          fetchedAt: '2026-10-30T00:00:00Z',
          request: {
            path: '/v2/insights',
            params: {
              'filter.type': 'urn:demographics',
              'signal.interests.entities': ids.join(','),
            },
          },
        })),
    };
    const { app, w, headers, store } = await setup(qloo);
    const ready = await store.update(w.id, w.version, (current) => {
      current.demo = false;
    });
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/w/${w.id}/audience`,
          headers: { host: headers.host, origin: headers.origin },
          payload: { version: ready.version },
        })
      ).statusCode,
    ).toBe(404);
    const before = (await app.inject({ url: `/api/w/${w.id}`, headers })).json<WorkspaceView>();
    const response = await app.inject({
      method: 'POST',
      url: `/api/w/${w.id}/audience`,
      headers,
      payload: { version: ready.version },
    });
    expect(response.statusCode).toBe(200);
    const after = response.json<WorkspaceView>();
    expect(after.audience?.profiles.length).toBeGreaterThan(0);
    expect(after.audience?.subject).toBeUndefined();
    expect(after.audience?.subjectNote).toContain('unambiguously');
    expect(after.planning).toEqual(before.planning);
    expect((await store.get(w.id))?.audience).toEqual(after.audience);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/w/${w.id}/audience`,
          headers,
          payload: { version: ready.version },
        })
      ).statusCode,
    ).toBe(409);
  });
  it('explores only a campaign partner, persists receipts, and rejects stale or unowned requests', async () => {
    const qloo: Qloo = {
      status: 'configured',
      search: async () => [],
      insights: async () => {
        throw new Error('unused');
      },
      demographics: async () => [],
      partnership: async (a, b, options) =>
        createPairReport(
          async () => ({
            data: { results: { tags: [], entities: [] } },
            fetchedAt: '2026-10-30T00:00:00Z',
          }),
          a,
          b,
          options,
        ),
    };
    const { app, w, headers, store } = await setup(qloo);
    const ready = await store.update(w.id, w.version, (current) => {
      current.demo = false;
      current.audience = {
        subject: { id: randomUUID().toUpperCase(), name: current.brief.brand },
        profiles: [],
      };
    });
    const partnerId = ready.candidates.find((c) => c.entityId)!.entityId!;
    const payload = { version: ready.version, partnerId, options: { includeHeatmap: false } };
    const path = `/api/w/${w.id}/partnership`;
    expect(
      (
        await app.inject({
          method: 'POST',
          url: path,
          headers: { host: headers.host, origin: headers.origin },
          payload,
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: path,
          headers,
          payload: { ...payload, partnerId: randomUUID() },
        })
      ).statusCode,
    ).toBe(404);
    const response = await app.inject({ method: 'POST', url: path, headers, payload });
    expect(response.statusCode).toBe(200);
    const next = response.json<WorkspaceView>();
    const report = next.partnerships?.[partnerId.toUpperCase()];
    expect(report?.ledger).toHaveLength(6);
    expect(report?.a.id).toBe(ready.audience?.subject?.id);
    expect(next.candidates).toEqual(ready.candidates);
    expect(next.evidence).toEqual(ready.evidence);
    expect((await store.get(w.id))?.partnerships).toEqual(next.partnerships);
    expect((await app.inject({ method: 'POST', url: path, headers, payload })).statusCode).toBe(
      409,
    );
  });
});
