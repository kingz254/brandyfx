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
    const url = new URL(req.url, base);
    if (url.pathname === '/api/handler') {
      const routedPath = url.searchParams.get('path');
      if (!routedPath || routedPath.includes('..')) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'Page unavailable.' }));
      }
      url.pathname = '/api/' + routedPath.replace(/^\/+/, '');
      url.searchParams.delete('path');
    }
    await api(req, res, url);
  } catch (cause) {
    if (!cause.status) console.error('API request failed', cause.code || cause.name);
    if (!res.headersSent && !res.destroyed) {
      res.writeHead(cause.status || 500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: cause.status ? cause.message : 'Service temporarily unavailable.' }));
    } else if (!res.writableEnded) res.end();
  }
}
