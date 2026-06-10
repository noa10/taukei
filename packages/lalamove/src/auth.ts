import crypto from "node:crypto";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * Generate HMAC-SHA256 signature for Lalamove v3 API.
 *
 * v3 format: `{timestamp}\r\n{method}\r\n{path}\r\n\r\n{body}`
 */
export function generateSignature(
  method: HttpMethod,
  path: string,
  timestamp: string,
  body: string,
  secret: string,
): string {
  const raw = body
    ? `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`
    : `${timestamp}\r\n${method}\r\n${path}\r\n\r\n`;

  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}

/**
 * Build authentication headers for Lalamove v3 API.
 */
export function buildAuthHeaders(
  apiKey: string,
  apiSecret: string,
  market: string,
  method: HttpMethod,
  path: string,
  body?: string,
): Record<string, string> {
  const timestamp = Date.now().toString();
  const signature = generateSignature(
    method,
    path,
    timestamp,
    body ?? "",
    apiSecret,
  );

  return {
    Authorization: `hmac ${apiKey}:${timestamp}:${signature}`,
    Market: market,
    "Request-ID": crypto.randomUUID(),
    "Content-Type": "application/json",
  };
}

/**
 * Verify a webhook signature from Lalamove v3.
 *
 * Per Lalamove v3 spec, the signature is HMAC-SHA256 over:
 *   `${timestamp}\r\nPOST\r\n${path}\r\n\r\n${JSON.stringify(data)}`
 */
export function verifyWebhookSignature(
  signature: string,
  secret: string,
  timestamp: string | number,
  path: string,
  data: unknown,
): boolean {
  if (!signature || !secret) return false;
  const body = JSON.stringify(data ?? {});
  const raw = `${timestamp}\r\nPOST\r\n${path}\r\n\r\n${body}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(raw)
    .digest("hex");
  if (signature.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}
