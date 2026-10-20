import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createQloo } from '../server/qloo';
import { buildApp } from '../server/app';
import { FileStore } from '../server/store';
import type { Entity, WorkspaceView } from '../shared/model';

// Opt-in, maximum ten upstream calls. Credentials only enter from the process
// environment. All commercial inputs below are synthetic test data.
assert(process.env.QLOO_API_KEY, 'Set QLOO_API_KEY in the process environment.');
const sample = process.argv.includes('--sample');
const calls: { path: string; kind: string | null; status: number; ms: number }[] = [];
let requested = 0;
const qloo = createQloo({
  apiKey: process.env.QLOO_API_KEY,
  fetch: async (input, init) => {
    assert(++requested <= 10, 'Live request budget exhausted.');
    const url = new URL(String(input)),
      start = Date.now();
    const response = await fetch(input, init);
    calls.push({
      path: url.pathname,
      kind: url.searchParams.get('filter.type') ?? url.searchParams.get('types'),
      status: response.status,
      ms: Date.now() - start,
    });
    return response;
  },
});
const directory = await mkdtemp(join(tmpdir(), 'partner-mix-live-'));
const app = await buildApp(new FileStore(directory), { qloo });
try {
  const headers: Record<string, string> = {
    host: 'localhost:5193',
    origin: 'http://localhost:5193',
  };
  const created = await app.inject({
    method: 'POST',
    url: '/api/workspaces',
    headers,
    payload: { demo: sample },
  });
  assert.equal(created.statusCode, 201, created.body);
  headers.cookie = created.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  let current = created.json<WorkspaceView>();
  const seeds: Entity[] = current.brief.segments.flatMap((s) => s.seeds);
  async function change(
    path: string,
    payload: Record<string, unknown>,
    method: 'POST' | 'PATCH' = 'POST',
  ) {
    const response = await app.inject({
      method,
      url: `/api/w/${current.id}${path}`,
      headers,
      payload: { ...payload, version: current.version },
    });
    assert.equal(response.statusCode, 200, response.body);
    current = response.json<WorkspaceView>();
  }
  if (sample) {
    assert.equal(current.sample?.source, 'qloo');
    assert(current.candidates.length >= 4 && current.candidates.length <= 8);
    assert(current.candidates.every((c) => c.source === 'qloo' && c.entityId));
    assert(
      current.candidates.every(
        (c) =>
          c.offer.basis === 'estimate' &&
          c.offer.availability === 'unknown' &&
          c.offer.source.includes('not a quote'),
      ),
    );
  } else {
    for (const [query, kind] of [
      ['Patagonia', 'brand'],
      ['Daft Punk', 'artist'],
    ] as const) {
      const response = await app.inject({
        method: 'POST',
        url: `/api/w/${current.id}/search`,
        headers,
        payload: { query, kind },
      });
      assert.equal(response.statusCode, 200, response.body);
      const entities = response.json().entities as Entity[];
      const entity = entities.find((e) => e.name.toLowerCase() === query.toLowerCase());
      assert(entity, `No exact ${kind} match for ${query}; human entity confirmation needed.`);
      seeds.push(entity);
    }
    await change(
      '/brief',
      {
        brief: {
          ...current.brief,
          campaign: 'Synthetic live API verification',
          budget: 1_000_000,
          segments: current.brief.segments.map((s, i) => ({ ...s, seeds: [seeds[i]] })),
        },
      },
      'PATCH',
    );
    await change('/compare', { discover: true });
    for (const c of [...current.candidates]) {
      await change(
        `/candidates/${c.id}`,
        {
          offer: {
            ...c.offer,
            amount: c.kind === 'artist' ? 200_000 : 100_000,
            basis: 'estimate',
            source: 'Synthetic verification only; not a real rate',
            deliverables: 'Synthetic test scope; nothing offered or agreed',
          },
        },
        'PATCH',
      );
    }
  }
  assert(
    current.candidates.some((c) => c.kind === 'artist'),
    'No artists discovered.',
  );
  assert(
    current.candidates.some((c) => c.kind === 'podcast'),
    'No podcasts discovered.',
  );
  assert.equal(current.evidence?.comparisons.length, 4);
  assert(current.evidence!.comparisons.every((q) => q.source === 'qloo'));
  assert.equal(current.planning.evidenceStatus, 'current');
  const before = requested;
  await change('/compare', { discover: false });
  assert.equal(requested, before, 'Repeated comparison should use the process-local cache.');
  assert(current.planning.options.length > 0, 'No feasible package after synthetic costs.');
  await change('/select', { packageId: current.planning.options[0].id });
  const firstSelection = current.selection!;
  const anchor = current.candidates.find((c) => c.id === firstSelection.package.partnerIds[0])!;
  const removed = current.candidates.find((c) => c.id === firstSelection.package.partnerIds[1])!;
  await change(`/candidates/${anchor.id}`, { locked: true }, 'PATCH');
  await change(
    `/candidates/${removed.id}`,
    { offer: { ...removed.offer, availability: 'unavailable' } },
    'PATCH',
  );
  assert(current.selectionStale);
  assert(current.planning.options.length > 0, 'No replacement candidate.');
  assert(
    current.planning.options.every(
      (p) => p.partnerIds.includes(anchor.id) && !p.partnerIds.includes(removed.id),
    ),
  );
  await change('/select', { packageId: current.planning.options[0].id });
  assert(current.revision?.retained.includes(anchor.id));
  assert(current.revision?.removed.includes(removed.id));
  const exported = await app.inject({ url: `/api/w/${current.id}/brief.md`, headers });
  assert.equal(exported.statusCode, 200);
  assert(
    exported.body.includes(
      sample ? 'Illustrative sample budget input' : 'Synthetic verification only',
    ),
  );
  if (sample) {
    assert(exported.body.includes('Real artists, podcasts and cultural rankings from Qloo'));
    assert(exported.body.includes('availability is unconfirmed'));
  }
  const report = {
    at: new Date().toISOString(),
    sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    flow: sample ? 'Real Qloo sample creation' : 'Empty campaign with live discovery',
    upstreamCalls: requested,
    calls,
    inputEntities: seeds.map((s) => ({ name: s.name, kind: s.kind, entityId: s.entityId })),
    discovered: {
      artists: current.candidates.filter((c) => c.kind === 'artist').length,
      podcasts: current.candidates.filter((c) => c.kind === 'podcast').length,
    },
    ...(sample
      ? {
          sampleProvenance: current.sample,
          partners: current.candidates.map((c) => ({
            name: c.name,
            kind: c.kind,
            entityId: c.entityId,
          })),
          initialAvailabilityUnknown: true,
          sampleCostsExplicitlyIllustrative: true,
        }
      : {}),
    comparisons: current.evidence!.comparisons.map((q) => ({
      segment: q.segment,
      kind: q.kind,
      returned: q.results.length,
      requested: q.candidateIds.length,
      ...(sample
        ? {
            ranks: q.results.map((r) => ({
              name: current.candidates.find((c) => c.id === r.candidateId)!.name,
              rank: r.rank,
            })),
          }
        : {}),
    })),
    evidenceStatus: current.planning.evidenceStatus,
    firstMix: firstSelection.partners.map((c) => ({
      name: c.name,
      kind: c.kind,
      entityId: c.entityId,
    })),
    repair: {
      kept: anchor.name,
      replaced: removed.name,
      newMix: current.selection!.partners.map((c) => c.name),
    },
    cacheReused: true,
    privateApiAndExportChecked: true,
    commercialInputs:
      'All prices, deliverables, availability changes and budget are synthetic. No real offer or marketing outcome is claimed.',
    cleanup: 'Temporary workspace removed in finally; no demo data inserted into the user store.',
  };
  console.log(JSON.stringify(report, null, 2));
} finally {
  await app.close();
  await rm(directory, { recursive: true, force: true });
}
