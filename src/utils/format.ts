import { Language } from '../types/election';

const trInt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const enInt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

const trPctCache: Record<number, Intl.NumberFormat> = {};
const enPctCache: Record<number, Intl.NumberFormat> = {};

function getPctFormatter(lang: Language, digits: number): Intl.NumberFormat {
  const cache = lang === 'tr' ? trPctCache : enPctCache;
  if (!cache[digits]) {
    cache[digits] = new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }
  return cache[digits];
}

/**
 * Formats an integer using locale-appropriate grouping (1.234.567 in TR, 1,234,567 in EN).
 */
export function formatInt(value: number, lang: Language): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  return (lang === 'tr' ? trInt : enInt).format(safe);
}

/**
 * Formats a percentage using locale-appropriate placement and decimal separator (%35,6 in TR, 35.6% in EN).
 */
export function formatPct(value: number, lang: Language, digits = 1): string {
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = getPctFormatter(lang, digits).format(safe);
  return lang === 'tr' ? `%${formatted}` : `${formatted}%`;
}
