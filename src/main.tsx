import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import Landing, { PublicSettings } from './landing';
import './theme.css';

type Market = { symbol: string; name: string; quote: string; points: string[]; updated: string; live: boolean };
type Signal = { id: number; symbol: string; family: string; label: string; digit: number | null; issued: string; expires: string };
type Offer = { amount: string; currency: string; days: number; instructions: string };
type Payment = { id: string; status: string; created: string; expires?: string; revoked_at?: string };
type Order = Payment & { account_id: string; reference: string; amount: string; currency: string; days: number; package: string };
type Member = { ready?: boolean; launched?: boolean; account?: string; accounts?: string[]; admin?: boolean; passUntil?: string; payment?: Payment; offer?: Offer };
const derivDisclaimer = 'Deriv offers complex derivatives, such as options and contracts for difference (“CFDs”). These products may not be suitable for all clients, and trading them puts you at risk. Please make sure that you understand the following risks before trading Deriv products: a) you may lose some or all of the money you invest in the trade, b) if your trade involves currency conversion, exchange rates will affect your profit and loss. You should never trade with borrowed money or with money that you cannot afford to lose.';
const families = [['trend', 'Rise / Fall'], ['range', 'Over 6 / Under 3'], ['digit', 'Matches / Differs']] as const;
const route = new URLSearchParams(location.search);
const preview = route.has('preview');
const home = route.has('home');
const adminRoute = location.pathname === '/kingz.html';
const stamp = (date: string) => new Date(date).toLocaleTimeString([], { hour12: false });
const dateLabel = (date: string) => new Date(date).toLocaleString();
const name = (market: Market) => market.name.replace('Volatility ', 'Vol ').replace(' Index', '');
const until = (offset: number) => new Date(Date.now() + offset).toISOString();
const defaultSettings: PublicSettings = {
  backgroundUrl: '/media/brandyfx-background.mp4', videoOpacity: .5, glassOpacity: .72,
  regularPrice: 300, premiumPrice: 450, regularOffer: 200, premiumOffer: 300,
  regularDays: 0, premiumDays: 0, offerActive: false, offerEndsAt: '',
  promoHeading: "Don't miss your chance", promoSubheading: 'Grants up to 20% off', trc20Wallet: '',
};
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
  const text = await response.text();
  let data: { error?: string };
  try { data = JSON.parse(text) as { error?: string }; }
  catch { throw new Error(`The API returned a non-JSON response (${response.status}). Check the server deployment.`); }
  if (!response.ok) throw new Error(data.error || 'Please try again.');
  return data as T;
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
  return <img className="mark" src="/brand/brandyfx-app-icon.png" alt="" />;
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
      const emerald = style.getPropertyValue('--emerald').trim();
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
      ctx.strokeStyle = emerald; ctx.lineWidth = 2; ctx.stroke();
      const [x, y] = coordinates.at(-1)!;
      ctx.lineTo(x, height); ctx.lineTo(3, height); ctx.closePath();
      const fill = ctx.createLinearGradient(0, 0, 0, height);
      fill.addColorStop(0, style.getPropertyValue('--chart-fill').trim());
      fill.addColorStop(1, style.getPropertyValue('--chart-clear').trim());
      ctx.fillStyle = fill; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = emerald; ctx.fill();
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

function Access({ member, run, settings }: { member: Member; run: (path: string, data?: object) => Promise<boolean>; settings: PublicSettings }) {
  const [reference, setReference] = useState('');
  const [tier, setTier] = useState<'regular' | 'premium'>('regular');
  const payment = member.payment;
  const amount = settings.offerActive ? (tier === 'premium' ? settings.premiumOffer : settings.regularOffer) : (tier === 'premium' ? settings.premiumPrice : settings.regularPrice);
  const days = tier === 'premium' ? settings.premiumDays : settings.regularDays;
  const status = member.passUntil ? 'Pass active' : payment?.revoked_at ? 'Pass revoked' :
    payment?.status === 'pending' ? 'Approval pending' : payment?.status === 'approved' ? 'Pass expired' :
      payment?.status === 'declined' ? 'Request declined' : 'Deriv connected';
  return <main className="access layout">
    <div><p className="status">{status}</p><h1>Get desk access</h1><p>Submit your payment reference for review.</p></div>
    <section className="access-panel">
      {!member.launched ? <><h2>Paid access is opening soon</h2><p>Payment instructions will appear here when passes go on sale.</p></>
        : <><div className="access-plan-switch" role="group" aria-label="Choose access plan"><button type="button" aria-pressed={tier === 'regular'} onClick={() => setTier('regular')}>Regular</button><button type="button" aria-pressed={tier === 'premium'} onClick={() => setTier('premium')}>Premium</button></div><h2>USD {amount.toFixed(2)} <small>{days ? `for ${days} ${days === 1 ? 'day' : 'days'}` : 'access term is being configured'}</small></h2>
          {payment?.status === 'pending' ? <p>Your payment reference is being reviewed. This page updates when the review is complete.</p>
            : <><p className="instructions">Send USDT using the TRON (TRC20) network to:<br/><strong>{settings.trc20Wallet || 'Wallet address will be published here before launch.'}</strong></p>{(!days || !settings.trc20Wallet) && <p>Payment instructions will be enabled when the access term and wallet address are configured.</p>}<form onSubmit={async event => {
              event.preventDefault();
              if (await run('payment', { reference, package: tier })) setReference('');
            }}><label>Payment reference<input value={reference} onChange={event => setReference(event.target.value)} minLength={5} maxLength={80} required /></label>
              <button className="primary" disabled={!days || !settings.trc20Wallet}>Submit for review</button></form></>}
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
        <div><strong>{order.reference}</strong><p>{order.account_id} · {order.package} · {order.currency} {order.amount} · {order.days} days</p>
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

function SiteAdmin({ settings, onSaved, run }: { settings: PublicSettings; onSaved: (value: PublicSettings) => void; run: (path: string, data?: object) => Promise<boolean> }) {
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <main className="site-admin layout">
    <header className="site-admin-heading"><div><h1>Site settings</h1><p>Adjust the public experience, access plans and payment destination.</p></div><a className="landing-secondary" href="/?home">View site ↗</a></header>
    <form className="site-settings-form" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setSaved(''); setError('');
      const raw = Object.fromEntries(new FormData(event.currentTarget));
      const payload = { ...raw, offerEndsAt: raw.offerEndsAt ? new Date(String(raw.offerEndsAt)).toISOString() : '', videoOpacity: Number(raw.videoOpacity), glassOpacity: Number(raw.glassOpacity), regularPrice: Number(raw.regularPrice), premiumPrice: Number(raw.premiumPrice), regularOffer: Number(raw.regularOffer), premiumOffer: Number(raw.premiumOffer), regularDays: Number(raw.regularDays), premiumDays: Number(raw.premiumDays), offerEnabled: raw.offerEnabled === 'on' };
      try { const result = await api<PublicSettings>('admin/site-settings', payload); onSaved(result); setSaved('Settings saved.'); }
      catch (cause) { setError((cause as Error).message); }
      finally { setBusy(false); }
    }}>
      <section className="admin-setting-panel"><p className="landing-kicker">Visual system</p><h2>Background & glass</h2>
        <label>Background media URL<input name="backgroundUrl" type="text" defaultValue={settings.backgroundUrl} placeholder="/media/background.mp4 or https://…" required/><small>Use a local /media/ path or an HTTPS URL. Video formats: MP4 or WebM.</small></label>
        <div className="admin-field-grid"><label>Video opacity <output>{Math.round(settings.videoOpacity * 100)}%</output><input name="videoOpacity" type="range" min="0.1" max="0.9" step="0.01" defaultValue={settings.videoOpacity} onInput={e => { const output = (e.currentTarget.previousElementSibling as HTMLOutputElement); if (output) output.value = `${Math.round(Number(e.currentTarget.value) * 100)}%`; }}/></label>
          <label>Glass opacity <output>{Math.round(settings.glassOpacity * 100)}%</output><input name="glassOpacity" type="range" min="0.1" max="0.9" step="0.01" defaultValue={settings.glassOpacity} onInput={e => { const output = (e.currentTarget.previousElementSibling as HTMLOutputElement); if (output) output.value = `${Math.round(Number(e.currentTarget.value) * 100)}%`; }}/></label></div>
      </section>
      <section className="admin-setting-panel"><p className="landing-kicker">Access plans</p><h2>Pricing & terms</h2><div className="admin-plan-grid">{(['regular', 'premium'] as const).map(tier => <fieldset key={tier}><legend>{tier === 'regular' ? 'Regular' : 'Premium'}</legend><label>Standard price (USD)<input name={`${tier}Price`} type="number" min="1" step="0.01" defaultValue={settings[`${tier}Price`]} required/></label><label>Offer price (USD)<input name={`${tier}Offer`} type="number" min="1" step="0.01" defaultValue={settings[`${tier}Offer`]} required/></label><label>Access days<input name={`${tier}Days`} type="number" min="0" max="365" defaultValue={settings[`${tier}Days`]} required/><small>Set 0 to leave the term unset until launch.</small></label></fieldset>)}</div>
        <label className="admin-check"><input name="offerEnabled" type="checkbox" defaultChecked={settings.offerActive}/> Enable launch offer</label>
        <div className="admin-field-grid"><label>Offer end date/time<input name="offerEndsAt" type="datetime-local" defaultValue={settings.offerEndsAt ? new Date(settings.offerEndsAt).toISOString().slice(0, 16) : ''}/></label><label>Promotion heading<input name="promoHeading" maxLength={90} defaultValue={settings.promoHeading} required/></label></div>
        <label>Promotion subheading<input name="promoSubheading" maxLength={140} defaultValue={settings.promoSubheading} required/></label>
      </section>
      <section className="admin-setting-panel"><p className="landing-kicker">Payments</p><h2>USDT · TRC20</h2><label>TRC20 wallet address<input name="trc20Wallet" autoComplete="off" defaultValue={settings.trc20Wallet} placeholder="T…"/><small>Shown publicly on the pricing page when configured. Card and M-Pesa remain marked coming soon.</small></label></section>
      {(error || saved) && <p className={error ? 'admin-message error' : 'admin-message'} role={error ? 'alert' : 'status'}>{error || saved}</p>}
      <div className="site-admin-actions"><button className="landing-primary" disabled={busy}>{busy ? 'Saving…' : 'Save site settings'}</button><button type="button" className="landing-secondary" onClick={() => void run('logout')}>Sign out</button></div>
    </form>
  </main>;
}

function AdminLogin({ pending, notice, run }: { pending: boolean; notice: string; run: (path: string, data?: object) => Promise<boolean> }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  return <main className="admin-gate"><img src="/brand/brandyfx-app-icon.png" alt=""/><h1>Admin sign in</h1><p>Enter your BrandyFx administrator credentials.</p>
    <form className="admin-login-form" onSubmit={async event => { event.preventDefault(); if (await run('admin/login', { name, password })) setPassword(''); }}>
      <label>Admin name<input value={name} onChange={event => setName(event.target.value)} autoComplete="username" required/></label>
      <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required/></label>
      {notice && <p className="admin-message error" role="alert">{notice}</p>}
      <button className="landing-primary" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form><a className="landing-secondary" href="/?home">Return to BrandyFx</a></main>;
}

const loginMessage: Record<string, string> = {
  setup: 'Deriv sign-in is awaiting setup.', invalid: 'This sign-in link expired. Please start again.',
  denied: 'Deriv sign-in was canceled.', failed: 'Deriv sign-in is temporarily unavailable.',
  account: 'No active Deriv Options account was found.',
};

function App() {
  const markets = useMarkets();
  const [settings, setSettings] = useState<PublicSettings>(defaultSettings);
  const [settingsReady, setSettingsReady] = useState(false);
  const [member, setMember] = useState<Member>({});
  const [loaded, setLoaded] = useState(preview || home);
  const [tab, setTab] = useState('desk');
  const [signals, setSignals] = useState<Signal[]>([]);
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState(false);
  const [tokenDialog, setTokenDialog] = useState(false);
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
    let active = true;
    api<PublicSettings>('settings').then(value => { if (active) setSettings({ ...defaultSettings, ...value }); })
      .catch(() => undefined).finally(() => { if (active) setSettingsReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty('--video-opacity', String(settings.videoOpacity));
    document.documentElement.style.setProperty('--glass-opacity', String(settings.glassOpacity));
  }, [settings.videoOpacity, settings.glassOpacity]);
  useEffect(() => {
  if (preview || home) return;
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
  if (home) page = <Landing markets={markets} tab={route.get('tab') || 'home'} settings={settings} />;
  else if (adminRoute && !loaded) page = <main className="layout loading" role="status">Opening BrandyFx admin…</main>;
  else if (adminRoute && member.admin) page = <SiteAdmin settings={settings} onSaved={value => setSettings(value)} run={run} />;
  else if (adminRoute) page = <AdminLogin pending={pending} notice={notice} run={run}/>;
  else if (!loaded) page = <main className="layout loading" role="status">Opening BrandyFx…</main>;
  else if (showingDesk) page = <Desk markets={markets} signals={preview ? fixtureSignals : signals} connected={preview || connected} />;
  else if (member.admin && tab === 'admin') page = <Admin member={member} run={run} />;
  else if (member.account) page = <Access member={member} run={run} settings={settings} />;
  else if (member.accounts?.length) page = <main className="layout access"><div><h1>Choose an account</h1>
    <p>Use the same Deriv account each time to keep your pass.</p></div><section className="access-panel account-list">
      {member.accounts.map(account => <button className="quiet" key={account} disabled={pending} onClick={() => void run('account', { account })}>{account}</button>)}
    </section></main>;
  else page = <main className="login-page">
    <a className="login-brand" href="/" aria-label="BrandyFx home">
      <img src="/brand/brandyfx-wordmark.png" alt="BrandyFx — Forex trading and binary options" />
    </a>
    <section className="login-card">
      <h1>Sign in</h1>
      <p>Sign in to follow live Deriv signals and manage your access.</p>
      <button className="primary deriv-login" type="button" onClick={() => window.location.assign('/?home')}>Log in with Deriv</button>
      <div className="login-divider"><span>or</span></div>
      <button className="token-login" type="button" onClick={() => setTokenDialog(true)}><span aria-hidden="true">⌘</span> Log in with API token</button>
      <p className="login-terms">By continuing, you agree to the <a href="#terms">Terms</a> &amp; <a href="#privacy">Privacy Policy</a>.</p>
    </section>
    {import.meta.env.DEV && <a className="preview-link login-preview" href="/?preview">Open desk preview</a>}
  </main>;
  return <><div className="site-backdrop" aria-hidden="true">
    {settings.backgroundUrl.match(/\.(mp4|webm)(\?|$)/i) ? <video className="backdrop-video" autoPlay muted loop playsInline preload="metadata" poster="/media/brandyfx-background-poster.jpg"><source src={settings.backgroundUrl} /></video> : <img className="backdrop-image" src={settings.backgroundUrl} alt="" />}
  </div><div className="backdrop-shade" aria-hidden="true" />
  {!settingsReady && !preview && <div className="brand-loader" role="status" aria-label="Loading BrandyFx"><img src="/brand/brandyfx-app-icon.png" alt=""/><span>BrandyFx</span></div>}
  {home ? page : <>{showingDesk || member.account || member.accounts?.length ? <header className="top"><a className="wordmark" href="/?home"><Mark />BrandyFx</a>
    <nav aria-label="Main navigation">
      {preview && <a className="quiet" href="/">Exit preview</a>}
      {member.admin && <><button className="quiet" aria-pressed={tab === 'desk'} onClick={() => setTab('desk')}>Desk</button>
        <button className="quiet" aria-pressed={tab === 'admin'} onClick={() => setTab('admin')}>Payments</button>
        <a className="quiet" href="/kingz.html">Site settings</a></>}
      {(member.account || member.accounts?.length) ? <button className="quiet" disabled={pending} onClick={() => void run('logout')}>Sign out</button> : null}
    </nav>
  </header> : null}
  {showingDesk || member.account || member.accounts?.length ? <Ribbon markets={markets} /> : null}
    {notice && <p className={showingDesk ? 'notice layout' : 'notice login-notice'} role="alert">{notice}</p>}{page}
    {showingDesk || member.account || member.accounts?.length ? <footer className="layout"><span className="footer-brand"><Mark />BrandyFx</span><span>{preview ? 'Design preview with sample data' : 'Signals for Deriv Options'}</span></footer> :
      <footer className="risk-footer"><p id="terms"><strong>Disclaimer:</strong> {derivDisclaimer}</p></footer>}
    </>}
    {tokenDialog && <div className="dialog-scrim" onMouseDown={event => { if (event.target === event.currentTarget) setTokenDialog(false); }}>
      <section className="token-dialog" role="dialog" aria-modal="true" aria-labelledby="token-title">
        <button className="dialog-close" type="button" aria-label="Close" onClick={() => setTokenDialog(false)}>×</button>
        <h2 id="token-title">Log in with API token</h2>
        <p>Token sign-in will be enabled after secure verification is configured.</p>
        <label>Deriv API token<input type="password" autoComplete="off" disabled placeholder="Not available yet" /></label>
        <p className="token-note">Your token is not collected or stored on this page.</p>
        <button className="primary" type="button" onClick={() => setTokenDialog(false)}>Got it</button>
      </section>
    </div>}
  </>;
}

createRoot(document.getElementById('root')!).render(<App />);
