---
type: Reference
title: Verification
description: Automated and live verification status and remaining limits.
timestamp: 2026-10-20
last_verified: 2026-10-20
---

`npm run check` covers formatting, domain/API tests, TypeScript and the Vite
production build. The tests exercise complementary portfolio selection, costs
and reserves, locks, unknowns, exclusivity, date conflicts, stale evidence,
decision snapshots, quote-driven repair, cookie access, origin checks,
optimistic concurrency and the provider boundary.

`test:qloo` and `test:qloo:sample` now exercise brand research, explicit reference
approval, Qloo discovery, Gemini partner assessment, selection, repair and export.
They require both providers, use at most 17 Qloo requests and two model generations,
and remove their temporary workspace. Model results are nondeterministic; missing
exact reference matches or blocking questions stop the check for review.

The expanded suite has 42 tests covering source retrieval/citation rejection,
truncated output, safe URL validation, approval gates, strategy invalidation,
strategic exclusions, failures without partial persistence, and concurrent research.
The full brand-first live check below also passed. Historical receipts remain
labelled by their implementation SHA.

## Live brand-first flow

[Sanitized full-flow evidence](evidence/brand-flow-live-2026-10-20.json) is bound to
`cac0e04e26150ed804f464265b0a5d86322d203c`. On 2026-10-20, Gemini 3.8 Flash
successfully read all three supplied Allbirds pages and generated the brand report
in 18.8 seconds. After explicit identity confirmation and strategy approval, all
12 Qloo requests returned HTTP 200. The eight discovered partners were real provider
entities, with complete coverage in all four shortlist comparisons.

The creative assessment completed in 14.6 seconds. It marked Armchair Expert and
Terrible, Thanks For Asking as poor editorial fits and held Father John Misty;
those candidates did not enter proposed mixes. These judgments are generated
creative hypotheses, not verified facts about commercial suitability.

The initial mix was St. Paul & The Broken Bones + the memory palace. After locking
the musician and marking the podcast unavailable in the test, the revised mix kept
St. Paul & The Broken Bones and substituted Radiolab. Snapshot preservation and
authenticated Markdown export passed; an unauthenticated export returned 404.
All costs and availability edits were synthetic. The temporary workspace was
removed; no existing user campaign was changed.

Formatting, all 42 tests, TypeScript and the production build passed before the
live check. The local Vite-proxied health endpoint subsequently reported both
Qloo and the analyst configured. No browser or visual QA was performed.

## Historical live Qloo checks

The [sample creation check](evidence/qloo-sample-live-2026-10-20.json) is bound to
implementation `841544339e5c5227d00e5d2473e46db8fdd8f76c`. Ten requests returned
HTTP 200 (247–3654 ms). The actual sample API discovered four artists (Bahamas,
The Head and the Heart, Justice, deadmau5) and four podcasts (The Rich Roll Podcast,
The Tim Ferriss Show, Song Exploder, 99% Invisible). Each of the four comparisons
returned all four requested partners of its type.

The sample's initial costs were explicitly illustrative estimates and every
partner's availability was unknown. Refresh reused cached results without another
upstream request. Selection chose Bahamas + Song Exploder; after locking Bahamas
and marking Song Exploder unavailable in the test, repair chose Bahamas +
99% Invisible. Authenticated export retained the real-Qloo/sample-cost distinction.
The temporary workspace was removed; the user's existing campaigns were untouched.

[Sanitized evidence](evidence/qloo-live-2026-10-20.json) is bound to implementation
commit `8d09568f6b56b4c5fea9b9ff835d0778ff4ca51b`. Ten upstream requests all returned
HTTP 200 (229–3567 ms):

- Resolved Patagonia as a brand and Daft Punk as an artist through the private API.
- Discovered 12 artists and 12 podcasts across the two reference groups.
- All four comparisons returned all 12 requested partners of their type.
- Repeated comparison used the credential-scoped cache with zero additional
  upstream requests.
- With synthetic budget and estimates, selected The Rich Roll Podcast + Justice.
  Then locked the podcast, marked the artist unavailable, and selected a repaired
  mix containing The Rich Roll Podcast + deadmau5.
- Verified selection snapshots, stale-state indication, retained/replaced receipt
  and authenticated Markdown export. Removed the entire temporary workspace.

These are live cultural associations, not actual offers from those partners.
Every price, deliverable and availability change in the test was synthetic.
No commercial agreement, availability, audience reach or campaign outcome was
verified or implied.

No browser or visual QA was performed, following the user's standing instruction.
No financial, marketing-outcome, partner-availability or real-offer validation is
claimed. File persistence supports one server process. Multi-user load has not been verified.

## Demographic context verification — 30 October 2026

`npm run test:audience` is an opt-in live check requiring `QLOO_API_KEY` in process
memory. It makes at most three requests: resolve Allbirds and Bon Iver, then retrieve
their individual demographic blocks in one batch. It checks six age bands, exact
entity attribution, and cache reuse without replacing retrieval dates. It has no
LLM calls, no commercial inputs, and no existing workspace mutations.

Automated coverage includes zero-vs-missing semantics, malformed numeric values,
missing entity blocks, batches limited to eight and two concurrent calls, saved-data
preservation on partial failures, signed chart rendering, private API access and
export context. No browser or visual QA is performed.

Live demographic check passed on 30 October 2026: both example entities returned all six age bands and both gender fields in one demographics response; the repeat used no extra requests and kept its retrieval date. All 48 tests, formatting, type checking and production build passed.

## Partnership exploration checks — 30 October 2026

`npm run test:partnership` is an opt-in live check using only public entity IDs and
`QLOO_API_KEY` in process memory. It uses six requests by default; `-- --city 'Los
Angeles' --heatmap` uses eight. It checks each query shape, returned contribution
metadata, optional geographic cells and reuse of cached retrieval dates. It does
not call an LLM or change existing workspaces. Mocked API tests separately exercise
ownership, allowlisted candidates, version checks, private persistence and exports.

Live examples completed: Allbirds × Bon Iver returned eight artist/podcast
suggestions in six requests. Cedric × Omaha Steaks in Los Angeles returned twelve
artist/podcast/place suggestions and 1,141 joint geographic cells in eight requests.
Both had explanation metadata and both reused cache entries without new requests.
These checks establish that the implemented query paths return usable data, not
commercial availability or a campaign outcome. No browser or visual QA was run.

Final automated acceptance passed: all 54 tests, formatting, type checking and
production build. Partner Mix additionally checks that refreshing current pair
context cannot rewrite the saved decision export.

## Hosted verification — 31 October 2026

The full sample flow passed through `npm run test:qloo:sample` using the model chain in
`server/models.ts`: sourced research, assessment, cultural ranking, locked-partner repair and
authenticated export. `/api/health` reported both providers configured on the hosted server.
