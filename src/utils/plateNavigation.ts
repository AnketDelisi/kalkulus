/**
 * Steps a Turkish license-plate province code ('01'..maxPlate) by +1 or -1,
 * wrapping around [1, maxPlate] (e.g. 79 for 1995, 80 for 1999, 81 otherwise).
 */
export function stepPlateCode(currentIlId: string, delta: 1 | -1, maxPlate = 81): string {
  const cap = Math.max(1, maxPlate);
  const num = parseInt(currentIlId, 10);
  if (Number.isNaN(num) || num < 1 || num > cap) return '01';
  const next = ((num - 1 + delta + cap) % cap) + 1;
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
