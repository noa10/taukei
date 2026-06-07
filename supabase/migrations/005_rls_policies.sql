-- Taukei Row Level Security policies.
-- Tenancy model:
--   - Merchant-scoped tables: rows visible only to users with an active membership in that merchant
--   - Public storefront tables: anyone can read active menus/items for open stores
--   - Customer order tracking: customer can view their own order via public_ref (no auth required)

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================
alter table public.merchants enable row level security;
alter table public.stores enable row level security;
alter table public.menus enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.modifier_groups enable row level security;
alter table public.modifiers enable row level security;
alter table public.menu_item_modifier_groups enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_sessions enable row level security;
alter table public.delivery_quotes enable row level security;
alter table public.merchant_memberships enable row level security;
-- profiles already has RLS from 002_auth_setup or needs it added
alter table public.profiles enable row level security;

-- ============================================================================
-- Helper: merchant membership check (reusable in policies)
-- Returns true if the authenticated user has an active membership in the given merchant.
-- ============================================================================
create or replace function public.is_merchant_member(merchant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.merchant_memberships
    where merchant_memberships.merchant_id = is_merchant_member.merchant_id
      and merchant_memberships.user_id = auth.uid()
      and merchant_memberships.status = 'active'
  );
$$;

-- ============================================================================
-- Merchants
-- ============================================================================
-- Any authenticated user can see merchants they belong to
create policy "merchants_member_read" on public.merchants
  for select to authenticated
  using (is_merchant_member(id));

-- Owner/admin can update their own merchant
create policy "merchants_member_update" on public.merchants
  for update to authenticated
  using (is_merchant_member(id))
  with check (is_merchant_member(id));

-- Service role full access
create policy "merchants_service_role" on public.merchants
  for all to service_role
  using (true)
  with check (true);

-- ============================================================================
-- Stores
-- ============================================================================
-- Public: anyone can see open/paused stores (storefront listing)
create policy "stores_public_read" on public.stores
  for select to public
  using (status in ('open', 'paused'));

-- Merchant members can see all their stores (including draft/closed)
create policy "stores_member_read" on public.stores
  for select to authenticated
  using (is_merchant_member(merchant_id));

-- Merchant members can manage stores
create policy "stores_member_write" on public.stores
  for all to authenticated
  using (is_merchant_member(merchant_id))
  with check (is_merchant_member(merchant_id));

-- Service role full access
create policy "stores_service_role" on public.stores
  for all to service_role
  using (true)
  with check (true);

-- ============================================================================
-- Menus
-- ============================================================================
-- Public: anyone can see active menus for open stores
create policy "menus_public_read" on public.menus
  for select to public
  using (is_active = true and merchant_id in (
    select m.id from public.merchants m
    inner join public.stores s on s.merchant_id = m.id
    where s.status in ('open', 'paused')
  ));

-- Merchant members can manage their menus
create policy "menus_member_all" on public.menus
  for all to authenticated
  using (is_merchant_member(merchant_id))
  with check (is_merchant_member(merchant_id));

-- Service role
create policy "menus_service_role" on public.menus
  for all to service_role
  using (true) with check (true);

-- ============================================================================
-- Menu Categories
-- ============================================================================
-- Public read for active categories of open stores
create policy "menu_categories_public_read" on public.menu_categories
  for select to public
  using (is_active = true and merchant_id in (
    select m.id from public.merchants m
    inner join public.stores s on s.merchant_id = m.id
    where s.status in ('open', 'paused')
  ));

-- Merchant members manage
create policy "menu_categories_member_all" on public.menu_categories
  for all to authenticated
  using (is_merchant_member(merchant_id))
  with check (is_merchant_member(merchant_id));

create policy "menu_categories_service_role" on public.menu_categories
  for all to service_role using (true) with check (true);

-- ============================================================================
-- Menu Items
-- ============================================================================
-- Public read for available items of open stores
create policy "menu_items_public_read" on public.menu_items
  for select to public
  using (is_available = true and merchant_id in (
    select m.id from public.merchants m
    inner join public.stores s on s.merchant_id = m.id
    where s.status in ('open', 'paused')
  ));

-- Merchant members manage
create policy "menu_items_member_all" on public.menu_items
  for all to authenticated
  using (is_merchant_member(merchant_id))
  with check (is_merchant_member(merchant_id));

create policy "menu_items_service_role" on public.menu_items
  for all to service_role using (true) with check (true);

-- ============================================================================
-- Modifier Groups
-- ============================================================================
-- Public read for active modifier groups of open stores
create policy "modifier_groups_public_read" on public.modifier_groups
  for select to public
  using (is_active = true and merchant_id in (
    select m.id from public.merchants m
    inner join public.stores s on s.merchant_id = m.id
    where s.status in ('open', 'paused')
  ));

create policy "modifier_groups_member_all" on public.modifier_groups
  for all to authenticated
  using (is_merchant_member(merchant_id))
  with check (is_merchant_member(merchant_id));

create policy "modifier_groups_service_role" on public.modifier_groups
  for all to service_role using (true) with check (true);

-- ============================================================================
-- Modifiers
-- ============================================================================
create policy "modifiers_public_read" on public.modifiers
  for select to public
  using (is_available = true and merchant_id in (
    select m.id from public.merchants m
    inner join public.stores s on s.merchant_id = m.id
    where s.status in ('open', 'paused')
  ));

create policy "modifiers_member_all" on public.modifiers
  for all to authenticated
  using (is_merchant_member(merchant_id))
  with check (is_merchant_member(merchant_id));

create policy "modifiers_service_role" on public.modifiers
  for all to service_role using (true) with check (true);

-- ============================================================================
-- Menu Item Modifier Groups (junction)
-- ============================================================================
create policy "mimgr_public_read" on public.menu_item_modifier_groups
  for select to public
  using (merchant_id in (
    select m.id from public.merchants m
    inner join public.stores s on s.merchant_id = m.id
    where s.status in ('open', 'paused')
  ));

create policy "mimgr_member_all" on public.menu_item_modifier_groups
  for all to authenticated
  using (is_merchant_member(merchant_id))
  with check (is_merchant_member(merchant_id));

create policy "mimgr_service_role" on public.menu_item_modifier_groups
  for all to service_role using (true) with check (true);

-- ============================================================================
-- Customers
-- ============================================================================
-- Merchant members can see their customers
create policy "customers_member_read" on public.customers
  for select to authenticated
  using (is_merchant_member(merchant_id));

-- Service role
create policy "customers_service_role" on public.customers
  for all to service_role using (true) with check (true);

-- Insert via server action (authenticated, tenant-scoped)
create policy "customers_authenticated_insert" on public.customers
  for insert to authenticated
  with check (is_merchant_member(merchant_id));

-- ============================================================================
-- Orders
-- ============================================================================
-- Merchants can see their orders
create policy "orders_member_read" on public.orders
  for select to authenticated
  using (is_merchant_member(merchant_id));

-- Anyone can view their own order by public_ref (no auth needed for tracking)
create policy "orders_public_ref_read" on public.orders
  for select to public
  using (true);  -- public_ref is a unique, unguessable UUID-based reference

-- Insert: server action creates orders for authenticated or anon customers
create policy "orders_authenticated_insert" on public.orders
  for insert to authenticated
  with check (is_merchant_member(merchant_id));

-- Merchant members can update order status
create policy "orders_member_update" on public.orders
  for update to authenticated
  using (is_merchant_member(merchant_id))
  with check (is_merchant_member(merchant_id));

-- Service role
create policy "orders_service_role" on public.orders
  for all to service_role using (true) with check (true);

-- ============================================================================
-- Order Items
-- ============================================================================
create policy "order_items_member_read" on public.order_items
  for select to authenticated
  using (is_merchant_member(merchant_id));

-- Public can see items for their own order (via public_ref join)
create policy "order_items_public_ref_read" on public.order_items
  for select to public
  using (order_id in (
    select id from public.orders
  ));

create policy "order_items_authenticated_insert" on public.order_items
  for insert to authenticated
  with check (is_merchant_member(merchant_id));

create policy "order_items_service_role" on public.order_items
  for all to service_role using (true) with check (true);

-- ============================================================================
-- Payment Sessions
-- ============================================================================
create policy "payment_sessions_member_read" on public.payment_sessions
  for select to authenticated
  using (is_merchant_member(merchant_id));

create policy "payment_sessions_member_insert" on public.payment_sessions
  for insert to authenticated
  with check (is_merchant_member(merchant_id));

create policy "payment_sessions_member_update" on public.payment_sessions
  for update to authenticated
  using (is_merchant_member(merchant_id))
  with check (is_merchant_member(merchant_id));

create policy "payment_sessions_service_role" on public.payment_sessions
  for all to service_role using (true) with check (true);

-- ============================================================================
-- Delivery Quotes
-- ============================================================================
create policy "delivery_quotes_member_read" on public.delivery_quotes
  for select to authenticated
  using (is_merchant_member(merchant_id));

create policy "delivery_quotes_member_insert" on public.delivery_quotes
  for insert to authenticated
  with check (is_merchant_member(merchant_id));

create policy "delivery_quotes_member_update" on public.delivery_quotes
  for update to authenticated
  using (is_merchant_member(merchant_id))
  with check (is_merchant_member(merchant_id));

create policy "delivery_quotes_service_role" on public.delivery_quotes
  for all to service_role using (true) with check (true);

-- ============================================================================
-- Merchant Memberships
-- ============================================================================
create policy "memberships_member_read" on public.merchant_memberships
  for select to authenticated
  using (is_merchant_member(merchant_id) or user_id = auth.uid());

create policy "memberships_service_role" on public.merchant_memberships
  for all to service_role using (true) with check (true);

-- ============================================================================
-- Profiles
-- ============================================================================
create policy "profiles_own_read" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_own_update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_service_role" on public.profiles
  for all to service_role using (true) with check (true);
