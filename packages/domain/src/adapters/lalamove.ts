import { loadTaukeiEnv, type RawEnv } from "@taukei/env";
import type { IntegrationMode } from "@taukei/env";
import type { DeliveryJob, DeliveryQuote, DeliveryQuoteRequest, LalamovePort, PricedOrderLine, VehicleType } from "../types";

export function selectVehicleType(lines: PricedOrderLine[]): VehicleType {
  return lines.some((line) => line.isFragileSnapshot) ? "CAR" : "MOTORCYCLE";
}

function makeId(prefix: string, mode: IntegrationMode, orderRef: string): string {
  const safeRef = orderRef.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `${prefix}_${mode}_${safeRef}`;
}

export class FakeLalamoveAdapter implements LalamovePort {
  readonly mode: IntegrationMode;

  constructor(mode: Extract<IntegrationMode, "fake" | "sandbox"> = "fake") {
    this.mode = mode;
  }

  async quoteDelivery(request: DeliveryQuoteRequest): Promise<DeliveryQuote> {
    const vehicleType = selectVehicleType(request.lines);
    return {
      id: makeId("quote", this.mode, request.orderRef),
      provider: this.mode === "sandbox" ? "sandbox_lalamove" : "fake_lalamove",
      mode: this.mode,
      vehicleType,
      feeCents: vehicleType === "CAR" ? 900 : 600,
      currency: "MYR",
      noLiveBooking: true,
      metadata: {
        merchantId: request.merchantId,
        storeId: request.storeId,
        orderRef: request.orderRef,
        reason: vehicleType === "CAR" ? "fragile_item_requires_car" : "standard_food_motorcycle",
        noNetwork: true
      }
    };
  }

  async scheduleDeliveryJob(quote: DeliveryQuote, dispatchAt: Date): Promise<DeliveryJob> {
    return {
      id: `job_${quote.id}`,
      provider: quote.provider,
      mode: quote.mode,
      status: "scheduled",
      vehicleType: quote.vehicleType,
      scheduledDispatchAt: dispatchAt.toISOString(),
      noLiveBooking: true,
      metadata: {
        quoteId: quote.id,
        noNetwork: true
      }
    };
  }
}

export function createLalamoveAdapterFromEnv(raw?: RawEnv): LalamovePort {
  const env = loadTaukeiEnv(raw);
  if (env.lalamoveMode === "live") {
    throw new Error("Live Lalamove adapter is intentionally not implemented in the Taukei foundation. Use fake/sandbox until the explicit production integration phase.");
  }
  return new FakeLalamoveAdapter(env.lalamoveMode);
}
