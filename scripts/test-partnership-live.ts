import assert from 'node:assert/strict';
import { createQloo } from '../server/qloo';
import type { PairEntity } from '../shared/partnership';
assert(process.env.QLOO_API_KEY, 'Set QLOO_API_KEY in process memory.');
const a: PairEntity = {
    id: '78A44C09-E691-42DA-A553-5CDE6EE9B18A',
    name: 'Allbirds',
    kind: 'brand',
  },
  b: PairEntity = { id: 'E51DB8F2-7A93-4746-A283-E55B5216FDE1', name: 'Bon Iver', kind: 'artist' };
const city = process.argv.includes('--city')
  ? process.argv[process.argv.indexOf('--city') + 1]
  : undefined;
const includeHeatmap = process.argv.includes('--heatmap');
let calls = 0;
const qloo = createQloo({
  apiKey: process.env.QLOO_API_KEY,
  fetch: async (input, init) => {
    assert(++calls <= 8, 'Eight-request budget exhausted.');
    return fetch(input, init);
  },
});
const report = await qloo.partnership(a, b, { city, includeHeatmap });
assert(
  report.ledger.every((q) => q.status !== 'error'),
  'All live query shapes must complete.',
);
assert.equal(report.directions.length, 2);
assert(report.activations.length > 0, 'Expected live activation suggestions.');
assert(
  report.activations.some((p) => p.contributions),
  'Expected contribution metadata for at least one suggestion.',
);
if (includeHeatmap) assert(report.heatmap?.cells.length, 'Expected geographic cells.');
const previous = calls;
const cached = await qloo.partnership(a, b, { city, includeHeatmap });
assert.equal(calls, previous);
assert.deepEqual(
  cached.ledger.map((q) => q.fetchedAt),
  report.ledger.map((q) => q.fetchedAt),
);
console.log(
  JSON.stringify(
    {
      a: report.a.name,
      b: report.b.name,
      requests: calls,
      directions: report.directions,
      shared: report.tastes.shared.map((t) => t.name),
      distinctiveA: report.tastes.aOnly.map((t) => t.name),
      distinctiveB: report.tastes.bOnly.map((t) => t.name),
      activations: report.activations.map((p) => ({
        name: p.name,
        kind: p.kind,
        contributor: p.contributor,
        weights: p.contributions,
      })),
      cells: report.heatmap?.cells.length ?? 0,
      ledger: report.ledger.map((q) => ({
        id: q.id,
        status: q.status,
        count: q.count,
        fetchedAt: q.fetchedAt,
      })),
      cacheReused: true,
    },
    null,
    2,
  ),
);
