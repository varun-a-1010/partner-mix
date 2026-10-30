import { createPairReport } from './partnership';
import type { PairEntity, PairOptions, PairReport } from '../shared/partnership';
import { parseDemographics } from './audience';
import type { AudienceProfile } from '../shared/audience';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Entity, SeedKind, PartnerKind } from '../shared/model';
import { AppError } from './store';

export const QLOO_ORIGIN = 'https://hackathon.api.qloo.com';
export type Insight = {
  id: string;
  fetchedAt: string;
  seedIds: string[];
  results: { entity: Entity; rank: number; contributingSeedIds: string[] }[];
};
export interface Qloo {
  partnership(a: PairEntity, b: PairEntity, options: PairOptions): Promise<PairReport>;
  demographics(ids: string[]): Promise<AudienceProfile[]>;
  status: 'configured' | 'not-connected';
  search(query: string, kind: SeedKind): Promise<Entity[]>;
  insights(kind: PartnerKind, seedIds: string[], candidateIds?: string[]): Promise<Insight>;
}
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const text = (v: unknown, length = 600) => (typeof v === 'string' ? v.slice(0, length) : '');
const uuid = z.string().uuid();
function parseEntity(raw: unknown, kind: SeedKind): Entity | null {
  const r = record(raw),
    p = record(r.properties);
  if (
    !uuid.safeParse(r.entity_id).success ||
    !text(r.name) ||
    ![...array(r.types), r.subtype].includes(`urn:entity:${kind}`)
  )
    return null;
  return {
    entityId: String(r.entity_id).toUpperCase(),
    name: text(r.name, 200),
    description: text(p.short_description ?? p.description),
    kind,
  };
}
export function createQloo(
  options: { apiKey?: string; fetch?: typeof fetch; timeoutMs?: number } = {},
): Qloo {
  const key = options.apiKey?.trim();
  const cache = new Map<
    string,
    { data: Record<string, unknown>; fetchedAt: string; expires: number }
  >();
  async function get(path: string, params: Record<string, string>) {
    if (!key)
      throw new AppError(503, 'Qloo is not connected. You can still plan with entered offers.');
    const url = new URL(path, QLOO_ORIGIN);
    url.search = new URLSearchParams(params).toString();
    const cached = cache.get(url.href);
    if (cached && cached.expires > Date.now()) return cached;
    try {
      const response = await (options.fetch ?? fetch)(url, {
        headers: { 'X-Api-Key': key, Accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(options.timeoutMs ?? 12_000),
      });
      if (response.status === 429)
        throw new AppError(503, 'Qloo is rate limited. Try again later.');
      if ([401, 403].includes(response.status))
        throw new AppError(
          503,
          'Qloo rejected the server credential. Check its access and expiry.',
        );
      if (response.status === 400)
        throw new AppError(
          422,
          'Qloo could not compare these references. Try another confirmed entity.',
        );
      if (response.status === 404 && path === '/search')
        return { data: { results: [] }, fetchedAt: new Date().toISOString() };
      if (!response.ok)
        throw new AppError(502, 'Qloo is unavailable. Your saved campaign is unchanged.');
      // Bound streamed bytes, including responses without Content-Length.
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Empty body');
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2_000_000) {
          await reader.cancel();
          throw new Error('Oversized body');
        }
        chunks.push(value);
      }
      const data = record(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      if (data.success === false || !('results' in data)) throw new Error('Unexpected response');
      const value = { data, fetchedAt: new Date().toISOString(), expires: Date.now() + 600_000 };
      if (cache.size >= 80) cache.delete(cache.keys().next().value!);
      cache.set(url.href, value);
      return value;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        502,
        'Qloo could not be reached or returned an invalid response. Try again.',
      );
    }
  }
  return {
    status: key ? 'configured' : 'not-connected',
    partnership: (a, b, options) => createPairReport(get, a, b, options),
    async demographics(ids) {
      const requested = [
        ...new Set(
          z
            .array(z.string().uuid())
            .min(1)
            .max(8)
            .parse(ids)
            .map((id) => id.toUpperCase()),
        ),
      ].sort();
      const { data, fetchedAt } = await get('/v2/insights', {
        'filter.type': 'urn:demographics',
        'signal.interests.entities': requested.join(','),
      });
      try {
        return parseDemographics(data, requested, fetchedAt);
      } catch {
        throw new AppError(502, 'Qloo returned an invalid demographic response.');
      }
    },
    async search(query, kind) {
      const { data } = await get('/search', {
        query: query.trim(),
        types: `urn:entity:${kind}`,
        take: '5',
      });
      if (!Array.isArray(data.results))
        throw new AppError(502, 'Qloo returned an invalid search result.');
      return data.results.map((r) => parseEntity(r, kind)).filter((e): e is Entity => e !== null);
    },
    async insights(kind, seedIds, candidateIds) {
      const seeds = [
        ...new Set(
          z
            .array(uuid)
            .min(1)
            .max(4)
            .parse(seedIds)
            .map((s) => s.toUpperCase()),
        ),
      ].sort();
      const ids = candidateIds
        ? [
            ...new Set(
              z
                .array(uuid)
                .min(1)
                .max(24)
                .parse(candidateIds)
                .map((s) => s.toUpperCase()),
            ),
          ].sort()
        : undefined;
      const { data, fetchedAt } = await get('/v2/insights', {
        'filter.type': `urn:entity:${kind}`,
        'signal.interests.entities': seeds.join(','),
        ...(ids
          ? { 'filter.results.entities': ids.join(',') }
          : { 'filter.exclude.entities': seeds.join(',') }),
        'feature.explainability': 'true',
        take: String(ids?.length ?? 6),
      });
      const rows = record(data.results).entities;
      if (!Array.isArray(rows)) throw new AppError(502, 'Qloo returned an invalid comparison.');
      const seen = new Set<string>();
      const scored = rows
        .flatMap((r) => {
          const entity = parseEntity(r, kind),
            query = record(record(r).query);
          if (
            !entity ||
            seen.has(entity.entityId) ||
            (ids && !ids.includes(entity.entityId)) ||
            typeof query.affinity !== 'number' ||
            !Number.isFinite(query.affinity) ||
            query.affinity < 0
          )
            return [];
          seen.add(entity.entityId);
          const contributingSeedIds = array(
            record(query.explainability)['signal.interests.entities'],
          )
            .map(record)
            .map((e) => text(e.entity_id).toUpperCase())
            .filter((id) => seeds.includes(id));
          return [
            {
              entity,
              affinity: query.affinity,
              contributingSeedIds: [...new Set(contributingSeedIds)],
            },
          ];
        })
        .sort(
          (a, b) => b.affinity - a.affinity || a.entity.entityId.localeCompare(b.entity.entityId),
        );
      return {
        id: randomUUID(),
        fetchedAt,
        seedIds: seeds,
        results: scored.map((r) => ({
          entity: r.entity,
          rank: 1 + scored.filter((other) => other.affinity > r.affinity).length,
          contributingSeedIds: r.contributingSeedIds,
        })),
      };
    },
  };
}
