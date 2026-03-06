alter table public.creators
  add column if not exists pricing_mode text,
  add column if not exists single_price_cents int,
  add column if not exists single_price_currency text;

update public.creators
set pricing_mode = coalesce(pricing_mode, 'tiers'),
    single_price_currency = coalesce(single_price_currency, 'CZK');

alter table public.creators
  alter column pricing_mode set default 'tiers',
  alter column pricing_mode set not null,
  alter column single_price_currency set default 'CZK',
  alter column single_price_currency set not null;

alter table public.creators
  drop constraint if exists creators_pricing_mode_check;

alter table public.creators
  add constraint creators_pricing_mode_check
  check (pricing_mode in ('tiers', 'single'));

alter table public.creators
  drop constraint if exists creators_single_price_positive_check;

alter table public.creators
  add constraint creators_single_price_positive_check
  check (single_price_cents is null or single_price_cents > 0);

alter table public.creators
  drop constraint if exists creators_single_price_required_check;

alter table public.creators
  add constraint creators_single_price_required_check
  check (
    pricing_mode <> 'single'
    or (single_price_cents is not null and single_price_cents > 0)
  );

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
  case
    when c.pricing_mode = 'single' then c.single_price_cents
    else t_start.price_cents
  end as starting_price_cents,
  case
    when c.pricing_mode = 'single' then c.single_price_currency
    else t_start.currency
  end as currency,
  c.pricing_mode
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
