---
type: Reference
title: Qloo integration and evidence
description: Server-only API use, bounded workflow, provenance and interpretation limits.
timestamp: 2026-10-20
last_verified: 2026-10-20
---

The adapter sends `X-Api-Key` only to `https://hackathon.api.qloo.com`. It disallows
redirects, has a 12-second timeout and 2 MB streamed response limit, and keeps a
credential-scoped process-local cache (80 entries, ten minutes). It does not retry.

- Entity search: `/search`, `query`, `types=urn:entity:<kind>`, `take=5`.
- Discovery: `/v2/insights`, `filter.type` artist/podcast, selected
  `signal.interests.entities`, seed exclusions, explainability and `take=6`.
- Comparison: same endpoint with `filter.results.entities` restricted to the
  current shortlist for that type. Raw affinities determine tied ranks within
  each response, then are discarded.

One refresh makes at most four calls (two reference groups × two formats).
Discovery plus comparison makes at most eight, two concurrent at a time. Brand research resolves up to four proposed references through search; manual
search is also available. The adapter never receives campaign name, goal,
offers, budget, contact details or commercial notes.

The result records query ID, input IDs, timestamp, candidate set, ranks, and
contributing seed IDs actually returned by Qloo. Query IDs are local provenance
identifiers, not vendor request IDs. Missing contributor metadata is labelled
unavailable; no explanation is invented.

The Allbirds sample starts from official website URLs and a hypothetical brief,
not preset taste references. Gemini proposes references; Qloo resolves them, and the
planner confirms the identities. Each approved direction contributes its first two
artists and podcasts to a deduplicated sample shortlist of up to eight. Normal
campaign discovery can return up to 24. Four comparisons rank the same shortlist.
The cultural discovery flow uses at most 12 Qloo requests (four searches plus eight
insight calls), before cache reuse and demographic enrichment described below.

Sample cost estimates are illustrative and availability is unknown. Gemini then
assesses campaign-specific creative fit independently of Qloo's cultural rank.
A failed comparison or assessment does not partially replace the saved shortlist.
Existing saved campaigns remain readable when providers are disconnected.

Legacy samples without `sample.source: qloo` retain their fictional data and
labels. Their synthetic IDs are still blocked from live search/comparison and
relinking. The interface offers a separate new Qloo sample without overwriting
the saved campaign.

Qloo does not provide quoted rates, willingness, current availability, commercial
exclusivity, contract rights, true audience overlap or measured campaign results.
Group names are marketer-defined hypotheses, not inferred demographics.

## Primary references

- [Qloo entities](https://raw.githubusercontent.com/qloo/docs-public/main/docs/entities.md)
- [Available parameters by entity type](https://raw.githubusercontent.com/qloo/docs-public/main/reference/available-parameters-by-entity-type.md)
- [Interpreting affinity scores](https://raw.githubusercontent.com/qloo/docs-public/main/docs/interpreting-affinity-scores.md):
  normalized per query; use relative position in context.

See [verification](verification.md) for the actual runtime checks.

## Demographic context — 30 October 2026

The adapter now requests `/v2/insights` with `filter.type=urn:demographics` and
up to eight entity IDs per batch. Each returned block is matched to its own entity
ID; signals are never pooled into an invented shared-audience profile. Collection
runs at most two batches concurrently and retains request parameters and original
retrieval dates. Only finite numeric values within −1..1 from the six age bands
and returned male/female fields are kept. Missing values remain missing; zero is
preserved as average affinity. The existing credential-scoped ten-minute cache,
timeout, response-size bound and sanitized errors apply.

The UI shows signed age/gender indices on a fixed scale, with per-entity retrieval
dates, query receipts and partial/missing/error states. Positive means above-average
affinity for a demographic group; negative means below average. These are not
percentages or counts of fans. Similarity can support a natural partnership;
differences can be useful when expanding to another audience. No demographic fit
score or automatic exclusion is added.

Demographic loading is independent of Gemini. A failed batch does not erase a
previous successful profile: its old retrieval date stays visible with a refresh
failure note. New failures are marked unavailable, never zero.

Discovery/comparison loads the linked candidates and, when a single exact brand
search match exists, the campaign brand. An ambiguous/unresolved brand stays
explicitly absent; no first-hit substitution is made. The partner dropdown compares
one partner at a time. Old workspaces try loading once automatically; refresh is
also available. No synthetic legacy sample IDs are queried. Budget/offer changes
do not requery demographics. A new candidate or Qloo relink invalidates the context.
New decision snapshots and Markdown exports retain the demographic context present
at selection time. Refreshing demographic context alone does not change the solver
or invalidate an earlier decision.

At the maximum 24 candidates, this adds at most one brand lookup and four demographic
batches to a comparison. The eight-candidate sample adds at most three requests.

Official reference: [Qloo demographic insights](https://github.com/qloo/docs-public/blob/main/reference/demographics-use-case.md).
