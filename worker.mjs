import { connect } from './db.mjs';
import { appendTick, evaluate, VERSION, WINDOW } from './strategy.mjs';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = connect();
const db = await pool.connect();
const lock = await db.query('SELECT pg_try_advisory_lock(45829133) AS held');
if (!lock.rows[0].held) {
  db.release();
  await pool.end();
  throw new Error('Another BrandyFx worker is running');
}
db.on('error', () => process.exit(1));
const wanted = new Set([
  'R_10', 'R_25', 'R_50', 'R_75', 'R_100',
  '1HZ10V', '1HZ15V', '1HZ25V', '1HZ30V', '1HZ50V', '1HZ75V', '1HZ90V', '1HZ100V',
  ...(process.env.MARKET_SYMBOLS || '').split(',').map(symbol => symbol.trim()).filter(Boolean),
]);
const codes = { evenOdd: ['DIGITEVEN', 'DIGITODD'], range: ['DIGITOVER', 'DIGITUNDER'], digit: ['DIGITMATCH', 'DIGITDIFF'] };
let stopped = false;
let socket;
for (const event of ['SIGINT', 'SIGTERM']) process.on(event, () => {
  stopped = true;
  socket?.close();
});

await db.query('UPDATE markets SET ready = false');
let delay = 1000;
try {
  while (!stopped) {
    await stream();
    await db.query('UPDATE markets SET ready = false');
    if (!stopped) await new Promise(resolve => setTimeout(resolve, delay));
    delay = Math.min(delay * 2, 30000);
  }
} finally {
  db.release(true);
  await pool.end();
}

function stream() {
  return new Promise(resolve => {
    socket = new WebSocket('wss://api.derivws.com/trading/v1/options/ws/public');
    const markets = new Map();
    const requests = new Map();
    let next = 0;
    let lastMessage = Date.now();
    let pending = Promise.resolve();
    const send = (payload, context) => {
      const req_id = ++next;
      if (context) requests.set(req_id, context);
      socket.send(JSON.stringify({ ...payload, req_id }));
    };
    const heartbeat = setInterval(() => {
      if (Date.now() - lastMessage > 25000) socket.close();
      else if (socket.readyState === WebSocket.OPEN) send({ ping: 1 });
    }, 10000);
    socket.addEventListener('open', () => send({ active_symbols: 'full' }));
    socket.addEventListener('error', () => socket.close());
    socket.addEventListener('close', () => {
      clearInterval(heartbeat);
      void pending.finally(resolve);
    }, { once: true });
    socket.addEventListener('message', event => {
      lastMessage = Date.now();
      pending = pending.then(() => receive(JSON.parse(event.data))).catch(error => {
        console.error('Market worker update failed', error.code || error.name);
        socket.close();
      });
    });

    async function receive(message) {
      if (socket.readyState !== WebSocket.OPEN) return;
      const context = requests.get(message.req_id);
      requests.delete(message.req_id);
      if (message.error) {
        console.error('Market request failed', message.error.code);
        socket.close();
        return;
      }
      if (Array.isArray(message.active_symbols)) {
        for (const entry of message.active_symbols) {
          const symbol = entry.underlying_symbol;
          if (!wanted.has(symbol) || !entry.exchange_is_open || entry.is_trading_suspended) continue;
          const size = Number(entry.pip_size);
          const precision = Math.round(-Math.log10(size));
          if (!Number.isInteger(precision) || precision < 0 || precision > 12) continue;
          markets.set(symbol, { precision, name: entry.underlying_symbol_name, quotes: [], epoch: -1, enabled: [] });
          send({ contracts_for: symbol }, { symbol });
        }
        if (!markets.size) socket.close();
        return;
      }
      if (message.contracts_for && context) {
        const market = markets.get(context.symbol);
        const available = new Set(message.contracts_for.available?.map(contract => contract.contract_type));
        market.enabled = Object.keys(codes).filter(family => codes[family].every(code => available.has(code)));
        send({ ticks_history: context.symbol, count: WINDOW, end: 'latest', style: 'ticks', subscribe: 1 }, context);
        return;
      }
      if (message.history && context) {
        const market = markets.get(context.symbol);
        const { prices, times } = message.history;
        if (Array.isArray(prices) && Array.isArray(times) && prices.length === times.length) {
          for (let i = 0; i < prices.length; i++) appendTick(market, Number(times[i]), prices[i]);
        }
        return;
      }
      const tick = message.tick;
      const symbol = tick?.symbol || tick?.underlying_symbol;
      const market = markets.get(symbol);
      if (!market) return;
      if (Number.isInteger(tick.pip_size) && tick.pip_size !== market.precision) {
        market.precision = tick.pip_size;
        market.quotes = [];
        market.epoch = -1;
      }
      if (!appendTick(market, Number(tick.epoch), tick.quote)) return;
      delay = 1000;
      const ready = market.quotes.length >= WINDOW && market.epoch * 1000 >= Date.now() - 15000;
      await db.query(`INSERT INTO markets(symbol,name,quote,points,updated,ready)
        VALUES($1,$2,$3,$4,to_timestamp($5),$6)
        ON CONFLICT(symbol) DO UPDATE SET name=excluded.name,quote=excluded.quote,points=excluded.points,
        updated=excluded.updated,ready=excluded.ready`,
      [symbol, market.name, market.quotes.at(-1), JSON.stringify(market.quotes.slice(-64)), market.epoch, ready]);
      if (!ready) return;
      for (const signal of evaluate(market.quotes)) {
        if (!market.enabled.includes(signal.family)) continue;
        await db.query(`INSERT INTO signals(symbol,family,label,digit,issued,expires,version)
          SELECT $1,$2,$3,$4,to_timestamp($5),to_timestamp($5)+interval '30 seconds',$6
          WHERE NOT EXISTS(SELECT 1 FROM signals WHERE symbol=$1 AND family=$2 AND issued>to_timestamp($5)-interval '60 seconds')
          ON CONFLICT DO NOTHING`, [symbol, signal.family, signal.label, signal.digit, market.epoch, VERSION]);
      }
    }
  });
}
