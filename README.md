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
sample campaign** for a complete fictional example; **Plan a campaign** starts an
empty real workspace.

`QLOO_API_KEY` is read only by the API process. Supply it through this app's runtime
environment, normally its own Doppler project. No credential is bundled into the
client. Without a key, sample planning and manual offers still work.

Campaigns are stored as private files under ignored `.data/`. An HttpOnly cookie
grants access to each campaign in this browser. The recent-campaign list contains
IDs and titles, not credentials. Clearing browser cookies removes browser access.
Export a decision brief when you need a portable record.

## Try the repair flow

1. Open the sample and choose **A bridge between both**.
2. In **Partners & offers**, keep Trail Notes in every mix.
3. Change Low Tide Assembly's cost from ₹230,000 to ₹400,000.
4. Return to **Compare mixes** and choose an updated option.
5. Open **Decision brief** to see the retained/replaced partners and cost change.

All sample partners, quotes, ranks and availability are fictional. Real Qloo
discovery never supplies prices or confirms commercial availability.

## Checks

```sh
npm run check
npm run test:qloo
```

The first command runs formatting, unit/API tests, type checking and the
production build. The opt-in live check needs `QLOO_API_KEY`, makes at most ten
upstream calls, uses synthetic commercial inputs, and removes its temporary
workspace. It prints only sanitized evidence.

This MVP uses a deterministic portfolio solver and bounded Qloo workflow. It does
not yet include an LLM planning agent, contract negotiation, outreach delivery,
audience measurement, bookings, a hosted deployment or a Devpost submission.
See [the docs](docs/index.md).
