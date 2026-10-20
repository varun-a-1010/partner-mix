import { useState } from 'react';
import { ArrowRight, Check, ExternalLink, Globe2 } from 'lucide-react';
import type { WorkspaceView, Candidate } from '../shared/model';
import { brandBinding, brandReady, type BrandIntake } from '../shared/brand';
import type { Mutate } from './forms';

export function BrandStudio({
  w,
  mutate,
  discover,
}: {
  w: WorkspaceView;
  mutate: Mutate;
  discover: () => void;
}) {
  const [input, setInput] = useState<BrandIntake>(
    w.intake ?? { website: '', campaignBrief: '', supportingUrls: [] },
  );
  const [corrections, setCorrections] = useState('');
  const report = w.research;
  const [choices, setChoices] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      (report?.resolutions ?? []).map((r, i) => [
        i,
        r.matches.find((e) =>
          w.brief.segments
            .find((s) => s.id === r.direction)
            ?.seeds.some((s) => s.entityId === e.entityId),
        )?.entityId ??
          r.matches.find((e) => e.name.toLowerCase() === r.query.toLowerCase())?.entityId ??
          '',
      ]),
    ),
  );
  const dirty =
    !!report &&
    (brandBinding({ ...input, supportingUrls: input.supportingUrls.filter(Boolean) }) !==
      report.inputBinding ||
      !!corrections.trim());
  const essential = report?.analysis.questions.some((q) => q.blocking);
  const references = (['core', 'adjacent'] as const).map((direction) => ({
    direction,
    entityIds: [
      ...new Set(
        (report?.resolutions ?? []).flatMap((r, i) =>
          r.direction === direction && choices[i] ? [choices[i]] : [],
        ),
      ),
    ],
  }));
  const referencesChanged = references.some(
    (r) =>
      JSON.stringify([...r.entityIds].sort()) !==
      JSON.stringify(
        w.brief.segments
          .find((s) => s.id === r.direction)!
          .seeds.map((e) => e.entityId)
          .sort(),
      ),
  );
  const reviewed = brandReady(w) && !dirty && !referencesChanged;
  async function analyze() {
    await mutate('/research', {
      intake: {
        ...input,
        supportingUrls: input.supportingUrls.filter(Boolean),
        campaignBrief:
          input.campaignBrief +
          (corrections.trim() ? `\n\nPlanner corrections and answers:\n${corrections.trim()}` : ''),
      },
    });
  }
  return (
    <section className="brand-studio">
      <div className="section-heading">
        <div>
          <h2>Start with the brand.</h2>
          <p>
            Share the website and the decision you need to make. Review the understanding before we
            look for partners.
          </p>
        </div>
      </div>
      <form
        className="brand-intake"
        onSubmit={(e) => {
          e.preventDefault();
          void analyze();
        }}
      >
        <label>
          Brand website
          <div className="website-field">
            <Globe2 size={20} />
            <input
              type="url"
              required
              placeholder="https://your-brand.com"
              value={input.website}
              onChange={(e) => setInput({ ...input, website: e.target.value })}
            />
          </div>
        </label>
        <label>
          Campaign brief
          <textarea
            rows={7}
            required
            minLength={40}
            maxLength={8000}
            value={input.campaignBrief}
            placeholder="What are you promoting, to whom, and where? What should people do afterwards? Include your positioning, budget, timing and any restrictions you already know."
            onChange={(e) => setInput({ ...input, campaignBrief: e.target.value })}
          />
          <small>This workspace investigates music artists and podcasts.</small>
        </label>
        <details open={input.supportingUrls.some(Boolean)}>
          <summary>About, product or values pages (optional)</summary>
          <p className="hint">
            Direct pages help when a homepage is mostly navigation. Up to two additional public
            pages.
          </p>
          {[0, 1].map((i) => (
            <label key={i}>
              Supporting page {i + 1}
              <input
                type="url"
                value={input.supportingUrls[i] ?? ''}
                onChange={(e) => {
                  const urls = [...input.supportingUrls];
                  urls[i] = e.target.value;
                  setInput({ ...input, supportingUrls: urls });
                }}
              />
            </label>
          ))}
        </details>
        <div className="form-footer">
          <p className="hint">
            The website URLs and campaign brief are sent to the connected analysis service. Only
            pages it confirms reading are accepted as sources.
          </p>
          <button className="primary" disabled={w.analyst !== 'configured'}>
            {report ? 'Re-analyze brand & brief' : 'Understand this brand'} <ArrowRight size={17} />
          </button>
        </div>
        {w.analyst !== 'configured' && (
          <p className="form-error">Brand analysis needs the server’s Vertex connection.</p>
        )}
      </form>
      {!report && (
        <div className="research-preview">
          <h3>What you’ll review</h3>
          <p>
            Products and positioning. Values and voice. Who this campaign needs to reach. Then, two
            reasoned partnership directions with evidence and open questions.
          </p>
          {w.candidates.length > 0 && (
            <p className="hint">
              This older campaign has a shortlist but no reviewed brand research. Its saved partners
              are preserved for reassessment.
            </p>
          )}
        </div>
      )}
      {report && (
        <>
          <div className="section-heading spaced">
            <div>
              <h2>Our understanding of {report.analysis.brandName}</h2>
              <p>{report.analysis.summary}</p>
            </div>
            <span className="review-status">{reviewed ? 'Reviewed' : 'Needs your review'}</span>
          </div>
          {dirty && (
            <p className="notice warning">
              The website, brief or corrections have changed. Re-analyze before approving these
              directions.
            </p>
          )}
          {report.warnings.map((warning) => (
            <p className="notice warning" key={warning}>
              {warning}
            </p>
          ))}
          <dl className="brand-facts">
            {report.analysis.facts.map((fact, i) => (
              <div key={i}>
                <dt>
                  {fact.topic}
                  <span className={`basis basis-${fact.basis.replace(' ', '-')}`}>
                    {fact.basis}
                  </span>
                </dt>
                <dd>{fact.statement}</dd>
                {fact.sources.map((url) =>
                  url === 'campaign brief' ? (
                    <small key={url}>From your campaign brief</small>
                  ) : (
                    <a
                      className="source-link"
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Read source <ExternalLink size={12} />
                    </a>
                  ),
                )}
              </div>
            ))}
          </dl>
          <div className="campaign-purpose">
            <h3>The job for this campaign</h3>
            <p>{report.analysis.objective}</p>
            <strong>What success would look like</strong>
            <p>{report.analysis.successMeasure}</p>
            <h4>Keep these boundaries</h4>
            <ul>
              {report.analysis.guardrails.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
          {!!report.analysis.questions.length && (
            <section className="brand-questions">
              <h3>Questions worth resolving</h3>
              {report.analysis.questions.map((q) => (
                <div key={q.question}>
                  <strong>{q.question}</strong>
                  {q.blocking && <span className="basis">Needed before discovery</span>}
                  <p>{q.why}</p>
                </div>
              ))}
            </section>
          )}
          <label className="corrections">
            Correct the understanding or answer the questions
            <textarea
              rows={3}
              maxLength={2000}
              value={corrections}
              placeholder="For example: We’re targeting the UK, not the US. Focus on repair education rather than a new collection."
              onChange={(e) => setCorrections(e.target.value)}
            />
          </label>
          {!!corrections.trim() && (
            <button className="secondary" onClick={() => void analyze()}>
              Apply corrections & re-analyze
            </button>
          )}
          <div className="section-heading spaced">
            <div>
              <h2>Partnership directions to investigate</h2>
              <p>
                These are proposals based on the brief. Review the logic and the cultural references
                before discovery.
              </p>
            </div>
          </div>
          <div className="direction-grid">
            {report.analysis.directions.map((direction) => (
              <article className={`direction direction-${direction.id}`} key={direction.id}>
                <h3>{direction.title}</h3>
                <p>{direction.audience}</p>
                <h4>Why this direction</h4>
                <p>{direction.rationale}</p>
                <h4>An activation to explore</h4>
                <p>{direction.activation}</p>
                <h4>References for discovery</h4>
                {report.resolutions.map((r, i) =>
                  r.direction !== direction.id ? null : (
                    <div className="reference-choice" key={i}>
                      <label>
                        {r.query}
                        <select
                          value={choices[i] ?? ''}
                          onChange={(e) => setChoices({ ...choices, [i]: e.target.value })}
                        >
                          <option value="">Choose a match, or skip this reference</option>
                          {r.matches.map((entity) => (
                            <option key={entity.entityId} value={entity.entityId}>
                              {entity.name} ({entity.kind})
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="hint">{r.reason}</p>
                      {!r.matches.length && (
                        <p className="form-error">
                          No Qloo match. Add a correction with an alternative reference, then
                          re-analyze.
                        </p>
                      )}
                    </div>
                  ),
                )}
              </article>
            ))}
          </div>
          <div className="brand-approval">
            {reviewed ? (
              <>
                <p>
                  <Check size={17} /> Brand understanding and directions reviewed. Next, investigate
                  partners against this strategy.
                </p>
                <button
                  className="primary"
                  onClick={discover}
                  disabled={w.provider !== 'configured'}
                >
                  Discover & assess partners <ArrowRight size={17} />
                </button>
              </>
            ) : (
              <>
                <p>
                  Approval records the understanding and chosen references. It does not approve a
                  partner or any spending.
                </p>
                <button
                  className="primary"
                  disabled={dirty || essential || references.some((r) => !r.entityIds.length)}
                  onClick={() => void mutate('/approve-brand', { references })}
                >
                  Approve understanding & directions
                </button>
              </>
            )}
          </div>
          <details className="research-sources">
            <summary>Research sources and date</summary>
            <p className="hint">
              {report.model} · {new Date(report.createdAt).toLocaleString()}
            </p>
            {report.sources.map((s) => (
              <p key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.url}
                </a>
              </p>
            ))}
          </details>
        </>
      )}
    </section>
  );
}

export function PartnerCase({
  candidate: c,
  researchId,
}: {
  candidate: Candidate;
  researchId?: string;
}) {
  const a = c.assessment;
  if (!a || a.researchId !== researchId)
    return (
      <p className="hint">
        This partner still needs assessment against the current brand strategy.
      </p>
    );
  return (
    <section className={`partner-case case-${a.disposition}`}>
      <span className="case-verdict">
        {a.disposition === 'investigate'
          ? 'Worth investigating'
          : a.disposition === 'hold'
            ? 'Fit needs more evidence'
            : 'Weak fit for this brief'}
      </span>
      <h4>{a.role}</h4>
      <strong>Why it could work</strong>
      <p>{a.rationale}</p>
      <strong>Activation hypothesis</strong>
      <p>{a.activation}</p>
      <details>
        <summary>What could make this a poor choice</summary>
        <ul>
          {a.concerns.map((concern) => (
            <li key={concern}>{concern}</li>
          ))}
        </ul>
      </details>
      <small>
        Strategic interpretation of the brief, provider description and cultural results. Partner
        suitability and willingness need independent confirmation.
      </small>
      <p className="hint">
        Confirm audience location, rates, rights and availability directly before proposing a
        commitment.
      </p>
    </section>
  );
}
