import { createServer } from 'node:http';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { connect } from './db.mjs';
import { VERSION } from './strategy.mjs';

const dev = process.argv.includes('--dev');
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const origin = new URL(process.env.APP_ORIGIN || (vercelHost ? `https://${vercelHost}` : 'http://127.0.0.1:5173'));
if (origin.pathname !== '/' || origin.search || origin.hash) throw new Error('APP_ORIGIN must be a bare origin');
const db = process.env.DATABASE_URL ? connect() : null;
db?.on('error', error => console.error('Database connection interrupted', error.code));
const adminIds = new Set((process.env.ADMIN_DERIV_ACCOUNTS || '').split(',').map(id => id.trim()).filter(Boolean));
const adminLoginName = process.env.KINGZ_ADMIN_NAME || '';
const adminPasswordSalt = process.env.KINGZ_ADMIN_PASSWORD_SALT || '';
const adminPasswordHash = process.env.KINGZ_ADMIN_PASSWORD_HASH || '';
const adminSessionSecret = process.env.KINGZ_ADMIN_SESSION_SECRET || '';
const loginFailures = new Map();
const approved = process.env.APPROVED_RULE_VERSION === VERSION;
const DEFAULT_SITE_SETTINGS = {
  backgroundUrl: '/media/brandyfx-background.mp4', videoOpacity: 0.5, glassOpacity: 0.72,
  regularPrice: 300, premiumPrice: 450, regularOffer: 200, premiumOffer: 300,
  regularDays: 0, premiumDays: 0, offerEnabled: false, offerEndsAt: '',
  promoHeading: "Don't miss your chance", promoSubheading: 'Grants up to 20% off', trc20Wallet: '',
};
const random = () => randomBytes(32).toString('base64url');
const hash = value => createHash('sha256').update(value).digest('base64url');
const cookie = (name, value, age, secure = origin.protocol === 'https:') => `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`;
function requestOrigin(req) {
  const first = value => String(value || '').split(',')[0].trim();
  const protocol = first(req.headers['x-forwarded-proto']) || origin.protocol.slice(0, -1);
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host) || origin.host;
  return new URL(`${protocol}://${host}`);
}
const readCookie = (req, name) => (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(name + '='))?.slice(name.length + 1);
const key = (req, name) => hash(readCookie(req, name) || '');
function hasAdminSession(req) {
  if (!adminSessionSecret) return false;
  const [expires, nonce, signature, extra] = (readCookie(req, 'bfx_admin') || '').split('.');
  if (extra || !/^\d{10,13}$/.test(expires || '') || !/^[A-Za-z0-9_-]{20,}$/.test(nonce || '')) return false;
  const expiry = Number(expires);
  if (!Number.isSafeInteger(expiry) || expiry <= Date.now()) return false;
  const expected = createHmac('sha256', adminSessionSecret).update(`${expires}.${nonce}`).digest('base64url');
  const actualBuffer = Buffer.from(signature || '');
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
function matchesAdminPassword(name, password) {
  if (!adminLoginName || !adminPasswordSalt || !adminPasswordHash || !adminSessionSecret ||
    typeof name !== 'string' || name.length > 80 || typeof password !== 'string' || password.length > 512 || name !== adminLoginName) return false;
  try {
    const actual = scryptSync(password, Buffer.from(adminPasswordSalt, 'base64url'), 32);
    const expected = Buffer.from(adminPasswordHash, 'base64url');
    return expected.length === actual.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}
function newAdminSession() {
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  const nonce = random();
  const signature = createHmac('sha256', adminSessionSecret).update(`${expires}.${nonce}`).digest('base64url');
  return { value: `${expires}.${nonce}.${signature}`, seconds: 8 * 60 * 60 };
}
const json = (res, code, value) => res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(value));
const redirect = (res, location, cookies = []) => res.writeHead(303, { Location: location, 'Set-Cookie': cookies }).end();
const error = (status, message) => Object.assign(new Error(message), { status });
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const rows = async (sql, params = []) => (await db.query(sql, params)).rows;
const offer = () => one('SELECT amount,currency,days,instructions FROM offer');
async function siteSettings() {
  const stored = db ? await one('SELECT settings FROM site_settings WHERE id=true') : null;
  const settings = { ...DEFAULT_SITE_SETTINGS, ...(stored?.settings || {}) };
  const ends = settings.offerEndsAt ? new Date(settings.offerEndsAt).getTime() : 0;
  return { backgroundUrl: settings.backgroundUrl, videoOpacity: settings.videoOpacity, glassOpacity: settings.glassOpacity,
    regularPrice: settings.regularPrice, premiumPrice: settings.premiumPrice, regularOffer: settings.regularOffer,
    premiumOffer: settings.premiumOffer, regularDays: settings.regularDays, premiumDays: settings.premiumDays,
    offerActive: Boolean(settings.offerEnabled && Number.isFinite(ends) && ends > Date.now()), offerEndsAt: settings.offerEndsAt,
    promoHeading: settings.promoHeading, promoSubheading: settings.promoSubheading, trc20Wallet: settings.trc20Wallet };
}
const markets = () => rows(`SELECT symbol,name,quote,points,updated,
  ready AND updated > now()-interval '15 seconds' AS live FROM markets ORDER BY symbol`);
const memberState = id => one(`SELECT s.account_id,s.accounts,s.expires,
  (SELECT max(expires) FROM payments WHERE account_id=s.account_id AND status='approved'
    AND revoked_at IS NULL AND expires>now()) AS pass_until
  FROM sessions s WHERE s.id=$1 AND s.expires>now()`, [id]);

async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw error(415, 'Expected JSON.');
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    if (Array.isArray(req.body)) throw error(400, 'Invalid request.');
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error();
      return parsed;
    } catch { throw error(400, 'Invalid request.'); }
  }
  let content = '';
  for await (const chunk of req) {
    content += chunk;
    if (content.length > 8192) throw error(413, 'Request too large.');
  }
  try {
    const data = JSON.parse(content);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error();
    return data;
  } catch {
    throw error(400, 'Invalid request.');
  }
}

async function oauth(req, res, url, requestBase) {
  const clientId = process.env.DERIV_CLIENT_ID;
  if (!clientId) return redirect(res, '/?login=setup');
  const redirectUri = new URL('/api/deriv/callback', requestBase).href;
  if (url.pathname.endsWith('/start')) {
    const id = random();
    const state = random();
    const verifier = random();
    await db.query('DELETE FROM oauth_attempts WHERE expires<=now()');
    const returnTo = url.searchParams.get('return_to') === '/kingz.html' ? '/kingz.html' : '/';
    await db.query(`INSERT INTO oauth_attempts(id,state,verifier,expires,return_to) VALUES($1,$2,$3,now()+interval '5 minutes',$4)`, [hash(id), state, verifier, returnTo]);
    const auth = new URL('https://auth.deriv.com/oauth2/auth');
    auth.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri,
      response_type: 'code', scope: 'trade', state, code_challenge: hash(verifier), code_challenge_method: 'S256' });
    return redirect(res, auth.href, [cookie('bfx_oauth', id, 300, requestBase.protocol === 'https:')]);
  }
  const clear = [cookie('bfx_oauth', '', 0, requestBase.protocol === 'https:')];
  const attempt = await one('DELETE FROM oauth_attempts WHERE id=$1 AND expires>now() RETURNING state,verifier,return_to', [key(req, 'bfx_oauth')]);
  if (!attempt || attempt.state !== url.searchParams.get('state')) return redirect(res, '/?login=invalid', clear);
  if (url.searchParams.has('error') || !url.searchParams.get('code')) return redirect(res, '/?login=denied', clear);
  try {
    const token = await fetch('https://auth.deriv.com/oauth2/token', { method: 'POST', signal: AbortSignal.timeout(12000),
      body: new URLSearchParams({ grant_type: 'authorization_code', code: url.searchParams.get('code'),
        redirect_uri: redirectUri, client_id: clientId, code_verifier: attempt.verifier }) });
    if (!token.ok) return redirect(res, '/?login=failed', clear);
    const { access_token, expires_in } = await token.json();
    if (typeof access_token !== 'string' || !Number.isFinite(expires_in) || expires_in < 1) return redirect(res, '/?login=failed', clear);
    const lookup = await fetch('https://api.derivws.com/trading/v1/options/accounts', { signal: AbortSignal.timeout(12000),
      headers: { Authorization: 'Bearer ' + access_token, 'Deriv-App-ID': clientId } });
    if (!lookup.ok) return redirect(res, '/?login=failed', clear);
    const { data } = await lookup.json();
    const accounts = [...new Set((Array.isArray(data) ? data : [])
      .filter(item => item.status === 'active' && typeof item.account_id === 'string' && item.account_id.length <= 80)
      .map(item => item.account_id))];
    if (!accounts.length) return redirect(res, '/?login=account', clear);
    const id = random();
    const seconds = Math.min(Math.floor(expires_in), 86400);
    await db.query(`WITH stale AS (DELETE FROM sessions WHERE id=$1 OR expires<=now())
      INSERT INTO sessions VALUES($2,$3,$4,now()+$5*interval '1 second')`,
    [key(req, 'bfx_session'), hash(id), accounts.length === 1 ? accounts[0] : null, accounts, seconds]);
    return redirect(res, attempt.return_to === '/kingz.html' ? '/kingz.html' : '/', [...clear, cookie('bfx_session', id, seconds, requestBase.protocol === 'https:')]);
  } catch (cause) {
    console.error('Deriv sign-in failed', cause.code || cause.name);
    return redirect(res, '/?login=failed', clear);
  }
}

async function live(res, id) {
  const admin = state => adminIds.has(state?.account_id);
  const permitted = state => state?.account_id && (admin(state) || (approved && state.pass_until));
  if (!permitted(await memberState(id))) return json(res, 403, { error: 'An active pass is required.' });
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  let previous;
  try {
    while (!res.destroyed && !res.writableEnded) {
      const result = await one(`SELECT
        CASE WHEN s.account_id=ANY($2::text[]) OR ($3 AND EXISTS(
          SELECT FROM payments p WHERE p.account_id=s.account_id AND p.status='approved' AND p.revoked_at IS NULL AND p.expires>now()))
        THEN (SELECT coalesce(json_agg(recent),'[]') FROM
          (SELECT id,symbol,family,label,digit,issued,expires FROM signals WHERE version=$4 ORDER BY issued DESC,id DESC LIMIT 150) recent)
        END AS signals FROM sessions s WHERE s.id=$1 AND s.expires>now()`, [id, [...adminIds], approved, VERSION]);
      if (!result?.signals) {
        res.end('event: locked\ndata: {}\n\n');
        break;
      }
      const value = JSON.stringify(result.signals);
      const payload = value === previous ? ': keep-alive\n\n' : 'data: ' + value + '\n\n';
      if (!res.write(payload)) {
        res.end();
        break;
      }
      previous = value;
      await sleep(1500);
    }
  } finally {
    if (!res.writableEnded) res.end();
  }
}

async function api(req, res, url) {
  const path = url.pathname;
  const method = req.method;
  const requestBase = requestOrigin(req);
  if (method === 'POST' && req.headers.origin !== requestBase.origin) throw error(403, 'Invalid request origin.');
  if (method === 'GET' && path === '/api/markets') return json(res, 200, db ? await markets() : []);
  if (method === 'GET' && path === '/api/settings') return json(res, 200, await siteSettings());
  if (method === 'POST' && path === '/api/admin/login') {
    if (!adminLoginName || !adminPasswordSalt || !adminPasswordHash || !adminSessionSecret) throw error(503, 'Administrator password sign-in is not configured.');
    const client = req.socket.remoteAddress || 'unknown';
    const failed = loginFailures.get(client);
    if (failed?.blockedUntil > Date.now()) throw error(429, 'Too many attempts. Try again later.');
    const { name, password } = await body(req);
    if (!matchesAdminPassword(name, password)) {
      const next = failed?.windowUntil > Date.now() ? failed : { count: 0, windowUntil: Date.now() + 15 * 60 * 1000 };
      next.count += 1;
      if (next.count >= 5) next.blockedUntil = Date.now() + 15 * 60 * 1000;
      loginFailures.set(client, next);
      throw error(401, 'Name or password is incorrect.');
    }
    loginFailures.delete(client);
    const session = newAdminSession();
    res.setHeader('Set-Cookie', cookie('bfx_admin', session.value, session.seconds, requestBase.protocol === 'https:'));
    return json(res, 200, { ok: true });
  }
  const passwordAdmin = hasAdminSession(req);
  if (method === 'GET' && path === '/api/me' && !db) return json(res, 200, { ready: false, admin: passwordAdmin });
  if (method === 'POST' && path === '/api/logout' && !db && passwordAdmin) {
    res.setHeader('Set-Cookie', [cookie('bfx_session', '', 0, requestBase.protocol === 'https:'), cookie('bfx_admin', '', 0, requestBase.protocol === 'https:')]);
    return json(res, 200, {});
  }
  if (!db && method === 'GET' && path === '/api/deriv/start') return redirect(res, '/?login=setup');
  if (!db) throw error(503, 'The service is awaiting setup.');
  if (method === 'GET' && ['/api/deriv/start', '/api/deriv/callback'].includes(path)) return oauth(req, res, url, requestBase);
  const id = key(req, 'bfx_session');
  if (method === 'GET' && path === '/api/stream') return live(res, id);
  const state = await memberState(id);
  const account = state?.account_id;
  const admin = adminIds.has(account) || passwordAdmin;
  if (method === 'GET' && path === '/api/me') {
    const payment = account ? await one(`SELECT id,status,created,expires,revoked_at FROM payments
      WHERE account_id=$1 ORDER BY id DESC LIMIT 1`, [account]) : null;
    return json(res, 200, { ready: Boolean(process.env.DERIV_CLIENT_ID), launched: approved, account, admin,
      accounts: account ? undefined : state?.accounts, passUntil: state?.pass_until, payment, offer: account ? await offer() : null });
  }
  if (method === 'POST' && path === '/api/logout') {
    if (db) await db.query('DELETE FROM sessions WHERE id=$1', [id]);
    res.setHeader('Set-Cookie', [cookie('bfx_session', '', 0, requestBase.protocol === 'https:'), cookie('bfx_admin', '', 0, requestBase.protocol === 'https:')]);
    return json(res, 200, {});
  }
  if (method === 'POST' && path === '/api/account' && state && !account) {
    const input = await body(req);
    if (!state.accounts.includes(input.account)) throw error(400, 'Choose a verified Deriv account.');
    const next = random();
    const selected = await one(`UPDATE sessions SET id=$2,account_id=$3 WHERE id=$1 AND expires>now()
      AND account_id IS NULL RETURNING expires`, [id, hash(next), input.account]);
    if (!selected) throw error(409, 'Sign in again to select an account.');
    res.setHeader('Set-Cookie', cookie('bfx_session', next, Math.max(0, Math.floor((+selected.expires - Date.now()) / 1000)), requestBase.protocol === 'https:'));
    return json(res, 200, {});
  }
  if (!account && !admin) throw error(401, 'Sign in with Deriv.');
  if (method === 'POST' && path === '/api/payment') {
    if (!account) throw error(401, 'Sign in with Deriv.');
    if (!approved) throw error(409, 'Paid access is awaiting launch.');
    const { reference, package: tier = 'regular' } = await body(req);
    if (typeof reference !== 'string' || !/^[A-Za-z0-9-]{5,80}$/.test(reference.trim())) throw error(400, 'Enter a valid payment reference.');
    if (!['regular', 'premium'].includes(tier)) throw error(400, 'Choose a valid access plan.');
    const result = await one(`WITH settings AS (SELECT settings FROM site_settings WHERE id=true), plan AS (
      SELECT CASE WHEN coalesce((settings->>'offerEnabled')::boolean,false) AND NULLIF(settings->>'offerEndsAt','')::timestamptz>now()
          THEN CASE WHEN $3='premium' THEN (settings->>'premiumOffer')::numeric ELSE (settings->>'regularOffer')::numeric END
          ELSE CASE WHEN $3='premium' THEN (settings->>'premiumPrice')::numeric ELSE (settings->>'regularPrice')::numeric END END AS amount,
        CASE WHEN $3='premium' THEN (settings->>'premiumDays')::integer ELSE (settings->>'regularDays')::integer END AS days FROM settings)
      INSERT INTO payments(account_id,reference,amount,currency,days,package)
      SELECT $1,$2,amount,'USD',days,$3 FROM plan WHERE days BETWEEN 1 AND 365 AND NOT EXISTS(
        SELECT 1 FROM payments WHERE account_id=$1 AND status='pending')
      ON CONFLICT DO NOTHING RETURNING id`, [account, reference.trim().toUpperCase(), tier]);
    if (!result) throw error(409, 'The reference was already submitted, a request is pending, or there is no active offer.');
    return json(res, 201, result);
  }
  if (!path.startsWith('/api/admin/')) throw error(404, 'Page unavailable.');
  if (!admin) throw error(403, 'Administrator access required.');
  if (method === 'GET' && path === '/api/admin/payments') {
    return json(res, 200, await rows(`SELECT id,account_id,reference,status,amount,currency,days,package,created,expires,revoked_at
      FROM payments ORDER BY (status='pending') DESC,id DESC LIMIT 100`));
  }
  if (method === 'GET' && path === '/api/admin/site-settings') return json(res, 200, await siteSettings());
  if (method === 'POST' && path === '/api/admin/site-settings') {
    const input = await body(req);
    const price = value => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1000000;
    const days = value => Number.isInteger(value) && value >= 0 && value <= 365;
    const validBackground = typeof input.backgroundUrl === 'string' && (input.backgroundUrl.startsWith('/media/') && !input.backgroundUrl.includes('..') || (() => { try { return new URL(input.backgroundUrl).protocol === 'https:'; } catch { return false; } })());
    const validWallet = input.trc20Wallet === '' || (typeof input.trc20Wallet === 'string' && /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(input.trc20Wallet));
    const endTime = input.offerEndsAt === '' ? 0 : new Date(input.offerEndsAt).getTime();
    const offerEndsAt = input.offerEndsAt === '' ? '' : Number.isFinite(endTime) ? new Date(endTime).toISOString() : '';
    if (!validBackground || !price(input.regularPrice) || !price(input.premiumPrice) || !price(input.regularOffer) || !price(input.premiumOffer) ||
      input.regularOffer > input.regularPrice || input.premiumOffer > input.premiumPrice || !days(input.regularDays) || !days(input.premiumDays) ||
      typeof input.offerEnabled !== 'boolean' || !['videoOpacity','glassOpacity'].every(key => typeof input[key] === 'number' && input[key] >= 0.1 && input[key] <= 0.9) ||
      typeof input.promoHeading !== 'string' || !input.promoHeading.trim() || input.promoHeading.length > 90 || typeof input.promoSubheading !== 'string' || !input.promoSubheading.trim() || input.promoSubheading.length > 140 || !validWallet ||
      input.offerEndsAt !== '' && !Number.isFinite(new Date(input.offerEndsAt).getTime()) ||
      input.offerEnabled && (!offerEndsAt || endTime <= Date.now())) throw error(400, 'Check the prices, terms, media URL, offer end time and TRC20 address.');
    const settings = { backgroundUrl: input.backgroundUrl, videoOpacity: input.videoOpacity, glassOpacity: input.glassOpacity,
      regularPrice: input.regularPrice, premiumPrice: input.premiumPrice, regularOffer: input.regularOffer, premiumOffer: input.premiumOffer,
      regularDays: input.regularDays, premiumDays: input.premiumDays, offerEnabled: input.offerEnabled, offerEndsAt,
      promoHeading: input.promoHeading.trim(), promoSubheading: input.promoSubheading.trim(), trc20Wallet: input.trc20Wallet };
    await db.query('INSERT INTO site_settings(id,settings) VALUES(true,$1::jsonb) ON CONFLICT(id) DO UPDATE SET settings=$1::jsonb', [JSON.stringify(settings)]);
    return json(res, 200, await siteSettings());
  }
  if (method === 'POST' && path === '/api/admin/offer') {
    const { amount, currency, days, instructions } = await body(req);
    if (typeof amount !== 'string' || !/^\d{1,10}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 ||
      typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency) || !Number.isInteger(days) || days < 1 || days > 365 ||
      typeof instructions !== 'string' || !instructions.trim() || instructions.length > 2000) throw error(400, 'Check the fee, currency, duration, and instructions.');
    await db.query(`INSERT INTO offer VALUES(true,$1,$2,$3,$4)
      ON CONFLICT(id) DO UPDATE SET amount=$1,currency=$2,days=$3,instructions=$4`, [amount, currency, days, instructions.trim()]);
    return json(res, 200, {});
  }
  if (method === 'POST' && path === '/api/admin/payment') {
    const { paymentId, action, days } = await body(req);
    if (typeof paymentId !== 'string' || !/^\d{1,18}$/.test(paymentId)) throw error(400, 'Invalid payment.');
    const operations = {
      approve: "SET status='approved',reviewed_by=$2,reviewed_at=now(),expires=now()+days*interval '1 day' WHERE id=$1 AND status='pending'",
      decline: "SET status='declined',reviewed_by=$2,reviewed_at=now() WHERE id=$1 AND status='pending'",
      revoke: "SET revoked_at=now() WHERE id=$1 AND status='approved' AND revoked_at IS NULL AND $2::text IS NOT NULL",
      extend: "SET expires=greatest(expires,now())+$3*interval '1 day' WHERE id=$1 AND status='approved' AND revoked_at IS NULL AND $2::text IS NOT NULL",
    };
    if (typeof action !== 'string' || !Object.hasOwn(operations, action)) throw error(400, 'Invalid action.');
    if (action === 'extend' && (!Number.isInteger(days) || days < 1 || days > 365)) throw error(400, 'Enter an extension of 1 to 365 days.');
    const args = action === 'extend' ? [paymentId, account, days, action] : [paymentId, account, action];
    const changed = await one(`WITH changed AS (UPDATE payments ${operations[action]} RETURNING id,expires)
      INSERT INTO pass_audit(payment_id,actor,action,expires) SELECT id,$2,$${args.length},expires FROM changed RETURNING payment_id`, args);
    if (!changed && action === 'approve' && await one("SELECT id FROM payments WHERE id=$1 AND status='approved'", [paymentId])) return json(res, 200, {});
    if (!changed) throw error(409, 'This payment has already changed.');
    return json(res, 200, {});
  }
  throw error(404, 'Page unavailable.');
}

export { api };

async function startServer() {
if (!dev && (!db || !process.env.DERIV_CLIENT_ID)) throw new Error('DATABASE_URL and DERIV_CLIENT_ID are required');
if (!dev && origin.protocol !== 'https:') throw new Error('APP_ORIGIN must use HTTPS in production');
const http = createServer();
const vite = dev ? await (await import('vite')).createServer({
  server: { middlewareMode: true, hmr: { server: http }, fs: {
    deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/server.mjs', '**/db.mjs',
      '**/strategy.mjs', '**/worker.mjs', '**/replay.mjs', '**/schema.sql', '**/test/**'],
  } },
  appType: 'spa',
}) : null;
const root = resolve('dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm' };
http.on('request', async (req, res) => {
  try {
    const url = new URL(req.url, origin);
    if (url.origin !== origin.origin) throw error(400, 'Invalid URL.');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (!dev) res.setHeader('Content-Security-Policy', "default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; style-src 'self'; script-src 'self'; img-src 'self' data: https:; media-src 'self' https:");
    if (url.pathname.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');
      await api(req, res, url);
      return;
    }
    if (vite) return vite.middlewares(req, res);
    const file = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
    const type = mime[extname(file)];
    if (!file.startsWith(root + sep) || !type || !['GET', 'HEAD'].includes(req.method)) throw error(404, 'Page unavailable.');
    const content = await readFile(file).catch(() => { throw error(404, 'Page unavailable.'); });
    res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' }).end(req.method === 'HEAD' ? undefined : content);
  } catch (cause) {
    if (!cause.status) console.error('Request failed', cause.code || cause.name);
    if (!res.headersSent && !res.destroyed) json(res, cause.status || 500, { error: cause.status ? cause.message : 'Service temporarily unavailable.' });
    else if (!res.writableEnded) res.end();
  }
});
http.listen(Number(process.env.PORT || 5173), process.env.HOST || (dev ? '127.0.0.1' : '0.0.0.0'),
  () => console.log('BrandyFx listening on ' + origin.origin));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await startServer();
