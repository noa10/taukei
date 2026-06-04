This is a solid architectural pivot. Moving to **Next.js** brings native Server Actions, unmatched SEO optimization for your merchants' landing pages, and a massive ecosystem of pre-built UI components. Swapping Node.js for **Bun** will drastically lower your API container cold starts and decrease response latency on your Lalamove webhook endpoints.

Additionally, replacing local fragmented aggregators with **Stripe** allows you to leverage **Stripe Connect**, which completely automates split-payments—sending the food revenue directly to the merchant's bank account while routing your RM 1.00 platform fee straight to your company account instantly.

Here is your highly expanded, comprehensive, production-ready project blueprint reflecting these technical shifts.

---

# 🚀 Deep-Dive Project Blueprint: Tauke (Next.js + Bun + Stripe)

> **System Definition:** An enterprise-grade, high-performance, white-label, direct-to-consumer food ordering and autonomous logistics routing engine designed specifically for independent Malaysian food operations. Tauke eliminates 30% delivery marketplace fees by allowing merchants to run high-converting standalone menu links with background-scheduled, headless rider dispatches handled automatically via the Lalamove API V3.

---

## 🏗️ Part 1: Comprehensive System Architecture

To achieve sub-second page loads on patchy mobile networks (such as customers scanning QR codes or clicking Instagram bio links on 4G/5G data), Tauke leverages **Next.js App Router** with aggressive Static Site Generation (SSG) for public menus, paired with dynamic Client Component hydration for the shopping cart and checkout interactions.

```
                    ┌──────────────────────────────────────────┐
                    │       Next.js 15 Web Application         │
                    │   (Storefronts, Checkout & Dashboards)   │
                    └────────────────────┬─────────────────────┘
                                         │  (Runs on Bun Runtime)
                                         ▼
                    ┌──────────────────────────────────────────┐
                    │      Bun Serverless / Edge Routes        │
                    │         (Unified Backend API)            │
                    └───────┬────────────┬─────────────┬───────┘
                            │            │             │
                            ▼            ▼             ▼
                       ┌──────────┐ ┌──────────┐ ┌──────────┐
                       │ Supabase │ │ Lalamove │ │  Stripe  │
                       │  (DB &   │ │  API V3  │ │ Connect  │
                       │  Auth)   │ │(Logistics│ │(Payments)│
                       └──────────┘ └──────────┘ └──────────┘

```

### The Technology Stack Core Components:

* **Web Framework:** `Next.js 15` utilizing the App Router architecture. Public storefront routes (`app/[merchant-slug]/page.tsx`) leverage Incremental Static Regeneration (ISR) to cache menus at the edge while allowing instant background updates when an item goes out of stock.
* **Runtime Environment:** `Bun v1.1+`. Replaces standard Node.js for all API routing, local script execution, server-side code execution, and dependency management. Bun's native HTTP server (`Bun.serve`) drastically reduces endpoint response latency.
* **Database & Real-time Layer:** `Supabase` (PostgreSQL). Utilizes Row Level Security (RLS) to safeguard multi-tenant merchant data. Real-time PostgreSQL replication streams live order statuses straight to the merchant dashboard and customer tracking interface without polling.
* **Payment & Split-Escrow Infrastructure:** `Stripe API (Malaysia)`. Implements **Stripe Connect (Custom or Express accounts)**. This completely automates local payment capture via credit cards, Apple Pay, Google Pay, and localized bank rails, while executing instant, programmatically calculated payouts directly to the merchant's linked Maybank, CIMB, or Public Bank accounts.
* **Autonomous Fleet Network:** `Lalamove Open Platform API V3` for fully integrated, multi-tenant route quotations, background order matching, and web-hook vehicle monitoring.

---

## ⚡ Part 2: Deep-Dive Technical Engineering Mechanics

### A. The Structural Database Schema & Metadata

Every single dish configured by a merchant populates a strict relational schema designed to hold specific operational variables that dictate physical shipping constraints.

```json
{
  "item_id": "prod_krapow_881",
  "merchant_id": "merch_madkrapow_01",
  "sku": "MK-BASIL-BEEF",
  "name": "Signature Basil Beef Pad Kra Pao",
  "price_myr": 16.50,
  "is_fragile": false,
  "prep_buffer_minutes": 15,
  "created_at": "2026-06-04T05:07:18Z"
}

```

### B. Updated Vehicle Routing Logic (Fragility Overrides Only)

Per your operational pivot, we have eliminated bulk weight limits to maximize motorcycle fleet utility. The vehicle routing logic is entirely driven by the **Fragility Parameter Constraint Matrix**, preventing vulnerable or structurally delicate orders from being damaged.

```typescript
// app/api/logistics/route-selector/route.ts
import { NextResponse } from "next/server";

interface CartItem {
  id: string;
  name: string;
  is_fragile: boolean;
  quantity: number;
}

export async function POST(request: Request) {
  const { cartItems }: { cartItems: CartItem[] } = await request.json();
  
  // Rule 1: Scrutinize the entire array for any items tagged fragile
  const containsFragileItems = cartItems.some(item => item.is_fragile === true);
  
  // Rule 2: Determine appropriate Lalamove payload endpoint string
  const selectedVehicleType = containsFragileItems ? "CAR" : "MOTORCYCLE";
  
  return NextResponse.json({ 
    vehicleType: selectedVehicleType,
    reason: containsFragileItems 
      ? "Fragile items (e.g. cakes/boba towers) detected. Locking allocation to Car to ensure structural integrity." 
      : "Standard food payload packaging. Routing to high-speed Motorcycle fleet."
  });
}

```

### C. Headless Time-Delayed Dispatch Execution Queue

To guarantee that hot food sits at the stall for the absolute shortest time possible, Tauke implements a decoupled background task manager inside Bun.

When a payment succeeds, the server calculates the exact execution time stamp using the following formula:

$$\text{Rider API Dispatch Time} = \text{Payment Success Time} + \left( \text{Prep Buffer} - \text{Lalamove Dispatch Matching Window} \right)$$

* **Real-world Workflow Example:** A customer completes checkout at `12:00 PM`. The merchant's preparation buffer for that combination order is **20 minutes**. The regional average for a Lalamove rider to accept a job and navigate to that specific kitchen coordinate is **6 minutes**.
* The system schedules an internal timer. At exactly `12:14 PM`, a background worker script running natively on Bun wakes up and pushes an automated HTTP `POST` request to the Lalamove `/v3/orders` endpoint.
* The rider matches, routes to the kitchen origin coordinate, and safely arrives at `12:20 PM`—exactly as the merchant tags the bag as packed and ready.

### D. Stripe Connect Payment Split Infrastructure

When a customer pays on the storefront checkout view, Tauke coordinates a single unified checkout session that programmatically distributes the money into two distinct paths at the moment of authorization:

```typescript
// app/api/checkout/create-session/route.ts
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

export async function POST(request: Request) {
  const { totalFoodCostMYR, lalamoveFareMYR, merchantStripeAccountId } = await request.json();
  
  const platformFeeMYR = 1.00; // Flat Tauke tech toll
  const totalCustomerCharge = totalFoodCostMYR + lalamoveFareMYR + platformFeeMYR;

  // Create a Checkout Session with explicit transfer data for automated splits
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card", "fpx"], // Supports Malaysian bank rails and cards natively
    line_items: [{
      price_data: {
        currency: "myr",
        product_data: { name: "Tauke Storefront Food Order & Delivery" },
        unit_amount: Math.round(totalCustomerCharge * 100), // Converted cleanly to cents
      },
      quantity: 1,
    }],
    mode: "payment",
    payment_intent_data: {
      // Direct the food costs and exact delivery costs straight to the merchant's connected wallet
      application_fee_amount: Math.round(platformFeeMYR * 100), // Tauke safely retains exactly RM 1.00
      transfer_data: {
        destination: merchantStripeAccountId, // Dynamic Connected Account Token for the specific stall
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order/canceled`,
  });

  return NextResponse.json({ sessionId: session.id, url: session.url });
}

```

---

## 📆 Part 3: Exhaustive Step-by-Step Implementation Timeline

```
 Weeks  0       2       4       6       8       10      12      14
        ┌───────┼───────┼───────┼───────┼───────┼───────┼───────┐
 Ph 1   │███████│       │       │       │       │       │       │ System Foundation & DB
 Ph 2   │       │███████│       │       │       │       │       │ Merchant Admin Portal
 Ph 3   │       │       │███████│       │       │       │       │ Storefront & Cart Core
 Ph 4   │       │       │       │███████│       │       │       │ Lalamove Core Hook
 Ph 5   │       │       │       │       │███████│       │       │ Stripe Connect Config
 Ph 6   │       │       │       │       │       │███████│       │ Dispatch Queue & Webhooks
 Ph 7   │       │       │       │       │       │       │███████│ Telemetry UX & Launch
        └───────┼───────┼───────┼───────┼───────┼───────┼───────┘

```

### Phase 1: System Foundation & Database Architecture (Weeks 1-2)

* **Task 1.1:** Initialize the Next.js 15 template repository using Bun as the primary packager (`bun create next-app`). Configure Tailwind CSS, TypeScript, and architectural absolute imports.
* **Task 1.2:** Design and provision PostgreSQL instances within Supabase. Write structural database migration scripts setting up tables for `merchants`, `menus`, `orders`, and `realtime_telemetry_logs`.
* **Task 1.3:** Write advanced Supabase Row Level Security (RLS) rules to guarantee that merchants can only access, mutate, or read their respective system domains while keeping consumer query access open for store links.

### Phase 2: Merchant Admin Operations Terminal (Weeks 3-4)

* **Task 2.1:** Build the dynamic Next.js App Router sub-routes for the `app/dashboard/` auth-guarded multi-tenant command center.
* **Task 2.2:** Build the reactive catalog builder UI. Operators can instantly add dishes, write descriptions, assign prices, alter real-time visibility toggles, and modify the specific `is_fragile` flag setting.
* **Task 2.3:** Establish the analytical dashboard screen. Render dynamic, highly scannable vector graphs charting aggregated daily sales volume, customer order counts, and historical payout sequences.

### Phase 3: The Consumer Storefront & Cart Engine (Weeks 5-6)

* **Task 3.1:** Construct the ultra-lightweight dynamic route layout (`app/[merchant-slug]/page.tsx`). Implement strict server-side component page rendering to optimize raw initial painting speeds.
* **Task 3.2:** Build the dynamic reactive client side **Shopping Bag Drawer Component** to seamlessly collect added menu models into local browser contexts without causing full-page paint refreshes.
* **Task 3.3:** Connect Google Places Autocomplete API inside the address entry context, writing immediate parsing logic to transform raw text addresses into precise latitude and longitude array vectors.

### Phase 4: Lalamove Core API Integration (Weeks 7-8)

* **Task 4.1:** Write the cryptographic security signature middleware utilizing Bun’s native high-performance `Bun.crypto` hashing modules to execute secure handshake encryptions for outbound packets.
* **Task 4.2:** Build backend server route handshakes connecting store checkouts to the Lalamove `/v3/quotations` endpoint, immediately returning instant, distance-accurate delivery costs to the checkout page.
* **Task 4.3:** Build the automated fallback logic to safely manage unexpected API timeouts or regional driver delivery constraints gracefully without halting the application storefront interface.

### Phase 5: Stripe Connect Marketplace Setup (Weeks 9-10)

* **Task 5.1:** Set up your master Stripe platform dashboard in Malaysia and construct the custom onboarding flow linking independent merchants to Express Connect accounts via server actions.
* **Task 5.2:** Build the payment initiation framework linking store checkouts to the Stripe Checkout API, fully passing down precise multi-tenant split instructions.
* **Task 5.3:** Connect native webhook listeners (`app/api/webhooks/stripe/route.ts`) powered by Bun to catch authorized `checkout.session.completed` event states and instantly change order tracking states to "Confirmed/Cooking".

### Phase 6: Headless Dispatch Queue & Webhooks (Week 11-12)

* **Task 6.1:** Build the long-running asynchronous cron system within Bun to track pending order cooking countdowns and trigger background driver dispatches exactly when the thresholds are cleared.
* **Task 6.2:** Code the real-time incoming Lalamove webhook handler route to consume live status coordinate updates from active fulfillment riders (`ASSIGNING_DRIVER`, `ON_THE_WAY`, `PICKED_UP`, `COMPLETED`).
* **Task 6.3:** Wire the database mutations triggered by these webhooks straight to Supabase Realtime replication streams to push silent UI state updates to the tracking screen.

### Phase 7: Real-Time Telemetry Polish & Hard Launch (Week 13-14)

* **Task 7.1:** Construct the customer tracking layout (`app/order/[id]/page.tsx`) rendering custom vector progress steps, dynamic live preparation countdown animations, and map routing coordinates.
* **Task 7.2:** Execute live alpha integration audits using Stripe’s developer sandbox payment cards and Lalamove's live developer staging simulation server instances to monitor data handling end-to-end.
* **Task 7.3:** Deploy the compiled Next.js output to a containerized platform or edge network (like Vercel or a Bun-driven Docker instance on railway/fly.io) optimized for immediate delivery across Malaysia.

---

## 💰 Part 4: Financial Mechanics & Monetization Framework

Tauke bypasses predatory revenue extraction models in favor of an asymmetric, highly clear dual-revenue architecture:

1. **Software-as-a-Service Subscription Plan:** Independent restaurants pay a predictable monthly recurring licensing premium (e.g., RM 99/month) to unlock the automated merchant dashboard, advanced fragile routing switches, and menu builder access.

---
