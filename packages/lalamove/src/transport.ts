import type { LalamoveApiResponse } from "./types";
import { LalamoveApiError, LalamoveRateLimitError, LalamoveAuthError } from "./types";
import { buildAuthHeaders, type HttpMethod } from "./auth";

function sanitizeForLog(value: string): string {
  return value.replace(/\n|\r/g, "");
}

export interface LalamoveTransportConfig {
  apiKey: string;
  apiSecret: string;
  market: string;
  baseUrl: string;
}

const LALAMOVE_ENDPOINTS = {
  sandbox: "https://rest.sandbox.lalamove.com",
  production: "https://rest.lalamove.com",
} as const;

export type LalamoveEnv = "sandbox" | "production";

export function resolveBaseUrl(env: LalamoveEnv, override?: string): string {
  if (override) return override;
  return LALAMOVE_ENDPOINTS[env];
}

export class LalamoveTransport {
  private readonly config: LalamoveTransportConfig;

  constructor(config: LalamoveTransportConfig) {
    this.config = config;
  }

  async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    retryCount = 0,
  ): Promise<T> {
    const bodyString = body ? JSON.stringify(body) : undefined;

    // Lalamove v3 auth signature must use the path without query parameters
    const authPath = path.split("?")[0]!;

    const headers = buildAuthHeaders(
      this.config.apiKey,
      this.config.apiSecret,
      this.config.market,
      method,
      authPath,
      bodyString,
    );

    const url = `${this.config.baseUrl}${path}`;

    const safePath = sanitizeForLog(path);
    console.log("[Lalamove]", method, safePath);

    const response = await fetch(url, {
      method,
      headers,
      body: bodyString,
    });

    if (response.ok) {
      const json = (await response.json()) as LalamoveApiResponse<T>;
      return json.data;
    }

    const errorBody = await response.json().catch(() => ({}));

    switch (response.status) {
      case 401:
        throw new LalamoveAuthError();

      case 429: {
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise((r) => setTimeout(r, delay));
          return this.request<T>(method, path, body, retryCount + 1);
        }
        throw new LalamoveRateLimitError();
      }

      default: {
        const message =
          (errorBody as { message?: string }).message ??
          `Lalamove API error: ${response.status}`;
        throw new LalamoveApiError(message, response.status, errorBody);
      }
    }
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async del<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}

export function createTransport(
  config: LalamoveTransportConfig,
): LalamoveTransport {
  return new LalamoveTransport(config);
}
