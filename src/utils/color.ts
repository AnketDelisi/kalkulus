function parseHexRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return [r, g, b];
  }
  return null;
}

export function getRelativeLuminance(hex: string): number {
  const rgb = parseHexRgb(hex);
  if (!rgb) return 0.5;
  const linear = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const lA = getRelativeLuminance(hexA);
  const lB = getRelativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Picks whichever ink (`#090A0F` dark or `#FFFFFF` light) gives the higher WCAG contrast
 * ratio over the supplied background hex color.
 */
export function getContrastTextColor(bgHex: string): '#090A0F' | '#FFFFFF' {
  const darkContrast = getContrastRatio(bgHex, '#090A0F');
  const lightContrast = getContrastRatio(bgHex, '#FFFFFF');
  return darkContrast >= lightContrast ? '#090A0F' : '#FFFFFF';
}

export function interpolateHex(hexA: string, hexB: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const a = parseHexRgb(hexA) ?? [241, 245, 249];
  const b = parseHexRgb(hexB) ?? [9, 10, 15];
  const r = Math.round(a[0] + (b[0] - a[0]) * clamped);
  const g = Math.round(a[1] + (b[1] - a[1]) * clamped);
  const bl = Math.round(a[2] + (b[2] - a[2]) * clamped);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1).toUpperCase()}`;
}

/**
 * Battleground competitiveness scale: hot crimson (<2% toss-up) -> amber (2-5%)
 * -> warm gold (5-10%) -> cool slate (10-20%) -> deep slate (>20% safe).
 */
export function getBattlegroundMarginColor(marginPct: number): string {
  const m = Math.max(0, marginPct);
  if (m < 2) return interpolateHex('#DC2626', '#EA580C', m / 2);
  if (m < 5) return interpolateHex('#F59E0B', '#FACC15', (m - 2) / 3);
  if (m < 10) return interpolateHex('#FDE047', '#94A3B8', (m - 5) / 5);
  if (m < 20) return interpolateHex('#64748B', '#334155', (m - 10) / 10);
  return '#1E293B';
}

/**
 * Diverging swing scale centered at 0pp (#F1F5F9): negative -> crimson, positive -> emerald.
 */
export function getDivergingSwingColor(deltaPp: number, maxAbs = 10): string {
  if (Math.abs(deltaPp) < 0.15) return '#F1F5F9';
  const t = Math.min(1, Math.abs(deltaPp) / Math.max(1, maxAbs));
  return deltaPp > 0
    ? interpolateHex('#DCFCE7', '#059669', t)
    : interpolateHex('#FEE2E2', '#DC2626', t);
}

/**
 * Single-party/candidate sequential vote share heatmap (0% -> #F1F5F9, 45%+ -> full partyHex).
 */
export function getPartyHeatmapColor(partyHex: string, sharePct: number, maxShare = 45): string {
  const t = Math.max(0, Math.min(1, sharePct / Math.max(1, maxShare)));
  if (t <= 0.01) return '#F1F5F9';
  return interpolateHex('#F1F5F9', partyHex, Math.pow(t, 0.78));
}

export interface PartyBoxTheme {
  bg: string;
  fg: string;
  border: string;
}

/**
 * Dynamic infographic box styling:
 * - YENİ: white background with red logo & text
 * - İYİ: party color background with yellow logo & text
 * - Others: party color background with WCAG-contrast white/dark ink
 */
export function getDynamicPartyBoxTheme(_partyId: string, partyColor: string): PartyBoxTheme {
  return { bg: partyColor, fg: '#FFFFFF', border: partyColor };
}
