import type { BrandIntake } from '../shared/brand';
import type { StoredWorkspace } from '../shared/model';

export const allbirdsIntake: BrandIntake = {
  website: 'https://www.allbirds.com/',
  supportingUrls: [
    'https://www.allbirds.com/pages/our-story',
    'https://www.allbirds.com/pages/materials-making',
  ],
  campaignBrief:
    'Independent hypothetical Allbirds campaign, not an actual campaign or endorsement. Plan a US pilot for everyday walking shoes made with alternative materials. Reach city commuters and design-conscious shoppers who want comfortable everyday shoes. Desired action: a qualified visit to a shoe product page. Explore music artists and podcasts with two complementary creative directions. Use a USD 25,000 planning budget and 10% reserve; rates and availability are unknown. Avoid unsupported environmental superiority claims or invented audience demographics. Propose useful city-walking storytelling rather than generic celebrity promotion.',
};
export function prepareSample(w: StoredWorkspace) {
  w.intake = structuredClone(allbirdsIntake);
  w.brief.brand = 'Allbirds';
  w.brief.campaign = 'A city on foot — hypothetical pilot';
  w.brief.goal = 'Bring city walkers to everyday shoe product pages.';
  w.brief.currency = 'USD';
  w.brief.budget = 25_000;
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
