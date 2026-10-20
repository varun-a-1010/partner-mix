import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { StoredWorkspace } from '../shared/model';

export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const sameHash = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function newWorkspace(demo = false) {
  const secret = randomBytes(32).toString('hex');
  const workspace: StoredWorkspace = {
    id: randomUUID(),
    ownerHash: hash(secret),
    version: 1,
    demo,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    brief: {
      brand: 'Your brand',
      campaign: 'My campaign',
      goal: 'Analyze the brand and campaign brief to define the objective.',
      currency: 'INR',
      budget: 500_000,
      reservePercent: 10,
      partnerCount: 2,
      mixedFormats: true,
      start: '',
      end: '',
      segments: [
        { id: 'core', name: 'Core direction', seeds: [] },
        { id: 'adjacent', name: 'Adjacent direction', seeds: [] },
      ],
    },
    candidates: [],
  };
  return { workspace, secret };
}
