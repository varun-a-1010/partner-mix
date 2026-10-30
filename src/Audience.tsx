import { useState } from 'react';
import {
  ageBands,
  genderBands,
  audienceValue,
  profileFor,
  type AudienceContext,
  type AudienceSubject,
} from '../shared/audience';
export function AudienceComparison({
  context,
  partner,
}: {
  context?: AudienceContext;
  partner: AudienceSubject;
}) {
  const subject = context?.subject;
  const entities = [...(subject ? [subject] : []), partner];
  const first = profileFor(context, subject?.id),
    second = profileFor(context, partner.id);
  const shared = ageBands
    .filter(([key]) => (first?.age[key] ?? 0) > 0 && (second?.age[key] ?? 0) > 0)
    .map(([, label]) => label);
  const differing = ageBands
    .filter(
      ([key]) =>
        first?.age[key] !== undefined &&
        second?.age[key] !== undefined &&
        first.age[key]! * second.age[key]! < 0,
    )
    .map(([, label]) => label);
  return (
    <section className="audience-comparison" aria-label={`Audience context for ${partner.name}`}>
      <h3>Age & gender context</h3>
      <p className="audience-explanation">
        Qloo’s demographic affinity signals. Positive is above average; negative is below average.
        These values are not percentages of fans.
      </p>
      {context?.subjectNote && <p className="audience-note">{context.subjectNote}</p>}
      {!context ? (
        <p role="status">Audience context has not been loaded yet.</p>
      ) : (
        <>
          {entities.map((e) => {
            const p = profileFor(context, e.id);
            const message = p?.refreshError ?? (p?.status !== 'available' ? p?.message : undefined);
            return message ? (
              <p className="audience-note" role="status" key={e.id}>
                {e.name}: {message}
              </p>
            ) : null;
          })}
          <div className="audience-legend">
            {entities.map((e, i) => (
              <span key={e.id}>
                <i className={`audience-color tone-${i}`} />
                {e.name}
              </span>
            ))}
          </div>
          <p className="audience-scale">
            −1 · Below average <span>0 · Average</span> +1 · Above average
          </p>
          {[
            ['Age', ageBands, 'age'],
            ['Gender', genderBands, 'gender'],
          ].map(([label, rawBands, dimension]) => {
            const bands = rawBands as typeof ageBands | typeof genderBands;
            return (
              <div className="audience-dimension" key={String(label)}>
                <h4>{String(label)}</h4>
                {bands.map(([key, name]) => (
                  <div className="audience-row" key={key}>
                    <span className="audience-band">{name}</span>
                    <div>
                      {entities.map((e, i) => {
                        const p = profileFor(context, e.id);
                        const value =
                          p?.status === 'available'
                            ? (
                                p[dimension as 'age' | 'gender'] as Record<
                                  string,
                                  number | undefined
                                >
                              )[key]
                            : undefined;
                        return (
                          <div
                            className="audience-series"
                            key={e.id}
                            aria-label={`${e.name}, ${name}: ${audienceValue(value)}`}
                          >
                            <div
                              className={`audience-track ${value === undefined ? 'is-missing' : ''}`}
                              aria-hidden="true"
                            >
                              <i className="audience-zero" />
                              {value !== undefined && (
                                <span
                                  className={`audience-bar tone-${i}`}
                                  style={{
                                    left: `${value < 0 ? 50 + value * 50 : 50}%`,
                                    width: `${Math.abs(value) * 50}%`,
                                  }}
                                />
                              )}
                            </div>
                            <span className="audience-number">{audienceValue(value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {(shared.length > 0 || differing.length > 0) && (
            <p className="audience-note">
              {shared.length > 0 && (
                <>Both show above-average affinity for ages {shared.join(', ')}. </>
              )}
              {differing.length > 0 && <>Age signals differ for {differing.join(', ')}. </>}Use the
              campaign goal to decide whether similarity or reaching a different audience matters
              more.
            </p>
          )}
          <details className="audience-sources">
            <summary>Qloo sources and retrieval dates</summary>
            {entities.map((e) => {
              const p = profileFor(context, e.id);
              return (
                <div key={e.id}>
                  <strong>{e.name}</strong>
                  <p>{p ? `Retrieved ${new Date(p.fetchedAt).toLocaleString()}` : 'Not loaded'}</p>
                  {p?.message && <p>{p.message}</p>}
                  {p?.refreshError && <p role="status">{p.refreshError}</p>}
                  {p && (
                    <code>
                      {p.request.path}?{new URLSearchParams(p.request.params).toString()}
                    </code>
                  )}
                </div>
              );
            })}
          </details>
        </>
      )}
    </section>
  );
}

export function AudienceExplorer({
  context,
  partners,
  busy,
  connected,
  onRefresh,
}: {
  context?: AudienceContext;
  partners: AudienceSubject[];
  busy: boolean;
  connected: boolean;
  onRefresh: () => void;
}) {
  const [selected, setSelected] = useState('');
  const partner = partners.find((p) => p.id === selected) ?? partners[0];
  if (!partner) return null;
  return (
    <section>
      <div className="audience-toolbar">
        <label>
          Compare audience context
          <select value={partner.id} onChange={(e) => setSelected(e.target.value)}>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary" disabled={busy || !connected} onClick={onRefresh}>
          {context ? 'Refresh audience context' : 'Load audience context'}
        </button>
      </div>
      <AudienceComparison context={context} partner={partner} />
      <p className="hint">
        Read these signals alongside your campaign audience and objective. A different audience can
        be an opportunity to expand; demographic similarity does not decide the mix.
      </p>
    </section>
  );
}
