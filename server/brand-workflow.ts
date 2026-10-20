import { randomUUID } from 'node:crypto';
import { brandBinding, type BrandIntake, type BrandResearch } from '../shared/brand';
import type { StoredWorkspace } from '../shared/model';
import type { BrandAnalyst } from './brand-analyst';
import type { Qloo } from './qloo';
import { AppError } from './store';

export async function researchBrand(
  w: StoredWorkspace,
  intake: BrandIntake,
  analyst: BrandAnalyst,
  qloo: Qloo,
) {
  const report = await analyst.research(intake);
  const resolutions: BrandResearch['resolutions'] = [];
  const warnings = [...report.warnings];
  for (const direction of report.analysis.directions) {
    for (const ref of direction.references) {
      let matches: BrandResearch['resolutions'][number]['matches'] = [];
      try {
        matches = await qloo.search(ref.query, ref.kind);
      } catch {
        warnings.push(
          `The reference "${ref.query}" could not be resolved in Qloo. Brand research is saved; retry analysis when Qloo is available.`,
        );
      }
      resolutions.push({ direction: direction.id, ...ref, matches });
    }
  }
  const next = structuredClone(w);
  next.intake = intake;
  next.research = {
    id: randomUUID(),
    inputBinding: brandBinding(intake),
    createdAt: new Date().toISOString(),
    ...report,
    warnings,
    resolutions,
  };
  next.brief.brand = report.analysis.brandName;
  next.brief.goal = report.analysis.objective;
  const segment = (id: 'core' | 'adjacent') => ({
    id,
    name: report.analysis.directions.find((d) => d.id === id)!.title,
    seeds: [],
  });
  next.brief.segments = [segment('core'), segment('adjacent')];
  return next;
}
export function approveBrand(
  w: StoredWorkspace,
  references: { direction: 'core' | 'adjacent'; entityIds: string[] }[],
) {
  const previous = JSON.stringify(
    w.brief.segments.map((s) => s.seeds.map((e) => e.entityId).sort()),
  );
  const research = w.research;
  if (!research || research.inputBinding !== brandBinding(w.intake))
    throw new AppError(422, 'Analyze the current website and campaign brief first.');
  if (research.analysis.questions.some((q) => q.blocking))
    throw new AppError(
      422,
      'Answer the essential questions in your campaign brief and analyze it again.',
    );
  if (references.length !== 2 || new Set(references.map((r) => r.direction)).size !== 2)
    throw new AppError(400, 'Review references for both partnership directions.');
  for (const segment of w.brief.segments) {
    const selected = references.find((r) => r.direction === segment.id)!.entityIds;
    const allowed = research.resolutions
      .filter((r) => r.direction === segment.id)
      .flatMap((r) => r.matches);
    const seeds = [...new Set(selected)].map((id) => allowed.find((e) => e.entityId === id));
    if (!seeds.length || seeds.length > 4 || seeds.some((e) => !e))
      throw new AppError(422, 'Choose confirmed Qloo references for both directions.');
    segment.seeds = seeds.filter((e) => !!e);
  }
  research.approved = {
    at: new Date().toISOString(),
    references: w.brief.segments.flatMap((s) => s.seeds.map((e) => e.entityId)),
  };
  if (
    previous !== JSON.stringify(w.brief.segments.map((s) => s.seeds.map((e) => e.entityId).sort()))
  ) {
    for (const candidate of w.candidates) delete candidate.assessment;
  }
}
