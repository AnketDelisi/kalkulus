import { geoArea, geoCentroid } from 'd3-geo';
import * as polygonClippingMod from 'polygon-clipping';
import type {
  MultiPolygon as PCMultiPolygon,
  Pair as PCPair,
  Polygon as PCPolygon,
} from 'polygon-clipping';
import type { ArchiveElectionConfig } from '../data/archiveRegistry';
import { ARCHIVE_ELECTIONS } from '../data/archiveRegistry';
import type { GeoCollection, GeoFeature } from '../data/geoCache';
import type { ArchiveElectionId } from '../types/election';

type PCModule = typeof polygonClippingMod & { default?: typeof polygonClippingMod };
const pcUnion = ((polygonClippingMod as PCModule).default ?? polygonClippingMod).union;

type LngLat = [number, number];
type Ring = LngLat[];
type PolygonCoords = Ring[];
type MultiPolygonCoords = PolygonCoords[];
type BBox = [number, number, number, number]; // [minX, minY, maxX, maxY]

const GRID_SCALE = 1e5;
const OUTER_SLIVER_SR = 1e-9; // Preserves standalone island ilçeler (e.g. 34-adalar) while dropping sub-nanosteradian rounding dust
const HOLE_SLIVER_SR = 5e-8; // Minimum retained interior enclave hole area
const COINCIDENT_EPS_DEG = 1e-9;

function ringBBox(ring: ReadonlyArray<ReadonlyArray<number>>): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < ring.length; i++) {
    const x = ring[i][0];
    const y = ring[i][1];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/**
 * Shoelace 2D signed area on lon/lat plane.
 * Positive => CCW in lon/lat; Negative => CW in lon/lat (`d3-geo` exterior winding).
 */
export function signedArea2D(ring: ReadonlyArray<ReadonlyArray<number>>): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return sum * 0.5;
}

function cleanRing(raw: ReadonlyArray<ReadonlyArray<number>>, wantCCW: boolean | null): Ring | null {
  if (!raw || raw.length < 3) return null;
  const deduped: Ring = [];
  for (let i = 0; i < raw.length; i++) {
    const pt = raw[i];
    const x = Number(pt[0]);
    const y = Number(pt[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (deduped.length > 0) {
      const prev = deduped[deduped.length - 1];
      if (
        Math.abs(x - prev[0]) <= COINCIDENT_EPS_DEG &&
        Math.abs(y - prev[1]) <= COINCIDENT_EPS_DEG
      ) {
        continue;
      }
    }
    deduped.push([x, y]);
  }
  if (deduped.length < 3) return null;
  const first = deduped[0];
  const last = deduped[deduped.length - 1];
  if (
    Math.abs(first[0] - last[0]) > COINCIDENT_EPS_DEG ||
    Math.abs(first[1] - last[1]) > COINCIDENT_EPS_DEG
  ) {
    deduped.push([first[0], first[1]]);
  } else {
    deduped[deduped.length - 1] = [first[0], first[1]];
  }
  if (deduped.length < 4) return null;

  const area2d = signedArea2D(deduped);
  if (Math.abs(area2d) < 1e-13) return null;
  if (wantCCW === true && area2d < 0) deduped.reverse();
  if (wantCCW === false && area2d > 0) deduped.reverse();
  return deduped;
}

function ringSphericalArea(cwRing: Ring): number {
  const a = geoArea({
    type: 'Polygon',
    coordinates: [cwRing],
  } as unknown as Parameters<typeof geoArea>[0]);
  return a > Math.PI ? 4 * Math.PI - a : a;
}

function pointInRing(px: number, py: number, ring: ReadonlyArray<ReadonlyArray<number>>): boolean {
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

function interiorPointOfRing(ring: ReadonlyArray<ReadonlyArray<number>>): LngLat {
  let minY = Infinity;
  let maxY = -Infinity;
  let cx = 0;
  let cy = 0;
  const n = Math.max(1, ring.length - 1);
  for (let i = 0; i < ring.length - 1; i++) {
    cx += ring[i][0];
    cy += ring[i][1];
    if (ring[i][1] < minY) minY = ring[i][1];
    if (ring[i][1] > maxY) maxY = ring[i][1];
  }
  cx /= n;
  cy /= n;
  if (pointInRing(cx, cy, ring)) return [cx, cy];

  for (const frac of [0.5, 0.37, 0.63, 0.25, 0.75, 0.15, 0.85, 0.08, 0.92]) {
    const y = minY + (maxY - minY) * frac;
    const xs: number[] = [];
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      if ((y1 > y) !== (y2 > y)) {
        xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      if (xs[k + 1] - xs[k] > 1e-8) {
        const mx = (xs[k] + xs[k + 1]) * 0.5;
        if (pointInRing(mx, y, ring)) return [mx, y];
      }
    }
  }
  return [cx, cy];
}

function extractInputPolygons(features: GeoFeature[]): PCPolygon[] {
  const polygons: PCPolygon[] = [];
  for (let featIdx = 0; featIdx < features.length; featIdx++) {
    const geom = features[featIdx]?.geometry as
      | { type?: string; coordinates?: unknown }
      | null
      | undefined;
    if (!geom || !geom.coordinates) continue;

    const rawPolys: unknown[] =
      geom.type === 'Polygon'
        ? [geom.coordinates]
        : geom.type === 'MultiPolygon'
        ? (geom.coordinates as unknown[])
        : [];

    for (const rawPoly of rawPolys) {
      if (!Array.isArray(rawPoly) || rawPoly.length === 0) continue;
      // Prepare RFC-7946 planar winding (CCW outer, CW holes)
      const outer = cleanRing(rawPoly[0] as ReadonlyArray<ReadonlyArray<number>>, true);
      if (!outer) continue;
      const pcPoly: PCPolygon = [outer as PCPair[]];
      for (let h = 1; h < rawPoly.length; h++) {
        const hole = cleanRing(rawPoly[h] as ReadonlyArray<ReadonlyArray<number>>, false);
        if (hole) pcPoly.push(hole as PCPair[]);
      }
      polygons.push(pcPoly);
    }
  }
  return polygons;
}

function quantKey(pt: ReadonlyArray<number>): string {
  return `${Math.round(pt[0] * GRID_SCALE)},${Math.round(pt[1] * GRID_SCALE)}`;
}

function ringHasSelfIntersection(ring: Ring): boolean {
  const n = ring.length - 1;
  if (n < 4) return false;
  const orient = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    const minAX = a[0] < b[0] ? a[0] : b[0];
    const maxAX = a[0] > b[0] ? a[0] : b[0];
    const minAY = a[1] < b[1] ? a[1] : b[1];
    const maxAY = a[1] > b[1] ? a[1] : b[1];

    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const c = ring[j];
      const d = ring[j + 1];
      const minCX = c[0] < d[0] ? c[0] : d[0];
      const maxCX = c[0] > d[0] ? c[0] : d[0];
      if (maxAX <= minCX || maxCX <= minAX) continue;
      const minCY = c[1] < d[1] ? c[1] : d[1];
      const maxCY = c[1] > d[1] ? c[1] : d[1];
      if (maxAY <= minCY || maxCY <= minAY) continue;

      const o1 = orient(a[0], a[1], b[0], b[1], c[0], c[1]);
      const o2 = orient(a[0], a[1], b[0], b[1], d[0], d[1]);
      const o3 = orient(c[0], c[1], d[0], d[1], a[0], a[1]);
      const o4 = orient(c[0], c[1], d[0], d[1], b[0], b[1]);
      if (
        ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
        ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Fast exact directed half-edge cancellation for watertight mesh-aligned features
 * (`tr-ilceler.geojson`). Cancels every shared `(u->v)` / `(v->u)` internal seam
 * in O(V) without introducing bridge quads or new vertices, then traces simple rings
 * via sharpest-left-turn walking.
 * Returns `null` if inputs are not mesh-disjoint (e.g. overlapping synthetic test polys).
 */
function dissolveMeshPolygons(polygons: PCPolygon[]): MultiPolygonCoords | null {
  if (polygons.length === 0) return [];

  const coordsByKey = new Map<string, LngLat>();
  // Net signed count per canonical undirected key (`uKey < vKey`):
  // +1 per `uKey -> vKey` edge, -1 per `vKey -> uKey` edge
  const netEdgeCount = new Map<
    string,
    { uKey: string; vKey: string; count: number }
  >();
  let totalInputSr = 0;

  for (const poly of polygons) {
    const outerCW = [...(poly[0] as Ring)].reverse();
    totalInputSr += ringSphericalArea(outerCW);
    for (let h = 1; h < poly.length; h++) {
      totalInputSr -= ringSphericalArea(poly[h] as Ring);
    }

    for (const rawRing of poly) {
      const ring = rawRing as Ring;
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i];
        const b = ring[i + 1];
        const ak = quantKey(a);
        const bk = quantKey(b);
        if (ak === bk) continue;
        if (!coordsByKey.has(ak)) {
          coordsByKey.set(ak, [
            Math.round(a[0] * GRID_SCALE) / GRID_SCALE,
            Math.round(a[1] * GRID_SCALE) / GRID_SCALE,
          ]);
        }
        if (!coordsByKey.has(bk)) {
          coordsByKey.set(bk, [
            Math.round(b[0] * GRID_SCALE) / GRID_SCALE,
            Math.round(b[1] * GRID_SCALE) / GRID_SCALE,
          ]);
        }
        const forward = ak < bk;
        const ek = forward ? `${ak}|${bk}` : `${bk}|${ak}`;
        let entry = netEdgeCount.get(ek);
        if (!entry) {
          entry = { uKey: forward ? ak : bk, vKey: forward ? bk : ak, count: 0 };
          netEdgeCount.set(ek, entry);
        }
        entry.count += forward ? 1 : -1;
      }
    }
  }

  const outByKey = new Map<string, string[]>();
  for (const entry of netEdgeCount.values()) {
    if (entry.count === 0) continue;
    // Overlapping / duplicate faces produce multiplicity > 1 along same boundary direction -> use boolean fallback
    if (Math.abs(entry.count) > 1) return null;
    const from = entry.count > 0 ? entry.uKey : entry.vKey;
    const to = entry.count > 0 ? entry.vKey : entry.uKey;
    let list = outByKey.get(from);
    if (!list) {
      list = [];
      outByKey.set(from, list);
    }
    list.push(to);
  }

  // Sort outgoing targets CCW around each vertex for sharpest-left walking
  for (const [uK, targets] of outByKey.entries()) {
    if (targets.length <= 1) continue;
    const [ux, uy] = coordsByKey.get(uK)!;
    targets.sort((aK, bK) => {
      const [ax, ay] = coordsByKey.get(aK)!;
      const [bx, by] = coordsByKey.get(bK)!;
      return Math.atan2(ay - uy, ax - ux) - Math.atan2(by - uy, bx - ux);
    });
  }

  const usedEdges = new Set<string>();
  const loops: {
    ringCCW: Ring;
    area2D: number;
    areaSr: number;
    bbox: BBox;
    probe: LngLat;
  }[] = [];

  for (const [u0, targets] of outByKey.entries()) {
    for (const v0 of targets) {
      const startHE = `${u0}>${v0}`;
      if (usedEdges.has(startHE)) continue;

      const cycle: string[] = [u0];
      let prev = u0;
      let curr = v0;
      let guard = 0;

      while (guard++ < 200000) {
        const he = `${prev}>${curr}`;
        if (usedEdges.has(he)) break;
        usedEdges.add(he);
        cycle.push(curr);

        if (curr === u0) break;

        const cands = outByKey.get(curr);
        if (!cands || cands.length === 0) {
          // Open dangle -> not a clean watertight mesh
          return null;
        }
        if (cands.length === 1) {
          if (usedEdges.has(`${curr}>${cands[0]}`)) return null;
          prev = curr;
          curr = cands[0];
          continue;
        }

        const [px, py] = coordsByKey.get(prev)!;
        const [cx, cy] = coordsByKey.get(curr)!;
        const backAngle = Math.atan2(py - cy, px - cx);
        let bestNext: string | null = null;
        let bestSweep = Infinity;
        for (const nK of cands) {
          if (usedEdges.has(`${curr}>${nK}`)) continue;
          const [nx, ny] = coordsByKey.get(nK)!;
          let cwSweep = backAngle - Math.atan2(ny - cy, nx - cx);
          while (cwSweep <= 0) cwSweep += 2 * Math.PI;
          if (cwSweep < bestSweep) {
            bestSweep = cwSweep;
            bestNext = nK;
          }
        }
        if (!bestNext) return null;
        prev = curr;
        curr = bestNext;
      }

      if (cycle.length < 4 || cycle[0] !== cycle[cycle.length - 1]) {
        return null;
      }

      const ring = cleanRing(
        cycle.map((k) => coordsByKey.get(k)!),
        null
      );
      if (!ring) continue;
      if (ringHasSelfIntersection(ring)) return null;

      const area2D = signedArea2D(ring);
      const cwForArea = area2D > 0 ? ([...ring].reverse() as Ring) : ring;
      const areaSr = ringSphericalArea(cwForArea);
      if (areaSr <= OUTER_SLIVER_SR || areaSr >= Math.PI) continue;

      loops.push({
        ringCCW: ring,
        area2D,
        areaSr,
        bbox: ringBBox(ring),
        probe: interiorPointOfRing(ring),
      });
    }
  }

  const outers: {
    outerCW: Ring;
    outerCCW: Ring;
    areaSr: number;
    bbox: BBox;
    holesCCW: Ring[];
  }[] = [];
  const holes: typeof loops = [];

  for (const lp of loops) {
    if (lp.area2D > 0) {
      outers.push({
        outerCW: [...lp.ringCCW].reverse() as Ring,
        outerCCW: lp.ringCCW,
        areaSr: lp.areaSr,
        bbox: lp.bbox,
        holesCCW: [],
      });
    } else {
      holes.push(lp);
    }
  }

  let dissolvedSr = outers.reduce((s, o) => s + o.areaSr, 0);
  for (const h of holes) {
    if (h.areaSr < HOLE_SLIVER_SR) continue;
    const containers: number[] = [];
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
        containers.push(i);
      }
    }
    if (containers.length === 0) {
      // CW loop outside all outers indicates inverted/overlapping input -> use boolean union fallback
      return null;
    }
    containers.sort((a, b) => outers[a].areaSr - outers[b].areaSr);
    outers[containers[0]].holesCCW.push([...h.ringCCW].reverse() as Ring);
    dissolvedSr -= h.areaSr;
  }

  if (
    outers.length === 0 ||
    Math.abs(dissolvedSr - totalInputSr) > Math.max(1e-7, totalInputSr * 0.02)
  ) {
    return null;
  }

  return outers.map((o) => [o.outerCW, ...o.holesCCW]);
}

function balancedUnion(geoms: PCMultiPolygon[]): PCMultiPolygon {
  if (geoms.length === 0) return [];
  let layer = geoms.filter((g) => g.length > 0);
  if (layer.length === 0) return [];
  while (layer.length > 1) {
    const next: PCMultiPolygon[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 >= layer.length) {
        next.push(layer[i]);
      } else {
        next.push(pcUnion(layer[i], layer[i + 1]));
      }
    }
    layer = next;
  }
  return layer[0];
}

/**
 * Normalizes a union result to `d3-geo` spherical convention:
 * - Outer rings CW (`signedArea2D < 0`), `OUTER_SLIVER_SR < geoArea < Math.PI`
 * - Interior holes CCW (`signedArea2D > 0`), dropping sub-`HOLE_SLIVER_SR` slivers
 */
function normalizeToD3Geo(multi: PCMultiPolygon): MultiPolygonCoords {
  const out: MultiPolygonCoords = [];

  for (const poly of multi) {
    if (!poly || poly.length === 0) continue;
    const outer = cleanRing(poly[0], false); // CW for d3-geo exterior
    if (!outer) continue;

    let outerArea = ringSphericalArea(outer);
    let fixedOuter = outer;
    if (ringSphericalArea(outer) > Math.PI) {
      fixedOuter = [...outer].reverse() as Ring;
      outerArea = ringSphericalArea(fixedOuter);
    }
    if (!(outerArea > OUTER_SLIVER_SR && outerArea < Math.PI)) {
      continue;
    }

    const rings: PolygonCoords = [fixedOuter];
    for (let h = 1; h < poly.length; h++) {
      const holeCCW = cleanRing(poly[h], true); // CCW for d3-geo hole
      if (!holeCCW) continue;
      const holeCW = [...holeCCW].reverse() as Ring;
      const holeArea = ringSphericalArea(holeCW);
      if (holeArea < HOLE_SLIVER_SR || holeArea >= Math.PI) continue;
      rings.push(holeCCW);
    }
    out.push(rings);
  }

  return out;
}

/**
 * Verifies every interior hole across an assembled GeoJSON layer against the
 * other features in that layer: keeps a hole ring ONLY if another distinct
 * feature has an interior point inside it (e.g. 1987 `16-1` inside `16-2`, or
 * `50-gulsehir`'s exclave inside `50-acigol`), eliminating spurious seam holes
 * such as `18` Çankırı or `42-3` Konya.
 */
export function pruneNonEnclaveHoles(features: GeoFeature[]): GeoFeature[] {
  let hasAnyHole = false;
  for (const f of features) {
    const geom = f.geometry as { type?: string; coordinates?: unknown } | null;
    if (!geom || !geom.coordinates) continue;
    const polys = (
      geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates
    ) as number[][][][];
    if (polys.some((p) => p.length > 1)) {
      hasAnyHole = true;
      break;
    }
  }
  if (!hasAnyHole) return features;

  const probes = features.map((f, idx) => {
    const geom = f.geometry as { type?: string; coordinates?: unknown } | null;
    const polys = (
      geom?.type === 'Polygon' ? [geom.coordinates] : geom?.coordinates ?? []
    ) as number[][][][];
    const pts: LngLat[] = [];
    for (const p of polys) {
      if (p[0] && p[0].length >= 4) pts.push(interiorPointOfRing(p[0]));
    }
    return { idx, pts };
  });

  return features.map((feat, idx) => {
    const geom = feat.geometry as { type?: string; coordinates?: unknown } | null;
    if (!geom || !geom.coordinates) return feat;
    const polys = (
      geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates
    ) as Ring[][];
    if (!polys.some((p) => p.length > 1)) return feat;

    let modified = false;
    const cleanedPolys: PolygonCoords[] = polys.map((poly) => {
      if (poly.length <= 1) return poly;
      const keptRings: Ring[] = [poly[0]];
      for (let h = 1; h < poly.length; h++) {
        const holeRing = poly[h];
        const hb = ringBBox(holeRing);
        let containsOtherFeature = false;
        for (const other of probes) {
          if (other.idx === idx) continue;
          for (const pt of other.pts) {
            if (pt[0] < hb[0] || pt[0] > hb[2] || pt[1] < hb[1] || pt[1] > hb[3]) {
              continue;
            }
            if (pointInRing(pt[0], pt[1], holeRing)) {
              containsOtherFeature = true;
              break;
            }
          }
          if (containsOtherFeature) break;
        }
        if (containsOtherFeature) {
          keptRings.push(holeRing);
        } else {
          modified = true;
        }
      }
      return keptRings;
    });

    if (!modified) return feat;
    return {
      ...feat,
      geometry:
        geom.type === 'Polygon'
          ? { type: 'Polygon', coordinates: cleanedPolys[0] }
          : { type: 'MultiPolygon', coordinates: cleanedPolys },
    };
  });
}

/**
 * Dissolves a group of GeoJSON features using exact directed half-edge
 * cancellation on watertight mesh inputs, falling back cleanly to micro-bridge-free
 * `polygon-clipping.union` for arbitrary overlapping inputs.
 */
export function dissolveGeoFeatures(
  features: GeoFeature[],
  properties: GeoFeature['properties'],
  _neighborPool?: GeoFeature[]
): GeoFeature {
  if (features.length === 0) {
    return {
      type: 'Feature',
      properties: { ...properties },
      geometry: { type: 'MultiPolygon', coordinates: [] },
    };
  }

  const polygons = extractInputPolygons(features);
  if (polygons.length === 0) {
    return {
      type: 'Feature',
      properties: { ...properties },
      geometry: { type: 'MultiPolygon', coordinates: [] },
    };
  }

  let normalized: MultiPolygonCoords | null = null;
  if (features.length === 1) {
    normalized = normalizeToD3Geo(polygons);
  } else {
    normalized = dissolveMeshPolygons(polygons);
    if (!normalized) {
      const unioned = balancedUnion(polygons.map((p) => [p]));
      normalized = normalizeToD3Geo(unioned);
    }
  }

  const geometry =
    normalized.length === 1
      ? { type: 'Polygon', coordinates: normalized[0] }
      : { type: 'MultiPolygon', coordinates: normalized };

  const outFeature: GeoFeature = {
    type: 'Feature',
    properties: { ...properties },
    geometry,
  };

  if (normalized.length > 0) {
    const centroid = geoCentroid(outFeature as unknown as Parameters<typeof geoCentroid>[0]);
    if (centroid && Number.isFinite(centroid[0]) && Number.isFinite(centroid[1])) {
      outFeature.properties = {
        ...outFeature.properties,
        lng: Number(centroid[0].toFixed(4)),
        lat: Number(centroid[1].toFixed(4)),
      };
    }
  }

  return outFeature;
}

interface CachedDynamicGeo {
  provincesGeo: GeoCollection | null;
  districts87Geo: GeoCollection | null;
  ilcelerGeo: GeoCollection | null;
  result: {
    provincesGeo: GeoCollection | null;
    districts87Geo: GeoCollection | null;
    ilcelerGeo: GeoCollection | null;
  };
}

const dynamicGeoCache = new Map<string, CachedDynamicGeo>();

/**
 * Computes dynamically merged and boundary-adjusted GeoJSON collections for an
 * archive election, cached by archive id and input collection object references.
 */
export function buildDynamicArchiveGeo(params: {
  archiveId: ArchiveElectionId | null;
  archive?: ArchiveElectionConfig;
  provincesGeo?: GeoCollection | null;
  districts87Geo?: GeoCollection | null;
  ilcelerGeo?: GeoCollection | null;
}): {
  provincesGeo: GeoCollection | null;
  districts87Geo: GeoCollection | null;
  ilcelerGeo: GeoCollection | null;
} {
  const {
    archiveId,
    provincesGeo = null,
    districts87Geo = null,
    ilcelerGeo = null,
  } = params;
  const archive = params.archive ?? (archiveId ? ARCHIVE_ELECTIONS[archiveId] : null);
  if (!archive) {
    return { provincesGeo, districts87Geo, ilcelerGeo };
  }

  const cacheKey = archive.id;
  const cached = dynamicGeoCache.get(cacheKey);
  if (
    cached &&
    cached.provincesGeo === provincesGeo &&
    cached.districts87Geo === districts87Geo &&
    cached.ilcelerGeo === ilcelerGeo
  ) {
    return cached.result;
  }

  const provMerge = archive.provinceMergeMap || {};
  const ilceProvOv = archive.ilceProvinceOverrides || {};
  const distOv = archive.districtOverrides || {};
  const distMerge = archive.districtMergeMap || {};
  const distRename = archive.districtRenameMap || {};
  const ilceMerge = archive.ilceMergeMap || {};
  const customDists = archive.customDistricts || [];

  const getHistIlId = (feat: GeoFeature): string => {
    const id = feat.properties.id;
    const origIl = feat.properties.ilId || '';
    return ilceProvOv[id] || provMerge[origIl] || origIl;
  };

  const customDistByIlceId = new Map<string, (typeof customDists)[number]>();
  for (const spec of customDists) {
    for (const ilceId of spec.ilceIds) {
      customDistByIlceId.set(ilceId, spec);
    }
  }

  const getHistDistId = (feat: GeoFeature): string => {
    const id = feat.properties.id;
    if (customDists.length > 0) {
      const spec = customDistByIlceId.get(id);
      if (spec) return spec.id;
    }
    const origIl = feat.properties.ilId || '';
    let dId = distOv[id] || feat.properties.districtId || origIl;
    if (distMerge[dId]) dId = distMerge[dId];
    if (distRename[dId]) dId = distRename[dId].id;
    if (provMerge[dId]) dId = provMerge[dId];
    return dId;
  };

  // 1. Historical ilçeler: apply ilceMergeMap merges via dissolveGeoFeatures and stamp historical IDs
  let outIlcelerGeo: GeoCollection | null = ilcelerGeo;
  if (ilcelerGeo) {
    const mergeGroups = new Map<string, GeoFeature[]>();
    const mergedOrder: string[] = [];
    for (const f of ilcelerGeo.features) {
      const targetId = ilceMerge[f.properties.id] || f.properties.id;
      if (!mergeGroups.has(targetId)) {
        mergeGroups.set(targetId, []);
        mergedOrder.push(targetId);
      }
      mergeGroups.get(targetId)!.push(f);
    }

    const updatedIlceler: GeoFeature[] = [];
    for (const targetId of mergedOrder) {
      const group = mergeGroups.get(targetId)!;
      const baseFeat = group.find((g) => g.properties.id === targetId) || group[0];
      const histIlId = getHistIlId(baseFeat);
      const histDistId = getHistDistId(baseFeat);
      if (group.length === 1) {
        const f = group[0];
        if (f.properties.ilId === histIlId && f.properties.districtId === histDistId) {
          updatedIlceler.push(f);
        } else {
          updatedIlceler.push({
            ...f,
            properties: {
              ...f.properties,
              ilId: histIlId,
              districtId: histDistId,
            },
          });
        }
      } else {
        updatedIlceler.push(
          dissolveGeoFeatures(group, {
            ...baseFeat.properties,
            id: targetId,
            ilId: histIlId,
            districtId: histDistId,
          })
        );
      }
    }
    outIlcelerGeo = {
      type: 'FeatureCollection',
      features: pruneNonEnclaveHoles(updatedIlceler),
    };
  }

  // Group raw ilceler by historical province & district for exact boundary dissolves
  const ilcesByHistProv = new Map<string, GeoFeature[]>();
  const ilcesByHistDist = new Map<string, GeoFeature[]>();
  if (ilcelerGeo) {
    for (const f of ilcelerGeo.features) {
      const hIl = getHistIlId(f);
      if (!ilcesByHistProv.has(hIl)) ilcesByHistProv.set(hIl, []);
      ilcesByHistProv.get(hIl)!.push(f);

      const hDist = getHistDistId(f);
      if (!ilcesByHistDist.has(hDist)) ilcesByHistDist.set(hDist, []);
      ilcesByHistDist.get(hDist)!.push(f);
    }
  }

  // 2. Districts GeoJSON
  let outDistrictsGeo: GeoCollection | null = districts87Geo;
  if (customDists.length > 0 && ilcelerGeo) {
    const customFeatures: GeoFeature[] = [];
    for (const spec of customDists) {
      const group = ilcesByHistDist.get(spec.id) || [];
      customFeatures.push(
        dissolveGeoFeatures(group, {
          id: spec.id,
          name: spec.name,
          ilId: spec.ilId,
          districtId: spec.id,
          mpCount: spec.mpCount,
          lat: group[0]?.properties.lat ?? 39,
          lng: group[0]?.properties.lng ?? 35,
        })
      );
    }
    outDistrictsGeo = {
      type: 'FeatureCollection',
      features: pruneNonEnclaveHoles(customFeatures),
    };
  } else if (
    districts87Geo &&
    (Object.keys(distOv).length > 0 ||
      Object.keys(distMerge).length > 0 ||
      Object.keys(distRename).length > 0 ||
      Object.keys(provMerge).length > 0 ||
      Object.keys(ilceProvOv).length > 0)
  ) {
    const touchedDists = new Set<string>();
    for (const srcIlceId of Object.keys(distOv)) {
      const origDist = ilcelerGeo?.features.find((f) => f.properties.id === srcIlceId)?.properties
        .districtId;
      if (origDist) touchedDists.add(distMerge[origDist] || distRename[origDist]?.id || origDist);
      const tgt = distOv[srcIlceId];
      touchedDists.add(distMerge[tgt] || distRename[tgt]?.id || tgt);
    }
    for (const [k, v] of Object.entries(distMerge)) {
      touchedDists.add(distRename[v]?.id || v);
      touchedDists.add(k);
    }
    for (const v of Object.values(distRename)) touchedDists.add(v.id);
    for (const v of Object.values(provMerge)) touchedDists.add(v);
    for (const v of Object.values(ilceProvOv)) touchedDists.add(v);

    const nextFeatures: GeoFeature[] = [];
    for (const dFeat of districts87Geo.features) {
      const origId = dFeat.properties.id;
      if (distMerge[origId] || provMerge[dFeat.properties.ilId || origId]) {
        continue;
      }
      const renamed = distRename[origId];
      const finalId = renamed ? renamed.id : origId;
      const finalName = renamed ? renamed.name : dFeat.properties.name;

      if (ilcelerGeo && (touchedDists.has(origId) || touchedDists.has(finalId))) {
        const group = ilcesByHistDist.get(finalId);
        if (group && group.length > 0) {
          nextFeatures.push(
            dissolveGeoFeatures(group, {
              ...dFeat.properties,
              id: finalId,
              name: finalName,
              districtId: finalId,
            })
          );
          continue;
        }
      }
      if (renamed) {
        nextFeatures.push({
          ...dFeat,
          properties: {
            ...dFeat.properties,
            id: finalId,
            name: finalName,
            districtId: finalId,
          },
        });
      } else {
        nextFeatures.push(dFeat);
      }
    }
    outDistrictsGeo = {
      type: 'FeatureCollection',
      features: pruneNonEnclaveHoles(nextFeatures),
    };
  }

  // Build active districtIds per province so province properties stay accurate
  const activeDistIdsByProv = new Map<string, string[]>();
  if (outDistrictsGeo) {
    for (const df of outDistrictsGeo.features) {
      const ilId = df.properties.ilId || '';
      if (!activeDistIdsByProv.has(ilId)) activeDistIdsByProv.set(ilId, []);
      activeDistIdsByProv.get(ilId)!.push(df.properties.id);
    }
  }

  // 3. Provinces GeoJSON
  let outProvincesGeo: GeoCollection | null = provincesGeo;
  const hasProvBoundaryChange =
    Object.keys(provMerge).length > 0 ||
    Object.keys(ilceProvOv).length > 0 ||
    customDists.length > 0 ||
    Object.keys(distMerge).length > 0;

  if (provincesGeo && hasProvBoundaryChange) {
    const affectedProvs = new Set<string>([
      ...Object.values(provMerge),
      ...Object.values(ilceProvOv),
    ]);
    if (ilcelerGeo) {
      for (const ilceId of Object.keys(ilceProvOv)) {
        const rawIl = ilcelerGeo.features.find((f) => f.properties.id === ilceId)?.properties.ilId;
        if (rawIl && !provMerge[rawIl]) affectedProvs.add(rawIl);
      }
    }

    const provFeatures: GeoFeature[] = [];
    for (const pFeat of provincesGeo.features) {
      const pId = pFeat.properties.id;
      if (provMerge[pId]) continue;

      const updatedDistIds = activeDistIdsByProv.get(pId) || pFeat.properties.districtIds;
      if (ilcelerGeo && affectedProvs.has(pId)) {
        const group = ilcesByHistProv.get(pId);
        if (group && group.length > 0) {
          provFeatures.push(
            dissolveGeoFeatures(group, {
              ...pFeat.properties,
              districtIds: updatedDistIds,
            })
          );
          continue;
        }
      }
      if (updatedDistIds !== pFeat.properties.districtIds) {
        provFeatures.push({
          ...pFeat,
          properties: {
            ...pFeat.properties,
            districtIds: updatedDistIds,
          },
        });
      } else {
        provFeatures.push(pFeat);
      }
    }
    outProvincesGeo = {
      type: 'FeatureCollection',
      features: pruneNonEnclaveHoles(provFeatures),
    };
  }

  const result = {
    provincesGeo: outProvincesGeo,
    districts87Geo: outDistrictsGeo,
    ilcelerGeo: outIlcelerGeo,
  };
  dynamicGeoCache.set(cacheKey, {
    provincesGeo,
    districts87Geo,
    ilcelerGeo,
    result,
  });
  return result;
}
