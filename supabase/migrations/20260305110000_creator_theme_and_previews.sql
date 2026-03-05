alter table public.creators
  add column if not exists accent_color text,
  add column if not exists cover_image_url text,
  add column if not exists avatar_url text,
  add column if not exists seo_description text,
  add column if not exists links jsonb not null default '[]'::jsonb;

update public.creators
set accent_color = coalesce(accent_color, '#16a34a');

alter table public.creators
  alter column accent_color set default '#16a34a',
  alter column accent_color set not null;

alter table public.creators
  drop constraint if exists creators_accent_color_check;

alter table public.creators
  add constraint creators_accent_color_check
  check (accent_color ~* '^#(?:[0-9a-f]{3}){1,2}$');

alter table public.post_assets
  add column if not exists meta jsonb not null default '{}'::jsonb;

create or replace function public.creator_post_previews(p_creator_id uuid)
returns table (
  id uuid,
  title text,
  body_preview text,
  visibility text,
  min_tier_rank int,
  published_at timestamptz,
  has_access boolean,
  has_video boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.title,
    case
      when p.body is null then null
      else left(p.body, 220)
    end as body_preview,
    p.visibility,
    p.min_tier_rank,
    p.published_at,
    public.can_view_post(p.creator_id, p.visibility, p.min_tier_rank) as has_access,
    exists (
      select 1
      from public.post_assets pa
      where pa.post_id = p.id
        and pa.type = 'bunny_video'
    ) as has_video
  from public.posts p
  where p.creator_id = p_creator_id
  order by p.published_at desc;
$$;

create or replace function public.creator_post_detail_preview(
  p_creator_slug text,
  p_post_id uuid
)
returns table (
  post_id uuid,
  creator_id uuid,
  creator_slug text,
  creator_title text,
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
      else left(p.body, 220)
    end as body_preview,
    p.visibility,
    p.min_tier_rank,
    p.published_at,
    public.can_view_post(p.creator_id, p.visibility, p.min_tier_rank) as has_access
  from public.posts p
  join public.creators c on c.id = p.creator_id
  where c.slug = p_creator_slug
    and p.id = p_post_id;
$$;

revoke all on function public.creator_post_previews(uuid) from public;
revoke all on function public.creator_post_detail_preview(text, uuid) from public;

grant execute on function public.creator_post_previews(uuid) to anon, authenticated;
grant execute on function public.creator_post_detail_preview(text, uuid) to anon, authenticated;
