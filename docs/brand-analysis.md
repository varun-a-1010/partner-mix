---
type: Reference
title: Brand analysis and strategic review
description: Grounded Vertex analysis, explicit approval and campaign-specific partner assessments.
timestamp: 2026-10-20
last_verified: 2026-10-20
---

## Connection and bounded work

The server uses `@google/genai` with Vertex, `gemini-3.8-flash`, low thinking,
structured JSON, a 90-second deadline and no retry loop. Vertex receives a simple
shape schema; full length/count constraints remain enforced by Zod after generation.
The nested bounded assessment schema was rejected with HTTP 400; simplifying the
provider schema succeeded without weakening the application validator. Configuration is
`VERTEX_LLM_PROJECT_ID`, base64 or JSON `VERTEX_LLM_SERVICE_ACCOUNT`,
`VERTEX_LLM_REGION` (default global), and optional `BRAND_MODEL`. Optional
`VERTEX_LLM_BACKUP_PROJECT_ID` and `VERTEX_LLM_BACKUP_SERVICE_ACCOUNT` add a second project, which a
failed call tries with the same model before the chain moves on.

Varun explicitly authorized local reuse of Slate's working default project.
`scripts/with-slate-vertex.mjs` reads only those three Doppler secrets from
`slate/dev_mac`, spawns the requested command with them in memory, and forwards
signals. It clears unrelated Gemini API-key environment variables to avoid
credential ambiguity. It does not create a Doppler project or write any credential.
Production credentials should be provisioned for this app before deployment.

## Research and approval

Intake accepts one public HTTPS website, up to two supporting URLs and an
8,000-character campaign brief. Local/reserved literal hosts, credentials and
custom ports are rejected. The app makes no direct arbitrary URL fetch: Gemini's
URL Context tool reads the exact supplied URLs. It may use its indexed content;
the retrieval timestamp is not a guarantee of a fresh origin crawl.

The structured report separates website statements, campaign brief assumptions,
hypotheses and unknowns. Website citations must be to a supplied URL that the
provider marked successfully retrieved; a profile with no successful source is
rejected. This verifies source availability, not each statement's factual truth.
The planner must review the text. An inaccessible page produces an actionable
error or warning, never a silently invented profile. Patagonia returned queue/error
pages in the live probe, so the sample uses readable Allbirds official pages.

The report proposes two directions and one or two cultural references each.
Qloo search resolves those names; the user chooses identities and approves the
understanding. Missing matches can be skipped when another confirmed reference
exists for that direction, or corrected through re-analysis. Missing or contradictory objective, audience, product category or geography
can prevent approval. Dates, specific SKUs and commercial due diligence stay
nonblocking follow-ups for the exploratory search. References are inputs, not recommended partners.

A source-bound intake fingerprint and unique research ID invalidate approval and
assessments after re-analysis. Reference changes invalidate old assessments too.
Website content, briefs and provider metadata are untrusted inputs in the prompt;
model output cannot directly change offers, locks or saved decisions.

## Partner assessment

After Qloo discovery/comparison, a second structured generation receives the
original planner brief, reviewed analysis, brand sources, provider descriptions
and cultural ranks. The original brief distinguishes actual requirements from
proposed activations. A target city does not require an artist born there. It
must cover every shortlisted candidate exactly once, without arbitrary IDs or
new source URLs. It proposes a campaign role, rationale, activation and concerns.

`investigate` means a defensible creative hypothesis; it does not mean verified
commercial suitability. `hold`, `poor-fit`, missing and stale assessments exclude
partners from mixes. Qloo ranks order culturally supported combinations only
after this strategic gate and the ordinary commercial constraints.

Discovery currently supports music artists and podcasts. The analyst is told not
to propose visual artists, photographers, athletes or unsupported entity types.
No current listener demographics, reach, willingness or political/ethical values
are inferred from a cultural affinity. Those remain explicit verification work.

## Provider references

- [Gemini URL Context](https://ai.google.dev/gemini-api/docs/generate-content/url-context)
- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)

Optional diagnostics expose only stage, elapsed time, outcome, numeric status,
finish reason and validation field/code paths. They do not log raw requests,
responses, credentials or provider exception strings.
