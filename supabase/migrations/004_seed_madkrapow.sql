-- Taukei seed data: Mad Krapow as the first merchant.
-- Data sourced from ~/dev/madkrapow/supabase/migrations/005_update_menu_madkrapow.sql
-- Mapped from madkrapow single-tenant schema into taukei multi-tenant schema.

-- ============================================================================
-- 1. Merchant
-- ============================================================================
insert into public.merchants (id, slug, legal_name, display_name, status, timezone, currency, support_email)
values (
  '00000000-0000-0000-0000-000000000001',
  'madkrapow',
  'Mad Krapow Sdn Bhd',
  'Mad Krapow',
  'active',
  'Asia/Kuala_Lumpur',
  'MYR',
  'hello@madkrapow.com'
) on conflict do nothing;

-- Second test merchant for tenant isolation proof
insert into public.merchants (id, slug, legal_name, display_name, status, timezone, currency)
values (
  '00000000-0000-0000-0000-000000000002',
  'test-merchant',
  'Test Merchant Sdn Bhd',
  'Test Merchant',
  'draft',
  'Asia/Kuala_Lumpur',
  'MYR'
) on conflict do nothing;

-- ============================================================================
-- 2. Store
-- ============================================================================
insert into public.stores (id, merchant_id, slug, name, description, phone, address_line1, city, state, postcode, latitude, longitude, status, public_ordering_enabled, prep_buffer_minutes, default_vehicle_type)
values (
  '00000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'ttdi-jaya',
  'Mad Krapow TTDI Jaya',
  'Authentic Thai-inspired krapow dishes',
  '+60 7-123 4567',
  'No. 5, Jalan TTDI Jaya 1, Taman TTDI Jaya',
  'Johor Bahru',
  'Johor',
  '81200',
  1.524900,
  103.682100,
  'open',
  true,
  20,
  'MOTORCYCLE'
) on conflict do nothing;

-- ============================================================================
-- 3. Menu (default menu for the store)
-- ============================================================================
insert into public.menus (id, merchant_id, store_id, name, is_active)
values (
  '00000002-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000001-0000-0000-0000-000000000001',
  'Main Menu',
  true
) on conflict do nothing;

-- ============================================================================
-- 4. Menu Categories (mapped from madkrapow categories)
-- ============================================================================
insert into public.menu_categories (id, merchant_id, menu_id, name, sort_order, is_active) values
  ('00000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000001', 'Set Krapow', 1, true),
  ('00000003-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000001', 'Lauk Sahaja', 2, true),
  ('00000003-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000001', 'Minuman', 3, true),
  ('00000003-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000001', 'Bazar Ramadan TTDI Jaya', 4, true);

-- ============================================================================
-- 5. Menu Items
-- ============================================================================

-- Set Krapow
insert into public.menu_items (id, merchant_id, category_id, name, description, price_cents, currency, is_available, image_url, sort_order) values
  ('00000004-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', 'Set Krapow Daging dengan Minuman', 'Beef krapow set with rice and drink', 1450, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730001.jpg?1721145902', 1),
  ('00000004-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', 'Set Krapow Ayam dengan Minuman', 'Chicken krapow set with rice and drink', 1450, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730002.jpg?1721145936', 2),
  ('00000004-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', 'Set Krapow Daging', 'Beef krapow set with rice', 1250, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730003.jpg?1721145955', 3),
  ('00000004-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', 'Set Krapow Ayam', 'Chicken krapow set with rice', 1250, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730004.jpg?1721145974', 4);

-- Lauk Sahaja
insert into public.menu_items (id, merchant_id, category_id, name, description, price_cents, currency, is_available, image_url, sort_order) values
  ('00000004-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000002', 'Krapow Daging Sahaja', 'Beef krapow without rice', 850, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730005.jpg?1721145989', 1),
  ('00000004-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000002', 'Krapow Ayam Sahaja', 'Chicken krapow without rice', 850, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730006.jpg?1721146004', 2),
  ('00000004-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000002', 'Nasi Putih Siam', 'Steamed jasmine rice', 200, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730007.jpg?1721146021', 3),
  ('00000004-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000002', 'Telur Goreng', 'Fried egg', 200, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730008.jpg?1721146048', 4);

-- Minuman
insert into public.menu_items (id, merchant_id, category_id, name, description, price_cents, currency, is_available, image_url, sort_order) values
  ('00000004-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'Kickapoo (320ml)', 'Sparkling juice drink', 250, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730010.jpg?1721147513', 1),
  ('00000004-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'Soya (300ml)', 'Soy milk', 220, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730018.jpg?1721147602', 2),
  ('00000004-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'Ice Lemon Tea (300ml)', 'Iced lemon tea', 220, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730019.jpg?1721147625', 3),
  ('00000004-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'Yeos Yeogurt Asli (250ml)', 'Plain yogurt drink', 200, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730023.jpg?1753693772', 4);

-- Bazar Ramadan TTDI Jaya
insert into public.menu_items (id, merchant_id, category_id, name, description, price_cents, currency, is_available, image_url, sort_order) values
  ('00000004-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000004', 'Krapow Kentang Daging', 'Beef krapow with potato', 500, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730027.jpg?1771952841', 1),
  ('00000004-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000004', 'Krapow Kentang Ayam', 'Chicken krapow with potato', 500, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730028.jpg?1771952804', 2),
  ('00000004-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000004', 'Set Krapow Daging (Bazar)', 'Beef krapow set at bazaar price', 1000, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730029.jpg?1771952535', 3),
  ('00000004-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000004', 'Popiah Krapow Ayam', 'Chicken krapow in popiah wrapper', 400, 'MYR', true, 'https://d282v6zd99utr7.cloudfront.net/public/merchant/3173/31730030.jpg?1771952988', 4);

-- ============================================================================
-- 6. Modifier Groups
-- ============================================================================
insert into public.modifier_groups (id, merchant_id, name, description, min_selections, max_selections, sort_order, is_active) values
  ('00000005-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Spice Level', 'Choose your preferred spice level', 0, 1, 1, true);

-- ============================================================================
-- 7. Modifiers
-- ============================================================================
insert into public.modifiers (id, merchant_id, modifier_group_id, name, price_delta_cents, is_default, is_available, sort_order) values
  ('00000006-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000005-0000-0000-0000-000000000001', 'No Spice', 0, false, true, 1),
  ('00000006-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000005-0000-0000-0000-000000000001', 'Medium Spice', 0, true, true, 2),
  ('00000006-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '00000005-0000-0000-0000-000000000001', 'Extra Spicy', 0, false, true, 3);

-- ============================================================================
-- 8. Menu Item Modifier Groups (junction — spice level applies to lauk & bazar items)
-- ============================================================================
insert into public.menu_item_modifier_groups (merchant_id, menu_item_id, modifier_group_id, is_required) values
  -- Lauk Sahaja items
  ('00000000-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000005', '00000005-0000-0000-0000-000000000001', false),
  ('00000000-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000006', '00000005-0000-0000-0000-000000000001', false),
  -- Bazar Ramadan items
  ('00000000-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000027', '00000005-0000-0000-0000-000000000001', false),
  ('00000000-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000028', '00000005-0000-0000-0000-000000000001', false),
  ('00000000-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000029', '00000005-0000-0000-0000-000000000001', false),
  ('00000000-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000030', '00000005-0000-0000-0000-000000000001', false);
