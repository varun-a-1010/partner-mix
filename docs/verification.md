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

`npm run test:qloo` is opt-in and uses at most ten live requests. It checks
entity resolution, artist/podcast discovery, comparison of the same shortlist,
cache reuse, API persistence, selection, locked-partner repair and Markdown
export. It uses synthetic commercial data and cleans its temporary workspace.

On 2026-10-20: all 27 domain/API/provider tests passed. Formatting, TypeScript
and the production build passed.

## Live Qloo check

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
claimed. File persistence supports one local server process. No deployment,
remote repository, multi-user access or Devpost submission has been verified.
