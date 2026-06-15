-- ============================================================================
-- Security & privacy hardening (audit 2026-06-16)
-- ----------------------------------------------------------------------------
-- 1. Scope profiles SELECT (stop world-readable emails)
-- 2. Add WITH CHECK to every UPDATE policy (close row-mutation escape)
-- 4. Server-side amount/length CHECK constraints (defense beyond client zod)
-- 5. Server-side soft-delete purge + self-serve account deletion (GDPR erasure)
-- (Step numbers match the audit backlog; 3/6/7/8/9/10 are client/tooling.)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES: stop exposing every user's email to every authenticated user.
--    Old policy was `using (true)` → any logged-in user could read all rows.
--    New: a profile is visible to its owner and to users who share a group.
-- ----------------------------------------------------------------------------

-- security definer so the membership lookup bypasses group_members' own RLS
-- (no policy recursion); stable so the planner can cache it per statement.
create or replace function public.shares_group_with(target_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm_self
    join public.group_members gm_other
      on gm_other.group_id = gm_self.group_id
    where gm_self.user_id = auth.uid()
      and gm_self.removed_at is null
      and gm_other.user_id = target_user
      and gm_other.removed_at is null
  );
$$;

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Profiles viewable by self or group co-members"
  on public.profiles for select
  using (id = (select auth.uid()) or public.shares_group_with(id));

-- ----------------------------------------------------------------------------
-- 2. WITH CHECK on every UPDATE policy.
--    `using` only gates which existing rows may be targeted; without
--    `with check` the NEW row is unvalidated, so a row can be mutated into a
--    state the user could never INSERT (e.g. reassigning user_id/group_id).
--    Each `with check` below mirrors the table's INSERT rule.
-- ----------------------------------------------------------------------------

drop policy if exists "Only creator can update group" on public.groups;
create policy "Only creator can update group" on public.groups for update
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

drop policy if exists "Only creator can update members" on public.group_members;
create policy "Only creator can update members" on public.group_members for update
  using (is_group_creator(group_id))
  with check (is_group_creator(group_id));

drop policy if exists "Users can update their own or group categories" on public.categories;
create policy "Users can update their own or group categories" on public.categories for update
  using (
    (group_id is null and (select auth.uid()) = user_id)
    or (group_id is not null and is_group_member(group_id))
  )
  with check (
    (group_id is null and (select auth.uid()) = user_id)
    or (group_id is not null and is_group_member(group_id))
  );

drop policy if exists "Users can update their own contexts" on public.contexts;
create policy "Users can update their own contexts" on public.contexts for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own or group transactions" on public.transactions;
create policy "Users can update their own or group transactions" on public.transactions for update
  using (
    (group_id is null and (select auth.uid()) = user_id)
    or (group_id is not null and is_group_member(group_id))
  )
  with check (
    (group_id is null and (select auth.uid()) = user_id)
    or (group_id is not null and is_group_member(group_id))
  );

drop policy if exists "Users can update their own or group recurring transactions" on public.recurring_transactions;
create policy "Users can update their own or group recurring transactions" on public.recurring_transactions for update
  using (
    (group_id is null and (select auth.uid()) = user_id)
    or (group_id is not null and is_group_member(group_id))
  )
  with check (
    (group_id is null and (select auth.uid()) = user_id)
    or (group_id is not null and is_group_member(group_id))
  );

drop policy if exists "Users can update their own settings" on public.user_settings;
create policy "Users can update their own settings" on public.user_settings for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own category budgets" on public.category_budgets;
create policy "Users can update their own category budgets" on public.category_budgets for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ----------------------------------------------------------------------------
-- 4. Server-side validation constraints. The client validates with zod, but a
--    crafted PostgREST call bypasses that. Added NOT VALID so existing rows are
--    not rescanned (no migration failure on legacy data); enforced going forward.
-- ----------------------------------------------------------------------------

alter table public.transactions
  add constraint transactions_amount_positive check (amount > 0) not valid;
alter table public.transactions
  add constraint transactions_description_len check (char_length(description) <= 500) not valid;

alter table public.recurring_transactions
  add constraint recurring_amount_positive check (amount > 0) not valid;
alter table public.recurring_transactions
  add constraint recurring_description_len check (char_length(description) <= 500) not valid;

alter table public.category_budgets
  add constraint category_budgets_amount_nonneg check (amount >= 0) not valid;

alter table public.categories
  add constraint categories_name_len check (char_length(name) <= 100) not valid;

-- ----------------------------------------------------------------------------
-- 5a. Server-side purge of synced soft-deletes (GDPR storage minimisation).
--     The client cleanup only frees the local device; server rows lived
--     forever. This hard-deletes rows soft-deleted longer than retention_days.
-- ----------------------------------------------------------------------------

create or replace function public.purge_soft_deleted(retention_days int default 30)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - make_interval(days => retention_days);
begin
  delete from public.transactions            where deleted_at is not null and deleted_at < cutoff;
  delete from public.recurring_transactions  where deleted_at is not null and deleted_at < cutoff;
  delete from public.category_budgets         where deleted_at is not null and deleted_at < cutoff;
  delete from public.contexts                 where deleted_at is not null and deleted_at < cutoff;
  delete from public.categories               where deleted_at is not null and deleted_at < cutoff;
  delete from public.group_members            where removed_at is not null and removed_at < cutoff;
  delete from public.groups                   where deleted_at is not null and deleted_at < cutoff;
end;
$$;

-- Schedule daily at 03:00 UTC if pg_cron is enabled (Supabase: enable in
-- Database → Extensions). Guarded so the migration succeeds either way.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.schedule(
        'purge-soft-deleted-daily',
        '0 3 * * *',
        $job$ select public.purge_soft_deleted(30); $job$
      );
    exception when others then
      raise notice 'pg_cron present but schedule failed: %', sqlerrm;
    end;
  else
    raise notice 'pg_cron not enabled — run purge_soft_deleted() via an external scheduler.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 5b. Self-serve account deletion (GDPR right to erasure). Deletes the caller's
--     own data in FK-safe order (children before parents), groups they created,
--     their profile, then the auth.users row.
-- ----------------------------------------------------------------------------

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Groups this user created: remove dependent rows before the group itself.
  delete from public.transactions           where group_id in (select id from public.groups where created_by = uid);
  delete from public.recurring_transactions where group_id in (select id from public.groups where created_by = uid);
  delete from public.settlement_payments    where group_id in (select id from public.groups where created_by = uid);
  delete from public.categories             where group_id in (select id from public.groups where created_by = uid);
  delete from public.group_members          where group_id in (select id from public.groups where created_by = uid);
  delete from public.groups                 where created_by = uid;

  -- Personal data (transactions before the categories/contexts they reference).
  delete from public.transactions           where user_id = uid;
  delete from public.recurring_transactions where user_id = uid;
  delete from public.category_budgets        where user_id = uid;
  delete from public.import_rules            where user_id = uid;
  delete from public.contexts                where user_id = uid;
  delete from public.categories              where user_id = uid;
  delete from public.user_settings           where user_id = uid;

  -- Memberships in other people's groups.
  delete from public.group_members           where user_id = uid;

  delete from public.profiles                where id = uid;
  delete from auth.users                     where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from anon;
revoke execute on function public.purge_soft_deleted(int) from anon, authenticated;
