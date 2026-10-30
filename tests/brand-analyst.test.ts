import { describe, expect, it, vi } from 'vitest';
import { FinishReason, GenerateContentResponse, UrlRetrievalStatus } from '@google/genai';
import { createBrandAnalyst, publicWebsite } from '../server/brand-analyst';
import { analysisFixture, fixtureIntake, researchFixture } from './brand-fixture';
import { legacyWorkspace } from './legacy-fixture';

function response(data: unknown, success = true) {
  const r = new GenerateContentResponse();
  r.candidates = [
    {
      finishReason: FinishReason.STOP,
      content: { parts: [{ text: JSON.stringify(data) }] },
      urlContextMetadata: {
        urlMetadata: [
          {
            retrievedUrl: fixtureIntake.website,
            urlRetrievalStatus: success
              ? UrlRetrievalStatus.URL_RETRIEVAL_STATUS_SUCCESS
              : UrlRetrievalStatus.URL_RETRIEVAL_STATUS_ERROR,
          },
        ],
      },
    },
  ];
  return r;
}
describe('grounded brand analysis', () => {
  it('requests URL context, passes the actual brief, and accepts only retrieved sources', async () => {
    const generate = vi.fn(async () => response(analysisFixture()));
    const analyst = createBrandAnalyst({ sleep: async () => {}, generate });
    const report = await analyst.research(fixtureIntake);
    expect(report.sources.map((s) => s.url)).toEqual([fixtureIntake.website]);
    const request = generate.mock.calls[0] as unknown as [
      { contents: string; config: { tools: unknown[] } },
    ];
    expect(request[0].contents).toContain(fixtureIntake.campaignBrief);
    expect(request[0].config.tools).toEqual([{ urlContext: {} }]);
  });
  it('refuses model memory when retrieval failed or facts cite unprovided pages', async () => {
    const analyst = createBrandAnalyst({
      sleep: async () => {},
      generate: async () => response(analysisFixture(), false),
    });
    await expect(analyst.research(fixtureIntake)).rejects.toThrow('could not be read');
    for (const citation of ['https://invented.example.org/', 'not a URL', 'campaign brief']) {
      const data = analysisFixture();
      data.facts[0].sources = [citation];
      const unsupported = createBrandAnalyst({
        sleep: async () => {},
        generate: async () => response(data),
      });
      await expect(unsupported.research(fixtureIntake)).rejects.toThrow(
        'unsupported website citation',
      );
    }
  });
  it('rejects local URLs and does not expose upstream exceptions', async () => {
    for (const url of [
      'http://example.com',
      'https://127.0.0.1/',
      'https://169.254.169.254/',
      'https://localhost/',
      'https://service.internal/',
      'https://u:p@example.com/',
      'https://example.com:9443/',
    ])
      expect(() => publicWebsite(url)).toThrow('public HTTPS');
    const analyst = createBrandAnalyst({
      sleep: async () => {},
      generate: async () => {
        throw new Error('private-provider-detail');
      },
    });
    await expect(analyst.research(fixtureIntake)).rejects.toThrow('could not finish');
  });
  it('rejects missing, duplicate or unrelated candidate assessments', async () => {
    const w = legacyWorkspace().workspace,
      research = researchFixture();
    const analyst = createBrandAnalyst({
      sleep: async () => {},
      generate: async () => response({ partners: [] }),
    });
    await expect(
      analyst.assess(research, w.candidates, w.evidence!, fixtureIntake),
    ).rejects.toThrow('cover the shortlist');
  });
  it('does not accept truncated model output', async () => {
    const r = response(analysisFixture());
    r.candidates![0].finishReason = FinishReason.MAX_TOKENS;
    const analyst = createBrandAnalyst({ sleep: async () => {}, generate: async () => r });
    await expect(analyst.research(fixtureIntake)).rejects.toThrow('could not finish');
  });
  it('keeps response bounds enforced locally with the simpler Vertex generation schema', async () => {
    const w = legacyWorkspace().workspace;
    let sentSchema: unknown;
    const analyst = createBrandAnalyst({
      sleep: async () => {},
      generate: async (request) => {
        sentSchema = request.config?.responseJsonSchema;
        return response({
          partners: [
            {
              candidateId: w.candidates[0].id,
              disposition: 'investigate',
              role: 'x'.repeat(901),
              rationale: 'A creative hypothesis.',
              activation: 'An example.',
              concerns: ['Verify editorial fit.'],
              sourceUrls: [],
            },
          ],
        });
      },
    });
    await expect(
      analyst.assess(researchFixture(), [w.candidates[0]], w.evidence!, fixtureIntake),
    ).rejects.toThrow('assessment could not finish');
    expect(JSON.stringify(sentSchema)).not.toContain('maxLength');
    expect(JSON.stringify(sentSchema)).not.toContain('maxItems');
    expect(JSON.stringify(sentSchema)).toContain('required');
  });
});
