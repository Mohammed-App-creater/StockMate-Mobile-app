// Small formatting helpers. Prices arrive from the API as strings (Decimal),
// so everything here tolerates string | number | null.

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

// Plain number with thousands separators (no currency symbol).
export function formatMoney(
  value: string | number | null | undefined,
  decimals = true
): string {
  return toNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
}

// "ETB 1,395.00" — the app's currency (Ethiopian Birr) per the design.
export const CURRENCY = 'ETB';
export function formatETB(
  value: string | number | null | undefined,
  decimals = true
): string {
  return `${CURRENCY} ${formatMoney(value, decimals)}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
