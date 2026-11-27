ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_days_check;
ALTER TABLE payments ADD CONSTRAINT payments_days_check CHECK (days >= 0);

DROP INDEX IF EXISTS payments_one_pending;
CREATE UNIQUE INDEX payments_one_pending
  ON payments(account_id)
  WHERE status = 'pending' AND deleted_at IS NULL;
