export const PARLIAMENT_SPECTRUM_ORDER = [
  'TIP',
  'DEM',
  'YENI',
  'CHP',
  'IYI',
  'SAADET',
  'ZP',
  'A',
  'AKP',
  'MHP',
  'YRP',
  'BBP',
];

export interface HemicycleSeatGroupInput {
  id: string;
  label: string;
  color: string;
  seats: number;
}

export interface HemicycleSeatDot {
  x: number;
  y: number;
  r: number;
  angle: number;
  groupId: string;
  label: string;
  color: string;
}

export interface HemicycleGeometryOptions {
  cx?: number;
  cy?: number;
  rMin?: number;
  rMax?: number;
  rows?: number;
  totalSeats?: number;
}

/**
 * Computes Wikimedia/ParliamentDiagram-style concentric semicircular dot coordinates
 * with flat horizontal bottom baseline and radial wedge sorting.
 */
export function computeHemicycleSeats(
  groups: HemicycleSeatGroupInput[],
  options: HemicycleGeometryOptions = {}
): HemicycleSeatDot[] {
  const {
    cx = 210,
    cy = 195,
    rMin = 76,
    rMax = 186,
    rows = 14,
    totalSeats: explicitTotal,
  } = options;

  const summedSeats = groups.reduce((acc, g) => acc + Math.max(0, g.seats), 0);
  const totalSeats = Math.max(1, explicitTotal ?? (summedSeats || 600));
  const effRows = Math.max(2, Math.min(rows, totalSeats));

  const radii = Array.from(
    { length: effRows },
    (_, i) => rMin + ((rMax - rMin) * i) / (effRows - 1)
  );
  const sumRadii = radii.reduce((a, b) => a + b, 0);

  // Largest-remainder apportionment across concentric arcs
  const quotas = radii.map((r) => (r / sumRadii) * totalSeats);
  const rowCounts = quotas.map((q) => Math.floor(q));
  let remainder = totalSeats - rowCounts.reduce((a, b) => a + b, 0);
  const byFrac = quotas
    .map((q, idx) => ({ idx, frac: q - Math.floor(q) }))
    .sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < remainder; i++) {
    rowCounts[byFrac[i % byFrac.length].idx] += 1;
  }

  const rowStep = (rMax - rMin) / Math.max(1, effRows - 1);
  const outerSpacing = (Math.PI * rMax) / Math.max(1, (rowCounts[effRows - 1] || 1) - 1);
  const dotRadius = Math.max(1.8, Math.min(rowStep * 0.41, outerSpacing * 0.42));

  const rawCoords: { x: number; y: number; radius: number; angle: number }[] = [];
  radii.forEach((r, rowIdx) => {
    const count = rowCounts[rowIdx];
    for (let j = 0; j < count; j++) {
      // Align endpoints along y = cy so both left and right base edges lie horizontally flat
      const theta = count > 1 ? Math.PI - (j * Math.PI) / (count - 1) : Math.PI / 2;
      const x = cx + r * Math.cos(theta);
      const y = cy - r * Math.sin(theta);
      rawCoords.push({ x, y, radius: r, angle: theta });
    }
  });

  // Sort left-to-right by radial angle, with outer-to-inner tie-breaking for crisp wedge seams
  rawCoords.sort((a, b) => {
    const diff = b.angle - a.angle;
    if (Math.abs(diff) > 1e-6) return diff;
    return b.radius - a.radius;
  });

  const orderedGroups = [...groups]
    .filter((g) => g.seats > 0)
    .sort((a, b) => {
      const idxA = PARLIAMENT_SPECTRUM_ORDER.indexOf(a.id);
      const idxB = PARLIAMENT_SPECTRUM_ORDER.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.seats - a.seats;
    });

  const expandedSeats: { groupId: string; label: string; color: string }[] = [];
  for (const g of orderedGroups) {
    for (let i = 0; i < g.seats; i++) {
      expandedSeats.push({ groupId: g.id, label: g.label, color: g.color });
    }
  }

  return rawCoords.map((pt, idx) => ({
    x: pt.x,
    y: pt.y,
    r: dotRadius,
    angle: pt.angle,
    groupId: expandedSeats[idx]?.groupId || '',
    label: expandedSeats[idx]?.label || '',
    color: expandedSeats[idx]?.color || '#D4D6DC',
  }));
}
