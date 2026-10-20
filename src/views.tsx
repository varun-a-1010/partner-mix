import { Check, Download, LockKeyhole, RefreshCw } from 'lucide-react';
import type { Candidate, WorkspaceView } from '../shared/model';
import { money } from '../shared/model';
import { PartnerIcon, type Mutate } from './forms';

function nameOf(w: WorkspaceView, id: string) {
  return (
    w.candidates.find((c) => c.id === id)?.name ??
    w.revision?.previous.partners.find((c) => c.id === id)?.name ??
    'Removed partner'
  );
}
export function EvidencePanel({ w }: { w: WorkspaceView }) {
  return (
    <details className="evidence-panel">
      <summary>
        Inspect the cultural evidence{' '}
        <span>
          {w.demo
            ? 'Illustrative rankings'
            : w.planning.evidenceStatus === 'current'
              ? 'Qloo comparisons'
              : 'Coverage needs attention'}
        </span>
      </summary>
      <div className="evidence-body">
        <p>
          Each column compares partners of the same type for one set of references. A rank is
          relative to this shortlist, not a measure of audience size or campaign success.
        </p>
        <div className="evidence-groups">
          {w.brief.segments.map((s) => (
            <div key={s.id}>
              <strong>{s.name}</strong>
              <p>{s.seeds.map((e) => e.name).join(', ') || 'No references selected'}</p>
            </div>
          ))}
        </div>
        {w.evidence && (
          <p className="hint">
            Evidence recorded {new Date(w.evidence.fetchedAt).toLocaleString()}.{' '}
            {w.planning.evidenceStatus === 'stale' &&
              'These comparisons no longer match the saved references or shortlist.'}
          </p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Partner</th>
                <th>Format</th>
                {w.brief.segments.map((s) => (
                  <th key={s.id}>{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {w.candidates.map((c) => (
                <tr key={c.id}>
                  <th scope="row">{c.name}</th>
                  <td>{c.kind}</td>
                  {w.brief.segments.map((s) => {
                    const q = w.evidence?.comparisons.find(
                      (q) => q.kind === c.kind && q.segment === s.id,
                    );
                    const result = q?.results.find((r) => r.candidateId === c.id);
                    return (
                      <td key={s.id}>
                        {result ? (
                          <>
                            <strong>#{result.rank}</strong> of {q!.results.length}
                            <small>
                              {result.contributingSeedIds.length
                                ? `Contributors: ${s.seeds
                                    .filter((e) => result.contributingSeedIds.includes(e.entityId))
                                    .map((e) => e.name)
                                    .join(', ')}`
                                : 'Individual contributors not supplied'}
                            </small>
                          </>
                        ) : (
                          <span className="unknown">Not returned</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">
          Missing results are unknown, never a zero. If the full shortlist cannot be compared,
          packages are ordered by entered cost until coverage is complete.
        </p>
        <details>
          <summary>How the packages are compared</summary>
          <p>
            For each group, a package uses its strongest partner’s relative rank. The balanced
            option prioritizes the less well served group; the other options prioritize core fit,
            adjacent fit or cost. Tied objectives favor distinct contributors, then lower cost. This
            is an ordinal planning rule across separate format comparisons, not a validated
            prediction of marketing performance.
          </p>
          <p>
            No numerical estimate of duplicated followers or incremental reach is made. Separate
            audience and campaign measurement would be needed.
          </p>
          {w.evidence?.comparisons.map((q) => (
            <p className="query-receipt" key={q.id}>
              {q.source} · {q.segment} / {q.kind} · {q.fetchedAt}
              <br />
              Reference: {q.id}
            </p>
          ))}
        </details>
      </div>
    </details>
  );
}
export function ComparisonBoard({
  w,
  mutate,
  edit,
  compare,
  openBrief,
}: {
  w: WorkspaceView;
  mutate: Mutate;
  edit: (id: string) => void;
  compare: () => void;
  openBrief: () => void;
}) {
  const limit = Math.floor((w.brief.budget * (100 - w.brief.reservePercent)) / 100);
  const stateText = w.demo
    ? 'Illustrative cultural comparison'
    : w.planning.evidenceStatus === 'current'
      ? 'Current Qloo comparison'
      : 'Cost-based options';
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Partners that work together.</h2>
          <p>
            {w.planning.feasibleCount} feasible{' '}
            {w.planning.feasibleCount === 1 ? 'combination' : 'combinations'} under{' '}
            {money(limit, w.brief.currency)}, after reserve.
          </p>
        </div>
        <button
          className="secondary"
          disabled={w.demo || w.provider !== 'configured'}
          onClick={compare}
        >
          <RefreshCw size={16} /> Refresh Qloo comparison
        </button>
      </div>
      <div className="comparison-context">
        <span className="status-dot" />
        <strong>{stateText}</strong>
        <span>
          {w.brief.partnerCount} partners{w.brief.mixedFormats ? ', both formats' : ', any format'}
        </span>
      </div>
      {w.selectionStale && (
        <div className="notice warning">
          <strong>Your saved decision needs updating.</strong>
          <p>
            An offer, constraint or comparison changed. The options below use the current inputs;
            your previous decision is preserved for comparison.
          </p>
        </div>
      )}
      {w.planning.evidenceStatus !== 'current' && (
        <div className="notice">
          <strong>
            {w.planning.evidenceStatus === 'stale'
              ? 'Refresh the cultural comparison.'
              : 'Cultural evidence is incomplete.'}
          </strong>
          <p>
            Quotes and constraints still work. Add references for both groups and compare every
            shortlisted partner to enable cultural ranking. Each format needs at least two
            comparable candidates.
          </p>
        </div>
      )}
      {!!w.planning.blockers.length && (
        <div className="empty constraint-empty">
          <h3>Something needs to give.</h3>
          <ul>
            {w.planning.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <p>
            Locked partners will stay locked. Change a constraint or unlock a partner to create new
            options.
          </p>
          <button className="secondary" onClick={openBrief}>
            Review the brief
          </button>
        </div>
      )}
      <div className="package-grid">
        {w.planning.options.map((p) => {
          const chosen = w.selection?.package.id === p.id && !w.selectionStale;
          return (
            <article className={`package ${chosen ? 'chosen' : ''}`} key={p.id}>
              <div className="package-heading">
                <span className="strategy">
                  {p.strategy === 'balanced'
                    ? 'Balanced fit'
                    : p.strategy === 'core'
                      ? 'Core first'
                      : p.strategy === 'adjacent'
                        ? 'Adjacent first'
                        : 'Budget first'}
                </span>
                {chosen && (
                  <span className="chosen-label">
                    <Check size={14} /> Selected
                  </span>
                )}
              </div>
              <h3>{p.title}</h3>
              <div className="mix-slots">
                {p.partnerIds.map((id) => {
                  const c = w.candidates.find((c) => c.id === id)!;
                  return (
                    <div className={`mix-slot ${c.kind}`} key={id}>
                      <PartnerIcon kind={c.kind} />
                      <div>
                        <strong>{c.name}</strong>
                        <span>
                          {c.kind} {c.locked ? '· locked' : ''}
                        </span>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => edit(id)}
                        aria-label={`Edit ${c.name} offer`}
                      >
                        {money(c.offer.amount!, w.brief.currency)}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="fit-notes">
                {p.coverage.map((c) => (
                  <p key={c.segment}>
                    <span className={`group-marker ${c.segment}`} />
                    <span>
                      <strong>{c.name}</strong>
                      <br />
                      {nameOf(w, c.candidateId)}: #{c.rank} of {c.of}{' '}
                      {c.kind === 'artist' ? 'artists' : 'podcasts'}
                    </span>
                  </p>
                ))}
                {!p.coverage.length && (
                  <p>
                    Cost and practical constraints only. Cultural ranking is not available for the
                    complete shortlist.
                  </p>
                )}
              </div>
              <div className="package-cost">
                <div>
                  <span>Total partner costs</span>
                  <strong>{money(p.total, w.brief.currency)}</strong>
                </div>
                <div className="budget-track">
                  <span style={{ width: `${Math.min(100, (p.total / w.brief.budget) * 100)}%` }} />
                  <i style={{ width: `${w.brief.reservePercent}%` }} />
                </div>
                <small>
                  {money(p.headroom, w.brief.currency)} left, plus the {w.brief.reservePercent}%
                  reserve
                </small>
              </div>
              <details className="confirmations">
                <summary>
                  {p.unresolved.length
                    ? `${p.unresolved.length} open ${p.unresolved.length === 1 ? 'confirmation' : 'confirmations'}`
                    : 'Entered logistics are complete'}
                </summary>
                <ul>
                  {p.unresolved.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
                <p className="hint">Verify contract terms and rights before committing.</p>
              </details>
              <button
                className={chosen ? 'secondary select-mix' : 'primary select-mix'}
                disabled={chosen}
                onClick={() => void mutate('/select', { packageId: p.id })}
              >
                {chosen
                  ? 'Chosen for the campaign'
                  : w.selection
                    ? 'Use this updated mix'
                    : 'Choose this mix'}
              </button>
            </article>
          );
        })}
      </div>
      {!!w.planning.options.length && w.planning.options.length < 3 && (
        <p className="hint">
          Some objectives lead to the same best mix. Each distinct recommendation is shown once.
        </p>
      )}
      {!!w.planning.questions.length && (
        <section className="next-questions">
          <h3>What to resolve next</h3>
          <ul>
            {w.planning.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      )}
      <EvidencePanel w={w} />
      {w.run && (
        <details className="workflow">
          <summary>What the last comparison did</summary>
          <ol>
            {w.run.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="hint">{new Date(w.run.at).toLocaleString()}</p>
        </details>
      )}
    </section>
  );
}
export function Decision({
  w,
  showPackages,
  edit,
}: {
  w: WorkspaceView;
  showPackages: () => void;
  edit: (id: string) => void;
}) {
  if (!w.selection)
    return (
      <div className="empty">
        <h2>A decision worth sharing.</h2>
        <p>
          Choose a mix first. Its rationale, entered offers and open confirmations will come
          together here.
        </p>
        <button className="primary" onClick={showPackages}>
          Compare packages
        </button>
      </div>
    );
  const selection = w.selection,
    p = selection.package,
    brief = selection.brief;
  return (
    <section className="decision">
      <div className="section-heading">
        <div>
          <h2>Your campaign decision</h2>
          <p>Share the reasoning and the work that remains.</p>
        </div>
        <a className="button primary" href={`/api/w/${w.id}/brief.md`}>
          <Download size={16} /> Export decision brief
        </a>
      </div>
      {w.selectionStale && (
        <div className="notice warning">
          <strong>This is a previous decision.</strong>
          <p>
            Current inputs have changed. Exports are marked out of date until you choose an updated
            package.
          </p>
          <button className="text-button" onClick={showPackages}>
            Review current options
          </button>
        </div>
      )}
      <article className="decision-paper">
        <div className="decision-title">
          <span>{brief.brand}</span>
          <h3>{brief.campaign}</h3>
          <p>{brief.goal}</p>
        </div>
        <div className="decision-amount">
          <span>{p.title}</span>
          <strong>{money(p.total, brief.currency)}</strong>
          <small>Entered partner costs</small>
        </div>
        <h4>The chosen partners</h4>
        {selection.partners.map((c: Candidate) => (
          <div className="decision-partner" key={c.id}>
            <PartnerIcon kind={c.kind} />
            <div>
              <strong>{c.name}</strong>
              <p>{c.offer.deliverables || 'Deliverables to be agreed'}</p>
              <small>
                {c.offer.source || 'Source not supplied'} ·{' '}
                {c.offer.availability === 'available'
                  ? `Available ${c.offer.from} to ${c.offer.until}`
                  : `Availability ${c.offer.availability}`}
              </small>
            </div>
            <button className="text-button" onClick={() => edit(c.id)}>
              Review offer
            </button>
          </div>
        ))}
        <h4>Why this combination</h4>
        {p.rationale.length ? (
          <ul>
            {p.rationale.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        ) : (
          <p>
            This is a feasible cost-based package. A complete cultural comparison is still needed.
          </p>
        )}
        <h4>Before you commit</h4>
        <ul>
          {p.unresolved.map((u) => (
            <li key={u}>{u}</li>
          ))}
          <li>Agree rights, cancellation terms and a way to measure the pilot.</li>
        </ul>
        <h4>Make the pilot measurable</h4>
        <p>
          Give each partner a distinct tracked link or code. Agree the conversion event and a
          baseline before launch. Review delivery, qualified visits and conversions afterward;
          measure attribution and lift separately.
        </p>
      </article>
      {w.revision && (
        <section className="revision">
          <h3>What changed from the previous decision</h3>
          <div className="revision-columns">
            <div>
              <span className="revision-label">Kept</span>
              {w.revision.retained.map((id) => (
                <p key={id}>
                  <LockKeyhole size={14} />
                  {nameOf(w, id)}
                </p>
              ))}
              {!w.revision.retained.length && <p>No partners retained</p>}
            </div>
            <div>
              <span className="revision-label">Added</span>
              {w.revision.added.map((id) => (
                <p key={id}>{nameOf(w, id)}</p>
              ))}
              {!w.revision.added.length && <p>No new partners</p>}
            </div>
            <div>
              <span className="revision-label">Removed</span>
              {w.revision.removed.map((id) => (
                <p key={id}>{nameOf(w, id)}</p>
              ))}
              {!w.revision.removed.length && <p>No partners removed</p>}
            </div>
          </div>
          <p>
            Partner cost change:{' '}
            <strong>
              {w.revision.costChange > 0 ? '+' : ''}
              {money(w.revision.costChange, w.brief.currency)}
            </strong>
          </p>
        </section>
      )}
      <p className="hint">
        This is a planning brief. No partner has been contacted or booked by Partner Mix.
      </p>
    </section>
  );
}
