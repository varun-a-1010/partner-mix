import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../server/app';
import { newWorkspace } from '../server/data';
import { createQloo, type Qloo } from '../server/qloo';
import { allbirdsIntake } from '../server/sample';
import { FileStore } from '../server/store';
import { researchBrand, approveBrand } from '../server/brand-workflow';
import { runComparison } from '../server/workflow';
import type { Entity, WorkspaceView } from '../shared/model';
import { attachTestStrategy, fixtureIntake, mockAnalyst } from './brand-fixture';
import { legacyWorkspace } from './legacy-fixture';

function mockQloo() {
  const refs: Entity[] = [
    { entityId: randomUUID().toUpperCase(), name: 'Test brand', kind: 'brand', description: '' },
    {
      entityId: randomUUID().toUpperCase(),
      name: 'Test musician',
      kind: 'artist',
      description: '',
    },
  ];
  const entities: Entity[] = (['artist', 'podcast'] as const).flatMap((kind) =>
    Array.from({ length: 6 }, (_, i) => ({
      entityId: randomUUID().toUpperCase(),
      name: `Returned ${kind} ${i}`,
      kind,
      description: 'Provider description',
    })),
  );
  const qloo: Qloo = {
    status: 'configured',
    demographics: async () => [],
    search: vi.fn(async (query, kind) => refs.filter((r) => r.name === query && r.kind === kind)),
    insights: vi.fn(async (kind, seedIds, ids) => {
      const all = entities.filter((e) => e.kind === kind);
      const offset = seedIds[0] === refs[0].entityId ? 0 : 3;
      const returned = ids
        ? all.filter((e) => ids.includes(e.entityId)).reverse()
        : all.slice(offset, offset + 3);
      return {
        id: randomUUID(),
        fetchedAt: new Date().toISOString(),
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
async function setup(qloo: Qloo, analyst = mockAnalyst()) {
  const directory = await mkdtemp(join(tmpdir(), 'partner-mix-sample-'));
  cleanups.push(() => rm(directory, { recursive: true, force: true }));
  const store = new FileStore(directory);
  const app = await buildApp(store, { qloo, analyst });
  cleanups.push(() => app.close());
  const headers: Record<string, string> = {
    host: 'localhost:5193',
    origin: 'http://localhost:5193',
  };
  const created = await app.inject({
    method: 'POST',
    url: '/api/workspaces',
    headers,
    payload: { demo: true },
  });
  headers.cookie = created.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  let w = created.json<WorkspaceView>();
  const change = async (
    path: string,
    payload: Record<string, unknown>,
    method: 'POST' | 'PATCH' = 'POST',
  ) => {
    const r = await app.inject({
      method,
      url: `/api/w/${w.id}${path}`,
      headers,
      payload: { version: w.version, ...payload },
    });
    if (r.statusCode === 200) w = r.json();
    return r;
  };
  const approve = () =>
    change('/approve-brand', {
      references: (['core', 'adjacent'] as const).map((direction) => ({
        direction,
        entityIds: w
          .research!.resolutions.filter((r) => r.direction === direction)
          .flatMap((r) => r.matches.slice(0, 1).map((e) => e.entityId)),
      })),
    });
  return { app, store, headers, created, current: () => w, change, approve };
}
describe('brand-first sample flow', () => {
  it('invalidates strategic assessments when approved discovery references change', () => {
    const w = legacyWorkspace().workspace;
    attachTestStrategy(w);
    const alternative = {
      ...w.brief.segments[0].seeds[0],
      entityId: randomUUID().toUpperCase(),
      name: 'Alternative reference',
    };
    w.research!.resolutions = w.brief.segments.map((s) => ({
      direction: s.id,
      query: 'Test',
      kind: s.seeds[0].kind,
      reason: 'Test reference',
      matches: [...s.seeds, ...(s.id === 'core' ? [alternative] : [])],
    }));
    approveBrand(w, [
      { direction: 'core', entityIds: [alternative.entityId] },
      { direction: 'adjacent', entityIds: [w.brief.segments[1].seeds[0].entityId] },
    ]);
    expect(w.candidates.every((c) => !c.assessment)).toBe(true);
    expect(w.brief.segments[0].seeds[0].entityId).toBe(alternative.entityId);
  });
  it('opens a real-brand brief offline without researching or suggesting any partner', async () => {
    const analyst = mockAnalyst();
    analyst.research = vi.fn(analyst.research);
    const s = await setup(createQloo(), analyst);
    expect(s.created.statusCode).toBe(201);
    expect(s.current().intake).toEqual(allbirdsIntake);
    expect(s.current().brief.brand).toBe('Allbirds');
    expect(s.current().candidates).toEqual([]);
    expect(s.current().planning.options).toEqual([]);
    expect(analyst.research).not.toHaveBeenCalled();
    expect((await s.change('/compare', { discover: true })).statusCode).toBe(422);
  });
  it('requires research and explicit review before discovery, then assesses every identity and exports the strategy', async () => {
    const qloo = mockQloo(),
      s = await setup(qloo);
    expect((await s.change('/research', { intake: allbirdsIntake })).statusCode).toBe(200);
    expect(qloo.search).toHaveBeenCalledTimes(2);
    expect(qloo.insights).not.toHaveBeenCalled();
    expect((await s.change('/compare', { discover: true })).statusCode).toBe(422);
    expect((await s.approve()).statusCode).toBe(200);
    expect((await s.change('/compare', { discover: true })).statusCode).toBe(200);
    const w = s.current();
    expect(qloo.insights).toHaveBeenCalledTimes(8);
    expect(w.candidates).toHaveLength(8);
    expect(
      w.candidates.every(
        (c) => c.source === 'qloo' && c.entityId && c.assessment?.researchId === w.research!.id,
      ),
    ).toBe(true);
    expect(
      w.candidates.every(
        (c) =>
          c.offer.basis === 'estimate' &&
          c.offer.availability === 'unknown' &&
          c.offer.source.includes('not a quote'),
      ),
    ).toBe(true);
    expect(w.planning.evidenceStatus).toBe('current');
    expect(w.planning.options.length).toBeGreaterThan(0);
    expect((await s.change('/select', { packageId: w.planning.options[0].id })).statusCode).toBe(
      200,
    );
    const exported = await s.app.inject({ url: `/api/w/${w.id}/brief.md`, headers: s.headers });
    expect(exported.body).toContain('Brand understanding and campaign strategy');
    expect(exported.body).toContain('Campaign role:');
    expect(exported.body).toContain('availability is unconfirmed');
    expect(exported.body).toContain('not a quote from this partner');
    expect(
      (await s.change('/brief', { brief: { ...s.current().brief, budget: 30_000 } }, 'PATCH'))
        .statusCode,
    ).toBe(200);
    expect(s.current().research?.approved).toBeDefined();
    expect(
      (
        await s.change(
          '/brief',
          { brief: { ...s.current().brief, goal: 'Bypass the reviewed goal' } },
          'PATCH',
        )
      ).statusCode,
    ).toBe(422);
  });
  it('keeps saved work unchanged if research or partner assessment fails', async () => {
    const analyst = mockAnalyst(),
      s = await setup(mockQloo(), analyst);
    analyst.research = async () => {
      throw new Error('Upstream failure containing private material');
    };
    const failed = await s.change('/research', { intake: allbirdsIntake });
    expect(failed.statusCode).toBe(500);
    expect(failed.body).not.toContain('private material');
    expect((await s.store.get(s.current().id))?.version).toBe(1);
    analyst.research = mockAnalyst().research;
    await s.change('/research', { intake: allbirdsIntake });
    await s.approve();
    analyst.assess = async () => {
      throw new Error('Failed assessment');
    };
    expect((await s.change('/compare', { discover: true })).statusCode).toBe(500);
    expect((await s.store.get(s.current().id))?.candidates).toEqual([]);
  });
  it('rejects fabricated references and essential unanswered questions', async () => {
    const qloo = mockQloo(),
      w = await researchBrand(newWorkspace().workspace, fixtureIntake, mockAnalyst(), qloo);
    expect(() =>
      approveBrand(w, [
        { direction: 'core', entityIds: [randomUUID()] },
        { direction: 'adjacent', entityIds: [randomUUID()] },
      ]),
    ).toThrow('confirmed Qloo');
    w.research!.analysis.questions = [
      { question: 'Which product?', why: 'Required test constraint.', blocking: true },
    ];
    expect(() => approveBrand(w, [])).toThrow('essential questions');
  });
  it('invalidates approval and assessments when the campaign changes, preserving prior partners', async () => {
    const s = await setup(mockQloo());
    await s.change('/research', { intake: fixtureIntake });
    await s.approve();
    await s.change('/compare', { discover: true });
    const ids = s.current().candidates.map((c) => c.id);
    await s.change('/research', {
      intake: {
        ...fixtureIntake,
        campaignBrief: fixtureIntake.campaignBrief + ' Now target a different market.',
      },
    });
    expect(s.current().research?.approved).toBeUndefined();
    expect(s.current().candidates.map((c) => c.id)).toEqual(ids);
    expect(s.current().planning.options).toEqual([]);
    await s.approve();
    expect(s.current().planning.options).toEqual([]);
  });
  it('discards research completed after a concurrent edit', async () => {
    const analyst = mockAnalyst();
    let begin!: () => void, release!: () => void;
    const started = new Promise<void>((r) => {
        begin = r;
      }),
      gate = new Promise<void>((r) => {
        release = r;
      });
    const original = analyst.research;
    analyst.research = async (input) => {
      begin();
      await gate;
      return original(input);
    };
    const s = await setup(mockQloo(), analyst),
      w = s.current();
    const pending = s.change('/research', { intake: allbirdsIntake });
    await started;
    await s.store.update(w.id, w.version, (c) => {
      c.brief.campaign = 'Concurrent edit';
    });
    release();
    expect((await pending).statusCode).toBe(409);
    const saved = await s.store.get(w.id);
    expect(saved?.brief.campaign).toBe('Concurrent edit');
    expect(saved?.research).toBeUndefined();
  });
  it('never queries with a strategy that was only analyzed', async () => {
    const qloo = mockQloo(),
      w = await researchBrand(newWorkspace().workspace, fixtureIntake, mockAnalyst(), qloo);
    await expect(runComparison(w, qloo, true)).rejects.toThrow('approve');
    expect(qloo.insights).not.toHaveBeenCalled();
  });
});
