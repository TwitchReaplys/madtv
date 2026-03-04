create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique,
  title text not null,
  about text,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_members (
  creator_id uuid not null references public.creators (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'moderator', 'member')),
  created_at timestamptz not null default now(),
  primary key (creator_id, user_id)
);

create table if not exists public.tiers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators (id) on delete cascade,
  name text not null,
  description text,
  price_cents int not null check (price_cents > 0),
  currency text not null default 'CZK',
  interval text not null default 'month' check (interval = 'month'),
  rank int not null default 1 check (rank >= 1),
  stripe_product_id text,
  stripe_price_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists tiers_stripe_price_id_key on public.tiers (stripe_price_id) where stripe_price_id is not null;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  creator_id uuid not null references public.creators (id) on delete cascade,
  tier_id uuid references public.tiers (id) on delete set null,
  status text not null,
  current_period_end timestamptz,
  provider text not null default 'stripe',
  provider_subscription_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators (id) on delete cascade,
  author_user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  visibility text not null check (visibility in ('public', 'members', 'tier')),
  min_tier_rank int check (min_tier_rank is null or min_tier_rank >= 1),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_visibility_rank_check check (
    (visibility = 'tier' and min_tier_rank is not null)
    or (visibility in ('public', 'members') and min_tier_rank is null)
  )
);

create table if not exists public.post_assets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  type text not null check (type in ('image', 'bunny_video')),
  storage_path text,
  bunny_library_id text,
  bunny_video_id text,
  created_at timestamptz not null default now(),
  constraint post_assets_type_data_check check (
    (type = 'image' and storage_path is not null and bunny_video_id is null)
    or (type = 'bunny_video' and bunny_video_id is not null and bunny_library_id is not null)
  )
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_events (
  id text primary key,
  created_at timestamptz not null default now(),
  type text,
  payload jsonb
);

create index if not exists creators_owner_user_id_idx on public.creators (owner_user_id);
create index if not exists creator_members_user_id_idx on public.creator_members (user_id);
create index if not exists tiers_creator_id_idx on public.tiers (creator_id);
create index if not exists tiers_creator_rank_idx on public.tiers (creator_id, rank);
create index if not exists subscriptions_user_creator_idx on public.subscriptions (user_id, creator_id);
create index if not exists subscriptions_creator_status_idx on public.subscriptions (creator_id, status);
create index if not exists posts_creator_published_idx on public.posts (creator_id, published_at desc);
create index if not exists post_assets_post_id_idx on public.post_assets (post_id);
create index if not exists comments_post_created_idx on public.comments (post_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

create trigger set_posts_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.handle_new_creator_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.creator_members (creator_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict (creator_id, user_id) do update set role = 'owner';

  return new;
end;
$$;

create trigger on_creator_created
after insert on public.creators
for each row
execute function public.handle_new_creator_member();

create or replace function public.is_creator_admin(p_creator_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.creators c
        where c.id = p_creator_id
          and c.owner_user_id = auth.uid()
      )
      or exists (
        select 1
        from public.creator_members cm
        where cm.creator_id = p_creator_id
          and cm.user_id = auth.uid()
          and cm.role in ('owner', 'admin', 'moderator')
      )
    );
$$;

create or replace function public.active_subscription_rank(p_creator_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(t.rank), 0)::int
  from public.subscriptions s
  join public.tiers t on t.id = s.tier_id
  where s.creator_id = p_creator_id
    and s.user_id = auth.uid()
    and s.status in ('active', 'trialing')
    and (s.current_period_end is null or s.current_period_end > now());
$$;

create or replace function public.can_view_post(
  p_creator_id uuid,
  p_visibility text,
  p_min_tier_rank int
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_creator_admin(p_creator_id)
    or p_visibility = 'public'
    or (p_visibility = 'members' and public.active_subscription_rank(p_creator_id) >= 1)
    or (p_visibility = 'tier' and public.active_subscription_rank(p_creator_id) >= coalesce(p_min_tier_rank, 1));
$$;

revoke all on function public.is_creator_admin(uuid) from public;
revoke all on function public.active_subscription_rank(uuid) from public;
revoke all on function public.can_view_post(uuid, text, int) from public;

grant execute on function public.is_creator_admin(uuid) to anon, authenticated;
grant execute on function public.active_subscription_rank(uuid) to anon, authenticated;
grant execute on function public.can_view_post(uuid, text, int) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.creators enable row level security;
alter table public.creator_members enable row level security;
alter table public.tiers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.posts enable row level security;
alter table public.post_assets enable row level security;
alter table public.comments enable row level security;
alter table public.stripe_events enable row level security;

create policy "profiles_select_self" on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_insert_self" on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_self" on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "creators_public_select" on public.creators
for select
using (true);

create policy "creators_insert_owner" on public.creators
for insert
with check (owner_user_id = auth.uid());

create policy "creators_update_admin" on public.creators
for update
using (public.is_creator_admin(id))
with check (public.is_creator_admin(id));

create policy "creators_delete_admin" on public.creators
for delete
using (public.is_creator_admin(id));

create policy "creator_members_select_admin_or_self" on public.creator_members
for select
using (public.is_creator_admin(creator_id) or user_id = auth.uid());

create policy "creator_members_insert_admin" on public.creator_members
for insert
with check (public.is_creator_admin(creator_id));

create policy "creator_members_update_admin" on public.creator_members
for update
using (public.is_creator_admin(creator_id))
with check (public.is_creator_admin(creator_id));

create policy "creator_members_delete_admin" on public.creator_members
for delete
using (public.is_creator_admin(creator_id));

create policy "tiers_select_active_or_admin" on public.tiers
for select
using (is_active = true or public.is_creator_admin(creator_id));

create policy "tiers_insert_admin" on public.tiers
for insert
with check (public.is_creator_admin(creator_id));

create policy "tiers_update_admin" on public.tiers
for update
using (public.is_creator_admin(creator_id))
with check (public.is_creator_admin(creator_id));

create policy "tiers_delete_admin" on public.tiers
for delete
using (public.is_creator_admin(creator_id));

create policy "subscriptions_select_self_or_admin" on public.subscriptions
for select
using (user_id = auth.uid() or public.is_creator_admin(creator_id));

create policy "posts_select_by_visibility" on public.posts
for select
using (public.can_view_post(creator_id, visibility, min_tier_rank));

create policy "posts_insert_admin" on public.posts
for insert
with check (public.is_creator_admin(creator_id));

create policy "posts_update_admin" on public.posts
for update
using (public.is_creator_admin(creator_id))
with check (public.is_creator_admin(creator_id));

create policy "posts_delete_admin" on public.posts
for delete
using (public.is_creator_admin(creator_id));

create policy "post_assets_select_if_parent_visible" on public.post_assets
for select
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_assets.post_id
      and public.can_view_post(p.creator_id, p.visibility, p.min_tier_rank)
  )
);

create policy "post_assets_insert_admin" on public.post_assets
for insert
with check (
  exists (
    select 1
    from public.posts p
    where p.id = post_assets.post_id
      and public.is_creator_admin(p.creator_id)
  )
);

create policy "post_assets_update_admin" on public.post_assets
for update
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_assets.post_id
      and public.is_creator_admin(p.creator_id)
  )
)
with check (
  exists (
    select 1
    from public.posts p
    where p.id = post_assets.post_id
      and public.is_creator_admin(p.creator_id)
  )
);

create policy "post_assets_delete_admin" on public.post_assets
for delete
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_assets.post_id
      and public.is_creator_admin(p.creator_id)
  )
);

create policy "comments_select_if_parent_visible" on public.comments
for select
using (
  exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and public.can_view_post(p.creator_id, p.visibility, p.min_tier_rank)
  )
);

create policy "comments_insert_if_parent_visible" on public.comments
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and public.can_view_post(p.creator_id, p.visibility, p.min_tier_rank)
  )
);

create policy "comments_delete_self_or_admin" on public.comments
for delete
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and public.is_creator_admin(p.creator_id)
  )
);
