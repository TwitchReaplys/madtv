insert into public.platform_settings (key, value)
values ('vat_percent', to_jsonb(21))
on conflict (key) do nothing;

with vat_setting as (
  select
    greatest(
      0::numeric,
      least(
        100::numeric,
        coalesce(
          nullif(coalesce(ps.value->>'value', trim(both '"' from ps.value::text)), '')::numeric,
          21::numeric
        )
      )
    ) as vat_percent
  from public.platform_settings ps
  where ps.key = 'vat_percent'
  limit 1
),
resolved_vat as (
  select coalesce((select vat_percent from vat_setting), 21::numeric) as vat_percent
)
update public.analytics_daily_creator adc
set net_revenue_cents = greatest(
  0::bigint,
  round(
    adc.gross_revenue_cents::numeric
    - (adc.gross_revenue_cents::numeric * coalesce(c.platform_fee_percent, 10)::numeric / 100)
    - (adc.gross_revenue_cents::numeric * rv.vat_percent / (100::numeric + rv.vat_percent))
  )::bigint
)
from public.creators c
cross join resolved_vat rv
where c.id = adc.creator_id;
