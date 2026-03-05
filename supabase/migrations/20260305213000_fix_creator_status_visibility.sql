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
    or (
      exists (
        select 1
        from public.creators c
        where c.id = p_creator_id
          and c.status = 'active'
      )
      and (
        p_visibility = 'public'
        or (p_visibility = 'members' and public.active_subscription_rank(p_creator_id) >= 1)
        or (p_visibility = 'tier' and public.active_subscription_rank(p_creator_id) >= coalesce(p_min_tier_rank, 1))
      )
    );
$$;

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
  join public.creators c on c.id = p.creator_id
  where p.creator_id = p_creator_id
    and (c.status = 'active' or public.is_creator_admin(c.id))
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
    and p.id = p_post_id
    and (c.status = 'active' or public.is_creator_admin(c.id));
$$;

revoke all on function public.creator_post_previews(uuid) from public;
revoke all on function public.creator_post_detail_preview(text, uuid) from public;

grant execute on function public.creator_post_previews(uuid) to anon, authenticated;
grant execute on function public.creator_post_detail_preview(text, uuid) to anon, authenticated;
