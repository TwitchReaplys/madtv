drop function if exists public.creator_post_previews(uuid);

create or replace function public.creator_post_previews(p_creator_id uuid)
returns table (
  id uuid,
  title text,
  body_preview text,
  visibility text,
  min_tier_rank int,
  published_at timestamptz,
  has_access boolean,
  has_video boolean,
  video_thumbnail_url text
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
    (video_asset.id is not null) as has_video,
    video_asset.thumbnail_url as video_thumbnail_url
  from public.posts p
  join public.creators c on c.id = p.creator_id
  left join lateral (
    select
      pa.id,
      coalesce(
        nullif(cv.thumbnail_url, ''),
        nullif(cv.meta ->> 'thumbnail_url', ''),
        nullif(cv.meta -> 'bunny' ->> 'thumbnailFileName', ''),
        nullif(pa.meta ->> 'thumbnail_url', ''),
        nullif(pa.meta -> 'bunny' ->> 'thumbnailFileName', '')
      ) as thumbnail_url
    from public.post_assets pa
    left join public.creator_videos cv
      on cv.id = pa.creator_video_id
      or (pa.bunny_video_id is not null and cv.bunny_video_id = pa.bunny_video_id)
    where pa.post_id = p.id
      and pa.type = 'bunny_video'
    order by pa.created_at asc
    limit 1
  ) as video_asset on true
  where p.creator_id = p_creator_id
    and (c.status = 'active' or public.is_creator_admin(c.id))
  order by p.published_at desc;
$$;

revoke all on function public.creator_post_previews(uuid) from public;
grant execute on function public.creator_post_previews(uuid) to anon, authenticated;
