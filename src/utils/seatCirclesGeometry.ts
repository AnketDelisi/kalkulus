export const SEAT_OFFSETS_87: Record<string, [number, number]> = {
  '34-3': [-4, -44],
  '34-2': [16, -48],
  '34-1': [40, -50],
  '16-1': [-6, 4],
  '16-2': [6, -3],
  '35-1': [-14, 10],
  '35-2': [-12, -10],
  '06-2': [4, -4],
  '06-3': [-6, 0],
};

export const SEAT_OFFSETS_81: Record<string, [number, number]> = {
  '34': [16, -48],
  '35': [-14, 0],
};

export function getSeatGridCols(totalSeats: number): number {
  if (totalSeats <= 3) return Math.max(1, totalSeats);
  if (totalSeats === 4) return 2;
  if (totalSeats <= 6) return 3;
  if (totalSeats <= 12) return 4;
  if (totalSeats <= 15) return 5;
  if (totalSeats <= 40) return 6;
  return 12;
}

export function buildOrderedSeatColors(
  partySeats: Record<string, number>,
  partyVotes: Record<string, number>,
  partyColorMap: Record<string, string>
): string[] {
  const entries = Object.entries(partySeats)
    .filter(([, seats]) => seats > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return (partyVotes[b[0]] || 0) - (partyVotes[a[0]] || 0);
    });
  const colors: string[] = [];
  for (const [pid, seats] of entries) {
    const color = partyColorMap[pid] || '#64748b';
    for (let i = 0; i < seats; i++) {
      colors.push(color);
    }
  }
  return colors;
}

export interface SeatClusterLayout {
  leaderLine?: { x1: number; y1: number; x2: number; y2: number };
  dots: { x: number; y: number; r: number; color: string }[];
}

/**
 * Computes circular D'Hondt seat dot grid coordinates around a geographic centroid.
 */
export function computeSeatClusterLayout(
  unitId: string,
  centroid: [number, number] | null,
  partySeats: Record<string, number>,
  partyVotes: Record<string, number>,
  partyColorMap: Record<string, string>,
  offsetMap: Record<string, [number, number]>,
  showCalloutLine: boolean,
  scaleFactor = 1
): SeatClusterLayout | null {
  if (!centroid || Number.isNaN(centroid[0]) || Number.isNaN(centroid[1])) {
    return null;
  }
  const colors = buildOrderedSeatColors(partySeats, partyVotes, partyColorMap);
  if (colors.length === 0) return null;

  const [rawOffX, rawOffY] = offsetMap[unitId] || [0, 0];
  const offX = rawOffX * scaleFactor;
  const offY = rawOffY * scaleFactor;
  const cx = centroid[0] + offX;
  const cy = centroid[1] + offY;
  const cols = getSeatGridCols(colors.length);
  const rows = Math.ceil(colors.length / cols);
  const step = 5.6 * scaleFactor;
  const radius = 2.4 * scaleFactor;
  const startX = cx - ((cols - 1) * step) / 2;
  const startY = cy - ((rows - 1) * step) / 2;
  const clusterBottomY = cy + ((rows - 1) * step) / 2 + 4 * scaleFactor;

  const dots = colors.map((color, idx) => {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    return {
      x: startX + c * step,
      y: startY + r * step,
      r: radius,
      color,
    };
  });

  return {
    leaderLine: showCalloutLine
      ? { x1: centroid[0], y1: centroid[1], x2: cx, y2: clusterBottomY }
      : undefined,
    dots,
  };
}
