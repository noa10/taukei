# G001 Foundation Scaffold and Tooling

## Scope

This story creates the initial Taukei web/PWA repository foundation only. It intentionally does not implement production Stripe payment movement, live Lalamove rider booking, native apps, or the later Supabase schema/domain/customer/merchant stories.

## Stack baseline

- Bun workspace at the repository root.
- Next.js App Router app in `apps/web`.
- Shared fail-closed environment validation package in `packages/env`.
- Root scripts for `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `smoke`, and `verify`.

## Safety behavior

Local defaults use `TAUKEI_STRIPE_MODE=fake` and `TAUKEI_LALAMOVE_MODE=fake`. Setting either service to `live` throws unless `TAUKEI_ALLOW_LIVE_INTEGRATIONS=true` and required live credentials are present. This is a guardrail for the deferred production integration phase, not permission to enable live behavior in the first pass.

## Startup

```sh
bun install
bun run dev
```

The app starts a Taukei-branded PWA shell at `http://localhost:3000` with public metadata and manifest.

## Verification

```sh
bun run lint
bun run typecheck
bun run test
bun run build
bun run smoke
```
