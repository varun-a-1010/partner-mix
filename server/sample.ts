import type { BrandIntake } from '../shared/brand';
import type { StoredWorkspace } from '../shared/model';

export const sampleIntake: BrandIntake = {
  website: 'https://topgolf.com/us/',
  supportingUrls: ['https://topgolf.com/us/experience/'],
  campaignBrief:
    'Independent hypothetical Topgolf campaign, not an actual campaign or endorsement. Plan a US pilot across all Chicago-area Topgolf venues as a group, to bring adults who do not play golf to a first visit with friends. No single venue has to be chosen for this exploratory shortlist. Reach adult groups looking for a night out built around food, music and friendly competition. Desired action: a first bay booking, with individual venue links. For the hypothetical pilot, qualified means a tagged visitor opens a venue booking page. Explore music artists and podcasts with two complementary creative directions: one music partner and one podcast, using a live session at a venue or a hosted episode. Proposed pilot window: November 1–30, 2026. Use a USD 25,000 total planning budget and 10% reserve, including any creative production; real rates, rights, audience geography and availability are unknown and must be checked before outreach or commitment. Avoid unsupported claims about venue availability or invented audience demographics. Propose useful first-timer storytelling rather than generic celebrity promotion. This is a research shortlist, so unknown commercial terms are follow-up questions rather than reasons to postpone discovery.',
};
export function prepareSample(w: StoredWorkspace) {
  w.intake = structuredClone(sampleIntake);
  w.brief.brand = 'Topgolf';
  w.brief.campaign = 'First swing: a hypothetical pilot';
  w.brief.goal = 'Bring non-golfers in for a first night out with friends.';
  w.brief.currency = 'USD';
  w.brief.budget = 25_000;
  w.brief.start = '2026-11-01';
  w.brief.end = '2026-11-30';
  w.sample = {
    source: 'qloo',
    generatedAt: new Date().toISOString(),
    scenario: 'topgolf-first-swing',
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
