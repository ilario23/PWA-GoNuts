-- Idempotent recurring occurrences: link + stable key + uniqueness (see src/lib/recurringOccurrence.ts)

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS recurring_transaction_id uuid REFERENCES public.recurring_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_occurrence_date date,
  ADD COLUMN IF NOT EXISTS recurrence_key text;

CREATE INDEX IF NOT EXISTS idx_transactions_recurring_transaction_id
  ON public.transactions (recurring_transaction_id)
  WHERE recurring_transaction_id IS NOT NULL;

-- One-time cleanup: keep a single row per recurrence_key when duplicates already exist (e.g. pre-fix clients)
DELETE FROM public.transactions a
  USING public.transactions b
 WHERE a.recurrence_key IS NOT NULL
   AND a.recurrence_key = b.recurrence_key
   AND a.deleted_at IS NULL
   AND b.deleted_at IS NULL
   AND a.id::text > b.id::text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_recurrence_key_unique
  ON public.transactions (recurrence_key)
  WHERE recurrence_key IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.transactions.recurrence_key IS 'Stable key: recurring_template_uuid|YYYY-MM-DD (matches client idempotency)';
COMMENT ON COLUMN public.transactions.recurring_transaction_id IS 'Source recurring template when this row was generated from recurrence';
COMMENT ON COLUMN public.transactions.recurrence_occurrence_date IS 'Calendar date of this occurrence (UTC date)';
