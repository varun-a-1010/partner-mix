import type { BrandIntake } from '../shared/brand';
import type { StoredWorkspace } from '../shared/model';

export const allbirdsIntake: BrandIntake = {
  website: 'https://www.allbirds.com/',
  supportingUrls: [
    'https://www.allbirds.com/pages/our-story',
    'https://www.allbirds.com/pages/materials-making',
  ],
  campaignBrief:
    'Independent hypothetical Allbirds campaign, not an actual campaign or endorsement. Plan a US pilot, focused on New York City, for everyday walking shoes made with alternative materials. Reach adult city commuters and design-conscious shoppers who want comfortable everyday shoes. Desired action: a qualified visit to an everyday-shoe collection landing page, with individual product links; no single SKU is required for this exploratory shortlist. For the hypothetical pilot, qualified means a tagged visitor views a product and spends at least 30 seconds on the site. Explore music artists and podcasts with two complementary creative directions: one music partner and one podcast, using walking stories, a commissioned soundtrack or a hosted episode. Proposed pilot window: November 1–30, 2026. Use a USD 25,000 total planning budget and 10% reserve, including any creative production; real rates, rights, audience geography and availability are unknown and must be checked before outreach or commitment. Avoid unsupported environmental superiority claims or invented audience demographics. Propose useful city-walking storytelling rather than generic celebrity promotion. This is a research shortlist, so unknown commercial terms are follow-up questions rather than reasons to postpone discovery.',
};
export function prepareSample(w: StoredWorkspace) {
  w.intake = structuredClone(allbirdsIntake);
  w.brief.brand = 'Allbirds';
  w.brief.campaign = 'A city on foot — hypothetical pilot';
  w.brief.goal = 'Bring city walkers to everyday shoe product pages.';
  w.brief.currency = 'USD';
  w.brief.budget = 25_000;
  w.brief.start = '2026-11-01';
  w.brief.end = '2026-11-30';
  w.sample = {
    source: 'qloo',
    generatedAt: new Date().toISOString(),
    scenario: 'allbirds-walking',
  };
}
export function addSampleEstimates(w: StoredWorkspace, newIds: Set<string>) {
  for (const [i, c] of w.candidates.entries()) {
    if (!newIds.has(c.id)) continue;
    c.offer = {
      ...c.offer,
      amount: c.kind === 'artist' ? 6000 + i * 500 : 3500 + i * 300,
      basis: 'estimate',
      source: 'Illustrative sample budget input, not a quote from this partner.',
      deliverables:
        'Example scope only. Agree the activation, deliverables and rights directly with the partner.',
      availability: 'unknown',
    };
  }
}
