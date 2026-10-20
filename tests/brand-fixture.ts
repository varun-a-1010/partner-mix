import { randomUUID } from 'node:crypto';
import type { BrandAnalyst } from '../server/brand-analyst';
import { brandBinding, type BrandAnalysis, type BrandResearch } from '../shared/brand';
import type { StoredWorkspace } from '../shared/model';

export const fixtureIntake = {
  website: 'https://example.com/',
  supportingUrls: [],
  campaignBrief:
    'A hypothetical city-walking shoe campaign for US commuters. Drive qualified product visits.',
};
export function analysisFixture(): BrandAnalysis {
  return {
    brandName: 'Test shoe brand',
    summary: 'A fictional test shoe brand. The planner proposes a city-walking campaign.',
    facts: [
      {
        topic: 'Products',
        statement: 'Everyday shoes.',
        basis: 'website',
        sources: [fixtureIntake.website],
      },
      {
        topic: 'Positioning',
        statement: 'Walking comfort.',
        basis: 'website',
        sources: [fixtureIntake.website],
      },
      { topic: 'Price point', statement: 'No verified prices.', basis: 'unknown', sources: [] },
      {
        topic: 'Target audience',
        statement: 'US commuters.',
        basis: 'campaign brief',
        sources: ['campaign brief'],
      },
    ],
    objective: 'Encourage qualified product visits.',
    successMeasure: 'Qualified visits from tagged links.',
    guardrails: ['No unsupported environmental claims.'],
    questions: [],
    directions: [
      {
        id: 'core',
        title: 'Everyday design',
        audience: 'Design-minded commuters.',
        rationale: 'Connect comfort to useful design.',
        activation: 'A design podcast walking episode.',
        references: [{ query: 'Test brand', kind: 'brand', reason: 'Brand baseline.' }],
      },
      {
        id: 'adjacent',
        title: 'City listening',
        audience: 'People exploring a city on foot.',
        rationale: 'Connect daily walking to listening.',
        activation: 'A route and soundtrack.',
        references: [
          { query: 'Test musician', kind: 'artist', reason: 'Walking soundtrack hypothesis.' },
        ],
      },
    ],
  };
}
export function researchFixture(): BrandResearch {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    model: 'test-only',
    inputBinding: brandBinding(fixtureIntake),
    analysis: analysisFixture(),
    sources: [{ url: fixtureIntake.website, retrievedAt: new Date().toISOString() }],
    warnings: [],
    resolutions: [],
  };
}
export const mockAnalyst = (): BrandAnalyst => ({
  status: 'configured',
  research: async () => {
    const r = researchFixture();
    return { analysis: r.analysis, model: r.model, sources: r.sources, warnings: [] };
  },
  assess: async (research, candidates) =>
    candidates.map((c) => ({
      candidateId: c.id,
      researchId: research.id,
      assessedAt: new Date().toISOString(),
      disposition: 'investigate',
      role: 'Tell a city-walking story.',
      rationale: 'A test creative connection, not an audience claim.',
      activation: 'A hypothetical walking episode or soundtrack.',
      concerns: ['Confirm relevant listeners and willingness.'],
      sourceUrls: [],
    })),
});
// Explicit, approved strategy for solver fixtures; not a migration for old workspaces.
export function attachTestStrategy(w: StoredWorkspace) {
  w.intake = structuredClone(fixtureIntake);
  w.research = researchFixture();
  w.research.approved = {
    at: w.research.createdAt,
    references: w.brief.segments.flatMap((s) => s.seeds.map((e) => e.entityId)),
  };
  for (const c of w.candidates)
    c.assessment = {
      candidateId: c.id,
      researchId: w.research.id,
      assessedAt: w.research.createdAt,
      disposition: 'investigate',
      role: 'Test campaign role',
      rationale: 'Fixture hypothesis.',
      activation: 'Fixture activation.',
      concerns: ['Verify commercial terms.'],
      sourceUrls: [],
    };
}
