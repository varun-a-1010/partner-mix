export const seedKinds = ['brand', 'artist', 'podcast', 'movie', 'book'] as const;
export type SeedKind = (typeof seedKinds)[number];
export type PartnerKind = 'artist' | 'podcast';
export type Entity = {
  entityId: string;
  name: string;
  kind: SeedKind;
  description: string;
};
export type Segment = { id: 'core' | 'adjacent'; name: string; seeds: Entity[] };
export type Brief = {
  brand: string;
  campaign: string;
  goal: string;
  currency: 'INR' | 'USD' | 'GBP' | 'EUR';
  budget: number;
  reservePercent: number;
  partnerCount: 2 | 3;
  mixedFormats: boolean;
  start: string;
  end: string;
  segments: [Segment, Segment];
};
export type Offer = {
  amount: number | null;
  basis: 'estimate' | 'quote';
  source: string;
  deliverables: string;
  availability: 'unknown' | 'available' | 'unavailable';
  from: string;
  until: string;
  conflictGroup: string;
};
export type Candidate = {
  id: string;
  name: string;
  kind: PartnerKind;
  description: string;
  entityId?: string;
  source: 'manual' | 'qloo' | 'sample';
  offer: Offer;
  locked: boolean;
  excluded: boolean;
};
export type Comparison = {
  id: string;
  source: 'qloo' | 'sample';
  segment: 'core' | 'adjacent';
  kind: PartnerKind;
  fetchedAt: string;
  seedIds: string[];
  candidateIds: string[];
  results: { candidateId: string; rank: number; contributingSeedIds: string[] }[];
};
export type Evidence = {
  comparisons: Comparison[];
  fingerprint: string;
  fetchedAt: string;
};
export type Coverage = {
  segment: 'core' | 'adjacent';
  name: string;
  candidateId: string;
  rank: number;
  of: number;
  kind: PartnerKind;
  queryId: string;
  source: 'qloo' | 'sample';
};
export type Package = {
  id: string;
  strategy: 'balanced' | 'core' | 'adjacent' | 'cost';
  title: string;
  partnerIds: string[];
  total: number;
  headroom: number;
  coverage: Coverage[];
  unresolved: string[];
  rationale: string[];
};
export type Planning = {
  options: Package[];
  feasibleCount: number;
  blockers: string[];
  excluded: { id: string; reason: string }[];
  evidenceStatus: 'current' | 'missing' | 'stale' | 'partial';
  questions: string[];
};
export type Selection = {
  package: Package;
  partners: Candidate[];
  brief: Brief;
  evidence?: Evidence;
  chosenAt: string;
  inputFingerprint: string;
};
export type Revision = {
  previous: Selection;
  added: string[];
  removed: string[];
  retained: string[];
  costChange: number;
};
export type Workspace = {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  demo: boolean;
  sample?: { source: 'qloo'; generatedAt: string };
  brief: Brief;
  candidates: Candidate[];
  evidence?: Evidence;
  selection?: Selection;
  revision?: Revision;
  run?: { at: string; steps: string[] };
};
export type StoredWorkspace = Workspace & { ownerHash: string };
export type WorkspaceView = Workspace & {
  planning: Planning;
  selectionStale: boolean;
  provider: 'configured' | 'not-connected';
};
export const isLegacySample = (w: Workspace) => w.demo && w.sample?.source !== 'qloo';
export const sampleDescription = (w: Workspace) =>
  isLegacySample(w)
    ? 'Fictional sample campaign. Partners, offers and rankings are illustrative.'
    : 'Real artists, podcasts and cultural rankings from Qloo. The campaign, costs and activation ideas are illustrative; availability is unconfirmed.';
export const emptyOffer = (): Offer => ({
  amount: null,
  basis: 'estimate',
  source: '',
  deliverables: '',
  availability: 'unknown',
  from: '',
  until: '',
  conflictGroup: '',
});
export const money = (value: number, currency: string) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
export const strategyNames = {
  balanced: 'A bridge between both',
  core: 'Stay close to your core',
  adjacent: 'Explore the adjacent group',
  cost: 'Keep more budget in reserve',
} as const;
