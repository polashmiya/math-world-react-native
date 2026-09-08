const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Converts ASCII digits in a string to Bangla digits. Leaves other glyphs alone. */
export function toBanglaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

export function localizeNumber(value: string | number, language: 'bn' | 'en'): string {
  return language === 'bn' ? toBanglaDigits(value) : String(value);
}

/** Formats a float without trailing zeros, rounding away binary noise. */
export function formatNumber(value: number, maxDecimals = 4): string {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return String(value);
  const rounded = Number(value.toFixed(maxDecimals));
  return String(rounded);
}

export function formatPercent(ratio: number, decimals = 0): string {
  return (ratio * 100).toFixed(decimals) + '%';
}

export function formatCurrencyBdt(amount: number): string {
  return '৳' + formatNumber(amount, 2);
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? singular + 's';
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

export function titleCase(input: string): string {
  return input
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
