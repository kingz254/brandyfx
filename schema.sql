CREATE TABLE IF NOT EXISTS oauth_attempts (
  id text PRIMARY KEY, state text NOT NULL, verifier text NOT NULL, expires timestamptz NOT NULL,
  return_to text NOT NULL DEFAULT '/'
);
ALTER TABLE oauth_attempts ADD COLUMN IF NOT EXISTS return_to text NOT NULL DEFAULT '/';
CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY, account_id text, accounts text[] NOT NULL, expires timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS offer (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL, days integer NOT NULL CHECK (days BETWEEN 1 AND 365),
  instructions text NOT NULL
);
CREATE TABLE IF NOT EXISTS site_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  settings jsonb NOT NULL
);
INSERT INTO site_settings(id,settings) VALUES(true,'{"backgroundUrl":"/media/brandyfx-background.mp4","videoOpacity":0.5,"glassOpacity":0.72,"regularPrice":300,"premiumPrice":450,"regularOffer":200,"premiumOffer":300,"regularDays":0,"premiumDays":0,"offerEnabled":false,"offerEndsAt":"","promoHeading":"Don''t miss your chance","promoSubheading":"Grants up to 20% off","trc20Wallet":""}'::jsonb)
ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS payments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, account_id text NOT NULL,
  reference text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined')),
  created timestamptz NOT NULL DEFAULT now(),
  amount numeric(12,2) NOT NULL, currency text NOT NULL, days integer NOT NULL,
  package text NOT NULL DEFAULT 'regular' CHECK(package IN ('regular','premium')),
  reviewed_by text, reviewed_at timestamptz, expires timestamptz, revoked_at timestamptz
);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS package text NOT NULL DEFAULT 'regular';
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
