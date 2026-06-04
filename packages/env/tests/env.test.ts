import { expect, test } from "bun:test";
import { describeIntegrationSafety, loadTaukeiEnv } from "../src";

test("defaults to safe fake integrations", () => {
  const env = loadTaukeiEnv({});
  expect(env.appName).toBe("Taukei");
  expect(env.stripeMode).toBe("fake");
  expect(env.lalamoveMode).toBe("fake");
  expect(describeIntegrationSafety(env)).toContain("no real payment capture");
});

test("rejects unknown integration modes", () => {
  expect(() => loadTaukeiEnv({ TAUKEI_STRIPE_MODE: "production" })).toThrow("TAUKEI_STRIPE_MODE");
});

test("fails closed for Stripe live mode without explicit production authorization", () => {
  expect(() => loadTaukeiEnv({ TAUKEI_STRIPE_MODE: "live", STRIPE_SECRET_KEY: "sk_live_demo" })).toThrow("Stripe live mode is disabled");
});

test("fails closed for Stripe live mode without live secret", () => {
  expect(() => loadTaukeiEnv({ TAUKEI_STRIPE_MODE: "live", TAUKEI_ALLOW_LIVE_INTEGRATIONS: "true", STRIPE_SECRET_KEY: "sk_test_demo" })).toThrow("sk_live_");
});

test("fails closed for Lalamove live mode without credentials", () => {
  expect(() => loadTaukeiEnv({ TAUKEI_LALAMOVE_MODE: "live", TAUKEI_ALLOW_LIVE_INTEGRATIONS: "true" })).toThrow("LALAMOVE_API_KEY");
});
