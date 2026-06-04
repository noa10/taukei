import type { CartLineInput, Currency, MenuItemSnapshot, OrderTotals, PricedOrderLine } from "../types";

export interface PriceCartResult {
  lines: PricedOrderLine[];
  totals: OrderTotals;
  maxPrepBufferMinutes: number;
}

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

const MAX_REASONABLE_CENTS = 10_000_000;
const MAX_LINE_QUANTITY = 99;

function assertNonNegativeSafeCents(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_REASONABLE_CENTS) {
    throw new PricingError(`${name} must be a non-negative safe integer in cents.`);
  }
}

export function priceCartFromCatalog(cart: CartLineInput[], catalog: MenuItemSnapshot[], options: { deliveryFeeCents?: number; platformFeeCents?: number; currency?: Currency } = {}): PriceCartResult {
  if (cart.length === 0) {
    throw new PricingError("Cart must contain at least one item.");
  }

  const catalogById = new Map(catalog.map((item) => [item.id, item]));
  const quantities = new Map<string, number>();

  for (const line of cart) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0 || line.quantity > MAX_LINE_QUANTITY) {
      throw new PricingError(`Invalid quantity for menu item ${line.menuItemId}.`);
    }
    const combinedQuantity = (quantities.get(line.menuItemId) ?? 0) + line.quantity;
    if (combinedQuantity > MAX_LINE_QUANTITY) {
      throw new PricingError(`Invalid quantity for menu item ${line.menuItemId}.`);
    }
    quantities.set(line.menuItemId, combinedQuantity);
  }

  const currency = options.currency ?? "MYR";
  const pricedLines: PricedOrderLine[] = [];

  for (const [menuItemId, quantity] of quantities.entries()) {
    const item = catalogById.get(menuItemId);
    if (!item) {
      throw new PricingError(`Menu item ${menuItemId} was not found in the trusted catalog.`);
    }
    if (!item.isAvailable) {
      throw new PricingError(`Menu item ${item.name} is not available.`);
    }
    assertNonNegativeSafeCents(item.priceCents, `Price for ${item.name}`);
    if (item.currency !== currency) {
      throw new PricingError(`Menu item ${item.name} uses ${item.currency}, expected ${currency}.`);
    }
    pricedLines.push({
      menuItemId: item.id,
      nameSnapshot: item.name,
      unitPriceCents: item.priceCents,
      quantity,
      lineTotalCents: item.priceCents * quantity,
      isFragileSnapshot: item.isFragile,
      prepBufferMinutes: item.prepBufferMinutes
    });
  }

  const subtotalCents = pricedLines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  assertNonNegativeSafeCents(subtotalCents, "Subtotal");
  const deliveryFeeCents = options.deliveryFeeCents ?? 0;
  const platformFeeCents = options.platformFeeCents ?? 100;
  assertNonNegativeSafeCents(deliveryFeeCents, "Delivery fee");
  assertNonNegativeSafeCents(platformFeeCents, "Platform fee");
  const maxPrepBufferMinutes = Math.max(...pricedLines.map((line) => line.prepBufferMinutes));

  return {
    lines: pricedLines,
    totals: {
      subtotalCents,
      deliveryFeeCents,
      platformFeeCents,
      totalCents: subtotalCents + deliveryFeeCents + platformFeeCents,
      currency
    },
    maxPrepBufferMinutes
  };
}
