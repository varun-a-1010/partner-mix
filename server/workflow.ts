import type { PairOptions } from '../shared/partnership';
import { collectAudiences } from './audience';
import { randomUUID } from 'node:crypto';
import type { Candidate, Comparison, StoredWorkspace } from '../shared/model';
import { emptyOffer, isLegacySample } from '../shared/model';
import { AppError } from './store';
import type { Qloo } from './qloo';
import { evidenceFingerprint } from './solver';
import { brandReady } from '../shared/brand';

/**
 * Qloo can omit an entity from a comparison. A partner it just suggested is left out rather than
 * ranked by guesswork. Partners the planner chose stay, so their missing coverage is reported.
 */
export function omitUncompared(
  w: { candidates: Candidate[] },
  comparisons: Comparison[],
  discovered: Set<string>,
) {
  const omitted = w.candidates.filter(
    (c) =>
      discovered.has(c.id) &&
      comparisons.some((q) => q.kind === c.kind && !q.results.some((r) => r.candidateId === c.id)),
  );
  const gone = new Set(omitted.map((c) => c.id));
  w.candidates = w.candidates.filter((c) => !gone.has(c.id));
  for (const q of comparisons) q.candidateIds = q.candidateIds.filter((id) => !gone.has(id));
  return omitted.map((c) => c.name);
}

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
  const discovered = new Set<string>();
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
          const id = randomUUID();
          discovered.add(id);
          next.candidates.push({
            id,
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
  const omitted = omitUncompared(next, comparisons, discovered);
  if (omitted.length)
    steps.push(`Left out ${omitted.join(', ')} because Qloo returned no comparison.`);
  next.audience = await loadAudienceContext(next, qloo);
  steps.push(
    'Loaded age and gender affinity context separately from the cultural package ordering.',
  );
  next.evidence = {
    comparisons,
    fingerprint: evidenceFingerprint(next),
    fetchedAt: new Date().toISOString(),
  };
  next.run = {
    at: new Date().toISOString(),
    steps,
  };
  return next;
}

export async function loadAudienceContext(w: StoredWorkspace, qloo: Qloo) {
  if (isLegacySample(w))
    throw new AppError(400, 'Fictional sample entities cannot load audience context.');
  if (!brandReady(w))
    throw new AppError(422, 'Review and approve the brand before loading audience context.');
  if (qloo.status !== 'configured') throw new AppError(503, 'Qloo is not connected.');
  let subject = w.audience?.subject?.name === w.brief.brand ? w.audience.subject : undefined;
  let subjectNote: string | undefined;
  if (!subject) {
    try {
      const normalize = (s: string) => s.normalize('NFKC').trim().toLowerCase();
      const matches = (await qloo.search(w.brief.brand, 'brand')).filter(
        (e) => normalize(e.name) === normalize(w.brief.brand),
      );
      if (matches.length === 1) subject = { id: matches[0].entityId, name: matches[0].name };
      else
        subjectNote =
          'The campaign brand could not be identified unambiguously in Qloo. Showing partner signals only.';
    } catch {
      subjectNote = 'The campaign brand could not be looked up. Showing available partner signals.';
    }
  }
  return collectAudiences(
    qloo,
    [
      ...(subject ? [subject.id] : []),
      ...w.candidates.flatMap((c) => (c.entityId ? [c.entityId] : [])),
    ],
    subject,
    w.audience,
    subjectNote,
  );
}

export async function explorePartnership(
  w: StoredWorkspace,
  qloo: Qloo,
  partnerId: string,
  options: PairOptions,
) {
  if (isLegacySample(w) || !brandReady(w))
    throw new AppError(422, 'Review the brand strategy before exploring a real partnership.');
  const candidate = w.candidates.find((c) => c.entityId?.toUpperCase() === partnerId.toUpperCase());
  if (!candidate?.entityId)
    throw new AppError(404, 'Choose a Qloo-linked partner from this campaign.');
  if (qloo.status !== 'configured') throw new AppError(503, 'Qloo is not connected.');
  let subject = w.audience?.subject?.name === w.brief.brand ? w.audience.subject : undefined;
  if (!subject) {
    const normalize = (s: string) => s.normalize('NFKC').trim().toLowerCase();
    const matches = (await qloo.search(w.brief.brand, 'brand')).filter(
      (e) => normalize(e.name) === normalize(w.brief.brand),
    );
    if (matches.length !== 1)
      throw new AppError(
        422,
        'The campaign brand is ambiguous or missing in Qloo. Try its exact brand name in the reviewed brand brief.',
      );
    subject = { id: matches[0].entityId, name: matches[0].name };
  }
  return qloo.partnership(
    { ...subject, kind: 'brand' },
    { id: candidate.entityId, name: candidate.name, kind: candidate.kind },
    options,
  );
}
