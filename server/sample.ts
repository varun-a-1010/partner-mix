import type { StoredWorkspace } from '../shared/model';
import type { Qloo } from './qloo';
import { AppError } from './store';
import { runComparison } from './workflow';

// Resolve these known public entities on each sample creation. No invented IDs
// or ranks enter a sample; the provider's normal cache may reuse recent results.
export const sampleReferences = [
  { name: 'Patagonia', kind: 'brand', entityId: 'DB4CE34E-3A63-4947-946F-9D52502C5762' },
  { name: 'Daft Punk', kind: 'artist', entityId: '012EF80C-B187-4ECB-9C3D-9CA5228B503C' },
] as const;

export async function populateQlooSample(workspace: StoredWorkspace, qloo: Qloo) {
  if (qloo.status !== 'configured')
    throw new AppError(
      503,
      'The real-partner sample needs Qloo to be connected. You can still start an empty campaign.',
    );
  const next = structuredClone(workspace);
  next.demo = true;
  next.sample = { source: 'qloo', generatedAt: new Date().toISOString() };
  next.candidates = [];
  delete next.evidence;
  for (const [index, reference] of sampleReferences.entries()) {
    const results = await qloo.search(reference.name, reference.kind);
    const resolved = results.find(
      (entity) =>
        entity.entityId.toUpperCase() === reference.entityId &&
        entity.kind === reference.kind &&
        entity.name.toLowerCase() === reference.name.toLowerCase(),
    );
    if (!resolved)
      throw new AppError(
        502,
        `Qloo could not confirm the sample reference ${reference.name}. Please try again later.`,
      );
    next.brief.segments[index].seeds = [resolved];
  }
  const result = await runComparison(next, qloo, true, { discoveryPerGroup: 2 });
  if (
    ['artist', 'podcast'].some(
      (kind) => result.candidates.filter((c) => c.kind === kind).length < 2,
    )
  )
    throw new AppError(
      502,
      'Qloo did not return enough real partners for the sample. Please try again later.',
    );
  const seen = { artist: 0, podcast: 0 };
  for (const c of result.candidates) {
    const index = seen[c.kind]++;
    c.offer = {
      ...c.offer,
      amount: c.kind === 'artist' ? 160_000 + index * 50_000 : 90_000 + index * 30_000,
      basis: 'estimate',
      source: 'Illustrative sample budget input, not a quote from this partner.',
      deliverables:
        c.kind === 'artist'
          ? 'Example activation idea: a listening session and campaign content. Not offered or agreed.'
          : 'Example activation idea: a host-read placement and an interview. Not offered or agreed.',
      availability: 'unknown',
    };
  }
  result.sample!.generatedAt = new Date().toISOString();
  result.run!.steps.push(
    'Added clearly illustrative cost estimates and activation ideas. Availability remains unconfirmed.',
  );
  return result;
}
