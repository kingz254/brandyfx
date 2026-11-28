import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import Landing, { defaultReviewSets, reviewPackages, type PublicSettings, type ReviewEntry } from './landing';
import { downloadReceipt, receiptMailto, type ReceiptDetails } from './receipt';
import './theme.css';

type Market = { symbol: string; name: string; quote: string; points: string[]; updated: string; live: boolean };
type Signal = { id: number; symbol: string; family: string; label: string; digit: number | null; issued: string; expires: string };
type Offer = { amount: string; currency: string; days: number; instructions: string };
type Profile = { name: string; email: string; country: string; rot_number: string };
type Payment = { id: string; status: string; created: string; expires?: string | null; revoked_at?: string; deleted_at?: string | null; package?: string; reference?: string; amount?: string; currency?: string; customer_name?: string; customer_email?: string; customer_country?: string; rot_number?: string };
type Order = Payment & { account_id: string; reference: string; amount: string; currency: string; days: number; package: string; customer_name: string; customer_email: string; customer_country: string; rot_number: string; device_locked: boolean };
type ManagementRequest = { id: string | number; name: string; amount: string; start_date: string; status: string; created: string };
type Member = { ready?: boolean; launched?: boolean; account?: string; accounts?: string[]; admin?: boolean; passUntil?: string | null; lifetimeAccess?: boolean; allowedFamilies?: string[]; payment?: Payment; payments?: Payment[]; profile?: Profile | null; offer?: Offer };
const derivDisclaimer = 'Deriv offers complex derivatives, such as options and contracts for difference (“CFDs”). These products may not be suitable for all clients, and trading them puts you at risk. Please make sure that you understand the following risks before trading Deriv products: a) you may lose some or all of the money you invest in the trade, b) if your trade involves currency conversion, exchange rates will affect your profit and loss. You should never trade with borrowed money or with money that you cannot afford to lose.';
function PublicLegal({ kind }: { kind: 'terms' | 'privacy' }) {
  return <main className="tab-page legal-page public-legal"><header className="tab-heading"><p className="landing-kicker">BrandyFx · Legal</p>
    <h1>{kind === 'terms' ? <>Terms of<br/>service.</> : <>Privacy<br/>policy.</>}</h1>
    <p>Last updated 28 November 2026</p></header>
    {kind === 'terms' ? <div className="legal-grid">
      <article className="legal-placeholder"><h2>Using BrandyFx</h2><p>BrandyFx provides digit signal information, educational material, and downloadable XML bots for supported packages. You must be legally eligible to use Deriv and its products in your location. Keep your sign-in details secure and provide accurate checkout information.</p></article>
      <article className="legal-placeholder"><h2>Signals and trading risk</h2><p>Signals and bots are informational tools, not financial advice or a promise of accuracy or profit. Derivatives trading involves substantial risk and you can lose all or part of the amount you trade. You remain responsible for your trading decisions. Check each contract's terms and payout on Deriv before trading.</p></article>
      <article className="legal-placeholder"><h2>Packages and payments</h2><p>Prices and included signal families appear on the Pricing page. A package is a one-time payment for lifetime access to the stated BrandyFx service, beginning after payment review and approval. Refund eligibility is described in the Refund Policy. Send TRC20 payments only over the TRON network to the address and amount shown at checkout.</p></article>
      <article className="legal-placeholder"><h2>Accounts and bots</h2><p>Access is linked to the Deriv real account ID used to sign in and is subject to package permissions. Never share your Deriv password, verification code, or API token with BrandyFx. You are responsible for configuring and supervising downloaded bots. A bot may place trades according to its settings and losses are possible.</p></article>
      <article className="legal-placeholder"><h2>Availability and other services</h2><p>We may update or temporarily limit the site. Do not disrupt the service, bypass access controls, or use BrandyFx unlawfully. Deriv is an independent service with its own terms and risk disclosures. BrandyFx is not operated by Deriv.</p></article>
      <article className="legal-placeholder"><h2>Contact and changes</h2><p>We may update these terms by publishing a revised version here. Contact BrandyFx through the channels on the Contact page with questions.</p></article>
    </div> : <div className="legal-grid">
      <article className="legal-placeholder"><h2>Information we receive</h2><p>Deriv sign-in provides BrandyFx your Deriv account identifier and account information returned for Options access. Payment submissions include the name, email, country, Deriv account ID, transaction reference, package, and submission time you provide. Basic technical information such as session identifiers and request metadata is used to operate and protect the service.</p></article>
      <article className="legal-placeholder"><h2>How we use it</h2><p>We use information to authenticate sessions, associate payment submissions with accounts, review and manage access, provide package features, respond to support requests, and protect the service. BrandyFx does not ask for your Deriv password.</p></article>
      <article className="legal-placeholder"><h2>Storage and sharing</h2><p>Account identifiers, payment details, access records, and session data are stored by BrandyFx service providers, including hosting and database providers. We do not sell personal information. Providers receive information only as needed to operate the service. Deriv handles information submitted to its services under its own privacy notices.</p></article>
      <article className="legal-placeholder"><h2>Retention and your choices</h2><p>We retain payment and access records while needed to administer purchases, resolve disputes, and meet legal duties. Contact BrandyFx to request access, correction, or deletion where applicable. Some records may need to be retained.</p></article>
      <article className="legal-placeholder"><h2>Security and children</h2><p>We use access controls and protected connections to safeguard information. No internet service can guarantee absolute security. BrandyFx is intended for adults legally eligible to access Deriv in their location.</p></article>
      <article className="legal-placeholder"><h2>Contact and changes</h2><p>Use the current channels shown on the BrandyFx Contact page for privacy questions. We may update this policy when our service or legal duties change.</p></article>
    </div>}
    <footer className="legal-public-footer"><a href="/">Back to sign in</a><span>© BrandyFx</span></footer>
  </main>;
}
const families = [['evenOdd', 'Even / Odd'], ['range', 'Over 6 / Under 3'], ['digit', 'Matches']] as const;
const contractGuides = {
  evenOdd: { columns: ['Even', 'Odd'], rules: 'Even wins on 0, 2, 4, 6 or 8. Odd wins on 1, 3, 5, 7 or 9. A final quote of 1254.78 ends in 8, so it wins an Even contract.' },
  range: { columns: ['Over 6', 'Under 3'], rules: 'Over 6 wins on 7, 8 or 9. Under 3 wins on 0, 1 or 2. The comparisons are strict. A final digit of 6 loses an Over 6 contract, and a 3 loses an Under 3 contract.' },
  digit: { columns: ['Matches'], rules: 'A Matches prediction can be any digit from 0 through 9. If Volatility 50 shows Digit 4, a contract predicting 4 wins only if the final tick ends in 4. Every other digit loses.' },
};
const signalBots = {
  evenOdd: { name: 'bfx-manipulation-evenodd.xml', href: '/bots/bfx-manipulation-evenodd.xml' },
  range: { name: 'bfx-manipulation-overunder.xml', href: '/bots/bfx-manipulation-overunder.xml' },
  digit: { name: 'bfx-manipulation-matches.xml', href: '/bots/bfx-manipulation-matches.xml' },
} as const;
const marketOrder = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', '1HZ10V', '1HZ15V', '1HZ25V', '1HZ30V', '1HZ50V', '1HZ75V', '1HZ90V', '1HZ100V'];
const route = new URLSearchParams(location.search);
const preview = import.meta.env.DEV && route.has('preview');
const DEVELOPMENT_SIGNAL_SIMULATION = true;
const adminRoute = location.pathname === '/kingz.html';
const stamp = (date: string) => new Date(date).toLocaleTimeString([], { hour12: false });
const dateLabel = (date: string) => new Date(date).toLocaleString();
const until = (offset: number) => new Date(Date.now() + offset).toISOString();
const defaultSettings: PublicSettings = {
  backgroundUrl: '/media/brandyfx-background.mp4', videoOpacity: .5, glassOpacity: .72,
  regularPrice: 300, premiumPrice: 450, regularOffer: 200, premiumOffer: 300,
  regularDays: 0, premiumDays: 0, offerActive: false, offerEndsAt: '',
  evenOddPrice: 300, evenOddOffer: 200, evenOddDays: 0,
  overUnderPrice: 300, overUnderOffer: 200, overUnderDays: 0,
  matchesPrice: 450, matchesOffer: 300, matchesDays: 0,
  promoHeading: "Don't miss your chance", promoSubheading: 'Grants up to 20% off', trc20Wallet: '',
  socialEmail: '', socialWhatsApp: '', socialTelegram: '', socialInstagram: '',
  homepageReviews: defaultReviewSets.homepage, communityReviews: defaultReviewSets.community,
};
const fixtureMarkets: Market[] = marketOrder.map((symbol, market) => {
  const index = symbol.startsWith('1HZ') ? symbol.slice(3, -1) : symbol.slice(2);
  const points = Array.from({ length: 64 }, (_, i) =>
    (1234 + market * 42 + i * 0.36 + Math.sin(i * 0.45) * 4 + Math.cos(i * 1.64) * 1.7).toFixed(2));
  return { symbol, name: `Volatility ${index}${symbol.startsWith('1HZ') ? ' (1s)' : ''} Index`, quote: points.at(-1)!, points, updated: until(0), live: true };
});
const fixtureSignals: Signal[] = [
  ['evenOdd', 'Even', null], ['range', 'Over 6', 6], ['digit', 'Matches', 4],
].map(([family, label, digit], i) => ({
  id: i + 1, symbol: 'R_50', family: String(family), label: String(label), digit: digit as number | null,
  issued: until(0), expires: until(50000),
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
  const [markets, setMarkets] = useState<Market[]>(fixtureMarkets);
  useEffect(() => {
    if (preview || !DEVELOPMENT_SIGNAL_SIMULATION) return;
    const simulation = window.setInterval(() => setMarkets(current => current.map(market => {
      const next = Math.max(100, Number(market.quote) + (Math.random() - 0.5) * 3).toFixed(2);
      return { ...market, quote: next, points: [...market.points.slice(-63), next], updated: until(0), live: true };
    })), 1000);
    return () => window.clearInterval(simulation);
  }, []);
  useEffect(() => {
    if (DEVELOPMENT_SIGNAL_SIMULATION || preview) return;
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

function Desk({ markets, signals, connected, simulated = false, allowedFamilies, admin }: { markets: Market[]; signals: Signal[]; connected: boolean; simulated?: boolean; allowedFamilies: string[]; admin: boolean }) {
  const [family, setFamily] = useState<keyof typeof contractGuides>('evenOdd');
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const { columns, rules } = contractGuides[family];
  const canSeeFamily = admin || allowedFamilies.includes(family);
  useEffect(() => { if (!canSeeFamily && allowedFamilies.length) setFamily(allowedFamilies[0] as keyof typeof contractGuides); }, [canSeeFamily, allowedFamilies]);
  const rankMarket = (symbol: string) => { const index = marketOrder.indexOf(symbol); return index < 0 ? marketOrder.length : index; };
  const orderedMarkets = [...markets].sort((a, b) => rankMarket(a.symbol) - rankMarket(b.symbol));
  const latest = new Map<string, Signal>();
  for (const signal of signals) {
    if (signal.family !== family || +new Date(signal.expires) <= clock) continue;
    const current = latest.get(signal.symbol);
    if (!current || +new Date(signal.issued) > +new Date(current.issued)) latest.set(signal.symbol, signal);
  }
  const activeFamily = families.find(([id]) => id === family)?.[1] || families[0][1];
  const feedLive = connected && orderedMarkets.some(market => market.live);
  return <main className="desk desk-table-page">
    <section className="desk-main">
      <div className="desk-heading"><div><p className="landing-kicker">DERIV · LIVE SIGNAL FEED</p><h1>Signals desk</h1><p>Live setups across the volatility markets.</p></div>
        <span className={simulated ? 'status' : feedLive ? 'status live' : 'status'}>{simulated ? 'Development feed' : preview ? 'Sample feed' : feedLive ? 'Feed live' : 'Waiting for live feed'}</span></div>
      <div className="tabs" role="group" aria-label="Signal family">{families.map(([id, label]) => <button key={id} type="button"
        aria-pressed={family === id} aria-disabled={!admin && !allowedFamilies.includes(id)} onClick={() => setFamily(id)}>{label}{!admin && !allowedFamilies.includes(id) ? ' · Locked' : ''}</button>)}</div>
      {!canSeeFamily ? <section className="contract-guide signal-locked" role="status"><h2>Package access required</h2><p>This signal tab is not included in your approved package. Regular packages show their own signal family; the V.I.P. Matches package includes all three tabs.</p><a className="landing-primary" href="/?home&tab=pricing">View access plans</a></section> : <>
      <section className="contract-guide" aria-label={activeFamily + ' contract guide'}>
        <h2>How {activeFamily} works</h2>
        <p>{rules} Deriv uses the last displayed digit of the final tick, including any trailing zero.</p>
        <p><strong>Payout.</strong> Deriv quotes the total return before purchase for the market, duration and stake you select. Net profit on a win is the quoted payout minus the stake. A losing contract normally forfeits the stake.</p>
        <p>Each BrandyFx signal is visible for up to 50 seconds. You choose the contract duration separately in Deriv.</p>
      </section>
      <section className="signal-bot-download" aria-label={`${activeFamily} bot download`}>
        <div><p className="landing-kicker">BOT FOR THIS SIGNAL TAB</p><h2>{signalBots[family].name}</h2><p>Keep the matching XML bot available whenever you use this signal desk.</p></div>
        <a className="signal-bot-download-link" href={signalBots[family].href} download>Download XML <span aria-hidden="true">↓</span></a>
      </section>
      <div className="signal-table-shell" role="region" aria-label={`${activeFamily} signals`} tabIndex={0}>
        <table className="signal-table"><caption>{activeFamily} signals by market</caption>
          <thead><tr><th scope="col">Market</th>{columns.map(column => <th scope="col" key={column}>{column}</th>)}<th scope="col">Live last digits</th></tr></thead>
          {orderedMarkets.map(market => {
            const signal = connected && market.live ? latest.get(market.symbol) : undefined;
            const seconds = signal ? Math.ceil((+new Date(signal.expires) - clock) / 1000) : 0;
            return <tbody key={market.symbol}><tr className="signal-market-row" data-family={family}>
              <th scope="row">{market.name}</th>
              {columns.map(column => {
                const matches = signal?.label === column;
                const label = matches && signal?.family === 'digit' ? `Digit ${signal.digit}` : column;
                return <td key={column} data-label={column}><span className={`signal-result${matches ? ' signal-result-live' : ''}`} aria-label={matches ? `${label} signal` : 'No current signal'}>{matches ? label : '----'}</span></td>;
              })}
              <td className="signal-price" data-label="Live last digits">{market.quote ? <strong className="signal-quote">{market.quote.slice(0, -1)}<span>{market.quote.slice(-1)}</span></strong> : '–'}
                <small>{market.live && market.updated ? stamp(market.updated) : market.quote ? 'Stale quote' : 'Waiting for ticks'}</small></td>
            </tr>{seconds > 0 && <tr className="signal-timer-row"><td colSpan={columns.length + 2}>
              Signal expires in <time dateTime={`PT${seconds}S`}>{seconds}s</time>
            </td></tr>}</tbody>;
          })}
        </table>
        {!orderedMarkets.length && <p className="desk-wait" role="status">Waiting for Deriv market data.</p>}
      </div>
      <p className="signal-disclaimer">{simulated ? 'Generated market prices and signals for development testing.' : 'Signals are generated from recent ticks for your own review.'}</p>
      </>}
    </section>
  </main>;
}

function Access({ member }: { member: Member }) {
  const payment = member.payment;
  const planNames: Record<string, string> = { evenOdd: 'Even / Odd · Regular', overUnder: 'Over 6 / Under 3 · Regular', matches: 'Matches only · V.I.P.' };
  const status = member.lifetimeAccess || member.passUntil ? 'Lifetime access active' : payment?.revoked_at ? 'Pass revoked' :
    payment?.status === 'pending' ? 'Payment awaiting review' : payment?.status === 'approved' ? 'Pass expired' :
      payment?.status === 'declined' ? 'Request declined' : 'Deriv connected';
  return <main className="access layout">
    <div><p className="status">{status}</p><h1>Your BrandyFx access</h1><p>Payment requests and your saved client details are shown here.</p></div>
    <section className="access-panel client-records">
      {!member.launched && <><h2>Paid access is opening soon</h2><p>Payment instructions will be available after BrandyFx completes its launch setup.</p></>}
      {member.profile ? <section className="client-profile"><h2>Client details</h2><dl><div><dt>Name</dt><dd>{member.profile.name}</dd></div><div><dt>Email</dt><dd>{member.profile.email}</dd></div><div><dt>Country</dt><dd>{member.profile.country}</dd></div><div><dt>ROT / Deriv number</dt><dd>{member.profile.rot_number}</dd></div></dl></section>
        : <p>No checkout profile is saved to this Deriv account yet.</p>}
      {payment && <section className="client-payment"><h2>Latest payment</h2><p><strong>{planNames[payment.package || ''] || payment.package}</strong> · {payment.currency} {Number(payment.amount || 0).toFixed(2)}</p><p>Status: {payment.deleted_at ? 'Removed' : payment.revoked_at ? 'Revoked' : payment.status}</p>{payment.status === 'approved' && !payment.revoked_at && !payment.deleted_at && <p>Access: one-time lifetime</p>}{payment.reference && <p>Transaction hash: <code>{payment.reference}</code></p>}{payment.status === 'approved' && !payment.revoked_at && !payment.deleted_at && <a className="landing-primary" href="/?home&tab=verify">Open verified purchase</a>}</section>}
      <a className="landing-primary" href="/?home&tab=pricing">Browse access plans <span aria-hidden="true">↗</span></a>
    </section>
  </main>;
}

function Admin({ run }: { run: (path: string, data?: object) => Promise<boolean> }) {
  return <main className="admin layout"><h1>Clients</h1>
    <PaymentRecords run={run}/>
    <ManagementRequests />
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
      const payload = { ...raw, offerEndsAt: raw.offerEndsAt ? new Date(String(raw.offerEndsAt)).toISOString() : '', videoOpacity: Number(raw.videoOpacity), glassOpacity: Number(raw.glassOpacity), evenOddPrice: Number(raw.evenOddPrice), evenOddOffer: Number(raw.evenOddOffer), evenOddDays: 0, overUnderPrice: Number(raw.overUnderPrice), overUnderOffer: Number(raw.overUnderOffer), overUnderDays: 0, matchesPrice: Number(raw.matchesPrice), matchesOffer: Number(raw.matchesOffer), matchesDays: 0, offerEnabled: raw.offerEnabled === 'on' };
      try { const result = await api<PublicSettings>('admin/site-settings', payload); onSaved(result); setSaved('Settings saved.'); }
      catch (cause) { setError((cause as Error).message); }
      finally { setBusy(false); }
    }}>
      <section className="admin-setting-panel"><p className="landing-kicker">Visual system</p><h2>Background & glass</h2>
        <label>Background media URL<input name="backgroundUrl" type="text" defaultValue={settings.backgroundUrl} placeholder="/media/background.mp4 or https://…" required/><small>Use a local /media/ path or an HTTPS URL. Video formats: MP4 or WebM.</small></label>
        <div className="admin-field-grid"><label>Video opacity <output>{Math.round(settings.videoOpacity * 100)}%</output><input name="videoOpacity" type="range" min="0.1" max="0.9" step="0.01" defaultValue={settings.videoOpacity} onInput={e => { const output = (e.currentTarget.previousElementSibling as HTMLOutputElement); if (output) output.value = `${Math.round(Number(e.currentTarget.value) * 100)}%`; }}/></label>
          <label>Glass opacity <output>{Math.round(settings.glassOpacity * 100)}%</output><input name="glassOpacity" type="range" min="0.1" max="0.9" step="0.01" defaultValue={settings.glassOpacity} onInput={e => { const output = (e.currentTarget.previousElementSibling as HTMLOutputElement); if (output) output.value = `${Math.round(Number(e.currentTarget.value) * 100)}%`; }}/></label></div>
      </section>
      <section className="admin-setting-panel"><p className="landing-kicker">Access plans</p><h2>Pricing</h2><p className="admin-panel-note">Every package is a one-time purchase for lifetime access. No recurring billing or expiry term.</p><div className="admin-plan-grid">{([{ key: 'evenOdd', label: 'Even / Odd' }, { key: 'overUnder', label: 'Over 6 / Under 3' }, { key: 'matches', label: 'Matches only · V.I.P.' }] as const).map(({ key, label }) => <fieldset key={key}><legend>{label}</legend><label>Standard price (USD)<input name={`${key}Price`} type="number" min="1" step="0.01" defaultValue={settings[`${key}Price`]} required/></label><label>Offer price (USD)<input name={`${key}Offer`} type="number" min="1" step="0.01" defaultValue={settings[`${key}Offer`]} required/></label></fieldset>)}</div>
        <label className="admin-check"><input name="offerEnabled" type="checkbox" defaultChecked={settings.offerActive}/> Enable launch offer</label>
        <div className="admin-field-grid"><label>Offer end date/time<input name="offerEndsAt" type="datetime-local" defaultValue={settings.offerEndsAt ? new Date(settings.offerEndsAt).toISOString().slice(0, 16) : ''}/></label><label>Promotion heading<input name="promoHeading" maxLength={90} defaultValue={settings.promoHeading} required/></label></div>
        <label>Promotion subheading<input name="promoSubheading" maxLength={140} defaultValue={settings.promoSubheading} required/></label>
      </section>
      <section className="admin-setting-panel"><p className="landing-kicker">Contact channels</p><h2>Socials & support</h2><p className="admin-panel-note">Add only channels clients can use. Saved links appear as icons in the site header and footer.</p>
        <div className="admin-field-grid"><label>Email address<input name="socialEmail" type="email" autoComplete="email" defaultValue={settings.socialEmail} placeholder="hello@brandyfx.com"/></label><label>WhatsApp link<input name="socialWhatsApp" type="url" defaultValue={settings.socialWhatsApp} placeholder="https://wa.me/254…"/></label>
          <label>Telegram link<input name="socialTelegram" type="url" defaultValue={settings.socialTelegram} placeholder="https://t.me/…"/></label><label>Instagram link<input name="socialInstagram" type="url" defaultValue={settings.socialInstagram} placeholder="https://instagram.com/…"/></label></div>
        <small className="admin-panel-note">WhatsApp, Telegram and Instagram links must use HTTPS and their official domains.</small>
      </section>
      <section className="admin-setting-panel"><p className="landing-kicker">Payments</p><h2>USDT · TRC20</h2><label>TRC20 wallet address<input name="trc20Wallet" autoComplete="off" defaultValue={settings.trc20Wallet} placeholder="T…"/><small>Shown publicly in the checkout window. Clients send proof through the WhatsApp contact configured above.</small></label></section>
      {(error || saved) && <p className={error ? 'admin-message error' : 'admin-message'} role={error ? 'alert' : 'status'}>{error || saved}</p>}
      <div className="site-admin-actions"><button className="landing-primary" disabled={busy}>{busy ? 'Saving…' : 'Save site settings'}</button><button type="button" className="landing-secondary" onClick={() => void run('logout')}>Sign out</button></div>
    </form>
    <ManagementRequests />
  </main>;
}

function ReviewEditorTable({ title, previewHref, entries, onUpdate, onAdd, onDelete }: { title: string; previewHref: string; entries: ReviewEntry[]; onUpdate: (id: string, field: string, value: string) => void; onAdd: () => void; onDelete: (id: string) => void }) {
  return <section className="admin-setting-panel review-editor-panel"><div className="section-heading"><div><p className="landing-kicker">Public reviews</p><h2>{title}</h2></div><div className="review-editor-tools"><a className="landing-secondary" href={previewHref} target="_blank" rel="noreferrer">Preview ↗</a><button type="button" className="landing-secondary" onClick={onAdd}>Add review</button></div></div>
    <p className="admin-panel-note">Use real client wording only when the client has agreed to share it. Mark generated content as an illustrative sample.</p>
    <div className="review-editor-scroll"><table className="review-editor-table"><thead><tr><th>Review text</th><th>Name</th><th>Country</th><th>Flag code</th><th>Package</th><th>Rating</th><th>Type</th><th>Remove</th></tr></thead><tbody>
      {entries.map(entry => <tr key={entry.id}>
        <td data-label="Review text"><textarea rows={3} maxLength={1000} value={entry.text} onChange={event => onUpdate(entry.id, 'text', event.target.value)} aria-label={`Review text for ${entry.name}`}/></td>
        <td data-label="Name"><input maxLength={100} value={entry.name} onChange={event => onUpdate(entry.id, 'name', event.target.value)} aria-label={`Name for review by ${entry.name}`}/></td>
        <td data-label="Country"><input maxLength={90} value={entry.country} onChange={event => onUpdate(entry.id, 'country', event.target.value)} aria-label={`Country for review by ${entry.name}`}/></td>
        <td data-label="Flag code"><input maxLength={2} value={entry.countryCode} onChange={event => onUpdate(entry.id, 'countryCode', event.target.value.toLowerCase())} placeholder="ke" aria-label={`Two-letter flag code for ${entry.country}`}/></td>
        <td data-label="Package"><select value={entry.package} onChange={event => onUpdate(entry.id, 'package', event.target.value)} aria-label={`Package for review by ${entry.name}`}>{reviewPackages.map(value => <option key={value}>{value}</option>)}</select></td>
        <td data-label="Rating"><select value={entry.rating ?? 5} onChange={event => onUpdate(entry.id, 'rating', event.target.value)} aria-label={`Star rating for review by ${entry.name}`}>{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{'★'.repeat(value)}{'☆'.repeat(5 - value)} · {value}/5</option>)}</select></td>
        <td data-label="Type"><select value={entry.source} onChange={event => onUpdate(entry.id, 'source', event.target.value)} aria-label={`Review type for ${entry.name}`}><option value="sample">Illustrative sample</option><option value="client">Client review · permission confirmed</option></select></td>
        <td data-label="Remove"><button type="button" className="landing-secondary review-remove" onClick={() => onDelete(entry.id)} aria-label={`Remove review by ${entry.name}`}>Remove</button></td>
      </tr>)}
    </tbody></table>{!entries.length && <p className="admin-panel-note">No reviews in this table yet.</p>}</div>
  </section>;
}

function ReviewAdmin({ settings, onSaved }: { settings: PublicSettings; onSaved: (value: PublicSettings) => void }) {
  const [homepageReviews, setHomepageReviews] = useState<ReviewEntry[]>(settings.homepageReviews ?? defaultReviewSets.homepage);
  const [communityReviews, setCommunityReviews] = useState<ReviewEntry[]>(settings.communityReviews ?? defaultReviewSets.community);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setHomepageReviews(settings.homepageReviews ?? defaultReviewSets.homepage);
    setCommunityReviews(settings.communityReviews ?? defaultReviewSets.community);
  }, [settings.homepageReviews, settings.communityReviews]);
  const update = (setter: typeof setHomepageReviews, id: string, field: string, value: string) => setter(current => current.map(entry => entry.id === id ? { ...entry, [field]: field === 'rating' ? Number(value) : value } as ReviewEntry : entry));
  const add = (setter: typeof setHomepageReviews) => setter(current => [...current, { id: `review-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, text: '', name: '', country: '', countryCode: '', package: reviewPackages[0], rating: 5, source: 'client' }]);
  async function save() {
    setBusy(true); setMessage(''); setError('');
    try { const result = await api<PublicSettings>('admin/reviews', { homepageReviews, communityReviews }); onSaved({ ...settings, ...result }); setMessage('Reviews saved and published.'); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  return <main className="site-admin layout review-admin"><header className="site-admin-heading"><div><p className="landing-kicker">Review manager</p><h1>Edit reviews</h1><p>Manage the homepage rotation and the Read reviews page.</p></div><a className="landing-secondary" href="/?home&tab=reviews">Preview reviews ↗</a></header>
    <ReviewEditorTable title={`Homepage rotation · ${homepageReviews.length}`} previewHref="/?home" entries={homepageReviews} onUpdate={(id, field, value) => update(setHomepageReviews, id, field, value)} onAdd={() => add(setHomepageReviews)} onDelete={id => setHomepageReviews(current => current.filter(entry => entry.id !== id))}/>
    <ReviewEditorTable title={`Read reviews page · ${communityReviews.length}`} previewHref="/?home&tab=reviews" entries={communityReviews} onUpdate={(id, field, value) => update(setCommunityReviews, id, field, value)} onAdd={() => add(setCommunityReviews)} onDelete={id => setCommunityReviews(current => current.filter(entry => entry.id !== id))}/>
    {(message || error) && <p className={error ? 'admin-message error' : 'admin-message'} role={error ? 'alert' : 'status'}>{error || message}</p>}
    <div className="site-admin-actions"><button type="button" className="landing-primary" onClick={() => void save()} disabled={busy}>{busy ? 'Saving…' : 'Save and publish reviews'}</button><a className="landing-secondary" href="/?home">View site ↗</a></div>
  </main>;
}

function PaymentRecords({ run }: { run: (path: string, data?: object) => Promise<boolean> }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('all');
  const load = async () => {
    setLoading(true);
    try { setOrders(await api<Order[]>('admin/payments')); setLoadError(''); }
    catch (cause) { setLoadError((cause as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const planNames: Record<string, string> = { evenOdd: 'Even / Odd · Regular', overUnder: 'Over 6 / Under 3 · Regular', matches: 'Matches · V.I.P.' };
  const filters = [['all','All clients'],['evenOdd','Even / Odd'],['overUnder','Over / Under'],['matches','Matches · V.I.P.']] as const;
  const activeOrders = orders.filter(order => !order.deleted_at);
  const visibleOrders = selectedPackage === 'all' ? activeOrders : activeOrders.filter(order => order.package === selectedPackage);
  const receipt = (order: Order): ReceiptDetails => ({ id: String(order.id), name: order.customer_name, email: order.customer_email, country: order.customer_country, rot: order.rot_number || order.account_id, package: planNames[order.package] || order.package, amount: order.amount, currency: order.currency, reference: order.reference, created: order.created });
  return <section className="admin-setting-panel payment-records"><div className="section-heading"><div><p className="landing-kicker">Client records</p><h2>Clients</h2></div><button type="button" className="landing-secondary" onClick={() => void load()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
    <p className="admin-panel-note">Verify each TRC20 transaction hash before approving. Approval grants that package for the lifetime of the BrandyFx service. Matches V.I.P. includes all three signal tabs. Device reset signs the account out and lets its next sign-in bind a new device.</p>
    <div className="client-package-filters" role="group" aria-label="Filter clients by package">{filters.map(([key,label]) => <button key={key} type="button" aria-pressed={selectedPackage === key} onClick={() => setSelectedPackage(key)}>{label}<small>{key === 'all' ? activeOrders.length : activeOrders.filter(order => order.package === key).length}</small></button>)}</div>
    {loadError && <p className="admin-message error" role="alert">{loadError}</p>}
    {!loadError && !activeOrders.length && <p>No client records.</p>}
    {!!visibleOrders.length && <div className="payment-table-scroll"><table className="payment-table"><thead><tr><th>Client</th><th>Deriv / ROT</th><th>Package</th><th>Paid</th><th>Transaction hash</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{visibleOrders.map(order => <tr key={order.id}><td data-label="Client"><strong>{order.customer_name || 'Name not provided'}</strong><small>{order.customer_email || 'Email not provided'}</small><small>{order.customer_country}</small><small>{dateLabel(order.created)}</small></td>
        <td data-label="Deriv / ROT">{order.rot_number || order.account_id}<small>{order.device_locked ? 'Device locked' : 'No device lock'}</small></td><td data-label="Package">{planNames[order.package] || order.package}<small>One-time · lifetime</small></td><td data-label="Paid">{order.currency} {Number(order.amount).toFixed(2)}</td>
        <td data-label="Transaction hash"><code>{order.reference}</code></td><td data-label="Status"><span className={`record-status record-${order.deleted_at ? 'deleted' : order.revoked_at ? 'revoked' : order.status}`}>{order.deleted_at ? 'Deleted' : order.revoked_at ? 'Revoked' : order.status}</span></td>
        <td data-label="Actions"><div className="record-actions">{order.status === 'pending' && !order.deleted_at && <><button type="button" className="landing-primary" onClick={async () => { if (await run('admin/payment', { paymentId: order.id, action: 'approve' })) void load(); }}>Approve · lifetime</button><button type="button" className="landing-secondary" onClick={async () => { if (await run('admin/payment', { paymentId: order.id, action: 'decline' })) void load(); }}>Decline</button></>}
          {order.device_locked && <button type="button" className="landing-secondary" onClick={async () => { if (window.confirm(`Change ${order.rot_number || order.account_id}'s registered device? The current device session will be removed. Their next sign-in will register the new device.`) && await run('admin/device-lock', { accountId: order.account_id })) void load(); }}>Change device access</button>}
          {order.status === 'approved' && !order.revoked_at && !order.deleted_at && <button type="button" className="landing-secondary" onClick={async () => { if (await run('admin/payment', { paymentId: order.id, action: 'revoke' })) void load(); }}>Revoke access</button>}
          {order.status === 'approved' && <><button type="button" className="landing-secondary" onClick={() => downloadReceipt(receipt(order))}>Download receipt</button>{order.customer_email && <a className="landing-secondary" href={receiptMailto(order.customer_email, receipt(order))}>Email receipt</a>}</>}
          {!order.deleted_at && <button type="button" className="landing-secondary" onClick={async () => { if (window.confirm(`Remove ${order.customer_name || order.account_id}'s record and revoke access?`)) { if (await run('admin/payment', { paymentId: order.id, action: 'delete' })) void load(); } }}>Delete record</button>}
          {order.deleted_at && <small>Access revoked</small>}</div></td>
      </tr>)}</tbody></table></div>}
    {!loadError && activeOrders.length > 0 && !visibleOrders.length && <p>No records for this package.</p>}
  </section>;
}

function ManagementRequests() {
  const [requests, setRequests] = useState<ManagementRequest[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try { setRequests(await api<ManagementRequest[]>('admin/account-management')); setMessage(''); }
    catch (cause) { setMessage((cause as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  return <section className="admin-setting-panel payment-records"><div className="section-heading"><div><p className="landing-kicker">Client enquiries</p><h2>Account-management requests</h2></div><button type="button" className="landing-secondary" onClick={() => void load()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
    <p className="admin-panel-note">These are enquiries only; no account access or trading authorization is recorded here.</p>
    {message && <p className="admin-message error" role="alert">{message}</p>}
    {!message && !requests.length && <p>No account-management enquiries yet.</p>}
    {!!requests.length && <div className="payment-table-scroll"><table className="payment-table"><thead><tr><th>Client</th><th>Starting amount</th><th>Preferred date</th><th>Received</th><th>Status</th></tr></thead><tbody>
      {requests.map(request => <tr key={request.id}><td data-label="Client">{request.name}</td><td data-label="Starting amount">USD {Number(request.amount).toFixed(2)}</td><td data-label="Preferred date">{request.start_date}</td><td data-label="Received">{dateLabel(request.created)}</td><td data-label="Status"><span className={`record-status record-${request.status}`}>{request.status}</span></td></tr>)}
    </tbody></table></div>}
  </section>;
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
  scope: 'Your Deriv token needs the trade permission to access Options accounts.',
  account: 'Sign in with a Deriv real account whose ROT number is available.',
};

function App() {
  const markets = useMarkets();
  const [settings, setSettings] = useState<PublicSettings>(defaultSettings);
  const [settingsReady, setSettingsReady] = useState(false);
  const [member, setMember] = useState<Member>({});
  const [loaded, setLoaded] = useState(preview);
  const [tab, setTab] = useState(route.has('desk') ? 'desk' : 'home');
  const [signals, setSignals] = useState<Signal[]>([]);
  const [simulatedSignals, setSimulatedSignals] = useState<Signal[]>([]);
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState(false);
  const [tokenDialog, setTokenDialog] = useState(false);
  const [tokenValue, setTokenValue] = useState('');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [notice, setNotice] = useState(loginMessage[new URLSearchParams(location.search).get('login') || ''] || '');
  const allowedFamilies = member.allowedFamilies || [];
  const canView = Boolean(member.account && (member.admin || (member.launched && allowedFamilies.length > 0)));
  useEffect(() => {
    if (!DEVELOPMENT_SIGNAL_SIMULATION || !canView || tab !== 'desk') return;
    setSignals([]);
    setConnected(true);
    let timer: number;
    const generateRound = () => {
      const issued = Date.now();
      const signals = families.map(([family]) => {
        const market = fixtureMarkets[Math.floor(Math.random() * fixtureMarkets.length)];
        const label = family === 'evenOdd' ? (Math.random() < .5 ? 'Even' : 'Odd') :
          family === 'range' ? (Math.random() < .5 ? 'Over 6' : 'Under 3') : 'Matches';
        return {
          id: Math.floor(issued + Math.random() * 1000), symbol: market.symbol, family, label,
          digit: family === 'digit' ? Math.floor(Math.random() * 10) :
            family === 'range' ? (label === 'Over 6' ? 6 : 3) : null,
          issued: new Date(issued).toISOString(), expires: new Date(issued + 50000).toISOString(),
        };
      });
      setSimulatedSignals(current => [
        ...current.filter(item => +new Date(item.expires) > issued),
        ...signals,
      ]);
      timer = window.setTimeout(generateRound, 20000 + Math.floor(Math.random() * 25001));
    };
    generateRound();
    return () => window.clearTimeout(timer);
  }, [canView, tab]);
  async function refresh() {
    try {
      setMember(await api<Member>('me'));
    } catch (cause) {
      const message = (cause as Error).message;
      setNotice(message);
      if (message.includes('locked to another device')) {
        setMember({}); setSignals([]); setSimulatedSignals([]); setConnected(false);
      }
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
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem('bfx-install-dismissed') === '1';
    const onInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      localStorage.setItem('bfx-install-dismissed', '1');
      setInstallOpen(false);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onInstallAvailable);
    window.addEventListener('appinstalled', onInstalled);
    if (member.account && !standalone && !dismissed) setInstallOpen(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallAvailable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [member.account]);
  useEffect(() => {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  useEffect(() => {
  if (preview) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (preview || adminRoute || !canView || tab !== 'desk') return;
    let active = true;
    let timer: number;
    async function poll() {
      try {
        const data = await api<Signal[]>('signals');
        if (active) {
          if (DEVELOPMENT_SIGNAL_SIMULATION) { setConnected(true); active = false; }
          else { setSignals(data); setConnected(true); }
        }
      } catch (cause) {
        if (active) {
          setSignals([]); setConnected(false);
          const message = (cause as Error).message;
          if (message.toLowerCase().includes('locked to another device')) {
            setNotice(message);
            active = false;
            return;
          }
        }
      } finally {
        if (active) timer = window.setTimeout(poll, 1500);
      }
    }
    void poll();
    return () => { active = false; clearTimeout(timer); setSignals([]); setConnected(false); };
  }, [canView, tab, member.account, allowedFamilies.join(',')]);
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
  async function submitToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = tokenValue.trim();
    if (!token || pending) return;
    if (await run('deriv/token', { token })) {
      setTokenValue('');
      setTokenDialog(false);
    }
  }
  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstallOpen(false);
    setInstallPrompt(null);
  }
  const privateHome = Boolean(member.account && !route.has('desk') && !adminRoute);
  const publicLegal = !member.account && route.has('legal');
  const showingDesk = preview || (canView && route.has('desk'));
  const deviceConflict = notice.toLowerCase().includes('locked to another device');
  let page: ReactNode;
  if (adminRoute && !loaded) page = <main className="layout loading" role="status">Opening BrandyFx admin…</main>;
  else if (adminRoute && member.admin && tab === 'admin') page = <Admin run={run}/>;
  else if (adminRoute && member.admin && tab === 'desk') page = <Desk markets={markets} signals={DEVELOPMENT_SIGNAL_SIMULATION ? simulatedSignals : signals} connected={DEVELOPMENT_SIGNAL_SIMULATION || connected} simulated={DEVELOPMENT_SIGNAL_SIMULATION} allowedFamilies={allowedFamilies} admin />;
  else if (adminRoute && member.admin && tab === 'reviews') page = <ReviewAdmin settings={settings} onSaved={value => setSettings(value)}/>;
  else if (adminRoute && member.admin) page = <SiteAdmin settings={settings} onSaved={value => setSettings(value)} run={run} />;
  else if (adminRoute) page = <AdminLogin pending={pending} notice={notice} run={run}/>;
  else if (!loaded) page = <main className="layout loading" role="status">Opening BrandyFx…</main>;
  else if (publicLegal) page = <PublicLegal kind={route.get('legal') === 'privacy' ? 'privacy' : 'terms'} />;
  else if (!adminRoute && member.accounts && member.accounts.length > 1 && !member.account) page = <main className="account-choice-page"><header><p className="landing-kicker">Deriv account</p><h1>Choose your real account</h1><p>Select the ROT account you want to use with BrandyFx. Demo accounts are not supported.</p></header><section className="account-choice-list" aria-label="Available real accounts">{member.accounts.filter(account => account.startsWith('ROT')).map(account => <button type="button" key={account} onClick={() => void run('account/select', { accountId: account })} disabled={pending}>{account}<span aria-hidden="true">→</span></button>)}</section></main>;
  else if (privateHome) page = <Landing markets={markets} tab={route.get('tab') || 'home'} settings={settings} simulated={DEVELOPMENT_SIGNAL_SIMULATION} rotNumber={member.account!} hasAccess={canView} onSignOut={() => void run('logout')} payment={member.payment} payments={member.payments} profile={member.profile} />;
  else if (showingDesk && deviceConflict) page = <main className="login-page"><a className="login-brand" href="/?home" aria-label="BrandyFx home"><img src="/brand/brandyfx-wordmark.png" alt="BrandyFx — Forex trading and binary options" /></a>
    <section className="login-card device-conflict-card"><p className="landing-kicker">SIGNAL ACCESS</p><h1>Device lock conflict</h1>
      <p>This Deriv account’s signal access is registered to another device. Contact BrandyFx if you need to transfer access. You do not need to pay again.</p>
      {(settings.socialWhatsApp || settings.socialEmail) && <div className="device-conflict-actions">
        {settings.socialWhatsApp && <a className="primary deriv-login" href={settings.socialWhatsApp} target="_blank" rel="noreferrer">Contact BrandyFx on WhatsApp</a>}
        {settings.socialEmail && <a className="token-login device-contact-link" href={`mailto:${settings.socialEmail}?subject=${encodeURIComponent('Request to change BrandyFx device access')}`}>Email BrandyFx</a>}
      </div>}
      {!settings.socialWhatsApp && !settings.socialEmail && <p>Use the BrandyFx contact details shared with you to request a device change.</p>}
      <a className="login-terms" href="/?home">Back to home</a>
    </section></main>;
  else if (showingDesk) page = <Desk markets={markets} signals={DEVELOPMENT_SIGNAL_SIMULATION ? simulatedSignals : preview ? fixtureSignals : signals} connected={DEVELOPMENT_SIGNAL_SIMULATION || preview || connected} simulated={DEVELOPMENT_SIGNAL_SIMULATION} allowedFamilies={allowedFamilies} admin={Boolean(member.admin || preview)} />;
  else if (member.admin && tab === 'admin') page = <Admin run={run} />;
  else if (member.account) page = <Access member={member} />;
  else page = <main className="login-page">
    <a className="login-brand" href="/" aria-label="BrandyFx home">
      <img src="/brand/brandyfx-wordmark.png" alt="BrandyFx — Forex trading and binary options" />
    </a>
    <section className="login-card">
      <h1>Sign in</h1>
      <p>Sign in to follow live Deriv signals and manage your access.</p>
      <p className="login-device-note">One device per Deriv account. Submitting a payment binds signal access to this browser on this device. Contact BrandyFx if you need to transfer it.</p>
      <a className="primary deriv-login" href="/api/deriv/start">Log in with Deriv</a>
      {!member.ready && <p className="login-setup-note" role="status">Deriv sign-in is awaiting server configuration.</p>}
      <div className="login-divider"><span>or</span></div>
      <button className="token-login" type="button" onClick={() => setTokenDialog(true)}><span aria-hidden="true">⌘</span> Log in with API token</button>
      <p className="login-terms">By continuing, you agree to the <a href="/?legal=terms">Terms</a> &amp; <a href="/?legal=privacy">Privacy Policy</a>.</p>
    </section>
    {import.meta.env.DEV && <a className="preview-link login-preview" href="/?preview">Open desk preview</a>}
  </main>;
  return <><div className="site-backdrop" aria-hidden="true">
    {settings.backgroundUrl.match(/\.(mp4|webm)(\?|$)/i) ? <video className="backdrop-video" autoPlay muted loop playsInline preload="metadata" poster="/media/brandyfx-background-poster.jpg"><source src={settings.backgroundUrl} /></video> : <img className="backdrop-image" src={settings.backgroundUrl} alt="" />}
  </div><div className="backdrop-shade" aria-hidden="true" />
  {!settingsReady && !preview && <div className="brand-loader" role="status" aria-label="Loading BrandyFx"><img src="/brand/brandyfx-app-icon.png" alt=""/><span>BrandyFx</span></div>}
  {publicLegal ? <>{page}</> : privateHome ? page : <>{showingDesk || member.account || member.admin ? <header className={`top${member.admin ? ' top-admin' : ''}${member.account && !member.admin ? ' top-member' : ''}`}><a className="wordmark" href="/?home"><Mark />BrandyFx</a>
    <nav aria-label="Main navigation">
      {preview && <a className="quiet" href="/">Exit preview</a>}
      {member.admin && <><button className="quiet" aria-pressed={tab === 'desk'} onClick={() => setTab('desk')}>Desk</button>
        <button className="quiet" aria-pressed={tab === 'admin'} onClick={() => setTab('admin')}>Clients</button>
        <button className="quiet" aria-pressed={tab === 'reviews'} onClick={() => setTab('reviews')}>Reviews</button>
        <a className="quiet" href="/kingz.html">Site settings</a></>}
      {(member.admin || member.account) ? <button className="quiet" disabled={pending} onClick={() => void run('logout')}>Sign out</button> : null}
    </nav>
  </header> : null}
    {notice && !deviceConflict && <p className={showingDesk ? 'notice layout' : 'notice login-notice'} role="alert">{notice}</p>}{page}
    {showingDesk || member.account || member.admin ? <footer className="layout"><span className="footer-brand"><Mark />BrandyFx</span><span>{DEVELOPMENT_SIGNAL_SIMULATION ? 'Development market data' : preview ? 'Design preview with sample data' : 'Signals for Deriv Options'}</span></footer> :
      <footer className="risk-footer"><nav aria-label="Legal"><a href="/?legal=terms">Terms</a><a href="/?legal=privacy">Privacy Policy</a></nav><details className="risk-disclaimer"><summary>Trading risk disclaimer</summary><p><strong>Disclaimer:</strong> {derivDisclaimer}</p></details></footer>}
    </>}
    {tokenDialog && <div className="dialog-scrim" onMouseDown={event => { if (event.target === event.currentTarget && !pending) { setTokenDialog(false); setTokenValue(''); } }}>
      <section className="token-dialog" role="dialog" aria-modal="true" aria-labelledby="token-title">
        <button className="dialog-close" type="button" aria-label="Close" disabled={pending} onClick={() => { setTokenDialog(false); setTokenValue(''); }}>×</button>
        <h2 id="token-title">Log in with API token</h2>
        <p>Verify the Deriv Options accounts connected to your token.</p>
        <form onSubmit={submitToken}>
          <label>Deriv API token<input type="password" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={4096} required value={tokenValue} onChange={event => setTokenValue(event.target.value)} /></label>
          <p className="token-note">Use a token with the trade permission and an active real ROT account. The token is sent securely for verification and is not saved by BrandyFx.</p>
          {notice && <p className="token-note" role="alert">{notice}</p>}
          <button className="primary" type="submit" disabled={pending || !tokenValue.trim()}>{pending ? 'Verifying with Deriv…' : 'Verify and sign in'}</button>
        </form>
      </section>
    </div>}
    {installOpen && member.account && <div className="dialog-scrim install-scrim"><section className="token-dialog install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-title"><button className="dialog-close" type="button" aria-label="Close" onClick={() => { localStorage.setItem('bfx-install-dismissed', '1'); setInstallOpen(false); }}>×</button><p className="landing-kicker">BrandyFx app</p><h2 id="install-title">Install BrandyFx</h2><p>Add BrandyFx to your home screen for quick access to your signal workspace.</p>{installPrompt ? <button className="primary" type="button" onClick={() => void installApp()}>Install app</button> : <p className="install-help">Use your browser menu and choose “Install app” or “Add to Home screen”.</p>}<button className="install-later" type="button" onClick={() => { localStorage.setItem('bfx-install-dismissed', '1'); setInstallOpen(false); }}>Continue in browser</button></section></div>}
  </>;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

createRoot(document.getElementById('root')!).render(<App />);
