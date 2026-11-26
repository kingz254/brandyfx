import { api } from '../server.mjs';

export default async function handler(req, res) {
  const first = value => String(value || '').split(',')[0].trim();
  const protocol = first(req.headers['x-forwarded-proto']) || 'https';
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host);
  const base = `${protocol}://${host}`;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; style-src 'self'; script-src 'self'; img-src 'self' data: https:; media-src 'self' https:");
  res.setHeader('Cache-Control', 'no-store');
  try {
    await api(req, res, new URL(req.url, base));
  } catch (cause) {
    if (!cause.status) console.error('API request failed', cause.code || cause.name);
    if (!res.headersSent && !res.destroyed) {
      res.writeHead(cause.status || 500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: cause.status ? cause.message : 'Service temporarily unavailable.' }));
    } else if (!res.writableEnded) res.end();
  }
}
