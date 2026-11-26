type MarketSample = { symbol: string; name: string; quote: string; updated: string; live: boolean };

const signalFamilies = [
  { name: 'Rise / Fall', detail: 'Directional setups shaped by the latest tick movement.' },
  { name: 'Over 6 / Under 3', detail: 'Last-digit contracts with a clear signal and expiry context.' },
  { name: 'Matches / Differs', detail: 'Digit signals for traders who follow the final tick.' },
];

const steps = [
  ['01', 'Read the live feed', 'BrandyFx follows Deriv tick data across volatility markets and keeps the current price context close to each signal.'],
  ['02', 'Review the setup', 'Choose a signal family, check the market and expiry, then review the recent signal history before acting.'],
  ['03', 'Make your own trade', 'Signals are information for your decision. Open Deriv yourself, choose your stake and manage your own risk.'],
];

const faqs = [
  ['Is signal accuracy guaranteed?', 'No. Signals are not guarantees of profit. Market conditions change, and you can lose some or all of the money you trade. Use the feed as information and make your own decisions.'],
  ['Which Deriv markets are covered?', 'BrandyFx is built around Deriv volatility indices, including V10, V25, V50, V75 and V100, subject to live market availability.'],
  ['Which signal families are available?', 'The BrandyFx desk is organized around Rise / Fall, Over 6 / Under 3 and Matches / Differs.'],
  ['Do I need trading experience?', 'Familiarity with Deriv helps. Take time to understand the contract you choose and how its stake and duration affect your risk.'],
  ['How do I get access?', 'Sign in with Deriv when authentication is enabled, then review the access offer and payment instructions shown in your account.'],
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

export default function Landing({ markets }: { markets: MarketSample[] }) {
  const shownMarkets = markets.slice(0, 5);
  return <main className="landing">
    <header className="landing-nav">
      <a className="landing-brand" href="/?home" aria-label="BrandyFx home">
        <img src="/brand/brandyfx-app-icon.png" alt="" />
        <span>BrandyFx</span>
      </a>
      <nav aria-label="Homepage sections">
        <a href="#intelligence">Intelligence</a>
        <a href="#process">How it works</a>
        <a href="#challenge">Challenge</a>
        <a href="#reviews">Read reviews</a>
        <a href="#pricing">Pricing</a>
        <a href="#faq">FAQ</a>
      </nav>
      <div className="landing-nav-actions">
        <a className="landing-secondary" href="#pricing">View access</a>
        <a className="landing-primary" href="/?preview">Access terminal <span aria-hidden="true">↗</span></a>
      </div>
    </header>

    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-hero-copy">
        <p className="landing-kicker">Deriv signal intelligence</p>
        <h1 id="landing-title">Read the move.<br />Trade with intent.</h1>
        <p className="landing-lede">BrandyFx turns live Deriv ticks into clear signal setups for Rise / Fall, Over 6 / Under 3, and Matches / Differs.</p>
        <div className="landing-actions">
          <a className="landing-primary" href="#pricing">Explore access <span aria-hidden="true">↗</span></a>
          <a className="landing-secondary" href="/?preview">See the signal desk</a>
        </div>
        <dl className="landing-facts">
          <div><dt>Signal families</dt><dd>03</dd></div>
          <div><dt>Market source</dt><dd>Deriv ticks</dd></div>
          <div><dt>Execution</dt><dd>In your hands</dd></div>
        </dl>
      </div>

      <section className="landing-feed" aria-label="Live Deriv market prices">
        <div className="landing-feed-head">
          <div><p className="landing-kicker">Market intelligence</p><h2>Live tick feed</h2></div>
          <span className={shownMarkets.some(market => market.live) ? 'feed-status is-live' : 'feed-status'}>
            <i aria-hidden="true" />{shownMarkets.some(market => market.live) ? 'Connected' : 'Waiting for feed'}
          </span>
        </div>
        {shownMarkets.length ? <div className="landing-quotes">
          {shownMarkets.map(market => <div className="landing-quote" key={market.symbol}>
            <span><strong>{market.name.replace('Volatility ', 'Vol ').replace(' Index', '')}</strong><small>{market.symbol}</small></span>
            <b>{market.quote || '–'}</b>
          </div>)}
        </div> : <p className="feed-empty">Current Deriv prices will appear here when the market feed is available.</p>}
        <p className="feed-foot">Prices are informational. They are not a promise of a signal or trading result.</p>
      </section>
    </section>

    <section className="landing-section" id="intelligence">
      <div className="landing-section-heading">
        <p className="landing-kicker">One terminal, three ways to read a setup</p>
        <h2>Signal context,<br />without the clutter.</h2>
      </div>
      <div className="family-grid">
        {signalFamilies.map((family, index) => <article className="family-panel" key={family.name}>
          <span className="family-index">0{index + 1}</span>
          <h3>{family.name}</h3>
          <p>{family.detail}</p>
        </article>)}
      </div>
      <div className="intelligence-note">
        <div><p className="landing-kicker">Platform intelligence</p><h3>Built for Deriv volatility markets.</h3></div>
        <p>Follow V10, V25, V50, V75 and V100 when they are available in the live feed. Compare the current market, signal type and history from one desk.</p>
      </div>
    </section>

    <section className="landing-section process-section" id="process">
      <div className="landing-section-heading">
        <p className="landing-kicker">The process</p>
        <h2>From live ticks<br />to a considered trade.</h2>
      </div>
      <div className="process-list">
        {steps.map(([number, title, description]) => <article className="process-step" key={number}>
          <span>{number}</span><div><h3>{title}</h3><p>{description}</p></div>
          <span className="step-line" aria-hidden="true" />
        </article>)}
      </div>
    </section>

    <section className="challenge-section" id="challenge">
      <div className="challenge-copy">
        <p className="landing-kicker">The challenge</p>
        <h2>Build consistency<br />one session at a time.</h2>
        <p>Use a clear routine: wait for a setup, keep your limits visible, and review what happened after each session. BrandyFx helps you follow the signal flow; every trade decision stays yours.</p>
        <div className="challenge-tags"><span>Deriv signals</span><span>Live tick context</span><span>Risk-aware decisions</span></div>
        <a className="landing-secondary" href="/?preview">Explore the terminal</a>
      </div>
      <div className="challenge-card">
        <p className="landing-kicker">A trader’s edge</p>
        <div className="challenge-glyph" aria-hidden="true">BF</div>
        <h3>Discipline over impulse.</h3>
        <p>Set a session limit. Take a break. Never trade with money you cannot afford to lose.</p>
      </div>
    </section>

    <section className="landing-section reviews-section" id="reviews" aria-labelledby="reviews-title">
      <div className="landing-section-heading">
        <div>
          <p className="landing-kicker">Trader stories</p>
          <h2 id="reviews-title">Notes from the<br />community.</h2>
          <p className="reviews-intro">A sample of how country-tagged BrandyFx feedback will appear.</p>
        </div>
        <span className="review-sample-label">Fictional sample reviews</span>
      </div>
      <div className="review-wall">
        {reviewExamples.map((review, index) => <article className={`review-card review-v${(index % 7) + 1}`} key={`${review.country}-${index}`}>
          <div className="review-card-top"><span className="review-quote-mark" aria-hidden="true">“</span><span className="review-count">{String(index + 1).padStart(2, '0')}</span></div>
          <p className="review-copy">{review.text}</p>
          <div className="review-person"><span className="review-flag"><img src={`/flags/${review.countryCode}.svg`} alt={`Flag of ${review.country}`} /></span><span><b>Sample trader</b><small>{review.country}</small></span></div>
        </article>)}
      </div>
    </section>

    <section className="landing-section pricing-section" id="pricing">
      <div className="landing-section-heading">
        <p className="landing-kicker">Pricing</p>
        <h2>Simple access.<br />Clear terms.</h2>
        <p>Review the current access fee, duration and payment instructions after signing in.</p>
      </div>
      <article className="price-panel">
        <div><p className="landing-kicker">BrandyFx signals</p><h3>Signal desk access</h3>
          <p>Live market context, signal families and chronological history in one terminal.</p></div>
        <ul>
          <li>Rise / Fall, Over 6 / Under 3, Matches / Differs</li>
          <li>Deriv volatility market feed</li>
          <li>Signal history and account access</li>
          <li>Access duration shown before payment</li>
        </ul>
        <a className="landing-primary" href="/">Continue with Deriv <span aria-hidden="true">↗</span></a>
        <small>Trading involves risk. Access does not guarantee a trading outcome.</small>
      </article>
    </section>

    <section className="landing-section faq-section" id="faq">
      <div className="landing-section-heading"><p className="landing-kicker">FAQ</p><h2>Questions,<br />answered.</h2></div>
      <div className="faq-list">{faqs.map(([question, answer]) => <details key={question}>
        <summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p>
      </details>)}</div>
    </section>

    <section className="landing-close">
      <div><p className="landing-kicker">BrandyFx</p><h2>Read the signal.<br />Choose your move.</h2></div>
      <div><p>Open the terminal to see the BrandyFx signal desk.</p><a className="landing-primary" href="/?preview">Access terminal <span aria-hidden="true">↗</span></a></div>
    </section>

    <footer className="landing-footer">
      <a className="landing-brand" href="/?home"><img src="/brand/brandyfx-app-icon.png" alt="" /><span>BrandyFx</span></a>
      <p>Deriv signals for informed decisions.</p>
      <small><strong>Disclaimer:</strong> Deriv offers complex derivatives, such as options and contracts for difference (“CFDs”). These products may not be suitable for all clients, and trading them puts you at risk. You may lose some or all of the money you invest. Never trade with borrowed money or money you cannot afford to lose.</small>
      <span>© BrandyFx</span>
    </footer>
  </main>;
}
