import { loadTaukeiEnv, type RawEnv } from "@taukei/env";
import type { IntegrationMode } from "@taukei/env";
import type { DeliveryJob, DeliveryQuote, DeliveryQuoteRequest, LalamovePort } from "../types";
import { LiveLalamoveAdapter, selectVehicleType } from "@taukei/lalamove";

export { LiveLalamoveAdapter } from "@taukei/lalamove";
export { selectVehicleType } from "@taukei/lalamove";

export function createLalamoveAdapterFromEnv(raw?: RawEnv): LalamovePort {
  const env = loadTaukeiEnv(raw);
  return new LiveLalamoveAdapter(
    {
      apiKey: env.lalamoveApiKey,
      apiSecret: env.lalamoveApiSecret,
      market: env.lalamoveMarket,
      envMode: env.lalamoveMode === "live" ? "production" : "sandbox",
      baseUrlOverride: env.lalamoveBaseUrl || undefined,
    },
    env.lalamoveMode,
  );
}
