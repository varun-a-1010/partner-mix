import type { BrandIntake } from './brand';

export type SampleCampaign = {
  id: string;
  brand: string;
  category: string;
  /** One line a reader can scan on the sample card. */
  pitch: string;
  campaign: string;
  goal: string;
  budget: number;
  start: string;
  end: string;
  intake: BrandIntake;
};

/** Real brands with independent, hypothetical campaigns. No brand endorsed or requested these. */
export const SAMPLE_CAMPAIGNS: SampleCampaign[] = [
  {
    id: 'topgolf-first-swing',
    brand: 'Topgolf',
    category: 'Sports and nights out',
    pitch: 'Get non-golfers to book a first night out with friends in Chicago.',
    campaign: 'First swing: a hypothetical pilot',
    goal: 'Bring non-golfers in for a first night out with friends.',
    budget: 25000,
    start: '2026-11-01',
    end: '2026-11-30',
    intake: {
      website: 'https://topgolf.com/us/',
      supportingUrls: ['https://topgolf.com/us/experience/'],
      campaignBrief:
        'Independent hypothetical Topgolf campaign, not an actual campaign or endorsement. Plan a US pilot across all Chicago-area Topgolf venues as a group, to bring adults who do not play golf to a first visit with friends. No single venue has to be chosen for this exploratory shortlist. Reach adult groups looking for a night out built around food, music and friendly competition. Desired action: a first bay booking, with individual venue links. For the hypothetical pilot, qualified means a tagged visitor opens a venue booking page. Explore music artists and podcasts with two complementary creative directions: one music partner and one podcast, using a live session at a venue or a hosted episode. Proposed pilot window: November 1–30, 2026. Use a USD 25,000 total planning budget and 10% reserve, including any creative production; real rates, rights, audience geography and availability are unknown and must be checked before outreach or commitment. Avoid unsupported claims about venue availability or invented audience demographics. Propose useful first-timer storytelling rather than generic celebrity promotion. This is a research shortlist, so unknown commercial terms are follow-up questions rather than reasons to postpone discovery.',
    },
  },
  {
    id: 'liquid-death-tour',
    brand: 'Liquid Death',
    category: 'Food and drink',
    pitch: 'Put canned water in the hands of Austin concertgoers who drink less.',
    campaign: 'Last call: a hypothetical pilot',
    goal: 'Introduce the brand to adults drinking less on nights out.',
    budget: 30000,
    start: '2027-01-01',
    end: '2027-01-31',
    intake: {
      website: 'https://liquiddeath.com/',
      supportingUrls: [],
      campaignBrief:
        'Independent hypothetical Liquid Death campaign, not an actual campaign or endorsement. Plan a US pilot in Austin as a growth-marketing planner would: introduce the brand to adults who want to drink less on a night out without feeling left out. Reach adults who go to live music at least once a month. Desired action: a first purchase, with tagged links to a retailer finder. For the hypothetical pilot, qualified means a tagged visitor opens the retailer finder. Explore music artists and podcasts with two complementary creative directions: one music partner and one podcast, using a tour-stop moment or a hosted episode. Proposed pilot window: January 1–31, 2027. Use a USD 30,000 total planning budget and 10% reserve, including any creative production; real rates, rights, audience geography and availability are unknown and must be checked before outreach or commitment. Avoid health claims, sobriety judgments or invented audience demographics. This is a research shortlist, so unknown commercial terms are follow-up questions rather than reasons to postpone discovery.',
    },
  },
  {
    id: 'lego-grown-up-build',
    brand: 'LEGO',
    category: 'Toys and play',
    pitch: 'Get Seattle adults who stopped building as kids to pick up a set.',
    campaign: 'Grown-up build: a hypothetical pilot',
    goal: 'Get adults who have not built since childhood to try a set.',
    budget: 35000,
    start: '2027-02-01',
    end: '2027-02-28',
    intake: {
      website: 'https://www.lego.com/en-us',
      supportingUrls: [],
      campaignBrief:
        'Independent hypothetical LEGO campaign, not an actual campaign or endorsement. Plan a US pilot in Seattle as a growth-marketing planner would: get adults who have not built anything since childhood to try a set for themselves. Reach adults looking for a screen-free way to unwind. Desired action: buying a first set made for adults, with tagged links to the online store. For the hypothetical pilot, qualified means a tagged visitor opens a set page. Explore music artists and podcasts with two complementary creative directions: one music partner and one podcast, using a build-along session or a hosted episode. Proposed pilot window: February 1–28, 2027. Use a USD 35,000 total planning budget and 10% reserve, including any creative production; real rates, rights, audience geography and availability are unknown and must be checked before outreach or commitment. Avoid claims about stress relief or health, and invented audience demographics. This is a research shortlist, so unknown commercial terms are follow-up questions rather than reasons to postpone discovery.',
    },
  },
  {
    id: 'peloton-back-at-it',
    brand: 'Peloton',
    category: 'Health and fitness',
    pitch: 'Win back people in Atlanta who quit the gym and miss the routine.',
    campaign: 'Back at it: a hypothetical pilot',
    goal: 'Bring lapsed gym-goers into a first free app class.',
    budget: 40000,
    start: '2027-01-04',
    end: '2027-01-31',
    intake: {
      website: 'https://www.onepeloton.com/',
      supportingUrls: [],
      campaignBrief:
        'Independent hypothetical Peloton campaign, not an actual campaign or endorsement. Plan a US pilot in Atlanta as a growth-marketing planner would: reach adults who quit the gym in the past year and miss having a routine. Desired action: starting a free app trial and taking a first class. For the hypothetical pilot, qualified means a tagged visitor starts a trial. Explore music artists and podcasts with two complementary creative directions: one music partner and one podcast, using an artist-themed class or a hosted episode. Proposed pilot window: January 4–31, 2027. Use a USD 40,000 total planning budget and 10% reserve, including any creative production; real rates, rights, audience geography and availability are unknown and must be checked before outreach or commitment. Avoid body-image messaging, medical claims or invented audience demographics. This is a research shortlist, so unknown commercial terms are follow-up questions rather than reasons to postpone discovery.',
    },
  },
  {
    id: 'airbnb-first-host',
    brand: 'Airbnb',
    category: 'Travel and hosting',
    pitch: 'Encourage first-time hosts in Nashville around the spring concert season.',
    campaign: 'Spare room: a hypothetical pilot',
    goal: 'Get homeowners in a music city to try hosting for the first time.',
    budget: 45000,
    start: '2027-03-01',
    end: '2027-04-30',
    intake: {
      website: 'https://news.airbnb.com/about-us/',
      supportingUrls: [],
      campaignBrief:
        'Independent hypothetical Airbnb campaign, not an actual campaign or endorsement. Plan a US pilot in Nashville as a growth-marketing planner would: encourage homeowners to try hosting for the first time around the spring concert season. Desired action: starting a listing. For the hypothetical pilot, qualified means a tagged visitor opens the hosting page. Explore music artists and podcasts with two complementary creative directions: one music partner and one podcast, using a house-show moment or a hosted episode about opening your home. Proposed pilot window: March 1–April 30, 2027. Use a USD 45,000 total planning budget and 10% reserve, including any creative production; real rates, rights, audience geography and availability are unknown and must be checked before outreach or commitment. Avoid earnings promises, unsupported local regulation claims or invented audience demographics. This is a research shortlist, so unknown commercial terms are follow-up questions rather than reasons to postpone discovery.',
    },
  },
  {
    id: 'chipotle-first-order',
    brand: 'Chipotle',
    category: 'Restaurants',
    pitch: 'Make the app the default late-night order for students in Columbus.',
    campaign: 'Study break: a hypothetical pilot',
    goal: 'Get college students to place a first order in the app.',
    budget: 28000,
    start: '2027-02-01',
    end: '2027-03-15',
    intake: {
      website: 'https://www.chipotle.com/',
      supportingUrls: [],
      campaignBrief:
        'Independent hypothetical Chipotle campaign, not an actual campaign or endorsement. Plan a US pilot in Columbus, Ohio as a growth-marketing planner would: reach college students who eat out with friends but have never ordered in the app. Desired action: a first app order. For the hypothetical pilot, qualified means a tagged visitor opens the app download page. Explore music artists and podcasts with two complementary creative directions: one music partner and one podcast, using a campus show or a hosted episode. Proposed pilot window: February 1–March 15, 2027. Use a USD 28,000 total planning budget and 10% reserve, including any creative production; real rates, rights, audience geography and availability are unknown and must be checked before outreach or commitment. Avoid nutrition claims, promises about offers or invented audience demographics. This is a research shortlist, so unknown commercial terms are follow-up questions rather than reasons to postpone discovery.',
    },
  },
];
