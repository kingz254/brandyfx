import { createServer } from 'node:http';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
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
const derivLoginFailures = new Map();
const approved = process.env.APPROVED_RULE_VERSION === VERSION;
const DEFAULT_SITE_SETTINGS = {
  backgroundUrl: '/media/brandyfx-background.mp4', videoOpacity: 0.5, glassOpacity: 0.72,
  regularPrice: 300, premiumPrice: 450, regularOffer: 200, premiumOffer: 300,
  regularDays: 0, premiumDays: 0, offerEnabled: false, offerEndsAt: '',
  evenOddPrice: 300, evenOddOffer: 200, evenOddDays: 0,
  overUnderPrice: 300, overUnderOffer: 200, overUnderDays: 0,
  matchesPrice: 450, matchesOffer: 300, matchesDays: 0,
  promoHeading: "Don't miss your chance", promoSubheading: 'Grants up to 20% off', trc20Wallet: '',
  socialEmail: '', socialWhatsApp: '', socialTelegram: '', socialInstagram: '',
};
const random = () => randomBytes(32).toString('base64url');
const hash = value => createHash('sha256').update(value).digest('base64url');
const cookie = (name, value, age, secure = origin.protocol === 'https:') => `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`;
const DEVICE_LOCK_MESSAGE = 'This Deriv account is locked to another device. Sign in on your registered device or contact BrandyFx to reset it.';
const DEVICE_COOKIE_SECONDS = 315360000;
function requestOrigin(req) {
  const first = value => String(value || '').split(',')[0].trim();
  const protocol = first(req.headers['x-forwarded-proto']) || origin.protocol.slice(0, -1);
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host) || origin.host;
  return new URL(`${protocol}://${host}`);
}
const readCookie = (req, name) => (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(name + '='))?.slice(name.length + 1);
const key = (req, name) => hash(readCookie(req, name) || '');
function deviceIdentity(req, secure = origin.protocol === 'https:') {
  const value = readCookie(req, 'bfx_device') || '';
  return /^[A-Za-z0-9_-]{32,64}$/.test(value) ? { value, setCookie: null } : (() => {
    const next = random();
    return { value: next, setCookie: cookie('bfx_device', next, DEVICE_COOKIE_SECONDS, secure) };
  })();
}
function addCookies(res, values) {
  if (!values.length) return;
  const current = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', [...(Array.isArray(current) ? current : current ? [current] : []), ...values]);
}
async function isDeviceLockedToAnother(accountId, deviceHash) {
  const lock = await one('SELECT device_hash FROM device_locks WHERE account_id=$1', [accountId]);
  return Boolean(lock && lock.device_hash !== deviceHash);
}
async function bindAccountDevice(accountId, deviceHash) {
  const bound = await one(`INSERT INTO device_locks(account_id,device_hash) VALUES($1,$2)
    ON CONFLICT(account_id) DO UPDATE SET last_seen=CASE WHEN device_locks.last_seen<now()-interval '15 minutes' THEN now() ELSE device_locks.last_seen END
    WHERE device_locks.device_hash=EXCLUDED.device_hash RETURNING account_id`, [accountId, deviceHash]);
  return Boolean(bound);
}
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
    evenOddPrice: settings.evenOddPrice, evenOddOffer: settings.evenOddOffer, evenOddDays: settings.evenOddDays,
    overUnderPrice: settings.overUnderPrice, overUnderOffer: settings.overUnderOffer, overUnderDays: settings.overUnderDays,
    matchesPrice: settings.matchesPrice, matchesOffer: settings.matchesOffer, matchesDays: settings.matchesDays,
    offerActive: Boolean(settings.offerEnabled && Number.isFinite(ends) && ends > Date.now()), offerEndsAt: settings.offerEndsAt,
    promoHeading: settings.promoHeading, promoSubheading: settings.promoSubheading, trc20Wallet: settings.trc20Wallet,
    socialEmail: settings.socialEmail || '', socialWhatsApp: settings.socialWhatsApp || '',
    socialTelegram: settings.socialTelegram || '', socialInstagram: settings.socialInstagram || '',
    homepageReviews: Array.isArray(settings.homepageReviews) ? settings.homepageReviews : undefined,
    communityReviews: Array.isArray(settings.communityReviews) ? settings.communityReviews : undefined };
}
const markets = () => rows(`SELECT symbol,name,quote,points,updated,
  ready AND updated > now()-interval '15 seconds' AS live FROM markets ORDER BY symbol`);
const memberState = id => one(`SELECT real_account.account_id,s.expires,s.device_hash,
  coalesce(array_agg(DISTINCT p.package) FILTER (WHERE p.id IS NOT NULL), ARRAY[]::text[]) AS packages,
  coalesce(bool_or(p.expires IS NULL), false) AS lifetime_access,
  max(p.expires) FILTER (WHERE p.expires>now()) AS pass_until
  FROM sessions s CROSS JOIN LATERAL (SELECT CASE
    WHEN s.account_id LIKE 'ROT%' THEN s.account_id
    WHEN cardinality(s.accounts)=1 AND s.accounts[1] LIKE 'ROT%' THEN s.accounts[1]
    ELSE NULL END AS account_id) AS real_account
  LEFT JOIN payments p ON p.account_id=real_account.account_id AND p.status='approved'
    AND p.revoked_at IS NULL AND p.deleted_at IS NULL AND (p.expires IS NULL OR p.expires>now())
  WHERE s.id=$1 AND s.expires>now()
  GROUP BY real_account.account_id,s.expires,s.device_hash`, [id]);

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
  // This must match the OAuth redirect registered in the Deriv dashboard exactly.
  const redirectUri = new URL('/callback', origin).href;
  if (url.pathname.endsWith('/start')) {
    if (requestBase.origin !== origin.origin) return redirect(res, new URL('/api/deriv/start', origin).href);
    const device = deviceIdentity(req, requestBase.protocol === 'https:');
    const id = random();
    const state = random();
    const verifier = random();
    await db.query('DELETE FROM oauth_attempts WHERE expires<=now()');
    const returnTo = url.searchParams.get('return_to') === '/kingz.html' ? '/kingz.html' : '/';
    await db.query(`INSERT INTO oauth_attempts(id,state,verifier,expires,return_to) VALUES($1,$2,$3,now()+interval '5 minutes',$4)`, [hash(id), state, verifier, returnTo]);
    const auth = new URL('https://auth.deriv.com/oauth2/auth');
    auth.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri,
      response_type: 'code', scope: 'trade', state, code_challenge: hash(verifier), code_challenge_method: 'S256' });
    return redirect(res, auth.href, [cookie('bfx_oauth', id, 300, requestBase.protocol === 'https:'), ...(device.setCookie ? [device.setCookie] : [])]);
  }
  const clear = [cookie('bfx_oauth', '', 0, requestBase.protocol === 'https:')];
  const attempt = await one('DELETE FROM oauth_attempts WHERE id=$1 AND expires>now() RETURNING state,verifier,return_to', [key(req, 'bfx_oauth')]);
  if (!attempt || attempt.state !== url.searchParams.get('state')) return redirect(res, '/?login=invalid', clear);
  if (url.searchParams.has('error') || !url.searchParams.get('code')) return redirect(res, '/?login=denied', clear);
  try {
    const token = await fetch('https://auth.deriv.com/oauth2/token', { method: 'POST', signal: AbortSignal.timeout(12000),
      body: new URLSearchParams({ grant_type: 'authorization_code', code: url.searchParams.get('code'),
        redirect_uri: redirectUri, client_id: clientId, code_verifier: attempt.verifier }) });
    if (!token.ok) return redirect(res, token.status === 400 || token.status === 401 ? '/?login=invalid' : token.status === 403 ? '/?login=scope' : '/?login=failed', clear);
    const { access_token, expires_in } = await token.json();
    if (typeof access_token !== 'string' || !Number.isFinite(expires_in) || expires_in < 1) return redirect(res, '/?login=failed', clear);
    const accounts = await listDerivAccounts(access_token, clientId);
    if (!accounts.length) return redirect(res, '/?login=account', clear);
    const device = deviceIdentity(req, requestBase.protocol === 'https:');
    const id = random();
    const seconds = Math.min(Math.floor(expires_in), 86400);
    await db.query(`WITH stale AS (DELETE FROM sessions WHERE id=$1 OR expires<=now())
      INSERT INTO sessions(id,account_id,accounts,expires,device_hash) VALUES($2,$3,$4,now()+$5*interval '1 second',$6)`,
    [key(req, 'bfx_session'), hash(id), accounts.length === 1 ? accounts[0] : null, accounts, seconds, hash(device.value)]);
    return redirect(res, attempt.return_to === '/kingz.html' ? '/kingz.html' : '/', [...clear, ...(device.setCookie ? [device.setCookie] : []), cookie('bfx_session', id, seconds, requestBase.protocol === 'https:')]);
  } catch (cause) {
    console.error('Deriv sign-in failed', cause.code || cause.name);
    const loginStatus = cause.status === 401 ? 'invalid' : cause.status === 403 ? 'scope' : 'failed';
    return redirect(res, `/?login=${loginStatus}`, clear);
  }
}

async function listDerivAccounts(token, clientId, personalAccessToken = false) {
  let response;
  try {
    response = await fetch('https://api.derivws.com/trading/v1/options/accounts', { signal: AbortSignal.timeout(12000),
      headers: { Authorization: `Bearer ${token}`,
        ...(personalAccessToken ? { 'Deriv-App-ID': clientId } : {}) } });
  } catch (cause) {
    console.error('Deriv account verification unavailable', cause.code || cause.name);
    throw error(503, 'Deriv could not verify sign-in right now. Try again shortly.');
  }
  if (response.status === 401) throw error(401, 'Deriv did not accept that credential. Check it and try again.');
  if (response.status === 403) throw error(403, 'This Deriv credential needs the trade scope to list Options accounts.');
  if (response.status === 429 || response.status >= 500) throw error(503, 'Deriv is temporarily unavailable. Please try again shortly.');
  if (!response.ok) throw error(503, 'Deriv could not verify sign-in. Please try again later.');
  let payload;
  try { payload = await response.json(); }
  catch { throw error(503, 'Deriv returned an unreadable account response. Please try again.'); }
  const data = payload && typeof payload === 'object' ? payload.data : null;
  return [...new Set((Array.isArray(data) ? data : [])
    .filter(item => item?.status === 'active' && item.account_type === 'real' &&
      typeof item.account_id === 'string' && item.account_id.startsWith('ROT') && item.account_id.length <= 80)
    .map(item => item.account_id))];
}

function checkDerivLoginLimit(req) {
  const client = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = derivLoginFailures.get(client);
  if (record?.blockedUntil > now) throw error(429, 'Too many sign-in attempts. Wait a few minutes and try again.');
  const next = record?.windowUntil > now ? record : { count: 0, windowUntil: now + 15 * 60 * 1000 };
  next.count += 1;
  if (next.count >= 12) next.blockedUntil = now + 15 * 60 * 1000;
  derivLoginFailures.set(client, next);
  if (derivLoginFailures.size > 2000) {
    for (const [address, attempt] of derivLoginFailures) if (attempt.windowUntil <= now && attempt.blockedUntil <= now) derivLoginFailures.delete(address);
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
  if (method === 'GET' && ['/api/deriv/start', '/api/deriv/callback', '/callback'].includes(path)) return oauth(req, res, url, requestBase);
  if (method === 'POST' && path === '/api/deriv/token') {
    if (!process.env.DERIV_CLIENT_ID) throw error(503, 'Deriv sign-in is not configured yet.');
    checkDerivLoginLimit(req);
    const input = await body(req);
    const token = typeof input.token === 'string' ? input.token.trim() : '';
    if (!token || token.length > 4096 || /[\u0000-\u001f\u007f]/.test(token)) throw error(400, 'Enter a valid Deriv API token.');
    const accounts = await listDerivAccounts(token, process.env.DERIV_CLIENT_ID, true);
    if (!accounts.length) throw error(403, 'No active real ROT account was found for this token.');
    const device = deviceIdentity(req, requestBase.protocol === 'https:');
    const id = random();
    const seconds = 12 * 60 * 60;
    await db.query(`WITH stale AS (DELETE FROM sessions WHERE id=$1 OR expires<=now())
      INSERT INTO sessions(id,account_id,accounts,expires,device_hash) VALUES($2,$3,$4,now()+$5*interval '1 second',$6)`,
    [key(req, 'bfx_session'), hash(id), accounts.length === 1 ? accounts[0] : null, accounts, seconds, hash(device.value)]);
    addCookies(res, [...(device.setCookie ? [device.setCookie] : []), cookie('bfx_session', id, seconds, requestBase.protocol === 'https:')]);
    return json(res, 200, { ok: true });
  }
  const id = key(req, 'bfx_session');
  const state = await memberState(id);
  const account = state?.account_id;
  const admin = adminIds.has(account) || passwordAdmin;
  const device = state ? deviceIdentity(req, requestBase.protocol === 'https:') : null;
  const currentDeviceHash = device ? hash(device.value) : null;
  if (device?.setCookie) addCookies(res, [device.setCookie]);
  if (method === 'GET' && path === '/api/signals') {
    if (!admin && !(approved && account && state.packages?.length)) throw error(403, 'An active pass is required.');
    if (!admin && account) {
      if (state.device_hash && state.device_hash !== currentDeviceHash) throw error(409, DEVICE_LOCK_MESSAGE);
      const locked = await one('SELECT device_hash FROM device_locks WHERE account_id=$1', [account]);
      if (locked || state.packages?.length) {
        if (!await bindAccountDevice(account, currentDeviceHash)) throw error(409, DEVICE_LOCK_MESSAGE);
      }
      if (!state.device_hash) await db.query('UPDATE sessions SET device_hash=$2 WHERE id=$1 AND device_hash IS NULL', [id, currentDeviceHash]);
    }
    const requestedFamily = url.searchParams.get('family');
    if (requestedFamily && !['evenOdd','range','digit'].includes(requestedFamily)) throw error(400, 'Choose a valid signal family.');
    if (!admin && requestedFamily) {
      const packages = state.packages || [];
      const allowed = requestedFamily === 'evenOdd' ? packages.some(p => ['evenOdd','regular','matches','premium'].includes(p))
        : requestedFamily === 'range' ? packages.some(p => ['overUnder','regular','matches','premium'].includes(p))
          : packages.some(p => ['matches','premium'].includes(p));
      if (!allowed) throw error(403, 'This signal tab is not included in your approved package.');
    }
    const signals = await rows(`SELECT id,symbol,family,label,digit,issued,expires FROM signals
      WHERE version=$1 AND expires>now() AND ($4::text IS NULL OR family=$4) AND ($2 OR EXISTS (
        SELECT FROM payments p WHERE p.account_id=$3 AND p.status='approved'
          AND p.revoked_at IS NULL AND p.deleted_at IS NULL AND (p.expires IS NULL OR p.expires>now())
          AND ((signals.family='evenOdd' AND p.package IN ('evenOdd','regular','matches','premium'))
            OR (signals.family='range' AND p.package IN ('overUnder','regular','matches','premium'))
            OR (signals.family='digit' AND p.package IN ('matches','premium')))
      )) ORDER BY issued DESC,id DESC`, [VERSION, admin, account ?? null, requestedFamily]);
    return json(res, 200, signals);
  }

  if (method === 'GET' && path === '/api/me') {
    const accounts = (await one('SELECT accounts FROM sessions WHERE id=$1', [id]))?.accounts || [];
    const payment = account ? await one(`SELECT id,status,created,expires,revoked_at,deleted_at,package,reference,amount,currency,customer_name,customer_email,customer_country,rot_number FROM payments
      WHERE account_id=$1 AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`, [account]) : null;
    const payments = account ? await rows(`SELECT id,status,created,expires,revoked_at,deleted_at,package,reference,amount,currency,customer_name,customer_email,customer_country,rot_number FROM payments
      WHERE account_id=$1 AND deleted_at IS NULL ORDER BY id DESC LIMIT 100`, [account]) : [];
    const profile = account ? await one(`SELECT customer_name AS name,customer_email AS email,customer_country AS country,rot_number
      FROM payments WHERE account_id=$1 AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`, [account]) : null;
    const packages = state?.packages || [];
    const allowedFamilies = admin ? ['evenOdd','range','digit'] : [
      ...(packages.some(p => ['evenOdd','regular','matches','premium'].includes(p)) ? ['evenOdd'] : []),
      ...(packages.some(p => ['overUnder','regular','matches','premium'].includes(p)) ? ['range'] : []),
      ...(packages.some(p => ['matches','premium'].includes(p)) ? ['digit'] : []),
    ];
    return json(res, 200, { ready: Boolean(process.env.DERIV_CLIENT_ID), launched: approved, account, accounts, admin,
      passUntil: state?.lifetime_access ? null : state?.pass_until, lifetimeAccess: Boolean(state?.lifetime_access),
      allowedFamilies, payment, payments, profile, offer: account ? await offer() : null });
  }
  if (method === 'POST' && path === '/api/account/select') {
    const { accountId } = await body(req);
    if (typeof accountId !== 'string' || !state.accounts?.includes(accountId) || !accountId.startsWith('ROT')) throw error(400, 'Choose a linked Deriv real account.');
    await db.query('UPDATE sessions SET account_id=$2 WHERE id=$1', [id, accountId]);
    return json(res, 200, { ok: true });
  }
  if (method === 'POST' && path === '/api/logout') {
    if (db) await db.query('DELETE FROM sessions WHERE id=$1', [id]);
    res.setHeader('Set-Cookie', [cookie('bfx_session', '', 0, requestBase.protocol === 'https:'), cookie('bfx_admin', '', 0, requestBase.protocol === 'https:')]);
    return json(res, 200, {});
  }
  if (method === 'POST' && path === '/api/payment') {
    if (!approved) throw error(409, 'Paid access is awaiting launch.');
    if (!account) throw error(401, 'Sign in with your Deriv real ROT account before submitting payment details.');
    const input = await body(req);
    const { package: tier, name, email, country, rotNumber } = input;
    const reference = input.transactionHash;
    if (typeof reference !== 'string' || !/^[A-Fa-f0-9]{64}$/.test(reference.trim())) throw error(400, 'Enter a valid 64-character TRON transaction hash.');
    if (!['evenOdd', 'overUnder', 'matches'].includes(tier)) throw error(400, 'Choose a valid access plan.');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof country !== 'string' || !country.trim() || country.trim().length > 90 || typeof rotNumber !== 'string' || !/^[A-Za-z0-9-]{3,40}$/.test(rotNumber.trim())) throw error(400, 'Enter your name, a valid email, country and Deriv ROT number.');
    const rot = rotNumber.trim().toUpperCase();
    if (rot !== account) throw error(400, 'Use the Deriv account number that is signed in.');
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [rot]);
      const existingPackage = (await client.query(`SELECT id FROM payments WHERE account_id=$1 AND package=$2
        AND status='approved' AND revoked_at IS NULL AND deleted_at IS NULL AND (expires IS NULL OR expires>now()) LIMIT 1 FOR UPDATE`, [rot, tier])).rows[0];
      if (existingPackage) throw error(409, 'This package is already paid and active. Contact BrandyFx if you need access restored.');
      const result = (await client.query(`WITH settings AS (SELECT settings FROM site_settings WHERE id=true), plan AS (
      SELECT CASE WHEN coalesce((settings->>'offerEnabled')::boolean,false) AND NULLIF(settings->>'offerEndsAt','')::timestamptz>now()
          THEN CASE $3 WHEN 'evenOdd' THEN (settings->>'evenOddOffer')::numeric WHEN 'overUnder' THEN (settings->>'overUnderOffer')::numeric ELSE (settings->>'matchesOffer')::numeric END
          ELSE CASE $3 WHEN 'evenOdd' THEN (settings->>'evenOddPrice')::numeric WHEN 'overUnder' THEN (settings->>'overUnderPrice')::numeric ELSE (settings->>'matchesPrice')::numeric END END AS amount,
        0 AS days FROM settings)
      INSERT INTO payments(account_id,reference,amount,currency,days,package,customer_name,customer_email,customer_country,rot_number)
      SELECT $1,$2,amount,'USDT',days,$3,$4,$5,$6,$1 FROM plan WHERE NOT EXISTS(
        SELECT 1 FROM payments WHERE account_id=$1 AND status='pending' AND deleted_at IS NULL)
      ON CONFLICT DO NOTHING RETURNING id`, [rot, reference.trim().toUpperCase(), tier, name.trim(), email.trim().toLowerCase(), country.trim()])).rows[0];
      if (!result) throw error(409, 'This hash is already recorded or a payment is pending for this Deriv account.');
      await client.query('COMMIT');
      return json(res, 201, result);
    } catch (cause) {
      await client.query('ROLLBACK');
      throw cause;
    } finally {
      client.release();
    }
  }
  if (method === 'POST' && path === '/api/account-management') {
    const { name, amount, startDate } = await body(req);
    const today = new Date().toISOString().slice(0, 10);
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 ||
      typeof amount !== 'number' || !Number.isFinite(amount) || amount < 100 || amount > 600 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8 ||
      typeof startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || startDate < today ||
      new Date(`${startDate}T00:00:00Z`).toISOString().slice(0, 10) !== startDate) {
      throw error(400, 'Enter your name, an amount from USD 100 to USD 600, and a valid upcoming date.');
    }
    const result = await one(`INSERT INTO account_management_requests(name,amount,start_date)
      VALUES($1,$2,$3::date) RETURNING id`, [name.trim(), amount, startDate]);
    return json(res, 201, result);
  }
  if (!account && !admin) throw error(401, 'Sign in with Deriv.');
  if (!path.startsWith('/api/admin/')) throw error(404, 'Page unavailable.');
  if (!admin) throw error(403, 'Administrator access required.');
  if (method === 'GET' && path === '/api/admin/payments') {
    return json(res, 200, await rows(`SELECT id,account_id,reference,status,amount,currency,days,package,created,expires,revoked_at,deleted_at,
      customer_name,customer_email,customer_country,rot_number,
      EXISTS(SELECT 1 FROM device_locks d WHERE d.account_id=payments.account_id) AS device_locked
      FROM payments ORDER BY (status='pending') DESC,id DESC LIMIT 300`));
  }
  if (method === 'POST' && path === '/api/admin/device-lock') {
    const { accountId } = await body(req);
    if (typeof accountId !== 'string' || !/^ROT[A-Za-z0-9-]{3,40}$/i.test(accountId.trim())) throw error(400, 'Choose a valid Deriv ROT account.');
    const rot = accountId.trim().toUpperCase();
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const removed = await client.query('DELETE FROM device_locks WHERE account_id=$1 RETURNING account_id', [rot]);
      await client.query('DELETE FROM sessions WHERE account_id=$1 OR accounts @> ARRAY[$1]::text[]', [rot]);
      await client.query('COMMIT');
      return json(res, 200, { ok: true, reset: Boolean(removed.rowCount) });
    } catch (cause) {
      await client.query('ROLLBACK');
      throw cause;
    } finally {
      client.release();
    }
  }
  if (method === 'GET' && path === '/api/admin/account-management') {
    return json(res, 200, await rows(`SELECT id,name,amount,start_date,status,created
      FROM account_management_requests ORDER BY (status='new') DESC,id DESC LIMIT 200`));
  }
  if (method === 'POST' && path === '/api/admin/reviews') {
    const input = await body(req);
    const packages = ['Even / Odd · Regular', 'Over 6 / Under 3 · Regular', 'Matches · V.I.P.'];
    const cleanReviews = value => {
      if (!Array.isArray(value) || value.length > 60) throw error(400, 'Each review table can contain up to 60 entries.');
      return value.map((item, index) => {
        if (!item || typeof item !== 'object' ||
          typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(item.id) ||
          typeof item.text !== 'string' || !item.text.trim() || item.text.length > 1000 ||
          typeof item.name !== 'string' || !item.name.trim() || item.name.length > 100 ||
          typeof item.country !== 'string' || !item.country.trim() || item.country.length > 90 ||
          typeof item.countryCode !== 'string' || item.countryCode !== '' && !/^[a-z]{2}$/.test(item.countryCode) ||
          !packages.includes(item.package) || !['sample', 'client'].includes(item.source)) {
          throw error(400, `Check the review text, name, country, flag code, package and source on row ${index + 1}.`);
        }
        return { id: item.id, text: item.text.trim(), name: item.name.trim(), country: item.country.trim(), countryCode: item.countryCode, package: item.package, source: item.source };
      });
    };
    const homepageReviews = cleanReviews(input.homepageReviews);
    const communityReviews = cleanReviews(input.communityReviews);
    const stored = await one('SELECT settings FROM site_settings WHERE id=true');
    const settings = { ...(stored?.settings || {}), homepageReviews, communityReviews };
    await db.query('INSERT INTO site_settings(id,settings) VALUES(true,$1::jsonb) ON CONFLICT(id) DO UPDATE SET settings=$1::jsonb', [JSON.stringify(settings)]);
    return json(res, 200, await siteSettings());
  }
  if (method === 'GET' && path === '/api/admin/site-settings') return json(res, 200, await siteSettings());
  if (method === 'POST' && path === '/api/admin/site-settings') {
    const input = await body(req);
    const price = value => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1000000;
    const days = value => Number.isInteger(value) && value >= 0 && value <= 365;
    const validBackground = typeof input.backgroundUrl === 'string' && (input.backgroundUrl.startsWith('/media/') && !input.backgroundUrl.includes('..') || (() => { try { return new URL(input.backgroundUrl).protocol === 'https:'; } catch { return false; } })());
    const validWallet = input.trc20Wallet === '' || (typeof input.trc20Wallet === 'string' && /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(input.trc20Wallet));
    const validEmail = input.socialEmail === '' || (typeof input.socialEmail === 'string' && input.socialEmail.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.socialEmail));
    const validSocialUrl = (value, hosts) => {
      if (value === '') return true;
      if (typeof value !== 'string' || value.length > 500) return false;
      try { const url = new URL(value); return url.protocol === 'https:' && hosts.some(host => url.hostname === host || url.hostname === `www.${host}`); }
      catch { return false; }
    };
    const validSocials = validEmail && validSocialUrl(input.socialWhatsApp, ['wa.me', 'api.whatsapp.com']) &&
      validSocialUrl(input.socialTelegram, ['t.me', 'telegram.me']) && validSocialUrl(input.socialInstagram, ['instagram.com']);
    const endTime = input.offerEndsAt === '' ? 0 : new Date(input.offerEndsAt).getTime();
    const offerEndsAt = input.offerEndsAt === '' ? '' : Number.isFinite(endTime) ? new Date(endTime).toISOString() : '';
    const plans = ['evenOdd', 'overUnder', 'matches'];
    const validPlans = plans.every(plan => price(input[`${plan}Price`]) && price(input[`${plan}Offer`]) && input[`${plan}Offer`] <= input[`${plan}Price`] && days(input[`${plan}Days`]));
    if (!validBackground || !validPlans ||
      typeof input.offerEnabled !== 'boolean' || !['videoOpacity','glassOpacity'].every(key => typeof input[key] === 'number' && input[key] >= 0.1 && input[key] <= 0.9) ||
      typeof input.promoHeading !== 'string' || !input.promoHeading.trim() || input.promoHeading.length > 90 || typeof input.promoSubheading !== 'string' || !input.promoSubheading.trim() || input.promoSubheading.length > 140 || !validWallet ||
      input.offerEndsAt !== '' && !Number.isFinite(new Date(input.offerEndsAt).getTime()) ||
      input.offerEnabled && (!offerEndsAt || endTime <= Date.now()) || !validSocials) throw error(400, 'Check the prices, terms, media URL, offer end time, TRC20 address and contact links.');
    const current = await one('SELECT settings FROM site_settings WHERE id=true');
    const settings = { ...(current?.settings || {}), backgroundUrl: input.backgroundUrl, videoOpacity: input.videoOpacity, glassOpacity: input.glassOpacity,
      ...Object.fromEntries(plans.flatMap(plan => [[`${plan}Price`, input[`${plan}Price`]], [`${plan}Offer`, input[`${plan}Offer`]], [`${plan}Days`, input[`${plan}Days`]]])), offerEnabled: input.offerEnabled, offerEndsAt,
      promoHeading: input.promoHeading.trim(), promoSubheading: input.promoSubheading.trim(), trc20Wallet: input.trc20Wallet,
      socialEmail: input.socialEmail.trim(), socialWhatsApp: input.socialWhatsApp.trim(),
      socialTelegram: input.socialTelegram.trim(), socialInstagram: input.socialInstagram.trim() };
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
      approve: "SET status='approved',reviewed_by=$2,reviewed_at=now(),days=0,expires=NULL WHERE id=$1 AND status='pending' AND deleted_at IS NULL",
      decline: "SET status='declined',reviewed_by=$2,reviewed_at=now() WHERE id=$1 AND status='pending'",
      revoke: "SET revoked_at=now() WHERE id=$1 AND status='approved' AND revoked_at IS NULL AND $2::text IS NOT NULL",
      delete: "SET deleted_at=now(),revoked_at=coalesce(revoked_at,now()) WHERE id=$1 AND deleted_at IS NULL",
    };
    if (typeof action !== 'string' || !Object.hasOwn(operations, action)) throw error(400, 'Invalid action.');
    const adminActor = account || (passwordAdmin ? 'password-admin' : null);
    const args = [paymentId, adminActor, action];
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
