import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  pairEntitySchema,
  pairOptionsSchema,
  type PairEntity,
  type PairOptions,
  type PairReport,
  type PairQuery,
  type TasteTag,
  type Activation,
  type HeatCell,
} from '../shared/partnership';
import { AppError } from './store';
type Get = (
  path: string,
  params: Record<string, string>,
) => Promise<{ data: Record<string, unknown>; fetchedAt: string }>;
const obj = (x: unknown): Record<string, unknown> =>
  x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
const text = (x: unknown, n = 600) => (typeof x === 'string' ? x.trim().slice(0, n) : '');
const unit = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
const list = (d: Record<string, unknown>, key: string): unknown[] => {
  const x = obj(d.results)[key];
  if (!Array.isArray(x)) throw new Error('Invalid Qloo list');
  return x;
};
const keyOf = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_\-’'.]+/g, '');
// Limit the result to cultural descriptors; operational place attributes and identity topics are not creative directions.
const excluded =
  /urn:tag:(credit_card|hotel_rating|cost_description|price_range|price_level|payment|inclusivity|specialty_dish|accessibility|amenities|target_age_group|target_gender|target_income_level|political|religion|ethnicity|race)(:|_)/i;
const generic = new Set([
  'restaurant',
  'inexpensive',
  'friendship',
  'teenager',
  'discover',
  'visa',
  'mastercard',
  'americanexpress',
  'touristattraction',
  'bar',
  'friend',
  'academic',
  'american',
  'european',
  'entertainment',
]);
export function tasteTags(rows: unknown[], queryId: string): TasteTag[] {
  const seen = new Set<string>();
  return rows
    .flatMap((raw, i) => {
      const r = obj(raw),
        id = text(r.tag_id ?? r.id, 300),
        name = text(r.name, 160),
        q = obj(r.query);
      const key = keyOf(name);
      if (
        !id.startsWith('urn:tag:') ||
        !name ||
        excluded.test(id) ||
        /african.?american|ethnic|religio|politic|sexual.orientation/i.test(id) ||
        generic.has(key) ||
        seen.has(key) ||
        !unit(q.affinity) ||
        q.affinity <= 0
      )
        return [];
      seen.add(key);
      return [{ id, name, rank: i + 1, queryId }];
    })
    .slice(0, 30);
}
export function splitTastes(a: TasteTag[], b: TasteTag[]) {
  const aa = new Set(a.map((t) => keyOf(t.name))),
    bb = new Set(b.map((t) => keyOf(t.name)));
  return {
    shared: a.filter((t) => bb.has(keyOf(t.name))).slice(0, 10),
    aOnly: a.filter((t) => !bb.has(keyOf(t.name))).slice(0, 10),
    bOnly: b.filter((t) => !aa.has(keyOf(t.name))).slice(0, 10),
  };
}
function contributions(query: Record<string, unknown>, a: string, b: string) {
  const raw = obj(query.explainability)['signal.interests.entities'];
  const weights = new Map<string, number>();
  const rows = Array.isArray(raw)
    ? raw
    : Object.entries(obj(raw)).map(([entity_id, score]) => ({ entity_id, score }));
  for (const value of rows) {
    const r = obj(value),
      id = text(r.entity_id ?? r.id).toUpperCase(),
      n = r.score ?? r.weight;
    if ((id === a || id === b) && typeof n === 'number' && Number.isFinite(n) && n >= 0)
      weights.set(id, n);
  }
  const x = weights.get(a),
    y = weights.get(b);
  if (x === undefined || y === undefined || x + y <= 0) return undefined;
  return { a: x / (x + y), b: y / (x + y) };
}
export function activationRows(
  rows: unknown[],
  kind: Activation['kind'],
  queryId: string,
  a: PairEntity,
  b: PairEntity,
): Activation[] {
  const seen = new Set<string>();
  return rows
    .flatMap((raw) => {
      const r = obj(raw),
        id = text(r.entity_id).toUpperCase(),
        p = obj(r.properties),
        q = obj(r.query),
        loc = obj(r.location ?? p.location),
        types = Array.isArray(r.types) ? r.types : [];
      if (
        !z.string().uuid().safeParse(id).success ||
        !text(r.name) ||
        seen.has(id) ||
        [a.id, b.id].includes(id) ||
        ![r.subtype, ...types].includes(`urn:entity:${kind}`)
      )
        return [];
      seen.add(id);
      const weights = contributions(q, a.id, b.id);
      const contributor: Activation['contributor'] = !weights
        ? 'unknown'
        : weights.a >= 0.25 && weights.b >= 0.25
          ? 'both'
          : weights.a > 0.75
            ? 'a'
            : 'b';
      const lat = loc.lat ?? loc.latitude,
        lon = loc.lon ?? loc.lng ?? loc.longitude;
      return [
        {
          id,
          name: text(r.name, 200),
          kind,
          description: text(p.short_description ?? p.description),
          queryId,
          contributions: weights,
          contributor,
          ...(typeof lat === 'number' &&
          Number.isFinite(lat) &&
          Math.abs(lat) <= 90 &&
          typeof lon === 'number' &&
          Number.isFinite(lon) &&
          Math.abs(lon) <= 180
            ? { lat, lon }
            : {}),
        },
      ];
    })
    .slice(0, 4);
}
function heatRows(rows: unknown[]): HeatCell[] {
  const seen = new Set<string>();
  return rows.flatMap((raw) => {
    const r = obj(raw),
      loc = obj(r.location),
      q = obj(r.query),
      latitude = loc.latitude,
      longitude = loc.longitude,
      geohash = text(loc.geohash, 16);
    if (
      !/^[0123456789bcdefghjkmnpqrstuvwxyz]{1,12}$/.test(geohash) ||
      seen.has(geohash) ||
      typeof latitude !== 'number' ||
      !Number.isFinite(latitude) ||
      Math.abs(latitude) > 90 ||
      typeof longitude !== 'number' ||
      !Number.isFinite(longitude) ||
      Math.abs(longitude) > 180 ||
      !unit(q.affinity_rank)
    )
      return [];
    seen.add(geohash);
    return [
      {
        latitude,
        longitude,
        geohash,
        affinityRank: q.affinity_rank,
        ...(unit(q.popularity) ? { popularity: q.popularity } : {}),
      },
    ];
  });
}
export async function createPairReport(
  get: Get,
  aInput: PairEntity,
  bInput: PairEntity,
  input: PairOptions,
): Promise<PairReport> {
  const a = pairEntitySchema.parse(aInput),
    b = pairEntitySchema.parse(bInput),
    options = pairOptionsSchema.parse(input);
  a.id = a.id.toUpperCase();
  b.id = b.id.toUpperCase();
  if (a.id === b.id) throw new AppError(422, 'Choose two different Qloo entities.');
  const ledger: PairQuery[] = [];
  async function query<T>(
    purpose: string,
    params: Record<string, string>,
    key: string,
    parse: (rows: unknown[], id: string) => T,
    fallback: T,
  ) {
    const id = `P${ledger.length + 1}`,
      receipt: PairQuery = {
        id,
        purpose,
        path: '/v2/insights',
        params,
        fetchedAt: new Date().toISOString(),
        status: 'error',
        count: 0,
      };
    ledger.push(receipt);
    try {
      const { data, fetchedAt } = await get('/v2/insights', params);
      const rows = list(data, key),
        result = parse(rows, id);
      receipt.fetchedAt = fetchedAt;
      receipt.count = rows.length;
      receipt.status = rows.length ? 'ok' : 'empty';
      return { value: result, id, available: true };
    } catch {
      return { value: fallback, id, available: false };
    }
  }
  const tags = await Promise.all(
    [a, b].map((e) =>
      query(
        `Taste interests associated with ${e.name}`,
        { 'filter.type': 'urn:tag', 'signal.interests.entities': e.id, take: '40' },
        'tags',
        tasteTags,
        [],
      ),
    ),
  );
  const directions = await Promise.all(
    [
      [a, b],
      [b, a],
    ].map(async ([from, to]) => {
      const r = await query(
        `Association from ${from.name} to ${to.name}`,
        {
          'filter.type': `urn:entity:${to.kind}`,
          'signal.interests.entities': from.id,
          'filter.results.entities': to.id,
          take: '1',
        },
        'entities',
        (rows) => {
          const match = rows.find((raw) => text(obj(raw).entity_id).toUpperCase() === to.id);
          const value = obj(obj(match).query).affinity;
          return unit(value) ? value : undefined;
        },
        undefined,
      );
      return { from: from.name, to: to.name, value: r.value, queryId: r.id };
    }),
  );
  const activations: Activation[] = [];
  const kinds: Activation['kind'][] = [
    'artist',
    'podcast',
    ...(options.city ? ['place' as const] : []),
  ];
  for (let i = 0; i < kinds.length; i += 2) {
    const items = await Promise.all(
      kinds.slice(i, i + 2).map((kind) =>
        query(
          `Joint ${kind} suggestions`,
          {
            'filter.type': `urn:entity:${kind}`,
            'signal.interests.entities': [a.id, b.id].join(','),
            'filter.exclude.entities': [a.id, b.id].join(','),
            'feature.explainability': 'true',
            take: '4',
            ...(kind === 'place' ? { 'filter.location.query': options.city! } : {}),
          },
          'entities',
          (rows, id) => activationRows(rows, kind, id, a, b),
          [],
        ),
      ),
    );
    activations.push(...items.flatMap((r) => r.value));
  }
  let heatmap: PairReport['heatmap'];
  if (options.includeHeatmap && options.city) {
    const r = await query(
      `Joint geographic affinity for ${options.city}`,
      {
        'filter.type': 'urn:heatmap',
        'signal.interests.entities': [a.id, b.id].join(','),
        'filter.location.query': options.city,
      },
      'heatmap',
      heatRows,
      [],
    );
    heatmap = { cells: r.value, queryId: r.id };
  }
  if (ledger.every((q) => q.status === 'error'))
    throw new AppError(
      502,
      'The partnership exploration could not complete. Saved results are unchanged.',
    );
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    a,
    b,
    options,
    directions,
    tastes: {
      ...(tags.every((t) => t.available)
        ? splitTastes(tags[0].value, tags[1].value)
        : { shared: [], aOnly: [], bOnly: [] }),
      queries: [tags[0].id, tags[1].id],
      available: [tags[0].available, tags[1].available],
    },
    activations,
    heatmap,
    ledger,
  };
}
