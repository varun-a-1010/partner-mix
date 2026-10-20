# Partner Mix

A separate Qloo hackathon prototype for planning a campaign's combination of
artists and podcasts. Start with two audience hypotheses, discover or enter
partners, record offers, compare feasible packages, and revise a chosen mix while
preserving locked partners.

## Run locally

Requires Node 22.12 or newer.

```sh
npm ci
npm run dev
```

Open [Partner Mix](http://127.0.0.1:5193). The API uses port 3193. Use **Explore the
Qloo sample** for a campaign with real artists, podcasts and Qloo rankings;
**Plan a campaign** starts an empty workspace. An open campaign also has an
**Open Qloo sample** button in its sidebar.

`QLOO_API_KEY` is read only by the API process. Supply it through this app's runtime
environment, normally its own Doppler project. No credential is bundled into the
client. New samples require a connection. Without a key, empty campaigns and
manual offers still work, and saved samples remain readable.

Campaigns are stored as private files under ignored `.data/`. An HttpOnly cookie
grants access to each campaign in this browser. The recent-campaign list contains
IDs and titles, not credentials. Clearing browser cookies removes browser access.
Export a decision brief when you need a portable record.

## Try the repair flow

1. Open the Qloo sample and choose a mix.
2. In **Partners & offers**, keep one of its partners in every mix.
3. Mark the other selected partner unavailable.
4. Return to **Compare mixes** and choose an updated option.
5. Open **Decision brief** to see the retained/replaced partners and cost change.

The sample resolves Patagonia and Daft Punk as audience references, discovers
up to eight real partners, and compares that shortlist through Qloo. Its campaign,
cost estimates and activation ideas are illustrative. Availability starts
unconfirmed. Qloo discovery never supplies prices or confirms commercial availability.
Older fictional samples remain labelled and offer a button to open a new real one.

## Checks

```sh
npm run check
npm run test:qloo
npm run test:qloo:sample
```

The first command runs formatting, unit/API tests, type checking and the
production build. Both opt-in live checks need `QLOO_API_KEY`, make at most ten
upstream calls each, use synthetic commercial inputs, and remove their temporary
workspace. They print only sanitized evidence. The sample check exercises the
same sample-creation API used by the UI.

This MVP uses a deterministic portfolio solver and bounded Qloo workflow. It does
not yet include an LLM planning agent, contract negotiation, outreach delivery,
audience measurement, bookings, a hosted deployment or a Devpost submission.
See [the docs](docs/index.md).
