import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { downloadReceipt, receiptMailto, type ReceiptDetails } from './receipt';

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
  evenOddPrice: number;
  evenOddOffer: number;
  evenOddDays: number;
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
  ['home', 'Home'], ['free-bots', 'Free Bots'], ['process', 'Digit guide'],
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

function SocialLinks({ settings, className = '', only }: { settings: PublicSettings; className?: string; only?: SocialKey[] }) {
  const links = socialMeta.filter(({ key }) => (!only || only.includes(key)) && socialHref(settings, key));
  if (!links.length) return null;
  return <nav className={`site-social-links ${className}`} aria-label="Contact BrandyFx">
    {links.map(({ key, label, kind }) => <a key={key} href={socialHref(settings, key)} aria-label={label}
      title={label} target={key === 'socialEmail' ? undefined : '_blank'} rel={key === 'socialEmail' ? undefined : 'noreferrer'}>
      <SocialGlyph kind={kind}/><span>{label}</span>
    </a>)}
  </nav>;
}

const freeBots = [
  { name: 'Matches Recovery Bot', category: 'Matches', description: 'Set the initial stake, prediction digit, martingale multiplier, stop loss and take profit in Deriv Bot.', file: 'matches-martingale.xml', fxproFile: 'Matches Recovery Bot.xml' },
  { name: 'Even Contract Bot', category: 'Even', description: 'Places Even digit contracts on a five tick duration with a fixed USD 1 stake. Change the market, duration, currency and stake in Deriv Bot before running.', file: 'even-contract.xml', fxproFile: 'Even Contract Bot.xml' },
  { name: 'Odd Contract Bot', category: 'Odd', description: 'Places Odd digit contracts on a five tick duration with a fixed USD 1 stake. Change the market, duration, currency and stake in Deriv Bot before running.', file: 'odd-contract.xml', fxproFile: 'Odd Contract Bot.xml' },
  { name: 'Alternate Even-Odd', category: 'Even / Odd', description: 'Alternates Even and Odd contracts. Review the entry conditions, stake and limits before running.', file: 'alternate-even-odd.xml', fxproFile: 'Alternate Even-Odd.xml' },
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

const packageBots: Record<string, { name: string; href: string }[]> = {
  evenOdd: [{ name: 'bfx-manipulation-evenodd.xml', href: '/bots/bfx-manipulation-evenodd.xml' }],
  overUnder: [{ name: 'bfx-manipulation-overunder.xml', href: '/bots/bfx-manipulation-overunder.xml' }],
  matches: [
    { name: 'bfx-manipulation-evenodd.xml', href: '/bots/bfx-manipulation-evenodd.xml' },
    { name: 'bfx-manipulation-overunder.xml', href: '/bots/bfx-manipulation-overunder.xml' },
    { name: 'bfx-manipulation-matches.xml', href: '/bots/bfx-manipulation-matches.xml' },
  ],
};

const planCards = [
  { key: 'evenOdd', title: 'Even / Odd', tier: 'REGULAR ACCESS', name: 'Even / Odd Desk', description: 'Access focused on Even and Odd digit signals.', highlight: 'Parity signals', vip: false },
  { key: 'overUnder', title: 'Over 6 / Under 3', tier: 'REGULAR ACCESS', name: 'Digit Desk', description: 'Access focused on Over 6 and Under 3 digit signals.', highlight: 'Digit thresholds', vip: false },
  { key: 'matches', title: 'Matches only', tier: 'PREMIUM · V.I.P ONLY', name: 'Matches V.I.P. Desk', description: 'Exclusive Matches signals with the BrandyFx V.I.P. support circle.', highlight: 'Matches signals', vip: true },
] as const;

const steps = [
  ['01', 'Read the final digit', 'Each Deriv tick ends with a digit from 0 to 9. The selected signal family describes how to interpret that digit.'],
  ['02', 'Check the contract details', 'Review the market, signal family, expiry and the payout shown by Deriv for the contract you choose. Payouts vary by market conditions and contract terms.'],
  ['03', 'Choose what to do', 'A signal is information for your review, not an instruction or an automatic trade. You choose whether to trade, your stake and how to manage risk.'],
];

const digitFamilies = [
  { index: '01 · PARITY', title: 'Even / Odd', description: 'Read whether the final digit is even (0, 2, 4, 6, 8) or odd (1, 3, 5, 7, 9). The signal names the side to review.' },
  { index: '02 · THRESHOLDS', title: 'Over 6 / Under 3', description: 'Over 6 refers to final digits 7, 8 or 9. Under 3 refers to 0, 1 or 2. Digits 3 through 6 fall outside those outcomes.' },
  { index: '03 · EXACT DIGIT', title: 'Matches', description: 'A Matches setup names a prediction digit from 0 to 9. The contract wins only if the final digit matches that prediction at expiry.' },
];

const faqs = [
  ['Is signal accuracy guaranteed?', 'No. Signals are not guarantees of profit. Market conditions change, and you can lose some or all of the money you trade. Use the feed as information and make your own decisions.'],
  ['Which Deriv markets are covered?', 'BrandyFx follows Deriv volatility indices including V10, V25, V50, V75 and V100, subject to live market availability.'],
  ['Which signal families are available?', 'Even / Odd, Over 6 / Under 3 and Matches.'],
  ['Do I need trading experience?', 'Familiarity with Deriv helps. Take time to understand the contract you choose and how its stake and duration affect your risk.'],
  ['How do I get access?', 'Sign in with your Deriv real ROT account, choose a package and follow the TRC20 payment instructions. Each package is a one-time lifetime purchase. BrandyFx reviews your payment before unlocking its signal tabs and included bot downloads.'],
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
  'The page keeps Even / Odd and digit setups easy to scan.',
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

const homeReviewSamples = [
  { text: 'I like how the Even / Odd signals sit beside the matching bot details. It is easy to understand what each setup refers to.', package: 'Even / Odd · Regular' },
  { text: 'The Over 6 / Under 3 desk makes the digit ranges clear, so I can review a signal before choosing what to do.', package: 'Over 6 / Under 3 · Regular' },
  { text: 'Matches V.I.P. gives me a focused view for exact digits, and the included bots are easy to find.', package: 'Matches · V.I.P.' },
  { text: 'I appreciate having the market context close to the signals. The layout makes the information simple to follow.', package: 'Even / Odd · Regular' },
  { text: 'The package details are clear, and I can see which bot goes with the signal family I selected.', package: 'Over 6 / Under 3 · Regular' },
  { text: 'I enjoy how the Matches setup names the prediction digit directly. It makes the idea easy to review.', package: 'Matches · V.I.P.' },
  { text: 'The signal history and latest price are together, which helps me check the context before making my own decision.', package: 'Even / Odd · Regular' },
  { text: 'The Over 6 / Under 3 guide explains the thresholds in a way that is quick to understand.', package: 'Over 6 / Under 3 · Regular' },
  { text: 'The VIP package brings the three signal tabs together, and the interface feels well organised.', package: 'Matches · V.I.P.' },
  { text: 'I like that the Even / Odd view keeps the final digit and the signal direction easy to spot.', package: 'Even / Odd · Regular' },
  { text: 'Finding the matching bot beside the desk makes it straightforward to keep the right file with the right signals.', package: 'Over 6 / Under 3 · Regular' },
  { text: 'The Matches page is uncluttered, and I can focus on the prediction digit and recent market context.', package: 'Matches · V.I.P.' },
  { text: 'BrandyFx makes the digit-based setup easy to scan on my phone. I can check the details without hunting around.', package: 'Even / Odd · Regular' },
  { text: 'I appreciate the clear reminders to review the contract and make my own trading decisions.', package: 'Over 6 / Under 3 · Regular' },
  { text: 'The signal tabs, bot downloads and package information are all easy to navigate.', package: 'Matches · V.I.P.' },
  { text: 'The Even / Odd signals are simple to scan, and I can find the matching bot without leaving the desk.', package: 'Even / Odd · Regular' },
  { text: 'I like that the Over 6 / Under 3 setup explains which digits fall inside each range.', package: 'Over 6 / Under 3 · Regular' },
  { text: 'The Matches V.I.P. package keeps the exact-digit signals together with the extra support details.', package: 'Matches · V.I.P.' },
  { text: 'The signals are presented clearly, and the reminders help me take time to review every trade.', package: 'Even / Odd · Regular' },
  { text: 'I can quickly check the current context and see whether a signal is Over 6 or Under 3.', package: 'Over 6 / Under 3 · Regular' },
  { text: 'I enjoy seeing the prediction digit called out directly in the Matches desk.', package: 'Matches · V.I.P.' },
  { text: 'The Even / Odd page is organised in a way that makes the recent setups easy to follow.', package: 'Even / Odd · Regular' },
  { text: 'Having the Over / Under guide and bot details close to the signals makes navigation easier.', package: 'Over 6 / Under 3 · Regular' },
  { text: 'The V.I.P. package gives me one place to review all three signal families.', package: 'Matches · V.I.P.' },
  { text: 'The market price and signal label are easy to compare on the Even / Odd tab.', package: 'Even / Odd · Regular' },
  { text: 'The Over 6 / Under 3 package information is clear, including which bot file is included.', package: 'Over 6 / Under 3 · Regular' },
  { text: 'The exact-digit format makes the Matches signal straightforward to understand.', package: 'Matches · V.I.P.' },
  { text: 'I like the clean layout and the way the Even / Odd signal history is presented.', package: 'Even / Odd · Regular' },
  { text: 'The signal desk helps me review the digit context while keeping the final decision in my hands.', package: 'Over 6 / Under 3 · Regular' },
  { text: 'It is convenient to have the Matches signals and included bot downloads grouped together.', package: 'Matches · V.I.P.' },
] as const;

function HomeReviewPreview() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex(value => (value + 1) % homeReviewSamples.length), 5200);
    return () => clearInterval(timer);
  }, []);
  const person = sampleReview(index, index);
  const review = homeReviewSamples[index];
  return <section className="landing-feed home-review-preview" aria-label="Generated illustrative review preview">
    <div className="landing-feed-head"><h2>Review preview</h2><span className="feed-status"><i aria-hidden="true" />Illustrative samples</span></div>
    <p className="home-review-disclosure">Generated examples only — these are not reviews from real customers.</p>
    <div className="home-review-stage" aria-live="off">
      <article className={`home-review-slide review-v${(index % 10) + 1}`} key={index}>
        <span className="review-quote-mark" aria-hidden="true">“</span>
        <p className="home-review-copy">{review.text}</p>
        <div className="home-review-person"><span className="review-flag"><img src={`https://flagcdn.com/w40/${person.countryCode}.png`} alt={`Flag of ${person.country}`} loading="lazy" referrerPolicy="no-referrer" /></span><span className="home-review-identity"><b>{person.name}</b><small>{person.country}</small></span><span className="home-review-package">{review.package}</span></div>
      </article>
    </div>
  </section>;
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

function PolicyContactLinks({ settings }: { settings: PublicSettings }) {
  const links = socialMeta.filter(({ key }) => settings[key].trim());
  if (!links.length) return <p>Contact channels will appear here when BrandyFx adds them in site settings.</p>;
  return <div className="policy-contact-grid">{links.map(({ key, label }) => <a key={key} href={socialHref(settings, key)} target={key === 'socialEmail' ? undefined : '_blank'} rel={key === 'socialEmail' ? undefined : 'noreferrer'}><b>{label}</b><span>{settings[key].trim()}</span></a>)}</div>;
}

function refundSections(settings: PublicSettings) {
  const email = settings.socialEmail.trim();
  const whatsapp = settings.socialWhatsApp.trim();
  return [
  { title: 'OVERVIEW', body: <>BrandyFx is committed to ensuring every trader's satisfaction with our AI-powered market analysis tool. This policy outlines the terms and conditions for requesting refunds on your purchase.</> },
  { title: 'MONEY-BACK GUARANTEE', body: <>We offer a <strong>30-day money-back guarantee</strong> on all BrandyFx purchases. If you are not satisfied with the tool or our service within 30 days of purchase, you are eligible for a full refund.</>, highlight: <><strong><img className="policy-inline-mark" src="/brand/brandyfx-app-icon.png" alt=""/> Guaranteed:</strong> Full refund within 30 days of your purchase date. No complicated process. No questions asked.</> },
  { title: 'REFUND ELIGIBILITY', body: <>To be eligible for a refund, the following conditions must be met:</>, list: ['Your request must be submitted within 30 days of the original purchase date', 'You must provide proof of payment (transaction hash or payment confirmation)', 'Your account must not have violated our Terms of Service', 'You have not shared or distributed access credentials to third parties'] },
  { title: 'HOW TO REQUEST', body: <>Follow these steps to submit your refund request:</>, ordered: [email ? <>Contact our support team at <a href={`mailto:${email}`}>{email}</a> with the subject line <strong>"Refund Request"</strong></> : <>Contact our support team through the channels listed below with the subject line <strong>"Refund Request"</strong></>, 'Provide the email address associated with your purchase and the date of purchase', 'Include your transaction hash or payment confirmation screenshot', 'Briefly explain your reason for the refund request', <>Our team will review your request and respond within <strong>3–5 business days</strong></>] },
  { title: 'REFUND PROCESSING', body: <>Once your refund request is approved, we will process the refund to the original payment address. Please note the following timelines:</>, list: [<><strong>USDT (TRC20) Refunds:</strong> 24–48 hours after approval</>, <><strong>Bank Transfer Refunds:</strong> 3–5 business days after approval</>, 'The refund will be sent to the wallet address from which the original payment originated'] },
  { title: 'NON-REFUNDABLE', body: 'The following are not eligible for refund:', list: ['Purchases made more than 30 days ago', 'Accounts suspended for Terms of Service violations', 'Duplicate or fraudulent transactions', 'Extended access plans purchased after the initial 30-day period'] },
  { title: 'ACCOUNT DEACTIVATION', body: <>Upon successful refund processing, your BrandyFx account will be automatically deactivated. All access to the tool will be revoked and you will no longer be able to log in or access any previously downloaded resources.</> },
  { title: 'PARTIAL REFUNDS', body: 'Partial refunds are only granted in the following circumstances:', list: ['Duplicate charges detected on your account', 'Service unavailability due to technical issues for extended periods (more than 7 days)', 'At the sole discretion of our support team for exceptional circumstances'] },
  { title: 'DISPUTES & CHARGEBACKS', body: <>If you initiate a chargeback or dispute with your payment provider <strong>without contacting our support team first</strong>, your account will be permanently suspended and all access revoked immediately.</>, highlight: <> <strong>We strongly recommend</strong> contacting us directly{email && <> at <a href={`mailto:${email}`}>{email}</a></>}{whatsapp && <> via <a href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a></>}{!email && !whatsapp && ' through a support channel listed below'} before pursuing any chargeback action. We will always work with you to find a fair resolution.</> },
  { title: 'CONTACT US', body: <>If you have questions about this policy or need to submit a refund request, reach the BrandyFx team through any of these channels:</>, contacts: true },
  ];
}

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

function PackageCard({ plan, settings, paidPayment, onCheckout }: { plan: (typeof planCards)[number]; settings: PublicSettings; paidPayment?: ClientPayment; onCheckout: () => void }) {
  const base = settings[`${plan.key}Price`];
  const offer = settings[`${plan.key}Offer`];
  const amount = settings.offerActive ? offer : base;
  const discount = settings.offerActive && base > 0 ? Math.max(0, Math.round((base - offer) * 100 / base)) : 0;
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
      {packageBots[plan.key].map(bot => <li key={bot.href}>Included bot: <code>{bot.name}</code></li>)}
      <li>Use the bot alongside your BrandyFx signal desk; check the latest signal before each trade.</li>
      <li>Signal access is restricted by your Deriv account, package and device. Downloaded XML bots are portable files and do not auto-sync or carry a per-client license lock; keep them for personal use and do not redistribute them.</li>
      <li>Risk reminders and your own trade decisions</li>
      <li>One-time purchase · lifetime access</li>
      {plan.vip && <><li>Private V.I.P. WhatsApp channel</li><li>Priority WhatsApp contact with faster responses</li><li>Educational tips on earning workflows with third-party Deriv apps and partnership information; no earnings are guaranteed</li></>}
    </ul>
    {paidPayment ? <a className="landing-primary package-action" href={`${tabHref('verify')}&paymentId=${encodeURIComponent(paidPayment.id)}`}>Paid · View package <span aria-hidden="true">↗</span></a> : <button className="landing-primary package-action" type="button" onClick={onCheckout}>Pay with USDT <span aria-hidden="true">↗</span></button>}
    <a className="package-refund-link" href={tabHref('refund')}>Refunds are available to every client · Read policy ↗</a>
    <small>Card and M-Pesa coming soon</small>
  </article>;
}

type ClientPayment = { id: string; status: string; created: string; revoked_at?: string | null; deleted_at?: string | null; package?: string; amount?: string; currency?: string; reference?: string; customer_name?: string; customer_email?: string; customer_country?: string; rot_number?: string };
type ClientProfile = { name: string; email: string; country: string; rot_number: string };

function VerifiedPurchase({ receipt, settings, packageKey }: { receipt: ReceiptDetails; settings: PublicSettings; packageKey: string }) {
  const bots = packageBots[packageKey] || [];
  return <section className="purchase-confirmation verified-purchase"><p className="purchase-step">02 · VERIFY</p><h3>Payment verified. Your package is ready.</h3>
    <p>Thank you for trusting BrandyFx. Your one-time purchase gives lifetime access to <strong>{receipt.package}</strong>. Download the matching Deriv Bot XML files below and use them alongside signals from your package. Check the signal desk before each trade; the XML bot does not automatically synchronize with BrandyFx.</p>
    <ul className="verified-bot-list">{bots.map(bot => <li key={bot.href}><span>{bot.name}</span><a className="landing-secondary" href={bot.href} download>Download XML</a></li>)}</ul>
    <p className="bot-access-note">Signal access is restricted by your Deriv account, package and device. These downloaded XML files are portable and do not have a per-client license lock, so keep them for your own use and do not redistribute them.</p>
    <div className="verified-receipt-actions"><button className="landing-secondary" type="button" onClick={() => downloadReceipt(receipt)}>Download receipt</button>
      {settings.socialEmail ? <a className="landing-primary" href={receiptMailto(settings.socialEmail, receipt)}>Email BrandyFx to verify ↗</a> : <p className="purchase-error">BrandyFx has not added a support email in site settings yet.</p>}</div>
    <small>The email button opens your email app with the payment details addressed to BrandyFx. Your receipt includes your package, amount, transaction hash, purchase date and Deriv ROT.</small>
  </section>;
}

function PurchaseDialog({ plan, settings, payment, profile, onClose }: { plan: (typeof planCards)[number]; settings: PublicSettings; payment?: ClientPayment; profile?: ClientProfile | null; onClose: () => void }) {
  const base = settings[`${plan.key}Price`];
  const amount = settings.offerActive ? settings[`${plan.key}Offer`] : base;
  const checkoutSetup = [
    !settings.trc20Wallet && 'add a TRC20 wallet address',
  ].filter(Boolean);
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
  const verified = Boolean(orderId && payment?.id === orderId && payment.status === 'approved' && !payment.revoked_at && !payment.deleted_at);
  const purchaseReceipt: ReceiptDetails = {
    id: orderId || payment?.id || 'pending', name: profile?.name || form.name, email: profile?.email || form.email,
    country: profile?.country || form.country, rot: profile?.rot_number || form.rotNumber.toUpperCase(),
    package: plan.title, amount, currency: 'USDT', reference: payment?.reference || form.transactionHash.toUpperCase(),
    created: payment?.created || new Date().toISOString(),
  };
  async function copyWallet() {
    try { await navigator.clipboard.writeText(settings.trc20Wallet); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError('Copy is unavailable here. Select and copy the TRC20 address.'); }
  }
  async function saveOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (checkoutSetup.length) {
      setError(`Checkout is paused: ${checkoutSetup.join(' and ')} in Site settings.`);
      return;
    }
    setBusy(true);
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
      {orderId && verified ? <VerifiedPurchase receipt={purchaseReceipt} settings={settings} packageKey={plan.key} /> : orderId ? <div className="purchase-confirmation"><p className="purchase-step">02 · PAYMENT REVIEW</p><h3>Your payment details are saved.</h3><p>Reference <strong>{orderId}</strong> is in the admin review list. This page will change to the verified purchase and bot downloads as soon as BrandyFx approves your payment.</p>
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
          <button className="purchase-submit" disabled={busy}>{busy ? 'Saving…' : 'Save details & continue'} <span aria-hidden="true">→</span></button>
          {checkoutSetup.length > 0 && <small className="purchase-config-note">Checkout is paused: {checkoutSetup.join(' and ')} in <a href="/kingz.html">Site settings</a>.</small>}
          {!settings.socialWhatsApp && checkoutSetup.length === 0 && <small className="purchase-config-note">Your details can be saved now. WhatsApp proof will be available after a contact link is added in <a href="/kingz.html">Site settings</a>.</small>}
        </form>
      </>}
    </section>
  </div>;
}

export default function Landing({ markets, tab, settings, simulated = false, rotNumber, hasAccess = false, onSignOut, payment, payments = [], profile }: { markets: MarketSample[]; tab: string; settings: PublicSettings; simulated?: boolean; rotNumber: string; hasAccess?: boolean; onSignOut: () => void; payment?: ClientPayment; payments?: ClientPayment[]; profile?: ClientProfile | null }) {
  const [purchasePlan, setPurchasePlan] = useState<(typeof planCards)[number] | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const tabsRef = useRef<HTMLElement | null>(null);
  const shownMarkets = markets.slice(0, 5);
  const pageTabs = ['refund', 'privacy', 'terms', 'contact', 'verify'];
  const currentTab = tabs.some(([id]) => id === tab) || pageTabs.includes(tab) ? tab : 'home';
  useEffect(() => {
    const saved = sessionStorage.getItem('brandyfx-tabs-scroll');
    if (saved !== null && tabsRef.current) tabsRef.current.scrollLeft = Number(saved) || 0;
    sessionStorage.removeItem('brandyfx-tabs-scroll');
  }, []);
  const live = shownMarkets.some(market => market.live);
  async function copyRotNumber() {
    try {
      await navigator.clipboard.writeText(rotNumber);
      setCopyStatus('App ID copied');
    } catch {
      setCopyStatus('Copy unavailable');
    }
  }
  let content;

  if (currentTab === 'home') content = <>
  <section className="landing-hero" aria-labelledby="landing-title">
    <div className="landing-hero-copy">
      <p className="landing-kicker">DERIV DIGIT SIGNALS</p>
      <h1 id="landing-title">Read the last digit.<br />Choose with context.</h1>
      <p className="landing-lede">BrandyFx is a digit-focused signals workspace for Deriv volatility markets. It organizes tick digits into Even / Odd, Over 6 / Under 3, and Matches setups, with the market and recent signal context close at hand.</p>
      <div className="landing-actions"><a className="landing-primary" href={tabHref('pricing')}>Explore access <span aria-hidden="true">↗</span></a><a className="landing-secondary" href="/?desk">See the signal desk</a></div>
      <dl className="landing-facts"><div><dt>What we read</dt><dd>Digits 0–9</dd></div><div><dt>Signal families</dt><dd>03</dd></div><div><dt>Execution</dt><dd>Your decision</dd></div></dl>
    </div>
    {simulated ? <HomeReviewPreview/> : <section className="landing-feed" aria-label="Deriv market prices">
      <div className="landing-feed-head"><div><h2>Live tick feed</h2></div><span className={live ? 'feed-status is-live' : 'feed-status'}><i aria-hidden="true" />{live ? 'Connected' : 'Waiting for feed'}</span></div>
      {shownMarkets.length ? <div className="landing-quotes">{shownMarkets.map(market => <div className="landing-quote" key={market.symbol}><span><strong>{market.name.replace('Volatility ', 'Vol ').replace(' Index', '')}</strong><small>{market.symbol}</small></span><b>{market.quote || '–'}</b></div>)}</div> : <p className="feed-empty">Current Deriv prices will appear here when the market feed is available.</p>}
      <p className="feed-foot">Prices are informational. They are not a promise of a signal or trading result.</p>
    </section>}
  </section>
    <section className="landing-section home-digit-section" aria-labelledby="digit-overview-title">
      <div className="landing-section-heading"><div><p className="landing-kicker">A DIGIT-FIRST APPROACH</p><h2 id="digit-overview-title">One last digit.<br/>Three ways to read it.</h2></div><p>Each setup is tied to a Deriv volatility market. The signal desk groups the idea by contract type so you can understand what a signal refers to before making your own trading decision.</p></div>
      <div className="family-grid">{digitFamilies.map(family => <article className="family-panel" key={family.index}><span className="family-index">{family.index}</span><h3>{family.title}</h3><p>{family.description}</p></article>)}</div>
      <aside className="intelligence-note"><div><p className="landing-kicker">READ THE SIGNAL, THEN DECIDE</p><h3>BrandyFx presents setups. You stay in control.</h3></div><p>Signals do not place trades or guarantee a result. Check the Deriv contract details and payout, choose your own stake, and only trade money you can afford to lose.</p></aside>
      {simulated && <p className="development-note" role="note"><strong>Development mode:</strong> the current market quotes and generated signal examples are simulated to demonstrate how the desk works. They are not live Deriv data.</p>}
      <div className="home-guide-action"><a className="landing-secondary" href={tabHref('process')}>Explore the digit guide <span aria-hidden="true">↗</span></a></div>
    </section>
  </>;
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
  else if (currentTab === 'process') content = <section className="tab-page process-page" aria-labelledby="page-title"><header className="tab-heading"><p className="landing-kicker">HOW DIGIT SIGNALS WORK</p><h1 id="page-title">Every setup starts<br/>with the last digit.</h1><p>Deriv volatility index prices update tick by tick. BrandyFx groups signal ideas around the final digit in a quote and shows which market and contract family a setup refers to.</p></header><div className="family-grid digit-guide-grid">{digitFamilies.map(family => <article className="family-panel" key={family.index}><span className="family-index">{family.index}</span><h2>{family.title}</h2><p>{family.description}</p></article>)}</div><div className="process-list digit-guide-steps">{steps.map(([number, title, description]) => <article className="process-step" key={number}><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></article>)}</div>{simulated && <p className="development-note" role="note"><strong>Development mode:</strong> the current market quotes and generated signal examples are simulated to demonstrate the workflow. They are not live Deriv data.</p>}<p className="digit-guide-risk">Digit contracts can lose money. The payout, probability and contract terms depend on the Deriv market and contract selected. A signal is not a promise of profit.</p></section>;
  else if (currentTab === 'account-management') content = <AccountManagement whatsapp={settings.socialWhatsApp}/>;
  else if (currentTab === 'reviews') content = <section className="tab-page reviews-section" aria-labelledby="page-title"><div className="tab-heading"><h1 id="page-title">Notes from the<br />community.</h1><p>Generated examples show how country-tagged feedback can appear.</p></div><ReviewCarousel/></section>;
  else if (currentTab === 'pricing') content = <section className="tab-page pricing-page" aria-labelledby="page-title"><header className="tab-heading"><h1 id="page-title">Choose your<br />signal desk.</h1><p>Separate access for each signal family. Every plan includes one free Pipforge bot to pair with its signals. Pay with USDT on TRC20.</p></header><div className="package-grid">{planCards.map(plan => <PackageCard key={plan.key} plan={plan} settings={settings} paidPayment={payments.find(item => item.package === plan.key && item.status === 'approved' && !item.revoked_at && !item.deleted_at)} onCheckout={() => setPurchasePlan(plan)} />)}</div><p className="pricing-note">Pay only to the TRC20 address shown in the BrandyFx payment window. Verify the network and amount before sending.</p></section>;
  else if (currentTab === 'faq') content = <section className="tab-page faq-section" aria-labelledby="page-title"><header className="tab-heading"><h1 id="page-title">Questions,<br />answered.</h1></header><div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>;
  else if (currentTab === 'refund') content = <section className="tab-page legal-page" aria-labelledby="page-title"><header className="tab-heading"><p className="landing-kicker">Legal</p><h1 id="page-title">Refund<br/>policy.</h1><p>Last Updated: January 27, 2026</p></header>
    <div className="policy-guarantee"><img className="policy-brand-mark" src="/brand/brandyfx-app-icon.png" alt=""/><div><h2>Royal Guarantee</h2><p>We stand behind every purchase. If BrandyFx doesn't deliver, you get your money back — no runaround, no questions asked.</p></div><strong>48 HOURS<small>Back Guarantee</small></strong></div>
    <div className="policy-sections">{refundSections(settings).map((section, index) => <article className="policy-section" key={section.title}><div className="section-heading"><span>{String(index + 1).padStart(2, '0')}</span><i/><h2>{section.title}</h2></div><p>{section.body}</p>
      {section.list && <ul>{section.list.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>}
      {section.ordered && <ol>{section.ordered.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ol>}
      {section.highlight && <aside>{section.highlight}</aside>}
      {section.contacts && <PolicyContactLinks settings={settings}/>}
    </article>)}</div><aside className="policy-update"><p><strong><img className="policy-inline-mark" src="/brand/brandyfx-app-icon.png" alt=""/> Policy Updates:</strong> BrandyFx reserves the right to update this refund policy at any time. Please check this page regularly for the latest information. Continued use of BrandyFx constitutes acceptance of our current refund policy.</p></aside>
  </section>;
  else if (currentTab === 'verify') {
    const requestedPaymentId = new URLSearchParams(location.search).get('paymentId');
    const selectedPayment = requestedPaymentId ? payments.find(item => item.id === requestedPaymentId) : payments.find(item => item.status === 'approved' && !item.revoked_at && !item.deleted_at) || payment;
    const verified = selectedPayment?.status === 'approved' && !selectedPayment.revoked_at && !selectedPayment.deleted_at;
    const packageKey = selectedPayment?.package || '';
    const receipt: ReceiptDetails | null = verified && selectedPayment ? { id: selectedPayment.id, name: selectedPayment.customer_name || profile?.name || '', email: selectedPayment.customer_email || profile?.email || '', country: selectedPayment.customer_country || profile?.country || '', rot: selectedPayment.rot_number || profile?.rot_number || rotNumber, package: planCards.find(plan => plan.key === packageKey)?.title || packageKey, amount: selectedPayment.amount || '0', currency: selectedPayment.currency || 'USDT', reference: selectedPayment.reference || '', created: selectedPayment.created } : null;
    content = <section className="tab-page verification-page" aria-labelledby="page-title"><header className="tab-heading"><p className="landing-kicker">Purchase verification</p><h1 id="page-title">Your package<br/>and receipt.</h1></header>{receipt ? <VerifiedPurchase receipt={receipt} settings={settings} packageKey={packageKey} /> : <article className="legal-placeholder"><h2>{selectedPayment?.status === 'pending' ? 'Payment is awaiting review.' : 'No verified package yet.'}</h2><p>Once BrandyFx approves a payment linked to your Deriv ROT, this page will show your receipt and the bot files included with that package.</p></article>}</section>;
  }
  else if (currentTab === 'privacy') content = <section className="tab-page legal-page" aria-labelledby="page-title">
    <header className="tab-heading"><p className="landing-kicker">Legal · Last updated 28 November 2026</p><h1 id="page-title">Privacy<br/>policy.</h1><p>How BrandyFx handles information when you use the site.</p></header>
    <div className="legal-grid">
      <article className="legal-placeholder"><h2>Information we receive</h2><p>When you sign in with Deriv, BrandyFx receives the Deriv account identifier and account information returned for the Options account. When you submit a payment for review, we collect the name, email, country, Deriv account ID, transaction reference, selected package, and submission time you provide.</p><p>We also receive basic technical data required to operate and protect the service, such as request metadata, session identifiers, and error records.</p></article>
      <article className="legal-placeholder"><h2>How we use it</h2><p>We use this information to authenticate your session, associate payment submissions with your Deriv account, review and manage access, provide the signal pages and bot downloads included with an approved package, respond to support requests, and protect the service from misuse.</p><p>BrandyFx does not request your Deriv password. Never send your password, one-time code, or API token to BrandyFx support.</p></article>
      <article className="legal-placeholder"><h2>Storage and sharing</h2><p>Account identifiers, submitted payment details, access records, and session data are stored by BrandyFx service providers, including its hosting and database providers. We do not sell personal information. We share information with providers only as needed to operate the site, comply with law, or address security and payment disputes.</p><p>Deriv handles information submitted to its own sign-in and trading services under Deriv's terms and privacy notices.</p></article>
      <article className="legal-placeholder"><h2>Retention and your choices</h2><p>We retain payment and access records while needed to administer purchases, resolve disputes, and meet legal obligations. Session records expire or are removed as part of sign-in and account management. You can contact BrandyFx to request access, correction, or deletion where applicable. Deletion may not apply to records we must retain.</p></article>
      <article className="legal-placeholder"><h2>Security and children</h2><p>We use access controls and protected service connections to safeguard stored information. No internet service can guarantee absolute security. The site is intended for adults who may legally access Deriv in their location and is not designed for children.</p></article>
      <article className="legal-placeholder"><h2>Contact and updates</h2><p>Use the current contact channels shown on the BrandyFx Contact page to ask privacy questions. We may update this policy when our service or legal duties change. The date above shows the latest revision.</p></article>
    </div>
  </section>;
  else if (currentTab === 'terms') content = <section className="tab-page legal-page" aria-labelledby="page-title">
    <header className="tab-heading"><p className="landing-kicker">Legal · Last updated 28 November 2026</p><h1 id="page-title">Terms of<br/>service.</h1><p>Rules for using BrandyFx and its signal access.</p></header>
    <div className="legal-grid">
      <article className="legal-placeholder"><h2>Using BrandyFx</h2><p>BrandyFx provides digit signal information, related educational material, and downloadable XML bots for supported packages. You must be legally eligible to use Deriv and the relevant products in your location. Keep your sign-in details secure and provide accurate checkout information.</p></article>
      <article className="legal-placeholder"><h2>Signals and trading risk</h2><p>Signals, examples, prices, and bot files are provided for informational and educational use. They are not financial advice, a guarantee of accuracy, or a promise of profit. Trading options and other derivatives involves substantial risk. You can lose some or all of the funds you trade. You make and remain responsible for your own trading decisions.</p><p>Review each contract's terms and payout on Deriv before placing a trade. Use only funds you can afford to lose.</p></article>
      <article className="legal-placeholder"><h2>Packages and payments</h2><p>Package prices and included signal families are shown on the Pricing page. Unless the checkout page says otherwise, a package is a one-time payment for the stated lifetime access to that BrandyFx service. Access begins after BrandyFx reviews and approves the payment. The separate Refund Policy describes refund eligibility.</p><p>For TRC20 payments, send only the displayed amount over the TRON network and submit the correct transaction reference. Transfers on another network may not be recoverable.</p></article>
      <article className="legal-placeholder"><h2>Account access and bots</h2><p>Access is linked to the Deriv real account ID used to sign in and is subject to package permissions and site controls. Do not share your Deriv password, verification code, or API token with BrandyFx or anyone else. You are responsible for importing, configuring, and supervising any downloaded bot. A bot may place trades according to its own settings, and losses are possible.</p></article>
      <article className="legal-placeholder"><h2>Availability and acceptable use</h2><p>We may update, maintain, or temporarily limit the site and its content. Do not attempt to disrupt the service, bypass access controls, or use BrandyFx unlawfully. We may suspend access in response to fraud, abuse, security threats, or legal requirements.</p></article>
      <article className="legal-placeholder"><h2>Third-party services</h2><p>Deriv is an independent service with its own terms, eligibility rules, and risk disclosures. BrandyFx is not operated by Deriv. Your use of Deriv remains subject to the terms accepted directly with Deriv.</p></article>
      <article className="legal-placeholder"><h2>Limitations</h2><p>To the extent allowed by applicable law, BrandyFx is provided as available, without a promise that signals, bots, or the site will be uninterrupted, error-free, or profitable. Nothing in these terms limits rights or remedies that cannot lawfully be excluded.</p></article>
      <article className="legal-placeholder"><h2>Changes and contact</h2><p>We may revise these terms by publishing an updated version here. Continued use after an update means the revised terms apply to future use. Contact BrandyFx through the channels on the Contact page with questions.</p></article>
    </div>
  </section>;
  else content = <section className="tab-page legal-page" aria-labelledby="page-title"><header className="tab-heading"><p className="landing-kicker">Contact</p><h1 id="page-title">Reach<br/>BrandyFx.</h1><p>Use any configured channel to get in touch.</p></header><SocialLinks settings={settings} className="site-social-links-contact"/>{!socialMeta.some(({ key }) => socialHref(settings, key)) && <article className="legal-placeholder"><p>Contact channels will appear here once they are added in site settings.</p></article>}</section>;

  return <main className="landing">
    <header className="landing-nav">
      <a className="landing-brand" href={tabHref('home')} aria-label="BrandyFx home"><img src="/brand/brandyfx-app-icon.png" alt="" /><span>BrandyFx</span></a>
      <nav ref={tabsRef} className="landing-tabs" aria-label="Main pages" onClick={() => { if (tabsRef.current) sessionStorage.setItem('brandyfx-tabs-scroll', String(tabsRef.current.scrollLeft)); }}>{tabs.map(([id, label]) => <a key={id} href={tabHref(id)} aria-current={currentTab === id ? 'page' : undefined}>{label}</a>)}{payments.some(item => item.status === 'approved' && !item.revoked_at && !item.deleted_at) && <a href={tabHref('verify')} aria-current={currentTab === 'verify' ? 'page' : undefined}>Verify</a>}</nav>
      <div className="landing-nav-actions"><SocialLinks settings={settings} className="site-social-links-header" only={['socialTelegram', 'socialEmail']}/><details className="member-account-menu"><summary className="member-welcome" aria-label={`Account menu for ${rotNumber}`}><span>Welcome</span><strong title="Your Deriv account ID / ROT number">{rotNumber}</strong><span className="member-account-caret" aria-hidden="true">⌄</span></summary><div className="member-account-popover"><button type="button" onClick={() => void copyRotNumber()}>{copyStatus || 'Copy app ID'}</button><button type="button" onClick={onSignOut}>Sign out</button></div></details><a className="landing-primary" href="/?desk">Signals <span aria-hidden="true">↗</span></a></div>
    </header>
    {content}
    <footer className="landing-footer">
      <section className="footer-brand-block"><a className="landing-brand" href={tabHref('home')}><img src="/brand/brandyfx-app-icon.png" alt=""/><span>BrandyFx</span></a><p>Deriv signal intelligence for informed decisions.</p><SocialLinks settings={settings} className="site-social-links-footer"/></section>
      <nav className="footer-link-group" aria-label="Platform"><h2>Platform</h2><a href={tabHref('free-bots')}>Free Bots</a><a href={tabHref('process')}>Digit guide</a><a href={tabHref('pricing')}>Pricing</a><a href="/">Access terminal</a></nav>
      <nav className="footer-link-group" aria-label="Community"><h2>Community</h2><a href={tabHref('reviews')}>Read reviews</a>{socialMeta.filter(({ key }) => key !== 'socialEmail' && socialHref(settings, key)).map(({ key, label }) => <a key={key} href={socialHref(settings, key)} target="_blank" rel="noreferrer">{label}</a>)}<a href={tabHref('contact')}>Contact</a></nav>
      <nav className="footer-link-group" aria-label="Legal"><h2>Legal</h2><a href="/?home&tab=privacy">Privacy policy</a><a href="/?home&tab=terms">Terms of service</a><a href="/?home&tab=refund">Refund policy</a></nav>
      <div className="landing-footer-bottom"><p><strong>Disclaimer:</strong> Deriv offers complex derivatives, such as options and contracts for difference (“CFDs”). These products may not be suitable for all clients, and trading them puts you at risk. You may lose some or all of the money you invest. Never trade with borrowed money or money you cannot afford to lose.</p><span>© BrandyFx</span></div>
    </footer>
    {purchasePlan && <PurchaseDialog plan={purchasePlan} settings={settings} payment={payment} profile={profile} onClose={() => setPurchasePlan(null)} />}
  </main>;
}
