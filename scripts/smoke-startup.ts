import { existsSync } from "node:fs";
import { loadTaukeiEnv, describeIntegrationSafety } from "@taukei/env";

const requiredFiles = [
  "apps/web/app/layout.tsx",
  "apps/web/app/page.tsx",
  "apps/web/app/manifest.ts",
  "apps/web/public/taukelogo.png",
  "packages/env/src/index.ts",
  ".env.example"
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length > 0) {
  throw new Error(`Taukei startup smoke check failed; missing files: ${missing.join(", ")}`);
}

const env = loadTaukeiEnv({
  NEXT_PUBLIC_APP_NAME: "Taukei",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  TAUKEI_STRIPE_MODE: "fake",
  TAUKEI_LALAMOVE_MODE: "fake"
});

console.log("Taukei startup smoke check passed.");
console.log(describeIntegrationSafety(env));
