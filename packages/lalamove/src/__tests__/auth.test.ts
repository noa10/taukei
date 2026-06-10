import { expect, test, describe } from "bun:test";
import { generateSignature, verifyWebhookSignature } from "../auth";

describe("auth", () => {
  test("generateSignature produces deterministic HMAC-SHA256", () => {
    const sig1 = generateSignature("POST", "/v3/quotations", "1234567890", '{"data":{}}', "test_secret");
    const sig2 = generateSignature("POST", "/v3/quotations", "1234567890", '{"data":{}}', "test_secret");
    expect(sig1).toBe(sig2);
    expect(sig1.length).toBe(64); // hex-encoded SHA256
  });

  test("verifyWebhookSignature validates correct signatures", () => {
    const secret = "test_webhook_secret";
    const timestamp = "1234567890";
    const path = "/api/webhooks/lalamove";
    const data = { orderId: "123", status: "COMPLETED" };

    // Manually compute expected signature
    const body = JSON.stringify(data);
    const raw = `${timestamp}\r\nPOST\r\n${path}\r\n\r\n${body}`;
    const crypto = require("node:crypto");
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");

    expect(verifyWebhookSignature(expected, secret, timestamp, path, data)).toBe(true);
  });

  test("verifyWebhookSignature rejects wrong signatures", () => {
    expect(verifyWebhookSignature("wrong", "secret", "123", "/path", {})).toBe(false);
  });

  test("verifyWebhookSignature returns false for empty inputs", () => {
    expect(verifyWebhookSignature("", "secret", "123", "/path", {})).toBe(false);
    expect(verifyWebhookSignature("sig", "", "123", "/path", {})).toBe(false);
  });
});
