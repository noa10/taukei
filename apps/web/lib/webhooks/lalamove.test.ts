import { afterEach, describe, expect, it } from "bun:test";
import {
  createLalamoveTestSignature,
  processDeterministicLalamoveWebhook,
  resetLalamoveWebhookIdempotencyForTests,
} from "./lalamove";

const event = {
  id: "llm_evt_driver_assigned",
  type: "DRIVER_ASSIGNED",
  livemode: false,
  data: {
    orderId: "job_quote_fake_tk_demo_1001",
    status: "ON_GOING",
    driverId: "driver-demo-1",
    metadata: { orderRef: "TK-DEMO-1001" },
  },
} as const;

const payload = JSON.stringify(event);

afterEach(() => {
  resetLalamoveWebhookIdempotencyForTests();
});

describe("deterministic Lalamove webhook processing", () => {
  it("verifies configured signatures and reconciles simulator delivery lifecycle without live booking", async () => {
    const signature = createLalamoveTestSignature(
      payload,
      "llm_whsec_test_taukei",
    );
    const result = await processDeterministicLalamoveWebhook(
      payload,
      signature,
      {
        TAUKEI_LALAMOVE_MODE: "sandbox",
        LALAMOVE_WEBHOOK_SECRET: "llm_whsec_test_taukei",
      },
    );

    expect(result.accepted).toBe(true);
    expect(result.status).toBe("processed");
    expect(result.mode).toBe("sandbox");
    expect(result.webhookEvent).toEqual(
      expect.objectContaining({
        event_id: event.id,
        duplicate: false,
        no_live_side_effect: true,
      }),
    );
    expect(result.reconciliation).toEqual(
      expect.objectContaining({
        order_ref: "TK-DEMO-1001",
        provider_job_id: "job_quote_fake_tk_demo_1001",
        previous_status: "scheduled",
        next_status: "driver_assigned",
        driver_id: "driver-demo-1",
        no_live_booking: true,
      }),
    );
    expect(result.noLiveSideEffect).toBe(true);
    expect(result.productionGuardrail).toEqual(
      expect.objectContaining({
        idempotencyScope: "process-local-foundation-only",
        remotePersistence: false,
        productionReady: false,
        requiresAtomicWebhookEvents: true,
      }),
    );
  });

  it("rejects bad configured signatures before lifecycle reconciliation", async () => {
    const result = await processDeterministicLalamoveWebhook(payload, "bad", {
      TAUKEI_LALAMOVE_MODE: "sandbox",
      LALAMOVE_WEBHOOK_SECRET: "llm_whsec_test_taukei",
    });

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.reason).toContain("signature");
  });

  it("handles duplicate Lalamove events idempotently", async () => {
    const first = await processDeterministicLalamoveWebhook(
      payload,
      "deterministic-test-signature",
      { TAUKEI_LALAMOVE_MODE: "fake" },
    );
    const duplicate = await processDeterministicLalamoveWebhook(
      payload,
      "deterministic-test-signature",
      { TAUKEI_LALAMOVE_MODE: "fake" },
    );

    expect(first.status).toBe("processed");
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.idempotencyKey).toBe(first.idempotencyKey);
    expect(duplicate.webhookEvent?.duplicate).toBe(true);
    expect(duplicate.reconciliation).toEqual(first.reconciliation);
  });

  it("fails closed for live Lalamove event payloads", async () => {
    const livePayload = JSON.stringify({
      ...event,
      id: "llm_evt_live_rejected",
      livemode: true,
    });
    const result = await processDeterministicLalamoveWebhook(
      livePayload,
      "deterministic-test-signature",
      { TAUKEI_LALAMOVE_MODE: "fake" },
    );

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.noLiveSideEffect).toBe(true);
    expect(result.reason).toContain("Live Lalamove event payload rejected");
  });
});
