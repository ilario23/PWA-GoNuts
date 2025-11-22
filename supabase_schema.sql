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

-- 1. Categories Table
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  icon text not null, -- Now required
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

create policy "Users can view their own categories"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "Users can insert their own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own categories"
  on public.categories for update
  using (auth.uid() = user_id);

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
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  category_id uuid references public.categories(id) not null, -- Now required
  context_id uuid references public.contexts(id),
  type text check (type in ('income', 'expense', 'investment')) not null,
  amount numeric not null,
  date date not null,
  description text not null,
  deleted_at timestamptz,
  sync_token bigint default nextval('global_sync_token_seq'),
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;

create policy "Users can view their own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create trigger update_transactions_sync_token
  before update on public.transactions
  for each row execute procedure update_sync_token();


-- 4. Recurring Transactions Table
create table public.recurring_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  type text check (type in ('income', 'expense', 'investment')) not null,
  category_id uuid references public.categories(id) not null, -- Now required
  context_id uuid references public.contexts(id),
  amount numeric not null,
  description text not null, -- Now required
  frequency text check (frequency in ('daily', 'weekly', 'monthly', 'yearly')) not null,
  start_date date not null,
  end_date date,
  active boolean default true,
  last_generated timestamptz,
  deleted_at timestamptz,
  sync_token bigint default nextval('global_sync_token_seq'),
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.recurring_transactions enable row level security;

create policy "Users can view their own recurring transactions"
  on public.recurring_transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own recurring transactions"
  on public.recurring_transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own recurring transactions"
  on public.recurring_transactions for update
  using (auth.uid() = user_id);

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
