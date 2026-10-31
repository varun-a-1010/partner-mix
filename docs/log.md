# Change log

## 2026-10-31 — Hosting preparation

- Trusted the local nginx proxy so rate limits apply per forwarded client instead
  of one shared `127.0.0.1` bucket. Added a regression test.
- Added a model chain led by Gemini 4 Argon, with invalid output and rate limits falling through
  to Flash models, after Gemini 3.8 Flash timed out intermittently on this project.
- Qloo can omit an entity from a comparison, which used to disable cultural ranking for the whole
  campaign. Newly discovered partners it omits are now left out and named in the run steps.
  Planner-chosen partners stay, and their missing coverage is still reported.
- Deployed to Motif at partner-mix.slate-app.online and published the repository under MIT.
- Replaced the Allbirds sample with a hypothetical Topgolf first-visit campaign, closer to live
  entertainment and fan culture. Older saved samples stay labelled as hypothetical.

## 2026-10-30 — Partnership exploration

- Passed all 54 tests, formatting, types and production build; live pair
  requests and cache reuse succeeded. See the verification reference.

- Added pair-specific shared/distinctive taste lists, bidirectional associations,
  joint music/podcast/place suggestions and per-input explanation weights.
- Added an event-city option and an optional joint geographic affinity grid with
  real geohash boundaries and returned place pins. No basemap network is required.
- Added linked query receipts, source dates, explicit partial failures, saved
  reports and exports; later proposal research can use the cultural context.
- Kept pair exploration on demand for a chosen candidate; it does not add calls to
  every candidate during discovery or manufacture an overall fit percentage.

## 2026-10-30

- Added real Qloo age/gender profiles, batched with per-entity attribution, provenance
  and cache dates; missing values and provider failures remain explicit.
- Added paired signed charts and automatic hydration of saved workspaces, with a
  separate refresh. Context supports the user's campaign judgment without changing
  the package solver, cultural ranking or commercial disposition.
- Preserved context in exports; Partner Mix decisions snapshot it when selected.
- Added parsing, batching, partial-failure, API ownership/persistence/export and
  server-rendered chart checks, plus a bounded opt-in live check.

## 2026-10-20

- Verified the complete brand-first flow on `cac0e04`: both Gemini generations
  succeeded, three official Allbirds pages were retrieved, all 12 Qloo calls
  returned HTTP 200, and eight real partners received strategic assessments.
  Selection, locked-partner repair and authenticated export passed. All 42 tests,
  formatting, types and production build passed. Recorded sanitized evidence.

- Fixed Vertex HTTP 400 rejection of the nested assessment schema by simplifying
  the generation schema while retaining strict output validation. A live isolated
  assessment then succeeded. Restricted the analyst to creative/editorial fit;
  commercial and audience facts stay explicit independent confirmations.

- Tightened the distinction between essential brief questions and later due diligence,
  made the hypothetical sample geography/timing/conversion definition explicit,
  and added credential-free model-stage diagnostics for the opt-in live check.

- Rebuilt the entry flow around the brand website and campaign brief, sourced
  Gemini understanding, explicit review and Qloo reference confirmation. Replaced
  fictional brand context with Allbirds and a hypothetical city-walking campaign.
- Added per-partner strategic roles, activation hypotheses and concerns; held,
  poor-fit and stale/unassessed partners are excluded from mixes. Decision snapshots
  and exports now preserve their brand research. Added regression coverage.
- Connected Vertex using the explicitly authorized Slate default project through a
  memory-only launcher. No Slate files or database were changed. Verified official
  Allbirds page retrieval; the full revised live flow is pending verification.

- Verified the real sample on `8415443`: all ten Qloo requests returned HTTP 200,
  with four real artists, four real podcasts and complete comparisons. Refresh
  cache reuse, locked-partner repair and export passed. All 33 tests, formatting,
  types and production build passed.
- Replaced new fictional samples with live Qloo discovery and comparison from
  Patagonia/Daft Punk references. Sample costs and activation ideas remain
  illustrative, and availability starts unknown. Existing samples are preserved
  and labelled, with an entry point to create a real Qloo sample.
- Added sample creation, incomplete evidence, failure atomicity, offline access
  and refresh/export tests, plus a bounded opt-in live sample check.
- Verified implementation `8d09568` with 27 passing tests, formatting, types and
  production build. Ten real Qloo requests succeeded; complete 24-partner
  comparisons, cache reuse, locked-partner repair and decision export passed.
  Sanitized evidence records synthetic commercial inputs explicitly.
- Created Partner Mix as an independent repository for the separate sponsorship
  portfolio idea. Common Hours and submitted projects remain untouched.
- Built campaign/reference inputs, manual and Qloo-linked partners, commercial
  offer editing, constrained portfolio comparison, locks, revision receipts and
  evidence-preserving Markdown decisions.
- Added bounded server-only Qloo discovery/comparison, explicit sample/live
  separation, private file storage, scoped cookies and stale-write rejection.
- Added domain, API and provider tests plus an opt-in ten-request live check.
- 2026-10-22: The local launcher now also fetches the shared Qloo test key from Doppler
  `shared/dev_mac` into child-process memory.
