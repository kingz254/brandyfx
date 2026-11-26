import { useEffect, useState } from 'react';

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
  offerActive: boolean;
  offerEndsAt: string;
  promoHeading: string;
  promoSubheading: string;
  trc20Wallet: string;
};

const tabs = [
  ['home', 'Home'], ['intelligence', 'Intelligence'], ['process', 'How it works'],
  ['challenge', 'Challenge'], ['reviews', 'Read reviews'], ['pricing', 'Pricing'], ['faq', 'FAQ'],
] as const;

const signalFamilies = [
  { name: 'Rise / Fall', detail: 'Directional setups shaped by the latest tick movement.' },
  { name: 'Over 6 / Under 3', detail: 'Last-digit contracts with a clear signal and expiry context.' },
  { name: 'Matches / Differs', detail: 'Digit signals for traders who follow the final tick.' },
];

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

const reviewExamples = [
  { text: 'Having live volatility prices beside the signal feed makes the market context easier to follow.', country: 'Kenya', countryCode: 'ke' },
  { text: 'The signal families are easy to compare, and I can stay focused on the market I selected.', country: 'Nigeria', countryCode: 'ng' },
  { text: 'I like that each setup is presented as information and leaves the trade decision with me.', country: 'Ghana', countryCode: 'gh' },
  { text: 'The recent signal history gives me a useful place to review what happened during a session.', country: 'South Africa', countryCode: 'za' },
  { text: 'Moving between Rise / Fall and digit signals feels clear without losing the market context.', country: 'Kenya', countryCode: 'ke' },
  { text: 'The risk reminders are a helpful nudge to slow down and stick to my own limits.', country: 'Nigeria', countryCode: 'ng' },
  { text: 'The live feed and the signal desk belong together. I can check both without jumping around.', country: 'Ghana', countryCode: 'gh' },
  { text: 'I can see which volatility market is connected before I decide what to look at next.', country: 'South Africa', countryCode: 'za' },
  { text: 'It is useful to have Matches / Differs and Over 6 / Under 3 grouped in the same workspace.', country: 'Kenya', countryCode: 'ke' },
  { text: 'The layout keeps the signal, current price and history in view while I review a setup.', country: 'Nigeria', countryCode: 'ng' },
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

function PackageCard({ tier, settings }: { tier: 'regular' | 'premium'; settings: PublicSettings }) {
  const premium = tier === 'premium';
  const base = premium ? settings.premiumPrice : settings.regularPrice;
  const offer = premium ? settings.premiumOffer : settings.regularOffer;
  const amount = settings.offerActive ? offer : base;
  const discount = settings.offerActive && base > 0 ? Math.max(0, Math.round((base - offer) * 100 / base)) : 0;
  const days = premium ? settings.premiumDays : settings.regularDays;
  return <article className={`package-card${premium ? ' premium-package' : ''}`}>
    <span className="package-tag">{premium ? 'Premium · Recommended' : 'Regular'}</span>
    {settings.offerActive && <><div className="package-promo"><span>{settings.promoHeading}</span></div><p className="package-promo-sub">{settings.promoSubheading}</p></>}
    <div className="package-price">
      {discount > 0 && <span className="package-discount">{discount}% OFF</span>}
      <strong className="package-current">${amount.toFixed(0)}</strong>
      {discount > 0 && <s className="package-previous">${base.toFixed(0)}</s>}
    </div>
    {settings.offerActive && settings.offerEndsAt && <Countdown endsAt={settings.offerEndsAt} />}
    <p className="package-intro">{premium ? 'Expanded access to the BrandyFx signal desk.' : 'Start with the core BrandyFx signal desk.'}</p>
    <ul className="package-features">
      <li>Live Deriv volatility market context</li>
      <li>Rise / Fall, Over 6 / Under 3 and Matches / Differs</li>
      <li>Signal history and risk reminders</li>
      <li>{days > 0 ? `${days} days of access` : 'Access term set by BrandyFx'}</li>
      {premium && <li>Everything included in Regular</li>}
    </ul>
    <a className="landing-primary package-action" href="/">Continue with Deriv <span aria-hidden="true">↗</span></a>
    <small>TRC20 accepted · Card and M-Pesa coming soon</small>
  </article>;
}

export default function Landing({ markets, tab, settings }: { markets: MarketSample[]; tab: string; settings: PublicSettings }) {
  const shownMarkets = markets.slice(0, 5);
  const currentTab = tabs.some(([id]) => id === tab) ? tab : 'home';
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
  else if (currentTab === 'intelligence') content = <section className="tab-page" aria-labelledby="page-title">
    <header className="tab-heading"><h1 id="page-title">Signal context,<br />without the clutter.</h1><p>Three signal families, one live Deriv market view.</p></header>
    <div className="family-grid">{signalFamilies.map((family, index) => <article className="family-panel" key={family.name}><h2>{family.name}</h2><p>{family.detail}</p></article>)}</div>
    <article className="intelligence-note"><div><h2>Built for Deriv volatility markets.</h2></div><p>Follow V10, V25, V50, V75 and V100 when they are available in the live feed. Compare current market context and signal history from one desk.</p></article>
  </section>;
  else if (currentTab === 'process') content = <section className="tab-page process-page" aria-labelledby="page-title"><header className="tab-heading"><h1 id="page-title">From live ticks<br />to a considered trade.</h1><p>Keep context in view, then make your own decision.</p></header><div className="process-list">{steps.map(([number, title, description]) => <article className="process-step" key={number}><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></article>)}</div></section>;
  else if (currentTab === 'challenge') content = <section className="tab-page challenge-section" aria-labelledby="page-title"><div className="challenge-copy"><h1 id="page-title">Build consistency<br />one session at a time.</h1><p>Use a clear routine: wait for a setup, keep your limits visible, and review what happened after each session. BrandyFx helps you follow the signal flow; every trade decision stays yours.</p><div className="challenge-tags"><span>Deriv signals</span><span>Live tick context</span><span>Risk-aware decisions</span></div><a className="landing-secondary" href="/?preview">Explore the terminal</a></div><article className="challenge-card"><div className="challenge-glyph" aria-hidden="true">BF</div><h2>Discipline over impulse.</h2><p>Set a session limit. Take a break. Never trade with money you cannot afford to lose.</p></article></section>;
  else if (currentTab === 'reviews') content = <section className="tab-page reviews-section" aria-labelledby="page-title"><div className="tab-heading review-heading"><div><h1 id="page-title">Notes from the<br />community.</h1><p>A sample of how country-tagged BrandyFx feedback will appear.</p></div><span className="review-sample-label">Fictional sample reviews</span></div><div className="review-wall">{reviewExamples.map((review, index) => <article className={`review-card review-v${(index % 7) + 1}`} key={`${review.country}-${index}`}><div className="review-card-top"><span className="review-quote-mark" aria-hidden="true">“</span><span className="review-count">{String(index + 1).padStart(2, '0')}</span></div><p className="review-copy">{review.text}</p><div className="review-person"><span className="review-flag"><img src={`/flags/${review.countryCode}.svg`} alt={`Flag of ${review.country}`} /></span><span><b>Sample trader</b><small>{review.country}</small></span></div></article>)}</div></section>;
  else if (currentTab === 'pricing') content = <section className="tab-page pricing-page" aria-labelledby="page-title"><header className="tab-heading"><h1 id="page-title">Your signal desk.<br />Your terms.</h1><p>One-time access packages. Pay with USDT on TRC20.</p></header><div className="package-grid"><PackageCard tier="regular" settings={settings} /><PackageCard tier="premium" settings={settings} /></div><div className="payment-methods" role="list" aria-label="Payment methods"><article className="payment-option available" role="listitem"><span className="payment-symbol" aria-hidden="true">₮</span><span><b>USDT</b><small>TRON network · TRC20</small></span><strong>Available</strong></article><article className="payment-option" role="listitem"><span className="payment-symbol" aria-hidden="true">▭</span><span><b>Card</b><small>Visa · Mastercard</small></span><strong>Coming soon</strong></article><article className="payment-option" role="listitem"><span className="payment-symbol" aria-hidden="true">M</span><span><b>M-Pesa</b><small>Mobile money</small></span><strong>Coming soon</strong></article></div>{settings.trc20Wallet && <div className="wallet-address"><span>USDT · TRC20 wallet</span><code>{settings.trc20Wallet}</code></div>}<p className="pricing-note">Access is granted after the TRC20 payment reference is reviewed. Never send cryptocurrency to an address that is not displayed by BrandyFx.</p></section>;
  else content = <section className="tab-page faq-section" aria-labelledby="page-title"><header className="tab-heading"><h1 id="page-title">Questions,<br />answered.</h1></header><div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>;

  return <main className="landing">
    <header className="landing-nav">
      <a className="landing-brand" href={tabHref('home')} aria-label="BrandyFx home"><img src="/brand/brandyfx-app-icon.png" alt="" /><span>BrandyFx</span></a>
      <nav className="landing-tabs" aria-label="Main pages">{tabs.map(([id, label]) => <a key={id} href={tabHref(id)} aria-current={currentTab === id ? 'page' : undefined}>{label}</a>)}</nav>
      <div className="landing-nav-actions"><a className="landing-primary" href="/?preview">Open signal desk <span aria-hidden="true">↗</span></a></div>
    </header>
    {content}
    <footer className="landing-footer"><a className="landing-brand" href={tabHref('home')}><img src="/brand/brandyfx-app-icon.png" alt="" /><span>BrandyFx</span></a><p>Deriv signals for informed decisions.</p><small><strong>Disclaimer:</strong> Deriv offers complex derivatives, such as options and contracts for difference (“CFDs”). These products may not be suitable for all clients, and trading them puts you at risk. You may lose some or all of the money you invest. Never trade with borrowed money or money you cannot afford to lose.</small><span>© BrandyFx</span></footer>
  </main>;
}
