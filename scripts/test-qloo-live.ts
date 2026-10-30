import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createQloo } from '../server/qloo';
import {
  createBrandAnalyst,
  type AnalystDiagnostic,
  type BrandAnalyst,
} from '../server/brand-analyst';
import { allbirdsIntake } from '../server/sample';
import { buildApp } from '../server/app';
import { FileStore } from '../server/store';
import type { WorkspaceView } from '../shared/model';

// Explicit opt-in: at most 17 Qloo calls and two Vertex model generations.
// Only hypothetical commercial inputs; no user workspace or partner contacted.
assert(process.env.QLOO_API_KEY, 'QLOO_API_KEY must be configured in process memory.');
assert(
  process.env.VERTEX_LLM_PROJECT_ID && process.env.VERTEX_LLM_SERVICE_ACCOUNT,
  'Vertex must be configured in process memory.',
);
const sample = process.argv.includes('--sample');
const calls: { path: string; kind: string | null; status: number; ms: number }[] = [];
let requested = 0;
const qloo = createQloo({
  apiKey: process.env.QLOO_API_KEY,
  fetch: async (input, init) => {
    assert(++requested <= 17, 'Live Qloo request budget exhausted.');
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
const diagnostics: AnalystDiagnostic[] = [];
const provider = createBrandAnalyst({
  project: process.env.VERTEX_LLM_PROJECT_ID,
  serviceAccount: process.env.VERTEX_LLM_SERVICE_ACCOUNT,
  location: process.env.VERTEX_LLM_REGION,
  diagnostic: (event) => {
    diagnostics.push(event);
    console.error(JSON.stringify(event));
  },
});
// Optional debugging capture contains only this public brand/hypothetical test.
// It excludes cookies, workspace access hashes and provider credentials.
const capture: Record<string, unknown> = {};
function capturePublicTest(key: string, value: unknown) {
  capture[key] = value;
  if (process.env.PARTNER_MIX_TEST_CAPTURE)
    writeFileSync(process.env.PARTNER_MIX_TEST_CAPTURE, JSON.stringify(capture, null, 2), {
      mode: 0o600,
    });
}
const analyst: BrandAnalyst = {
  status: provider.status,
  research: async (input) => {
    const result = await provider.research(input);
    capturePublicTest('research', { input, result });
    return result;
  },
  assess: async (...args) => {
    capturePublicTest('assessmentInput', args);
    return provider.assess(...args);
  },
};
const directory = await mkdtemp(join(tmpdir(), 'partner-mix-live-'));
const app = await buildApp(new FileStore(directory), { qloo, analyst });
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
  assert.equal(requested, 0, 'Opening a sample should not silently call providers.');
  async function change(
    path: string,
    payload: Record<string, unknown>,
    method: 'POST' | 'PATCH' = 'POST',
  ) {
    const r = await app.inject({
      method,
      url: `/api/w/${current.id}${path}`,
      headers,
      payload: { ...payload, version: current.version },
    });
    assert.equal(r.statusCode, 200, r.body);
    current = r.json<WorkspaceView>();
  }
  console.error('Checking sourced brand research…');
  await change('/research', { intake: allbirdsIntake });
  assert.equal(current.candidates.length, 0);
  assert(current.research!.sources.length > 0);
  assert(
    !current.research!.analysis.questions.some((q) => q.blocking),
    `The sample needs clarification: ${JSON.stringify(current.research!.analysis.questions.filter((q) => q.blocking))}`,
  );
  const references = (['core', 'adjacent'] as const).map((direction) => {
    const resolutions = current.research!.resolutions.filter((r) => r.direction === direction);
    const entityIds = resolutions.flatMap((r) => {
      const exact = r.matches.find((e) => e.name.toLowerCase() === r.query.toLowerCase());
      return exact ? [exact.entityId] : [];
    });
    assert(
      entityIds.length,
      `No exact reference for ${direction}; review the proposed identities before proceeding. Queries: ${resolutions.map((r) => r.query).join(', ')}`,
    );
    return { direction, entityIds: [...new Set(entityIds)] };
  });
  await change('/approve-brand', { references });
  console.error('Checking live Qloo discovery and Gemini partner assessments…');
  await change('/compare', { discover: true });
  if (!sample) {
    await change('/brief', { brief: { ...current.brief, budget: 1_000_000 } }, 'PATCH');
    for (const c of [...current.candidates])
      await change(
        `/candidates/${c.id}`,
        {
          offer: {
            ...c.offer,
            amount: c.kind === 'artist' ? 20_000 : 10_000,
            basis: 'estimate',
            source: 'Synthetic live verification; not a real quote.',
          },
        },
        'PATCH',
      );
  }
  assert(
    current.candidates.every(
      (c) => c.source === 'qloo' && c.entityId && c.assessment?.researchId === current.research!.id,
    ),
  );
  assert.equal(current.evidence?.comparisons.length, 4);
  assert(current.evidence!.comparisons.every((q) => q.source === 'qloo'));
  assert.equal(current.planning.evidenceStatus, 'current');
  assert(
    current.planning.options.length,
    `No feasible mix: ${JSON.stringify(current.planning.blockers)}. Assessments: ${JSON.stringify(current.candidates.map((c) => ({ name: c.name, disposition: c.assessment?.disposition })))}`,
  );
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
  assert(
    current.planning.options.length,
    'No suitable replacement after the test availability change.',
  );
  assert(
    current.planning.options.every(
      (p) => p.partnerIds.includes(anchor.id) && !p.partnerIds.includes(removed.id),
    ),
  );
  await change('/select', { packageId: current.planning.options[0].id });
  const exported = await app.inject({ url: `/api/w/${current.id}/brief.md`, headers });
  assert.equal(exported.statusCode, 200);
  assert(exported.body.includes('Brand understanding and campaign strategy'));
  assert(exported.body.includes('Campaign role:'));
  assert(exported.body.includes('Activation hypothesis:'));
  assert(
    exported.body.includes(
      sample ? 'not a quote from this partner' : 'Synthetic live verification',
    ),
  );
  assert.equal((await app.inject({ url: `/api/w/${current.id}/brief.md` })).statusCode, 404);
  console.log(
    JSON.stringify(
      {
        at: new Date().toISOString(),
        sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
        flow: sample
          ? 'Allbirds hypothetical sample: website → reviewed strategy → Qloo → partner assessment → mix → repair → export'
          : 'Empty campaign with Allbirds hypothetical brief',
        qlooCalls: calls,
        model: current.research!.model,
        modelGenerations: 2,
        diagnostics,
        research: { sources: current.research!.sources, analysis: current.research!.analysis },
        references: current.brief.segments.map((s) => ({
          direction: s.id,
          name: s.name,
          entities: s.seeds.map((e) => ({ name: e.name, kind: e.kind, entityId: e.entityId })),
        })),
        partners: current.candidates.map((c) => ({
          name: c.name,
          kind: c.kind,
          entityId: c.entityId,
          assessment: c.assessment,
        })),
        comparisons: current.evidence!.comparisons.map((q) => ({
          direction: q.segment,
          kind: q.kind,
          returned: q.results.length,
          requested: q.candidateIds.length,
        })),
        firstMix: firstSelection.partners.map((c) => c.name),
        repair: {
          kept: anchor.name,
          removed: removed.name,
          newMix: current.selection!.partners.map((c) => c.name),
        },
        privateApiAndExportChecked: true,
        commercialInputs:
          'Campaign, prices, deliverables and availability edits are hypothetical. No relationship with Allbirds or the partners, real offer, demographic or campaign result is claimed.',
        cleanup: 'Temporary workspace removed; existing user campaigns untouched.',
      },
      null,
      2,
    ),
  );
} finally {
  await app.close();
  await rm(directory, { recursive: true, force: true });
}
