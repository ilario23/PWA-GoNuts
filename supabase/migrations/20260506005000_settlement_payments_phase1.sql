-- Phase 1: proper group settlements table + migration marker in user_settings

alter table public.user_settings
  add column if not exists legacy_settlement_migrated_at timestamptz;

create table if not exists public.settlement_payments (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade not null,
  from_member_id uuid references public.group_members(id) on delete restrict not null,
  to_member_id uuid references public.group_members(id) on delete restrict not null,
  amount numeric not null check (amount > 0),
  date date not null default current_date,
  note text,
  created_by uuid references auth.users(id) not null,
  deleted_at timestamptz,
  sync_token bigint default nextval('global_sync_token_seq'),
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  constraint settlement_from_to_different check (from_member_id <> to_member_id)
);

alter table public.settlement_payments enable row level security;

create policy "Members can view settlement payments"
  on public.settlement_payments for select
  using (is_group_member(group_id) or is_group_creator(group_id));

create policy "Members can insert settlement payments"
  on public.settlement_payments for insert
  with check (
    (select auth.uid()) = created_by
    and is_group_member(group_id)
  );

create policy "Creator or payer can update settlement payments"
  on public.settlement_payments for update
  using (
    is_group_creator(group_id)
    or exists (
      select 1
      from public.group_members gm
      where gm.id = from_member_id
        and gm.user_id = (select auth.uid())
        and gm.removed_at is null
    )
  );

create trigger update_settlement_payments_sync_token
  before update on public.settlement_payments
  for each row execute procedure update_sync_token();

create index if not exists idx_settlement_payments_group_id
  on public.settlement_payments(group_id);
create index if not exists idx_settlement_payments_from_member_id
  on public.settlement_payments(from_member_id);
create index if not exists idx_settlement_payments_to_member_id
  on public.settlement_payments(to_member_id);
create index if not exists idx_settlement_payments_date
  on public.settlement_payments(date desc);
create index if not exists idx_settlement_payments_deleted_at
  on public.settlement_payments(deleted_at)
  where deleted_at is null;

alter publication supabase_realtime add table public.settlement_payments;
