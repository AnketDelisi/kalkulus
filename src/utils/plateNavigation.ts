/**
 * Steps a Turkish license-plate province code ('01'..'81') by +1 or -1,
 * wrapping '81' <-> '01'.
 */
export function stepPlateCode(currentIlId: string, delta: 1 | -1): string {
  const num = parseInt(currentIlId, 10);
  if (Number.isNaN(num) || num < 1 || num > 81) return '01';
  const next = ((num - 1 + delta + 81) % 81) + 1;
  return String(next).padStart(2, '0');
}

/**
 * Normalizes Turkish characters for accent-insensitive quick-jump search.
 */
export function normalizeTurkishSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
    .trim();
}
