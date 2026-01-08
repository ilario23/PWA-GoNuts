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
$$ language plpgsql set search_path = public;


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


-- 0b. Group Members Table (created BEFORE helper functions that reference it)
create table public.group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references auth.users(id), -- Nullable for guests
  guest_name text, -- Required if user_id is null
  is_guest boolean default false,
  share numeric not null check (share >= 0 and share <= 100),
  joined_at timestamptz default now(),
  removed_at timestamptz,
  sync_token bigint default nextval('global_sync_token_seq'),
  updated_at timestamptz default now(),
  -- Unique constraint: A real user can be in a group only once. 
  -- We allow multiple guests in the same group (duplicates allowed by name? maybe strictly no, but for now ID based)
  unique(group_id, user_id),
  constraint guest_check check (
    (is_guest = false and user_id is not null) or
    (is_guest = true and user_id is null and guest_name is not null)
  )
);

alter table public.group_members enable row level security;


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
$$ language plpgsql security definer set search_path = public;

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
$$ language plpgsql security definer set search_path = public;


-- Groups RLS Policies
create policy "Members can view their groups"
  on public.groups for select
  using (is_group_member(id) or created_by = (select auth.uid()));

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check ((select auth.uid()) = created_by);

create policy "Only creator can update group"
  on public.groups for update
  using ((select auth.uid()) = created_by);

create policy "Only creator can delete group"
  on public.groups for delete
  using ((select auth.uid()) = created_by);

create trigger update_groups_sync_token
  before update on public.groups
  for each row execute procedure update_sync_token();


-- Group Members RLS Policies
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
    (group_id is null and (select auth.uid()) = user_id)
    or (group_id is not null and is_group_member(group_id))
  );

create policy "Users can insert personal or group categories"
  on public.categories for insert
  with check (
    (select auth.uid()) = user_id
    and (group_id is null or is_group_member(group_id))
  );

create policy "Users can update their own or group categories"
  on public.categories for update
  using (
    (group_id is null and (select auth.uid()) = user_id)
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
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own contexts"
  on public.contexts for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own contexts"
  on public.contexts for update
  using ((select auth.uid()) = user_id);

create trigger update_contexts_sync_token
  before update on public.contexts
  for each row execute procedure update_sync_token();


-- 3. Transactions Table
-- If group_id IS NULL -> personal transaction
-- If group_id IS NOT NULL -> group transaction (paid_by_member_id required)
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  group_id uuid references public.groups(id),
  paid_by_member_id uuid references public.group_members(id),
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
  -- Constraint: Single Payer Source Truth
  constraint paid_by_logic check (
    (group_id is null and paid_by_member_id is null) or 
    (group_id is not null and paid_by_member_id is not null)
  )
);

alter table public.transactions enable row level security;

create policy "Users can view their own or group transactions"
  on public.transactions for select
  using (
    (group_id is null and (select auth.uid()) = user_id)
    or (group_id is not null and is_group_member(group_id))
  );

create policy "Users can insert personal or group transactions"
  on public.transactions for insert
  with check (
    (select auth.uid()) = user_id
    and (group_id is null or is_group_member(group_id))
  );

create policy "Users can update their own or group transactions"
  on public.transactions for update
  using (
    (group_id is null and (select auth.uid()) = user_id)
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
  paid_by_member_id uuid references public.group_members(id),
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
  -- Constraint: Single Payer Source Truth
  constraint recurring_paid_by_logic check (
    (group_id is null and paid_by_member_id is null) or 
    (group_id is not null and paid_by_member_id is not null)
  )
);

alter table public.recurring_transactions enable row level security;

create policy "Users can view their own or group recurring transactions"
  on public.recurring_transactions for select
  using (
    (group_id is null and (select auth.uid()) = user_id)
    or (group_id is not null and is_group_member(group_id))
  );

create policy "Users can insert personal or group recurring transactions"
  on public.recurring_transactions for insert
  with check (
    (select auth.uid()) = user_id
    and (group_id is null or is_group_member(group_id))
  );

create policy "Users can update their own or group recurring transactions"
  on public.recurring_transactions for update
  using (
    (group_id is null and (select auth.uid()) = user_id)
    or (group_id is not null and is_group_member(group_id))
  );

create trigger update_recurring_transactions_sync_token
  before update on public.recurring_transactions
  for each row execute procedure update_sync_token();


-- 5. User Settings Table
create table public.user_settings (
  user_id uuid primary key references auth.users(id) not null,
  currency text default 'EUR',
  language text default 'en',
  theme text default 'light',
  accent_color text default 'slate',
  start_of_week text default 'monday',
  default_view text default 'list',
  include_investments_in_expense_totals boolean default false,
  include_group_expenses boolean default false,
  monthly_budget numeric(12, 2),
  cached_month integer,
  last_sync_token bigint default 0,
  updated_at timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "Users can view their own settings"
  on public.user_settings for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using ((select auth.uid()) = user_id);


-- 6. Category Budgets Table
create table public.category_budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  category_id uuid references public.categories(id) not null,
  amount numeric(12, 2) not null,
  period text check (period in ('monthly', 'yearly')) not null default 'monthly',
  deleted_at timestamptz,
  sync_token bigint default nextval('global_sync_token_seq'),
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id, category_id, period)
);

alter table public.category_budgets enable row level security;

create policy "Users can view their own category budgets"
  on public.category_budgets for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own category budgets"
  on public.category_budgets for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own category budgets"
  on public.category_budgets for update
  using ((select auth.uid()) = user_id);

create trigger update_category_budgets_sync_token
  before update on public.category_budgets
  for each row execute procedure update_sync_token();


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
create index idx_transactions_paid_by on public.transactions(paid_by_member_id) where paid_by_member_id is not null;

-- Recurring Transactions
create index idx_recurring_transactions_group_id on public.recurring_transactions(group_id) where group_id is not null;

-- Category Budgets
create index idx_category_budgets_user_id on public.category_budgets(user_id);
create index idx_category_budgets_category_id on public.category_budgets(category_id);

-- Unindexed Foreign Keys (Performance Fixes)
create index idx_categories_parent_id on public.categories(parent_id) where parent_id is not null;
create index idx_categories_user_id on public.categories(user_id);
create index idx_contexts_user_id on public.contexts(user_id);
create index idx_transactions_category_id on public.transactions(category_id);
create index idx_transactions_context_id on public.transactions(context_id) where context_id is not null;
create index idx_transactions_user_id on public.transactions(user_id);
create index idx_recurring_transactions_category_id on public.recurring_transactions(category_id);
create index idx_recurring_transactions_context_id on public.recurring_transactions(context_id) where context_id is not null;
create index idx_recurring_transactions_paid_by on public.recurring_transactions(paid_by_member_id) where paid_by_member_id is not null;
create index idx_recurring_transactions_user_id on public.recurring_transactions(user_id);


-- ============================================================================
-- REALTIME PUBLICATIONS
-- ============================================================================
-- Enable Realtime for all tables that need live sync.
-- IMPORTANT: Realtime respects RLS policies. The SELECT policies above
-- determine what changes each user receives via Realtime subscriptions.

alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.group_members;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.contexts;
alter publication supabase_realtime add table public.recurring_transactions;
alter publication supabase_realtime add table public.category_budgets;
-- Function to check if a user exists by ID
-- This is secure because it uses SECURITY DEFINER to access auth.users
-- but only returns a boolean, leaking no other information.

create or replace function public.check_user_exists(user_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from auth.users where id = user_id
  );
end;
$$;
alter function public.check_user_exists(user_id uuid) set search_path = public;
-- ============================================================================
-- PUBLIC PROFILES
-- ============================================================================

-- 1. Create Table
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamptz default now(),
  sync_token bigint default nextval('global_sync_token_seq')
);

-- 2. Enable RLS
alter table public.profiles enable row level security;

-- 3. RLS Policies
-- Everyone can read profiles (needed for group members to see each other)
create policy "Public profiles are viewable by everyone" 
  on public.profiles for select 
  using (true);

-- Users can only insert their own profile
create policy "Users can insert their own profile" 
  on public.profiles for insert 
  with check ((select auth.uid()) = id);

-- Users can only update their own profile
create policy "Users can update own profile" 
  on public.profiles for update 
  using ((select auth.uid()) = id);

-- 4. Triggers for Sync Token
create trigger update_profiles_sync_token
  before update on public.profiles
  for each row execute procedure update_sync_token();

-- 5. Automatic Profile Creation Trigger
-- This function copies data from auth.users to public.profiles when a new user signs up
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Realtime Publication
-- Add profiles to the realtime publication so clients can subscribe to changes
-- ============================================================================
-- STORAGE
-- ============================================================================

-- Create a new storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policy to allow public access to avatars
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Policy to allow authenticated users to upload their own avatar
create policy "Users can upload their own avatar."
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy to allow users to update their own avatar
create policy "Users can update their own avatar."
  on storage.objects for update
  using (
    bucket_id = 'avatars' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy to allow users to delete their own avatar
create policy "Users can delete their own avatar."
  on storage.objects for delete
  using (
    bucket_id = 'avatars' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
