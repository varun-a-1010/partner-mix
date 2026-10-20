import { z } from 'zod';
import { seedKinds } from './model';

const short = z.string().trim().max(200);
const date = z.union([z.literal(''), z.iso.date()]);
export const entitySchema = z.object({
  entityId: z
    .string()
    .uuid()
    .transform((s) => s.toUpperCase()),
  name: short.min(1),
  kind: z.enum(seedKinds),
  description: z.string().max(600).default(''),
});
const segment = z.object({
  id: z.enum(['core', 'adjacent']),
  name: short.min(1),
  seeds: z.array(entitySchema).max(4),
});
export const briefSchema = z
  .object({
    brand: short.min(1),
    campaign: short.min(1),
    goal: z.string().trim().min(1).max(1000),
    currency: z.enum(['INR', 'USD', 'GBP', 'EUR']),
    budget: z.number().int().min(1).max(1_000_000_000),
    reservePercent: z.number().int().min(0).max(50),
    partnerCount: z.union([z.literal(2), z.literal(3)]),
    mixedFormats: z.boolean(),
    start: date,
    end: date,
    segments: z.tuple([segment, segment]),
  })
  .refine((b) => b.segments[0].id === 'core' && b.segments[1].id === 'adjacent', 'Invalid groups.')
  .refine((b) => !!b.start === !!b.end, 'Set both campaign dates or leave both empty.')
  .refine((b) => !b.start || b.start <= b.end, 'End date must be on or after start date.');
export const offerSchema = z
  .object({
    amount: z.number().int().min(0).max(1_000_000_000).nullable(),
    basis: z.enum(['estimate', 'quote']),
    source: z.string().trim().max(500),
    deliverables: z.string().trim().max(1000),
    availability: z.enum(['unknown', 'available', 'unavailable']),
    from: date,
    until: date,
    conflictGroup: short,
  })
  .refine((o) => o.basis !== 'quote' || !!o.source, 'Add a source for a quoted offer.')
  .refine((o) => !!o.from === !!o.until, 'Set both availability dates or leave both empty.')
  .refine((o) => !o.from || o.from <= o.until, 'Availability end must follow its start.')
  .refine(
    (o) => o.availability !== 'available' || (!!o.from && !!o.until),
    'Add the dates covered by the availability confirmation.',
  );
export const candidateSchema = z.object({
  id: z.string().uuid(),
  name: short.min(1),
  kind: z.enum(['artist', 'podcast']),
  description: z.string().max(600),
  entityId: z
    .string()
    .uuid()
    .transform((s) => s.toUpperCase())
    .optional(),
  source: z.enum(['manual', 'qloo', 'sample']),
  offer: offerSchema,
  locked: z.boolean(),
  excluded: z.boolean(),
});
export const versionSchema = z.number().int().min(1);
