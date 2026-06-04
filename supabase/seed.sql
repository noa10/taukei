-- Taukei demo seed data. Uses fake/sandbox records only.
insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-00000000a001', 'owner@madkrapow.test'),
  ('00000000-0000-4000-8000-00000000a002', 'staff@madkrapow.test'),
  ('00000000-0000-4000-8000-00000000a999', 'outsider@example.test')
on conflict (id) do nothing;

insert into public.merchants (id, slug, legal_name, display_name, status, support_email)
values ('00000000-0000-4000-8000-000000000001', 'mad-krapow-demo', 'Mad Krapow Demo Sdn Bhd', 'Mad Krapow Demo', 'active', 'hello@taukei.local')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, phone, email, default_merchant_id)
values
  ('00000000-0000-4000-8000-00000000a001', 'Mad Krapow Owner', '+60120000001', 'owner@madkrapow.test', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-00000000a002', 'Mad Krapow Staff', '+60120000002', 'staff@madkrapow.test', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-00000000a999', 'Other Merchant User', '+60129999999', 'outsider@example.test', null)
on conflict (id) do nothing;

insert into public.merchant_memberships (id, merchant_id, user_id, role, status, invited_email)
values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000a001', 'owner', 'active', 'owner@taukei.local'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000a002', 'staff', 'active', 'staff@taukei.local')
on conflict (merchant_id, user_id) do nothing;

insert into public.stores (id, merchant_id, slug, name, description, phone, address_line1, city, state, postcode, latitude, longitude, status, public_ordering_enabled, prep_buffer_minutes)
values ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'kuala-lumpur-kitchen', 'Mad Krapow KL Kitchen', 'Demo Taukei storefront with sandbox checkout and delivery.', '+60120000000', 'Jalan Demo 1', 'Kuala Lumpur', 'Kuala Lumpur', '50000', 3.139003, 101.686855, 'open', true, 20)
on conflict (merchant_id, slug) do nothing;

insert into public.menus (id, merchant_id, store_id, name, is_active)
values ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'All-day menu', true)
on conflict (store_id, name) do nothing;

insert into public.menu_categories (id, merchant_id, menu_id, name, sort_order, is_active)
values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000201', 'Krapow bowls', 10, true),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000201', 'Drinks', 20, true)
on conflict (menu_id, name) do nothing;

insert into public.menu_items (id, merchant_id, category_id, sku, name, description, price_cents, is_available, is_fragile, prep_buffer_minutes, sort_order)
values
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000301', 'MK-BASIL-BEEF', 'Signature Basil Beef Pad Kra Pao', 'Wok-fired beef basil bowl with crispy egg.', 1650, true, false, 15, 10),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000301', 'MK-CHICKEN', 'Chicken Krapow Bowl', 'Classic spicy chicken basil rice bowl.', 1450, true, false, 15, 20),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000302', 'THAI-TEA', 'Thai Milk Tea', 'Chilled tea sealed for delivery.', 650, true, true, 5, 10)
on conflict (merchant_id, sku) do nothing;

insert into public.customers (id, merchant_id, name, email, phone, last_delivery_address)
values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000001', 'Aina Demo', 'aina@example.test', '+60123334444', '{"line1":"Demo Residence","city":"Kuala Lumpur"}'::jsonb)
on conflict (id) do nothing;

insert into public.orders (id, merchant_id, store_id, customer_id, public_ref, status, fulfillment_status, subtotal_cents, delivery_fee_cents, platform_fee_cents, delivery_address, customer_notes)
values ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000501', 'TK-DEMO-1001', 'confirmed', 'preparing', 2300, 700, 100, '{"line1":"Demo Residence","city":"Kuala Lumpur","postcode":"50000"}'::jsonb, 'Less spicy')
on conflict (public_ref) do nothing;

insert into public.order_items (id, order_id, merchant_id, menu_item_id, name_snapshot, unit_price_cents, quantity, is_fragile_snapshot)
values
  ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000401', 'Signature Basil Beef Pad Kra Pao', 1650, 1, false),
  ('00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000403', 'Thai Milk Tea', 650, 1, true)
on conflict (id) do nothing;

insert into public.payment_sessions (id, merchant_id, order_id, provider, mode, provider_session_id, status, amount_cents, metadata)
values ('00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000601', 'fake_stripe', 'fake', 'cs_test_taukei_demo', 'stubbed', 3100, '{"noLivePayment":true,"platformFeeCents":100}'::jsonb)
on conflict (id) do nothing;

insert into public.delivery_quotes (id, merchant_id, order_id, provider, mode, quote_ref, vehicle_type, fee_cents, pickup, dropoff, expires_at, metadata)
values ('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000601', 'fake_lalamove', 'fake', 'quote_demo_001', 'CAR', 700, '{"store":"Mad Krapow KL Kitchen"}'::jsonb, '{"line1":"Demo Residence"}'::jsonb, now() + interval '30 minutes', '{"reason":"fragile item requires car","noLiveBooking":true}'::jsonb)
on conflict (id) do nothing;

insert into public.delivery_jobs (id, merchant_id, order_id, delivery_quote_id, provider, mode, provider_job_id, status, vehicle_type, scheduled_dispatch_at, metadata)
values ('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000901', 'fake_lalamove', 'fake', 'job_demo_001', 'scheduled', 'CAR', now() + interval '14 minutes', '{"noLiveBooking":true}'::jsonb)
on conflict (id) do nothing;

insert into public.delivery_events (id, merchant_id, delivery_job_id, status, payload)
values ('00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000902', 'scheduled', '{"source":"seed"}'::jsonb)
on conflict (id) do nothing;

insert into public.fulfillment_events (id, merchant_id, order_id, from_status, to_status, note, actor_user_id)
values ('00000000-0000-4000-8000-000000000904', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000601', 'new', 'preparing', 'Seeded merchant accepted the order.', '00000000-0000-4000-8000-00000000a001')
on conflict (id) do nothing;


insert into public.webhook_events (id, merchant_id, provider, mode, event_id, event_type, idempotency_key, request_hash, status, payload, response, processed_at)
values
  ('00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000001', 'fake_stripe', 'fake', 'evt_taukei_seed_payment', 'checkout.session.completed', 'stripe:evt_taukei_seed_payment', 'seed-payment-hash', 'processed', '{"source":"seed","noLivePayment":true}'::jsonb, '{"status":"stubbed"}'::jsonb, now()),
  ('00000000-0000-4000-8000-000000000a02', '00000000-0000-4000-8000-000000000001', 'fake_lalamove', 'fake', 'evt_taukei_seed_delivery', 'delivery.status.changed', 'lalamove:evt_taukei_seed_delivery', 'seed-delivery-hash', 'processed', '{"source":"seed","noLiveBooking":true}'::jsonb, '{"status":"scheduled"}'::jsonb, now())
on conflict (provider, event_id) do nothing;
