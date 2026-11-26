# BrandyFx Signals

BrandyFx is a standalone React/TypeScript desk with Deriv OAuth, manual pass approval, PostgreSQL storage, and a server-side Deriv tick worker.

## Preview

Run `npm ci` and `npm run dev`. Open `http://127.0.0.1:5173` for the sign-in page or `http://127.0.0.1:5173/?preview` for the sample desk. The sample desk is development-only.

## Staging

1. Copy `.env.example` to `.env`. Set a PostgreSQL connection string and create the schema with `node --env-file=.env db.mjs migrate`.
2. Create a New API OAuth client in Deriv and register the exact `APP_ORIGIN/api/deriv/callback` URI. Register the `trade` scope for the Options account lookup. Set the client ID and an allowlist of administrator Deriv Options account IDs. Use the same verified Options account to retain a pass.
3. Run `npm run worker` and `npm run dev` locally. For HTTPS staging, run `npm run build` and `npm start` behind a reverse proxy. Disable proxy buffering for `/api/stream` and keep its idle timeout above the event interval.
4. Sign in as an allowlisted admin and review the live desk and replay outputs. Configure the actual fee, currency, duration, and payment instructions. Enable paid access by setting `APPROVED_RULE_VERSION=brandyfx-even-odd-1` on the app server only after approving the signals. Keep it unset while evaluating them.
5. Check member OAuth and the manual payment workflow in staging. Approve only after verifying the reference, currency, and amount against the payment account. Verify logout, expiry, revocation, and reconnect with the existing stream open.

The server and the worker share PostgreSQL. The worker holds a database lock to prevent duplicate ingestion from a second worker. Monitor its request errors, the market freshness status, and app/database availability. Re-run `npm test` and `npm run build` before deployment.

### Replay

Run `node replay.mjs ticks.json` with recorded Deriv ticks in chronological order. Input is an object with a numeric `precision` and a `ticks` array of `{ "epoch": 1700000000, "quote": "123.45" }` entries. Output is a JSON line per candidate. The live worker additionally applies a per-market, per-family cooldown.

## Implementation plan and design

- **Visual direction.** Midnight ink surfaces, ivory typography, copper selection and price traces, a market ribbon, and compact chronological history. Mobile stacks the desk and history. Motion responds to incoming values and respects reduced-motion preferences.
- **Member and payment flow.** Deriv sign-in leads to payment instructions, review status, and the dashboard. The offer is configurable. The admin reviews references and audited pass actions. Sessions use opaque cookies and provider tokens are discarded after the account lookup.
- **Signal baseline.** Even/Odd uses the published precision of each Deriv quote to classify its final digit, then compares parity frequencies over 255 ticks and the latest 55 ticks. A signal is emitted only when one parity exceeds 57% over the full window and 55% over the short window. This is an experimental heuristic, not a forecast or guarantee; any predictive value needs independent validation before launch.
- **Gate.** Check replay, access boundaries, and the full staging flow before enabling the approved rule version. Members place trades separately in Deriv.
