import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

export type MarketSample = { symbol: string; name: string; quote: string; updated: string; live: boolean };
export type PublicSettings = {
  backgroundUrl: string;
  videoOpacity: number;
  glassOpacity: number;
  regularPrice: number;
  premiumPrice: number;
  regularOffer: number;
  premiumOffer: number;
  regularDays: number;
  premiumDays: number;
  riseFallPrice: number;
  riseFallOffer: number;
  riseFallDays: number;
  overUnderPrice: number;
  overUnderOffer: number;
  overUnderDays: number;
  matchesPrice: number;
  matchesOffer: number;
  matchesDays: number;
  offerActive: boolean;
  offerEndsAt: string;
  promoHeading: string;
  promoSubheading: string;
  trc20Wallet: string;
  socialEmail: string;
  socialWhatsApp: string;
  socialTelegram: string;
  socialInstagram: string;
};

const tabs = [
  ['home', 'Home'], ['free-bots', 'Free Bots'], ['process', 'How it works'],
  ['account-management', 'Account management'], ['reviews', 'Read reviews'], ['pricing', 'Pricing'], ['refund', 'Refund policy'], ['faq', 'FAQ'],
] as const;

type SocialKey = 'socialEmail' | 'socialWhatsApp' | 'socialTelegram' | 'socialInstagram';
const socialMeta: { key: SocialKey; label: string; kind: 'email' | 'whatsapp' | 'telegram' | 'instagram' }[] = [
  { key: 'socialEmail', label: 'Email', kind: 'email' },
  { key: 'socialWhatsApp', label: 'WhatsApp', kind: 'whatsapp' },
  { key: 'socialTelegram', label: 'Telegram', kind: 'telegram' },
  { key: 'socialInstagram', label: 'Instagram', kind: 'instagram' },
];

function socialHref(settings: PublicSettings, key: SocialKey) {
  const value = settings[key].trim();
  if (!value) return '';
  return key === 'socialEmail' ? `mailto:${value}` : value;
}

function SocialGlyph({ kind }: { kind: (typeof socialMeta)[number]['kind'] }) {
  const paths = {
    email: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    whatsapp: <><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z"/><path d="M9 8.5c.4-.6.8-.5 1.1 0l.6 1.4c.1.3 0 .5-.2.8l-.5.6c.6 1.1 1.4 1.9 2.6 2.5l.6-.6c.2-.2.5-.3.8-.1l1.4.6c.4.2.5.6.2 1-.5.7-1.3 1-2.1.8-2.8-.6-5.3-3.1-5.8-5.8-.1-.5.4-1.1 1.3-1.2Z"/></>,
    telegram: <path d="m21 4-3.2 16-5.1-4-2.7 2.6.4-4.7L18 7l-9.5 5.7-4.2-1.4L21 4Z"/>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>;
}

function SocialLinks({ settings, className = '' }: { settings: PublicSettings; className?: string }) {
  const links = socialMeta.filter(({ key }) => socialHref(settings, key));
  if (!links.length) return null;
  return <nav className={`site-social-links ${className}`} aria-label="Contact BrandyFx">
    {links.map(({ key, label, kind }) => <a key={key} href={socialHref(settings, key)} aria-label={label}
      title={label} target={key === 'socialEmail' ? undefined : '_blank'} rel={key === 'socialEmail' ? undefined : 'noreferrer'}>
      <SocialGlyph kind={kind}/><span>{label}</span>
    </a>)}
  </nav>;
}

const freeBots = [
  { name: 'Mavic Rise/Fall', category: 'Rise / Fall', description: 'Rise/Fall strategy preset. Review duration, stake and limits before running.', file: 'mavic-air-rise-fall.xml', fxproFile: 'Mavic-Air-RF Vix Bot.xml' },
  { name: 'Turbo O/U', category: 'Over / Under', description: 'Over/Under strategy preset with configurable stake progression.', file: 'turbo-over-under.xml', fxproFile: 'Turbo O_U Accelerator.xml' },
  { name: 'Core Bot V3', category: 'Matches / Differs', description: 'Core strategy preset with a Matches/Differs contract. Inspect conditions and money management.', file: 'core-bot-v3.xml', fxproFile: 'Core Bot V3.xml' },
  { name: 'One-Tick Over 2', category: 'Digit Over', description: 'One-tick digit-over preset with its threshold set in the bot configuration.', file: 'one-tick-over-2.xml', fxproFile: '1 tick DIgit Over 2.xml' },
  { name: 'Legacy Over 2026', category: 'Digit Over', description: 'Digit-over preset with configurable prediction and stake progression.', file: 'legacy-over-2026.xml', fxproFile: 'Legacy 2026 Over.xml' },
  { name: 'Ultra Recovery', category: 'Recovery', description: 'Recovery-style preset. Review its stake progression and loss limits before use.', file: 'ultra-recovery.xml', fxproFile: 'Ultra Recovery.xml' },
  { name: 'Elite Startrader', category: 'Digit analysis', description: 'Trading preset with digit analysis and configurable prediction settings.', file: 'elite-startrader.xml', fxproFile: 'Elite Startrader.xml' },
  { name: 'Market Legend v2', category: 'General strategy', description: 'General-purpose strategy preset. Inspect contract and risk settings before running.', file: 'market-legend-v2.xml', fxproFile: 'Market Legend v2.xml' },
  { name: 'Godzilla', category: 'Multi-setting', description: 'Multi-setting strategy preset. Review all risk controls in Builder first.', file: 'godzilla.xml', fxproFile: 'Godzilla.xml' },
  { name: 'Signals Under', category: 'Digit Under', description: 'Digit-under signal strategy preset with editable threshold settings.', file: 'signals-under.xml', fxproFile: 'signals under bot.xml' },
];

const planCards = [
  { key: 'riseFall', title: 'Rise / Fall', tier: 'REGULAR ACCESS', name: 'Rise / Fall Desk', description: 'Access focused on directional Rise/Fall signals.', bot: 'Mavic Rise/Fall', highlight: 'Directional signals', vip: false },
  { key: 'overUnder', title: 'Over 6 / Under 3', tier: 'REGULAR ACCESS', name: 'Digit Desk', description: 'Access focused on Over 6 and Under 3 digit signals.', bot: 'Turbo O/U', highlight: 'Digit thresholds', vip: false },
  { key: 'matches', title: 'Matches only', tier: 'PREMIUM · V.I.P ONLY', name: 'Matches V.I.P. Desk', description: 'Exclusive Matches signals with the BrandyFx V.I.P. support circle.', bot: 'Core Bot V3', highlight: 'Matches signals', vip: true },
] as const;

const steps = [
  ['01', 'Read the live feed', 'Follow Deriv tick data and keep the current price context close to each signal.'],
  ['02', 'Review the setup', 'Choose a signal family, check the market and expiry, then review recent signal history.'],
  ['03', 'Make your own trade', 'Signals are information for your decision. Choose your own stake and manage your own risk.'],
];

const faqs = [
  ['Is signal accuracy guaranteed?', 'No. Signals are not guarantees of profit. Market conditions change, and you can lose some or all of the money you trade. Use the feed as information and make your own decisions.'],
  ['Which Deriv markets are covered?', 'BrandyFx follows Deriv volatility indices including V10, V25, V50, V75 and V100, subject to live market availability.'],
  ['Which signal families are available?', 'Rise / Fall, Over 6 / Under 3 and Matches / Differs.'],
  ['Do I need trading experience?', 'Familiarity with Deriv helps. Take time to understand the contract you choose and how its stake and duration affect your risk.'],
  ['How do I get access?', 'Sign in with Deriv, choose an access plan and follow the TRC20 payment instructions. Your payment reference is reviewed before access is granted.'],
];

const reviewCountries = [
  { country: 'Kenya', code: 'ke', first: ['Amani', 'Wanjiku', 'Kamau', 'Nia'], last: ['Mwangi', 'Otieno', 'Wanjala', 'Njoroge'] },
  { country: 'Nigeria', code: 'ng', first: ['Chika', 'Adaeze', 'Tunde', 'Ife'], last: ['Okafor', 'Bello', 'Eze', 'Afolayan'] },
  { country: 'Ghana', code: 'gh', first: ['Ama', 'Kojo', 'Abena', 'Yaw'], last: ['Mensah', 'Owusu', 'Boateng', 'Asante'] },
  { country: 'South Africa', code: 'za', first: ['Lerato', 'Thandi', 'Sipho', 'Amara'], last: ['Mokoena', 'Naidoo', 'Dlamini', 'Botha'] },
  { country: 'Jamaica', code: 'jm', first: ['Tiana', 'Andre', 'Shanice', 'Malik'], last: ['Campbell', 'Brown', 'Clarke', 'Morgan'] },
  { country: 'Canary Islands, Spain', code: 'es', flagLabel: 'Spain (Canary Islands)', first: ['Lucía', 'Mateo', 'Nerea', 'Diego'], last: ['Suárez', 'Díaz', 'García', 'Morales'] },
  { country: 'Tanzania', code: 'tz', first: ['Neema', 'Baraka', 'Asha', 'Jabari'], last: ['Mushi', 'Mwakalinga', 'Mhando', 'Juma'] },
  { country: 'Uganda', code: 'ug', first: ['Achieng', 'Kato', 'Nabirye', 'Mugisha'], last: ['Okello', 'Ssemanda', 'Nakamya', 'Tumusiime'] },
  { country: 'Zimbabwe', code: 'zw', first: ['Tariro', 'Tendai', 'Nyasha', 'Tawanda'], last: ['Moyo', 'Ndlovu', 'Dube', 'Mutsvairo'] },
  { country: 'Trinidad and Tobago', code: 'tt', first: ['Aaliyah', 'Ravi', 'Keisha', 'Dylan'], last: ['Joseph', 'Persad', 'Williams', 'Ramdeen'] },
  { country: 'Barbados', code: 'bb', first: ['Jada', 'Andre', 'Kiera', 'Jamal'], last: ['Clarke', 'Best', 'Hinds', 'Gittens'] },
];
const reviewCopy = [
  'The live price context makes it easier to review a setup before deciding what to do.',
  'I can compare the signal families without losing track of the selected market.',
  'It helps to have the current quote close to the signal history.',
  'The risk reminders make the product limits clear while I explore the desk.',
  'The page keeps Rise / Fall and digit setups easy to scan.',
  'I can check the market first and make my own decision about any trade.',
  'The market and expiry details are easy to find when I review a setup.',
  'It is useful to see the signal family beside the latest price.',
  'The clear risk notes help me remember that every trade is my decision.',
  'I can follow the tick context without losing sight of the signal history.',
];

function sampleReview(round: number, index: number) {
  const country = reviewCountries[(round + index) % reviewCountries.length];
  const firstName = country.first[(round * 3 + index) % country.first.length];
  const lastName = country.last[(round * 2 + index) % country.last.length];
  return { country: country.country, countryCode: country.code, name: `${firstName} ${lastName}`, text: reviewCopy[(round + index * 2) % reviewCopy.length] };
}

function ReviewCarousel() {
  const [round, setRound] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setRound(value => value + 1), 7200);
    return () => clearInterval(timer);
  }, []);
  const reviews = Array.from({ length: 10 }, (_, index) => sampleReview(round, index));
  return <>
    <p className="review-disclosure">Illustrative samples only. These names and statements are generated examples, not reviews from real customers.</p>
    <div className="review-wall" aria-live="off">
      {reviews.map((review, index) => <article className={`review-card review-v${((round + index) % 10) + 1}`} key={`${round}-${review.countryCode}-${index}`}>
        <div className="review-card-top"><span className="review-quote-mark" aria-hidden="true">“</span></div>
        <p className="review-copy">{review.text}</p>
        <div className="review-person"><span className="review-flag"><img src={`https://flagcdn.com/w40/${review.countryCode}.png`} alt={`Flag of ${review.countryCode === 'es' && review.country.startsWith('Canary') ? 'Spain, for the Canary Islands' : review.country}`} loading="lazy" referrerPolicy="no-referrer" /></span><span><b>{review.name}</b><small>{review.country}</small></span></div>
      </article>)}
    </div>
  </>;
}

function AccountManagement({ whatsapp }: { whatsapp: string }) {
  const [form, setForm] = useState({ name: '', amount: '100', startDate: '' });
  const [reference, setReference] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [whatsappHref, setWhatsappHref] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice('');
    try {
      const response = await fetch('/api/account-management', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, amount: Number(form.amount), startDate: form.startDate }) });
      const data = await response.json() as { id?: string | number; error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not save your request.');
      const id = String(data.id || '');
      setReference(id);
      if (whatsapp) {
        const url = new URL(whatsapp);
        url.searchParams.set('text', `Hello Brandy, I would like to discuss account management. My name is ${form.name.trim()}. Starting amount: USD ${Number(form.amount).toFixed(2)}. Preferred start date: ${form.startDate}. Request reference: ${id}. I understand this is an enquiry only; returns are not guaranteed.`);
        setWhatsappHref(url.toString());
      } else setNotice('Your request was saved, but BrandyFx has not configured its WhatsApp contact yet.');
    } catch (cause) { setNotice((cause as Error).message || 'Could not save your request.'); }
    finally { setBusy(false); }
  }
  return <section className="tab-page account-management-page" aria-labelledby="page-title">
    <header className="tab-heading"><p className="landing-kicker">Client enquiries</p><h1 id="page-title">Account management,<br/>with risk in view.</h1><p>Request a conversation about account-management or pool-trading options. This form records an enquiry only; it does not start trading or authorize access to your Deriv account.</p></header>
    <div className="management-layout">
      <section className="management-details">
        <article className="management-panel"><p className="landing-kicker">Starting capital · Illustrative goals</p><h2>One step at a time</h2><div className="capital-ladder">{[100, 200, 300, 400, 500, 600].map(amount => <div key={amount}><span>From USD {amount}</span><strong>Example goal · USD {(amount * 10).toLocaleString('en-US')}</strong></div>)}</div><p>These are examples only, not forecasts or promises. There is no set timeline, and you could lose some or all of your capital.</p></article>
        <article className="management-panel"><p className="landing-kicker">Before you proceed</p><ul><li>Keep your password, verification codes, and login under your control. Never send them to anyone.</li><li>You remain responsible for your Deriv account and all deposits and withdrawals.</li><li>Trading and pool trading carry substantial risk. Past or target results are not guaranteed.</li><li>The proposed 50/50 share of realized profits is not promised or applied by this enquiry. Any account management, pool trading, or profit-sharing would require licensing and legal review, a written agreement, and confirmation it is allowed by Deriv's terms.</li></ul></article>
      </section>
      <form className="management-form" onSubmit={submit}>
        <p className="landing-kicker">Start a conversation</p><h2>Send an enquiry</h2>
        <label>Your name<input autoComplete="name" maxLength={100} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required/></label>
        <label>Starting amount (USD)<input type="number" min="100" max="600" step="0.01" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} required/><small>Choose an amount from USD 100 to USD 600.</small></label>
        <label>Preferred start date<input type="date" min={today} value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })} required/></label>
        <label className="management-consent"><input type="checkbox" required/>I understand this is an enquiry only and does not guarantee returns or authorize anyone to access my account.</label>
        {notice && <p className="admin-message" role="status">{notice}</p>}
        {reference ? <><p className="admin-message" role="status">Enquiry {reference} saved for BrandyFx admin review.</p>{whatsappHref && <a className="landing-primary management-submit" href={whatsappHref} target="_blank" rel="noreferrer">Send enquiry via WhatsApp <span aria-hidden="true">↗</span></a>}</>
          : <button className="landing-primary management-submit" disabled={busy}>{busy ? 'Saving enquiry…' : 'Save and continue to WhatsApp'} <span aria-hidden="true">↗</span></button>}
      </form>
    </div>
  </section>;
}

const refundSections = [
  { title: 'OVERVIEW', body: <>BrandyFx is committed to ensuring every trader's satisfaction with our AI-powered market analysis tool. This policy outlines the terms and conditions for requesting refunds on your purchase.</> },
  { title: 'MONEY-BACK GUARANTEE', body: <>We offer a <strong>30-day money-back guarantee</strong> on all BrandyFx purchases. If you are not satisfied with the tool or our service within 30 days of purchase, you are eligible for a full refund.</>, highlight: <><strong>♛ Guaranteed:</strong> Full refund within 30 days of your purchase date. No complicated process. No questions asked.</> },
  { title: 'REFUND ELIGIBILITY', body: <>To be eligible for a refund, the following conditions must be met:</>, list: ['Your request must be submitted within 30 days of the original purchase date', 'You must provide proof of payment (transaction hash or payment confirmation)', 'Your account must not have violated our Terms of Service', 'You have not shared or distributed access credentials to third parties'] },
  { title: 'HOW TO REQUEST', body: <>Follow these steps to submit your refund request:</>, ordered: [<>Contact our support team at <a href="mailto:matchkingofficial@gmail.com">matchkingofficial@gmail.com</a> with the subject line <strong>"Refund Request"</strong></>, 'Provide the email address associated with your purchase and the date of purchase', 'Include your transaction hash or payment confirmation screenshot', 'Briefly explain your reason for the refund request', <>Our team will review your request and respond within <strong>3–5 business days</strong></>] },
  { title: 'REFUND PROCESSING', body: <>Once your refund request is approved, we will process the refund to the original payment address. Please note the following timelines:</>, list: [<><strong>USDT (TRC20) Refunds:</strong> 24–48 hours after approval</>, <><strong>Bank Transfer Refunds:</strong> 3–5 business days after approval</>, 'The refund will be sent to the wallet address from which the original payment originated'] },
  { title: 'NON-REFUNDABLE', body: 'The following are not eligible for refund:', list: ['Purchases made more than 30 days ago', 'Accounts suspended for Terms of Service violations', 'Duplicate or fraudulent transactions', 'Extended access plans purchased after the initial 30-day period'] },
  { title: 'ACCOUNT DEACTIVATION', body: <>Upon successful refund processing, your BrandyFx account will be automatically deactivated. All access to the tool will be revoked and you will no longer be able to log in or access any previously downloaded resources.</> },
  { title: 'PARTIAL REFUNDS', body: 'Partial refunds are only granted in the following circumstances:', list: ['Duplicate charges detected on your account', 'Service unavailability due to technical issues for extended periods (more than 7 days)', 'At the sole discretion of our support team for exceptional circumstances'] },
  { title: 'DISPUTES & CHARGEBACKS', body: <>If you initiate a chargeback or dispute with your payment provider <strong>without contacting our support team first</strong>, your account will be permanently suspended and all access revoked immediately.</>, highlight: <> <strong>We strongly recommend</strong> contacting us directly at <a href="mailto:matchkingofficial@gmail.com">matchkingofficial@gmail.com</a> or via WhatsApp before pursuing any chargeback action. We will always work with you to find a fair resolution.</> },
  { title: 'CONTACT US', body: <>If you have questions about this policy or need to submit a refund request, reach the BrandyFx team through any of these channels:</>, contacts: true },
];

function tabHref(tab: string) {
  return tab === 'home' ? '/?home' : `/?home&tab=${tab}`;
}

function Countdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000));
  const units = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60];
  return <div className="package-countdown" role="timer" aria-label={`Launch offer ends in ${units[0]} days, ${units[1]} hours, ${units[2]} minutes and ${units[3]} seconds`}>
    <span>Offer ends in</span>{units.map((unit, index) => <span className="countdown-part" key={index}>
      {index > 0 && <i aria-hidden="true">:</i>}<b>{String(unit).padStart(2, '0')}</b>{index === 0 && <small>d</small>}
    </span>)}
  </div>;
}

function PackageCard({ plan, settings, onCheckout }: { plan: (typeof planCards)[number]; settings: PublicSettings; onCheckout: () => void }) {
  const base = settings[`${plan.key}Price`];
  const offer = settings[`${plan.key}Offer`];
  const amount = settings.offerActive ? offer : base;
  const discount = settings.offerActive && base > 0 ? Math.max(0, Math.round((base - offer) * 100 / base)) : 0;
  const days = settings[`${plan.key}Days`];
  return <article className={`package-card${plan.key === 'matches' ? ' premium-package' : ''}`}>
    <span className="package-tag">{plan.tier}</span><h2 className="package-name">{plan.title}</h2>
    {settings.offerActive && <><div className="package-promo"><span>{settings.promoHeading}</span></div><p className="package-promo-sub">{settings.promoSubheading}</p></>}
    <div className="package-price">
      {discount > 0 && <span className="package-discount">{discount}% OFF</span>}
      <strong className="package-current">${amount.toFixed(0)}</strong>
      {discount > 0 && <s className="package-previous">${base.toFixed(0)}</s>}
    </div>
    {settings.offerActive && settings.offerEndsAt && <Countdown endsAt={settings.offerEndsAt} />}
    <p className="package-intro">{plan.description}</p>
    <ul className="package-features">
      <li>Live Deriv volatility market context</li>
      <li>{plan.highlight} and signal history</li>
      <li>One free Pipforge bot: {plan.bot}</li>
      <li>Risk reminders and your own trade decisions</li>
      <li>{days > 0 ? `${days} days of access` : 'Access term set by BrandyFx'}</li>
      {plan.vip && <><li>Private V.I.P. WhatsApp channel</li><li>Priority WhatsApp contact with faster responses</li><li>Educational tips on earning workflows with third-party Deriv apps and partnership information; no earnings are guaranteed</li></>}
    </ul>
    <button className="landing-primary package-action" type="button" onClick={onCheckout}>Pay with USDT <span aria-hidden="true">↗</span></button>
    <a className="package-refund-link" href={tabHref('refund')}>Refunds are available to every client · Read policy ↗</a>
    <small>Card and M-Pesa coming soon</small>
  </article>;
}

function PurchaseDialog({ plan, settings, onClose }: { plan: (typeof planCards)[number]; settings: PublicSettings; onClose: () => void }) {
  const base = settings[`${plan.key}Price`];
  const amount = settings.offerActive ? settings[`${plan.key}Offer`] : base;
  const [form, setForm] = useState({ name: '', email: '', country: '', rotNumber: '', transactionHash: '' });
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => { window.removeEventListener('keydown', closeOnEscape); document.body.style.overflow = previousOverflow; };
  }, [onClose]);
  const whatsappProof = () => {
    if (!settings.socialWhatsApp || !orderId) return '';
    try {
      const url = new URL(settings.socialWhatsApp);
      const message = `Hi Brandy, my name is ${form.name.trim()} and I have paid USD ${amount.toFixed(2)} in USDT for ${plan.title}. Country: ${form.country.trim()}. Deriv/ROT number: ${form.rotNumber.trim().toUpperCase()}. Email: ${form.email.trim()}. Transaction hash: ${form.transactionHash.trim().toUpperCase()}. Order: ${orderId}.`;
      url.searchParams.set('text', message);
      return url.toString();
    } catch { return ''; }
  };
  async function copyWallet() {
    try { await navigator.clipboard.writeText(settings.trc20Wallet); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError('Copy is unavailable here. Select and copy the TRC20 address.'); }
  }
  async function saveOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: plan.key, amount, name: form.name, email: form.email, country: form.country, rotNumber: form.rotNumber, transactionHash: form.transactionHash }) });
      const text = await response.text();
      const data = JSON.parse(text) as { id?: string; error?: string };
      if (!response.ok) throw new Error(data.error || 'Please check your details and try again.');
      setOrderId(data.id || '');
    } catch (cause) { setError((cause as Error).message || 'Could not save your order.'); }
    finally { setBusy(false); }
  }
  return <div className="purchase-scrim" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="purchase-dialog" role="dialog" aria-modal="true" aria-labelledby="purchase-title">
      <header className="purchase-heading"><div><p className="landing-kicker">PAYMENT · TRC20</p><h2 id="purchase-title">{plan.name} — ${amount.toFixed(2)}</h2></div><button type="button" className="purchase-close" onClick={onClose} aria-label="Close payment window">×</button></header>
      {orderId ? <div className="purchase-confirmation"><p className="purchase-step">02 · CONFIRM WITH BRANDYFX</p><h3>Your payment details are saved.</h3><p>Reference <strong>{orderId}</strong> is in the admin review list. Send the transaction hash to BrandyFx on WhatsApp to complete your proof.</p>
        {whatsappProof() ? <a className="purchase-submit" href={whatsappProof()} target="_blank" rel="noreferrer">Send proof via WhatsApp <span aria-hidden="true">↗</span></a> : <p className="purchase-error">WhatsApp contact is not configured yet. Add the business WhatsApp link in <a href="/kingz.html">Site settings</a>.</p>}
        <button className="landing-secondary" type="button" onClick={onClose}>Close</button></div> : <>
        <div className="purchase-steps"><span aria-current="step">01 · PAYMENT</span><span>02 · VERIFY</span></div>
        <p className="purchase-intro">Send exactly <strong>${amount.toFixed(2)} USDT</strong> using the TRON network (TRC20), then save your details.</p>
        <div className="purchase-address"><span>USDT TRC20 ADDRESS</span><code>{settings.trc20Wallet || 'Wallet address will be published before payments open.'}</code><button type="button" onClick={() => void copyWallet()} disabled={!settings.trc20Wallet}>{copied ? 'COPIED' : 'COPY'}</button></div>
        <p className="purchase-warning">⚠ Send USDT on the TRON (TRC20) network only. Transfers on other networks cannot be processed.</p>
        <form className="purchase-form" onSubmit={saveOrder}>
          <label>Your name<input autoComplete="name" maxLength={100} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required /></label>
          <label>Your email<input type="email" autoComplete="email" maxLength={254} value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required /></label>
          <label>Country<input autoComplete="country-name" maxLength={90} value={form.country} onChange={event => setForm({ ...form, country: event.target.value })} required /></label>
          <label>Deriv ROT / account number<input autoComplete="off" maxLength={40} value={form.rotNumber} onChange={event => setForm({ ...form, rotNumber: event.target.value })} required /><small>Use the Deriv account ID you will use to sign in.</small></label>
          <label className="purchase-hash">Transaction hash<input autoComplete="off" minLength={64} maxLength={64} pattern="[A-Fa-f0-9]{64}" value={form.transactionHash} onChange={event => setForm({ ...form, transactionHash: event.target.value })} placeholder="64-character TRON transaction hash" required /></label>
          {error && <p className="purchase-error" role="alert">{error}</p>}
          <button className="purchase-submit" disabled={busy || !settings.trc20Wallet || !settings.socialWhatsApp || !settings[`${plan.key}Days`]}>{busy ? 'Saving…' : 'Save details & continue'} <span aria-hidden="true">→</span></button>
          {(!settings.trc20Wallet || !settings.socialWhatsApp || !settings[`${plan.key}Days`]) && <small className="purchase-config-note">Payments open after BrandyFx configures the wallet, WhatsApp contact and access term in site settings.</small>}
        </form>
      </>}
    </section>
  </div>;
}

export default function Landing({ markets, tab, settings }: { markets: MarketSample[]; tab: string; settings: PublicSettings }) {
  const [purchasePlan, setPurchasePlan] = useState<(typeof planCards)[number] | null>(null);
  const shownMarkets = markets.slice(0, 5);
  const pageTabs = ['refund', 'privacy', 'terms', 'contact'];
  const currentTab = tabs.some(([id]) => id === tab) || pageTabs.includes(tab) ? tab : 'home';
  const live = shownMarkets.some(market => market.live);
  let content;

  if (currentTab === 'home') content = <section className="landing-hero" aria-labelledby="landing-title">
    <div className="landing-hero-copy">

      <h1 id="landing-title">Read the move.<br />Trade with intent.</h1>
      <p className="landing-lede">BrandyFx turns live Deriv ticks into clear signal setups for Rise / Fall, Over 6 / Under 3, and Matches / Differs.</p>
      <div className="landing-actions"><a className="landing-primary" href={tabHref('pricing')}>Explore access <span aria-hidden="true">↗</span></a><a className="landing-secondary" href="/?preview">See the signal desk</a></div>
      <dl className="landing-facts"><div><dt>Signal families</dt><dd>03</dd></div><div><dt>Market source</dt><dd>Deriv ticks</dd></div><div><dt>Execution</dt><dd>In your hands</dd></div></dl>
    </div>
    <section className="landing-feed" aria-label="Live Deriv market prices">
      <div className="landing-feed-head"><div><h2>Live tick feed</h2></div><span className={live ? 'feed-status is-live' : 'feed-status'}><i aria-hidden="true" />{live ? 'Connected' : 'Waiting for feed'}</span></div>
      {shownMarkets.length ? <div className="landing-quotes">{shownMarkets.map(market => <div className="landing-quote" key={market.symbol}><span><strong>{market.name.replace('Volatility ', 'Vol ').replace(' Index', '')}</strong><small>{market.symbol}</small></span><b>{market.quote || '–'}</b></div>)}</div> : <p className="feed-empty">Current Deriv prices will appear here when the market feed is available.</p>}
      <p className="feed-foot">Prices are informational. They are not a promise of a signal or trading result.</p>
    </section>
  </section>;
  else if (currentTab === 'free-bots') content = <section className="tab-page free-bots-page" aria-labelledby="page-title">
    <header className="tab-heading"><h1 id="page-title">Free bots.<br />Built to inspect.</h1><p>Download ten XML strategy examples from the Pipforge collection and review every block before you run one.</p></header>
    <a className="pipforge-sponsor" href="https://www.fxprotrades.site" target="_blank" rel="noreferrer"><span className="sponsor-mark" aria-hidden="true">FX</span><span><small>BOT LIBRARY PARTNER</small><strong>Proudly sponsored by FXPro</strong></span><span className="sponsor-link">Visit FXProTrades ↗</span></a>
    <div className="free-bot-grid">{freeBots.map((bot, index) => <article className="free-bot-card" key={bot.file}>
      <div className="free-bot-top"><span className="free-bot-index">{String(index + 1).padStart(2, '0')}</span><span className="free-bot-category">{bot.category}</span></div>
      <h2>{bot.name}</h2><p>{bot.description}</p>
      <div className="free-bot-actions"><a className="free-bot-download" href={`/bots/${bot.file}`} download>{'Download XML'} <span aria-hidden="true">↓</span></a><a className="free-bot-open" href={`https://www.fxprotrades.site/?${new URLSearchParams({ bot: bot.fxproFile, tab: 'id-bot-builder' })}`} target="_blank" rel="noreferrer">Open in fxprotrades.site ↗</a></div>
    </article>)}</div>
    <p className="bot-risk-note">These XML files can automate trades. Inspect the contract, stake progression and loss limits in Deriv Bot, and test with a demo account before considering live use. Automation does not remove trading risk.</p>
  </section>;
  else if (currentTab === 'process') content = <section className="tab-page process-page" aria-labelledby="page-title"><header className="tab-heading"><h1 id="page-title">From live ticks<br />to a considered trade.</h1><p>Keep context in view, then make your own decision.</p></header><div className="process-list">{steps.map(([number, title, description]) => <article className="process-step" key={number}><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></article>)}</div></section>;
  else if (currentTab === 'account-management') content = <AccountManagement whatsapp={settings.socialWhatsApp}/>;
  else if (currentTab === 'reviews') content = <section className="tab-page reviews-section" aria-labelledby="page-title"><div className="tab-heading"><h1 id="page-title">Notes from the<br />community.</h1><p>Generated examples show how country-tagged feedback can appear.</p></div><ReviewCarousel/></section>;
  else if (currentTab === 'pricing') content = <section className="tab-page pricing-page" aria-labelledby="page-title"><header className="tab-heading"><h1 id="page-title">Choose your<br />signal desk.</h1><p>Separate access for each signal family. Every plan includes one free Pipforge bot to pair with its signals. Pay with USDT on TRC20.</p></header><div className="package-grid">{planCards.map(plan => <PackageCard key={plan.key} plan={plan} settings={settings} onCheckout={() => setPurchasePlan(plan)} />)}</div><p className="pricing-note">Pay only to the TRC20 address shown in the BrandyFx payment window. Verify the network and amount before sending.</p></section>;
  else if (currentTab === 'faq') content = <section className="tab-page faq-section" aria-labelledby="page-title"><header className="tab-heading"><h1 id="page-title">Questions,<br />answered.</h1></header><div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>;
  else if (currentTab === 'refund') content = <section className="tab-page legal-page" aria-labelledby="page-title"><header className="tab-heading"><p className="landing-kicker">Legal</p><h1 id="page-title">Refund<br/>policy.</h1><p>Last Updated: January 27, 2026</p></header>
    <div className="policy-guarantee"><img className="policy-brand-mark" src="/brand/brandyfx-app-icon.png" alt=""/><div><h2>Royal Guarantee</h2><p>We stand behind every purchase. If BrandyFx doesn't deliver, you get your money back — no runaround, no questions asked.</p></div><strong>48 HOURS<small>Back Guarantee</small></strong></div>
    <div className="policy-sections">{refundSections.map((section, index) => <article className="policy-section" key={section.title}><div className="section-heading"><span>{String(index + 1).padStart(2, '0')}</span><i/><h2>{section.title}</h2></div><p>{section.body}</p>
      {section.list && <ul>{section.list.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>}
      {section.ordered && <ol>{section.ordered.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ol>}
      {section.highlight && <aside>{section.highlight}</aside>}
      {section.contacts && <div className="policy-contact-grid"><a href="mailto:matchkingofficial@gmail.com"><b>Email</b><span>matchkingofficial@gmail.com</span></a><a href="https://wa.me/254100137846" target="_blank" rel="noreferrer"><b>WhatsApp</b><span>wa.me/254100137846</span></a><a href="https://wa.me/254100137846" target="_blank" rel="noreferrer"><b>Telegram</b><span>@matchkingofficial</span></a></div>}
    </article>)}</div><aside className="policy-update"><p><strong>♛ Policy Updates:</strong> BrandyFx reserves the right to update this refund policy at any time. Please check this page regularly for the latest information. Continued use of BrandyFx constitutes acceptance of our current refund policy.</p></aside>
  </section>;
  else if (currentTab === 'privacy' || currentTab === 'terms') content = <section className="tab-page legal-page" aria-labelledby="page-title"><header className="tab-heading"><p className="landing-kicker">Legal</p><h1 id="page-title">{currentTab === 'privacy' ? <>Privacy<br/>policy.</> : <>Terms of<br/>service.</>}</h1></header><article className="legal-placeholder"><h2>{currentTab === 'privacy' ? 'Privacy policy is being prepared.' : 'Terms of service are being prepared.'}</h2><p>We’ll publish the complete BrandyFx document here before enabling paid access.</p></article></section>;
  else content = <section className="tab-page legal-page" aria-labelledby="page-title"><header className="tab-heading"><p className="landing-kicker">Contact</p><h1 id="page-title">Reach<br/>BrandyFx.</h1><p>Use any configured channel to get in touch.</p></header><SocialLinks settings={settings} className="site-social-links-contact"/>{!socialMeta.some(({ key }) => socialHref(settings, key)) && <article className="legal-placeholder"><p>Contact channels will appear here once they are added in site settings.</p></article>}</section>;

  return <main className="landing">
    <header className="landing-nav">
      <a className="landing-brand" href={tabHref('home')} aria-label="BrandyFx home"><img src="/brand/brandyfx-app-icon.png" alt="" /><span>BrandyFx</span></a>
      <nav className="landing-tabs" aria-label="Main pages">{tabs.map(([id, label]) => <a key={id} href={tabHref(id)} aria-current={currentTab === id ? 'page' : undefined}>{label}</a>)}</nav>
      <div className="landing-nav-actions"><SocialLinks settings={settings} className="site-social-links-header"/><a className="landing-primary" href="/?preview">Open signal desk <span aria-hidden="true">↗</span></a></div>
    </header>
    {content}
    <footer className="landing-footer">
      <section className="footer-brand-block"><a className="landing-brand" href={tabHref('home')}><img src="/brand/brandyfx-app-icon.png" alt=""/><span>BrandyFx</span></a><p>Deriv signal intelligence for informed decisions.</p><SocialLinks settings={settings} className="site-social-links-footer"/></section>
      <nav className="footer-link-group" aria-label="Platform"><h2>Platform</h2><a href={tabHref('free-bots')}>Free Bots</a><a href={tabHref('process')}>How it works</a><a href={tabHref('pricing')}>Pricing</a><a href="/?preview">Access terminal</a></nav>
      <nav className="footer-link-group" aria-label="Community"><h2>Community</h2><a href={tabHref('reviews')}>Read reviews</a>{socialMeta.filter(({ key }) => key !== 'socialEmail' && socialHref(settings, key)).map(({ key, label }) => <a key={key} href={socialHref(settings, key)} target="_blank" rel="noreferrer">{label}</a>)}<a href={tabHref('contact')}>Contact</a></nav>
      <nav className="footer-link-group" aria-label="Legal"><h2>Legal</h2><a href="/?home&tab=privacy">Privacy policy</a><a href="/?home&tab=terms">Terms of service</a><a href="/?home&tab=refund">Refund policy</a></nav>
      <div className="landing-footer-bottom"><p><strong>Disclaimer:</strong> Deriv offers complex derivatives, such as options and contracts for difference (“CFDs”). These products may not be suitable for all clients, and trading them puts you at risk. You may lose some or all of the money you invest. Never trade with borrowed money or money you cannot afford to lose.</p><span>© BrandyFx</span></div>
    </footer>
    {purchasePlan && <PurchaseDialog plan={purchasePlan} settings={settings} onClose={() => setPurchasePlan(null)} />}
  </main>;
}
