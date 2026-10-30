import {
  ageBands,
  genderBands,
  type AudienceContext,
  type AudienceProfile,
  type AudienceSubject,
} from '../shared/audience';
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
export function parseDemographics(
  data: Record<string, unknown>,
  ids: string[],
  fetchedAt: string,
): AudienceProfile[] {
  const rows = object(data.results).demographics;
  if (!Array.isArray(rows)) throw new Error('Invalid demographic response');
  const request = {
    path: '/v2/insights',
    params: {
      'filter.type': 'urn:demographics',
      'signal.interests.entities': ids.join(','),
    },
  };
  return ids.map((entityId) => {
    const matching = rows.filter(
      (row) => String(object(row).entity_id).toUpperCase() === entityId.toUpperCase(),
    );
    const age: AudienceProfile['age'] = {},
      gender: AudienceProfile['gender'] = {};
    for (const row of matching) {
      const query = object(object(row).query);
      for (const [bands, target, raw] of [
        [ageBands, age, query.age],
        [genderBands, gender, query.gender],
      ] as const) {
        for (const [key] of bands) {
          const value = object(raw)[key];
          if (
            typeof value === 'number' &&
            Number.isFinite(value) &&
            value >= -1 &&
            value <= 1 &&
            !(key in target)
          )
            (target as Record<string, number>)[key] = value;
        }
      }
    }
    const available = Object.keys(age).length + Object.keys(gender).length > 0;
    return {
      entityId,
      status: available ? 'available' : 'missing',
      age,
      gender,
      fetchedAt,
      request,
      ...(!available
        ? { message: 'Qloo did not return usable age or gender signals for this entity.' }
        : {}),
    };
  });
}
export async function collectAudiences(
  qloo: { demographics(ids: string[]): Promise<AudienceProfile[]> },
  ids: string[],
  subject?: AudienceSubject,
  previous?: AudienceContext,
  subjectNote?: string,
): Promise<AudienceContext> {
  const unique = [...new Set(ids.map((id) => id.toUpperCase()))];
  const profiles: AudienceProfile[] = [];
  // At most eight entities per call and two calls at a time.
  for (let offset = 0; offset < unique.length; offset += 16) {
    const chunks = [unique.slice(offset, offset + 8), unique.slice(offset + 8, offset + 16)].filter(
      (c) => c.length,
    );
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        try {
          return await qloo.demographics(chunk);
        } catch {
          return chunk.map((entityId): AudienceProfile => {
            const old = previous?.profiles.find(
              (p) => p.entityId.toUpperCase() === entityId && p.status === 'available',
            );
            if (old)
              return {
                ...old,
                refreshError:
                  'Refresh failed. Showing the saved Qloo signals from the retrieval date below.',
              };
            return {
              entityId,
              status: 'error',
              age: {},
              gender: {},
              fetchedAt: new Date().toISOString(),
              request: {
                path: '/v2/insights',
                params: {
                  'filter.type': 'urn:demographics',
                  'signal.interests.entities': chunk.join(','),
                },
              },
              message: 'Audience signals could not be loaded. Retry when Qloo is available.',
            };
          });
        }
      }),
    );
    profiles.push(...results.flat());
  }
  return { subject, subjectNote, profiles };
}
