---
type: Reference
title: Architecture
description: Runtime boundaries, private campaign state and portfolio calculation.
timestamp: 2026-10-20
last_verified: 2026-10-20
---

React/Vite serves the client on 5193 and proxies `/api` to Fastify on 3193 while
preserving Host. Production serves the built client from Fastify and requires an
explicit `APP_ORIGIN`. Node runs the TypeScript server through tsx.

## State and access

One JSON file per workspace, mode 0600, inside a private 0700 data directory.
Writes go to a fresh temporary file then atomically rename. A single-process
queue serializes version-checked writes. This is a local, single-process store,
not a multi-instance production database. A hosted release must provision
app-owned persistence, using Deltabase if PostgreSQL is needed.

Each workspace has a random 256-bit capability in an HttpOnly, SameSite=Strict
cookie, scoped to `/api`. Only its SHA-256 hash is persisted. The hash never
leaves the API. Campaign IDs in the URL/recent list are not access credentials.
Cookies last 90 days. No account recovery or cross-browser sharing is implemented.

Mutations require a matching Origin. The API enforces input sizes, candidate and
reference limits, integer money, date ranges, rate limits, and version checks.
Currency cannot change while costs are entered or after a decision is chosen;
the app never silently converts old amounts or subtracts unlike currencies.
External failures return sanitized messages. Production uses a self-only CSP,
no-referrer, nosniff and frame denial. No request logger is enabled.

## Solver

Enumerate combinations of exactly the requested count (at most 24 choose 3).
Require an approved brand strategy. Filter unassessed, held or poor-fit partners,
then excluded/unavailable partners, unknown prices, known date conflicts,
format requirements, all locks, mutually exclusive groups, and reserve-adjusted
budget. Do not silently unlock partners when no solution exists.

With complete fresh evidence, each segment's best relative rank is converted
internally into an ordinal utility `(count - rank) / (count - 1)`. Single-result
queries are not informative enough to enable cultural ordering. Balanced
ordering first maximizes the worse-served group's utility, then their sum;
core-first and adjacent-first swap primary/secondary objectives. Ties prefer
different contributing partners, then lower cost. Cost-first ignores the
cultural objective. Duplicate optima appear once.

This heuristic compares relative support across separate artist/podcast queries;
it is not a calibrated cross-category probability or campaign outcome model.
The interface exposes contextual ranks, not the internal utility as a fit percent.

Any missing candidate evidence disables cultural ordering for the whole
shortlist; feasible packages remain available in cost order. Unknown is never
interpreted as zero affinity. Quotes alone do not invalidate cultural evidence.
Changed references or shortlist identities do.

## Async work and revisions

Qloo and Gemini requests happen outside the storage queue. At most one research or comparison per
workspace runs at a time. Save only after the original version is rechecked.
Failure or a concurrent edit discards the whole pending result.

Sample creation saves only a real-brand website and hypothetical brief, with
`sample.scenario: allbirds-walking`. Research creates a new source-bound strategy;
explicit approval records chosen Qloo references. Discovery and assessment save
atomically. New sample candidates get labelled illustrative estimates. Old sample
records are not rewritten; fabricated entity IDs still cannot enter live queries.

Brand research stores the exact intake binding, source URLs, model/date, questions,
directions, Qloo match candidates and approval. Changing references removes old
partner assessments; re-analysis changes the strategy identity. The solver refuses
assessment identities that do not match. No LLM can accept an offer or change a lock.

A chosen decision snapshots its intake, reviewed research, brief, partners, evidence and package. Later
changes set `selectionStale` through an input fingerprint. Reselecting preserves
the immediately previous snapshot and a before/after receipt.

## Demographic context

`shared/audience.ts` defines per-entity demographic profiles and Markdown formatting;
`server/audience.ts` parses provider responses and collects bounded batches.
`src/Audience.tsx` renders paired signed charts and missing coverage. The optional
`Workspace.audience` field keeps existing workspace files backward compatible.
Context is stored in the same private capability-protected workspace, and survives
reloads. It is separate from cultural ranks and commercial assessments.

`POST /api/w/:id/audience` requires ownership, matching Origin, a current version,
a nonlegacy sample and reviewed brand strategy. It uses the existing active-work
fence and atomically saves after a version recheck. Discovery/comparison also records
context. Brand reanalysis and candidate linking invalidate its binding. A selection
copies its context; exporting a saved selection uses that copy, not newer profiles.

## Partnership exploration storage and jobs

`shared/partnership.ts` owns pair contracts and export formatting;
`server/partnership.ts` orchestrates six to eight bounded Qloo queries.
`src/Partnership.tsx` presents the pair and `src/Geography.tsx` draws optional
geohash cells. Optional `Workspace.partnerships` maps candidate entity IDs to saved
reports, retaining compatibility with existing files. Failed individual steps are
visible while successful sections remain usable. Total failure preserves saved
state. Origin, ownership, current-version and existing job/concurrency gates apply.

`POST /api/w/:id/partnership` accepts only a linked candidate from the reviewed
campaign. The campaign brand must have one exact Qloo brand match; no arbitrary
client-provided seed metadata is trusted for the new pair. Reanalysis clears reports,
relinking/removing a partner clears its report. Decisions snapshot reports at
selection, and saved-decision views and exports use that snapshot. Pair context
alone does not change the solver fingerprint or package order.
