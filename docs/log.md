# Change log

## 2026-10-20

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
