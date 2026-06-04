import { afterEach, describe, expect, it } from "bun:test";
import { createLalamoveTestSignature, resetLalamoveWebhookIdempotencyForTests } from "../../../../lib/webhooks/lalamove";
import { POST } from "./route";

const originalSecret = process.env.LALAMOVE_WEBHOOK_SECRET;
const originalApiSecret = process.env.LALAMOVE_API_SECRET;
const originalMode = process.env.TAUKEI_LALAMOVE_MODE;

function lalamovePayload(id = "llm_evt_route_driver_assigned") {
  return JSON.stringify({
    id,
    type: "DRIVER_ASSIGNED",
    livemode: false,
    data: {
      orderId: "job_quote_fake_tk_demo_1001",
      status: "ON_GOING",
      driverId: "driver-route-1",
      metadata: { orderRef: "TK-DEMO-1001" }
    }
  });
}

afterEach(() => {
  resetLalamoveWebhookIdempotencyForTests();
  if (originalSecret === undefined) delete process.env.LALAMOVE_WEBHOOK_SECRET;
  else process.env.LALAMOVE_WEBHOOK_SECRET = originalSecret;
  if (originalApiSecret === undefined) delete process.env.LALAMOVE_API_SECRET;
  else process.env.LALAMOVE_API_SECRET = originalApiSecret;
  if (originalMode === undefined) delete process.env.TAUKEI_LALAMOVE_MODE;
  else process.env.TAUKEI_LALAMOVE_MODE = originalMode;
});

describe("POST /api/webhooks/lalamove", () => {
  it("processes a signed deterministic Lalamove event and returns lifecycle evidence", async () => {
    process.env.TAUKEI_LALAMOVE_MODE = "sandbox";
    process.env.LALAMOVE_WEBHOOK_SECRET = "llm_route_secret";
    const payload = lalamovePayload();
    const response = await POST(new Request("http://localhost/api/webhooks/lalamove", {
      method: "POST",
      headers: { "x-lalamove-signature": createLalamoveTestSignature(payload, "llm_route_secret") },
      body: payload
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("processed");
    expect(body.serviceRoleBoundary).toBe("service-role-supabase-boundary");
    expect(body.reconciliation).toEqual(expect.objectContaining({ next_status: "driver_assigned", no_live_booking: true }));
    expect(body.noLiveSideEffect).toBe(true);
  });

  it("returns duplicate for repeated event ids without repeating lifecycle work", async () => {
    const payload = lalamovePayload("llm_evt_route_duplicate");
    const requestInit = { method: "POST", headers: { "lalamove-signature": "deterministic-test-signature" }, body: payload };
    const first = await POST(new Request("http://localhost/api/webhooks/lalamove", requestInit));
    const second = await POST(new Request("http://localhost/api/webhooks/lalamove", requestInit));
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(secondBody.status).toBe("duplicate");
    expect(secondBody.webhookEvent.duplicate).toBe(true);
  });

  it("rejects missing signatures even when a webhook secret is not configured", async () => {
    delete process.env.LALAMOVE_WEBHOOK_SECRET;
    delete process.env.LALAMOVE_API_SECRET;
    const response = await POST(new Request("http://localhost/api/webhooks/lalamove", {
      method: "POST",
      body: lalamovePayload("llm_evt_missing_signature")
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("rejected");
    expect(body.reason).toContain("Missing Lalamove signature");
  });
});
