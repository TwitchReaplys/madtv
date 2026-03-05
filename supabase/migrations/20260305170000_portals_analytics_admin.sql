alter table public.creators
  add column if not exists status text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_media_type text,
  add column if not exists featured_video_id text,
  add column if not exists featured_thumbnail_url text,
  add column if not exists featured_image_url text;

update public.creators
set status = coalesce(status, 'active');

update public.creators
set featured_media_type = coalesce(featured_media_type, 'none');

alter table public.creators
  alter column status set default 'active',
  alter column status set not null,
  alter column featured_media_type set default 'none',
  alter column featured_media_type set not null;

alter table public.creators
  drop constraint if exists creators_status_check,
  drop constraint if exists creators_featured_media_type_check;

alter table public.creators
  add constraint creators_status_check
  check (status in ('active', 'pending', 'disabled')),
  add constraint creators_featured_media_type_check
  check (featured_media_type in ('none', 'bunny_video', 'image'));

create table if not exists public.creator_videos (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators (id) on delete cascade,
  title text not null,
  bunny_video_id text not null unique,
  status text not null default 'uploading',
  thumbnail_url text,
  duration_seconds int,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint creator_videos_status_check
    check (status in ('uploading', 'processing', 'ready', 'error')),
  constraint creator_videos_duration_check
    check (duration_seconds is null or duration_seconds >= 0)
);

create index if not exists creator_videos_creator_idx on public.creator_videos (creator_id, created_at desc);
create index if not exists creator_videos_creator_status_idx on public.creator_videos (creator_id, status);

alter table public.creators
  drop constraint if exists creators_featured_video_id_fkey;

alter table public.creators
  add constraint creators_featured_video_id_fkey
  foreign key (featured_video_id)
  references public.creator_videos (bunny_video_id)
  on delete set null;

alter table public.post_assets
  add column if not exists creator_video_id uuid references public.creator_videos (id) on delete set null;

alter table public.post_assets
  drop constraint if exists post_assets_type_data_check;

alter table public.post_assets
  add constraint post_assets_type_data_check
  check (
    (
      type = 'image'
      and storage_path is not null
      and bunny_video_id is null
      and bunny_library_id is null
      and creator_video_id is null
    )
    or (
      type = 'bunny_video'
      and (
        creator_video_id is not null
        or (bunny_video_id is not null and bunny_library_id is not null)
      )
    )
  );

alter table public.profiles
  add column if not exists is_banned boolean not null default false;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  creator_id uuid not null references public.creators (id) on delete cascade,
  post_id uuid references public.posts (id) on delete set null,
  asset_id uuid references public.post_assets (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  session_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_event_type_check
    check (event_type in ('post_view', 'video_play_intent', 'video_play_started'))
);

create index if not exists analytics_events_creator_created_idx on public.analytics_events (creator_id, created_at desc);
create index if not exists analytics_events_type_created_idx on public.analytics_events (event_type, created_at desc);
create index if not exists analytics_events_post_created_idx on public.analytics_events (post_id, created_at desc);

create table if not exists public.analytics_daily_creator (
  creator_id uuid not null references public.creators (id) on delete cascade,
  date date not null,
  post_views int not null default 0,
  video_play_intents int not null default 0,
  video_play_started int not null default 0,
  unique_viewers int not null default 0,
  gross_revenue_cents bigint not null default 0,
  net_revenue_cents bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (creator_id, date)
);

create index if not exists analytics_daily_creator_date_idx on public.analytics_daily_creator (date desc);

create table if not exists public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'support')),
  created_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.service_status (
  service_name text primary key,
  last_seen_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_platform_settings_updated_at on public.platform_settings;
create trigger set_platform_settings_updated_at
before update on public.platform_settings
for each row
execute function public.set_updated_at();

drop trigger if exists set_service_status_updated_at on public.service_status;
create trigger set_service_status_updated_at
before update on public.service_status
for each row
execute function public.set_updated_at();

drop trigger if exists set_analytics_daily_creator_updated_at on public.analytics_daily_creator;
create trigger set_analytics_daily_creator_updated_at
before update on public.analytics_daily_creator
for each row
execute function public.set_updated_at();

insert into public.platform_settings (key, value)
values
  ('platform_fee_percent', to_jsonb(10)),
  ('maintenance_mode', to_jsonb(false)),
  ('enable_new_creator_signup', to_jsonb(true))
on conflict (key) do nothing;

insert into storage.buckets (id, name, public)
values ('creator-media', 'creator-media', true)
on conflict (id) do nothing;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
      and pa.role in ('admin', 'support')
  );
$$;

create or replace function public.is_platform_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
      and pa.role = 'admin'
  );
$$;

revoke all on function public.is_platform_admin() from public;
revoke all on function public.is_platform_super_admin() from public;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_platform_super_admin() to authenticated;

alter table public.creator_videos enable row level security;
alter table public.analytics_events enable row level security;
alter table public.analytics_daily_creator enable row level security;
alter table public.platform_admins enable row level security;
alter table public.platform_settings enable row level security;
alter table public.service_status enable row level security;

drop policy if exists "creators_public_select" on public.creators;
drop policy if exists "creators_select_active_or_admin" on public.creators;

create policy "creators_select_active_or_admin" on public.creators
for select
using (
  status = 'active'
  or public.is_creator_admin(id)
  or public.is_platform_admin()
);

create policy "creator_videos_select_admin" on public.creator_videos
for select
using (public.is_creator_admin(creator_id) or public.is_platform_admin());

create policy "creator_videos_insert_admin" on public.creator_videos
for insert
with check (public.is_creator_admin(creator_id) or public.is_platform_admin());

create policy "creator_videos_update_admin" on public.creator_videos
for update
using (public.is_creator_admin(creator_id) or public.is_platform_admin())
with check (public.is_creator_admin(creator_id) or public.is_platform_admin());

create policy "creator_videos_delete_admin" on public.creator_videos
for delete
using (public.is_creator_admin(creator_id) or public.is_platform_admin());

create policy "analytics_events_select_creator_admin_or_platform_admin" on public.analytics_events
for select
using (public.is_creator_admin(creator_id) or public.is_platform_admin());

create policy "analytics_daily_creator_select_creator_admin_or_platform_admin" on public.analytics_daily_creator
for select
using (public.is_creator_admin(creator_id) or public.is_platform_admin());

create policy "platform_admins_select_self_or_admin" on public.platform_admins
for select
using (user_id = auth.uid() or public.is_platform_admin());

create policy "platform_admins_insert_super_admin" on public.platform_admins
for insert
with check (public.is_platform_super_admin());

create policy "platform_admins_update_super_admin" on public.platform_admins
for update
using (public.is_platform_super_admin())
with check (public.is_platform_super_admin());

create policy "platform_admins_delete_super_admin" on public.platform_admins
for delete
using (public.is_platform_super_admin());

create policy "platform_settings_select_admin" on public.platform_settings
for select
using (public.is_platform_admin());

create policy "platform_settings_insert_super_admin" on public.platform_settings
for insert
with check (public.is_platform_super_admin());

create policy "platform_settings_update_super_admin" on public.platform_settings
for update
using (public.is_platform_super_admin())
with check (public.is_platform_super_admin());

create policy "platform_settings_delete_super_admin" on public.platform_settings
for delete
using (public.is_platform_super_admin());

create policy "service_status_select_platform_admin" on public.service_status
for select
using (public.is_platform_admin());

create policy "profiles_select_platform_admin" on public.profiles
for select
using (public.is_platform_admin());

create policy "profiles_update_platform_admin" on public.profiles
for update
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "subscriptions_select_platform_admin" on public.subscriptions
for select
using (public.is_platform_admin());

create or replace view public.creator_explore
with (security_invoker = true)
as
select
  c.id,
  c.slug,
  c.title,
  c.tagline,
  c.about,
  c.avatar_url,
  c.cover_image_url,
  c.accent_color,
  c.social_links,
  c.seo_description,
  c.is_featured,
  coalesce(s_count.active_members_count, 0) as active_members_count,
  t_start.price_cents as starting_price_cents,
  t_start.currency as currency
from public.creators c
left join lateral (
  select count(*)::int as active_members_count
  from public.subscriptions s
  where s.creator_id = c.id
    and s.status in ('active', 'trialing')
    and (s.current_period_end is null or s.current_period_end > now())
) s_count on true
left join lateral (
  select t.price_cents, t.currency
  from public.tiers t
  where t.creator_id = c.id
    and t.is_active = true
  order by t.price_cents asc, t.rank asc
  limit 1
) t_start on true;
