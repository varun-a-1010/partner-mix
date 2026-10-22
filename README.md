# Partner Mix

A campaign planning studio for a brand partnerships manager. Start with the
brand’s website and campaign brief, review its positioning and proposed search
directions, then investigate music artists and podcasts. Compare affordable
partner combinations and export a defensible proposal with unresolved questions.

## Run locally

Requires Node 22.12 or newer.

```sh
npm ci
node scripts/with-slate-vertex.mjs npm run dev
```

The launcher retrieves only the three explicitly authorized Vertex settings from
Doppler `slate/dev_mac`, into child-process memory. It never writes credentials.
The launcher also fetches `QLOO_API_KEY` from Doppler `shared/dev_mac` (a hackathon test
key) into the same child-process memory; an already-set `QLOO_API_KEY` wins. Production
should use app-owned credentials. No credentials are bundled into the client.

Open [Partner Mix](http://127.0.0.1:5193). The API uses port 3193. Choose **Open
Allbirds sample** in an existing campaign, or **Explore an Allbirds campaign**
on the home screen. Sample creation is offline; research and discovery happen
only when requested. Both provider connections are needed for the full flow.

## Try the full flow

1. Open the Allbirds sample: a real brand with a hypothetical US city-walking campaign.
2. Click **Understand this brand**. Gemini reads the supplied official pages and
   analyzes the brief. Review facts, sources, hypotheses, unknowns and questions.
3. Correct the understanding if needed. Confirm Qloo identities for the proposed
   cultural references, then **Approve understanding & directions**.
4. **Discover & assess partners**. Qloo supplies actual identities and cultural
   ranks; Gemini assesses the campaign role, activation and concerns for each.
5. Review **Budget & timing** and **Partners & offers**, then **Compare mixes**.
   Sample costs are illustrative estimates, and availability is unknown.
6. Choose a mix. Lock one partner and mark another unavailable to try repair.
7. Open **Decision brief** for the original strategy, partner rationale, remaining
   confirmations and a Markdown export.

Campaigns are private files in ignored `.data/`, accessed with a scoped HttpOnly
cookie. Clearing cookies removes that browser’s access. Existing campaigns and
decisions are preserved, but new recommendations require reviewed brand research.

## Checks

```sh
npm run check
node scripts/with-slate-vertex.mjs npm run test:qloo:sample
```

The local check runs formatting, tests, types and production build. The opt-in
live script needs Qloo and Vertex, uses at most 12 Qloo requests and two model
generations, exercises the same API flow, and removes its temporary workspace.
It prints sanitized evidence. `test:qloo` uses an empty campaign with the same
hypothetical brief and synthetic costs instead.

Gemini interpretations need review; URL retrieval does not prove every generated
claim. Qloo affinity is not verified audience reach, rates, willingness or brand
alignment. No outreach, bookings, contracts, hosted deployment or Devpost submission
is performed. See [the docs](docs/index.md).
