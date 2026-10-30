---
type: Reference
title: Product scope
description: Partner Mix's implemented campaign workflow and deliberate MVP boundaries.
timestamp: 2026-10-20
last_verified: 2026-10-20
---

The user is a brand marketer deciding which small combination of artists and
podcasts to approach for a campaign. The output is a reviewable decision brief,
not a promise that those partners are willing to participate.

## Implemented flow

1. Create an empty campaign or open Allbirds with a hypothetical city-walking brief.
   Creation does not call either provider or invent a shortlist.
2. Supply a public brand website, a campaign brief, and optionally two supporting
   pages. Gemini URL Context reads those exact pages and returns sourced facts,
   brief assumptions, hypotheses, unknowns, guardrails and questions.
3. Review or correct the understanding. Two campaign-specific partnership directions
   propose named cultural references, resolved through Qloo search. Confirm the
   identities and approve both directions before discovery.
4. Discover music artists and podcasts, then assess every candidate against the
   reviewed brand, objective and guardrails. Each gets a campaign role, activation
   hypothesis, concerns and an investigate/hold/poor-fit disposition. Hold, poor-fit
   and unassessed candidates cannot enter proposed mixes.
5. Set budget, currency, reserve, dates, partner count (2 or 3), and format mix.
   Enter costs, estimate/quote basis, source, deliverables, availability and any
   exclusivity group. Costs in the sample are illustrative, never Qloo quotes.
6. Compare feasible packages, then choose and snapshot a decision. Lock partners,
   change offers or availability, and revise without silently dropping locks.
7. Export a Markdown decision with the reviewed brand strategy, source links,
   partner rationale, cultural evidence and unresolved commercial questions.

Changing the website/brief requires re-analysis and review. Changing approved
references invalidates partner assessments. Financial edits recalculate the solver
without new provider calls. Old campaigns are preserved but cannot bypass review.

## Boundaries

Gemini performs sourced brand analysis and strategic interpretation. Provider calls
and the portfolio solver are bounded, not an autonomous open-ended planning loop.
The app reads at most three exact supplied pages; it does not crawl an entire site.
Blocked websites require a different readable official page. No invented fallback
profile is substituted. Source retrieval is checked, factual correctness still
requires human review.

No prices, reach, audience overlap, incremental lift, ROI, creator willingness,
endorsement, availability or rights are inferred from Qloo. No contacts or
outreach are sent, no bookings made, and no money moved.

No athlete discovery, person/celebrity matching, brand-to-brand collaboration,
CRM integration, multi-user accounts or automatic market validation is included.
Campaign geography is a human due-diligence item in this MVP, not a Qloo filter.

The hosted prototype runs at https://partner-mix.slate-app.online from a single server process.
Campaigns are private files on that server, reachable only through their scoped cookie.
