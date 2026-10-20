import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../server/app';
import { newWorkspace } from '../server/data';
import { createQloo, type Qloo } from '../server/qloo';
import { populateQlooSample, sampleReferences } from '../server/sample';
import { FileStore } from '../server/store';
import { evidenceFingerprint, solve } from '../server/solver';
import type { Entity, WorkspaceView } from '../shared/model';

function mockQloo() {
  const artists: Entity[] = Array.from({ length: 6 }, (_, i) => ({
    entityId: randomUUID().toUpperCase(),
    name: `Returned artist ${i}`,
    kind: 'artist',
    description: 'Provider metadata',
  }));
  const podcasts: Entity[] = Array.from({ length: 6 }, (_, i) => ({
    entityId: randomUUID().toUpperCase(),
    name: `Returned podcast ${i}`,
    kind: 'podcast',
    description: 'Provider metadata',
  }));
  const qloo: Qloo = {
    status: 'configured',
    search: vi.fn(async (query, kind) =>
      sampleReferences
        .filter((r) => r.name === query && r.kind === kind)
        .map((r) => ({ ...r, description: 'Resolved reference' })),
    ),
    insights: vi.fn(async (kind, seedIds, ids) => {
      const all = kind === 'artist' ? artists : podcasts;
      const group = seedIds[0] === sampleReferences[0].entityId ? 0 : 3;
      const returned = ids
        ? all.filter((e) => ids.includes(e.entityId)).reverse()
        : all.slice(group, group + 3);
      return {
        id: randomUUID(),
        fetchedAt: '2026-10-20T00:00:00.000Z',
        seedIds,
        results: returned.map((entity, i) => ({
          entity,
          rank: i + 1,
          contributingSeedIds: seedIds,
        })),
      };
    }),
  };
  return qloo;
}
const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  for (const close of cleanups.splice(0).reverse()) await close();
});
async function setup(qloo: Qloo) {
  const directory = await mkdtemp(join(tmpdir(), 'partner-mix-sample-'));
  cleanups.push(() => rm(directory, { recursive: true, force: true }));
  const app = await buildApp(new FileStore(directory), { qloo });
  cleanups.push(() => app.close());
  return { app, directory, headers: { host: 'localhost:5193', origin: 'http://localhost:5193' } };
}
describe('real Qloo sample', () => {
  it('resolves references and uses discovered identities and returned rankings, while keeping commercial inputs illustrative', async () => {
    const qloo = mockQloo();
    const w = await populateQlooSample(newWorkspace(true).workspace, qloo);
    expect(qloo.search).toHaveBeenCalledTimes(2);
    expect(qloo.insights).toHaveBeenCalledTimes(8);
    expect(w.sample?.source).toBe('qloo');
    expect(w.brief.segments.map((s) => s.seeds[0].entityId)).toEqual(
      sampleReferences.map((r) => r.entityId),
    );
    expect(w.candidates).toHaveLength(8);
    expect(
      w.candidates.every((c) => c.source === 'qloo' && c.entityId && c.name.startsWith('Returned')),
    ).toBe(true);
    expect(
      w.candidates.every(
        (c) =>
          c.offer.basis === 'estimate' &&
          c.offer.availability === 'unknown' &&
          c.offer.source.includes('not a quote'),
      ),
    ).toBe(true);
    expect(
      w.evidence!.comparisons.every((q) => q.source === 'qloo' && q.results.length === 4),
    ).toBe(true);
    expect(w.evidence!.comparisons[0].results[0].candidateId).toBe(
      w.candidates.filter((c) => c.kind === 'artist').at(-1)!.id,
    );
    expect(w.evidence!.fingerprint).toBe(evidenceFingerprint(w));
    expect(solve(w).evidenceStatus).toBe('current');
    expect(solve(w).options.length).toBeGreaterThan(0);
    expect(solve(w).options[0].unresolved.join(' ')).toContain('availability is unconfirmed');
  });
  it('rejects an unconfirmed reference rather than picking a similarly named entity', async () => {
    const qloo = mockQloo();
    qloo.search = vi.fn(async (): Promise<Entity[]> => [
      { entityId: randomUUID(), name: 'Patagonia', kind: 'brand', description: '' },
    ]);
    await expect(populateQlooSample(newWorkspace(true).workspace, qloo)).rejects.toThrow(
      'could not confirm',
    );
    expect(qloo.insights).not.toHaveBeenCalled();
  });
  it('keeps incomplete provider results unknown instead of inventing missing ranks', async () => {
    const qloo = mockQloo(),
      full = qloo.insights;
    qloo.insights = async (kind, seeds, ids) => {
      const result = await full(kind, seeds, ids);
      if (ids && kind === 'podcast') result.results.pop();
      return result;
    };
    const w = await populateQlooSample(newWorkspace(true).workspace, qloo);
    expect(solve(w).evidenceStatus).toBe('partial');
    expect(solve(w).options.every((p) => p.strategy === 'cost')).toBe(true);
  });
  it('does not persist a half-built sample when Qloo fails', async () => {
    const qloo = mockQloo();
    qloo.insights = vi.fn(async () => {
      throw new Error('Upstream failed');
    });
    const { app, headers, directory } = await setup(qloo);
    const response = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers,
      payload: { demo: true },
    });
    expect(response.statusCode).toBe(500);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(await readdir(directory)).toEqual([]);
  });
  it('requires a connection for samples but still allows empty campaigns offline', async () => {
    const { app, headers, directory } = await setup(createQloo());
    const sample = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers,
      payload: { demo: true },
    });
    expect(sample.statusCode).toBe(503);
    expect(await readdir(directory)).toEqual([]);
    const empty = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers,
      payload: { demo: false },
    });
    expect(empty.statusCode).toBe(201);
    expect(empty.json().candidates).toEqual([]);
  });
  it('lets the sample refresh real evidence and exports the distinction between Qloo data and estimates', async () => {
    const qloo = mockQloo(),
      { app, headers } = await setup(qloo);
    const response = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers,
      payload: { demo: true },
    });
    expect(response.statusCode).toBe(201);
    let w = response.json<WorkspaceView>();
    const authenticated = {
      ...headers,
      cookie: response.cookies.map((c) => `${c.name}=${c.value}`).join('; '),
    };
    const refreshed = await app.inject({
      method: 'POST',
      url: `/api/w/${w.id}/compare`,
      headers: authenticated,
      payload: { version: w.version, discover: false },
    });
    expect(refreshed.statusCode).toBe(200);
    expect(qloo.insights).toHaveBeenCalledTimes(12);
    w = refreshed.json();
    const selected = await app.inject({
      method: 'POST',
      url: `/api/w/${w.id}/select`,
      headers: authenticated,
      payload: { version: w.version, packageId: w.planning.options[0].id },
    });
    expect(selected.statusCode).toBe(200);
    const exported = await app.inject({ url: `/api/w/${w.id}/brief.md`, headers: authenticated });
    expect(exported.body).toContain('Real artists, podcasts and cultural rankings from Qloo');
    expect(exported.body).toContain('availability is unconfirmed');
    expect(exported.body).not.toContain('Partners, offers and rankings are illustrative');
    expect(exported.body).toContain('not a quote from this partner');
  });
});
