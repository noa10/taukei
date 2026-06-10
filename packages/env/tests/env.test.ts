import { expect, test, describe } from "bun:test";
import { loadTaukeiEnv, describeIntegrationSafety } from "../src/index";

describe("loadTaukeiEnv", () => {
  test("defaults to sandbox mode", () => {
    const env = loadTaukeiEnv({
      STRIPE_SECRET_KEY: "sk_test_x",
      LALAMOVE_API_KEY: "test_key",
      LALAMOVE_API_SECRET: "test_secret",
    });
    expect(env.stripeMode).toBe("sandbox");
    expect(env.lalamoveMode).toBe("sandbox");
  });

  test("reads sandbox mode explicitly", () => {
    const env = loadTaukeiEnv({
      TAUKEI_STRIPE_MODE: "sandbox",
      TAUKEI_LALAMOVE_MODE: "sandbox",
      STRIPE_SECRET_KEY: "sk_test_x",
      LALAMOVE_API_KEY: "key",
      LALAMOVE_API_SECRET: "secret",
    });
    expect(env.stripeMode).toBe("sandbox");
    expect(env.lalamoveMode).toBe("sandbox");
  });

  test("reads live mode with valid keys", () => {
    const env = loadTaukeiEnv({
      TAUKEI_STRIPE_MODE: "live",
      TAUKEI_LALAMOVE_MODE: "live",
      STRIPE_SECRET_KEY: "sk_live_x",
      LALAMOVE_API_KEY: "key",
      LALAMOVE_API_SECRET: "secret",
    });
    expect(env.stripeMode).toBe("live");
    expect(env.lalamoveMode).toBe("live");
  });

  test("rejects live Stripe without sk_live_ prefix", () => {
    expect(() =>
      loadTaukeiEnv({
        TAUKEI_STRIPE_MODE: "live",
        STRIPE_SECRET_KEY: "sk_test_x",
      }),
    ).toThrow("sk_live_ prefix");
  });

  test("rejects invalid mode values", () => {
    expect(() =>
      loadTaukeiEnv({
        TAUKEI_STRIPE_MODE: "fake",
      }),
    ).toThrow("must be one of: sandbox, live");
  });

  test("reads Lalamove-specific env vars", () => {
    const env = loadTaukeiEnv({
      STRIPE_SECRET_KEY: "sk_test_x",
      LALAMOVE_API_KEY: "my_key",
      LALAMOVE_API_SECRET: "my_secret",
      LALAMOVE_MARKET: "MY",
      LALAMOVE_DEFAULT_SERVICE_TYPE: "CAR",
    });
    expect(env.lalamoveMarket).toBe("MY");
    expect(env.lalamoveDefaultServiceType).toBe("CAR");
    expect(env.lalamoveApiKey).toBe("my_key");
    expect(env.lalamoveApiSecret).toBe("my_secret");
  });

  test("describeIntegrationSafety distinguishes sandbox vs live", () => {
    const sandbox = describeIntegrationSafety(
      loadTaukeiEnv({ TAUKEI_STRIPE_MODE: "sandbox", TAUKEI_LALAMOVE_MODE: "sandbox", STRIPE_SECRET_KEY: "sk_test_x" }),
    );
    expect(sandbox).toContain("Sandbox");

    const live = describeIntegrationSafety(
      loadTaukeiEnv({ TAUKEI_STRIPE_MODE: "live", TAUKEI_LALAMOVE_MODE: "live", STRIPE_SECRET_KEY: "sk_live_x", LALAMOVE_API_KEY: "k", LALAMOVE_API_SECRET: "s" }),
    );
    expect(live).toContain("Live integrations active");
  });
});
