import type { GeoFeature } from '../data/geoCache';

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

export interface SeatLayoutConfig {
  scale: number;
  offsetMap: Record<string, [number, number]>;
}

/**
 * Legacy helper preserved for backwards compatibility; scales clusters softly
 * when > 87 districts while collision layout handles all exact offsets.
 */
export function getSeatLayoutConfigForDistricts(districtCount: number): SeatLayoutConfig {
  if (districtCount <= 87) {
    return { scale: 1, offsetMap: SEAT_OFFSETS_87 };
  }
  const scale = Number(Math.max(0.75, Math.min(0.92, Math.sqrt(87 / districtCount))).toFixed(3));
  return { scale, offsetMap: SEAT_OFFSETS_87 };
}

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
 * Computes circular D'Hondt seat dot grid coordinates around a geographic anchor.
 */
export function computeSeatClusterLayout(
  unitId: string,
  anchor: [number, number] | null,
  partySeats: Record<string, number>,
  partyVotes: Record<string, number>,
  partyColorMap: Record<string, string>,
  offsetMap: Record<string, [number, number]>,
  showCalloutLine: boolean,
  scaleFactor = 1
): SeatClusterLayout | null {
  if (!anchor || Number.isNaN(anchor[0]) || Number.isNaN(anchor[1])) {
    return null;
  }
  const colors = buildOrderedSeatColors(partySeats, partyVotes, partyColorMap);
  if (colors.length === 0) return null;

  const [rawOffX, rawOffY] = offsetMap[unitId] || [0, 0];
  const cx = anchor[0] + rawOffX * scaleFactor;
  const cy = anchor[1] + rawOffY * scaleFactor;
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
      ? { x1: anchor[0], y1: anchor[1], x2: cx, y2: clusterBottomY }
      : undefined,
    dots,
  };
}

// =========================================================================
// Visual Pole of Inaccessibility (Polylabel 2D) & Collision-Free Map Layout
// =========================================================================

type Pt2D = [number, number];
type Ring2D = Pt2D[];

function ringSignedArea2D(ring: Ring2D): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return a * 0.5;
}

function segDistSq(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  let x = ax;
  let y = ay;
  let dx = bx - x;
  let dy = by - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = bx;
      y = by;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = px - x;
  dy = py - y;
  return dx * dx + dy * dy;
}

function pointToPolygonDist(x: number, y: number, rings: Ring2D[]): number {
  let inside = false;
  let minDistSq = Infinity;

  for (let rIdx = 0; rIdx < rings.length; rIdx++) {
    const ring = rings[rIdx];
    for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
      const a = ring[i];
      const b = ring[j];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) {
        inside = !inside;
      }
      const dSq = segDistSq(x, y, a[0], a[1], b[0], b[1]);
      if (dSq < minDistSq) minDistSq = dSq;
    }
  }

  return (inside ? 1 : -1) * Math.sqrt(minDistSq);
}

function ringCentroidCell2D(rings: Ring2D[]): { x: number; y: number; h: number; d: number; max: number } {
  let area = 0;
  let x = 0;
  let y = 0;
  const pts = rings[0];
  for (let i = 0, len = pts.length, j = len - 1; i < len; j = i++) {
    const a = pts[i];
    const b = pts[j];
    const f = a[0] * b[1] - b[0] * a[1];
    x += (a[0] + b[0]) * f;
    y += (a[1] + b[1]) * f;
    area += f * 3;
  }
  if (area === 0) {
    return { x: pts[0][0], y: pts[0][1], h: 0, d: pointToPolygonDist(pts[0][0], pts[0][1], rings), max: 0 };
  }
  const cx = x / area;
  const cy = y / area;
  const d = pointToPolygonDist(cx, cy, rings);
  return { x: cx, y: cy, h: 0, d, max: d };
}

/**
 * Quadtree Pole of Inaccessibility solver finding the point strictly inside a
 * 2D projected polygon (respecting holes) furthest from every boundary edge.
 */
export function computePolylabel2D(rings: Ring2D[], precision = 0.75): Pt2D {
  if (!rings.length || rings[0].length === 0) return [0, 0];

  const outer = rings[0];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of outer) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const cellSize = Math.min(width, height);
  if (!(cellSize > 0)) return [minX, minY];

  interface PolyCell {
    x: number;
    y: number;
    h: number;
    d: number;
    max: number;
  }

  const makeCell = (cx: number, cy: number, h: number): PolyCell => {
    const d = pointToPolygonDist(cx, cy, rings);
    return { x: cx, y: cy, h, d, max: d + h * Math.SQRT2 };
  };

  let h = cellSize * 0.5;
  const queue: PolyCell[] = [];
  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      queue.push(makeCell(x + h, y + h, h));
    }
  }

  let bestCell = ringCentroidCell2D(rings);
  const bboxCell = makeCell(minX + width * 0.5, minY + height * 0.5, 0);
  if (bboxCell.d > bestCell.d) bestCell = bboxCell;

  // Binary max-heap helpers on `max`
  const pushHeap = (cell: PolyCell) => {
    queue.push(cell);
    let idx = queue.length - 1;
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (queue[parent].max >= queue[idx].max) break;
      const tmp = queue[parent];
      queue[parent] = queue[idx];
      queue[idx] = tmp;
      idx = parent;
    }
  };
  const popHeap = (): PolyCell | undefined => {
    if (queue.length === 0) return undefined;
    const top = queue[0];
    const last = queue.pop()!;
    if (queue.length > 0) {
      queue[0] = last;
      let idx = 0;
      const len = queue.length;
      while (true) {
        let largest = idx;
        const l = 2 * idx + 1;
        const r = 2 * idx + 2;
        if (l < len && queue[l].max > queue[largest].max) largest = l;
        if (r < len && queue[r].max > queue[largest].max) largest = r;
        if (largest === idx) break;
        const tmp = queue[idx];
        queue[idx] = queue[largest];
        queue[largest] = tmp;
        idx = largest;
      }
    }
    return top;
  };

  queue.sort((a, b) => b.max - a.max);

  let iters = 0;
  while (queue.length > 0 && iters++ < 2500) {
    const cell = popHeap()!;
    if (cell.d > bestCell.d) bestCell = cell;
    if (cell.max - bestCell.d <= precision) continue;

    h = cell.h * 0.5;
    if (h < 1e-4) continue;
    pushHeap(makeCell(cell.x - h, cell.y - h, h));
    pushHeap(makeCell(cell.x + h, cell.y - h, h));
    pushHeap(makeCell(cell.x - h, cell.y + h, h));
    pushHeap(makeCell(cell.x + h, cell.y + h, h));
  }

  return [bestCell.x, bestCell.y];
}

function projectRing2D(
  ring: ReadonlyArray<ReadonlyArray<number>>,
  projection: (pt: [number, number]) => [number, number] | null
): Ring2D {
  const out: Ring2D = [];
  for (let i = 0; i < ring.length; i++) {
    const projected = projection([ring[i][0], ring[i][1]]);
    if (projected && Number.isFinite(projected[0]) && Number.isFinite(projected[1])) {
      out.push(projected);
    }
  }
  return out;
}

/**
 * Projects a GeoJSON Polygon/MultiPolygon feature and computes the Polylabel
 * interior visual center of its primary landmass.
 */
export function projectFeaturePolylabel(
  feature: GeoFeature,
  projection: (pt: [number, number]) => [number, number] | null
): Pt2D | null {
  const geom = feature.geometry as { type?: string; coordinates?: unknown } | null;
  if (!geom || !geom.coordinates) return null;

  const rawPolys = (
    geom.type === 'Polygon'
      ? [geom.coordinates]
      : geom.type === 'MultiPolygon'
      ? geom.coordinates
      : []
  ) as number[][][][];

  let bestRings: Ring2D[] | null = null;
  let bestArea = -1;
  for (const poly of rawPolys) {
    if (!poly || poly.length === 0) continue;
    const projOuter = projectRing2D(poly[0], projection);
    if (projOuter.length < 3) continue;
    const area = Math.abs(ringSignedArea2D(projOuter));
    if (area > bestArea) {
      bestArea = area;
      const projRings: Ring2D[] = [projOuter];
      for (let h = 1; h < poly.length; h++) {
        const projHole = projectRing2D(poly[h], projection);
        if (projHole.length >= 3) projRings.push(projHole);
      }
      bestRings = projRings;
    }
  }

  if (!bestRings) return null;
  return computePolylabel2D(bestRings, 0.75);
}

export interface SeatLayoutUnitInput {
  id: string;
  ilId: string;
  feature: GeoFeature;
  partySeats: Record<string, number>;
  partyVotes: Record<string, number>;
}

export interface SeatClusterResult {
  id: string;
  anchor: [number, number];
  cx: number;
  cy: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  leaderLine?: { x1: number; y1: number; x2: number; y2: number };
  dots: { x: number; y: number; r: number; color: string }[];
}

export interface IstanbulCalloutCell {
  id: string;
  shortLabel: string;
  mpCount: number;
  x: number;
  y: number;
  w: number;
  h: number;
  dots: { x: number; y: number; r: number; color: string }[];
}

export interface IstanbulCalloutPanel {
  x: number;
  y: number;
  w: number;
  h: number;
  headerH: number;
  districtCount: number;
  totalMps: number;
  stem: { x1: number; y1: number; x2: number; y2: number };
  cells: IstanbulCalloutCell[];
}

export interface MapSeatLayoutResult {
  scale: number;
  clusters: SeatClusterResult[];
  istanbulPanel: IstanbulCalloutPanel | null;
}

function buildIstanbulCalloutPanel(
  istanbulUnits: SeatLayoutUnitInput[],
  anchors: Map<string, Pt2D>,
  mapBounds: { minX: number; minY: number; maxX: number; maxY: number },
  viewportBox: { x: number; y: number; w: number; h: number },
  partyColorMap: Record<string, string>
): IstanbulCalloutPanel {
  const sorted = [...istanbulUnits].sort((a, b) => {
    const na = parseInt(a.id.split('-')[1] || '0', 10);
    const nb = parseInt(b.id.split('-')[1] || '0', 10);
    return na - nb;
  });

  const tW = Math.max(120, mapBounds.maxX - mapBounds.minX);
  const tH = Math.max(60, mapBounds.maxY - mapBounds.minY);
  const cols = 3;
  const rows = Math.ceil(sorted.length / cols);
  const scaleP = tW / 936;

  // Land-free Black Sea water pocket between Kırklareli (<= 0.130*tW) and Bartın (>= 0.335*tW),
  // strictly above İstanbul (>= 0.083*tH) and Zonguldak (>= 0.086*tH).
  const panelW = tW * 0.182;
  const headerH = Math.max(7.5, Math.min(13, 12.5 * scaleP));
  const rowH = Math.max(8.5, Math.min(14.8, (44 * scaleP) / Math.max(2, rows)));
  const padX = Math.max(2, 4 * scaleP);
  const padY = Math.max(1.5, 2.5 * scaleP);
  const panelH = headerH + rows * rowH + padY * 2;

  const rawX = mapBounds.minX + tW * 0.145;
  const x = Math.max(viewportBox.x + 2, Math.min(viewportBox.x + viewportBox.w - panelW - 2, rawX));
  // Anchor bottom edge strictly above İstanbul/Zonguldak northern coastline, clamped inside viewportBox
  const idealBottom = mapBounds.minY + tH * 0.078;
  const y = Math.max(viewportBox.y + 3, Math.min(idealBottom - panelH, viewportBox.y + viewportBox.h - panelH - 2));

  // Center of İstanbul for a clean stem pointer
  let sumX = 0;
  let sumY = 0;
  let cnt = 0;
  for (const u of sorted) {
    const pt = anchors.get(u.id);
    if (pt) {
      sumX += pt[0];
      sumY += pt[1];
      cnt++;
    }
  }
  const targetX = cnt > 0 ? sumX / cnt : x + panelW * 0.35;
  const targetY = cnt > 0 ? sumY / cnt : y + panelH + 14;

  const innerW = panelW - padX * 2;
  const cellW = innerW / cols;
  let totalMps = 0;

  const cells: IstanbulCalloutCell[] = sorted.map((u, idx) => {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    const cx = x + padX + c * cellW;
    const cy = y + headerH + padY + r * rowH;

    const colors = buildOrderedSeatColors(u.partySeats, u.partyVotes, partyColorMap);
    totalMps += colors.length;
    const suffix = u.id.split('-')[1] || u.id;
    const labelW = Math.max(13, cellW * 0.26);
    const dotsAreaX = cx + labelW;
    const dotsAreaW = Math.max(10, cellW - labelW - 2);
    const dotCols = colors.length <= 3 ? Math.max(1, colors.length) : 3;
    const dotRows = Math.ceil(colors.length / dotCols);
    const maxStepX = dotsAreaW / Math.max(1, dotCols);
    const maxStepY = (rowH - 2) / Math.max(1, dotRows);
    const step = Math.min(4.6, maxStepX, maxStepY);
    const dotR = Math.max(1.15, Math.min(2.05, step * 0.42));

    const gridW = (Math.min(dotCols, colors.length) - 1) * step;
    const gridH = (dotRows - 1) * step;
    const startX = dotsAreaX + Math.max(dotR, (dotsAreaW - gridW) * 0.35);
    const startY = cy + rowH * 0.5 - gridH * 0.5;

    const dots = colors.map((color, dIdx) => {
      const dr = Math.floor(dIdx / dotCols);
      const dc = dIdx % dotCols;
      return {
        x: startX + dc * step,
        y: startY + dr * step,
        r: dotR,
        color,
      };
    });

    return {
      id: u.id,
      shortLabel: `${suffix}.`,
      mpCount: colors.length,
      x: cx,
      y: cy,
      w: cellW - 1.5,
      h: rowH - 1.5,
      dots,
    };
  });

  return {
    x,
    y,
    w: panelW,
    h: panelH,
    headerH,
    districtCount: sorted.length,
    totalMps,
    stem: {
      x1: Math.max(x + 12, Math.min(x + panelW - 12, targetX)),
      y1: y + panelH,
      x2: targetX,
      y2: targetY,
    },
    cells,
  };
}

/**
 * Computes collision-free seat circle clusters across all parliamentary districts/provinces
 * using visual Pole of Inaccessibility anchors, deterministic AABB repulsion, and a clean
 * Black Sea editorial callout panel whenever İstanbul has > 3 electoral regions (1987, 1991).
 */
export function computeMapSeatLayouts(params: {
  units: SeatLayoutUnitInput[];
  projection: (pt: [number, number]) => [number, number] | null;
  viewportBox: { x: number; y: number; w: number; h: number };
  partyColorMap: Record<string, string>;
  isDistrictLayer: boolean;
}): MapSeatLayoutResult {
  const { units, projection, viewportBox, partyColorMap, isDistrictLayer } = params;
  if (units.length === 0) {
    return { scale: 1, clusters: [], istanbulPanel: null };
  }

  // Project bounds of the full map + Polylabel anchors in one pass
  let mapMinX = Infinity;
  let mapMinY = Infinity;
  let mapMaxX = -Infinity;
  let mapMaxY = -Infinity;
  const anchors = new Map<string, Pt2D>();

  for (const u of units) {
    const geom = u.feature.geometry as { type?: string; coordinates?: unknown } | null;
    const rawPolys = (
      geom?.type === 'Polygon'
        ? [geom.coordinates]
        : geom?.type === 'MultiPolygon'
        ? geom.coordinates
        : []
    ) as number[][][][];
    for (const p of rawPolys) {
      const outer = p[0];
      if (!outer) continue;
      for (let i = 0; i < outer.length; i++) {
        const pt = projection([outer[i][0], outer[i][1]]);
        if (!pt || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue;
        if (pt[0] < mapMinX) mapMinX = pt[0];
        if (pt[1] < mapMinY) mapMinY = pt[1];
        if (pt[0] > mapMaxX) mapMaxX = pt[0];
        if (pt[1] > mapMaxY) mapMaxY = pt[1];
      }
    }
    const anchor = projectFeaturePolylabel(u.feature, projection);
    if (anchor) anchors.set(u.id, anchor);
  }

  if (!Number.isFinite(mapMinX)) {
    return { scale: 1, clusters: [], istanbulPanel: null };
  }

  const istanbulUnits = isDistrictLayer
    ? units.filter((u) => u.ilId === '34' || u.id.startsWith('34-'))
    : [];
  const useIstanbulPanel = isDistrictLayer && istanbulUnits.length > 3;
  const panelUnitIds = new Set(useIstanbulPanel ? istanbulUnits.map((u) => u.id) : []);

  const istanbulPanel = useIstanbulPanel
    ? buildIstanbulCalloutPanel(
        istanbulUnits,
        anchors,
        { minX: mapMinX, minY: mapMinY, maxX: mapMaxX, maxY: mapMaxY },
        viewportBox,
        partyColorMap
      )
    : null;

  const densityScale =
    isDistrictLayer && units.length > 87 ? Math.max(0.78, Math.sqrt(87 / units.length)) : 1;
  const baseScale = Math.max(0.42, (viewportBox.w / 980) * densityScale);
  const step = 5.5 * baseScale;
  const dotR = 2.35 * baseScale;
  const gap = 2.4 * baseScale;

  interface MutableNode {
    id: string;
    anchor: Pt2D;
    homeX: number;
    homeY: number;
    cx: number;
    cy: number;
    halfW: number;
    halfH: number;
    cols: number;
    rows: number;
    colors: string[];
    isIstanbul3Callout: boolean;
  }

  const nodes: MutableNode[] = [];
  const offsetMap = isDistrictLayer ? SEAT_OFFSETS_87 : SEAT_OFFSETS_81;

  for (const u of units) {
    if (panelUnitIds.has(u.id)) continue;
    const anchor = anchors.get(u.id);
    if (!anchor) continue;
    const colors = buildOrderedSeatColors(u.partySeats, u.partyVotes, partyColorMap);
    if (colors.length === 0) continue;

    const isIstanbul3Callout =
      (!isDistrictLayer && u.id === '34') ||
      (isDistrictLayer && !useIstanbulPanel && u.id.startsWith('34-'));

    // Keep familiar Black Sea callout offsets for Istanbul <= 3 districts / 81-il;
    // rely on Polylabel + collision avoidance everywhere else so neighbors never swap.
    const applyLegacyOffset = isIstanbul3Callout || (!isDistrictLayer && u.id === '35');
    const [rawOffX, rawOffY] = applyLegacyOffset ? offsetMap[u.id] || [0, 0] : [0, 0];
    const homeX = anchor[0] + rawOffX * baseScale;
    const homeY = anchor[1] + rawOffY * baseScale;

    const cols = getSeatGridCols(colors.length);
    const rows = Math.ceil(colors.length / cols);
    const halfW = ((cols - 1) * step) / 2 + dotR + 0.5 * baseScale;
    const halfH = ((rows - 1) * step) / 2 + dotR + 0.5 * baseScale;

    nodes.push({
      id: u.id,
      anchor,
      homeX,
      homeY,
      cx: homeX,
      cy: homeY,
      halfW,
      halfH,
      cols,
      rows,
      colors,
      isIstanbul3Callout,
    });
  }

  const panelObstacle = istanbulPanel
    ? {
        minX: istanbulPanel.x - 4 * baseScale,
        minY: istanbulPanel.y - 4 * baseScale,
        maxX: istanbulPanel.x + istanbulPanel.w + 4 * baseScale,
        maxY: istanbulPanel.y + istanbulPanel.h + 4 * baseScale,
      }
    : null;

  const clampNode = (n: MutableNode) => {
    const minCX = viewportBox.x + n.halfW + 2;
    const maxCX = viewportBox.x + viewportBox.w - n.halfW - 2;
    const minCY = viewportBox.y + n.halfH + 2;
    const maxCY = viewportBox.y + viewportBox.h - n.halfH - 2;
    if (minCX <= maxCX) n.cx = Math.max(minCX, Math.min(maxCX, n.cx));
    if (minCY <= maxCY) n.cy = Math.max(minCY, Math.min(maxCY, n.cy));
  };

  // Iterative AABB separation + light home-spring, followed by zero-spring strict separation
  const totalIters = 100;
  for (let iter = 0; iter < totalIters; iter++) {
    const springStrength = iter < 70 ? 0.05 : 0;
    let hadOverlap = false;

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (springStrength > 0) {
        a.cx += (a.homeX - a.cx) * springStrength;
        a.cy += (a.homeY - a.cy) * springStrength;
      }

      if (panelObstacle) {
        const aMinX = a.cx - a.halfW - gap * 0.5;
        const aMaxX = a.cx + a.halfW + gap * 0.5;
        const aMinY = a.cy - a.halfH - gap * 0.5;
        const aMaxY = a.cy + a.halfH + gap * 0.5;
        const ox = Math.min(aMaxX, panelObstacle.maxX) - Math.max(aMinX, panelObstacle.minX);
        const oy = Math.min(aMaxY, panelObstacle.maxY) - Math.max(aMinY, panelObstacle.minY);
        if (ox > 0 && oy > 0) {
          hadOverlap = true;
          // Push downward into Anatolia / below panel whenever possible
          a.cy += oy + 0.5;
        }
      }

      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = b.cx - a.cx;
        const dy = b.cy - a.cy;
        const reqX = a.halfW + b.halfW + gap;
        const reqY = a.halfH + b.halfH + gap;
        const ox = reqX - Math.abs(dx);
        const oy = reqY - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          hadOverlap = true;
          if (ox < oy) {
            const sign = dx === 0 ? (i % 2 === 0 ? 1 : -1) : dx > 0 ? 1 : -1;
            const shift = (ox * 0.52) + 0.05;
            a.cx -= sign * shift;
            b.cx += sign * shift;
          } else {
            const sign = dy === 0 ? (j % 2 === 0 ? 1 : -1) : dy > 0 ? 1 : -1;
            const shift = (oy * 0.52) + 0.05;
            a.cy -= sign * shift;
            b.cy += sign * shift;
          }
        }
      }
      clampNode(a);
    }

    if (iter >= 70 && !hadOverlap) break;
  }

  const leaderDistThreshold = 10 * baseScale;
  const clusters: SeatClusterResult[] = nodes.map((n) => {
    const startX = n.cx - ((n.cols - 1) * step) / 2;
    const startY = n.cy - ((n.rows - 1) * step) / 2;
    const dots = n.colors.map((color, idx) => {
      const r = Math.floor(idx / n.cols);
      const c = idx % n.cols;
      return {
        x: startX + c * step,
        y: startY + r * step,
        r: dotR,
        color,
      };
    });

    const minX = n.cx - n.halfW;
    const minY = n.cy - n.halfH;
    const maxX = n.cx + n.halfW;
    const maxY = n.cy + n.halfH;

    const disp = Math.hypot(n.cx - n.anchor[0], n.cy - n.anchor[1]);
    let leaderLine: SeatClusterResult['leaderLine'];
    if (n.isIstanbul3Callout || disp > leaderDistThreshold) {
      // Connect anchor to closest point on cluster bbox perimeter so stem doesn't cross dots
      const edgeX = Math.max(minX, Math.min(maxX, n.anchor[0]));
      const edgeY = Math.max(minY, Math.min(maxY, n.anchor[1]));
      leaderLine = {
        x1: n.anchor[0],
        y1: n.anchor[1],
        x2: edgeX,
        y2: edgeY,
      };
    }

    return {
      id: n.id,
      anchor: n.anchor,
      cx: n.cx,
      cy: n.cy,
      minX,
      minY,
      maxX,
      maxY,
      leaderLine,
      dots,
    };
  });

  return { scale: baseScale, clusters, istanbulPanel };
}
