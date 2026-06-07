-- Taukei multi-merchant Supabase foundation
-- Safe first-pass schema: public storefront reads, tenant-isolated merchant operations,
-- and fake/sandbox payment + delivery records only.

create extension if not exists pgcrypto;

create type public.merchant_status as enum ('draft', 'active', 'suspended');
create type public.merchant_role as enum ('owner', 'admin', 'staff');
create type public.membership_status as enum ('invited', 'active', 'disabled');
create type public.store_status as enum ('draft', 'open', 'paused', 'closed');
create type public.order_status as enum ('draft', 'pending_payment', 'confirmed', 'cancelled', 'completed');
create type public.fulfillment_status as enum ('new', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled');
create type public.payment_status as enum ('requires_payment', 'stubbed', 'paid', 'failed', 'refunded');
create type public.delivery_status as enum ('quoted', 'scheduled', 'assigning_driver', 'driver_assigned', 'picked_up', 'delivered', 'cancelled', 'failed');
create type public.integration_mode as enum ('fake', 'sandbox', 'live');

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  legal_name text,
  display_name text not null,
  status public.merchant_status not null default 'draft',
  timezone text not null default 'Asia/Kuala_Lumpur',
  currency char(3) not null default 'MYR' check (currency = upper(currency)),
  support_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  email text,
  default_merchant_id uuid references public.merchants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.merchant_memberships (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.merchant_role not null default 'staff',
  status public.membership_status not null default 'active',
  invited_email text,
  created_at timestamptz not null default now(),
  unique (merchant_id, user_id)
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  name text not null,
  description text,
  phone text,
  address_line1 text,
  city text not null default 'Kuala Lumpur',
  state text not null default 'Kuala Lumpur',
  postcode text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  status public.store_status not null default 'draft',
  public_ordering_enabled boolean not null default false,
  prep_buffer_minutes integer not null default 20 check (prep_buffer_minutes between 0 and 240),
  default_vehicle_type text not null default 'MOTORCYCLE' check (default_vehicle_type in ('MOTORCYCLE', 'CAR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, slug),
  unique (id, merchant_id)
);

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint menus_store_same_merchant foreign key (store_id, merchant_id) references public.stores(id, merchant_id) on delete cascade,
  unique (store_id, name),
  unique (id, merchant_id)
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  menu_id uuid not null references public.menus(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint categories_menu_same_merchant foreign key (menu_id, merchant_id) references public.menus(id, merchant_id) on delete cascade,
  unique (menu_id, name),
  unique (id, merchant_id)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  sku text,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency char(3) not null default 'MYR' check (currency = upper(currency)),
  is_available boolean not null default true,
  is_fragile boolean not null default false,
  prep_buffer_minutes integer check (prep_buffer_minutes is null or prep_buffer_minutes between 0 and 240),
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_category_same_merchant foreign key (category_id, merchant_id) references public.menu_categories(id, merchant_id) on delete cascade,
  unique (merchant_id, sku),
  unique (id, merchant_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  email text,
  phone text not null,
  last_delivery_address jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, merchant_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  public_ref text not null unique,
  status public.order_status not null default 'pending_payment',
  fulfillment_status public.fulfillment_status not null default 'new',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  platform_fee_cents integer not null default 100 check (platform_fee_cents >= 0),
  total_cents integer generated always as (subtotal_cents + delivery_fee_cents + platform_fee_cents) stored,
  currency char(3) not null default 'MYR' check (currency = upper(currency)),
  delivery_address jsonb not null,
  customer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_store_same_merchant foreign key (store_id, merchant_id) references public.stores(id, merchant_id),
  constraint orders_customer_same_merchant foreign key (customer_id, merchant_id) references public.customers(id, merchant_id),
  unique (id, merchant_id)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name_snapshot text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  line_total_cents integer generated always as (unit_price_cents * quantity) stored,
  is_fragile_snapshot boolean not null default false,
  created_at timestamptz not null default now(),
  constraint order_items_order_same_merchant foreign key (order_id, merchant_id) references public.orders(id, merchant_id) on delete cascade,
  constraint order_items_menu_item_same_merchant foreign key (menu_item_id, merchant_id) references public.menu_items(id, merchant_id)
);

create table public.payment_sessions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'fake_stripe',
  mode public.integration_mode not null default 'fake',
  provider_session_id text,
  status public.payment_status not null default 'stubbed',
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null default 'MYR' check (currency = upper(currency)),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint payment_order_same_merchant foreign key (order_id, merchant_id) references public.orders(id, merchant_id) on delete cascade,
  constraint payment_live_disabled_in_foundation check (mode <> 'live')
);

create table public.delivery_quotes (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  order_id uuid references public.orders(id) on delete cascade,
  provider text not null default 'fake_lalamove',
  mode public.integration_mode not null default 'fake',
  quote_ref text,
  vehicle_type text not null check (vehicle_type in ('MOTORCYCLE', 'CAR')),
  fee_cents integer not null check (fee_cents >= 0),
  currency char(3) not null default 'MYR' check (currency = upper(currency)),
  pickup jsonb not null,
  dropoff jsonb not null,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint delivery_quote_order_same_merchant foreign key (order_id, merchant_id) references public.orders(id, merchant_id) on delete cascade,
  constraint delivery_quote_live_disabled_in_foundation check (mode <> 'live'),
  unique (id, merchant_id)
);

create table public.delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete cascade,
  delivery_quote_id uuid references public.delivery_quotes(id) on delete set null,
  provider text not null default 'fake_lalamove',
  mode public.integration_mode not null default 'fake',
  provider_job_id text,
  status public.delivery_status not null default 'scheduled',
  vehicle_type text not null check (vehicle_type in ('MOTORCYCLE', 'CAR')),
  scheduled_dispatch_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_job_order_same_merchant foreign key (order_id, merchant_id) references public.orders(id, merchant_id) on delete cascade,
  constraint delivery_job_quote_same_merchant foreign key (delivery_quote_id, merchant_id) references public.delivery_quotes(id, merchant_id),
  constraint delivery_job_live_disabled_in_foundation check (mode <> 'live'),
  unique (id, merchant_id)
);

create table public.delivery_events (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  delivery_job_id uuid not null references public.delivery_jobs(id) on delete cascade,
  status public.delivery_status not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint delivery_event_job_same_merchant foreign key (delivery_job_id, merchant_id) references public.delivery_jobs(id, merchant_id) on delete cascade
);

create table public.fulfillment_events (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.fulfillment_status,
  to_status public.fulfillment_status not null,
  note text,
  actor_user_id uuid,
  occurred_at timestamptz not null default now(),
  constraint fulfillment_event_order_same_merchant foreign key (order_id, merchant_id) references public.orders(id, merchant_id) on delete cascade
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references public.merchants(id) on delete set null,
  provider text not null check (provider in ('stripe', 'lalamove', 'fake_stripe', 'fake_lalamove')),
  mode public.integration_mode not null default 'fake',
  event_id text not null,
  event_type text not null,
  idempotency_key text not null,
  request_hash text,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  response jsonb,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint webhook_live_disabled_in_foundation check (mode <> 'live'),
  unique (provider, event_id),
  unique (provider, idempotency_key)
);

create index profiles_default_merchant_idx on public.profiles(default_merchant_id);
create index profiles_email_idx on public.profiles(email) where email is not null;
create index merchant_memberships_user_idx on public.merchant_memberships(user_id) where status = 'active';
create index stores_public_idx on public.stores(merchant_id, slug) where public_ordering_enabled and status = 'open';
create index menu_items_category_idx on public.menu_items(category_id, sort_order) where is_available;
create index orders_merchant_status_idx on public.orders(merchant_id, fulfillment_status, created_at desc);
create index delivery_jobs_order_idx on public.delivery_jobs(order_id);
create index webhook_events_provider_received_idx on public.webhook_events(provider, received_at desc);
create index webhook_events_merchant_received_idx on public.webhook_events(merchant_id, received_at desc);

create or replace function public.taukei_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger merchants_touch_updated_at before update on public.merchants for each row execute function public.taukei_touch_updated_at();
create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.taukei_touch_updated_at();
create trigger stores_touch_updated_at before update on public.stores for each row execute function public.taukei_touch_updated_at();
create trigger menu_items_touch_updated_at before update on public.menu_items for each row execute function public.taukei_touch_updated_at();
create trigger orders_touch_updated_at before update on public.orders for each row execute function public.taukei_touch_updated_at();
create trigger delivery_jobs_touch_updated_at before update on public.delivery_jobs for each row execute function public.taukei_touch_updated_at();

create or replace function public.current_merchant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select merchant_id
  from public.merchant_memberships
  where user_id = auth.uid()
    and status = 'active';
$$;

create or replace function public.is_merchant_member(target_merchant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.merchant_memberships
    where merchant_id = target_merchant_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_merchant_admin(target_merchant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.merchant_memberships
    where merchant_id = target_merchant_id
      and user_id = auth.uid()
      and status = 'active'
      and role in ('owner', 'admin')
  );
$$;

alter table public.profiles enable row level security;
alter table public.merchants enable row level security;
alter table public.merchant_memberships enable row level security;
alter table public.stores enable row level security;
alter table public.menus enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_sessions enable row level security;
alter table public.delivery_quotes enable row level security;
alter table public.delivery_jobs enable row level security;
alter table public.delivery_events enable row level security;
alter table public.fulfillment_events enable row level security;
alter table public.webhook_events enable row level security;

create policy "users can read own profile" on public.profiles for select using (id = auth.uid());
create policy "users can insert own profile" on public.profiles for insert with check (id = auth.uid());
create policy "users can update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "public can read active merchants" on public.merchants for select using (status = 'active' or public.is_merchant_member(id));
create policy "authenticated users can draft merchants" on public.merchants for insert with check (auth.uid() is not null);
create policy "merchant admins can update merchants" on public.merchants for update using (public.is_merchant_admin(id)) with check (public.is_merchant_admin(id));

create policy "members can read memberships" on public.merchant_memberships for select using (public.is_merchant_member(merchant_id));
create policy "admins can manage memberships" on public.merchant_memberships for all using (public.is_merchant_admin(merchant_id)) with check (public.is_merchant_admin(merchant_id));

create policy "public can read open stores" on public.stores for select using (public_ordering_enabled and status = 'open' or public.is_merchant_member(merchant_id));
create policy "admins can manage stores" on public.stores for all using (public.is_merchant_admin(merchant_id)) with check (public.is_merchant_admin(merchant_id));

create policy "public can read active menus" on public.menus for select using (
  is_active and exists (select 1 from public.stores s where s.id = store_id and s.public_ordering_enabled and s.status = 'open')
  or public.is_merchant_member(merchant_id)
);
create policy "members can manage menus" on public.menus for all using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));

create policy "public can read active categories" on public.menu_categories for select using (
  is_active and exists (
    select 1 from public.menus m join public.stores s on s.id = m.store_id
    where m.id = menu_id and m.is_active and s.public_ordering_enabled and s.status = 'open'
  ) or public.is_merchant_member(merchant_id)
);
create policy "members can manage categories" on public.menu_categories for all using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));

create policy "public can read available items" on public.menu_items for select using (
  is_available and exists (
    select 1 from public.menu_categories c
    join public.menus m on m.id = c.menu_id
    join public.stores s on s.id = m.store_id
    where c.id = category_id and c.is_active and m.is_active and s.public_ordering_enabled and s.status = 'open'
  ) or public.is_merchant_member(merchant_id)
);
create policy "members can manage items" on public.menu_items for all using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));

create policy "members can read customers" on public.customers for select using (public.is_merchant_member(merchant_id));
create policy "members can manage customers" on public.customers for all using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));

create policy "members can read orders" on public.orders for select using (public.is_merchant_member(merchant_id));
create policy "members can manage orders" on public.orders for all using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));

create policy "members can read order items" on public.order_items for select using (public.is_merchant_member(merchant_id));
create policy "members can manage order items" on public.order_items for all using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));

create policy "members can read payment sessions" on public.payment_sessions for select using (public.is_merchant_member(merchant_id));
create policy "members can manage payment sessions" on public.payment_sessions for all using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));

create policy "members can read delivery quotes" on public.delivery_quotes for select using (public.is_merchant_member(merchant_id));
create policy "members can manage delivery quotes" on public.delivery_quotes for all using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));

create policy "members can read delivery jobs" on public.delivery_jobs for select using (public.is_merchant_member(merchant_id));
create policy "members can manage delivery jobs" on public.delivery_jobs for all using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));

create policy "members can read delivery events" on public.delivery_events for select using (public.is_merchant_member(merchant_id));
create policy "members can manage delivery events" on public.delivery_events for all using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));

create policy "members can read fulfillment events" on public.fulfillment_events for select using (public.is_merchant_member(merchant_id));
create policy "members can manage fulfillment events" on public.fulfillment_events for all using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));

create policy "members can read webhook events" on public.webhook_events for select using (merchant_id is not null and public.is_merchant_member(merchant_id));
create policy "members can manage webhook events" on public.webhook_events for all using (merchant_id is not null and public.is_merchant_member(merchant_id)) with check (merchant_id is not null and public.is_merchant_member(merchant_id));
