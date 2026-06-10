import type { LalamoveOrderStatus } from "./types";
import type { DeliveryStatus } from "@taukei/domain";

const V3_TO_DELIVERY: Record<LalamoveOrderStatus, DeliveryStatus> = {
  ASSIGNING_DRIVER: "assigning_driver",
  ON_GOING: "driver_assigned",
  PICKED_UP: "picked_up",
  COMPLETED: "delivered",
  CANCELED: "cancelled",
  REJECTED: "failed",
  EXPIRED: "failed",
};

const DELIVERY_TO_FULFILLMENT: Partial<
  Record<DeliveryStatus, "out_for_delivery" | "delivered" | "cancelled">
> = {
  picked_up: "out_for_delivery",
  delivered: "delivered",
  cancelled: "cancelled",
};

export function mapV3StatusToDeliveryStatus(
  status: LalamoveOrderStatus,
): DeliveryStatus {
  return V3_TO_DELIVERY[status] ?? "failed";
}

export function mapDeliveryToFulfillmentStatus(
  deliveryStatus: DeliveryStatus,
): "out_for_delivery" | "delivered" | "cancelled" | null {
  return DELIVERY_TO_FULFILLMENT[deliveryStatus] ?? null;
}

export function isTerminalDeliveryStatus(status: DeliveryStatus): boolean {
  return ["delivered", "cancelled", "failed"].includes(status);
}

export function isValidDeliveryStatusTransition(
  from: DeliveryStatus,
  to: DeliveryStatus,
): boolean {
  if (from === "delivered" || from === "failed" || from === "cancelled") {
    return false;
  }

  if (from === "failed" && to === "assigning_driver") {
    return true;
  }

  if (["failed", "cancelled"].includes(to)) {
    return true;
  }

  // Driver rejection reverts
  const legalReverts: ReadonlyArray<
    readonly [DeliveryStatus, DeliveryStatus]
  > = [
    ["driver_assigned", "assigning_driver"],
    ["picked_up", "assigning_driver"],
    ["assigning_driver", "assigning_driver"],
  ];
  if (legalReverts.some(([f, t]) => f === from && t === to)) {
    return true;
  }

  // Normal forward progression
  const order: DeliveryStatus[] = [
    "quoted",
    "scheduled",
    "assigning_driver",
    "driver_assigned",
    "picked_up",
    "delivered",
  ];

  const fromIdx = order.indexOf(from);
  const toIdx = order.indexOf(to);

  if (fromIdx === -1 || toIdx === -1) return false;

  return toIdx > fromIdx;
}
