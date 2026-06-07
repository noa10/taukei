export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MerchantStatus = "draft" | "active" | "suspended";
export type MerchantRole = "owner" | "admin" | "staff";
export type MembershipStatus = "invited" | "active" | "disabled";
export type StoreStatus = "draft" | "open" | "paused" | "closed";
export type OrderStatus = "draft" | "pending_payment" | "confirmed" | "cancelled" | "completed";
export type FulfillmentStatus = "new" | "accepted" | "preparing" | "ready_for_pickup" | "out_for_delivery" | "delivered" | "cancelled";
export type PaymentStatus = "requires_payment" | "stubbed" | "paid" | "failed" | "refunded";
export type DeliveryStatus = "quoted" | "scheduled" | "assigning_driver" | "driver_assigned" | "picked_up" | "delivered" | "cancelled" | "failed";
export type IntegrationMode = "fake" | "sandbox" | "live";
export type VehicleType = "MOTORCYCLE" | "CAR";

export interface Database {
  public: {
    Tables: {
      merchants: {
        Row: {
          id: string;
          slug: string;
          legal_name: string | null;
          display_name: string;
          status: MerchantStatus;
          timezone: string;
          currency: string;
          support_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          legal_name?: string | null;
          display_name: string;
          status?: MerchantStatus;
          timezone?: string;
          currency?: string;
          support_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["merchants"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          phone: string | null;
          email: string | null;
          default_merchant_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          phone?: string | null;
          email?: string | null;
          default_merchant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      merchant_memberships: {
        Row: {
          id: string;
          merchant_id: string;
          user_id: string;
          role: MerchantRole;
          status: MembershipStatus;
          invited_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          user_id: string;
          role?: MerchantRole;
          status?: MembershipStatus;
          invited_email?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["merchant_memberships"]["Insert"]>;
      };
      stores: {
        Row: {
          id: string;
          merchant_id: string;
          slug: string;
          name: string;
          description: string | null;
          phone: string | null;
          address_line1: string | null;
          city: string;
          state: string;
          postcode: string | null;
          latitude: number | null;
          longitude: number | null;
          status: StoreStatus;
          public_ordering_enabled: boolean;
          prep_buffer_minutes: number;
          default_vehicle_type: VehicleType;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          slug: string;
          name: string;
          description?: string | null;
          phone?: string | null;
          address_line1?: string | null;
          city?: string;
          state?: string;
          postcode?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          status?: StoreStatus;
          public_ordering_enabled?: boolean;
          prep_buffer_minutes?: number;
          default_vehicle_type?: VehicleType;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stores"]["Insert"]>;
      };
      menus: {
        Row: { id: string; merchant_id: string; store_id: string; name: string; is_active: boolean; created_at: string };
        Insert: { id?: string; merchant_id: string; store_id: string; name: string; is_active?: boolean; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["menus"]["Insert"]>;
      };
      menu_categories: {
        Row: { id: string; merchant_id: string; menu_id: string; name: string; sort_order: number; is_active: boolean; created_at: string };
        Insert: { id?: string; merchant_id: string; menu_id: string; name: string; sort_order?: number; is_active?: boolean; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["menu_categories"]["Insert"]>;
      };
      menu_items: {
        Row: {
          id: string;
          merchant_id: string;
          category_id: string;
          sku: string | null;
          name: string;
          description: string | null;
          price_cents: number;
          currency: string;
          is_available: boolean;
          is_fragile: boolean;
          prep_buffer_minutes: number | null;
          image_url: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          category_id: string;
          sku?: string | null;
          name: string;
          description?: string | null;
          price_cents: number;
          currency?: string;
          is_available?: boolean;
          is_fragile?: boolean;
          prep_buffer_minutes?: number | null;
          image_url?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Insert"]>;
      };
      customers: {
        Row: { id: string; merchant_id: string; name: string; email: string | null; phone: string; last_delivery_address: Json; created_at: string };
        Insert: { id?: string; merchant_id: string; name: string; email?: string | null; phone: string; last_delivery_address?: Json; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          merchant_id: string;
          store_id: string;
          customer_id: string | null;
          public_ref: string;
          status: OrderStatus;
          fulfillment_status: FulfillmentStatus;
          subtotal_cents: number;
          delivery_fee_cents: number;
          platform_fee_cents: number;
          total_cents: number;
          currency: string;
          delivery_address: Json;
          customer_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          store_id: string;
          customer_id?: string | null;
          public_ref: string;
          status?: OrderStatus;
          fulfillment_status?: FulfillmentStatus;
          subtotal_cents: number;
          delivery_fee_cents?: number;
          platform_fee_cents?: number;
          currency?: string;
          delivery_address: Json;
          customer_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["orders"]["Insert"], "total_cents">>;
      };
      order_items: {
        Row: { id: string; order_id: string; merchant_id: string; menu_item_id: string | null; name_snapshot: string; unit_price_cents: number; quantity: number; line_total_cents: number; is_fragile_snapshot: boolean; created_at: string };
        Insert: { id?: string; order_id: string; merchant_id: string; menu_item_id?: string | null; name_snapshot: string; unit_price_cents: number; quantity: number; is_fragile_snapshot?: boolean; created_at?: string };
        Update: Partial<Omit<Database["public"]["Tables"]["order_items"]["Insert"], "line_total_cents">>;
      };
      payment_sessions: {
        Row: { id: string; merchant_id: string; order_id: string; provider: string; mode: IntegrationMode; provider_session_id: string | null; status: PaymentStatus; amount_cents: number; currency: string; metadata: Json; created_at: string };
        Insert: { id?: string; merchant_id: string; order_id: string; provider?: string; mode?: IntegrationMode; provider_session_id?: string | null; status?: PaymentStatus; amount_cents: number; currency?: string; metadata?: Json; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["payment_sessions"]["Insert"]>;
      };
      delivery_quotes: {
        Row: { id: string; merchant_id: string; order_id: string | null; provider: string; mode: IntegrationMode; quote_ref: string | null; vehicle_type: VehicleType; fee_cents: number; currency: string; pickup: Json; dropoff: Json; expires_at: string | null; metadata: Json; created_at: string };
        Insert: { id?: string; merchant_id: string; order_id?: string | null; provider?: string; mode?: IntegrationMode; quote_ref?: string | null; vehicle_type: VehicleType; fee_cents: number; currency?: string; pickup: Json; dropoff: Json; expires_at?: string | null; metadata?: Json; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["delivery_quotes"]["Insert"]>;
      };
      delivery_jobs: {
        Row: { id: string; merchant_id: string; order_id: string; delivery_quote_id: string | null; provider: string; mode: IntegrationMode; provider_job_id: string | null; status: DeliveryStatus; vehicle_type: VehicleType; scheduled_dispatch_at: string | null; metadata: Json; created_at: string; updated_at: string };
        Insert: { id?: string; merchant_id: string; order_id: string; delivery_quote_id?: string | null; provider?: string; mode?: IntegrationMode; provider_job_id?: string | null; status?: DeliveryStatus; vehicle_type: VehicleType; scheduled_dispatch_at?: string | null; metadata?: Json; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["delivery_jobs"]["Insert"]>;
      };
      delivery_events: {
        Row: { id: string; merchant_id: string; delivery_job_id: string; status: DeliveryStatus; payload: Json; occurred_at: string };
        Insert: { id?: string; merchant_id: string; delivery_job_id: string; status: DeliveryStatus; payload?: Json; occurred_at?: string };
        Update: Partial<Database["public"]["Tables"]["delivery_events"]["Insert"]>;
      };
      webhook_events: {
        Row: {
          id: string;
          merchant_id: string | null;
          provider: string;
          mode: IntegrationMode;
          event_id: string;
          event_type: string;
          idempotency_key: string;
          request_hash: string | null;
          status: "received" | "processed" | "ignored" | "failed";
          payload: Json;
          response: Json | null;
          error: string | null;
          received_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          merchant_id?: string | null;
          provider: string;
          mode?: IntegrationMode;
          event_id: string;
          event_type: string;
          idempotency_key: string;
          request_hash?: string | null;
          status?: "received" | "processed" | "ignored" | "failed";
          payload?: Json;
          response?: Json | null;
          error?: string | null;
          received_at?: string;
          processed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["webhook_events"]["Insert"]>;
      };
      fulfillment_events: {
        Row: { id: string; merchant_id: string; order_id: string; from_status: FulfillmentStatus | null; to_status: FulfillmentStatus; note: string | null; actor_user_id: string | null; occurred_at: string };
        Insert: { id?: string; merchant_id: string; order_id: string; from_status?: FulfillmentStatus | null; to_status: FulfillmentStatus; note?: string | null; actor_user_id?: string | null; occurred_at?: string };
        Update: Partial<Database["public"]["Tables"]["fulfillment_events"]["Insert"]>;
      };

      modifier_groups: {
        Row: {
          id: string;
          merchant_id: string;
          name: string;
          description: string | null;
          min_selections: number;
          max_selections: number;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          name: string;
          description?: string | null;
          min_selections?: number;
          max_selections?: number;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          name?: string;
          description?: string | null;
          min_selections?: number;
          max_selections?: number;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      modifiers: {
        Row: {
          id: string;
          merchant_id: string;
          modifier_group_id: string;
          name: string;
          price_delta_cents: number;
          is_default: boolean;
          is_available: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          modifier_group_id: string;
          name: string;
          price_delta_cents?: number;
          is_default?: boolean;
          is_available?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          modifier_group_id?: string;
          name?: string;
          price_delta_cents?: number;
          is_default?: boolean;
          is_available?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      menu_item_modifier_groups: {
        Row: {
          id: string;
          merchant_id: string;
          menu_item_id: string;
          modifier_group_id: string;
          is_required: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          menu_item_id: string;
          modifier_group_id: string;
          is_required?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          menu_item_id?: string;
          modifier_group_id?: string;
          is_required?: boolean;
          created_at?: string;
        };
      };
    };
    Enums: {
      merchant_status: MerchantStatus;
      merchant_role: MerchantRole;
      membership_status: MembershipStatus;
      store_status: StoreStatus;
      order_status: OrderStatus;
      fulfillment_status: FulfillmentStatus;
      payment_status: PaymentStatus;
      delivery_status: DeliveryStatus;
      integration_mode: IntegrationMode;
    };
  };
}

export type PublicTableName = keyof Database["public"]["Tables"];
export type Row<T extends PublicTableName> = Database["public"]["Tables"][T]["Row"];
export type Insert<T extends PublicTableName> = Database["public"]["Tables"][T]["Insert"];
export type Update<T extends PublicTableName> = Database["public"]["Tables"][T]["Update"];
