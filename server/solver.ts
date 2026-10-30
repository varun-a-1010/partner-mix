import { createHash } from 'node:crypto';
import { audienceMarkdown } from '../shared/audience';
import type {
  Candidate,
  Comparison,
  Coverage,
  Package,
  Planning,
  Workspace,
} from '../shared/model';
import { money, sampleDescription, strategyNames } from '../shared/model';
import { brandReady } from '../shared/brand';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function evidenceFingerprint(w: Workspace) {
  return digest({
    segments: w.brief.segments.map((s) => ({
      id: s.id,
      seeds: s.seeds.map((e) => e.entityId.toUpperCase()).sort(),
    })),
    candidates: w.candidates
      .map((c) => [c.id, c.entityId?.toUpperCase() ?? '', c.kind])
      .sort((a, b) => a[0].localeCompare(b[0])),
  });
}
export function inputFingerprint(w: Workspace) {
  return digest({
    brief: w.brief,
    intake: w.intake,
    research: w.research,
    candidates: w.candidates,
    evidence: w.evidence,
  });
}
export const spendLimit = (w: Workspace) =>
  Math.floor((w.brief.budget * (100 - w.brief.reservePercent)) / 100);

function reason(c: Candidate, w: Workspace): string | undefined {
  if (c.excluded) return 'Excluded from this campaign.';
  if (w.research && (!c.assessment || c.assessment.researchId !== w.research.id))
    return 'Assess this partner against the current brand strategy before including them.';
  if (c.assessment?.disposition === 'poor-fit')
    return 'The available evidence indicates a weak fit for this campaign.';
  if (c.assessment?.disposition === 'hold')
    return 'Strategic fit needs more evidence before this partner enters a proposed mix.';
  if (c.offer.availability === 'unavailable') return 'Marked unavailable.';
  if (c.offer.amount === null) return 'Add an estimate or quote before costing a package.';
  if (
    c.offer.availability === 'available' &&
    w.brief.start &&
    (c.offer.from > w.brief.start || c.offer.until < w.brief.end)
  )
    return 'Confirmed dates do not cover the campaign.';
  return undefined;
}
function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  return items.flatMap((x, i) =>
    combinations(items.slice(i + 1), size - 1).map((xs) => [x, ...xs]),
  );
}
const rankUtility = (rank: number, count: number) => (count > 1 ? (count - rank) / (count - 1) : 0);
function bestCoverage(partners: Candidate[], comparisons: Comparison[], w: Workspace): Coverage[] {
  return w.brief.segments.flatMap((segment) => {
    const rows = comparisons
      .filter((q) => q.segment === segment.id && q.results.length >= 2)
      .flatMap((q) =>
        q.results
          .filter((r) => partners.some((c) => c.id === r.candidateId))
          .map((r) => ({
            segment: segment.id,
            name: segment.name,
            candidateId: r.candidateId,
            rank: r.rank,
            of: q.results.length,
            kind: q.kind,
            queryId: q.id,
            source: q.source,
          })),
      )
      .sort(
        (a, b) =>
          rankUtility(b.rank, b.of) - rankUtility(a.rank, a.of) ||
          a.candidateId.localeCompare(b.candidateId),
      );
    return rows.length ? [rows[0]] : [];
  });
}
function completeEvidence(w: Workspace, comparisons: Comparison[]) {
  return w.brief.segments.every((s) =>
    (['artist', 'podcast'] as const).every((kind) => {
      const candidates = w.candidates.filter((c) => c.kind === kind);
      if (!candidates.length) return true;
      const q = comparisons.find((r) => r.kind === kind && r.segment === s.id);
      return (
        candidates.length >= 2 &&
        !!q &&
        candidates.every((c) => q.results.some((r) => r.candidateId === c.id))
      );
    }),
  );
}
function makePackage(partners: Candidate[], w: Workspace, qs: Comparison[]): Package {
  const total = partners.reduce((n, c) => n + c.offer.amount!, 0);
  const coverage = bestCoverage(partners, qs, w);
  const unresolved = partners.flatMap((c) => [
    ...(c.assessment?.concerns.map((s) => `${c.name}: ${s}`) ?? []),
    `${c.name}: verify target-audience evidence and usage rights independently.`,
    ...(c.offer.basis === 'estimate' ? [`${c.name}: obtain a written quote.`] : []),
    ...(!c.offer.deliverables ? [`${c.name}: agree deliverables and usage rights.`] : []),
    ...(c.offer.availability === 'unknown'
      ? [`${c.name}: confirm availability for the campaign dates.`]
      : []),
  ]);
  if (!w.brief.start) unresolved.push('Choose campaign dates and reconfirm every partner.');
  if (w.demo) unresolved.unshift(sampleDescription(w));
  const rationale = coverage.map((c) => {
    const name = partners.find((p) => p.id === c.candidateId)!.name;
    return `${name} contributes the strongest relative evidence in this mix for ${c.name}: #${c.rank} of ${c.of} ${c.kind === 'artist' ? 'artists' : 'podcasts'} compared.`;
  });
  rationale.unshift(
    ...partners.flatMap((c) =>
      c.assessment ? [`${c.name}: ${c.assessment.role}. ${c.assessment.rationale}`] : [],
    ),
  );
  return {
    id: digest(partners.map((c) => c.id).sort()).slice(0, 20),
    strategy: 'balanced',
    title: strategyNames.balanced,
    partnerIds: partners.map((c) => c.id),
    total,
    headroom: spendLimit(w) - total,
    coverage,
    unresolved,
    rationale,
  };
}
export function solve(w: Workspace): Planning {
  const excluded = w.candidates.flatMap((c) => {
    const r = reason(c, w);
    return r ? [{ id: c.id, reason: r }] : [];
  });
  const eligible = w.candidates.filter((c) => !excluded.some((e) => e.id === c.id));
  const locked = w.candidates.filter((c) => c.locked);
  const blockers: string[] = [];
  if (!brandReady(w))
    blockers.push('Review the brand understanding and approve its partnership directions first.');
  for (const c of locked) {
    const problem = excluded.find((e) => e.id === c.id);
    if (problem) blockers.push(`Locked partner ${c.name}: ${problem.reason}`);
  }
  if (locked.length > w.brief.partnerCount)
    blockers.push(
      'More partners are locked than the campaign allows. Unlock one or increase the count.',
    );
  if (eligible.length < w.brief.partnerCount)
    blockers.push(
      `Need ${w.brief.partnerCount} costed, eligible partners; currently ${eligible.length}.`,
    );

  const fingerprint = evidenceFingerprint(w);
  const qs = w.evidence?.fingerprint === fingerprint ? w.evidence.comparisons : [];
  const evidenceStatus: Planning['evidenceStatus'] = !w.evidence
    ? 'missing'
    : w.evidence.fingerprint !== fingerprint
      ? 'stale'
      : completeEvidence(w, qs)
        ? 'current'
        : 'partial';
  // Missing evidence never becomes zero affinity. Incomplete coverage disables
  // cultural ranking for every package, leaving a transparent cost-only ordering.
  const usable = evidenceStatus === 'current' ? qs : [];
  const feasible = blockers.length
    ? []
    : combinations(eligible, w.brief.partnerCount)
        .filter((cs) => locked.every((l) => cs.some((c) => c.id === l.id)))
        .filter((cs) => !w.brief.mixedFormats || new Set(cs.map((c) => c.kind)).size === 2)
        .filter((cs) => {
          const groups = cs.map((c) => c.offer.conflictGroup.trim().toLowerCase()).filter(Boolean);
          return new Set(groups).size === groups.length;
        })
        .filter((cs) => cs.reduce((n, c) => n + c.offer.amount!, 0) <= spendLimit(w))
        .map((cs) => makePackage(cs, w, usable));
  if (!feasible.length && !blockers.length)
    blockers.push(
      'No combination fits the budget, format mix, locks and exclusivity constraints together.',
    );

  const strength = (p: Package, id: 'core' | 'adjacent') => {
    const c = p.coverage.find((r) => r.segment === id);
    return c ? rankUtility(c.rank, c.of) : 0;
  };
  const score = (p: Package, strategy: Package['strategy']) => {
    const core = strength(p, 'core'),
      adjacent = strength(p, 'adjacent');
    if (strategy === 'core') return [core, adjacent];
    if (strategy === 'adjacent') return [adjacent, core];
    return [Math.min(core, adjacent), core + adjacent];
  };
  const options: Package[] = [];
  const strategies: Package['strategy'][] =
    evidenceStatus === 'current' ? ['balanced', 'core', 'adjacent', 'cost'] : ['cost'];
  for (const strategy of strategies) {
    const ordered = [...feasible].sort((a, b) => {
      if (strategy !== 'cost') {
        const sa = score(a, strategy),
          sb = score(b, strategy);
        for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sb[i] - sa[i];
        // Prefer distinct cultural contributors only after the stated objective ties.
        const contributors = (p: Package) => new Set(p.coverage.map((c) => c.candidateId)).size;
        if (contributors(a) !== contributors(b)) return contributors(b) - contributors(a);
      }
      return a.total - b.total || a.id.localeCompare(b.id);
    });
    const best = ordered[0];
    // Do not relabel the same optimum as three different recommendations.
    if (best && !options.some((o) => o.id === best.id)) {
      options.push({ ...best, strategy, title: strategyNames[strategy] });
    }
  }
  const questions = [
    ...(w.brief.segments.every((s) => s.seeds.length) &&
    w.brief.segments[0].seeds
      .map((e) => e.entityId)
      .sort()
      .join(',') ===
      w.brief.segments[1].seeds
        .map((e) => e.entityId)
        .sort()
        .join(',')
      ? ['Both groups use the same taste references. What should distinguish the adjacent group?']
      : []),
    ...(!w.brief.start ? ['What dates should every partner be available for?'] : []),
    ...(excluded.some((e) => w.candidates.find((c) => c.id === e.id)?.offer.amount === null)
      ? ['Can you add an estimate or quote for the partners without a cost?']
      : []),
    ...(evidenceStatus !== 'current'
      ? ['Add taste references and compare the whole shortlist to enable cultural ranking.']
      : []),
    ...(blockers.length
      ? ['Which constraint can change: budget, partner count, format mix or a lock?']
      : []),
  ];
  return {
    options: options.slice(0, 3),
    feasibleCount: feasible.length,
    blockers,
    excluded,
    evidenceStatus,
    questions,
  };
}

export function exportBrief(w: Workspace): string {
  const p = w.selection?.package;
  const stale = !!w.selection && w.selection.inputFingerprint !== inputFingerprint(w);
  if (w.selection)
    w = {
      ...w,
      brief: w.selection.brief,
      evidence: w.selection.evidence,
      research: w.selection.research,
      intake: w.selection.intake,
      audience: w.selection.audience,
    };
  const lines = [
    `# ${w.brief.campaign}`,
    '',
    `${w.brief.brand} · Partner Mix`,
    '',
    w.demo ? `**${sampleDescription(w)}**` : '',
    `Goal: ${w.brief.goal}`,
    `Dates: ${w.brief.start || 'Not set'} to ${w.brief.end || 'Not set'}`,
    `Budget: ${money(w.brief.budget, w.brief.currency)}; ${w.brief.reservePercent}% reserved.`,
    '',
    '## Brand understanding and campaign strategy',
    '',
    ...(w.research
      ? [
          `Website: ${w.intake?.website ?? 'Not supplied'}`,
          w.research.analysis.summary,
          ...w.research.analysis.facts.map(
            (f) =>
              `- ${f.topic} (${f.basis}): ${f.statement}${f.sources.length ? ` Sources: ${f.sources.join(', ')}` : ''}`,
          ),
          `Success measure: ${w.research.analysis.successMeasure}`,
          ...w.research.analysis.directions.map(
            (d) => `- ${d.title}: ${d.rationale} Activation hypothesis: ${d.activation}`,
          ),
          ...w.research.analysis.guardrails.map((g) => `- Guardrail: ${g}`),
          `Research: ${w.research.model}, ${w.research.createdAt}. Reviewed: ${w.research.approved?.at ?? 'Not reviewed'}.`,
        ]
      : ['No reviewed brand research.']),
    '',
    '## Decision',
    '',
    stale ? '**This saved decision is out of date. Rebuild and choose a current package.**' : '',
  ];
  if (!p || !w.selection) lines.push('No package chosen yet.');
  else {
    lines.push(p.title, `Total entered partner costs: ${money(p.total, w.brief.currency)}`, '');
    for (const c of w.selection.partners) {
      lines.push(
        `### ${c.name} (${c.kind})`,
        `Cost: ${money(c.offer.amount!, w.brief.currency)} (${c.offer.basis})`,
        `Source: ${c.offer.source || 'Not supplied'}`,
        `Deliverables: ${c.offer.deliverables || 'To be agreed'}`,
        `Availability: ${c.offer.availability}; ${c.offer.from || 'dates unknown'} – ${c.offer.until || 'dates unknown'}`,
        ...(c.assessment
          ? [
              `Campaign role: ${c.assessment.role}`,
              `Strategic hypothesis: ${c.assessment.rationale}`,
              `Activation hypothesis: ${c.assessment.activation}`,
              ...c.assessment.concerns.map((s) => `- Verify: ${s}`),
            ]
          : []),
        '',
      );
    }
    for (const c of w.selection.partners) {
      if (c.entityId) lines.push(...audienceMarkdown(w.audience, { id: c.entityId, name: c.name }));
    }
    lines.push(
      '## Why this mix',
      '',
      ...p.rationale.map((s) => `- ${s}`),
      '',
      '## Open confirmations',
      '',
      ...p.unresolved.map((s) => `- ${s}`),
    );
    if (!p.rationale.length)
      lines.push('No complete cultural comparison. This package was cost-ranked.');
  }
  lines.push(
    '',
    '## Cultural evidence',
    '',
    'Groups are hypotheses defined by the planner’s taste references, not measured customer segments.',
    ...w.brief.segments.map(
      (s) =>
        `${s.name}: ${s.seeds.map((e) => `${e.name} [${e.entityId}]`).join(', ') || 'No references'}`,
    ),
    ...(w.evidence?.comparisons ?? []).map(
      (q) =>
        `- ${q.source} query ${q.id}: ${q.segment}/${q.kind}, ${q.fetchedAt}. Compared ${q.results.length} of ${q.candidateIds.length} partners.`,
    ),
    '',
    'Ranks compare the same shortlist and entity type within each query. The portfolio uses a transparent ordinal heuristic; it does not estimate reach, duplicated followers or ROI.',
    '',
    '## Pilot measurement plan',
    '',
    '- Agree a separate tracked link or code and delivery evidence for each partner.',
    '- Set the primary conversion event and baseline before launch.',
    '- Review delivered content, qualified visits and conversions after the pilot.',
    '- Treat attribution and lift as separate measurement questions; Qloo affinity is not a result prediction.',
    '',
    'No offers accepted, rights cleared, messages sent or bookings made by this app.',
  );
  return lines.filter((s) => s !== undefined).join('\n');
}
