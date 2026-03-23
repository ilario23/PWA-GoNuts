-- Optional manual cleanup (e.g. run in SQL editor with service role if needed).
-- Removes duplicate active rows sharing the same recurrence_key, keeping the lexicographically smallest id.
-- Safe to run multiple times.

DELETE FROM public.transactions a
  USING public.transactions b
 WHERE a.recurrence_key IS NOT NULL
   AND a.recurrence_key = b.recurrence_key
   AND a.deleted_at IS NULL
   AND b.deleted_at IS NULL
   AND a.id::text > b.id::text;
