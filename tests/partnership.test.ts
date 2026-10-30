import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createQloo } from '../server/qloo';
import { createPairReport, activationRows } from '../server/partnership';
import { pairMarkdown, pairOptionsSchema, type PairEntity } from '../shared/partnership';
import { PairResults } from '../src/Partnership';
import { geohashBounds } from '../src/Geography';
const a: PairEntity = {
  id: '3B124908-B8E6-4CF2-8D3E-2E024CD78BBE',
  name: 'Client',
  kind: 'person',
};
const b: PairEntity = { id: '3A0D8A79-F8AB-4D04-AA5D-C13A0C26B28D', name: 'Brand', kind: 'brand' };
const third = '272A7D06-5647-4B48-965B-2E0664CD0962';
const tag = (id: string, name: string) => ({
  tag_id: `urn:tag:genre:media:${id}`,
  name,
  query: { affinity: 1 },
});
const entity = (kind: string, extra: object = {}) => ({
  entity_id: third,
  name: 'Returned suggestion',
  subtype: `urn:entity:${kind}`,
  properties: { description: 'Provider description' },
  query: {
    affinity: 0.9,
    explainability: {
      'signal.interests.entities': [
        { entity_id: a.id, score: 0.6 },
        { entity_id: b.id, score: 0.4 },
      ],
    },
  },
  ...extra,
});
function fakeGet(fail?: string) {
  let active = 0,
    max = 0;
  const call = vi.fn(async (_path: string, params: Record<string, string>) => {
    active++;
    max = Math.max(active, max);
    await Promise.resolve();
    active--;
    const kind = params['filter.type'];
    if (kind === fail) throw new Error('PRIVATE PROVIDER ERROR');
    let rows: unknown[], key: string;
    if (kind === 'urn:tag') {
      key = 'tags';
      rows =
        params['signal.interests.entities'] === a.id
          ? [
              tag('indie', 'Indie'),
              tag('folk', 'folk'),
              tag('academic', 'Academic'),
              { tag_id: 'urn:tag:credit_card:place:visa', name: 'VISA', query: { affinity: 1 } },
            ]
          : [tag('indie_other', 'indie'), tag('jazz', 'Jazz')];
    } else if (params['filter.results.entities']) {
      key = 'entities';
      rows = [{ entity_id: params['filter.results.entities'], query: { affinity: 0.8 } }];
    } else if (kind === 'urn:heatmap') {
      key = 'heatmap';
      rows = [
        {
          location: { latitude: 34.01, longitude: -118.3, geohash: '9q5cs2' },
          query: { affinity_rank: 0.7, popularity: 0.8 },
        },
      ];
    } else {
      key = 'entities';
      rows = [entity(kind.split(':').pop()!)];
    }
    return { data: { results: { [key]: rows } }, fetchedAt: '2026-10-30T01:00:00Z' };
  });
  return { call, max: () => max };
}

describe('partnership exploration', () => {
  it('makes six bounded calls without geography and preserves both input attribution and citations', async () => {
    const get = fakeGet();
    const report = await createPairReport(get.call, a, b, { includeHeatmap: false });
    expect(get.call).toHaveBeenCalledTimes(6);
    expect(get.max()).toBeLessThanOrEqual(2);
    expect(report.directions.map((d) => d.value)).toEqual([0.8, 0.8]);
    expect(report.tastes.shared.map((t) => t.name)).toEqual(['Indie']);
    expect(report.tastes.aOnly.map((t) => t.name)).toEqual(['folk']);
    expect(report.tastes.bOnly.map((t) => t.name)).toEqual(['Jazz']);
    expect(report.activations.every((p) => p.contributor === 'both')).toBe(true);
    expect(report.ledger.map((q) => q.id)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
    expect(report.ledger.every((q) => q.fetchedAt === '2026-10-30T01:00:00Z')).toBe(true);
    expect(report.heatmap).toBeUndefined();
    expect(get.call.mock.calls.every(([, p]) => !('filter.location.query' in p))).toBe(true);
    const md = pairMarkdown(report).join('\n');
    expect(md).toContain('urn%3Aentity%3Aartist');
    expect(md).toContain('Qloo request receipts');
    const html = renderToStaticMarkup(createElement(PairResults, { report }));
    expect(html).toContain(`href="#${report.id}-P5"`);
    expect(html).toContain(`id="${report.id}-P5"`);
    expect(html).toContain('60%');
    expect(html).toContain('Both inputs contribute');
  });
  it('queries city places and joint heatmap only when requested, and renders geographic cells', async () => {
    const get = fakeGet();
    const report = await createPairReport(get.call, a, b, {
      city: 'Los Angeles',
      includeHeatmap: true,
    });
    expect(get.call).toHaveBeenCalledTimes(8);
    const [, params] = get.call.mock.calls.find(([, p]) => p['filter.type'] === 'urn:heatmap')!;
    expect(params['signal.interests.entities']).toBe(`${a.id},${b.id}`);
    expect(params['filter.location.query']).toBe('Los Angeles');
    expect(report.heatmap?.cells).toHaveLength(1);
    const html = renderToStaticMarkup(createElement(PairResults, { report }));
    expect(html).toContain('<svg');
    expect(html).toContain('Geographic context: Los Angeles');
    const bounds = geohashBounds('9q5cs2')!;
    expect(bounds.south).toBeLessThan(34.02);
    expect(bounds.north).toBeGreaterThan(34.01);
    expect(pairOptionsSchema.safeParse({ includeHeatmap: true }).success).toBe(false);
  });
  it('preserves partial results and does not invent common ground after a failed taste request', async () => {
    const get = fakeGet('urn:tag');
    const report = await createPairReport(get.call, a, b, { includeHeatmap: false });
    expect(report.tastes.shared).toEqual([]);
    expect(report.tastes.aOnly).toEqual([]);
    expect(report.tastes.available).toEqual([false, false]);
    expect(report.activations.length).toBeGreaterThan(0);
    const oneSide = await createPairReport(
      async (path, params) => {
        if (params['filter.type'] === 'urn:tag' && params['signal.interests.entities'] === a.id)
          throw new Error('One taste query failed');
        return fakeGet().call(path, params);
      },
      a,
      b,
      { includeHeatmap: false },
    );
    expect(oneSide.tastes.available).toEqual([false, true]);
    expect(oneSide.tastes.shared).toEqual([]);
    expect(oneSide.tastes.aOnly).toEqual([]);
    expect(oneSide.tastes.bOnly).toEqual([]);
    expect(JSON.stringify(report)).not.toContain('PRIVATE');
    await expect(
      createPairReport(
        async () => {
          throw new Error('secret');
        },
        a,
        b,
        { includeHeatmap: false },
      ),
    ).rejects.toThrow('Saved results are unchanged');
  });
  it('leaves missing explanation unavailable, ignores foreign entities and validates before spending requests', async () => {
    const rows = activationRows(
      [entity('artist', { query: {} }), entity('podcast')],
      'artist',
      'P5',
      a,
      b,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].contributor).toBe('unknown');
    expect(rows[0].contributions).toBeUndefined();
    const get = vi.fn();
    await expect(createPairReport(get, a, a, { includeHeatmap: false })).rejects.toThrow(
      'different',
    );
    expect(get).not.toHaveBeenCalled();
  });
  it('keeps credentials server-side and reuses the adapter cache without changing retrieval dates', async () => {
    const fake = fakeGet();
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const u = new URL(String(input));
      expect(u.origin).toBe('https://hackathon.api.qloo.com');
      expect(init?.redirect).toBe('error');
      expect((init?.headers as Record<string, string>)['X-Api-Key']).toBe('test-only-key');
      const result = await fake.call(u.pathname, Object.fromEntries(u.searchParams));
      return Response.json(result.data);
    });
    const qloo = createQloo({ apiKey: 'test-only-key', fetch: fetcher });
    const first = await qloo.partnership(a, b, { includeHeatmap: false });
    const second = await qloo.partnership(a, b, { includeHeatmap: false });
    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(second.ledger.map((q) => q.fetchedAt)).toEqual(first.ledger.map((q) => q.fetchedAt));
    expect(JSON.stringify(first)).not.toContain('test-only-key');
  });
});
