# Change log

## 2026-10-20

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
