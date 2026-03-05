alter table public.creators
  add column if not exists tagline text,
  add column if not exists social_links jsonb;

update public.creators
set social_links = coalesce(social_links, '{}'::jsonb);

alter table public.creators
  alter column social_links set default '{}'::jsonb,
  alter column social_links set not null;

alter table public.creators
  drop constraint if exists creators_social_links_object_check;

alter table public.creators
  add constraint creators_social_links_object_check
  check (jsonb_typeof(social_links) = 'object');

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

grant select on table public.creator_explore to anon, authenticated;

drop policy if exists "comments_insert_if_parent_visible" on public.comments;

create policy "comments_insert_if_subscribed_or_admin" on public.comments
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and public.can_view_post(p.creator_id, p.visibility, p.min_tier_rank)
      and (
        public.active_subscription_rank(p.creator_id) >= 1
        or public.is_creator_admin(p.creator_id)
      )
  )
);
