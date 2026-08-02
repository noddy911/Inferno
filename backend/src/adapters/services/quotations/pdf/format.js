/** Shared display formatters for PDF templates. */

export const CURRENCY_SYMBOL = '₹';
export const CONTENT_X = 48; // left margin
export const CONTENT_WIDTH = 504; // A4 width − 2 × 48

/** Paise → "₹1,23,456.78" (Indian grouping). */
export function money(paise) {
  return `${CURRENCY_SYMBOL}${Number(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Date → "01 Aug 2026". */
export function date(d) {
  if (!d) return '—';
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
