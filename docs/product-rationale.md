---
type: Decision
title: The campaign combination is the product
description: Distinction from FanFit and useful lessons from the prior-year Alloy entry.
timestamp: 2026-10-20
---

[FanFit](https://devpost.com/software/fanfit-skjrxf) already describes brand-to-
creator matching, reverse creator-to-brand matching, Qloo rankings, evidence-
grounded claims and outreach drafts. Another individual partner recommender
would be too close. Its published workflow is the comparison basis; absence of
a described feature is not proof that its authors never built one.

Partner Mix chooses a combination for a campaign and repairs it under commercial
constraints: same budget, two taste hypotheses, multiple formats, entered offers,
locks, exclusivity, uncertainty and explicit before/after decisions. The central
demo is a price increase or unavailability that forces a new mix while retaining
an already chosen partner.

## What to learn from Alloy

[Alloy's public implementation](https://github.com/MR-GREEN1337/alloy/blob/879bed171442974e144a6dc89e256c0f85aaff83/backend/src/services/react_agent.py)
frames an identifiable business decision, investigates with a bounded tool loop,
and packages results into a report. Those are useful product lessons. Its
public code's taste-overlap calculation and estimated fallback scores do not
establish financially validated M&A outcomes or internal employee-culture fit.
Do not copy stronger claims than the evidence supports.

For Common Hours, the worthwhile next improvements are guided resolution of
blocking constraints, an organizer decision brief, and a demonstrable comparison
showing where Qloo affects a choice. Existing individual evidence, constraints,
locks and revision comparison already cover much of the foundation. This
separate repo does not change Common Hours.

For Partner Mix, the first pass deliberately establishes the validated tools
before any LLM orchestration: resolve, discover, compare, constrain, choose,
repair, explain and export. A genuine tool-calling assistant can later work over
these boundaries. The current product must not be advertised as already having
that LLM layer.
