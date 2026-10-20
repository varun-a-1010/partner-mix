import { useEffect, useState } from 'react';
import { AudioLines, Layers3, ListChecks, FileText, NotebookPen, Plus, X } from 'lucide-react';
import type { WorkspaceView } from '../shared/model';
import { money } from '../shared/model';
import { api, ApiError } from './api';
import { BriefEditor, Roster } from './forms';
import { ComparisonBoard, Decision } from './views';

type Tab = 'brief' | 'partners' | 'packages' | 'decision';
const tabs: { id: Tab; label: string; Icon: typeof Layers3 }[] = [
  { id: 'brief', label: 'Campaign brief', Icon: NotebookPen },
  { id: 'partners', label: 'Partners & offers', Icon: ListChecks },
  { id: 'packages', label: 'Compare mixes', Icon: Layers3 },
  { id: 'decision', label: 'Decision brief', Icon: FileText },
];
type Recent = { id: string; name: string };
function recents(): Recent[] {
  try {
    return JSON.parse(localStorage.getItem('partner-mix-campaigns') ?? '[]');
  } catch {
    return [];
  }
}
export function App() {
  const [w, setW] = useState<WorkspaceView | null>(null),
    [tab, setTab] = useState<Tab>('brief');
  const [recent, setRecent] = useState<Recent[]>(recents),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(''),
    [editId, setEditId] = useState<string | null>(null);
  function remember(next: WorkspaceView) {
    setW(next);
    const entries = [
      { id: next.id, name: next.brief.campaign },
      ...recents().filter((r) => r.id !== next.id),
    ].slice(0, 12);
    try {
      localStorage.setItem('partner-mix-campaigns', JSON.stringify(entries));
    } catch {
      /* Browser storage is optional. */
    }
    setRecent(entries);
    history.replaceState(null, '', `?campaign=${next.id}`);
  }
  async function open(id: string) {
    setBusy('Opening campaign…');
    setError('');
    try {
      remember(await api<WorkspaceView>(`/w/${encodeURIComponent(id)}`));
      setEditId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('campaign');
    if (id) void open(id);
    // Initial navigation is read-only. Each campaign is scoped to an HttpOnly cookie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function create(demo: boolean) {
    setBusy('Creating campaign…');
    setError('');
    setNotice('');
    try {
      remember(await api<WorkspaceView>('/workspaces', { demo }));
      setTab(demo ? 'packages' : 'brief');
      setEditId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  async function mutate(path: string, body: Record<string, unknown>, method?: string) {
    if (!w) return false;
    setBusy(
      path === '/compare'
        ? 'Comparing cultural evidence and preparing packages…'
        : 'Saving campaign…',
    );
    setError('');
    setNotice('');
    try {
      const next = await api<WorkspaceView>(
        `/w/${w.id}${path}`,
        { ...body, version: w.version },
        method,
      );
      remember(next);
      setNotice(
        path === '/select'
          ? 'Decision saved. Open the decision brief to review or export it.'
          : path === '/compare'
            ? 'Comparison saved. Add or update offers to see feasible packages.'
            : 'Saved. Package options now use the updated inputs.',
      );
      return true;
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.status === 409) {
        try {
          remember(await api<WorkspaceView>(`/w/${w.id}`));
        } catch {
          /* Keep original actionable error. */
        }
      }
      return false;
    } finally {
      setBusy('');
    }
  }
  const edit = (id: string) => {
    setEditId(id);
    setTab('partners');
  };
  async function compare(discover: boolean) {
    if (await mutate('/compare', { discover })) setTab(discover ? 'partners' : 'packages');
  }
  const brand = (
    <a
      className="wordmark"
      href="/"
      onClick={(e) => {
        e.preventDefault();
        setW(null);
        history.replaceState(null, '', '/');
      }}
    >
      <span className="brand-symbol">
        <AudioLines size={23} />
      </span>
      partner mix<span className="beta">preview</span>
    </a>
  );
  if (!w)
    return (
      <div className="welcome-page">
        <header>
          {brand}
          <span className="local-note">A campaign planning studio</span>
        </header>
        {error && (
          <div className="notice warning" role="alert">
            {error}
          </div>
        )}
        <main className="welcome-grid">
          <section className="welcome-copy">
            <h1>
              Find the mix.
              <br />
              Make the case.
            </h1>
            <p>
              Bring artists and podcasts into one campaign. Compare cultural fit, work within real
              constraints, and keep the unanswered questions in view.
            </p>
            <div className="welcome-actions">
              <button
                className="primary large"
                disabled={!!busy}
                onClick={() => void create(false)}
              >
                Plan a campaign
              </button>
              <button className="text-button" disabled={!!busy} onClick={() => void create(true)}>
                Explore the sample campaign
              </button>
            </div>
            {busy && <p role="status">{busy}</p>}
            {!!recent.length && (
              <section className="recent-campaigns">
                <h2>Continue a campaign</h2>
                {recent.map((r) => (
                  <button
                    disabled={!!busy}
                    className="recent-link"
                    key={r.id}
                    onClick={() => void open(r.id)}
                  >
                    <span>{r.name}</span>
                    <span>Open</span>
                  </button>
                ))}
              </section>
            )}
            <p className="hint">
              Campaign access stays in this browser. Sample partners, quotes and rankings are
              fictional.
            </p>
          </section>
          <section className="welcome-board" aria-label="Illustrative campaign mix">
            <div className="board-top">
              <span>Fieldwork / launch campaign</span>
              <span>Sample</span>
            </div>
            <h2>
              A familiar voice.
              <br />A different perspective.
            </h2>
            <div className="record-shape">
              <div />
              <div />
              <span>
                Two partners.
                <br />
                One considered campaign.
              </span>
            </div>
            <div className="example-slot">
              <span className="example-type">Podcast</span>
              <strong>Trail Notes</strong>
              <span>Anchor the outdoor story</span>
            </div>
            <div className="example-slot music">
              <span className="example-type">Artist</span>
              <strong>Low Tide Assembly</strong>
              <span>Open a door into music</span>
            </div>
            <p>Illustration only. No actual offers or audience claims.</p>
          </section>
        </main>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        {brand}
        <div className="campaign-label">
          <span>{w.demo ? 'Sample campaign' : 'Your campaign'}</span>
          <strong>{w.brief.brand}</strong>
        </div>
        <nav aria-label="Campaign sections">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              disabled={!!busy}
              className={tab === id ? 'active' : ''}
              onClick={() => {
                setTab(id);
                setNotice('');
              }}
              aria-current={tab === id ? 'page' : undefined}
            >
              <Icon size={18} />
              {label}
              {id === 'partners' && <span className="nav-count">{w.candidates.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className={`connection ${w.provider}`}>
            <i />
            {w.provider === 'configured' ? 'Qloo configured' : 'Qloo not connected'}
          </span>
          <p>Private campaign workspace. You decide what leaves it.</p>
          <button className="sidebar-new" disabled={!!busy} onClick={() => void create(false)}>
            <Plus size={16} /> New campaign
          </button>
          <button
            className="sidebar-new"
            disabled={!!busy}
            onClick={() => {
              setW(null);
              history.replaceState(null, '', '/');
            }}
          >
            All campaigns
          </button>
        </div>
      </aside>
      <main className="main-workspace">
        <header className="campaign-header">
          <div>
            <span className="brand-name">{w.brief.brand}</span>
            <h1>{w.brief.campaign}</h1>
          </div>
          <div className="header-budget">
            <span>Campaign budget</span>
            <strong>{money(w.brief.budget, w.brief.currency)}</strong>
            <small>{w.brief.reservePercent}% kept in reserve</small>
          </div>
        </header>
        {w.demo && (
          <div className="sample-banner">
            <strong>Fictional sample</strong>
            <span>Every partner, quote and cultural rank in this campaign is illustrative.</span>
            <button disabled={!!busy} className="text-button" onClick={() => void create(false)}>
              Start your own
            </button>
          </div>
        )}
        {error && (
          <div className="notice warning" role="alert">
            {error}
            <button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}>
              <X size={17} />
            </button>
          </div>
        )}
        {notice && (
          <div className="notice success" role="status">
            {notice}
            <button
              className="icon-button"
              aria-label="Dismiss message"
              onClick={() => setNotice('')}
            >
              <X size={17} />
            </button>
          </div>
        )}
        {busy && (
          <div className="busy-strip" role="status">
            <span className="busy-dot" />
            {busy}
          </div>
        )}
        <fieldset className="workspace-content" disabled={!!busy}>
          {tab === 'brief' && <BriefEditor key={`${w.id}:${w.version}`} w={w} mutate={mutate} />}
          {tab === 'partners' && (
            <Roster
              w={w}
              mutate={mutate}
              editId={editId}
              setEditId={setEditId}
              discover={() => void compare(true)}
            />
          )}
          {tab === 'packages' && (
            <ComparisonBoard
              w={w}
              mutate={mutate}
              edit={edit}
              compare={() => void compare(false)}
              openBrief={() => setTab('brief')}
            />
          )}
          {tab === 'decision' && (
            <Decision w={w} showPackages={() => setTab('packages')} edit={edit} />
          )}
        </fieldset>
        <footer className="workspace-footer">
          Cultural association informs the plan. Quotes, availability and results need their own
          evidence.
        </footer>
      </main>
    </div>
  );
}
