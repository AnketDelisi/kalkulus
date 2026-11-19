import fs from 'node:fs';
import path from 'node:path';
import { geoArea, geoCentroid } from 'd3-geo';

/**
 * Watertight Planar-Arrangement GeoJSON Pipeline
 * ----------------------------------------------
 * Generates ALL three vector map layers from the single authoritative 973-ilçe source
 * (`scripts/data/repo600_turkey.svg`) so static (81/87/973) and dynamic archive
 * layers share identical snapped arcs with zero inter-border slits, zero overlaps,
 * zero bogus interior holes, and zero coastal dust specks.
 *
 * Also updates `lat`/`lng` centroids in `src/data/baseline2023.json` and `baseline2024.json`.
 */

const SCALE = 1e5; // 5-decimal lon/lat integer grid (~1m resolution)
const STANDALONE_ISLAND_IDS = new Set([
  '34-adalar',
  '17-bozcaada',
  '17-gokceada',
  '10-marmara',
]);
const MAINLAND_MAX_THRESHOLD_SR = 1e-6;
const MAINLAND_DUST_THRESHOLD_SR = 1.5e-7;
const GAP_FILL_MAX_SR = 5e-6;

const SVG_PROJECTION = {
  // Exact inverse parameters matching AnketDelisi/600 1000x446.4 Mercator SVG
  proj: null,
};

import { geoMercator } from 'd3-geo';
SVG_PROJECTION.proj = geoMercator().fitExtent(
  [
    [0, 0],
    [1000, 446.4],
  ],
  {
    type: 'MultiPoint',
    coordinates: [
      [25.6685, 35.8084],
      [44.8179, 42.1067],
    ],
  }
);

function normalizeTr(str) {
  if (!str) return '';
  return str
    .toString()
    .trim()
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
    .replace(/[^a-z0-9]/g, '');
}

function signedArea2D(ring) {
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return s * 0.5;
}

function ringSphericalAreaFromGrid(ring, scale = SCALE) {
  const deg = ring.map(([x, y]) => [x / scale, y / scale]);
  const cw = signedArea2D(deg) > 0 ? [...deg].reverse() : deg;
  const a = geoArea({ type: 'Polygon', coordinates: [cw] });
  return a > Math.PI ? 4 * Math.PI - a : a;
}

function dedupeClosedRing(ring, wantCCW = null) {
  const out = [];
  for (const pt of ring) {
    if (!out.length || out[out.length - 1][0] !== pt[0] || out[out.length - 1][1] !== pt[1]) {
      out.push([pt[0], pt[1]]);
    }
  }
  if (out.length < 3) return null;
  if (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1]) {
    out.push([out[0][0], out[0][1]]);
  }
  if (out.length < 4) return null;
  const a2 = signedArea2D(out);
  if (Math.abs(a2) <= 0) return null;
  if (wantCCW === true && a2 < 0) out.reverse();
  if (wantCCW === false && a2 > 0) out.reverse();
  return out;
}

function pointInRing(px, py, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolyWithHoles(px, py, poly) {
  if (!pointInRing(px, py, poly[0])) return false;
  for (let h = 1; h < poly.length; h++) {
    if (pointInRing(px, py, poly[h])) return false;
  }
  return true;
}

function interiorPointOfRing(ring) {
  let minY = Infinity;
  let maxY = -Infinity;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x, y] = ring[i];
    cx += x;
    cy += y;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  cx /= ring.length - 1;
  cy /= ring.length - 1;
  if (pointInRing(cx, cy, ring)) return [cx, cy];

  for (const frac of [0.5, 0.37, 0.63, 0.25, 0.75, 0.15, 0.85, 0.08, 0.92]) {
    const y = minY + (maxY - minY) * frac;
    const xs = [];
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      if ((y1 > y) !== (y2 > y)) {
        xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      if (xs[k + 1] - xs[k] > 1e-6) {
        const mx = (xs[k] + xs[k + 1]) * 0.5;
        if (pointInRing(mx, y, ring)) return [mx, y];
      }
    }
  }
  return [cx, cy];
}

function bboxOfRing(ring) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/**
 * Parses an SVG path `d` string into CCW outer + CW hole polygons on the `1e5` integer grid,
 * dropping tiny mainland coastal dust while keeping all real enclave holes & island districts.
 */
function parseSvgIlcePolys(ilceId, dStr) {
  const rawSubpaths = dStr.trim().split(/(?=M)/);
  const candidateRings = [];

  for (const sub of rawSubpaths) {
    const rawPts = [];
    for (const match of sub.matchAll(/([0-9.-]+),([0-9.-]+)/g)) {
      const lonLat = SVG_PROJECTION.proj.invert([Number(match[1]), Number(match[2])]);
      if (!lonLat || Number.isNaN(lonLat[0]) || Number.isNaN(lonLat[1])) continue;
      rawPts.push([Math.round(lonLat[0] * SCALE), Math.round(lonLat[1] * SCALE)]);
    }
    const ring = dedupeClosedRing(rawPts, true);
    if (!ring) continue;
    const areaSr = ringSphericalAreaFromGrid(ring, SCALE);
    if (areaSr <= 1e-10) continue;
    const [ix, iy] = interiorPointOfRing(ring);
    candidateRings.push({
      ring,
      areaSr,
      bbox: bboxOfRing(ring),
      probe: [ix, iy],
    });
  }

  if (candidateRings.length === 0) {
    throw new Error(`SVG path for ${ilceId} produced zero valid rings`);
  }

  // Classify nesting depth (even => outer, odd => hole inside smallest container)
  const parentOf = new Array(candidateRings.length).fill(-1);
  const depthOf = new Array(candidateRings.length).fill(0);
  for (let j = 0; j < candidateRings.length; j++) {
    const child = candidateRings[j];
    const containers = [];
    for (let i = 0; i < candidateRings.length; i++) {
      if (i === j) continue;
      const parent = candidateRings[i];
      if (parent.areaSr <= child.areaSr * 1.001) continue;
      const [x0, y0, x1, y1] = parent.bbox;
      if (child.probe[0] < x0 || child.probe[0] > x1 || child.probe[1] < y0 || child.probe[1] > y1) {
        continue;
      }
      if (pointInRing(child.probe[0], child.probe[1], parent.ring)) {
        containers.push(i);
      }
    }
    depthOf[j] = containers.length;
    if (containers.length % 2 === 1) {
      containers.sort((a, b) => candidateRings[a].areaSr - candidateRings[b].areaSr);
      parentOf[j] = containers[0];
    }
  }

  const polys = [];
  const outerIdxToPoly = new Map();
  for (let i = 0; i < candidateRings.length; i++) {
    if (depthOf[i] % 2 === 0) {
      outerIdxToPoly.set(i, polys.length);
      polys.push({
        outer: candidateRings[i].ring,
        holes: [],
        areaSr: candidateRings[i].areaSr,
        bbox: candidateRings[i].bbox,
      });
    }
  }
  for (let j = 0; j < candidateRings.length; j++) {
    const pIdx = parentOf[j];
    if (pIdx >= 0 && outerIdxToPoly.has(pIdx)) {
      const holeCW = [...candidateRings[j].ring].reverse();
      polys[outerIdxToPoly.get(pIdx)].holes.push(holeCW);
    }
  }

  // Filter out microscopic mainland coastal dust specks (< 1.5e-7 sr) unless standalone island ilçe
  const maxSr = Math.max(...polys.map((p) => p.areaSr));
  const kept =
    !STANDALONE_ISLAND_IDS.has(ilceId) && maxSr >= MAINLAND_MAX_THRESHOLD_SR
      ? polys.filter((p) => p.areaSr >= MAINLAND_DUST_THRESHOLD_SR)
      : polys;

  return kept.length > 0 ? kept : [polys[0]];
}

function parseSvgPaths(filePath, skipSeatArea = false) {
  const svgText = fs.readFileSync(path.resolve(filePath), 'utf8');
  const map = new Map();
  for (const match of svgText.matchAll(/<path\b([^>]*)>/g)) {
    const attrs = match[1];
    if (skipSeatArea && attrs.includes('seat-area')) continue;
    const idMatch = attrs.match(/\bid="([^"]+)"/);
    const dMatch = attrs.match(/\bd="([^"]+)"/);
    if (!idMatch || !dMatch) continue;
    map.set(idMatch[1], dMatch[1]);
  }
  return map;
}

/**
 * Exact segment intersection test (excludes shared endpoint equality).
 */
function segmentsStrictlyCrossOrTouch(ax, ay, bx, by, cx, cy, dx, dy) {
  const minAX = ax < bx ? ax : bx;
  const maxAX = ax > bx ? ax : bx;
  const minCX = cx < dx ? cx : dx;
  const maxCX = cx > dx ? cx : dx;
  if (maxAX < minCX || maxCX < minAX) return false;
  const minAY = ay < by ? ay : by;
  const maxAY = ay > by ? ay : by;
  const minCY = cy < dy ? cy : dy;
  const maxCY = cy > dy ? cy : dy;
  if (maxAY < minCY || maxCY < minAY) return false;

  const orient = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
  const o1 = orient(ax, ay, bx, by, cx, cy);
  const o2 = orient(ax, ay, bx, by, dx, dy);
  const o3 = orient(cx, cy, dx, dy, ax, ay);
  const o4 = orient(cx, cy, dx, dy, bx, by);

  if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))) {
    return true;
  }
  const onSeg = (px, py, qx, qy, rx, ry) =>
    qx >= Math.min(px, rx) &&
    qx <= Math.max(px, rx) &&
    qy >= Math.min(py, ry) &&
    qy <= Math.max(py, ry);
  // Check collinear overlap or interior T-junction touch (exclude exact endpoint equality)
  const shareAC = ax === cx && ay === cy;
  const shareAD = ax === dx && ay === dy;
  const shareBC = bx === cx && by === cy;
  const shareBD = bx === dx && by === dy;
  if (o1 === 0 && onSeg(ax, ay, cx, cy, bx, by) && !shareAC && !shareBC) return true;
  if (o2 === 0 && onSeg(ax, ay, dx, dy, bx, by) && !shareAD && !shareBD) return true;
  if (o3 === 0 && onSeg(cx, cy, ax, ay, dx, dy) && !shareAC && !shareAD) return true;
  if (o4 === 0 && onSeg(cx, cy, bx, by, dx, dy) && !shareBC && !shareBD) return true;
  return false;
}

/**
 * Traces remaining directed half-edges (each quantized coordinate string `x,y`)
 * into simple closed rings sorted by sharpest-left turn at branch vertices, then builds
 * a `d3-geo` CW-outer / CCW-hole Geometry in rounded degrees.
 */
function buildD3GeometryFromHalfEdges(directedEdges, snapDecimals = 5) {
  // directedEdges: Array<[uKey, vKey, uX, uY, vX, vY]>
  const coordsByKey = new Map();
  const outByKey = new Map();

  for (const [uK, vK, ux, uy, vx, vy] of directedEdges) {
    if (uK === vK) continue;
    coordsByKey.set(uK, [ux, uy]);
    coordsByKey.set(vK, [vx, vy]);
    if (!outByKey.has(uK)) outByKey.set(uK, []);
    outByKey.get(uK).push(vK);
  }

  // Sort outgoing edges around each vertex CCW by angle for deterministic sharpest-left walking
  const sortedOut = new Map();
  for (const [uK, targets] of outByKey.entries()) {
    const [ux, uy] = coordsByKey.get(uK);
    const uniqueTargets = Array.from(new Set(targets));
    uniqueTargets.sort((aK, bK) => {
      const [ax, ay] = coordsByKey.get(aK);
      const [bx, by] = coordsByKey.get(bK);
      return Math.atan2(ay - uy, ax - ux) - Math.atan2(by - uy, bx - ux);
    });
    sortedOut.set(uK, uniqueTargets);
  }

  const used = new Set();
  const loops = []; // planar coords (deg)
  const scaleInv = Math.pow(10, -snapDecimals);
  const toDeg = (x) => Number((x / SCALE).toFixed(snapDecimals));

  for (const [u0, outs] of sortedOut.entries()) {
    for (const v0 of outs) {
      const firstEdge = `${u0}>${v0}`;
      if (used.has(firstEdge)) continue;

      const cycleKeys = [u0];
      let prev = u0;
      let curr = v0;
      let guard = 0;
      while (guard++ < 250000) {
        const edgeKey = `${prev}>${curr}`;
        if (used.has(edgeKey)) break;
        used.add(edgeKey);
        cycleKeys.push(curr);

        if (curr === u0) break;

        const nextCands = sortedOut.get(curr);
        if (!nextCands || nextCands.length === 0) break;

        const [px, py] = coordsByKey.get(prev);
        const [cx, cy] = coordsByKey.get(curr);
        const backAngle = Math.atan2(py - cy, px - cx);

        // Pick unused outgoing edge with smallest positive CW sweep from backAngle (= sharpest left turn)
        let bestNext = null;
        let bestSweep = Infinity;
        for (const nK of nextCands) {
          if (used.has(`${curr}>${nK}`)) continue;
          const [nx, ny] = coordsByKey.get(nK);
          const outAngle = Math.atan2(ny - cy, nx - cx);
          let cwSweep = backAngle - outAngle;
          while (cwSweep <= 0) cwSweep += 2 * Math.PI;
          if (cwSweep < bestSweep) {
            bestSweep = cwSweep;
            bestNext = nK;
          }
        }
        if (!bestNext) break;
        prev = curr;
        curr = bestNext;
      }

      if (cycleKeys.length >= 4 && cycleKeys[0] === cycleKeys[cycleKeys.length - 1]) {
        const degRing = cycleKeys.map((k) => {
          const [x, y] = coordsByKey.get(k);
          return [toDeg(x), toDeg(y)];
        });
        const clean = dedupeClosedRing(degRing, null);
        if (clean) {
          const areaSr = ringSphericalAreaFromGrid(
            clean.map(([x, y]) => [x / scaleInv, y / scaleInv]),
            1 / scaleInv
          );
          if (areaSr > 1e-10) {
            loops.push({
              ring: clean,
              area2D: signedArea2D(clean),
              areaSr,
              bbox: bboxOfRing(clean),
              probe: interiorPointOfRing(clean),
            });
          }
        }
      }
    }
  }

  // Separate CCW outer shells (area2D > 0) vs CW holes (area2D < 0), then convert to d3-geo (CW outer, CCW hole)
  const outers = [];
  const holes = [];
  for (const lp of loops) {
    if (lp.area2D > 0) {
      outers.push({
        outerCW: [...lp.ring].reverse(),
        outerCCW: lp.ring,
        areaSr: lp.areaSr,
        bbox: lp.bbox,
        holesCCW: [],
      });
    } else {
      holes.push(lp);
    }
  }

  // Assign each interior hole to its smallest enclosing outer shell
  for (const h of holes) {
    const candidates = [];
    for (let i = 0; i < outers.length; i++) {
      const o = outers[i];
      if (o.areaSr <= h.areaSr * 1.0001) continue;
      if (
        h.probe[0] < o.bbox[0] ||
        h.probe[0] > o.bbox[2] ||
        h.probe[1] < o.bbox[1] ||
        h.probe[1] > o.bbox[3]
      ) {
        continue;
      }
      if (pointInRing(h.probe[0], h.probe[1], o.outerCCW)) {
        candidates.push(i);
      }
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => outers[a].areaSr - outers[b].areaSr);
      const holeCCW = [...h.ring].reverse();
      outers[candidates[0]].holesCCW.push(holeCCW);
    }
  }

  const polyCoords = outers.map((o) => [o.outerCW, ...o.holesCCW]);
  const geom =
    polyCoords.length === 1
      ? { type: 'Polygon', coordinates: polyCoords[0] }
      : { type: 'MultiPolygon', coordinates: polyCoords };

  return geom;
}

// =========================================================================
// MAIN PIPELINE
// =========================================================================

const tStart = Date.now();
const baseline2023 = JSON.parse(fs.readFileSync(path.resolve('src/data/baseline2023.json'), 'utf8'));
const baseline2024 = JSON.parse(fs.readFileSync(path.resolve('src/data/baseline2024.json'), 'utf8'));
const svgIlcePaths = parseSvgPaths('scripts/data/repo600_turkey.svg', true);

const provFoldById = Object.fromEntries(
  baseline2023.provinces.map((p) => [p.id, normalizeTr(p.name)])
);

const ILCE_SVG_SPECIAL = {
  '28-merkez': 'giresun-giresundistrict',
  '75-merkez': 'ardahan-ardahan',
  '17-gokceada': 'canakkale-imbros',
  '34-adalar': 'istanbul-princeislands',
  '71-karakecili': 'kirikkale-karakeceli',
  '55-19-mayis': 'samsun-ondokuzmayis',
  '43-gediz': 'kutahya-gedizmerkez',
};

// Step 1: Parse all 973 ilçeler from repo600_turkey.svg onto integer 1e5 grid
const ilceMeta = [];
const usedSvgIlceKeys = new Set();
const allInputSegments = []; // [x1, y1, x2, y2]

for (let idx = 0; idx < baseline2023.ilceler.length; idx++) {
  const ilce = baseline2023.ilceler[idx];
  const pf = provFoldById[ilce.ilId];
  const inf = normalizeTr(ilce.name);
  const candidates = [
    ILCE_SVG_SPECIAL[ilce.id],
    `${pf}-${inf}`,
    `${pf}-${pf}merkez`,
    `${pf}-${pf}merkezilce`,
    `${pf}-${pf}merkezi`,
  ].filter(Boolean);

  const svgKey = candidates.find((k) => svgIlcePaths.has(k));
  if (!svgKey) {
    throw new Error(`Missing ilçe path for ${ilce.id} (${ilce.name}) in repo600_turkey.svg`);
  }
  if (usedSvgIlceKeys.has(svgKey)) {
    throw new Error(`Duplicate SVG key '${svgKey}' mapped for ilçe ${ilce.id}`);
  }
  usedSvgIlceKeys.add(svgKey);

  const polys = parseSvgIlcePolys(ilce.id, svgIlcePaths.get(svgKey));
  let totalArea2D = 0;
  for (const p of polys) {
    totalArea2D += Math.abs(signedArea2D(p.outer));
    for (const r of [p.outer, ...p.holes]) {
      for (let k = 0; k < r.length - 1; k++) {
        const a = r[k];
        const b = r[k + 1];
        if (a[0] !== b[0] || a[1] !== b[1]) {
          allInputSegments.push([a[0], a[1], b[0], b[1]]);
        }
      }
    }
  }
  ilceMeta.push({ idx, ilce, polys, totalArea2D });
}

if (ilceMeta.length !== 973) {
  throw new Error(`Expected 973 ilçeler, got ${ilceMeta.length}`);
}

// Step 2: Spatial grid intersection splitting -> planar graph
const SEG_CELL = 2000;
const segGrid = new Map();
for (let i = 0; i < allInputSegments.length; i++) {
  const s = allInputSegments[i];
  const gx0 = Math.floor(Math.min(s[0], s[2]) / SEG_CELL);
  const gx1 = Math.floor(Math.max(s[0], s[2]) / SEG_CELL);
  const gy0 = Math.floor(Math.min(s[1], s[3]) / SEG_CELL);
  const gy1 = Math.floor(Math.max(s[1], s[3]) / SEG_CELL);
  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gy = gy0; gy <= gy1; gy++) {
      const k = `${gx},${gy}`;
      if (!segGrid.has(k)) segGrid.set(k, []);
      segGrid.get(k).push(i);
    }
  }
}

const segSplits = allInputSegments.map(() => [0, 1]);
const checkedPairs = new Set();
const STRIDE = allInputSegments.length + 1;

for (const bucket of segGrid.values()) {
  for (let a = 0; a < bucket.length; a++) {
    const i = bucket[a];
    const s1 = allInputSegments[i];
    const x1 = s1[0],
      y1 = s1[1],
      x2 = s1[2],
      y2 = s1[3];
    const minX1 = Math.min(x1, x2),
      maxX1 = Math.max(x1, x2);
    const minY1 = Math.min(y1, y2),
      maxY1 = Math.max(y1, y2);

    for (let b = a + 1; b < bucket.length; b++) {
      const j = bucket[b];
      const pk = i < j ? i * STRIDE + j : j * STRIDE + i;
      if (checkedPairs.has(pk)) continue;
      checkedPairs.add(pk);

      const s2 = allInputSegments[j];
      const x3 = s2[0],
        y3 = s2[1],
        x4 = s2[2],
        y4 = s2[3];
      if (
        maxX1 < Math.min(x3, x4) ||
        Math.max(x3, x4) < minX1 ||
        maxY1 < Math.min(y3, y4) ||
        Math.max(y3, y4) < minY1
      ) {
        continue;
      }

      const dx1 = x2 - x1,
        dy1 = y2 - y1;
      const dx2 = x4 - x3,
        dy2 = y4 - y3;
      const denom = dx1 * dy2 - dy1 * dx2;

      if (Math.abs(denom) > 1e-9) {
        const t = ((x3 - x1) * dy2 - (y3 - y1) * dx2) / denom;
        const u = ((x3 - x1) * dy1 - (y3 - y1) * dx1) / denom;
        if (t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) {
          if (t > 1e-9 && t < 1 - 1e-9) segSplits[i].push(t);
          if (u > 1e-9 && u < 1 - 1e-9) segSplits[j].push(u);
        }
      } else {
        const cross = (x3 - x1) * dy1 - (y3 - y1) * dx1;
        if (Math.abs(cross) <= 1e-6 * Math.hypot(dx1, dy1)) {
          const l1sq = dx1 * dx1 + dy1 * dy1;
          const l2sq = dx2 * dx2 + dy2 * dy2;
          if (l1sq > 0) {
            const t3 = ((x3 - x1) * dx1 + (y3 - y1) * dy1) / l1sq;
            const t4 = ((x4 - x1) * dx1 + (y4 - y1) * dy1) / l1sq;
            if (t3 > 1e-9 && t3 < 1 - 1e-9) segSplits[i].push(t3);
            if (t4 > 1e-9 && t4 < 1 - 1e-9) segSplits[i].push(t4);
          }
          if (l2sq > 0) {
            const u1 = ((x1 - x3) * dx2 + (y1 - y3) * dy2) / l2sq;
            const u2 = ((x2 - x3) * dx2 + (y2 - y3) * dy2) / l2sq;
            if (u1 > 1e-9 && u1 < 1 - 1e-9) segSplits[j].push(u1);
            if (u2 > 1e-9 && u2 < 1 - 1e-9) segSplits[j].push(u2);
          }
        }
      }
    }
  }
}

// Step 3: Build planar arrangement vertices/edges (sub-grid 1e-2 in 1e5 space preserves exact intersections),
// prune degree-1 filaments, sort adjacency CCW, extract minimal bounded faces.
const vIdByKey = new Map();
const verts = []; // [x, y] in 1e5 space
function getVid(x, y) {
  const rx = Math.round(x * 100);
  const ry = Math.round(y * 100);
  const k = `${rx},${ry}`;
  let id = vIdByKey.get(k);
  if (id === undefined) {
    id = verts.length;
    verts.push([rx / 100, ry / 100]);
    vIdByKey.set(k, id);
  }
  return id;
}

const edgeSeen = new Set();
const adj = new Map();
function addUndirectedEdge(u, v) {
  if (u === v) return;
  const k = u < v ? `${u}_${v}` : `${v}_${u}`;
  if (edgeSeen.has(k)) return;
  edgeSeen.add(k);
  if (!adj.has(u)) adj.set(u, []);
  if (!adj.has(v)) adj.set(v, []);
  adj.get(u).push(v);
  adj.get(v).push(u);
}

for (let i = 0; i < allInputSegments.length; i++) {
  const s = allInputSegments[i];
  const ts = segSplits[i].sort((a, b) => a - b);
  let prev = getVid(s[0], s[1]);
  for (let k = 1; k < ts.length; k++) {
    if (ts[k] - ts[k - 1] < 1e-9) continue;
    const t = ts[k];
    const cur = getVid(s[0] + t * (s[2] - s[0]), s[1] + t * (s[3] - s[1]));
    addUndirectedEdge(prev, cur);
    prev = cur;
  }
}

// Prune degree <= 1 dangling filaments
const degQ = [];
for (const [u, nbrs] of adj.entries()) if (nbrs.length <= 1) degQ.push(u);
while (degQ.length > 0) {
  const u = degQ.pop();
  const nbrs = adj.get(u);
  if (!nbrs || nbrs.length > 1) continue;
  for (const v of [...nbrs]) {
    const vn = adj.get(v);
    if (vn) {
      const pos = vn.indexOf(u);
      if (pos >= 0) vn.splice(pos, 1);
      if (vn.length <= 1) degQ.push(v);
    }
  }
  adj.delete(u);
}

// Sort adjacency lists CCW around each vertex
const dirIndex = new Map();
for (const [u, nbrs] of adj.entries()) {
  const [ux, uy] = verts[u];
  nbrs.sort(
    (a, b) => Math.atan2(verts[a][1] - uy, verts[a][0] - ux) - Math.atan2(verts[b][1] - uy, verts[b][0] - ux)
  );
  const m = new Map();
  nbrs.forEach((v, idx) => m.set(v, idx));
  dirIndex.set(u, m);
}

const visitedHE = new Set();
const faces = [];
const cwCycles = [];
for (const [u0, nbrs] of adj.entries()) {
  for (const v0 of nbrs) {
    const sk = `${u0}>${v0}`;
    if (visitedHE.has(sk)) continue;
    const cycle = [u0];
    let u = u0;
    let v = v0;
    let guard = 0;
    while (guard++ < 250000) {
      const hk = `${u}>${v}`;
      if (visitedHE.has(hk)) break;
      visitedHE.add(hk);
      cycle.push(v);
      const vn = adj.get(v);
      const bIdx = dirIndex.get(v).get(u);
      const nIdx = (bIdx - 1 + vn.length) % vn.length;
      const w = vn[nIdx];
      u = v;
      v = w;
      if (u === u0 && v === v0) break;
    }
    if (cycle.length >= 4 && cycle[0] === cycle[cycle.length - 1]) {
      const ring = cycle.map((id) => verts[id]);
      const a2 = signedArea2D(ring);
      if (a2 > 1e-4) {
        faces.push({
          ids: cycle,
          holeIdsList: [],
          ring,
          bbox: bboxOfRing(ring),
          area2D: a2,
          areaSr: ringSphericalAreaFromGrid(ring, SCALE),
          owner: -1,
        });
      } else if (a2 < -1e-4) {
        cwCycles.push({
          ids: cycle,
          ring,
          areaSr: ringSphericalAreaFromGrid(ring, SCALE),
          bbox: bboxOfRing(ring),
          probe: interiorPointOfRing(ring),
        });
      }
    }
  }
}

// Step 4: Assign each minimal face via hole-aware PIP, absorb gap slits, and heal detached inland slivers
const POLY_CELL = 10000;
const polyGrid = new Map();
for (const meta of ilceMeta) {
  for (const p of meta.polys) {
    const [x0, y0, x1, y1] = p.bbox;
    const polyCoords = [p.outer, ...p.holes];
    for (let gx = Math.floor(x0 / POLY_CELL); gx <= Math.floor(x1 / POLY_CELL); gx++) {
      for (let gy = Math.floor(y0 / POLY_CELL); gy <= Math.floor(y1 / POLY_CELL); gy++) {
        const k = `${gx},${gy}`;
        if (!polyGrid.has(k)) polyGrid.set(k, []);
        polyGrid.get(k).push({
          fi: meta.idx,
          totalArea2D: meta.totalArea2D,
          bbox: p.bbox,
          polyCoords,
        });
      }
    }
  }
}

for (const f of faces) {
  const [px, py] = interiorPointOfRing(f.ring);
  const k = `${Math.floor(px / POLY_CELL)},${Math.floor(py / POLY_CELL)}`;
  const cands = polyGrid.get(k) || [];
  const hits = [];
  for (const c of cands) {
    const [x0, y0, x1, y1] = c.bbox;
    if (px < x0 || px > x1 || py < y0 || py > y1) continue;
    if (pointInPolyWithHoles(px, py, c.polyCoords)) hits.push(c);
  }
  if (hits.length === 1) {
    f.owner = hits[0].fi;
  } else if (hits.length > 1) {
    // Prefer the smaller-area ilçe on minor digitization overlap slivers so compact urban districts never lose territory
    hits.sort((a, b) => a.totalArea2D - b.totalArea2D);
    f.owner = hits[0].fi;
  }
}

const heToFace = new Map();
for (let fi = 0; fi < faces.length; fi++) {
  const ids = faces[fi].ids;
  for (let i = 0; i < ids.length - 1; i++) {
    heToFace.set(`${ids[i]}>${ids[i + 1]}`, fi);
  }
}

// Register disconnected CW interior hole cycles (e.g. 50-gulsehir exclave hole inside 50-acigol)
// onto their smallest enclosing CCW face so internal boundaries are tracked symmetrically.
for (const cw of cwCycles) {
  let enclosingFi = -1;
  let bestSr = Infinity;
  for (let fi = 0; fi < faces.length; fi++) {
    const pf = faces[fi];
    if (pf.areaSr <= cw.areaSr * 1.0001 || pf.areaSr >= bestSr) continue;
    const [x0, y0, x1, y1] = pf.bbox;
    if (cw.probe[0] < x0 || cw.probe[0] > x1 || cw.probe[1] < y0 || cw.probe[1] > y1) continue;
    if (pointInRing(cw.probe[0], cw.probe[1], pf.ring)) {
      bestSr = pf.areaSr;
      enclosingFi = fi;
    }
  }
  if (enclosingFi >= 0) {
    faces[enclosingFi].holeIdsList.push(cw.ids);
    for (let i = 0; i < cw.ids.length - 1; i++) {
      heToFace.set(`${cw.ids[i]}>${cw.ids[i + 1]}`, enclosingFi);
    }
  }
}

// Absorb all interior seam gap faces (< 5e-6 sr) into neighbor sharing longest boundary
for (let pass = 0; pass < 4; pass++) {
  let changed = false;
  for (let fi = 0; fi < faces.length; fi++) {
    const f = faces[fi];
    if (f.owner !== -1 || f.areaSr >= GAP_FILL_MAX_SR) continue;
    const lenByOwner = new Map();
    const ids = f.ids;
    for (let i = 0; i < ids.length - 1; i++) {
      const u = ids[i];
      const v = ids[i + 1];
      const oppFi = heToFace.get(`${v}>${u}`);
      if (oppFi !== undefined && faces[oppFi].owner >= 0) {
        const ow = faces[oppFi].owner;
        const len = Math.hypot(verts[v][0] - verts[u][0], verts[v][1] - verts[u][1]);
        lenByOwner.set(ow, (lenByOwner.get(ow) || 0) + len);
      }
    }
    let bestOw = -1;
    let bestLen = -1;
    for (const [ow, len] of lenByOwner.entries()) {
      if (len > bestLen) {
        bestLen = len;
        bestOw = ow;
      }
    }
    if (bestOw >= 0) {
      f.owner = bestOw;
      changed = true;
    }
  }
  if (!changed) break;
}

// Detached inland micro-sliver pass: reassign any tiny secondary inland component (< 1.5e-7 sr)
// touching another ilçe to its longest-border neighbor.
for (let pass = 0; pass < 3; pass++) {
  let healed = false;
  const facesByOwner = new Map();
  for (let fi = 0; fi < faces.length; fi++) {
    const ow = faces[fi].owner;
    if (ow < 0) continue;
    if (!facesByOwner.has(ow)) facesByOwner.set(ow, []);
    facesByOwner.get(ow).push(fi);
  }

  for (const [ow, fList] of facesByOwner.entries()) {
    if (fList.length <= 1) continue;
    const fSet = new Set(fList);
    const seenF = new Set();
    const comps = [];
    for (const startFi of fList) {
      if (seenF.has(startFi)) continue;
      const comp = [];
      const q = [startFi];
      seenF.add(startFi);
      while (q.length > 0) {
        const cur = q.pop();
        comp.push(cur);
        const ids = faces[cur].ids;
        for (let i = 0; i < ids.length - 1; i++) {
          const opp = heToFace.get(`${ids[i + 1]}>${ids[i]}`);
          if (opp !== undefined && fSet.has(opp) && !seenF.has(opp)) {
            seenF.add(opp);
            q.push(opp);
          }
        }
      }
      const compSr = comp.reduce((s, fi) => s + faces[fi].areaSr, 0);
      comps.push({ comp, compSr });
    }
    if (comps.length <= 1) continue;
    // Never dissolve an ilçe's primary component
    comps.sort((a, b) => b.compSr - a.compSr);
    for (let ci = 1; ci < comps.length; ci++) {
      const { comp, compSr } = comps[ci];
      if (compSr < MAINLAND_DUST_THRESHOLD_SR) {
        const nbrLens = new Map();
        for (const fi of comp) {
          const ids = faces[fi].ids;
          for (let i = 0; i < ids.length - 1; i++) {
            const opp = heToFace.get(`${ids[i + 1]}>${ids[i]}`);
            const nOw = opp === undefined ? -1 : faces[opp].owner;
            if (nOw >= 0 && nOw !== ow) {
              const len = Math.hypot(verts[ids[i + 1]][0] - verts[ids[i]][0], verts[ids[i + 1]][1] - verts[ids[i]][1]);
              nbrLens.set(nOw, (nbrLens.get(nOw) || 0) + len);
            }
          }
        }
        if (nbrLens.size > 0) {
          let bestOw = -1;
          let bestLen = -1;
          for (const [nOw, len] of nbrLens.entries()) {
            if (len > bestLen) {
              bestLen = len;
              bestOw = nOw;
            }
          }
          if (bestOw >= 0) {
            for (const fi of comp) faces[fi].owner = bestOw;
            healed = true;
          }
        }
      }
    }
  }
  if (!healed) break;
}

// Step 5: Extract boundary half-edges where opposite face has a different owner (or outer sea -1)
const boundaryHEs = []; // { u, v, leftOw, rightOw }
for (let fi = 0; fi < faces.length; fi++) {
  const f = faces[fi];
  if (f.owner < 0) continue;
  for (const ids of [f.ids, ...f.holeIdsList]) {
    for (let i = 0; i < ids.length - 1; i++) {
      const u = ids[i];
      const v = ids[i + 1];
      const oppFi = heToFace.get(`${v}>${u}`);
      const rOw = oppFi === undefined ? -1 : faces[oppFi].owner;
      if (rOw !== f.owner) {
        boundaryHEs.push({ u, v, leftOw: f.owner, rightOw: rOw });
      }
    }
  }
}

// Step 6: Extract shared boundary arcs ONCE per pair, gently simplify hairpins & micro-jitter
// with guaranteed zero intersection, and snap final output vertices onto exact 5-decimal grid (1e-5 deg).
const bPairKey = (he) => {
  const a = he.leftOw;
  const b = he.rightOw;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
};

// Build undirected boundary edge list + vertex incidence for identifying junction nodes
const uEdgeMap = new Map();
const bVertexPairs = new Map(); // vid -> Set of pairKeys
const bVertexDeg = new Map(); // vid -> total incident undirected boundary edges
for (const he of boundaryHEs) {
  const a = he.u;
  const b = he.v;
  const ek = a < b ? `${a}_${b}` : `${b}_${a}`;
  const pk = bPairKey(he);
  if (!uEdgeMap.has(ek)) {
    uEdgeMap.set(ek, { u: he.u, v: he.v, leftOw: he.leftOw, rightOw: he.rightOw, pk });
    bVertexDeg.set(a, (bVertexDeg.get(a) || 0) + 1);
    bVertexDeg.set(b, (bVertexDeg.get(b) || 0) + 1);
    if (!bVertexPairs.has(a)) bVertexPairs.set(a, new Set());
    if (!bVertexPairs.has(b)) bVertexPairs.set(b, new Set());
    bVertexPairs.get(a).add(pk);
    bVertexPairs.get(b).add(pk);
  }
}

const isJunction = (vid) => (bVertexDeg.get(vid) || 0) !== 2 || (bVertexPairs.get(vid)?.size || 0) !== 1;

// Build adjacency of oriented boundary half-edges along identical (leftOw, rightOw) borders
const bAdjOut = new Map();
for (const e of uEdgeMap.values()) {
  if (!bAdjOut.has(e.u)) bAdjOut.set(e.u, []);
  bAdjOut.get(e.u).push(e);
}
const bUndirAdj = new Map();
for (const e of uEdgeMap.values()) {
  if (!bUndirAdj.has(e.u)) bUndirAdj.set(e.u, []);
  if (!bUndirAdj.has(e.v)) bUndirAdj.set(e.v, []);
  bUndirAdj.get(e.u).push(e);
  bUndirAdj.get(e.v).push({ u: e.v, v: e.u, leftOw: e.rightOw, rightOw: e.leftOw, pk: e.pk });
}

const usedUndir = new Set();
const arcs = []; // { pts: [x,y][], leftOw, rightOw, closed }

for (const startEdge of uEdgeMap.values()) {
  const ekStart = startEdge.u < startEdge.v ? `${startEdge.u}_${startEdge.v}` : `${startEdge.v}_${startEdge.u}`;
  if (usedUndir.has(ekStart)) continue;

  // First extract open arcs starting at junctions
  if (!isJunction(startEdge.u) && !isJunction(startEdge.v)) continue;

  const anchorU = isJunction(startEdge.u) ? startEdge.u : startEdge.v;
  let edge = anchorU === startEdge.u
    ? startEdge
    : { u: startEdge.v, v: startEdge.u, leftOw: startEdge.rightOw, rightOw: startEdge.leftOw, pk: startEdge.pk };

  const nodeIds = [edge.u];
  const leftOw = edge.leftOw;
  const rightOw = edge.rightOw;
  while (edge) {
    const ek = edge.u < edge.v ? `${edge.u}_${edge.v}` : `${edge.v}_${edge.u}`;
    if (usedUndir.has(ek)) break;
    usedUndir.add(ek);
    nodeIds.push(edge.v);
    if (isJunction(edge.v)) break;
    const cands = bUndirAdj.get(edge.v) || [];
    const next = cands.find((c) => {
      const ck = c.u < c.v ? `${c.u}_${c.v}` : `${c.v}_${c.u}`;
      return !usedUndir.has(ck) && c.leftOw === edge.leftOw && c.rightOw === edge.rightOw;
    });
    edge = next || null;
  }
  if (nodeIds.length >= 2) {
    arcs.push({ nodeIds, leftOw, rightOw, closed: false });
  }
}

// Then extract isolated closed loops (e.g. islands or single-enclave circles with 0 junctions)
for (const startEdge of uEdgeMap.values()) {
  const ekStart = startEdge.u < startEdge.v ? `${startEdge.u}_${startEdge.v}` : `${startEdge.v}_${startEdge.u}`;
  if (usedUndir.has(ekStart)) continue;
  let edge = startEdge;
  const nodeIds = [edge.u];
  const leftOw = edge.leftOw;
  const rightOw = edge.rightOw;
  while (edge) {
    const ek = edge.u < edge.v ? `${edge.u}_${edge.v}` : `${edge.v}_${edge.u}`;
    if (usedUndir.has(ek)) break;
    usedUndir.add(ek);
    nodeIds.push(edge.v);
    if (edge.v === startEdge.u) break;
    const cands = bUndirAdj.get(edge.v) || [];
    const next = cands.find((c) => {
      const ck = c.u < c.v ? `${c.u}_${c.v}` : `${c.v}_${c.u}`;
      return !usedUndir.has(ck) && c.leftOw === edge.leftOw && c.rightOw === edge.rightOw;
    });
    edge = next || null;
  }
  if (nodeIds.length >= 2) {
    arcs.push({ nodeIds, leftOw, rightOw, closed: true });
  }
}

// Build snapped-1e5 coordinates per arc & test segment spatial index before collapsing spikes
const arcCoords = arcs.map((a) => ({
  pts: a.nodeIds.map((id) => [Math.round(verts[id][0]), Math.round(verts[id][1])]),
  leftOw: a.leftOw,
  rightOw: a.rightOw,
  closed: a.closed || a.nodeIds[0] === a.nodeIds[a.nodeIds.length - 1],
}));

// Spatial check against ALL current arc segments to ensure collapsing an interior vertex creates ZERO intersections
function arcIndexGrid(allArcCoords) {
  const CELL = 2000;
  const g = new Map();
  for (let ai = 0; ai < allArcCoords.length; ai++) {
    const pts = allArcCoords[ai].pts;
    for (let si = 0; si < pts.length - 1; si++) {
      const a = pts[si];
      const b = pts[si + 1];
      if (a[0] === b[0] && a[1] === b[1]) continue;
      const gx0 = Math.floor(Math.min(a[0], b[0]) / CELL);
      const gx1 = Math.floor(Math.max(a[0], b[0]) / CELL);
      const gy0 = Math.floor(Math.min(a[1], b[1]) / CELL);
      const gy1 = Math.floor(Math.max(a[1], b[1]) / CELL);
      for (let gx = gx0; gx <= gx1; gx++) {
        for (let gy = gy0; gy <= gy1; gy++) {
          const k = `${gx},${gy}`;
          if (!g.has(k)) g.set(k, []);
          g.get(k).push([ai, si]);
        }
      }
    }
  }
  return g;
}

function shortcutIsSafe(allArcCoords, grid, ai, prevIdx, nextIdx) {
  const CELL = 2000;
  const arcPts = allArcCoords[ai].pts;
  const A = arcPts[prevIdx];
  const B = arcPts[nextIdx];
  if (A[0] === B[0] && A[1] === B[1]) return true;
  const gx0 = Math.floor(Math.min(A[0], B[0]) / CELL);
  const gx1 = Math.floor(Math.max(A[0], B[0]) / CELL);
  const gy0 = Math.floor(Math.min(A[1], B[1]) / CELL);
  const gy1 = Math.floor(Math.max(A[1], B[1]) / CELL);

  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gy = gy0; gy <= gy1; gy++) {
      const bucket = grid.get(`${gx},${gy}`);
      if (!bucket) continue;
      for (const [oai, osi] of bucket) {
        if (oai === ai && (osi === prevIdx || osi === prevIdx + 1 || osi === prevIdx - 1 || osi === nextIdx)) {
          continue;
        }
        const opts = allArcCoords[oai].pts;
        if (osi + 1 >= opts.length) continue;
        const C = opts[osi];
        const D = opts[osi + 1];
        if (C[0] === D[0] && C[1] === D[1]) continue;
        // Triangle formed by removing vertex prevIdx+1 must also not capture external vertices
        if (segmentsStrictlyCrossOrTouch(A[0], A[1], B[0], B[1], C[0], C[1], D[0], D[1])) {
          return false;
        }
      }
    }
  }
  // Check vertex containment inside triangle (A, removed, B) from any nearby vertex
  const V = arcPts[prevIdx + 1];
  const triMinX = Math.min(A[0], V[0], B[0]);
  const triMaxX = Math.max(A[0], V[0], B[0]);
  const triMinY = Math.min(A[1], V[1], B[1]);
  const triMaxY = Math.max(A[1], V[1], B[1]);
  const tri = [A, V, B, A];
  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gy = gy0; gy <= gy1; gy++) {
      const bucket = grid.get(`${gx},${gy}`);
      if (!bucket) continue;
      for (const [oai, osi] of bucket) {
        const opts = allArcCoords[oai].pts;
        for (const P of [opts[osi], opts[osi + 1]]) {
          if (!P) continue;
          if (P[0] < triMinX || P[0] > triMaxX || P[1] < triMinY || P[1] > triMaxY) continue;
          if ((P[0] === A[0] && P[1] === A[1]) || (P[0] === B[0] && P[1] === B[1]) || (P[0] === V[0] && P[1] === V[1])) {
            continue;
          }
          if (pointInRing(P[0], P[1], tri)) return false;
        }
      }
    }
  }
  return true;
}

// First deduplicate consecutive identical 1e5 points inside each arc
for (const arc of arcCoords) {
  const ded = [arc.pts[0]];
  for (let i = 1; i < arc.pts.length; i++) {
    const prev = ded[ded.length - 1];
    const cur = arc.pts[i];
    if (cur[0] !== prev[0] || cur[1] !== prev[1]) ded.push(cur);
  }
  arc.pts = ded;
}

// Remove collinear micro-jitter & short acute needle spikes safely on interior vertices
let removedSpikes = 0;
const gridForSimplify = arcIndexGrid(arcCoords);
for (let ai = 0; ai < arcCoords.length; ai++) {
  const arc = arcCoords[ai];
  const minPts = arc.closed ? 5 : 3;
  let i = 1;
  while (i < arc.pts.length - 1 && arc.pts.length >= minPts) {
    const a = arc.pts[i - 1];
    const v = arc.pts[i];
    const b = arc.pts[i + 1];
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const abLen = Math.hypot(abx, aby);
    const vaLen = Math.hypot(a[0] - v[0], a[1] - v[1]);
    const vbLen = Math.hypot(b[0] - v[0], b[1] - v[1]);
    const cross = Math.abs((v[0] - a[0]) * aby - (v[1] - a[1]) * abx);
    const perp = abLen > 0 ? cross / abLen : vaLen;
    let isHairpin = false;
    if (vaLen > 0 && vbLen > 0 && vaLen < 400 && vbLen < 400) {
      const cos = ((a[0] - v[0]) * (b[0] - v[0]) + (a[1] - v[1]) * (b[1] - v[1])) / (vaLen * vbLen);
      if (cos > 0.978) isHairpin = true; // < ~12 deg needle spike
    }
    if ((perp < 12 && abLen > 0 && vaLen < 400 && vbLen < 400) || isHairpin) {
      if (shortcutIsSafe(arcCoords, gridForSimplify, ai, i - 1, i + 1)) {
        arc.pts.splice(i, 1);
        removedSpikes++;
        if (i > 1) i--;
        continue;
      }
    }
    i++;
  }
}

// Step 7: Emit canonical half-edge sets per unit across 973 ilçeler, 87 districts, and 81 provinces
function addDirectedArcEdges(targetList, pts, reverse) {
  if (!reverse) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ux, uy] = pts[i];
      const [vx, vy] = pts[i + 1];
      if (ux === vx && uy === vy) continue;
      targetList.push([`${ux},${uy}`, `${vx},${vy}`, ux, uy, vx, vy]);
    }
  } else {
    for (let i = pts.length - 1; i > 0; i--) {
      const [ux, uy] = pts[i];
      const [vx, vy] = pts[i - 1];
      if (ux === vx && uy === vy) continue;
      targetList.push([`${ux},${uy}`, `${vx},${vy}`, ux, uy, vx, vy]);
    }
  }
}

const ilceEdges = ilceMeta.map(() => []);
const distMap = new Map(baseline2023.districts.map((d) => [d.id, d]));
const provMap = new Map(baseline2023.provinces.map((p) => [p.id, p]));
const distEdges = new Map(baseline2023.districts.map((d) => [d.id, []]));
const provEdges = new Map(baseline2023.provinces.map((p) => [p.id, []]));

for (const arc of arcCoords) {
  const { pts, leftOw, rightOw } = arc;
  // leftOw sees pts forward (CCW interior on left)
  if (leftOw >= 0) {
    addDirectedArcEdges(ilceEdges[leftOw], pts, false);
  }
  // rightOw sees pts reversed (CCW interior on left) if land
  if (rightOw >= 0) {
    addDirectedArcEdges(ilceEdges[rightOw], pts, true);
  }

  const lIlce = leftOw >= 0 ? ilceMeta[leftOw].ilce : null;
  const rIlce = rightOw >= 0 ? ilceMeta[rightOw].ilce : null;

  // District borders: cancel internal edges between two ilçeler in same district
  if (lIlce?.districtId !== rIlce?.districtId) {
    if (lIlce) addDirectedArcEdges(distEdges.get(lIlce.districtId), pts, false);
    if (rIlce) addDirectedArcEdges(distEdges.get(rIlce.districtId), pts, true);
  }

  // Province borders: cancel internal edges between two ilçeler in same province
  if (lIlce?.ilId !== rIlce?.ilId) {
    if (lIlce) addDirectedArcEdges(provEdges.get(lIlce.ilId), pts, false);
    if (rIlce) addDirectedArcEdges(provEdges.get(rIlce.ilId), pts, true);
  }
}

// Build final GeoJSON FeatureCollections + self-check zero self-intersections & zero bogus holes
function ringSelfIntersectsDeg(ring) {
  const intR = ring.map(([x, y]) => [Math.round(x * SCALE), Math.round(y * SCALE)]);
  const n = intR.length - 1;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a = intR[i],
      b = intR[i + 1];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const c = intR[j],
        d = intR[j + 1];
      if (segmentsStrictlyCrossOrTouch(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1])) {
        return true;
      }
    }
  }
  return false;
}

const cleanIlceFeatures = [];
let ilceHoles = 0;
let selfXCount = 0;
for (const meta of ilceMeta) {
  const geom = buildD3GeometryFromHalfEdges(ilceEdges[meta.idx]);
  const ps = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const p of ps) {
    ilceHoles += p.length - 1;
    if (ringSelfIntersectsDeg(p[0])) selfXCount++;
    for (let h = 1; h < p.length; h++) if (ringSelfIntersectsDeg(p[h])) selfXCount++;
  }
  const area = geoArea({ type: 'Feature', properties: {}, geometry: geom });
  if (!(area > 1e-8 && area < 0.5)) {
    throw new Error(`Invalid area for ilce ${meta.ilce.id}: ${area}`);
  }
  const [cLng, cLat] = geoCentroid({ type: 'Feature', properties: {}, geometry: geom });
  meta.ilce.lat = Number(cLat.toFixed(4));
  meta.ilce.lng = Number(cLng.toFixed(4));
  cleanIlceFeatures.push({
    type: 'Feature',
    properties: {
      id: meta.ilce.id,
      name: meta.ilce.name,
      ilId: meta.ilce.ilId,
      districtId: meta.ilce.districtId,
      lat: meta.ilce.lat,
      lng: meta.ilce.lng,
    },
    geometry: geom,
  });
}

const cleanDistrictFeatures87 = [];
let distHoles = 0;
for (const dConfig of baseline2023.districts) {
  const geom = buildD3GeometryFromHalfEdges(distEdges.get(dConfig.id));
  const ps = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const p of ps) {
    distHoles += p.length - 1;
    if (ringSelfIntersectsDeg(p[0])) selfXCount++;
  }
  const area = geoArea({ type: 'Feature', properties: {}, geometry: geom });
  if (!(area > 1e-8 && area < 0.5)) {
    throw new Error(`Invalid area for district ${dConfig.id}: ${area}`);
  }
  const [cLng, cLat] = geoCentroid({ type: 'Feature', properties: {}, geometry: geom });
  cleanDistrictFeatures87.push({
    type: 'Feature',
    properties: {
      id: dConfig.id,
      ilId: dConfig.ilId,
      name: dConfig.name,
      mpCount: dConfig.mpCount,
      lat: Number(cLat.toFixed(4)),
      lng: Number(cLng.toFixed(4)),
    },
    geometry: geom,
  });
}

const cleanProvinceFeatures = [];
let provHoles = 0;
for (const prov of baseline2023.provinces) {
  const geom = buildD3GeometryFromHalfEdges(provEdges.get(prov.id));
  const ps = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const p of ps) {
    provHoles += p.length - 1;
    if (ringSelfIntersectsDeg(p[0])) selfXCount++;
  }
  const area = geoArea({ type: 'Feature', properties: {}, geometry: geom });
  if (!(area > 1e-8 && area < 0.5)) {
    throw new Error(`Invalid area for province ${prov.id}: ${area}`);
  }
  const [cLng, cLat] = geoCentroid({ type: 'Feature', properties: {}, geometry: geom });
  cleanProvinceFeatures.push({
    type: 'Feature',
    properties: {
      id: prov.id,
      plateCode: prov.plateCode,
      name: prov.name,
      region: prov.region,
      districtIds: prov.districtIds,
      lat: Number(cLat.toFixed(4)),
      lng: Number(cLng.toFixed(4)),
    },
    geometry: geom,
  });
}

cleanProvinceFeatures.sort((a, b) => a.properties.plateCode - b.properties.plateCode);

if (
  cleanIlceFeatures.length !== 973 ||
  cleanDistrictFeatures87.length !== 87 ||
  cleanProvinceFeatures.length !== 81
) {
  throw new Error(
    `Feature count mismatch: prov=${cleanProvinceFeatures.length}, dist=${cleanDistrictFeatures87.length}, ilce=${cleanIlceFeatures.length}`
  );
}
for (const reqIsland of STANDALONE_ISLAND_IDS) {
  if (!cleanIlceFeatures.some((f) => f.properties.id === reqIsland)) {
    throw new Error(`Missing required standalone island ilce: ${reqIsland}`);
  }
}

// Check 0 holes on 87 districts & 81 provinces (all enclaves like 50-gulsehir inside 50-acigol stay in same province/district)
if (distHoles !== 0 || provHoles !== 0 || ilceHoles > 1) {
  console.warn(`Warning: unexpected holes count ilceHoles=${ilceHoles}, distHoles=${distHoles}, provHoles=${provHoles}`);
}

// Update centroids in baseline2023 and baseline2024
const coordMap = {};
for (const ilce of baseline2023.ilceler) {
  coordMap[ilce.id] = { lat: ilce.lat, lng: ilce.lng };
}
for (const ilce24 of baseline2024.ilceler) {
  if (coordMap[ilce24.id]) {
    ilce24.lat = coordMap[ilce24.id].lat;
    ilce24.lng = coordMap[ilce24.id].lng;
  }
}

fs.writeFileSync(path.resolve('src/data/baseline2023.json'), JSON.stringify(baseline2023));
fs.writeFileSync(path.resolve('src/data/baseline2024.json'), JSON.stringify(baseline2024));

fs.writeFileSync(
  path.resolve('public/tr-provinces.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: cleanProvinceFeatures })
);
fs.writeFileSync(
  path.resolve('public/tr-districts-87.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: cleanDistrictFeatures87 })
);
fs.writeFileSync(
  path.resolve('public/tr-ilceler.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: cleanIlceFeatures })
);

const dSizeKb = (fs.statSync(path.resolve('public/tr-districts-87.geojson')).size / 1024).toFixed(1);
const pSizeKb = (fs.statSync(path.resolve('public/tr-provinces.geojson')).size / 1024).toFixed(1);
const iSizeKb = (fs.statSync(path.resolve('public/tr-ilceler.geojson')).size / 1024).toFixed(1);

console.log(
  `Watertight shared-arc build in ${Date.now() - tStart}ms: ${cleanProvinceFeatures.length} provinces (${pSizeKb} KB), ${cleanDistrictFeatures87.length} districts (${dSizeKb} KB), ${cleanIlceFeatures.length} ilçeler (${iSizeKb} KB) | holes(p/d/i)=${provHoles}/${distHoles}/${ilceHoles} | removedSpikes=${removedSpikes} | selfX=${selfXCount}`
);
