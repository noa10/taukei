export type IntegrationMode = "sandbox" | "live";

export interface TaukeiEnv {
  appName: string;
  siteUrl: string;
  stripeMode: IntegrationMode;
  lalamoveMode: IntegrationMode;
  stripeWebhookSecret: string;
  lalamoveWebhookSecret: string;
  lalamoveMarket: string;
  lalamoveBaseUrl: string;
  lalamoveDefaultServiceType: string;
  stripeSecretKey: string;
  lalamoveApiKey: string;
  lalamoveApiSecret: string;
}

export interface RawEnv {
  NEXT_PUBLIC_APP_NAME?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  TAUKEI_STRIPE_MODE?: string;
  TAUKEI_LALAMOVE_MODE?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  LALAMOVE_API_KEY?: string;
  LALAMOVE_API_SECRET?: string;
  LALAMOVE_WEBHOOK_SECRET?: string;
  LALAMOVE_MARKET?: string;
  LALAMOVE_BASE_URL?: string;
  LALAMOVE_DEFAULT_SERVICE_TYPE?: string;
}

const MODES = new Set<IntegrationMode>(["sandbox", "live"]);

function readMode(value: string | undefined, name: string): IntegrationMode {
  const normalized = (value ?? "sandbox").toLowerCase();
  if (!MODES.has(normalized as IntegrationMode)) {
    throw new Error(`${name} must be one of: sandbox, live`);
  }
  return normalized as IntegrationMode;
}

// Memoized when using default process.env: env vars don't change at runtime,
// so parse once and reuse. When a custom `raw` is passed (tests), skip cache.
let _cachedEnv: TaukeiEnv | null = null;

export function loadTaukeiEnv(raw?: RawEnv): TaukeiEnv {
  const useProcessEnv = raw === undefined;
  if (useProcessEnv && _cachedEnv) return _cachedEnv;

  const env = raw ?? (process.env as RawEnv);
  const stripeMode = readMode(env.TAUKEI_STRIPE_MODE, "TAUKEI_STRIPE_MODE");
  const lalamoveMode = readMode(env.TAUKEI_LALAMOVE_MODE, "TAUKEI_LALAMOVE_MODE");

  // Validate Stripe key only if key is provided (stripe adapter will validate at runtime)
  if (env.STRIPE_SECRET_KEY) {
    if (stripeMode === "live" && !env.STRIPE_SECRET_KEY.startsWith("sk_live_")) {
      throw new Error("Stripe live mode requires STRIPE_SECRET_KEY with an sk_live_ prefix.");
    }
    if (stripeMode === "sandbox" && !env.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
      throw new Error("Stripe sandbox mode requires STRIPE_SECRET_KEY with an sk_test_ prefix.");
    }
  }

  const result: TaukeiEnv = {
    appName: env.NEXT_PUBLIC_APP_NAME?.trim() || "Taukei",
    siteUrl: env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000",
    stripeMode,
    lalamoveMode,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET?.trim() || "",
    lalamoveWebhookSecret: env.LALAMOVE_WEBHOOK_SECRET?.trim() || env.LALAMOVE_API_SECRET?.trim() || "",
    lalamoveMarket: env.LALAMOVE_MARKET?.trim() || "MY",
    lalamoveBaseUrl: env.LALAMOVE_BASE_URL?.trim() || "",
    lalamoveDefaultServiceType: env.LALAMOVE_DEFAULT_SERVICE_TYPE?.trim() || "MOTORCYCLE",
    stripeSecretKey: env.STRIPE_SECRET_KEY?.trim() || "",
    lalamoveApiKey: env.LALAMOVE_API_KEY?.trim() || "",
    lalamoveApiSecret: env.LALAMOVE_API_SECRET?.trim() || "",
  };

  if (useProcessEnv) _cachedEnv = result;
  return result;
}

export function describeIntegrationSafety(env: TaukeiEnv): string {
  const modes = `Stripe=${env.stripeMode}, Lalamove=${env.lalamoveMode}`;
  if (env.stripeMode === "live" || env.lalamoveMode === "live") {
    return `${modes}. Live integrations active; verify credentials and production authorization.`;
  }
  return `${modes}. Sandbox mode: test API calls, no real payment capture or rider booking.`;
}
