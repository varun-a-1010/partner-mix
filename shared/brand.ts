import { z } from 'zod';
import type { Entity, Workspace } from './model';
import { seedKinds } from './model';

export const intakeSchema = z.object({
  website: z.string().trim().url().max(1500),
  supportingUrls: z.array(z.string().trim().url().max(1500)).max(2).default([]),
  campaignBrief: z
    .string()
    .trim()
    .min(40, 'Describe the campaign in a little more detail.')
    .max(8000),
});
export type BrandIntake = z.infer<typeof intakeSchema>;
const sentence = z.string().trim().min(1).max(900);
export const analysisSchema = z.object({
  brandName: z.string().min(1).max(200),
  summary: sentence,
  facts: z
    .array(
      z.object({
        topic: z.enum([
          'Products',
          'Positioning',
          'Price point',
          'Values and voice',
          'Existing audience',
          'Target audience',
          'Market',
        ]),
        statement: sentence,
        basis: z.enum(['website', 'campaign brief', 'hypothesis', 'unknown']),
        sources: z.array(z.string().max(1500)).max(3),
      }),
    )
    .min(4)
    .max(10),
  objective: sentence,
  successMeasure: sentence,
  guardrails: z.array(sentence).max(8),
  questions: z.array(z.object({ question: sentence, why: sentence, blocking: z.boolean() })).max(5),
  directions: z
    .array(
      z.object({
        id: z.enum(['core', 'adjacent']),
        title: z.string().min(1).max(200),
        audience: sentence,
        rationale: sentence,
        activation: sentence,
        references: z
          .array(
            z.object({
              query: z.string().min(2).max(160),
              kind: z.enum(seedKinds),
              reason: sentence,
            }),
          )
          .min(1)
          .max(2),
      }),
    )
    .length(2),
});
export type BrandAnalysis = z.infer<typeof analysisSchema>;
export type BrandResearch = {
  id: string;
  inputBinding: string;
  createdAt: string;
  model: string;
  analysis: BrandAnalysis;
  sources: { url: string; retrievedAt: string }[];
  warnings: string[];
  resolutions: {
    direction: 'core' | 'adjacent';
    query: string;
    kind: Entity['kind'];
    reason: string;
    matches: Entity[];
  }[];
  approved?: { at: string; references: string[] };
};
export const assessmentSchema = z.object({
  partners: z
    .array(
      z.object({
        candidateId: z.string(),
        disposition: z.enum(['investigate', 'hold', 'poor-fit']),
        role: sentence,
        rationale: sentence,
        activation: sentence,
        concerns: z.array(sentence).min(1).max(5),
        sourceUrls: z.array(z.string().max(1500)).max(3),
      }),
    )
    .max(24),
});
export type PartnerAssessment = z.infer<typeof assessmentSchema>['partners'][number] & {
  researchId: string;
  assessedAt: string;
};
export const brandBinding = (intake?: BrandIntake) => JSON.stringify(intake ?? null);
export function brandReady(w: Workspace) {
  return !!w.research?.approved && w.research.inputBinding === brandBinding(w.intake);
}
export const brandTopics = [
  'Products',
  'Positioning',
  'Price point',
  'Values and voice',
  'Existing audience',
  'Target audience',
  'Market',
] as const;
