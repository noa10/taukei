import type { IntegrationMode } from "@taukei/env";
import type {
  DeliveryJob,
  DeliveryQuote,
  DeliveryQuoteRequest,
  LalamovePort,
  PricedOrderLine,
  VehicleType,
} from "@taukei/domain";
import { LalamoveClient, type LalamoveClientConfig } from "./client";
import {
  formatLalamoveCoordinate,
  moneyStringToCents,
  normalizePriceBreakdown,
} from "./quote";
import { normalizeMalaysianPhone } from "./phone";
import { buildLalamoveRemarks } from "./remarks";
import type { LalamoveEnv } from "./transport";

export function selectVehicleType(lines: PricedOrderLine[]): VehicleType {
  return lines.some((line) => line.isFragileSnapshot) ? "CAR" : "MOTORCYCLE";
}

export class LiveLalamoveAdapter implements LalamovePort {
  readonly mode: IntegrationMode;
  private readonly client: LalamoveClient;
  private readonly envMode: LalamoveEnv;

  constructor(config: LalamoveClientConfig, mode: IntegrationMode) {
    this.client = new LalamoveClient(config);
    this.envMode = mode === "live" ? "production" : "sandbox";
    this.mode = mode;
  }

  async quoteDelivery(request: DeliveryQuoteRequest): Promise<DeliveryQuote> {
    const vehicleType = selectVehicleType(request.lines);
    const serviceType = vehicleType === "CAR" ? "CAR" : "MOTORCYCLE";

    const pickup = request.pickup;
    const dropoff = request.dropoff;

    if (!pickup.latitude || !pickup.longitude) {
      throw new Error(
        "Store pickup coordinates are required for live delivery quotation.",
      );
    }
    if (!dropoff.latitude || !dropoff.longitude) {
      throw new Error(
        "Customer delivery coordinates are required for live delivery quotation.",
      );
    }

    const quotation = await this.client.getQuotation({
      serviceType,
      language: "en_MY",
      stops: [
        {
          coordinates: {
            lat: formatLalamoveCoordinate(pickup.latitude),
            lng: formatLalamoveCoordinate(pickup.longitude),
          },
          address: pickup.line1,
        },
        {
          coordinates: {
            lat: formatLalamoveCoordinate(dropoff.latitude),
            lng: formatLalamoveCoordinate(dropoff.longitude),
          },
          address: dropoff.line1,
        },
      ],
    });

    const priceBreakdown = normalizePriceBreakdown(
      quotation.priceBreakdown,
    );
    const totalFeeCents = moneyStringToCents(priceBreakdown.total);

    const stopIds = {
      pickup: quotation.stops[0]?.stopId ?? "",
      dropoff: quotation.stops[1]?.stopId ?? "",
    };

    return {
      id: quotation.quotationId,
      provider: this.mode === "live" ? "lalamove" : "sandbox_lalamove",
      mode: this.mode,
      vehicleType,
      feeCents: totalFeeCents,
      currency: (quotation.priceBreakdown.currency.toUpperCase() as "MYR") ?? "MYR",
      noLiveBooking: false,
      metadata: {
        merchantId: request.merchantId,
        storeId: request.storeId,
        orderRef: request.orderRef,
        quotationId: quotation.quotationId,
        stopIdPickup: stopIds.pickup,
        stopIdDropoff: stopIds.dropoff,
        serviceType: quotation.serviceType,
        expiresAt: quotation.expiresAt,
        storeName: (pickup as Record<string, unknown>).storeName ?? "",
        storePhone: (pickup as Record<string, unknown>).storePhone ?? "",
        pickupLat: String(pickup.latitude),
        pickupLng: String(pickup.longitude),
        pickupAddress: pickup.line1,
      },
    };
  }

  async scheduleDeliveryJob(
    quote: DeliveryQuote,
    dispatchAt: Date,
  ): Promise<DeliveryJob> {
    const quotationId = String(quote.metadata.quotationId ?? "");
    const pickupStopId = String(quote.metadata.stopIdPickup ?? "");
    const dropoffStopId = String(quote.metadata.stopIdDropoff ?? "");

    if (!quotationId || !pickupStopId || !dropoffStopId) {
      throw new Error(
        "Cannot place Lalamove order: missing quotationId or stopIds from delivery quote metadata.",
      );
    }

    // Build sender from store info stored in quote metadata
    const senderName = String(quote.metadata.storeName ?? "Taukei Store");
    const senderPhoneRaw = String(quote.metadata.storePhone ?? "");
    const senderPhone =
      normalizeMalaysianPhone(senderPhoneRaw) ?? "+60123456789";

    // Build recipient from delivery address (stored in quote's dropoff metadata)
    const recipientName = String(quote.metadata.recipientName ?? "Customer");
    const recipientPhoneRaw = String(
      quote.metadata.recipientPhone ?? "",
    );
    const recipientPhone =
      normalizeMalaysianPhone(recipientPhoneRaw) ?? "+60123456789";

    const remarks = buildLalamoveRemarks({
      orderRef: String(quote.metadata.orderRef ?? ""),
      orderId: quote.id,
      existingNotes: String(quote.metadata.recipientNotes ?? ""),
    });

    const lalamoveOrder = await this.client.placeOrder({
      quotationId,
      sender: {
        stopId: pickupStopId,
        name: senderName,
        phone: senderPhone,
      },
      recipients: [
        {
          stopId: dropoffStopId,
          name: recipientName,
          phone: recipientPhone,
          remarks,
        },
      ],
      isPODEnabled: true,
      metadata: {
        orderId: String(quote.metadata.orderRef ?? ""),
        merchantId: String(quote.metadata.merchantId ?? ""),
      },
    });

    return {
      id: lalamoveOrder.orderId,
      provider: quote.provider,
      mode: quote.mode,
      status: "assigning_driver",
      vehicleType: quote.vehicleType,
      scheduledDispatchAt: dispatchAt.toISOString(),
      noLiveBooking: false,
      metadata: {
        quoteId: quote.id,
        lalamoveOrderId: lalamoveOrder.orderId,
        shareLink: lalamoveOrder.shareLink,
        quotationId,
        driverId: lalamoveOrder.driverId,
      },
    };
  }
}

export function createLalamoveAdapterFromConfig(
  config: LalamoveClientConfig,
  mode: IntegrationMode,
): LiveLalamoveAdapter {
  return new LiveLalamoveAdapter(config, mode);
}
