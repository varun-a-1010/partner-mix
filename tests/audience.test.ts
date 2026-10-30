import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AudienceComparison } from '../src/Audience';
import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createQloo } from '../server/qloo';
import { collectAudiences } from '../server/audience';
import { audienceMarkdown } from '../shared/audience';

describe('Qloo demographic context', () => {
  it('keeps per-entity indices, zero and missing dimensions distinct, normalizes IDs and caches dates', async () => {
    const a = randomUUID().toUpperCase(),
      b = randomUUID().toUpperCase();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        success: true,
        results: {
          demographics: [
            {
              entity_id: a.toLowerCase(),
              query: {
                age: { '25_to_29': 0, '55_and_older': 0.75, '30_to_34': '0.4', '35_to_44': 2 },
                gender: { male: 0.39, female: -0.39 },
              },
            },
            { entity_id: b, query: { age: { '25_to_29': -0.4 } } },
            { entity_id: randomUUID(), query: { age: { '25_to_29': 1 } } },
          ],
        },
      }),
    );
    const qloo = createQloo({ apiKey: 'test-only-key', fetch: fetcher });
    const first = await qloo.demographics([a, b]);
    const second = await qloo.demographics([b, a]);
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.origin).toBe('https://hackathon.api.qloo.com');
    expect(url.searchParams.get('filter.type')).toBe('urn:demographics');
    expect(url.searchParams.get('signal.interests.entities')?.split(',').sort()).toEqual(
      [a, b].sort(),
    );
    expect(first.find((p) => p.entityId === a)?.age).toEqual({
      '25_to_29': 0,
      '55_and_older': 0.75,
    });
    expect(first.find((p) => p.entityId === b)?.gender).toEqual({});
    expect(first).toHaveLength(2);
    expect(second).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(first)).not.toContain('test-only-key');
  });
  it('records absent entities as missing and rejects malformed responses', async () => {
    const a = randomUUID().toUpperCase();
    const qloo = createQloo({
      apiKey: 'test',
      fetch: vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ results: { demographics: [] } })),
    });
    expect((await qloo.demographics([a]))[0]).toMatchObject({
      entityId: a,
      status: 'missing',
      age: {},
      gender: {},
    });
    const bad = createQloo({
      apiKey: 'test',
      fetch: vi.fn<typeof fetch>().mockResolvedValue(Response.json({ results: { entities: [] } })),
    });
    await expect(bad.demographics([a])).rejects.toThrow('invalid demographic');
  });
  it('batches within eight, preserves saved data on a partial failure, and exports provenance', async () => {
    const ids = Array.from({ length: 18 }, () => randomUUID().toUpperCase());
    let active = 0,
      maximum = 0;
    const provider = {
      demographics: vi.fn(async (batch: string[]) => {
        active++;
        maximum = Math.max(maximum, active);
        await Promise.resolve();
        active--;
        if (batch.includes(ids[8])) throw new Error('private provider body');
        return batch.map((entityId) => ({
          entityId,
          status: 'available' as const,
          age: { '55_and_older': 0.4 },
          gender: {},
          fetchedAt: '2026-10-30T00:00:00Z',
          request: {
            path: '/v2/insights',
            params: {
              'filter.type': 'urn:demographics',
              'signal.interests.entities': batch.join(','),
            },
          },
        }));
      }),
    };
    const old = {
      entityId: ids[8],
      status: 'available' as const,
      age: { '55_and_older': 0.7 },
      gender: {},
      fetchedAt: '2026-10-29T00:00:00Z',
      request: { path: '/v2/insights', params: {} },
    };
    const context = await collectAudiences(
      provider,
      ids,
      { id: ids[0], name: 'Client' },
      { profiles: [old] },
    );
    expect(maximum).toBeLessThanOrEqual(2);
    expect(provider.demographics.mock.calls.every(([batch]) => batch.length <= 8)).toBe(true);
    expect(context.profiles).toHaveLength(18);
    expect(context.profiles.find((p) => p.entityId === ids[8])).toMatchObject({
      status: 'available',
      age: { '55_and_older': 0.7 },
      fetchedAt: old.fetchedAt,
      refreshError: expect.any(String),
    });
    expect(context.profiles.find((p) => p.entityId === ids[9])?.status).toBe('error');
    const exported = audienceMarkdown(context, { id: ids[1], name: 'Partner' }).join('\n');
    expect(exported).toContain('not percentages');
    expect(exported).toContain('+0.40');
    expect(exported).toContain('/v2/insights?');
    expect(JSON.stringify(context)).not.toContain('private provider body');
  });
});

it('renders signed values, missing data and neutral values with an accessible label', () => {
  const id = randomUUID();
  const html = renderToStaticMarkup(
    createElement(AudienceComparison, {
      partner: { id, name: 'Partner' },
      context: {
        profiles: [
          {
            entityId: id,
            status: 'available',
            age: { '25_to_29': 0, '55_and_older': -0.4 },
            gender: { female: 0.2 },
            fetchedAt: '2026-10-30T00:00:00Z',
            request: { path: '/v2/insights', params: { 'filter.type': 'urn:demographics' } },
          },
        ],
      },
    }),
  );
  expect(html).toContain('Partner, 25–29: 0.00');
  expect(html).toContain('Partner, 55+: -0.40');
  expect(html).toContain('Partner, Male: Not returned');
  expect(html).toContain('not percentages of fans');
  expect(html).toContain('urn%3Ademographics');
});
