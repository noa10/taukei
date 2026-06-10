import type { LalamovePriceBreakdown } from "./types";

export interface QuoteStopInput {
  latitude: number;
  longitude: number;
  address: string;
}

export interface NormalizedPriceBreakdown {
  base: string;
  total: string;
  currency: string;
  extraMileage?: string;
  surcharge?: string;
}

export function formatLalamoveCoordinate(value: number | string): string {
  const numericValue =
    typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(numericValue)) {
    throw new Error("Invalid coordinate");
  }
  return numericValue.toFixed(8);
}

export function moneyStringToCents(value: string): number {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid monetary amount: ${value}`);
  }
  return Math.round(amount * 100);
}

export function normalizePriceBreakdown(
  priceBreakdown: LalamovePriceBreakdown,
): NormalizedPriceBreakdown {
  return {
    base: priceBreakdown.base ?? priceBreakdown.total,
    total: priceBreakdown.total,
    currency: priceBreakdown.currency,
    ...(priceBreakdown.extraMileage
      ? { extraMileage: priceBreakdown.extraMileage }
      : {}),
    ...(priceBreakdown.surcharge
      ? { surcharge: priceBreakdown.surcharge }
      : {}),
  };
}
