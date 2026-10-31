import { describe, expect, it, vi } from 'vitest';
import { createQloo, QLOO_ORIGIN } from '../server/qloo';
import { randomUUID } from 'node:crypto';

const seed = randomUUID().toUpperCase();
const artist = (id: string, affinity: number) => ({
  entity_id: id,
  name: 'Test Artist',
  types: ['urn:entity:artist'],
  query: {
    affinity,
    explainability: {
      'signal.interests.entities': [{ entity_id: seed, score: 0.3 }, { entity_id: randomUUID() }],
    },
  },
});
describe('Qloo boundary', () => {
  it('uses the approved host, header and restricted parameters; normalizes ties and caches', async () => {
    const ids = [randomUUID().toUpperCase(), randomUUID().toUpperCase()];
    let calls = 0;
    const provider = createQloo({
      apiKey: 'test-only-credential',
      fetch: (async (input, init) => {
        calls++;
        const url = new URL(String(input));
        expect(url.origin).toBe(QLOO_ORIGIN);
        expect(url.searchParams.get('filter.results.entities')?.split(',').sort()).toEqual(
          [...ids].sort(),
        );
        expect(url.searchParams.get('signal.interests.entities')).toBe(seed);
        expect((init?.headers as Record<string, string>)['X-Api-Key']).toBe('test-only-credential');
        expect(init?.redirect).toBe('error');
        return new Response(
          JSON.stringify({
            success: true,
            results: {
              entities: [
                artist(ids[0], 0.9),
                artist(ids[1], 0.9),
                artist(randomUUID(), 1),
                artist(ids[0], 0.8),
              ],
            },
          }),
        );
      }) as typeof fetch,
    });
    const result = await provider.insights('artist', [seed], ids);
    expect(result.results).toHaveLength(2);
    expect(result.results.map((r) => r.rank)).toEqual([1, 1]);
    expect(result.results[0].contributingSeedIds).toEqual([seed]);
    expect(JSON.stringify(result)).not.toContain('affinity');
    expect(JSON.stringify(result)).not.toContain('test-only-credential');
    await provider.insights('artist', [seed], [...ids].reverse());
    expect(calls).toBe(1);
  });
  it('does not expose raw provider errors or credentials', async () => {
    const provider = createQloo({
      apiKey: 'test-only-credential',
      fetch: (async () => {
        throw new Error('https://example.invalid?key=test-only-credential');
      }) as typeof fetch,
    });
    await expect(provider.search('artist', 'artist')).rejects.toThrow('could not be reached');
    try {
      await provider.search('artist', 'artist');
    } catch (e) {
      expect(String(e)).not.toContain('test-only-credential');
    }
  });
  it.each([401, 403, 429, 500])('handles status %i without forwarding the body', async (status) => {
    const provider = createQloo({
      apiKey: 'test-only-credential',
      fetch: (async () => new Response('PRIVATE PROVIDER BODY', { status })) as typeof fetch,
    });
    await expect(provider.insights('artist', [seed])).rejects.toThrow(
      status === 429 ? 'rate limited' : status === 500 ? 'unavailable' : 'rejected',
    );
  });
  it('rejects oversized streamed bodies', async () => {
    const provider = createQloo({
      apiKey: 'test-only-credential',
      fetch: (async () => new Response(' '.repeat(2_000_001))) as typeof fetch,
    });
    await expect(provider.search('Test', 'artist')).rejects.toThrow('invalid response');
  });
  it('makes no call without a credential', async () => {
    let calls = 0;
    const provider = createQloo({
      fetch: (async () => {
        calls++;
        return new Response('{}');
      }) as typeof fetch,
    });
    await expect(provider.search('Test', 'artist')).rejects.toThrow('not connected');
    expect(calls).toBe(0);
  });
  it('filters invalid types and IDs from entity search', async () => {
    const id = randomUUID();
    const provider = createQloo({
      apiKey: 'test-only-credential',
      fetch: (async () =>
        new Response(
          JSON.stringify({
            results: [
              { entity_id: id, name: 'Known Podcast', subtype: 'urn:entity:podcast' },
              { entity_id: randomUUID(), name: 'Wrong type', types: ['urn:entity:artist'] },
              { entity_id: 'bad', name: 'Bad ID', types: ['urn:entity:podcast'] },
            ],
          }),
        )) as typeof fetch,
    });
    const results = await provider.search('Known', 'podcast');
    expect(results.map((e) => e.name)).toEqual(['Known Podcast']);
    expect(results[0].entityId).toBe(id.toUpperCase());
  });

  it('retries a rate limit before giving up', async () => {
    const replies = [
      new Response('', { status: 429 }),
      new Response('', { status: 503 }),
      new Response(JSON.stringify({ results: [] }), { status: 200 }),
    ];
    const fetcher = vi.fn(async () => replies.shift()!);
    const qloo = createQloo({
      apiKey: 'k',
      fetch: fetcher as unknown as typeof fetch,
      paceMs: 0,
      retryMs: 0,
    });
    await qloo.search('Radiohead', 'artist').catch(() => undefined);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
