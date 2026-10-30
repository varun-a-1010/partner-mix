export const ageBands = [
  ['24_and_younger', 'Under 25'],
  ['25_to_29', '25–29'],
  ['30_to_34', '30–34'],
  ['35_to_44', '35–44'],
  ['45_to_54', '45–54'],
  ['55_and_older', '55+'],
] as const;
export const genderBands = [
  ['male', 'Male'],
  ['female', 'Female'],
] as const;
export type AudienceProfile = {
  entityId: string;
  status: 'available' | 'missing' | 'error';
  age: Partial<Record<(typeof ageBands)[number][0], number>>;
  gender: Partial<Record<(typeof genderBands)[number][0], number>>;
  fetchedAt: string;
  request: { path: string; params: Record<string, string> };
  message?: string;
  refreshError?: string;
};
export type AudienceSubject = { id: string; name: string };
export type AudienceContext = {
  subject?: AudienceSubject;
  subjectNote?: string;
  profiles: AudienceProfile[];
};
export const profileFor = (context: AudienceContext | undefined, id: string | undefined) =>
  id ? context?.profiles.find((p) => p.entityId.toUpperCase() === id.toUpperCase()) : undefined;
export const audienceValue = (n: number | undefined) =>
  n === undefined ? 'Not returned' : `${n > 0 ? '+' : ''}${n.toFixed(2)}`;
export function audienceMarkdown(context: AudienceContext | undefined, partner: AudienceSubject) {
  if (!context) return ['Audience context has not been loaded.', ''];
  const lines = [
    '### Qloo demographic context',
    '',
    'Positive values indicate above-average affinity for a demographic group; negative values indicate below-average affinity. Values are not percentages of fans. Similarity and difference should be read against the campaign goal.',
    '',
  ];
  if (context.subjectNote) lines.push(context.subjectNote, '');
  for (const entity of [...(context.subject ? [context.subject] : []), partner]) {
    const p = profileFor(context, entity.id);
    lines.push(`**${entity.name}**`);
    if (!p) {
      lines.push('Not loaded.', '');
      continue;
    }
    lines.push(`Retrieved: ${p.fetchedAt}. Status: ${p.status}.`);
    if (p.message) lines.push(p.message);
    if (p.refreshError) lines.push(p.refreshError);
    if (p.status === 'available') {
      lines.push(
        ...ageBands.map(([key, label]) => `- Age ${label}: ${audienceValue(p.age[key])}`),
        ...genderBands.map(([key, label]) => `- ${label}: ${audienceValue(p.gender[key])}`),
      );
    }
    lines.push(`Query: ${p.request.path}?${new URLSearchParams(p.request.params)}`, '');
  }
  return lines;
}
