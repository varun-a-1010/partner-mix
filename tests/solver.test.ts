import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { legacyWorkspace } from './legacy-fixture';
import {
  evidenceFingerprint,
  exportBrief,
  inputFingerprint,
  solve,
  spendLimit,
} from '../server/solver';
import { emptyOffer } from '../shared/model';
import { attachTestStrategy } from './brand-fixture';

const demo = () => {
  const w = legacyWorkspace().workspace;
  attachTestStrategy(w);
  return w;
};
describe('campaign portfolio decisions', () => {
  it('combines complementary partners instead of simply taking both core favorites', () => {
    const w = demo(),
      result = solve(w),
      best = result.options[0];
    expect(best.partnerIds.map((id) => w.candidates.find((c) => c.id === id)!.name).sort()).toEqual(
      ['Low Tide Assembly', 'Trail Notes'],
    );
    expect(best.coverage.map((r) => r.rank)).toEqual([1, 1]);
    expect(best.total).toBe(370_000);
    expect(result.feasibleCount).toBe(14);
    expect(new Set(result.options.map((p) => p.id)).size).toBe(result.options.length);
    expect(result.options.find((p) => p.strategy === 'cost')?.total).toBe(250_000);
  });
  it('enforces the reserve, partner count, format mix and locks in every result', () => {
    const w = demo();
    const anchor = w.candidates.find((c) => c.name === 'Trail Notes')!;
    anchor.locked = true;
    w.brief.budget = 390_000;
    for (const p of solve(w).options) {
      expect(p.total).toBeLessThanOrEqual(spendLimit(w));
      expect(p.partnerIds).toContain(anchor.id);
      expect(p.partnerIds).toHaveLength(2);
      expect(
        new Set(w.candidates.filter((c) => p.partnerIds.includes(c.id)).map((c) => c.kind)).size,
      ).toBe(2);
    }
    expect(solve(w).options.length).toBeGreaterThan(0);
  });
  it('does not silently drop an unavailable locked partner', () => {
    const w = demo();
    w.candidates[0].locked = true;
    w.candidates[0].offer.availability = 'unavailable';
    const result = solve(w);
    expect(result.options).toEqual([]);
    expect(result.blockers.join(' ')).toContain('Locked partner Trail Notes');
    expect(w.candidates[0].locked).toBe(true);
  });
  it('excludes unknown costs and out-of-window confirmations while keeping unknown availability explicit', () => {
    const w = demo();
    w.candidates[0].offer.amount = null;
    w.candidates[1].offer.from = '2099-01-01';
    w.candidates[1].offer.until = '2099-01-02';
    w.candidates[6].offer.availability = 'unknown';
    const r = solve(w);
    expect(r.excluded.map((e) => e.id)).toEqual(
      expect.arrayContaining([w.candidates[0].id, w.candidates[1].id]),
    );
    const cheapest = r.options.find((p) => p.partnerIds.includes(w.candidates[6].id))!;
    expect(cheapest.unresolved.join(' ')).toContain('confirm availability');
  });
  it('does not place mutually exclusive partners together', () => {
    const w = demo();
    w.candidates[0].locked = true;
    w.candidates[0].offer.conflictGroup = 'Same-agency';
    w.candidates[5].offer.conflictGroup = ' same-AGENCY ';
    expect(solve(w).options.every((p) => !p.partnerIds.includes(w.candidates[5].id))).toBe(true);
  });
  it('repairs a quote increase while retaining a locked anchor', () => {
    const w = demo(),
      before = solve(w).options[0];
    w.candidates[0].locked = true;
    w.candidates[5].offer.amount = 400_000;
    const after = solve(w).options[0];
    expect(after.partnerIds).toContain(w.candidates[0].id);
    expect(after.partnerIds).not.toContain(w.candidates[5].id);
    expect(before.partnerIds).toContain(w.candidates[5].id);
    expect(after.total).toBeLessThanOrEqual(spendLimit(w));
    expect(solve(w).evidenceStatus).toBe('current');
  });
  it('does not score missing results as zero or silently reward incomplete evidence', () => {
    const w = demo();
    w.evidence!.comparisons[0].results.pop();
    const result = solve(w);
    expect(result.evidenceStatus).toBe('partial');
    expect(result.options.map((p) => p.strategy)).toEqual(['cost']);
    expect(result.options[0].coverage).toEqual([]);
  });
  it('invalidates evidence when seeds or the candidate pool changes, but not quotes', () => {
    const w = demo(),
      initial = evidenceFingerprint(w);
    w.candidates[0].offer.amount = 1;
    expect(evidenceFingerprint(w)).toBe(initial);
    w.candidates.push({
      id: randomUUID(),
      name: 'Manual',
      kind: 'artist',
      description: '',
      source: 'manual',
      locked: false,
      excluded: false,
      offer: emptyOffer(),
    });
    expect(solve(w).evidenceStatus).toBe('stale');
    const w2 = demo();
    w2.brief.segments[0].seeds[0].entityId = randomUUID();
    expect(solve(w2).evidenceStatus).toBe('stale');
  });
  it('does not turn a one-entity comparison into a perfect score', () => {
    const w = demo();
    w.candidates = [w.candidates[0], w.candidates[5]];
    w.evidence!.fingerprint = evidenceFingerprint(w);
    for (const q of w.evidence!.comparisons)
      q.results = q.results.filter((r) => w.candidates.some((c) => c.id === r.candidateId));
    expect(solve(w).evidenceStatus).toBe('partial');
  });
  it('exports provenance, unconfirmed work and a stale decision warning', () => {
    const w = demo(),
      p = solve(w).options[0];
    w.selection = {
      package: p,
      partners: w.candidates.filter((c) => p.partnerIds.includes(c.id)),
      brief: structuredClone(w.brief),
      evidence: structuredClone(w.evidence),
      research: structuredClone(w.research),
      intake: structuredClone(w.intake),
      chosenAt: new Date().toISOString(),
      inputFingerprint: inputFingerprint(w),
    };
    w.brief.goal = 'A changed goal';
    w.research!.analysis.summary = 'A completely different brand.';
    const md = exportBrief(w);
    expect(md).toContain('out of date');
    expect(md).toContain('Fictional sample');
    expect(md).toContain('not measured customer segments');
    expect(md).toContain(w.evidence!.comparisons[0].id);
    expect(md).not.toContain(w.ownerHash);
    expect(md).not.toContain('A changed goal');
    expect(md).not.toContain('A completely different brand.');
    expect(md).toContain('fictional test shoe brand');
  });
  it('works without Qloo and keeps estimates visibly unresolved', () => {
    const w = demo();
    delete w.evidence;
    w.candidates.forEach((c) => {
      c.offer.basis = 'estimate';
    });
    const r = solve(w);
    expect(r.options).toHaveLength(1);
    expect(r.options[0].strategy).toBe('cost');
    expect(r.options[0].unresolved.join(' ')).toContain('obtain a written quote');
  });
  it('blocks unreviewed strategy and excludes poor, uncertain or stale strategic fits despite strong cultural ranks', () => {
    const w = demo();
    delete w.research!.approved;
    expect(solve(w).options).toEqual([]);
    attachTestStrategy(w);
    w.candidates[0].assessment!.disposition = 'poor-fit';
    w.candidates[5].assessment!.disposition = 'hold';
    w.candidates[6].assessment!.researchId = 'previous-research';
    const result = solve(w);
    expect(result.options.length).toBeGreaterThan(0);
    expect(result.excluded.map((e) => e.id)).toEqual(
      expect.arrayContaining([w.candidates[0].id, w.candidates[5].id, w.candidates[6].id]),
    );
    for (const option of result.options) {
      expect(option.partnerIds).not.toContain(w.candidates[0].id);
      expect(option.partnerIds).not.toContain(w.candidates[5].id);
      expect(option.partnerIds).not.toContain(w.candidates[6].id);
    }
    w.intake!.campaignBrief += ' A different target.';
    expect(solve(w).options).toEqual([]);
  });
});

it('keeps audience and exploration context out of ordering and exports their saved decision snapshot', () => {
  const w = demo(),
    p = solve(w).options[0];
  const selected = w.candidates.filter((c) => p.partnerIds.includes(c.id));
  const fingerprint = inputFingerprint(w);
  w.audience = {
    profiles: selected.map((c) => ({
      entityId: c.entityId!,
      status: 'available',
      age: { '55_and_older': 0.11 },
      gender: {},
      fetchedAt: '2026-10-30T00:00:00Z',
      request: { path: '/v2/insights', params: { 'filter.type': 'urn:demographics' } },
    })),
  };
  const partner = selected[0];
  w.partnerships = {
    [partner.entityId!]: {
      id: randomUUID(),
      createdAt: '2026-10-30T00:00:00Z',
      a: { id: randomUUID(), name: w.brief.brand, kind: 'brand' },
      b: { id: partner.entityId!, name: partner.name, kind: partner.kind },
      options: { includeHeatmap: false },
      directions: [],
      tastes: {
        shared: [{ id: 'urn:tag:genre:folk', name: 'Saved folk interest', rank: 1, queryId: 'P1' }],
        aOnly: [],
        bOnly: [],
        queries: ['P1', 'P2'],
        available: [true, true],
      },
      activations: [],
      ledger: [],
    },
  };
  expect(inputFingerprint(w)).toBe(fingerprint);
  expect(solve(w).options[0]).toEqual(p);
  w.selection = {
    package: p,
    partners: selected,
    brief: structuredClone(w.brief),
    evidence: structuredClone(w.evidence),
    research: structuredClone(w.research),
    intake: structuredClone(w.intake),
    audience: structuredClone(w.audience),
    partnerships: structuredClone(w.partnerships),
    chosenAt: new Date().toISOString(),
    inputFingerprint: fingerprint,
  };
  for (const profile of w.audience.profiles) profile.age['55_and_older'] = 0.99;
  w.partnerships[partner.entityId!].tastes.shared[0].name = 'Refreshed interest';
  const exported = exportBrief(w);
  expect(exported).toContain('+0.11');
  expect(exported).not.toContain('+0.99');
  expect(exported).toContain('Saved folk interest');
  expect(exported).not.toContain('Refreshed interest');
});
