import type { StoredWorkspace } from '../shared/model';
import { SAMPLE_CAMPAIGNS } from '../shared/samples';

export const sampleIntake = SAMPLE_CAMPAIGNS[0]!.intake;
export function prepareSample(w: StoredWorkspace, id?: string) {
  const sample = SAMPLE_CAMPAIGNS.find((s) => s.id === id) ?? SAMPLE_CAMPAIGNS[0]!;
  w.intake = structuredClone(sample.intake);
  w.brief.brand = sample.brand;
  w.brief.campaign = sample.campaign;
  w.brief.goal = sample.goal;
  w.brief.currency = 'USD';
  w.brief.budget = sample.budget;
  w.brief.start = sample.start;
  w.brief.end = sample.end;
  w.sample = {
    source: 'qloo',
    generatedAt: new Date().toISOString(),
    scenario: sample.id,
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
