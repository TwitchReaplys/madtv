alter table public.creators
  add column if not exists onboarding_status text,
  add column if not exists onboarding_submitted_at timestamptz,
  add column if not exists onboarding_email_verified_at timestamptz,
  add column if not exists legal_full_name text,
  add column if not exists legal_business_id text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists address_city text,
  add column if not exists address_postal_code text,
  add column if not exists address_country text,
  add column if not exists content_focus text,
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_charges_enabled boolean not null default false,
  add column if not exists stripe_connect_payouts_enabled boolean not null default false,
  add column if not exists stripe_connect_details_submitted boolean not null default false;

update public.creators
set onboarding_status = coalesce(onboarding_status, 'draft');

update public.creators
set address_country = coalesce(address_country, 'CZ');

alter table public.creators
  alter column onboarding_status set default 'draft',
  alter column onboarding_status set not null,
  alter column address_country set default 'CZ';

alter table public.creators
  drop constraint if exists creators_onboarding_status_check,
  drop constraint if exists creators_address_country_check;

alter table public.creators
  add constraint creators_onboarding_status_check
  check (onboarding_status in ('draft', 'submitted', 'email_verified', 'stripe_pending', 'stripe_connected', 'approved', 'rejected')),
  add constraint creators_address_country_check
  check (address_country is null or char_length(address_country) = 2);

create unique index if not exists creators_stripe_connect_account_id_key
  on public.creators (stripe_connect_account_id)
  where stripe_connect_account_id is not null;
