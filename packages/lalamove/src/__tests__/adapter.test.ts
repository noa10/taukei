import { expect, test, mock, describe } from "bun:test";
import { LiveLalamoveAdapter, selectVehicleType } from "../adapter";
import type { DeliveryQuoteRequest, PricedOrderLine } from "@taukei/domain";

function makePricedLines(fragile: boolean): PricedOrderLine[] {
  return [
    {
      menuItemId: "item-1",
      nameSnapshot: "Test Item",
      unitPriceCents: 1650,
      quantity: 1,
      lineTotalCents: 1650,
      isFragileSnapshot: fragile,
      prepBufferMinutes: 15,
    },
  ];
}

function makeQuoteRequest(
  lines: PricedOrderLine[],
): DeliveryQuoteRequest {
  return {
    merchantId: "merchant-1",
    storeId: "store-1",
    orderRef: "TK-TEST-1",
    pickup: {
      line1: "Store Address, Kuala Lumpur",
      city: "Kuala Lumpur",
      latitude: 3.139,
      longitude: 101.6869,
    },
    dropoff: {
      line1: "Customer Address, KL",
      city: "Kuala Lumpur",
      latitude: 3.1,
      longitude: 101.7,
    },
    lines,
  };
}

const mockQuotationResponse = {
  quotationId: "qt_test_123",
  expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  serviceType: "MOTORCYCLE",
  language: "en_MY",
  stops: [
    { stopId: "stop_pickup", coordinates: { lat: "3.13900000", lng: "101.68690000" }, address: "Store" },
    { stopId: "stop_dropoff", coordinates: { lat: "3.10000000", lng: "101.70000000" }, address: "Customer" },
  ],
  isRouteOptimized: false,
  priceBreakdown: {
    base: "5.00",
    total: "6.00",
    totalBeforeOptimization: "6.00",
    totalExcludePriorityFee: "6.00",
    currency: "MYR",
  },
  distance: { value: "5.2", unit: "km" },
};

const mockOrderResponse = {
  orderId: "lm_test_456",
  quotationId: "qt_test_123",
  priceBreakdown: { total: "6.00", currency: "MYR", base: "5.00", totalBeforeOptimization: "6.00", totalExcludePriorityFee: "6.00" },
  driverId: "driver_test_789",
  shareLink: "https://track.lalamove.com/test",
  status: "ASSIGNING_DRIVER",
  distance: { value: "5.2", unit: "km" },
  stops: [],
};

describe("LiveLalamoveAdapter", () => {
  const config = {
    apiKey: "test_key",
    apiSecret: "test_secret",
    market: "MY",
    envMode: "sandbox" as const,
  };

  test("selectVehicleType returns CAR for fragile items", () => {
    expect(selectVehicleType(makePricedLines(true))).toBe("CAR");
  });

  test("selectVehicleType returns MOTORCYCLE for standard items", () => {
    expect(selectVehicleType(makePricedLines(false))).toBe("MOTORCYCLE");
  });

  test("quoteDelivery calls LalamoveClient and maps response", async () => {
    const adapter = new LiveLalamoveAdapter(config, "sandbox");
    // Mock the internal client
    const mockClient = {
      getQuotation: mock(async () => mockQuotationResponse),
      placeOrder: mock(async () => mockOrderResponse),
    };
    (adapter as unknown as { client: typeof mockClient }).client = mockClient;

    const quote = await adapter.quoteDelivery(
      makeQuoteRequest(makePricedLines(false)),
    );

    expect(quote.provider).toBe("sandbox_lalamove");
    expect(quote.mode).toBe("sandbox");
    expect(quote.noLiveBooking).toBe(false);
    expect(quote.feeCents).toBe(600); // 6.00 MYR → 600 cents
    expect(quote.vehicleType).toBe("MOTORCYCLE");
    expect(quote.metadata.quotationId).toBe("qt_test_123");
    expect(quote.metadata.stopIdPickup).toBe("stop_pickup");
    expect(quote.metadata.stopIdDropoff).toBe("stop_dropoff");
  });

  test("quoteDelivery throws if pickup coordinates missing", async () => {
    const adapter = new LiveLalamoveAdapter(config, "sandbox");
    const request = makeQuoteRequest(makePricedLines(false));
    request.pickup = { line1: "No coords", city: "KL" };

    await expect(adapter.quoteDelivery(request)).rejects.toThrow(
      "Store pickup coordinates are required",
    );
  });

  test("scheduleDeliveryJob calls placeOrder and maps response", async () => {
    const adapter = new LiveLalamoveAdapter(config, "sandbox");
    const mockClient = {
      getQuotation: mock(async () => mockQuotationResponse),
      placeOrder: mock(async () => mockOrderResponse),
    };
    (adapter as unknown as { client: typeof mockClient }).client = mockClient;

    const quote = {
      id: "qt_test_123",
      provider: "sandbox_lalamove",
      mode: "sandbox" as const,
      vehicleType: "MOTORCYCLE" as const,
      feeCents: 600,
      currency: "MYR" as const,
      noLiveBooking: false,
      metadata: {
        quotationId: "qt_test_123",
        stopIdPickup: "stop_pickup",
        stopIdDropoff: "stop_dropoff",
        orderRef: "TK-TEST-1",
        merchantId: "merchant-1",
        storeName: "Test Store",
        storePhone: "0123456789",
        recipientName: "Ahmad",
        recipientPhone: "0123456789",
      },
    };

    const job = await adapter.scheduleDeliveryJob(
      quote,
      new Date("2026-06-10T12:00:00.000Z"),
    );

    expect(job.provider_job_id ? job.metadata.lalamoveOrderId : job.id).toBeTruthy();
    expect(job.noLiveBooking).toBe(false);
    expect(job.status).toBe("assigning_driver");
    expect(job.vehicleType).toBe("MOTORCYCLE");
  });

  test("live mode returns lalamove provider", async () => {
    const adapter = new LiveLalamoveAdapter(
      { ...config, envMode: "production" },
      "live",
    );
    const mockClient = {
      getQuotation: mock(async () => mockQuotationResponse),
      placeOrder: mock(async () => mockOrderResponse),
    };
    (adapter as unknown as { client: typeof mockClient }).client = mockClient;

    const quote = await adapter.quoteDelivery(
      makeQuoteRequest(makePricedLines(false)),
    );

    expect(quote.provider).toBe("lalamove");
    expect(quote.mode).toBe("live");
  });
});
