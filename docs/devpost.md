---
type: Reference
title: Devpost copy
description: Submission text for the Qloo Agentic Hackathon.
timestamp: 2026-10-31
---

**Tagline:** Choose partners who work together, not just partners who score well alone.

## Inspiration

Sponsorship decisions are portfolio decisions. Most tools rank one creator at a time, but a brand
buys a mix, and the mix has to fit a budget, cover different audiences and survive a partner saying
no. We wanted a planning board that treats it that way, and is honest about what cultural data can
and cannot prove.

## What it does

Give Partner Mix a brand's website and a campaign brief. Gemini reads those exact pages and returns
a sourced understanding you review and correct. Qloo then finds artists and podcasts around the
cultural references you approved, and Gemini assesses each one against the brief. Enter costs and
constraints, compare feasible mixes, lock a partner, mark another unavailable, and watch the plan
repair itself. The result is a decision brief that keeps its evidence and open questions.

## Why Qloo is essential

Qloo supplies the cultural discovery and comparison the plan rests on: real entities, rankings
across one shortlist, demographic context, shared tastes between a pair of partners, and joint
activation ideas. The app never treats that as reach, audience overlap or ROI, and it says so.

## How we built it

- **Agentic workflow:** Gemini researches sourced pages and assesses fit. The orchestration and
  portfolio solver stay bounded and deterministic, so every recommendation can be explained.
- **Qloo:** `/search` and `/v2/insights`, including comparison, demographics, taste tags and heatmaps.
- **Reliability:** Gemini 4 Argon leads. A second Vertex project and a chain of Flash models catch
  rate limits and invalid output.
- **Stack:** TypeScript, Fastify and React.

## Challenges

Qloo can leave a candidate out of a comparison, and treating that as zero would be a quiet lie. We
keep missing evidence missing: suggested partners it omits are left out and named, and a planner's
own picks stay with their gaps shown.

## What's next

Real rate-card inputs, more partner types, and outcome tracking across campaigns.

## Limits

Sample costs are illustrative, and availability is unknown. Qloo shows cultural association, not
verified reach, audience overlap, willingness to partner or campaign results.
