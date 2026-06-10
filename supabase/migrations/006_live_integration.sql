-- Taukei live Stripe + Lalamove integration
-- Adds columns needed for live payment and delivery tracking.

-- Update integration_mode enum: remove 'fake', add check constraint
-- (Can't modify enum directly in Postgres; we add a new value if missing and rely on app-level validation.
-- Existing 'fake' values remain valid in DB but app code no longer produces them.)

-- Orders: Stripe session and payment intent tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Delivery quotes: Lalamove quotation data
ALTER TABLE public.delivery_quotes
  ADD COLUMN IF NOT EXISTS quotation_id text,
  ADD COLUMN IF NOT EXISTS stop_ids jsonb,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Delivery jobs: Lalamove order and driver tracking
ALTER TABLE public.delivery_jobs
  ADD COLUMN IF NOT EXISTS provider_job_id text,
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS driver_phone text,
  ADD COLUMN IF NOT EXISTS driver_plate text,
  ADD COLUMN IF NOT EXISTS driver_photo_url text,
  ADD COLUMN IF NOT EXISTS driver_latitude numeric,
  ADD COLUMN IF NOT EXISTS driver_longitude numeric,
  ADD COLUMN IF NOT EXISTS driver_location_updated_at timestamptz;

-- Webhook events: idempotency unique index for dedup
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_idempotency
  ON public.webhook_events (provider, event_id);

-- Delivery events: index for fast lookup by delivery job
CREATE INDEX IF NOT EXISTS idx_delivery_events_job_id
  ON public.delivery_events (delivery_job_id);

-- Delivery jobs: index for fast lookup by order
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_order_id
  ON public.delivery_jobs (order_id);

-- Delivery quotes: index for fast lookup by order
CREATE INDEX IF NOT EXISTS idx_delivery_quotes_order_id
  ON public.delivery_quotes (order_id);

-- Orders: index for stripe session lookup
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id
  ON public.orders (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
