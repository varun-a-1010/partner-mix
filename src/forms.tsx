import { useState, type FormEvent } from 'react';
import { Search, X, LockKeyhole, UnlockKeyhole, Music2, Mic2, Plus, Trash2 } from 'lucide-react';
import type { Brief, Candidate, Entity, Offer, SeedKind, WorkspaceView } from '../shared/model';
import { money } from '../shared/model';
import { api } from './api';

export type Mutate = (
  path: string,
  body: Record<string, unknown>,
  method?: string,
) => Promise<boolean>;
export function EntityFinder({
  w,
  kind: fixedKind,
  choose,
}: {
  w: WorkspaceView;
  kind?: 'artist' | 'podcast';
  choose: (entity: Entity) => void;
}) {
  const [query, setQuery] = useState(''),
    [kind, setKind] = useState<SeedKind>(fixedKind ?? 'brand');
  const [results, setResults] = useState<Entity[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [searched, setSearched] = useState(false);
  async function search() {
    if (query.trim().length < 2) return;
    setLoading(true);
    setError('');
    setResults([]);
    setSearched(false);
    try {
      setResults(
        (await api<{ entities: Entity[] }>(`/w/${w.id}/search`, { query, kind: fixedKind ?? kind }))
          .entities,
      );
      setSearched(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  if (w.demo)
    return (
      <p className="hint">
        This example uses fictional taste references. Start a new campaign for live Qloo search.
      </p>
    );
  if (w.provider !== 'configured')
    return (
      <p className="hint">
        Qloo search is not connected. You can enter partners and offers while it is being set up.
      </p>
    );
  return (
    <div className="entity-finder">
      <div className="search-controls">
        {!fixedKind && (
          <select
            aria-label="Reference category"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as SeedKind);
              setResults([]);
            }}
          >
            <option value="brand">Brand</option>
            <option value="artist">Artist</option>
            <option value="podcast">Podcast</option>
            <option value="movie">Film</option>
            <option value="book">Book</option>
          </select>
        )}
        <input
          aria-label="Search Qloo"
          placeholder={
            fixedKind === 'podcast' ? 'Search a podcast' : 'Search a name, e.g. Patagonia'
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResults([]);
            setSearched(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void search();
            }
          }}
        />
        <button
          type="button"
          className="icon-button"
          aria-label="Search Qloo"
          disabled={loading || query.trim().length < 2}
          onClick={() => void search()}
        >
          <Search size={18} />
        </button>
      </div>
      {loading && (
        <p className="hint" role="status">
          Finding matching entities…
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {searched && !results.length && !loading && (
        <p className="hint">No matching entities. Try another spelling or category.</p>
      )}
      {!!results.length && (
        <div className="search-results">
          {results.map((r) => (
            <button
              type="button"
              key={r.entityId}
              onClick={() => {
                choose(r);
                setResults([]);
                setQuery('');
                setSearched(false);
              }}
            >
              <strong>{r.name}</strong>
              <span>
                {r.kind}
                {r.description ? ` · ${r.description.slice(0, 130)}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function BriefEditor({ w, mutate }: { w: WorkspaceView; mutate: Mutate }) {
  const [brief, setBrief] = useState<Brief>(w.brief);
  const set = <K extends keyof Brief>(k: K, v: Brief[K]) => setBrief((b) => ({ ...b, [k]: v }));
  function setGroup(index: number, update: Partial<Brief['segments'][number]>) {
    setBrief((b) => ({
      ...b,
      segments: b.segments.map((s, i) =>
        i === index ? { ...s, ...update } : s,
      ) as Brief['segments'],
    }));
  }
  return (
    <form
      className="brief-editor"
      onSubmit={(e) => {
        e.preventDefault();
        void mutate('/brief', { brief }, 'PATCH');
      }}
    >
      <div className="section-heading">
        <div>
          <h2>The campaign brief</h2>
          <p>Give the mix a purpose and a practical boundary.</p>
        </div>
        <button className="primary" type="submit">
          Save brief
        </button>
      </div>
      <div className="form-grid">
        <label>
          Brand
          <input
            required
            maxLength={200}
            value={brief.brand}
            onChange={(e) => set('brand', e.target.value)}
          />
        </label>
        <label>
          Campaign name
          <input
            required
            maxLength={200}
            value={brief.campaign}
            onChange={(e) => set('campaign', e.target.value)}
          />
        </label>
        <label className="full">
          What should this campaign achieve?
          <textarea
            required
            maxLength={1000}
            rows={3}
            value={brief.goal}
            onChange={(e) => set('goal', e.target.value)}
          />
        </label>
        <label>
          Total budget
          <input
            required
            type="number"
            min={1}
            max={1_000_000_000}
            step={1}
            value={brief.budget}
            onChange={(e) => set('budget', Number(e.target.value))}
          />
        </label>
        <label>
          Currency
          <select
            value={brief.currency}
            disabled={!!w.selection || w.candidates.some((c) => c.offer.amount !== null)}
            onChange={(e) => set('currency', e.target.value as Brief['currency'])}
          >
            {['INR', 'USD', 'GBP', 'EUR'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <small>Amounts are entered in whole currency units.</small>
        </label>
        <label>
          Keep in reserve (%)
          <input
            required
            type="number"
            min={0}
            max={50}
            step={1}
            value={brief.reservePercent}
            onChange={(e) => set('reservePercent', Number(e.target.value))}
          />
        </label>
        <label>
          Partners per package
          <select
            value={brief.partnerCount}
            onChange={(e) => set('partnerCount', Number(e.target.value) as 2 | 3)}
          >
            <option value={2}>2 partners</option>
            <option value={3}>3 partners</option>
          </select>
        </label>
        <label>
          Campaign starts
          <input type="date" value={brief.start} onChange={(e) => set('start', e.target.value)} />
        </label>
        <label>
          Campaign ends
          <input
            type="date"
            min={brief.start}
            value={brief.end}
            onChange={(e) => set('end', e.target.value)}
          />
        </label>
        <label className="check-label full">
          <input
            type="checkbox"
            checked={brief.mixedFormats}
            onChange={(e) => set('mixedFormats', e.target.checked)}
          />{' '}
          Include at least one artist and one podcast
        </label>
      </div>
      <div className="section-heading spaced">
        <div>
          <h2>Two groups to connect</h2>
          <p>
            Use taste references as hypotheses about your audience. They aren’t measured customer
            profiles.
          </p>
        </div>
      </div>
      <div className="group-grid">
        {brief.segments.map((s, i) => (
          <section className={`audience audience-${s.id}`} key={s.id}>
            <span className="audience-role">
              {s.id === 'core' ? 'Your existing audience' : 'An adjacent audience'}
            </span>
            <label>
              Group name
              <input
                required
                value={s.name}
                maxLength={200}
                onChange={(e) => setGroup(i, { name: e.target.value })}
              />
            </label>
            <p className="hint">
              Choose up to four brands, artists or cultural references this group might enjoy.
            </p>
            <div className="seed-list">
              {s.seeds.map((seed) => (
                <span className="seed" key={seed.entityId}>
                  {seed.name}
                  <button
                    type="button"
                    aria-label={`Remove ${seed.name}`}
                    onClick={() =>
                      setGroup(i, { seeds: s.seeds.filter((e) => e.entityId !== seed.entityId) })
                    }
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            {s.seeds.length < 4 && (
              <EntityFinder
                w={w}
                choose={(entity) => {
                  if (!s.seeds.some((e) => e.entityId === entity.entityId))
                    setGroup(i, { seeds: [...s.seeds, entity] });
                }}
              />
            )}
          </section>
        ))}
      </div>
      <div className="form-footer">
        <p className="hint">
          Saving changed references makes previous cultural comparisons out of date.
        </p>
        <button className="primary" type="submit">
          Save brief
        </button>
      </div>
    </form>
  );
}
function OfferEditor({
  c,
  currency,
  save,
  cancel,
}: {
  c: Candidate;
  currency: string;
  save: (offer: Offer) => void;
  cancel: () => void;
}) {
  const [offer, setOffer] = useState(c.offer);
  const set = <K extends keyof Offer>(k: K, v: Offer[K]) => setOffer((o) => ({ ...o, [k]: v }));
  return (
    <form
      className="offer-editor"
      onSubmit={(e) => {
        e.preventDefault();
        save(offer);
      }}
    >
      <div className="form-grid">
        <label>
          Partner cost ({currency})
          <input
            type="number"
            min={0}
            max={1_000_000_000}
            step={1}
            value={offer.amount ?? ''}
            placeholder="Unknown"
            onChange={(e) => set('amount', e.target.value === '' ? null : Number(e.target.value))}
          />
          <small>Include fees and taxes. Leave blank if unknown.</small>
        </label>
        <label>
          Cost basis
          <select
            value={offer.basis}
            onChange={(e) => set('basis', e.target.value as Offer['basis'])}
          >
            <option value="estimate">My estimate</option>
            <option value="quote">Quoted offer</option>
          </select>
        </label>
        <label className="full">
          Quote or estimate source
          <input
            maxLength={500}
            required={offer.basis === 'quote'}
            value={offer.source}
            placeholder="e.g. Agent’s email, 20 October"
            onChange={(e) => set('source', e.target.value)}
          />
        </label>
        <label className="full">
          Agreed or proposed deliverables
          <textarea
            maxLength={1000}
            rows={2}
            value={offer.deliverables}
            placeholder="Content, dates, usage rights and delivery expectations"
            onChange={(e) => set('deliverables', e.target.value)}
          />
        </label>
        <label>
          Availability
          <select
            value={offer.availability}
            onChange={(e) => set('availability', e.target.value as Offer['availability'])}
          >
            <option value="unknown">Not confirmed</option>
            <option value="available">Confirmed available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>
        <label>
          Exclusivity group
          <input
            maxLength={200}
            value={offer.conflictGroup}
            onChange={(e) => set('conflictGroup', e.target.value)}
            placeholder="Optional, e.g. agency A"
          />
          <small>Partners with the same group cannot share a package.</small>
        </label>
        <label>
          Available from
          <input
            type="date"
            required={offer.availability === 'available'}
            value={offer.from}
            onChange={(e) => set('from', e.target.value)}
          />
        </label>
        <label>
          Available through
          <input
            type="date"
            required={offer.availability === 'available'}
            min={offer.from}
            value={offer.until}
            onChange={(e) => set('until', e.target.value)}
          />
        </label>
      </div>
      <div className="button-row">
        <button type="submit" className="primary">
          Save offer & recalculate
        </button>
        <button type="button" className="quiet" onClick={cancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
export function PartnerIcon({ kind }: { kind: Candidate['kind'] }) {
  return (
    <span className={`partner-icon ${kind}`}>
      {kind === 'artist' ? <Music2 size={20} /> : <Mic2 size={20} />}
    </span>
  );
}
export function Roster({
  w,
  mutate,
  editId,
  setEditId,
  discover,
}: {
  w: WorkspaceView;
  mutate: Mutate;
  editId: string | null;
  setEditId: (id: string | null) => void;
  discover: () => void;
}) {
  const [adding, setAdding] = useState(false),
    [name, setName] = useState(''),
    [kind, setKind] = useState<'artist' | 'podcast'>('artist');
  async function add(entity?: Entity) {
    if (
      await mutate('/candidates', {
        name: entity?.name ?? name,
        kind,
        ...(entity ? { entity } : {}),
      })
    ) {
      setName('');
      setAdding(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void add();
  }
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>
            The partner shortlist <span className="count">{w.candidates.length}</span>
          </h2>
          <p>Keep commercial facts beside each cultural candidate.</p>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={() => setAdding(!adding)}>
            <Plus size={16} /> Add partner
          </button>
          <button
            className="primary"
            onClick={discover}
            disabled={w.demo || w.provider !== 'configured'}
          >
            Discover with Qloo
          </button>
        </div>
      </div>
      {adding && (
        <section className="add-partner">
          <div className="section-heading">
            <h3>Add an artist or podcast</h3>
            <button
              className="icon-button"
              aria-label="Close add partner"
              onClick={() => setAdding(false)}
            >
              <X size={18} />
            </button>
          </div>
          <label>
            Partner type
            <select value={kind} onChange={(e) => setKind(e.target.value as 'artist' | 'podcast')}>
              <option value="artist">Artist</option>
              <option value="podcast">Podcast</option>
            </select>
          </label>
          <EntityFinder key={kind} w={w} kind={kind} choose={(e) => void add(e)} />
          <form className="manual-add" onSubmit={submit}>
            <label>
              Or add a partner by name
              <input
                required
                value={name}
                maxLength={200}
                onChange={(e) => setName(e.target.value)}
                placeholder="Partner’s name"
              />
            </label>
            <button className="secondary" type="submit">
              Add manually
            </button>
          </form>
          <p className="hint">
            Manual entries have no Qloo link. Cultural package ranking requires complete evidence
            for the shortlist.
          </p>
        </section>
      )}
      {!w.candidates.length && (
        <div className="empty">
          <div className="empty-mix">
            <PartnerIcon kind="artist" />
            <span>+</span>
            <PartnerIcon kind="podcast" />
          </div>
          <h3>A good mix starts with possibilities.</h3>
          <p>
            Save your audience references, discover candidates, then add the offers you want to
            compare.
          </p>
        </div>
      )}
      <div className="roster">
        {w.candidates.map((c) => {
          const blocked = w.planning.excluded.find((e) => e.id === c.id);
          return (
            <article key={c.id} className={`partner-row ${c.excluded ? 'is-excluded' : ''}`}>
              <div className="partner-summary">
                <PartnerIcon kind={c.kind} />
                <div className="partner-info">
                  <h3>
                    {c.name} {c.locked && <LockKeyhole size={14} aria-label="Locked" />}
                  </h3>
                  <p>
                    {c.kind === 'artist' ? 'Artist' : 'Podcast'} ·{' '}
                    {c.source === 'sample'
                      ? 'Fictional partner'
                      : c.source === 'qloo'
                        ? 'Qloo-linked entity'
                        : 'Manually entered'}
                  </p>
                </div>
                <div className="partner-price">
                  <strong>
                    {c.offer.amount === null
                      ? 'Cost unknown'
                      : money(c.offer.amount, w.brief.currency)}
                  </strong>
                  <span>{c.offer.basis === 'quote' ? 'Entered quote' : 'Estimate'}</span>
                </div>
              </div>
              {c.offer.deliverables && <p className="deliverables">{c.offer.deliverables}</p>}
              {blocked && <p className="form-error">{blocked.reason}</p>}
              <div className="partner-actions">
                <button
                  className="text-button"
                  onClick={() => setEditId(editId === c.id ? null : c.id)}
                >
                  {editId === c.id ? 'Close offer' : 'Edit offer'}
                </button>
                <button
                  className="text-button"
                  onClick={() => void mutate(`/candidates/${c.id}`, { locked: !c.locked }, 'PATCH')}
                >
                  {c.locked ? <UnlockKeyhole size={14} /> : <LockKeyhole size={14} />}{' '}
                  {c.locked ? 'Unlock' : 'Keep in every mix'}
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    void mutate(`/candidates/${c.id}`, { excluded: !c.excluded }, 'PATCH')
                  }
                >
                  {c.excluded ? 'Include again' : 'Exclude'}
                </button>
                <button
                  className="icon-button remove"
                  aria-label={`Remove ${c.name}`}
                  disabled={c.locked}
                  onClick={() => void mutate(`/candidates/${c.id}`, {}, 'DELETE')}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              {!w.demo && (
                <details className="link-partner">
                  <summary>
                    {c.entityId ? 'Review or change Qloo link' : 'Link this partner in Qloo'}
                  </summary>
                  {c.entityId && <p className="hint">Current entity: {c.name}</p>}
                  <EntityFinder
                    w={w}
                    kind={c.kind}
                    choose={(entity) => void mutate(`/candidates/${c.id}`, { entity }, 'PATCH')}
                  />
                  <p className="hint">
                    Confirm the identity carefully. Entered offers remain attached to this partner.
                  </p>
                </details>
              )}
              {editId === c.id && (
                <OfferEditor
                  key={`${c.id}:${w.version}`}
                  c={c}
                  currency={w.brief.currency}
                  cancel={() => setEditId(null)}
                  save={async (offer) => {
                    if (await mutate(`/candidates/${c.id}`, { offer }, 'PATCH')) setEditId(null);
                  }}
                />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
