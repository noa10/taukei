import { expect, test, describe } from "bun:test";
import {
  mapV3StatusToDeliveryStatus,
  mapDeliveryToFulfillmentStatus,
  isTerminalDeliveryStatus,
  isValidDeliveryStatusTransition,
} from "../status-mapper";

describe("status-mapper", () => {
  test("maps Lalamove v3 statuses to taukei DeliveryStatus", () => {
    expect(mapV3StatusToDeliveryStatus("ASSIGNING_DRIVER")).toBe("assigning_driver");
    expect(mapV3StatusToDeliveryStatus("ON_GOING")).toBe("driver_assigned");
    expect(mapV3StatusToDeliveryStatus("PICKED_UP")).toBe("picked_up");
    expect(mapV3StatusToDeliveryStatus("COMPLETED")).toBe("delivered");
    expect(mapV3StatusToDeliveryStatus("CANCELED")).toBe("cancelled");
    expect(mapV3StatusToDeliveryStatus("REJECTED")).toBe("failed");
    expect(mapV3StatusToDeliveryStatus("EXPIRED")).toBe("failed");
  });

  test("maps delivery status to fulfillment status only for lifecycle transitions", () => {
    expect(mapDeliveryToFulfillmentStatus("picked_up")).toBe("out_for_delivery");
    expect(mapDeliveryToFulfillmentStatus("delivered")).toBe("delivered");
    expect(mapDeliveryToFulfillmentStatus("cancelled")).toBe("cancelled");
    expect(mapDeliveryToFulfillmentStatus("assigning_driver")).toBeNull();
    expect(mapDeliveryToFulfillmentStatus("driver_assigned")).toBeNull();
  });

  test("identifies terminal statuses", () => {
    expect(isTerminalDeliveryStatus("delivered")).toBe(true);
    expect(isTerminalDeliveryStatus("cancelled")).toBe(true);
    expect(isTerminalDeliveryStatus("failed")).toBe(true);
    expect(isTerminalDeliveryStatus("assigning_driver")).toBe(false);
  });

  test("validates status transitions", () => {
    expect(isValidDeliveryStatusTransition("assigning_driver", "driver_assigned")).toBe(true);
    expect(isValidDeliveryStatusTransition("driver_assigned", "picked_up")).toBe(true);
    expect(isValidDeliveryStatusTransition("picked_up", "delivered")).toBe(true);
    expect(isValidDeliveryStatusTransition("delivered", "assigning_driver")).toBe(false);
    expect(isValidDeliveryStatusTransition("driver_assigned", "assigning_driver")).toBe(true); // driver rejection revert
    expect(isValidDeliveryStatusTransition("assigning_driver", "assigning_driver")).toBe(true); // duplicate webhook
  });
});
