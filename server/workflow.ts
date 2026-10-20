import { randomUUID } from 'node:crypto';
import type { Comparison, StoredWorkspace } from '../shared/model';
import { emptyOffer, isLegacySample } from '../shared/model';
import { AppError } from './store';
import type { Qloo } from './qloo';
import { evidenceFingerprint } from './solver';
import { brandReady } from '../shared/brand';

export async function runComparison(
  w: StoredWorkspace,
  qloo: Qloo,
  discover: boolean,
  options: { discoveryPerGroup?: 2 | 6 } = {},
) {
  if (isLegacySample(w))
    throw new AppError(
      400,
      'This older sample has fictional entities. Open a new Qloo sample to use real partners.',
    );
  if (!brandReady(w))
    throw new AppError(
      422,
      'Review the brand understanding and approve its partnership directions before discovering partners.',
    );
  if (w.brief.segments.some((s) => !s.seeds.length))
    throw new AppError(422, 'Add at least one confirmed taste reference for each group.');
  const next = structuredClone(w);
  const steps: string[] = [];
  if (discover) {
    if (w.candidates.length > 16)
      throw new AppError(
        422,
        'The shortlist is nearly full. Remove partners before discovering more.',
      );
    // Four bounded calls; two at a time, never a retry loop.
    for (const segment of w.brief.segments) {
      const results = await Promise.all(
        (['artist', 'podcast'] as const).map(async (kind) => ({
          kind,
          insight: await qloo.insights(
            kind,
            segment.seeds.map((e) => e.entityId),
          ),
        })),
      );
      for (const { kind, insight } of results) {
        for (const { entity } of insight.results.slice(0, options.discoveryPerGroup ?? 6)) {
          if (next.candidates.some((c) => c.entityId === entity.entityId)) continue;
          if (next.candidates.length >= 24) break;
          next.candidates.push({
            id: randomUUID(),
            name: entity.name,
            description: entity.description,
            entityId: entity.entityId,
            kind,
            source: 'qloo',
            locked: false,
            excluded: false,
            offer: emptyOffer(),
          });
        }
      }
      steps.push(
        `Discovered artists and podcasts using the selected references for ${segment.name}.`,
      );
    }
  }
  const comparisons: Comparison[] = [];
  for (const segment of next.brief.segments) {
    const results = await Promise.all(
      (['artist', 'podcast'] as const).map(async (kind) => {
        const candidates = next.candidates.filter((c) => c.kind === kind && c.entityId);
        if (!candidates.length) return null;
        const insight = await qloo.insights(
          kind,
          segment.seeds.map((e) => e.entityId),
          candidates.map((c) => c.entityId!),
        );
        return {
          id: insight.id,
          source: 'qloo' as const,
          segment: segment.id,
          kind,
          fetchedAt: insight.fetchedAt,
          seedIds: insight.seedIds,
          candidateIds: candidates.map((c) => c.id),
          results: insight.results.flatMap((r) => {
            const c = candidates.find((c) => c.entityId === r.entity.entityId);
            return c
              ? [{ candidateId: c.id, rank: r.rank, contributingSeedIds: r.contributingSeedIds }]
              : [];
          }),
        };
      }),
    );
    comparisons.push(...results.filter((r) => r !== null));
    steps.push(`Compared the same artist and podcast shortlist for ${segment.name}.`);
  }
  if (!comparisons.length)
    throw new AppError(422, 'Add Qloo-linked partners or discover candidates first.');
  next.evidence = {
    comparisons,
    fingerprint: evidenceFingerprint(next),
    fetchedAt: new Date().toISOString(),
  };
  next.run = {
    at: new Date().toISOString(),
    steps: [
      ...steps,
      'Applied budget, availability, format, exclusivity and lock constraints.',
      'Prepared distinct packages where the available offers and evidence allow them.',
    ],
  };
  return next;
}
