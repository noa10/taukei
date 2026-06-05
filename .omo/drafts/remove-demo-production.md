# Draft: Remove All Demo Content - Production Ready

## Requirements (confirmed)
- Remove ALL demo content from the React web app
- Prepare the web app for full production mode with no demo
- The app should work with real Supabase data only

## Technical Decisions
- Demo files to DELETE entirely (not just modify)
- Core infrastructure files to KEEP and adapt
- Data access layer needs real Supabase queries instead of demo stubs
- Home page needs to become a production entry point (landing or redirect)
- Seed data should be removed or made production-only

## Research Findings

### Files to DELETE (Demo-only):
1. `apps/web/lib/demo-data.ts` - Core demo merchant, catalog, checkout request
2. `apps/web/lib/merchant-data.ts` - Demo merchant session, seeded catalog, fulfillment orders
3. `apps/web/app/mad-krapow-demo/` - Entire demo storefront route
4. `apps/web/app/order/TK-DEMO-1001/` - Demo order tracking page
5. `apps/web/app/merchant/` - All merchant dashboard pages (dashboard, onboarding, catalog, fulfillment, login)
6. `supabase/seed.sql` - Demo seed data

### Files to MODIFY (Remove demo references):
1. `apps/web/app/page.tsx` - Home page links to demo storefront
2. `apps/web/lib/data-access.ts` - Uses demo-data, merchant-data imports
3. `apps/web/lib/customer-orders.ts` - Uses demo-data for validation
4. `apps/web/lib/supabase/session.ts` - Demo merchant session function
4. `apps/web/app/merchant/actions.ts` - Uses demo merchant ID in actions
5. `apps/web/app/mad-krapow-demo/checkout/actions.ts` - Demo checkout action

### Files to KEEP (Production infrastructure):
1. `apps/web/components/primitives.tsx` - Reusable UI components
2. `apps/web/app/layout.tsx` - Root layout (production ready)
3. `apps/web/app/manifest.ts` - PWA manifest
4. `apps/web/app/globals.css` - Design system
5. `apps/web/next.config.ts` - Next.js config
6. `apps/web/lib/supabase/config.ts` - Supabase boundary config
7. `apps/web/lib/supabase/server.ts` - Server client
8. `apps/web/lib/supabase/client.ts` - Browser client
9. `apps/web/lib/supabase/service.ts` - Service role client
10. `apps/web/lib/supabase/index.ts` - Exports
11. `apps/web/app/api/webhooks/stripe/route.ts` - Production webhook
12. `apps/web/app/api/webhooks/lalamove/route.ts` - Production webhook
13. `packages/domain/src/types.ts` - Domain types (shared)
14. `supabase/migrations/20260604001400_taukei_multi_merchant_foundation.sql` - Production schema
15. `packages/env/` - Environment config

### Test files to review:
- `apps/web/lib/webhooks/*.test.ts` - Webhook tests (keep, may need updates)
- `apps/web/lib/*.test.ts` - Other tests using demo data (update or remove)

## Scope Boundaries
### INCLUDE:
- Remove all demo routes and pages
- Remove demo data files
- Update data access to use real Supabase queries
- Update home page to production entry point
- Remove demo seed data
- Ensure no demo references remain in production code

### EXCLUDE:
- Supabase migrations (production schema)
- Domain package types
- Webhook endpoints (production ready)
- Design system / CSS
- PWA manifest
- Next.js configuration

## Open Questions
1. What should the home page (`/`) become in production?
   - Option A: Landing page for merchants to sign up
   - Option B: Redirect to merchant login
   - Option C: Public marketing page
   - Need user decision

2. Should the seed data be completely removed or kept for local development?
   - Need user decision

3. Are there any demo features that should be preserved as "example implementations"?
   - Need user decision