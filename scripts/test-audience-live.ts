import assert from 'node:assert/strict';
import { createQloo } from '../server/qloo';
import { collectAudiences } from '../server/audience';

assert(process.env.QLOO_API_KEY, 'Set QLOO_API_KEY in process memory for this opt-in check.');
let calls = 0;
const qloo = createQloo({
  apiKey: process.env.QLOO_API_KEY,
  fetch: async (input, init) => {
    assert(++calls <= 3, 'Three-request live check budget exhausted.');
    return fetch(input, init);
  },
});
const references = [
  ['Allbirds', 'brand'],
  ['Bon Iver', 'artist'],
] as const;
const entities = [];
for (const [name, kind] of references) {
  const matches = (await qloo.search(name, kind)).filter(
    (e) => e.name.toLowerCase() === name.toLowerCase(),
  );
  assert(matches.length === 1, `Expected one exact ${kind} match for ${name}.`);
  const e = matches[0];
  entities.push({ id: e.entityId, name: e.name });
}
const result = await collectAudiences(
  qloo,
  entities.map((e) => e.id),
  entities[0],
);
assert.equal(result.profiles.length, 2);
assert(
  result.profiles.every((p) => p.status === 'available'),
  'Both example entities must have demographic coverage.',
);
assert(
  result.profiles.every((p) => Object.keys(p.age).length === 6),
  'Expected all six age bands.',
);
const before = calls;
const cached = await collectAudiences(
  qloo,
  entities.map((e) => e.id),
  entities[0],
);
assert.equal(calls, before, 'Repeated profiles should use the cache.');
assert.deepEqual(cached, result, 'Cache reuse must retain retrieval dates.');
console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      entities,
      requests: calls,
      profiles: result.profiles.map((p) => ({
        entityId: p.entityId,
        status: p.status,
        age: p.age,
        gender: p.gender,
        fetchedAt: p.fetchedAt,
      })),
      cacheReused: true,
    },
    null,
    2,
  ),
);
