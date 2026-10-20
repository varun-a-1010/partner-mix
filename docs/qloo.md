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
The complete first flow uses at most 12 Qloo requests (four searches plus eight
insight calls), before cache reuse.

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
