---
type: Reference
title: Devpost copy
description: Submission text for the Qloo Agentic Hackathon.
timestamp: 2026-10-31
---

**Tagline:** Picking sponsors one at a time is how you end up with a death metal tour and a meditation podcast.

## Inspiration

Most brands choose sponsorship partners the way a person might form a band by asking "who is the best drummer?" four times. Each pick looks great on its own slide. Then the campaign launches, and you own four drummers, no budget, and a meditation podcast that has just been announced alongside a death metal tour.

A sponsorship decision is a portfolio decision. The partners have to fit the same budget, cover different audiences, and survive the moment one of them says no, which is the moment they usually pick. We wanted a planning board that treats it that way, and one that does not pretend cultural data can prove more than it can.

## What it does

Give Partner Mix a brand's website and a campaign brief. Gemini reads those exact pages and returns a sourced understanding of the brand, which you get to correct, because no AI should be left unsupervised around a brand's values. Qloo then finds music artists and podcasts around the references you approved, and Gemini assesses each one against the brief.

Enter costs and constraints, and compare every mix that actually works. Lock a partner. Mark another as unavailable. Watch the plan repair itself without the three-day email chain. You end up with a decision brief that keeps its evidence, its open questions and its receipts.

## Why Qloo is essential

An LLM will happily tell you that your brand and a given artist are "a natural fit." It will say this about any brand and any artist, including you and the artist. Qloo supplies what the plan actually rests on: real entities, rankings across one shared shortlist, demographic context, tastes shared between a pair of partners, and joint activation ideas.

We also say plainly what it isn't. It is cultural association, not reach, audience overlap or ROI, and the app will not let you confuse them.

## How we built it

This is an agentic workflow on top of a deliberately boring solver, because the part that spends money should be able to explain itself.

1. **Research.** Gemini uses URL context to read only the pages you supplied, and public-URL checks keep it away from anything internal. Every website claim must cite a page the retrieval metadata proves was read. Claims from the brief are labelled as the brief, and guesses are labelled as hypotheses.
2. **Review.** Nothing moves until a person approves. The analysis proposes two directions, core and adjacent, each with reference hypotheses you confirm as exact Qloo identities.
3. **Discover.** Bounded `/v2/insights` calls find artists and podcasts for each direction, with the shortlist capped so nobody ends up comparing 400 podcasts about podcasts.
4. **Compare.** Every candidate is ranked on the same shortlist for each direction. If Qloo leaves someone out, that is recorded as missing rather than zero. If evidence is incomplete, cultural ranking switches off for every package and the app falls back to an honest cost-only ordering.
5. **Explore pairs.** A bounded set of calls collects demographic signals, shared taste tags, location heatmaps when geography matters, and joint suggestions for a brand and partner together.
6. **Assess.** Gemini judges creative fit only. It is explicitly forbidden from discussing rates, reach or availability, which it does not know, and strategic fit is phrased as "could" and "might" rather than as a promise.
7. **Solve.** A deterministic solver enumerates every combination, then filters on budget after reserve, locks, format mix and exclusivity conflicts. It keeps the best mix for four strategies: a bridge between both directions, stay close to core, explore the adjacent group, or keep more in reserve. Change anything and the plan repairs itself, with a receipt of what moved.

**Reliability:** Gemini 4 Argon leads. A failed call tries the same model on a second Vertex project, then walks a chain of Flash models. Invalid output counts as failure, so a confident wrong answer gets the same treatment as a timeout.

**Stack:** TypeScript, Fastify and React, with private campaigns, optimistic version checks and 66 automated tests.

## Challenges

Now and then, the model would file a claim under "website" and cite "campaign brief" as its source, which is like citing your own diary in court. One bad citation used to sink an entire analysis, about one run in three on our own sample, right in front of us. Now a mislabelled claim is corrected, a claim citing an unread page is dropped and counted, and a run only fails if no sourced claim is left.

Qloo can also leave a candidate out of a comparison, and treating that as zero would be a quiet lie. So missing stays missing: suggested partners it omits are left out and named, and a planner's own picks stay with their gaps showing.

## What's next

Real rate-card inputs, more partner types such as athletes and teams, and outcome tracking across campaigns.

## Limits

Sample brands are real, but every campaign is independent and hypothetical, and none of them has heard of us. Sample costs are illustrative and availability is unknown. Qloo shows cultural association, not verified reach, audience overlap, willingness to partner or campaign results.
