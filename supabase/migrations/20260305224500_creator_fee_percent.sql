alter table public.creators
  add column if not exists platform_fee_percent numeric(5,2);

update public.creators
set platform_fee_percent = coalesce(platform_fee_percent, 10);

alter table public.creators
  alter column platform_fee_percent set default 10,
  alter column platform_fee_percent set not null;

alter table public.creators
  drop constraint if exists creators_platform_fee_percent_check;

alter table public.creators
  add constraint creators_platform_fee_percent_check
  check (platform_fee_percent >= 0 and platform_fee_percent <= 100);

drop policy if exists "creators_update_admin" on public.creators;

create policy "creators_update_admin" on public.creators
for update
using (public.is_creator_admin(id) or public.is_platform_admin())
with check (public.is_creator_admin(id) or public.is_platform_admin());
