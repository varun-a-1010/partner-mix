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

1. Create a real campaign or open an explicitly fictional sample.
2. Set the brand, objective, budget, currency, reserve, dates, partner count (2 or 3)
   and whether the package must contain both formats.
3. Define core and adjacent audience hypotheses with up to four confirmed Qloo
   entities each. Supported inputs: brand, artist, podcast, movie, book.
4. Discover artists and podcasts, select entities through search, or enter
   partners manually. A manual entry can later be linked to Qloo without losing
   its offer. A shortlist is capped at 24.
5. Enter whole-currency costs, estimate/quote basis and source, deliverables,
   availability dates and optional exclusivity group. Unknown costs never enter
   a costed package. Estimates and unknown availability remain explicit.
6. Compare distinct packages using hard constraints first. With complete current
   Qloo evidence, compare balanced, core-first and adjacent-first objectives, plus
   a budget-first alternative where distinct. Show at most three unique optima.
7. Choose a package and save its complete input/evidence snapshot.
8. Lock partners, change quotes or availability, and choose a revised package.
   Show retained, replaced and added partners and the cost change.
9. Export a Markdown decision brief with source dates, unresolved confirmations
   and a simple pilot measurement plan. A stale decision exports with a warning
   and the original evidence, rather than newer unrelated evidence.

Packages recalculate when inputs are saved. Qloo comparisons run only after a
user action; ordinary commercial edits reuse the existing evidence.

## Boundaries

No LLM tool-calling agent is implemented yet. The Qloo workflow is bounded and
deterministic, as is the solver. A later submission should describe this honestly
and add a genuine planning agent if required by the selected event's rules.

No prices, reach, audience overlap, incremental lift, ROI, creator willingness,
endorsement, availability or rights are inferred from Qloo. No contacts or
outreach are sent, no bookings made, and no money moved.

No athlete discovery, person/celebrity matching, brand-to-brand collaboration,
CRM integration, multi-user accounts or automatic market validation is included.
Campaign geography is a human due-diligence item in this MVP, not a Qloo filter.

The local prototype has no remote, hosted deployment or Devpost record.
