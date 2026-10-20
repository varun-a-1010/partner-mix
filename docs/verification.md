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
and the production build passed. Live verification has not yet been recorded
for this initial implementation.

No browser or visual QA was performed, following the user's standing instruction.
No financial, marketing-outcome, partner-availability or real-offer validation is
claimed. File persistence supports one local server process. No deployment,
remote repository, multi-user access or Devpost submission has been verified.
