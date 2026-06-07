// Small formatting helpers. Prices arrive from the API as strings (Decimal),
// so everything here tolerates string | number | null.

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

// Money with thousands separators and 2 decimals. No hard-coded currency symbol
// (the accountant's currency is unknown); change the prefix here if needed.
export function formatMoney(value: string | number | null | undefined): string {
  return toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
