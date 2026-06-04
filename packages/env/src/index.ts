export type IntegrationMode = "fake" | "sandbox" | "live";

export interface TaukeiEnv {
  appName: string;
  siteUrl: string;
  stripeMode: IntegrationMode;
  lalamoveMode: IntegrationMode;
  liveIntegrationsAllowed: boolean;
}

export interface RawEnv {
  NEXT_PUBLIC_APP_NAME?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  TAUKEI_STRIPE_MODE?: string;
  TAUKEI_LALAMOVE_MODE?: string;
  TAUKEI_ALLOW_LIVE_INTEGRATIONS?: string;
  STRIPE_SECRET_KEY?: string;
  LALAMOVE_API_KEY?: string;
  LALAMOVE_API_SECRET?: string;
}

const MODES = new Set<IntegrationMode>(["fake", "sandbox", "live"]);

function readMode(value: string | undefined, name: string): IntegrationMode {
  const normalized = (value ?? "fake").toLowerCase();
  if (!MODES.has(normalized as IntegrationMode)) {
    throw new Error(`${name} must be one of: fake, sandbox, live`);
  }
  return normalized as IntegrationMode;
}

function isTruthy(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").toLowerCase());
}

function requireLiveGuard(raw: RawEnv, service: "Stripe" | "Lalamove", mode: IntegrationMode): void {
  if (mode !== "live") return;

  if (!isTruthy(raw.TAUKEI_ALLOW_LIVE_INTEGRATIONS)) {
    throw new Error(`${service} live mode is disabled. Set TAUKEI_ALLOW_LIVE_INTEGRATIONS=true only in an explicit production integration phase.`);
  }

  if (service === "Stripe" && !raw.STRIPE_SECRET_KEY?.startsWith("sk_live_")) {
    throw new Error("Stripe live mode requires STRIPE_SECRET_KEY with an sk_live_ prefix.");
  }

  if (service === "Lalamove" && (!raw.LALAMOVE_API_KEY || !raw.LALAMOVE_API_SECRET)) {
    throw new Error("Lalamove live mode requires LALAMOVE_API_KEY and LALAMOVE_API_SECRET.");
  }
}

export function loadTaukeiEnv(raw: RawEnv = process.env as RawEnv): TaukeiEnv {
  const stripeMode = readMode(raw.TAUKEI_STRIPE_MODE, "TAUKEI_STRIPE_MODE");
  const lalamoveMode = readMode(raw.TAUKEI_LALAMOVE_MODE, "TAUKEI_LALAMOVE_MODE");

  requireLiveGuard(raw, "Stripe", stripeMode);
  requireLiveGuard(raw, "Lalamove", lalamoveMode);

  return {
    appName: raw.NEXT_PUBLIC_APP_NAME?.trim() || "Taukei",
    siteUrl: raw.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000",
    stripeMode,
    lalamoveMode,
    liveIntegrationsAllowed: isTruthy(raw.TAUKEI_ALLOW_LIVE_INTEGRATIONS)
  };
}

export function describeIntegrationSafety(env: TaukeiEnv): string {
  const modes = `Stripe=${env.stripeMode}, Lalamove=${env.lalamoveMode}`;
  if (env.stripeMode === "live" || env.lalamoveMode === "live") {
    return `${modes}. Live integrations explicitly enabled; verify credentials and production authorization.`;
  }
  return `${modes}. Safe local foundation: no real payment capture and no rider booking.`;
}
