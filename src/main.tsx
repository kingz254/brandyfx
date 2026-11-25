import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme.css';

type Market = { symbol: string; name: string; quote: string; points: string[]; updated: string; live: boolean };
type Signal = { id: number; symbol: string; family: string; label: string; digit: number | null; issued: string; expires: string };
type Offer = { amount: string; currency: string; days: number; instructions: string };
type Payment = { id: string; status: string; created: string; expires?: string; revoked_at?: string };
type Order = Payment & { account_id: string; reference: string; amount: string; currency: string; days: number };
type Member = { ready?: boolean; launched?: boolean; account?: string; accounts?: string[]; admin?: boolean; passUntil?: string; payment?: Payment; offer?: Offer };
const families = [['trend', 'Rise / Fall'], ['range', 'Over 6 / Under 3'], ['digit', 'Matches / Differs']] as const;
const preview = import.meta.env.DEV && new URLSearchParams(location.search).has('preview');
const stamp = (date: string) => new Date(date).toLocaleTimeString([], { hour12: false });
const dateLabel = (date: string) => new Date(date).toLocaleString();
const name = (market: Market) => market.name.replace('Volatility ', 'Vol ').replace(' Index', '');
const until = (offset: number) => new Date(Date.now() + offset).toISOString();
const fixtureMarkets: Market[] = ['10', '25', '50', '75', '100'].map((index, market) => {
  const points = Array.from({ length: 64 }, (_, i) =>
    (1234 + market * 42 + i * 0.36 + Math.sin(i * 0.45) * 4 + Math.cos(i * 1.64) * 1.7).toFixed(2));
  return { symbol: 'R_' + index, name: 'Volatility ' + index + ' Index', quote: points.at(-1)!, points, updated: until(0), live: true };
});
const fixtureSignals: Signal[] = [
  ['trend', 'Rise', null], ['range', 'Over 6', 6], ['digit', 'Matches', 4],
  ['trend', 'Fall', null], ['trend', 'Rise', null], ['trend', 'Fall', null],
].map(([family, label, digit], i) => ({
  id: i + 1, symbol: 'R_50', family: String(family), label: String(label), digit: digit as number | null,
  issued: until(-i * 72000), expires: until(i < 3 ? 3600000 : -i * 72000 + 30000),
}));

async function api<T>(path: string, value?: object): Promise<T> {
  const response = await fetch('/api/' + path, value === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Please try again.');
  return data;
}

function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>(preview ? fixtureMarkets : []);
  useEffect(() => {
    if (preview) return;
    let done = false;
    let timer: number;
    async function poll() {
      try {
        const data = await api<Market[]>('markets');
        if (!done) setMarkets(data);
      } catch {
        if (!done) setMarkets(current => current.map(market => ({ ...market, live: false })));
      } finally {
        if (!done) timer = window.setTimeout(poll, 2000);
      }
    }
    void poll();
    return () => { done = true; clearTimeout(timer); };
  }, []);
  return markets;
}

function Mark() {
  return <span className="mark" aria-hidden="true"><i /><i /><i /></span>;
}

function Ribbon({ markets }: { markets: Market[] }) {
  return <div className="ribbon"><span className="ribbon-label">{preview ? 'Sample prices' : 'Market prices'}</span>
    <div className="ribbon-items" role="region" aria-label={preview ? 'Sample market quotes' : 'Live market quotes'} tabIndex={markets.length ? 0 : undefined}>{markets.length ? markets.map(market => <span key={market.symbol}>
      {name(market)} <strong key={market.quote}>{market.quote || '–'}</strong>{!market.live && <small>Stale</small>}
    </span>) : <span>Waiting for market data</span>}</div>
  </div>;
}

function Chart({ points }: { points: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const chart = canvas;
    const ctx = context;
    function draw() {
      const { width, height } = chart.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      chart.width = Math.round(width * ratio);
      chart.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const style = getComputedStyle(chart);
      const ink = style.getPropertyValue('--line').trim();
      const copper = style.getPropertyValue('--copper').trim();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      for (let y = 18; y < height; y += (height - 20) / 4) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
      if (points.length < 2) return;
      const values = points.map(Number);
      const low = Math.min(...values);
      const range = Math.max(...values) - low || 1;
      const coordinates = values.map((value, i) => [
        3 + i * (width - 10) / (values.length - 1), height - 19 - (value - low) * (height - 36) / range,
      ]);
      ctx.beginPath();
      coordinates.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.strokeStyle = copper; ctx.lineWidth = 2; ctx.stroke();
      const [x, y] = coordinates.at(-1)!;
      ctx.lineTo(x, height); ctx.lineTo(3, height); ctx.closePath();
      const fill = ctx.createLinearGradient(0, 0, 0, height);
      fill.addColorStop(0, style.getPropertyValue('--chart-fill').trim());
      fill.addColorStop(1, style.getPropertyValue('--chart-clear').trim());
      ctx.fillStyle = fill; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = copper; ctx.fill();
    }
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [points]);
  return <canvas ref={ref} role="img" aria-label={points.length ? 'Recent market price movement' : 'Market chart waiting for ticks'} />;
}

function Desk({ markets, signals, connected }: { markets: Market[]; signals: Signal[]; connected: boolean }) {
  const [selected, select] = useState('R_50');
  const [family, setFamily] = useState<string>('trend');
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const market = markets.find(item => item.symbol === selected) || markets[0];
  const feed = signals.filter(item => item.symbol === market?.symbol && item.family === family);
  const live = connected && market?.live;
  const signal = live ? feed.find(item => +new Date(item.expires) > clock) : undefined;
  return <main className="desk">
    <aside className="rail" aria-label="Markets"><h2>Markets</h2>
      {markets.map(item => <button key={item.symbol} title={item.symbol} aria-pressed={item.symbol === market?.symbol} onClick={() => select(item.symbol)}>
        <span className="market-glyph" aria-hidden="true">{item.symbol.match(/\d+/)?.[0] ?? '∿'}</span>
        <span className="market-name">{name(item)}</span>
      </button>)}
      {!markets.length && <p>Waiting for markets.</p>}
    </aside>
    <section className="desk-main">
      <div className="desk-heading"><div><h1>Signals desk</h1><p>{market?.name || 'Market feed'}</p></div>
        <span className={live ? 'status live' : 'status'}>{preview ? 'Sample feed' : live ? 'Feed live' : 'Reconnecting'}</span></div>
      <div className="tabs" aria-label="Signal family">{families.map(([id, label]) => <button key={id}
        aria-pressed={family === id} onClick={() => setFamily(id)}>{label}</button>)}</div>
      <div className="desk-panels">
        <div className="active" aria-live="polite">
          <div className="signal-content" key={signal?.id ?? family}>
            <div><p>Current signal</p><h2>{signal ? signal.label : live ? 'Watching for a setup' : 'Waiting for fresh ticks'}</h2></div>
            {signal && <div className="signal-time"><strong aria-hidden="true">{signal.digit ?? (signal.label === 'Rise' ? '↑' : '↓')}</strong><small>Expires {stamp(signal.expires)}</small></div>}
          </div>
        </div>
        <div className="chart-panel"><div><h2>Price movement</h2><strong key={market?.quote}>{market?.quote || '–'}</strong></div>
          <Chart points={market?.points || []} />
          <div className="chart-caption"><span>Recent ticks</span><span>{market?.updated ? stamp(market.updated) : 'Waiting for data'}</span></div>
        </div>
        <aside className="history"><h2>Signal history</h2>
          {feed.length ? <ol>{feed.map(item => <li key={item.id}><span>{item.label}{item.digit !== null && item.family === 'digit' ? ' ' + item.digit : ''}
            <small>{stamp(item.issued)}</small></span><span className="history-state">{+new Date(item.expires) <= clock ? 'Expired' : 'Open'}</span></li>)}</ol>
            : <p>Signals for this market and family will appear here.</p>}
        </aside>
      </div>
    </section>
  </main>;
}

function Access({ member, run }: { member: Member; run: (path: string, data?: object) => Promise<boolean> }) {
  const [reference, setReference] = useState('');
  const payment = member.payment;
  const offer = member.offer;
  const status = member.passUntil ? 'Pass active' : payment?.revoked_at ? 'Pass revoked' :
    payment?.status === 'pending' ? 'Approval pending' : payment?.status === 'approved' ? 'Pass expired' :
      payment?.status === 'declined' ? 'Request declined' : 'Deriv connected';
  return <main className="access layout">
    <div><p className="status">{status}</p><h1>Get desk access</h1><p>Submit your payment reference for review.</p></div>
    <section className="access-panel">
      {!member.launched || !offer ? <><h2>Paid access is opening soon</h2><p>Payment instructions will appear here when passes go on sale.</p></>
        : <><h2>{offer.currency} {offer.amount} <small>for {offer.days} {offer.days === 1 ? 'day' : 'days'}</small></h2>
          {payment?.status === 'pending' ? <p>Your payment reference is being reviewed. This page updates when the review is complete.</p>
            : <><p className="instructions">{offer.instructions}</p><form onSubmit={async event => {
              event.preventDefault();
              if (await run('payment', { reference })) setReference('');
            }}><label>Payment reference<input value={reference} onChange={event => setReference(event.target.value)} minLength={5} maxLength={80} required /></label>
              <button className="primary">Submit for review</button></form></>}
        </>}
    </section>
  </main>;
}

function Admin({ member, run }: { member: Member; run: (path: string, data?: object) => Promise<boolean> }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadError, setLoadError] = useState('');
  async function load() {
    try {
      setOrders(await api<Order[]>('admin/payments'));
      setLoadError('');
    } catch (cause) {
      setLoadError((cause as Error).message);
    }
  }
  useEffect(() => { void load(); }, []);
  async function settings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await run('admin/offer', { ...data, days: Number(data.days), currency: String(data.currency).toUpperCase() });
  }
  return <main className="admin layout">
    <h1>Payment review</h1>
    <section className="access-panel"><h2>Pass offer</h2><form onSubmit={settings}>
      <div className="offer-fields"><label>Fee<input name="amount" inputMode="decimal" defaultValue={member.offer?.amount} required /></label>
        <label>Currency<input name="currency" maxLength={3} defaultValue={member.offer?.currency} required /></label>
        <label>Duration in days<input name="days" type="number" min={1} max={365} defaultValue={member.offer?.days} required /></label></div>
      <label>Payment instructions<textarea name="instructions" defaultValue={member.offer?.instructions} maxLength={2000} required /></label>
      <button className="primary">Save offer</button>
    </form></section>
    <section className="access-panel"><div className="section-heading"><h2>Requests</h2><button className="quiet" onClick={load}>Refresh</button></div>
      {loadError && <p role="alert">{loadError}</p>}
      {!loadError && !orders.length && <p>No payment requests yet.</p>}
      <ul className="orders">{orders.map(order => <li key={order.id}>
        <div><strong>{order.reference}</strong><p>{order.account_id} · {order.currency} {order.amount} · {order.days} days</p>
          <small>{order.revoked_at ? 'Revoked' : order.status}{order.expires ? ' / ' + dateLabel(order.expires) : ''}</small></div>
        <form onSubmit={async event => {
          event.preventDefault();
          const button = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (!button) return;
          const days = Number(new FormData(event.currentTarget).get('days'));
          if (await run('admin/payment', { paymentId: order.id, action: button.value, days })) await load();
        }}>
          {order.status === 'pending' && <><button className="primary" value="approve">Approve</button><button className="quiet" value="decline">Decline</button></>}
          {order.status === 'approved' && !order.revoked_at && <><label>Days to add<input name="days" type="number" min={1} max={365} defaultValue={1} required /></label>
            <button className="quiet" value="extend">Extend</button><button className="quiet" value="revoke" formNoValidate>Revoke</button></>}
        </form>
      </li>)}</ul>
    </section>
  </main>;
}

const loginMessage: Record<string, string> = {
  setup: 'Deriv sign-in is awaiting setup.', invalid: 'This sign-in link expired. Please start again.',
  denied: 'Deriv sign-in was canceled.', failed: 'Deriv sign-in is temporarily unavailable.',
  account: 'No active Deriv Options account was found.',
};

function App() {
  const markets = useMarkets();
  const [member, setMember] = useState<Member>({});
  const [loaded, setLoaded] = useState(preview);
  const [tab, setTab] = useState('desk');
  const [signals, setSignals] = useState<Signal[]>([]);
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState(loginMessage[new URLSearchParams(location.search).get('login') || ''] || '');
  const canView = Boolean(member.account && (member.admin || (member.launched && member.passUntil)));
  async function refresh() {
    try {
      setMember(await api<Member>('me'));
    } catch {
      setNotice('The service is temporarily unavailable.');
    } finally {
      setLoaded(true);
    }
  }
  useEffect(() => {
    if (preview) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!canView || tab !== 'desk') return;
    const events = new EventSource('/api/stream');
    events.onopen = () => setConnected(true);
    events.onmessage = event => setSignals(JSON.parse(event.data));
    events.onerror = () => { setConnected(false); setSignals([]); };
    events.addEventListener('locked', () => {
      events.close(); setSignals([]); setConnected(false); void refresh();
    });
    return () => { events.close(); setSignals([]); setConnected(false); };
  }, [canView, tab, member.account]);
  async function run(path: string, data = {}) {
    if (pending) return false;
    setPending(true);
    setNotice('');
    try {
      await api(path, data);
      if (path === 'logout') { setMember({}); setSignals([]); setTab('desk'); }
      await refresh();
      return true;
    } catch (cause) {
      setNotice((cause as Error).message);
      return false;
    } finally {
      setPending(false);
    }
  }
  const showingDesk = preview || (canView && tab === 'desk');
  let page: ReactNode;
  if (!loaded) page = <main className="layout loading" role="status">Opening BrandyFx…</main>;
  else if (showingDesk) page = <Desk markets={markets} signals={preview ? fixtureSignals : signals} connected={preview || connected} />;
  else if (member.admin && tab === 'admin') page = <Admin member={member} run={run} />;
  else if (member.account) page = <Access member={member} run={run} />;
  else if (member.accounts?.length) page = <main className="layout access"><div><h1>Choose an account</h1>
    <p>Use the same Deriv account each time to keep your pass.</p></div><section className="access-panel account-list">
      {member.accounts.map(account => <button className="quiet" key={account} disabled={pending} onClick={() => void run('account', { account })}>{account}</button>)}
    </section></main>;
  else page = <main className="welcome layout">
    <div className="welcome-copy"><h1>BrandyFx</h1><p>Live Deriv signals for price moves and last digits.</p>
      <a className="primary" href="/api/deriv/start">Continue with Deriv <span aria-hidden="true">↗</span></a>
      {import.meta.env.DEV && <a className="preview-link" href="/?preview">Open desk preview</a>}
    </div>
    <section className="welcome-market" aria-label="Market preview">
      <div className="section-heading"><h2>{markets[0]?.name || 'Deriv market feed'}</h2><span className="status">{markets[0]?.live ? 'Live' : 'Awaiting ticks'}</span></div>
      {markets[0]?.points.length ? <>
        <div className="big-quote" key={markets[0].quote}>{markets[0].quote}</div>
        <Chart points={markets[0].points} />
        <div className="market-bottom"><span>Recent ticks</span><span>{stamp(markets[0].updated)}</span></div>
      </> : <p className="market-wait">Live quotes will appear when the feed connects.</p>}
    </section>
  </main>;
  return <><header className="top"><a className="wordmark" href="/"><Mark />BrandyFx</a>
    <nav aria-label="Main navigation">
      {preview && <a className="quiet" href="/">Exit preview</a>}
      {member.admin && <><button className="quiet" aria-pressed={tab === 'desk'} onClick={() => setTab('desk')}>Desk</button>
        <button className="quiet" aria-pressed={tab === 'admin'} onClick={() => setTab('admin')}>Admin</button></>}
      {(member.account || member.accounts?.length) ? <button className="quiet" disabled={pending} onClick={() => void run('logout')}>Sign out</button> : null}
    </nav>
  </header><Ribbon markets={markets} />
    {notice && <p className="notice layout" role="alert">{notice}</p>}{page}
    <footer className="layout"><span>BrandyFx</span><span>{preview ? 'Design preview with sample data' : 'Signals for Deriv Options'}</span></footer>
  </>;
}

createRoot(document.getElementById('root')!).render(<App />);
