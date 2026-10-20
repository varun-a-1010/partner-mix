import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { emptyOffer, type StoredWorkspace, type Candidate } from '../shared/model';
import { evidenceFingerprint } from './solver';

export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const sameHash = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function newWorkspace(demo = false) {
  const secret = randomBytes(32).toString('hex');
  const today = new Date().toISOString().slice(0, 10);
  const workspace: StoredWorkspace = {
    id: randomUUID(),
    ownerHash: hash(secret),
    version: 1,
    demo,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    brief: {
      brand: demo ? 'Fieldwork' : 'Your brand',
      campaign: demo ? 'Take the long way home' : 'My first campaign',
      goal: demo
        ? 'Launch our everyday outdoor collection. Stay credible with outdoor regulars while introducing it to people who discover culture through music.'
        : 'Introduce our brand to an adjacent audience through a small partnership pilot.',
      currency: 'INR',
      budget: 500_000,
      reservePercent: 10,
      partnerCount: 2,
      mixedFormats: true,
      start: demo ? today : '',
      end: demo ? today : '',
      segments: [
        { id: 'core', name: 'Outdoor regulars', seeds: [] },
        { id: 'adjacent', name: 'Music explorers', seeds: [] },
      ],
    },
    candidates: [],
  };
  if (demo) seedDemo(workspace);
  return { workspace, secret };
}
function seedDemo(w: StoredWorkspace) {
  const rows: [string, Candidate['kind'], number, number, number, string][] = [
    ['Trail Notes', 'podcast', 140_000, 1, 4, 'One hosted episode and two newsletter placements'],
    [
      'Side Street Radio',
      'podcast',
      180_000,
      2,
      2,
      'Two host reads and a curated city-walk episode',
    ],
    [
      'After the Encore',
      'podcast',
      200_000,
      4,
      1,
      'A sponsored artist interview and show-note links',
    ],
    [
      'Daybreak Dispatch',
      'podcast',
      100_000,
      3,
      3,
      'Two host reads and a listener route challenge',
    ],
    [
      'Juniper Club',
      'artist',
      210_000,
      1,
      3,
      'A small acoustic session and two agreed social posts',
    ],
    [
      'Low Tide Assembly',
      'artist',
      230_000,
      2,
      1,
      'A launch session and a jointly curated playlist',
    ],
    ['Sunday Static', 'artist', 150_000, 3, 2, 'A listening event and two agreed short videos'],
    [
      'Glass Orchard',
      'artist',
      310_000,
      4,
      4,
      'An installation performance and launch-day content',
    ],
  ];
  for (const s of w.brief.segments) {
    s.seeds = [
      {
        entityId: randomUUID().toUpperCase(),
        name: s.id === 'core' ? 'Illustrative outdoor reference' : 'Illustrative music reference',
        kind: s.id === 'core' ? 'brand' : 'artist',
        description: 'Fictional reference for this example only.',
      },
    ];
  }
  w.candidates = rows.map(([name, kind, amount, , , deliverables]) => ({
    id: randomUUID(),
    name,
    kind,
    description: 'Fictional partner created to demonstrate the planning flow.',
    source: 'sample',
    entityId: randomUUID().toUpperCase(),
    locked: false,
    excluded: false,
    offer: {
      ...emptyOffer(),
      amount,
      deliverables,
      basis: 'quote',
      source: 'Illustrative sample offer — not a real quotation',
      availability: 'available',
      from: w.brief.start,
      until: w.brief.end,
    },
  }));
  const fetchedAt = new Date().toISOString();
  w.evidence = {
    fingerprint: evidenceFingerprint(w),
    fetchedAt,
    comparisons: w.brief.segments.flatMap((s, si) =>
      (['artist', 'podcast'] as const).map((kind) => ({
        id: randomUUID(),
        source: 'sample' as const,
        segment: s.id,
        kind,
        fetchedAt,
        seedIds: s.seeds.map((e) => e.entityId),
        candidateIds: w.candidates.filter((c) => c.kind === kind).map((c) => c.id),
        results: w.candidates.flatMap((c, i) =>
          c.kind !== kind
            ? []
            : [
                {
                  candidateId: c.id,
                  rank: rows[i][si === 0 ? 3 : 4],
                  contributingSeedIds: s.seeds.map((e) => e.entityId),
                },
              ],
        ),
      })),
    ),
  };
}
