-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create a sequence for sync_tokens
create sequence if not exists global_sync_token_seq;

-- Function to update sync_token and updated_at on change
create or replace function update_sync_token()
returns trigger as $$
begin
  new.sync_token := nextval('global_sync_token_seq');
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;


-- ============================================================================
-- GROUPS & MEMBERS
-- ============================================================================

-- 0a. Groups Table
create table public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_by uuid references auth.users(id) not null,
  deleted_at timestamptz,
  sync_token bigint default nextval('global_sync_token_seq'),
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.groups enable row level security;

-- Helper function: check if user is a member of the group
create or replace function is_group_member(group_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.group_members
    where group_members.group_id = $1
      and group_members.user_id = auth.uid()
      and group_members.removed_at is null
  );
end;
$$ language plpgsql security definer;

-- Helper function: check if user is the creator of the group
create or replace function is_group_creator(group_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.groups
    where groups.id = $1
      and groups.created_by = auth.uid()
  );
end;
$$ language plpgsql security definer;

create policy "Members can view their groups"
  on public.groups for select
  using (is_group_member(id) or created_by = auth.uid());

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() = created_by);

create policy "Only creator can update group"
  on public.groups for update
  using (auth.uid() = created_by);

create policy "Only creator can delete group"
  on public.groups for delete
  using (auth.uid() = created_by);

create trigger update_groups_sync_token
  before update on public.groups
  for each row execute procedure update_sync_token();


-- 0b. Group Members Table
create table public.group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  share numeric not null check (share >= 0 and share <= 100),
  joined_at timestamptz default now(),
  removed_at timestamptz,
  sync_token bigint default nextval('global_sync_token_seq'),
  updated_at timestamptz default now(),
  unique(group_id, user_id)
);

alter table public.group_members enable row level security;

create policy "Members can view group members"
  on public.group_members for select
  using (is_group_member(group_id) or is_group_creator(group_id));

create policy "Only creator can add members"
  on public.group_members for insert
  with check (is_group_creator(group_id));

create policy "Only creator can update members"
  on public.group_members for update
  using (is_group_creator(group_id));

create policy "Only creator can remove members"
  on public.group_members for delete
  using (is_group_creator(group_id));

create trigger update_group_members_sync_token
  before update on public.group_members
  for each row execute procedure update_sync_token();


-- ============================================================================
-- CATEGORIES, CONTEXTS, TRANSACTIONS
-- ============================================================================

-- 1. Categories Table
-- If group_id IS NULL -> personal category
-- If group_id IS NOT NULL -> group category (shared)
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  group_id uuid references public.groups(id),
  name text not null,
  icon text not null,
  color text not null,
  type text check (type in ('income', 'expense', 'investment')) not null,
  parent_id uuid references public.categories(id),
  active boolean default true,
  deleted_at timestamptz,
  sync_token bigint default nextval('global_sync_token_seq'),
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.categories enable row level security;

-- Personal categories: only owner can access
create policy "Users can view their own personal categories"
  on public.categories for select
  using (
    (group_id is null and auth.uid() = user_id)
    or (group_id is not null and is_group_member(group_id))
  );

create policy "Users can insert personal or group categories"
  on public.categories for insert
  with check (
    auth.uid() = user_id
    and (group_id is null or is_group_member(group_id))
  );

create policy "Users can update their own or group categories"
  on public.categories for update
  using (
    (group_id is null and auth.uid() = user_id)
    or (group_id is not null and is_group_member(group_id))
  );

create trigger update_categories_sync_token
  before update on public.categories
  for each row execute procedure update_sync_token();


-- 2. Contexts Table
create table public.contexts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  description text,
  active boolean default true,
  deleted_at timestamptz,
  sync_token bigint default nextval('global_sync_token_seq'),
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.contexts enable row level security;

create policy "Users can view their own contexts"
  on public.contexts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own contexts"
  on public.contexts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own contexts"
  on public.contexts for update
  using (auth.uid() = user_id);

create trigger update_contexts_sync_token
  before update on public.contexts
  for each row execute procedure update_sync_token();


-- 3. Transactions Table
-- If group_id IS NULL -> personal transaction
-- If group_id IS NOT NULL -> group transaction (paid_by_user_id required)
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  group_id uuid references public.groups(id),
  paid_by_user_id uuid references auth.users(id),
  category_id uuid references public.categories(id) not null,
  context_id uuid references public.contexts(id),
  type text check (type in ('income', 'expense', 'investment')) not null,
  amount numeric not null,
  date date not null,
  description text not null,
  deleted_at timestamptz,
  sync_token bigint default nextval('global_sync_token_seq'),
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  -- Constraint: paid_by_user_id required for group transactions
  constraint paid_by_required_for_group check (
    (group_id is null) or (group_id is not null and paid_by_user_id is not null)
  )
);

alter table public.transactions enable row level security;

create policy "Users can view their own or group transactions"
  on public.transactions for select
  using (
    (group_id is null and auth.uid() = user_id)
    or (group_id is not null and is_group_member(group_id))
  );

create policy "Users can insert personal or group transactions"
  on public.transactions for insert
  with check (
    auth.uid() = user_id
    and (group_id is null or is_group_member(group_id))
  );

create policy "Users can update their own or group transactions"
  on public.transactions for update
  using (
    (group_id is null and auth.uid() = user_id)
    or (group_id is not null and is_group_member(group_id))
  );

create trigger update_transactions_sync_token
  before update on public.transactions
  for each row execute procedure update_sync_token();


-- 4. Recurring Transactions Table
-- Supports group recurring transactions
create table public.recurring_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  group_id uuid references public.groups(id),
  paid_by_user_id uuid references auth.users(id),
  type text check (type in ('income', 'expense', 'investment')) not null,
  category_id uuid references public.categories(id) not null,
  context_id uuid references public.contexts(id),
  amount numeric not null,
  description text not null,
  frequency text check (frequency in ('daily', 'weekly', 'monthly', 'yearly')) not null,
  start_date date not null,
  end_date date,
  active boolean default true,
  last_generated timestamptz,
  deleted_at timestamptz,
  sync_token bigint default nextval('global_sync_token_seq'),
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  -- Constraint: paid_by_user_id required for group recurring transactions
  constraint recurring_paid_by_required_for_group check (
    (group_id is null) or (group_id is not null and paid_by_user_id is not null)
  )
);

alter table public.recurring_transactions enable row level security;

create policy "Users can view their own or group recurring transactions"
  on public.recurring_transactions for select
  using (
    (group_id is null and auth.uid() = user_id)
    or (group_id is not null and is_group_member(group_id))
  );

create policy "Users can insert personal or group recurring transactions"
  on public.recurring_transactions for insert
  with check (
    auth.uid() = user_id
    and (group_id is null or is_group_member(group_id))
  );

create policy "Users can update their own or group recurring transactions"
  on public.recurring_transactions for update
  using (
    (group_id is null and auth.uid() = user_id)
    or (group_id is not null and is_group_member(group_id))
  );

create trigger update_recurring_transactions_sync_token
  before update on public.recurring_transactions
  for each row execute procedure update_sync_token();


-- 5. User Settings Table
create table public.user_settings (
  user_id uuid primary key references auth.users(id) not null,
  currency text default 'EUR',
  theme text default 'light',
  start_of_week text default 'monday',
  default_view text default 'list',
  include_investments_in_expense_totals boolean default false,
  include_group_expenses boolean default false,
  cached_month integer,
  last_sync_token bigint default 0,
  updated_at timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);


-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Groups
create index idx_groups_created_by on public.groups(created_by);
create index idx_groups_deleted_at on public.groups(deleted_at) where deleted_at is null;

-- Group Members
create index idx_group_members_group_id on public.group_members(group_id);
create index idx_group_members_user_id on public.group_members(user_id);
create index idx_group_members_active on public.group_members(group_id, user_id) where removed_at is null;

-- Categories
create index idx_categories_group_id on public.categories(group_id) where group_id is not null;

-- Transactions
create index idx_transactions_group_id on public.transactions(group_id) where group_id is not null;
create index idx_transactions_paid_by on public.transactions(paid_by_user_id) where paid_by_user_id is not null;

-- Recurring Transactions
create index idx_recurring_transactions_group_id on public.recurring_transactions(group_id) where group_id is not null;
