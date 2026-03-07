create or replace function public.mobile_post_detail_preview(
  p_post_id uuid,
  p_creator_slug_hint text default null
)
returns table (
  post_id uuid,
  creator_id uuid,
  creator_slug text,
  creator_title text,
  creator_avatar_url text,
  creator_cover_image_url text,
  accent_color text,
  seo_description text,
  title text,
  body text,
  body_preview text,
  visibility text,
  min_tier_rank int,
  published_at timestamptz,
  has_access boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as post_id,
    c.id as creator_id,
    c.slug as creator_slug,
    c.title as creator_title,
    c.avatar_url as creator_avatar_url,
    c.cover_image_url as creator_cover_image_url,
    c.accent_color,
    c.seo_description,
    p.title,
    case
      when public.can_view_post(p.creator_id, p.visibility, p.min_tier_rank)
        then p.body
      else null
    end as body,
    case
      when p.body is null then null
      else left(p.body, 320)
    end as body_preview,
    p.visibility,
    p.min_tier_rank,
    p.published_at,
    public.can_view_post(p.creator_id, p.visibility, p.min_tier_rank) as has_access
  from public.posts p
  join public.creators c on c.id = p.creator_id
  where p.id = p_post_id
    and (p_creator_slug_hint is null or c.slug = p_creator_slug_hint)
    and (c.status = 'active' or public.is_creator_admin(c.id));
$$;

revoke all on function public.mobile_post_detail_preview(uuid, text) from public;
grant execute on function public.mobile_post_detail_preview(uuid, text) to anon, authenticated;

create table if not exists public.video_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  position_seconds int not null default 0,
  duration_seconds int,
  updated_at timestamptz not null default now(),
  constraint video_progress_position_check check (position_seconds >= 0),
  constraint video_progress_duration_check check (duration_seconds is null or duration_seconds >= 0),
  unique (user_id, post_id)
);

create index if not exists video_progress_user_updated_idx on public.video_progress (user_id, updated_at desc);
create index if not exists video_progress_post_idx on public.video_progress (post_id);

drop trigger if exists set_video_progress_updated_at on public.video_progress;
create trigger set_video_progress_updated_at
before update on public.video_progress
for each row
execute function public.set_updated_at();

alter table public.video_progress enable row level security;

drop policy if exists "video_progress_select_self" on public.video_progress;
drop policy if exists "video_progress_insert_self" on public.video_progress;
drop policy if exists "video_progress_update_self" on public.video_progress;
drop policy if exists "video_progress_delete_self" on public.video_progress;

create policy "video_progress_select_self" on public.video_progress
for select
using (auth.uid() = user_id);

create policy "video_progress_insert_self" on public.video_progress
for insert
with check (auth.uid() = user_id);

create policy "video_progress_update_self" on public.video_progress
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "video_progress_delete_self" on public.video_progress
for delete
using (auth.uid() = user_id);
