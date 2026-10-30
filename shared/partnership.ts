import { z } from 'zod';
export const pairEntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  kind: z.enum(['person', 'brand', 'artist', 'podcast']),
});
export type PairEntity = z.infer<typeof pairEntitySchema>;
export const pairOptionsSchema = z
  .object({
    city: z.string().trim().min(2).max(120).optional(),
    includeHeatmap: z.boolean().default(false),
  })
  .refine((o) => !o.includeHeatmap || !!o.city, 'Choose a city for the geographic view.');
export type PairOptions = z.infer<typeof pairOptionsSchema>;
export type PairQuery = {
  id: string;
  purpose: string;
  path: string;
  params: Record<string, string>;
  fetchedAt: string;
  status: 'ok' | 'empty' | 'error';
  count: number;
};
export type TasteTag = { id: string; name: string; rank: number; queryId: string };
export type Activation = {
  id: string;
  name: string;
  kind: 'artist' | 'podcast' | 'place';
  description: string;
  queryId: string;
  contributions?: { a: number; b: number };
  contributor: 'both' | 'a' | 'b' | 'unknown';
  lat?: number;
  lon?: number;
};
export type HeatCell = {
  latitude: number;
  longitude: number;
  geohash: string;
  affinityRank: number;
  popularity?: number;
};
export type PairReport = {
  id: string;
  createdAt: string;
  a: PairEntity;
  b: PairEntity;
  options: PairOptions;
  directions: { from: string; to: string; value?: number; queryId: string }[];
  tastes: {
    shared: TasteTag[];
    aOnly: TasteTag[];
    bOnly: TasteTag[];
    queries: [string, string];
    available: [boolean, boolean];
  };
  activations: Activation[];
  heatmap?: { cells: HeatCell[]; queryId: string };
  ledger: PairQuery[];
};
export const contributorLabel = (value: Activation['contributor'], a: string, b: string) =>
  value === 'both'
    ? 'Both inputs contribute'
    : value === 'a'
      ? `Mostly ${a}`
      : value === 'b'
        ? `Mostly ${b}`
        : 'Contribution detail unavailable';
export const activationIdea = (pick: Activation) =>
  pick.kind === 'artist'
    ? `Explore a playlist, listening session or performance involving ${pick.name}.`
    : pick.kind === 'podcast'
      ? `Explore an editorially suitable conversation or sponsorship with ${pick.name}.`
      : `Investigate ${pick.name} as a location for a pop-up or hosted event.`;
export function pairSummary(report: PairReport | undefined) {
  if (!report) return undefined;
  const { heatmap: _heatmap, ...context } = report;
  return context;
}
export function pairMarkdown(report: PairReport | undefined): string[] {
  if (!report) return [];
  return [
    '### Partnership exploration',
    '',
    `${report.a.name} × ${report.b.name}; explored ${report.createdAt}.`,
    'Qloo cultural signals inform creative directions. Multiple inputs are not a count or identification of shared fans.',
    '',
    ...report.directions.map(
      (d) =>
        `- ${d.from} → ${d.to}: ${d.value === undefined ? 'Not returned' : d.value.toFixed(3)} [${d.queryId}].`,
    ),
    `Shared interests among the returned tags: ${report.tastes.shared.map((t) => t.name).join(', ') || 'None returned'}. [${report.tastes.queries.join(', ')}]`,
    `More distinctive to ${report.a.name} in these results: ${report.tastes.aOnly.map((t) => t.name).join(', ') || 'None returned'}.`,
    `More distinctive to ${report.b.name} in these results: ${report.tastes.bOnly.map((t) => t.name).join(', ') || 'None returned'}.`,
    '',
    ...report.activations.map(
      (p) =>
        `- Proposed direction: ${activationIdea(p)} ${contributorLabel(p.contributor, report.a.name, report.b.name)} [${p.queryId}]. Availability, rights, editorial fit and cost need checking.`,
    ),
    ...(report.heatmap
      ? [
          `Geographic context for ${report.options.city}: ${report.heatmap.cells.length} returned Qloo cells; metric: affinity_rank [${report.heatmap.queryId}].`,
        ]
      : []),
    '',
    'Qloo request receipts:',
    ...report.ledger.map(
      (q) =>
        `- ${q.id}: ${q.purpose}. ${q.status}; ${q.count} items; retrieved ${q.fetchedAt}. ${q.path}?${new URLSearchParams(q.params)}`,
    ),
    '',
  ];
}
