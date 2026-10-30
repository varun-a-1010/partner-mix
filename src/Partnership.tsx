import { useEffect, useState } from 'react';
import {
  activationIdea,
  contributorLabel,
  type PairOptions,
  type PairReport,
} from '../shared/partnership';
import { Geography } from './Geography';
export function PartnershipExplorer({
  report,
  aName,
  bName,
  busy,
  enabled,
  onExplore,
}: {
  report?: PairReport;
  aName: string;
  bName: string;
  busy: boolean;
  enabled: boolean;
  onExplore: (options: PairOptions) => void;
}) {
  const [city, setCity] = useState(report?.options.city ?? ''),
    [event, setEvent] = useState(!!report?.options.city),
    [heatmap, setHeatmap] = useState(report?.options.includeHeatmap ?? false);
  useEffect(() => {
    setCity(report?.options.city ?? '');
    setEvent(!!report?.options.city);
    setHeatmap(report?.options.includeHeatmap ?? false);
  }, [aName, bName, report?.id]);
  return (
    <section className="pair-explorer" aria-label={`Explore ${aName} and ${bName}`}>
      <h3>Explore this partnership</h3>
      <p>
        What connects {aName} and {bName}, and what could you do together?
      </p>
      <form
        className="pair-controls"
        onSubmit={(e) => {
          e.preventDefault();
          onExplore({ ...(event ? { city: city.trim() } : {}), includeHeatmap: event && heatmap });
        }}
      >
        <label className="pair-check">
          <input
            type="checkbox"
            checked={event}
            disabled={busy}
            onChange={(e) => setEvent(e.target.checked)}
          />
          Include an event or pop-up
        </label>
        {event && (
          <>
            <label>
              City
              <input
                required
                minLength={2}
                maxLength={120}
                value={city}
                disabled={busy}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Los Angeles"
              />
            </label>
            <label className="pair-check">
              <input
                type="checkbox"
                checked={heatmap}
                disabled={busy}
                onChange={(e) => setHeatmap(e.target.checked)}
              />
              Include geographic affinity
            </label>
          </>
        )}
        <button className="primary" disabled={busy || !enabled} type="submit">
          {report ? 'Refresh partnership exploration' : 'Explore with Qloo'}
        </button>
      </form>
      {!enabled && (
        <p className="pair-small">
          Confirm both Qloo identities and connect Qloo to explore the pair.
        </p>
      )}
      {report && <PairResults report={report} />}
    </section>
  );
}
export function PairResults({ report }: { report: PairReport }) {
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const cite = (id: string) => (
    <a onClick={() => setLedgerOpen(true)} className="pair-citation" href={`#${report.id}-${id}`}>
      Source {id}
    </a>
  );
  const { a, b, tastes } = report;
  return (
    <div className="pair-results">
      <p className="pair-small">
        {a.name} × {b.name}; explored {new Date(report.createdAt).toLocaleString()}
        {report.options.city ? `; event locations in ${report.options.city}` : ''}.
      </p>
      {report.ledger.some((q) => q.status === 'error') && (
        <p role="status" className="pair-note">
          Some Qloo steps could not finish. Available results are shown; refresh to retry the
          missing steps.
        </p>
      )}
      <details className="pair-directions">
        <summary>Association in each direction</summary>
        <p className="pair-small">
          Qloo association values for these exact queries. Read the two directions separately; they
          are not fan percentages or a combined fit score.
        </p>
        <div>
          {report.directions.map((d) => (
            <p key={d.queryId}>
              <strong>
                {d.from} → {d.to}
              </strong>
              <span>
                {d.value === undefined ? 'Not returned' : d.value.toFixed(3)} {cite(d.queryId)}
              </span>
            </p>
          ))}
        </div>
      </details>
      <h4>Common ground and new directions</h4>
      <p className="pair-small">
        {cite(tastes.queries[0])} · {cite(tastes.queries[1])}
      </p>
      <p className="pair-small">
        Interests associated with each input. Differences refer to these returned lists, rather than
        exclusive tastes or additional people reached.
      </p>
      <div className="pair-tastes">
        {[
          ['In common', tastes.shared],
          [`More distinctive to ${a.name}`, tastes.aOnly],
          [`More distinctive to ${b.name}`, tastes.bOnly],
        ].map(([label, raw]) => {
          const tags = raw as PairReport['tastes']['shared'];
          return (
            <div key={String(label)}>
              <h5>{String(label)}</h5>
              <div className="pair-tags">
                {tags.map((t) => (
                  <a
                    onClick={() => setLedgerOpen(true)}
                    key={t.id}
                    href={`#${report.id}-${t.queryId}`}
                  >
                    {t.name}
                  </a>
                ))}
              </div>
              {!tags.length && (
                <p className="pair-small">
                  {tastes.available.every(Boolean)
                    ? 'None among the returned tags.'
                    : 'This comparison needs both taste queries.'}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <h4>Possible activations</h4>
      <p className="pair-small">
        Qloo supplies the cultural suggestions; the formats below are starting points for a
        proposal.
      </p>
      <div className="pair-picks">
        {report.activations.map((p) => (
          <article key={`${p.kind}:${p.id}`}>
            <span className="pair-small">
              {p.kind === 'artist' ? 'Music' : p.kind === 'podcast' ? 'Podcast' : 'Event location'}
            </span>
            <h5>{p.name}</h5>
            <p>{activationIdea(p)}</p>
            <p className="pair-small">{contributorLabel(p.contributor, a.name, b.name)}</p>
            {p.contributions && (
              <>
                <div
                  className="pair-contributions"
                  role="img"
                  aria-label={`Explanation contribution: ${a.name} ${(p.contributions.a * 100).toFixed(0)}%, ${b.name} ${(p.contributions.b * 100).toFixed(0)}%`}
                >
                  <span style={{ width: `${p.contributions.a * 100}%` }} />
                  <i style={{ width: `${p.contributions.b * 100}%` }} />
                </div>
                <p className="pair-small">
                  {a.name}: {(p.contributions.a * 100).toFixed(0)}% · {b.name}:{' '}
                  {(p.contributions.b * 100).toFixed(0)}% of the returned explanation
                </p>
              </>
            )}
            {p.description && (
              <details>
                <summary>About this suggestion</summary>
                <p className="pair-small">{p.description}</p>
              </details>
            )}
            {cite(p.queryId)}
          </article>
        ))}
      </div>
      {!report.activations.length && (
        <p>
          No activation suggestions were returned. You can refine the pair or retry unavailable
          queries.
        </p>
      )}
      <p className="pair-small">
        “Both” means each input accounts for at least a quarter of the normalized explanation.
        Missing explanation data stays unavailable. A joint query does not measure an audience
        intersection.
      </p>
      <Geography report={report} onSource={() => setLedgerOpen(true)} />
      <div className="pair-next">
        <strong>Build the next conversation</strong>
        <p>
          Choose a direction that serves the campaign objective, then check editorial fit, existing
          relationships, rights, cost and availability. The commercial research and your notes
          remain part of the decision.
        </p>
      </div>
      <details
        className="pair-ledger"
        open={ledgerOpen}
        onToggle={(e) => setLedgerOpen(e.currentTarget.open)}
      >
        <summary>Inspect Qloo requests and retrieval dates</summary>
        {report.ledger.map((q) => (
          <div key={q.id} id={`${report.id}-${q.id}`} tabIndex={-1}>
            <h5>
              {q.id}: {q.purpose}
            </h5>
            <p>
              {q.status === 'error'
                ? 'Could not complete'
                : q.status === 'empty'
                  ? 'No results'
                  : `${q.count} returned items`}
              ; {new Date(q.fetchedAt).toLocaleString()}
            </p>
            <code>
              {q.path}?{new URLSearchParams(q.params).toString()}
            </code>
          </div>
        ))}
      </details>
    </div>
  );
}
