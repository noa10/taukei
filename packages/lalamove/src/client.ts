import { LalamoveTransport, resolveBaseUrl, type LalamoveEnv } from "./transport";
import type {
  LalamoveQuotationRequest,
  LalamoveQuotationResponse,
  LalamovePlaceOrderRequest,
  LalamoveOrderResponse,
  LalamoveDriverDetails,
  LalamoveCityInfo,
} from "./types";

export interface LalamoveClientConfig {
  apiKey: string;
  apiSecret: string;
  market: string;
  envMode: LalamoveEnv;
  baseUrlOverride?: string;
}

export class LalamoveClient {
  private readonly transport: LalamoveTransport;
  private readonly envMode: LalamoveEnv;

  constructor(config: LalamoveClientConfig) {
    this.envMode = config.envMode;
    const baseUrl = resolveBaseUrl(this.envMode, config.baseUrlOverride);

    this.transport = new LalamoveTransport({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      market: config.market,
      baseUrl,
    });
  }

  async getQuotation(
    request: LalamoveQuotationRequest,
  ): Promise<LalamoveQuotationResponse> {
    return this.transport.post<LalamoveQuotationResponse>("/v3/quotations", {
      data: {
        serviceType: request.serviceType,
        language: request.language,
        stops: request.stops,
        scheduleAt: request.scheduleAt,
        specialRequests: request.specialRequests,
        item: request.item,
        isRouteOptimized: request.isRouteOptimized,
      },
    });
  }

  async placeOrder(
    request: LalamovePlaceOrderRequest,
  ): Promise<LalamoveOrderResponse> {
    return this.transport.post<LalamoveOrderResponse>("/v3/orders", {
      data: {
        quotationId: request.quotationId,
        sender: request.sender,
        recipients: request.recipients,
        isPODEnabled: request.isPODEnabled ?? true,
        metadata: request.metadata,
      },
    });
  }

  async getOrderDetails(orderId: string): Promise<LalamoveOrderResponse> {
    return this.transport.get<LalamoveOrderResponse>(`/v3/orders/${orderId}`);
  }

  async getDriverDetails(
    orderId: string,
    driverId: string,
  ): Promise<LalamoveDriverDetails> {
    return this.transport.get<LalamoveDriverDetails>(
      `/v3/orders/${orderId}/drivers/${driverId}`,
    );
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.transport.del(`/v3/orders/${orderId}`);
  }

  async getCityInfo(): Promise<LalamoveCityInfo[]> {
    return this.transport.get<LalamoveCityInfo[]>(
      "/v3/cities?countryIso2=MY",
    );
  }

  getEnvironment(): LalamoveEnv {
    return this.envMode;
  }

  isSandbox(): boolean {
    return this.envMode === "sandbox";
  }
}

export function createLalamoveClient(
  config: LalamoveClientConfig,
): LalamoveClient {
  return new LalamoveClient(config);
}
