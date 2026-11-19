-- ============================================================================
-- Guest -> real user migration via invite link
-- ----------------------------------------------------------------------------
-- A group creator can generate a single-use invite for a guest member. When a
-- signed-in user claims it, the guest's group_members row is re-bound to that
-- user IN PLACE (same id): user_id is set, is_guest=false, guest_name cleared.
-- Because every expense / recurring / settlement references group_members.id,
-- the guest's whole history transfers to the new user with no data rewrite.
--
-- RLS only lets the creator touch group_members, so the claim runs in
-- SECURITY DEFINER RPCs. The table itself has no write policies.
-- ============================================================================

create table if not exists public.guest_invites (
  id uuid primary key default uuid_generate_v4(),
  -- Unguessable bearer secret (2 x uuid v4 = ~244 random bits).
  token text not null unique
    default replace(uuid_generate_v4()::text || uuid_generate_v4()::text, '-', ''),
  group_id uuid not null references public.groups(id) on delete cascade,
  member_id uuid not null references public.group_members(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now()
);

alter table public.guest_invites enable row level security;

-- Creator can see invites for their groups (tokens never reach other users).
create policy "Creator can view guest invites"
  on public.guest_invites for select
  using (is_group_creator(group_id));

create index if not exists idx_guest_invites_member_id
  on public.guest_invites(member_id);
create index if not exists idx_guest_invites_group_id
  on public.guest_invites(group_id);


-- ----------------------------------------------------------------------------
-- create_guest_invite(member_id) -> token
-- Creator only. Revokes any still-open invite for the same guest first.
-- ----------------------------------------------------------------------------
create or replace function public.create_guest_invite(p_member_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  gid uuid;
  new_token text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select gm.group_id into gid
  from public.group_members gm
  where gm.id = p_member_id
    and gm.is_guest = true
    and gm.user_id is null
    and gm.removed_at is null;

  if gid is null then
    raise exception 'guest_unavailable';
  end if;

  if not public.is_group_creator(gid) then
    raise exception 'not_allowed';
  end if;

  update public.guest_invites
     set revoked_at = now()
   where member_id = p_member_id
     and claimed_at is null
     and revoked_at is null;

  insert into public.guest_invites (group_id, member_id, created_by)
  values (gid, p_member_id, uid)
  returning token into new_token;

  return new_token;
end;
$$;


-- ----------------------------------------------------------------------------
-- get_guest_invite(token) -> { status, group_name, guest_name }
-- Lets the invitee see what they are joining before confirming.
-- status: valid | expired | claimed | revoked | unavailable | not_found
-- ----------------------------------------------------------------------------
create or replace function public.get_guest_invite(p_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  inv public.guest_invites;
  g_name text;
  m public.group_members;
  st text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into inv from public.guest_invites where token = p_token;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into m from public.group_members where id = inv.member_id;
  select name into g_name from public.groups where id = inv.group_id;

  if inv.claimed_at is not null then
    st := 'claimed';
  elsif inv.revoked_at is not null then
    st := 'revoked';
  elsif inv.expires_at < now() then
    st := 'expired';
  elsif m.id is null or m.is_guest is not true or m.user_id is not null or m.removed_at is not null then
    st := 'unavailable';
  else
    st := 'valid';
  end if;

  return jsonb_build_object(
    'status', st,
    'group_name', g_name,
    'guest_name', m.guest_name
  );
end;
$$;


-- ----------------------------------------------------------------------------
-- claim_guest_invite(token) -> group_id
-- Atomically re-binds the guest member to the calling user.
-- ----------------------------------------------------------------------------
create or replace function public.claim_guest_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv public.guest_invites;
  m public.group_members;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into inv from public.guest_invites where token = p_token for update;
  if not found then
    raise exception 'invite_not_found';
  end if;
  if inv.claimed_at is not null then
    raise exception 'invite_already_claimed';
  end if;
  if inv.revoked_at is not null then
    raise exception 'invite_revoked';
  end if;
  if inv.expires_at < now() then
    raise exception 'invite_expired';
  end if;

  select * into m from public.group_members where id = inv.member_id for update;
  if not found
     or m.is_guest is not true
     or m.user_id is not null
     or m.removed_at is not null then
    raise exception 'guest_unavailable';
  end if;

  -- unique(group_id, user_id): the caller must not already have a row here
  -- (active or previously removed).
  if exists (
    select 1 from public.group_members
    where group_id = inv.group_id and user_id = uid
  ) then
    raise exception 'already_member';
  end if;

  -- The BEFORE UPDATE trigger bumps sync_token/updated_at so every other
  -- member's client picks the change up on its next pull / realtime event.
  update public.group_members
     set user_id = uid,
         is_guest = false,
         guest_name = null
   where id = inv.member_id;

  update public.guest_invites
     set claimed_by = uid,
         claimed_at = now()
   where id = inv.id;

  return inv.group_id;
end;
$$;

revoke all on function public.create_guest_invite(uuid) from public, anon;
revoke all on function public.get_guest_invite(text) from public, anon;
revoke all on function public.claim_guest_invite(text) from public, anon;
grant execute on function public.create_guest_invite(uuid) to authenticated;
grant execute on function public.get_guest_invite(text) to authenticated;
grant execute on function public.claim_guest_invite(text) to authenticated;
