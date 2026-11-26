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
UPDATE site_settings SET settings=(settings - 'riseFallPrice' - 'riseFallOffer' - 'riseFallDays') || jsonb_build_object(
  'evenOddPrice',COALESCE(settings->'evenOddPrice',settings->'riseFallPrice','300'::jsonb),
  'evenOddOffer',COALESCE(settings->'evenOddOffer',settings->'riseFallOffer','200'::jsonb),
  'evenOddDays',COALESCE(settings->'evenOddDays',settings->'riseFallDays','0'::jsonb)
) WHERE id=true;
UPDATE site_settings SET settings='{"evenOddPrice":300,"evenOddOffer":200,"evenOddDays":0,"overUnderPrice":300,"overUnderOffer":200,"overUnderDays":0,"matchesPrice":450,"matchesOffer":300,"matchesDays":0}'::jsonb || settings WHERE id=true;
CREATE TABLE IF NOT EXISTS payments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, account_id text NOT NULL,
  reference text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined')),
  created timestamptz NOT NULL DEFAULT now(),
  amount numeric(12,2) NOT NULL, currency text NOT NULL, days integer NOT NULL,
  package text NOT NULL DEFAULT 'evenOdd' CHECK(package IN ('regular','premium','evenOdd','overUnder','matches')),
  reviewed_by text, reviewed_at timestamptz, expires timestamptz, revoked_at timestamptz
);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS package text NOT NULL DEFAULT 'regular';
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_package_check;
UPDATE payments SET package='evenOdd' WHERE package='riseFall';
ALTER TABLE payments ALTER COLUMN package SET DEFAULT 'evenOdd';
ALTER TABLE payments ADD CONSTRAINT payments_package_check CHECK(package IN ('regular','premium','evenOdd','overUnder','matches'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_email text NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_country text NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS rot_number text NOT NULL DEFAULT '';
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS payments_member ON payments(account_id, id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_pending ON payments(account_id) WHERE status='pending';
CREATE TABLE IF NOT EXISTS account_management_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  amount numeric(12,2) NOT NULL CHECK (amount BETWEEN 100 AND 600),
  start_date date NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed')),
  created timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE account_management_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS account_management_requests_recent ON account_management_requests(created DESC);
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
