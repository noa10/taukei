export const MAX_REMARKS_LEN = 1500;

export interface BuildLalamoveRemarksInput {
  displayCode?: string | null;
  orderId: string;
  orderRef?: string | null;
  existingNotes?: string | null;
}

export function buildLalamoveRemarks(input: BuildLalamoveRemarksInput): string {
  const { displayCode, orderId, orderRef, existingNotes } = input;

  const parts: string[] = [];
  if (displayCode) parts.push(`Order ${displayCode}`);
  parts.push(`ID: ${orderId.slice(0, 8)}`);
  if (orderRef) parts.push(`Ref: ${orderRef}`);

  const header = parts.join(" | ");
  const notes = (existingNotes ?? "").trim();
  const full = notes ? `${header}\n${notes}` : header;

  if (full.length <= MAX_REMARKS_LEN) return full;
  return full.slice(0, MAX_REMARKS_LEN - 1) + "…";
}
