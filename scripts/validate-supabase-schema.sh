#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATION="$ROOT_DIR/supabase/migrations/20260604001400_taukei_multi_merchant_foundation.sql"
SEED="$ROOT_DIR/supabase/seed.sql"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/taukei-pg.XXXXXX")"
DATA_DIR="$TMP_DIR/data"
SOCKET_DIR="$TMP_DIR/socket"
LOG_FILE="$TMP_DIR/postgres.log"
DB_NAME="taukei_schema_check"

cleanup() {
  if [[ -f "$TMP_DIR/postmaster.pid" ]]; then
    pg_ctl -D "$DATA_DIR" -m fast stop >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$SOCKET_DIR"
initdb -D "$DATA_DIR" --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$DATA_DIR" -l "$LOG_FILE" -o "-k $SOCKET_DIR -p 55432" start >/dev/null
touch "$TMP_DIR/postmaster.pid"
createdb -h "$SOCKET_DIR" -p 55432 "$DB_NAME"

psql -h "$SOCKET_DIR" -p 55432 -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  created_at timestamptz not null default now()
);
create role anon nologin;
create role authenticated nologin;
create or replace function auth.uid()
returns uuid
language sql
stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
SQL

psql -h "$SOCKET_DIR" -p 55432 -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$MIGRATION" >/dev/null
psql -h "$SOCKET_DIR" -p 55432 -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$SEED" >/dev/null
psql -h "$SOCKET_DIR" -p 55432 -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
SQL

psql -h "$SOCKET_DIR" -p 55432 -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
select 'tables' as check_name, count(*) as count
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'merchants','profiles','merchant_memberships','stores','menus','menu_categories','menu_items',
    'customers','orders','order_items','payment_sessions','delivery_quotes','delivery_jobs',
    'delivery_events','fulfillment_events','webhook_events'
  );

select 'rls_enabled' as check_name, count(*) as count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'merchants','profiles','merchant_memberships','stores','menus','menu_categories','menu_items',
    'customers','orders','order_items','payment_sessions','delivery_quotes','delivery_jobs',
    'delivery_events','fulfillment_events','webhook_events'
  )
  and c.relrowsecurity;

select 'seed_orders' as check_name, public_ref, total_cents
from public.orders
where public_ref = 'TK-DEMO-1001';

select 'fake_integrations' as check_name,
  (select mode::text from public.payment_sessions where provider_session_id = 'cs_test_taukei_demo') as payment_mode,
  (select mode::text from public.delivery_jobs where provider_job_id = 'job_demo_001') as delivery_mode;

select 'profiles_seeded' as check_name, count(*) as count
from public.profiles
where id in ('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-00000000a002');

select 'webhook_events_seeded' as check_name, count(*) as count
from public.webhook_events
where provider in ('fake_stripe', 'fake_lalamove') and mode = 'fake';

select 'webhook_idempotency_unique' as check_name, count(*) as count
from pg_constraint
where conrelid = 'public.webhook_events'::regclass
  and conname in ('webhook_events_provider_event_id_key', 'webhook_events_provider_idempotency_key_key');

do $$
begin
  insert into public.payment_sessions (merchant_id, order_id, provider, mode, status, amount_cents)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000601', 'fake_stripe', 'live', 'requires_payment', 3100);
  raise exception 'expected fake live payment guard to reject insert';
exception when check_violation then
  raise notice 'fake live payment guard rejected insert as expected';
end $$;

do $$
begin
  insert into public.payment_sessions (merchant_id, order_id, provider, mode, status, amount_cents)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000601', 'stripe', 'live', 'requires_payment', 3100);
  raise exception 'expected non-fake live payment guard to reject insert';
exception when check_violation then
  raise notice 'non-fake live payment guard rejected insert as expected';
end $$;

do $$
begin
  insert into public.delivery_jobs (merchant_id, order_id, provider, mode, status, vehicle_type)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000601', 'lalamove', 'live', 'scheduled', 'CAR');
  raise exception 'expected live delivery guard to reject insert';
exception when check_violation then
  raise notice 'live delivery guard rejected insert as expected';
end $$;

do $$
begin
  insert into public.webhook_events (merchant_id, provider, mode, event_id, event_type, idempotency_key)
  values ('00000000-0000-4000-8000-000000000001', 'stripe', 'live', 'evt_live_blocked', 'checkout.session.completed', 'stripe:evt_live_blocked');
  raise exception 'expected live webhook guard to reject insert';
exception when check_violation then
  raise notice 'live webhook guard rejected insert as expected';
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000a001', false);
select 'owner_order_visible' as check_name, count(*) as count from public.orders where public_ref = 'TK-DEMO-1001';
select 'owner_profile_visible' as check_name, count(*) as count from public.profiles where id = '00000000-0000-4000-8000-00000000a001';
select 'owner_webhook_events_visible' as check_name, count(*) as count from public.webhook_events;
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
select 'anonymous_orders_hidden' as check_name, count(*) as count from public.orders;
select 'anonymous_profiles_hidden' as check_name, count(*) as count from public.profiles;
select 'anonymous_webhook_events_hidden' as check_name, count(*) as count from public.webhook_events;
select 'anonymous_storefront_items_visible' as check_name, count(*) as count from public.menu_items;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000a999', false);
select 'other_merchant_orders_hidden' as check_name, count(*) as count from public.orders;
select 'other_merchant_webhook_events_hidden' as check_name, count(*) as count from public.webhook_events;
reset role;
SQL
