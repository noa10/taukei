import type { IntegrationMode } from "@taukei/env";

export type Currency = "MYR";
export type VehicleType = "MOTORCYCLE" | "CAR";

export interface MenuItemSnapshot {
  id: string;
  merchantId: string;
  name: string;
  priceCents: number;
  currency: Currency;
  isAvailable: boolean;
  isFragile: boolean;
  prepBufferMinutes: number;
  imageUrl?: string;
  categoryId?: string;
  description?: string;
}

export interface CartLineInput {
  menuItemId: string;
  quantity: number;
  clientUnitPriceCents?: number;
}

export interface PricedOrderLine {
  menuItemId: string;
  nameSnapshot: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  isFragileSnapshot: boolean;
  prepBufferMinutes: number;
}

export interface OrderTotals {
  subtotalCents: number;
  deliveryFeeCents: number;
  platformFeeCents: number;
  totalCents: number;
  currency: Currency;
}

export interface DeliveryAddress {
  line1: string;
  city: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  storeName?: string;
  storePhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientNotes?: string;
}

export interface CheckoutCustomerInput {
  name: string;
  phone: string;
  email?: string;
}

export interface CheckoutRequest {
  merchantId: string;
  storeId: string;
  cart: CartLineInput[];
  customer: CheckoutCustomerInput;
  deliveryAddress: DeliveryAddress;
  catalog: MenuItemSnapshot[];
  platformFeeCents?: number;
}

export interface DeliveryQuoteRequest {
  merchantId: string;
  storeId: string;
  orderRef: string;
  pickup: DeliveryAddress;
  dropoff: DeliveryAddress;
  lines: PricedOrderLine[];
}

export interface DeliveryQuote {
  id: string;
  provider: string;
  mode: IntegrationMode;
  vehicleType: VehicleType;
  feeCents: number;
  currency: Currency;
  noLiveBooking: boolean;
  metadata: Record<string, string | number | boolean>;
}

export type DeliveryStatus =
  | "quoted"
  | "scheduled"
  | "assigning_driver"
  | "driver_assigned"
  | "picked_up"
  | "delivered"
  | "cancelled"
  | "failed";

export interface DeliveryJob {
  id: string;
  provider: string;
  mode: IntegrationMode;
  status: DeliveryStatus;
  vehicleType: VehicleType;
  scheduledDispatchAt: string;
  noLiveBooking: boolean;
  metadata: Record<string, string | number | boolean>;
}

export interface PaymentSessionRequest {
  merchantId: string;
  orderRef: string;
  amountCents: number;
  currency: Currency;
  platformFeeCents: number;
  successUrl: string;
  cancelUrl: string;
  merchantName?: string;
  customerEmail?: string;
}

export type PaymentStatus = "requires_payment" | "paid" | "failed" | "refunded";

export interface PaymentSession {
  id: string;
  provider: string;
  mode: IntegrationMode;
  status: PaymentStatus;
  amountCents: number;
  currency: Currency;
  checkoutUrl: string;
  noLivePayment: boolean;
  metadata: Record<string, string | number | boolean>;
}

export interface StripePort {
  mode: IntegrationMode;
  createCheckoutSession(request: PaymentSessionRequest): Promise<PaymentSession>;
}

export interface LalamovePort {
  mode: IntegrationMode;
  quoteDelivery(request: DeliveryQuoteRequest): Promise<DeliveryQuote>;
  scheduleDeliveryJob(quote: DeliveryQuote, dispatchAt: Date): Promise<DeliveryJob>;
}

export interface CheckoutDraft {
  orderRef: string;
  merchantId: string;
  storeId: string;
  customer: CheckoutCustomerInput;
  deliveryAddress: DeliveryAddress;
  lines: PricedOrderLine[];
  totals: OrderTotals;
  maxPrepBufferMinutes: number;
  paymentSession: PaymentSession;
  deliveryQuote: DeliveryQuote;
  deliveryJob: DeliveryJob;
  stripeCheckoutUrl: string;
}
