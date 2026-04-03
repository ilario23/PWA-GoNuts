-- PostgREST upsert uses ON CONFLICT (recurrence_key) without a predicate.
-- A partial unique index (WHERE ...) is NOT eligible for that form of ON CONFLICT.
-- Use a plain unique index on recurrence_key (multiple NULLs allowed) and clear
-- recurrence_key when soft-deleting so deleted rows do not block idempotent inserts.

-- Keep a single active row per recurrence_key when duplicates exist
DELETE FROM public.transactions a
  USING public.transactions b
 WHERE a.recurrence_key IS NOT NULL
   AND a.recurrence_key = b.recurrence_key
   AND a.deleted_at IS NULL
   AND b.deleted_at IS NULL
   AND a.id::text > b.id::text;

UPDATE public.transactions
   SET recurrence_key = NULL
 WHERE deleted_at IS NOT NULL
   AND recurrence_key IS NOT NULL;

DROP INDEX IF EXISTS public.idx_transactions_recurrence_key_unique;

CREATE UNIQUE INDEX idx_transactions_recurrence_key_unique
  ON public.transactions (recurrence_key);

CREATE OR REPLACE FUNCTION public.clear_transaction_recurrence_key_when_deleted()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    NEW.recurrence_key := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_transaction_recurrence_key_when_deleted ON public.transactions;

CREATE TRIGGER clear_transaction_recurrence_key_when_deleted
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE PROCEDURE public.clear_transaction_recurrence_key_when_deleted();

COMMENT ON INDEX public.idx_transactions_recurrence_key_unique IS
  'Idempotent recurring upserts via PostgREST on_conflict=recurrence_key; cleared on soft delete';
