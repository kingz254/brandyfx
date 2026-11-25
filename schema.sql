CREATE TABLE IF NOT EXISTS oauth_attempts (
  id text PRIMARY KEY, state text NOT NULL, verifier text NOT NULL, expires timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY, account_id text, accounts text[] NOT NULL, expires timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS offer (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL, days integer NOT NULL CHECK (days BETWEEN 1 AND 365),
  instructions text NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, account_id text NOT NULL,
  reference text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined')),
  created timestamptz NOT NULL DEFAULT now(),
  amount numeric(12,2) NOT NULL, currency text NOT NULL, days integer NOT NULL,
  reviewed_by text, reviewed_at timestamptz, expires timestamptz, revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS payments_member ON payments(account_id, id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_pending ON payments(account_id) WHERE status='pending';
CREATE TABLE IF NOT EXISTS pass_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id bigint NOT NULL REFERENCES payments(id), actor text NOT NULL,
  action text NOT NULL, created timestamptz NOT NULL DEFAULT now(), expires timestamptz
);
CREATE TABLE IF NOT EXISTS markets (
  symbol text PRIMARY KEY, name text NOT NULL, quote text, points jsonb NOT NULL DEFAULT '[]',
  updated timestamptz, ready boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS signals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  symbol text NOT NULL, family text NOT NULL, label text NOT NULL, digit integer,
  issued timestamptz NOT NULL, expires timestamptz NOT NULL, version text NOT NULL,
  UNIQUE (symbol, family, issued)
);
CREATE INDEX IF NOT EXISTS signals_recent ON signals(version, issued DESC, id DESC);
