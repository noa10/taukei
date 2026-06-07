-- Taukei menu modifier system — tenant-isolated modifier groups, modifiers, and junction table.
-- Pattern: every table includes merchant_id FK with compound unique constraint (id, merchant_id)
-- matching the existing menu_items / menu_categories pattern from 001.

-- ============================================================================
-- 1. modifier_groups
-- ============================================================================
create table public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  description text,
  min_selections integer not null default 0 check (min_selections >= 0),
  max_selections integer not null default 1 check (max_selections >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, name),
  unique (id, merchant_id)
);

-- ============================================================================
-- 2. modifiers
-- ============================================================================
create table public.modifiers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  modifier_group_id uuid not null references public.modifier_groups(id) on delete cascade,
  name text not null,
  price_delta_cents integer not null default 0 check (price_delta_cents >= 0 or price_delta_cents < 0),
  is_default boolean not null default false,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint modifiers_group_same_merchant foreign key (modifier_group_id, merchant_id) references public.modifier_groups(id, merchant_id) on delete cascade,
  unique (merchant_id, modifier_group_id, name),
  unique (id, merchant_id)
);

comment on column public.modifiers.price_delta_cents is 'Price adjustment in cents. Positive = surcharge, negative = discount, zero = no change.';

-- ============================================================================
-- 3. menu_item_modifier_groups (junction — which modifier groups apply to which items)
-- ============================================================================
create table public.menu_item_modifier_groups (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  modifier_group_id uuid not null references public.modifier_groups(id) on delete cascade,
  is_required boolean not null default false,
  created_at timestamptz not null default now(),
  constraint mimgr_item_same_merchant foreign key (menu_item_id, merchant_id) references public.menu_items(id, merchant_id) on delete cascade,
  constraint mimgr_group_same_merchant foreign key (modifier_group_id, merchant_id) references public.modifier_groups(id, merchant_id) on delete cascade,
  unique (menu_item_id, modifier_group_id),
  unique (id, merchant_id)
);
