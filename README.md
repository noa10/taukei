# Taukei

Merchant-owned food ordering for Malaysian independent food merchants.

Taukei helps Malaysian independent food merchants run direct storefronts with safe sandbox checkout and delivery foundations — powered by Next.js App Router, Supabase Auth (email + password, Google OAuth), Stripe, and Lalamove.

## Requirements

- [Bun](https://bun.sh/) ≥ 1.3
- Node.js ≥ 20 (for compatibility tooling only; Bun is the runtime)
- [Supabase CLI](https://supabase.com/docs/guides/local-development) (for local DB and migrations)
- Docker (for Supabase local dev stack)

## Quick start

```sh
# Install dependencies
bun install

# Copy the environment template
cp .env.example .env.local

# Start the Supabase local stack (Postgres, Auth, Storage)
supabase start

# Fill in the Supabase credentials printed by `supabase start`
# into .env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)

# Run the dev server (port 56778)
bun dev
```

## Supabase Auth setup

Taukei uses Supabase for authentication with three methods:

1. **Email + password** — signup, login, and email verification
2. **Google OAuth** — one-click sign-in via Google
3. **Password reset** — email-based recovery flow

### Environment variables

Add these to `.env.local`:

```sh
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # server-only, never client-imported
NEXT_PUBLIC_SITE_URL=http://localhost:56778   # or your production URL
```

When these variables are missing, the auth boundary degrades gracefully (stubbed mode) and pages display a configuration notice instead of crashing.

### Database migrations

```sh
# Apply all migrations to the local Supabase instance
supabase db push

# Or reset everything and re-apply
supabase db reset
```

Migration `002_auth_setup.sql` adds:
- `username`, `full_name`, `avatar_url` columns to `public.profiles`
- `handle_new_user()` trigger that auto-creates a profile on signup
- `avatars` storage bucket with public-read and owner-only write policies
- All DDL is idempotent (IF NOT EXISTS / CREATE OR REPLACE)

### Google Cloud OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:56778` (local dev)
   - Your production URL (e.g. `https://taukei.my`)
6. Under **Authorized redirect URIs**, add:
   - `https://<project>.supabase.co/auth/v1/callback` (production Supabase project)
   - `http://127.0.0.1:54321/auth/v1/callback` (local `supabase start` development)
7. Copy the **Client ID** and **Client Secret**.
8. In your Supabase dashboard, go to **Authentication → Providers → Google**:
   - Enable Google provider
   - Paste the Client ID and Client Secret
   - Save

Users can now sign in with Google from `/login`.

## Project structure

```
apps/web/                    # Next.js App Router application
  app/
    (auth)/                  # Public auth pages (login, signup, forgot/reset-password)
    (authed)/                # Protected pages (account)
    auth/callback/           # Code exchange route handler
    auth/verify/             # Email verification notice page
    api/webhooks/            # Stripe + Lalamove webhook handlers
  lib/
    supabase/                # Auth boundary, client/server/service clients, server actions
    webhooks/                # Webhook signature verification + persistence
  components/
    primitives.tsx           # Card, SectionHeader, Badge, ButtonLink
  middleware.ts              # Auth session refresh + merchant header + redirect unauthenticated

packages/
  checkout/                  # Checkout orchestration (pricing, payment, delivery)
  pricing/                   # Catalog pricing with trusted server-side validation
  stripe/                    # Stripe checkout session + webhook verification
  lalamove/                  # Lalamove delivery quote + booking + webhook
  types/                     # Shared TypeScript types
  domain/                    # Domain logic (pricing, catalog, delivery)
  env/                       # Environment configuration boundaries

supabase/
  database/                  # Supabase type generation config
  migrations/                # SQL migrations (001, 002_auth_setup, ...)
```

## Scripts

```sh
bun dev              # Start the dev server on port 56778
bun test             # Run all tests
bun run typecheck    # TypeScript strict check across all packages
bun run lint         # ESLint across all packages
bun run build        # Production build
```

### Supabase schema validation

```sh
./scripts/validate-supabase-schema.sh
```

This script checks that required tables and columns exist in the local Supabase instance by querying `information_schema`. It's useful as a pre-deploy smoke test.

## Architecture notes

- **Auth boundary pattern**: The Supabase client/server/service-role boundaries are wrapped in configuration checks. When env vars are missing, the boundary returns `stubbed` mode and callers degrade gracefully instead of crashing.
- **Server actions only**: All auth mutations (signup, login, Google OAuth, password reset, profile update, sign out) go through Next.js server actions. No `supabase.auth` calls happen on the client for credential-based flows.
- **Middleware session refresh**: The middleware refreshes the Supabase session on every navigation using `getUser()` with the Edge-safe cookie adapter (no `next/headers`).
- **RLS**: Row Level Security on `public.profiles` ensures users can only read/update their own row.
- **No Tailwind/shadcn**: Taukei uses a hand-rolled CSS design system matching the brand aesthetic.

## License

Private — all rights reserved.
