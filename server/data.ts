import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { StoredWorkspace } from '../shared/model';

export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const sameHash = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function newWorkspace(demo = false) {
  const secret = randomBytes(32).toString('hex');
  const today = new Date().toISOString().slice(0, 10);
  const workspace: StoredWorkspace = {
    id: randomUUID(),
    ownerHash: hash(secret),
    version: 1,
    demo,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    brief: {
      brand: demo ? 'Fieldwork' : 'Your brand',
      campaign: demo ? 'Take the long way home' : 'My first campaign',
      goal: demo
        ? 'Launch our everyday outdoor collection. Stay credible with outdoor regulars while introducing it to people who discover culture through music.'
        : 'Introduce our brand to an adjacent audience through a small partnership pilot.',
      currency: 'INR',
      budget: 500_000,
      reservePercent: 10,
      partnerCount: 2,
      mixedFormats: true,
      start: demo ? today : '',
      end: demo ? today : '',
      segments: [
        { id: 'core', name: 'Outdoor regulars', seeds: [] },
        { id: 'adjacent', name: 'Music explorers', seeds: [] },
      ],
    },
    candidates: [],
  };
  return { workspace, secret };
}
