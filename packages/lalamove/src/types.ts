// ============================================================
// Lalamove v3 API Types
// ============================================================

// --- Quotation ---

export interface LalamoveCoordinates {
  lat: string;
  lng: string;
}

export interface LalamoveStop {
  stopId: string;
  coordinates: LalamoveCoordinates;
  address: string;
}

export interface LalamovePriceBreakdown {
  base: string;
  extraMileage?: string;
  surcharge?: string;
  specialRequests?: string;
  vat?: string;
  adminFee?: string;
  totalBeforeOptimization: string;
  totalExcludePriorityFee: string;
  total: string;
  currency: string;
  priorityFee?: string;
}

export interface LalamoveDistance {
  value: string;
  unit: string;
}

export interface LalamoveItem {
  quantity?: string;
  weight?: string;
  categories?: string[];
  handlingInstructions?: string[];
}

export interface LalamoveQuotationRequest {
  serviceType: string;
  language: string;
  stops: Array<{
    coordinates: LalamoveCoordinates;
    address: string;
  }>;
  scheduleAt?: string;
  specialRequests?: string[];
  item?: LalamoveItem;
  isRouteOptimized?: boolean;
}

export interface LalamoveQuotationResponse {
  quotationId: string;
  scheduleAt?: string;
  expiresAt: string;
  serviceType: string;
  specialRequests?: string[];
  language: string;
  stops: LalamoveStop[];
  isRouteOptimized: boolean;
  priceBreakdown: LalamovePriceBreakdown;
  item?: LalamoveItem;
  distance: LalamoveDistance;
}

// --- Order ---

export interface LalamoveSenderRequest {
  stopId: string;
  name: string;
  phone: string;
}

export interface LalamoveRecipientRequest {
  stopId: string;
  name: string;
  phone: string;
  remarks?: string;
}

export interface LalamovePlaceOrderRequest {
  quotationId: string;
  sender: LalamoveSenderRequest;
  recipients: LalamoveRecipientRequest[];
  isPODEnabled?: boolean;
  metadata?: Record<string, string>;
}

export interface LalamoveOrderStop extends LalamoveStop {
  name: string;
  phone: string;
  POD?: {
    status: string;
    image?: string;
    deliveredAt?: string;
  };
}

export interface LalamoveOrderResponse {
  orderId: string;
  quotationId: string;
  priceBreakdown: LalamovePriceBreakdown;
  driverId: string;
  shareLink: string;
  status: LalamoveOrderStatus;
  distance: LalamoveDistance;
  stops: LalamoveOrderStop[];
  metadata?: Record<string, string>;
}

// --- Order Status ---

export type LalamoveOrderStatus =
  | "ASSIGNING_DRIVER"
  | "ON_GOING"
  | "PICKED_UP"
  | "COMPLETED"
  | "CANCELED"
  | "REJECTED"
  | "EXPIRED";

// --- Driver ---

export interface LalamoveDriverDetails {
  driverId: string;
  name: string;
  phone: string;
  plateNumber: string;
  photo?: string;
  coordinates?: {
    lat: string;
    lng: string;
    updatedAt: string;
  };
}

// --- City Info ---

export interface LalamoveServiceInfo {
  serviceType: string;
  description: string;
}

export interface LalamoveSpecialRequest {
  name: string;
}

export interface LalamoveCityInfo {
  name: string;
  country: string;
  services: LalamoveServiceInfo[];
  specialRequests?: LalamoveSpecialRequest[];
  deliveryItemSpecification?: Record<string, unknown>;
}

// --- Webhook ---

export type LalamoveWebhookEventType =
  | "ORDER_STATUS_CHANGED"
  | "DRIVER_ASSIGNED"
  | "ORDER_AMOUNT_CHANGED"
  | "ORDER_REPLACED"
  | "ORDER_CREATED"
  | "POD_STATUS_CHANGED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED";

export interface LalamoveWebhookPayload {
  orderId: string;
  timestamp: string;
  type: LalamoveWebhookEventType;
  data: Record<string, unknown>;
}

// --- API Response Wrappers ---

export interface LalamoveApiResponse<T> {
  data: T;
}

// --- Error Types ---

export class LalamoveApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = "LalamoveApiError";
  }
}

export class LalamoveQuotationExpiredError extends LalamoveApiError {
  constructor(quotationId: string) {
    super(`Quotation ${quotationId} has expired`, 422);
    this.name = "LalamoveQuotationExpiredError";
  }
}

export class LalamoveRateLimitError extends LalamoveApiError {
  constructor() {
    super("Rate limit exceeded", 429);
    this.name = "LalamoveRateLimitError";
  }
}

export class LalamoveAuthError extends LalamoveApiError {
  constructor() {
    super("Authentication failed", 401);
    this.name = "LalamoveAuthError";
  }
}
