import fs from 'node:fs';
import path from 'node:path';
import { geoArea } from 'd3-geo';
import * as polygonClippingMod from 'polygon-clipping';
import type { MultiPolygon as PCMultiPolygon, Pair as PCPair } from 'polygon-clipping';
import { describe, expect, it } from 'vitest';
import { ARCHIVE_ELECTIONS } from '../../data/archiveRegistry';
import type { GeoCollection, GeoFeature } from '../../data/geoCache';
import type { ArchiveElectionId } from '../../types/election';
import { buildDynamicArchiveGeo, signedArea2D } from '../geoDissolve';

type PCMod = typeof polygonClippingMod & { default?: typeof polygonClippingMod };
const pcUnion = ((polygonClippingMod as PCMod).default ?? polygonClippingMod).union;

const provincesGeo = JSON.parse(
  fs.readFileSync(path.resolve('public/tr-provinces.geojson'), 'utf8')
) as GeoCollection;
const districts87Geo = JSON.parse(
  fs.readFileSync(path.resolve('public/tr-districts-87.geojson'), 'utf8')
) as GeoCollection;
const ilcelerGeo = JSON.parse(
  fs.readFileSync(path.resolve('public/tr-ilceler.geojson'), 'utf8')
) as GeoCollection;
const origGeometryRefs = new Set<unknown>([
  ...provincesGeo.features.map((f) => f.geometry),
  ...districts87Geo.features.map((f) => f.geometry),
  ...ilcelerGeo.features.map((f) => f.geometry),
]);

function ringSegmentsIntersect(ring: ReadonlyArray<ReadonlyArray<number>>): boolean {
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
      if (i === 0 && j === n - 1) continue; // share closing endpoint
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
      if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))) {
        return true;
      }
    }
  }
  return false;
}

function assertCleanD3GeoFeature(feat: GeoFeature, label: string) {
  const geom = feat.geometry as { type: string; coordinates: unknown };
  expect(['Polygon', 'MultiPolygon']).toContain(geom.type);
  const polys = (geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates) as number[][][][];
  expect(polys.length).toBeGreaterThan(0);

  const area = geoArea(feat as never);
  expect(area, `${label} total spherical area`).toBeGreaterThan(1e-8);
  expect(area, `${label} hemispherical inversion`).toBeLessThan(Math.PI);

  const checkSelfX = !origGeometryRefs.has(feat.geometry);

  for (let pIdx = 0; pIdx < polys.length; pIdx++) {
    const poly = polys[pIdx];
    const outer = poly[0];
    expect(outer.length, `${label} poly#${pIdx} outer coords`).toBeGreaterThanOrEqual(4);
    expect(signedArea2D(outer), `${label} poly#${pIdx} outer CW`).toBeLessThan(0);
    const outerArea = geoArea({ type: 'Polygon', coordinates: [outer] } as never);
    expect(outerArea, `${label} poly#${pIdx} outer spherical area`).toBeGreaterThan(1e-9);
    expect(outerArea, `${label} poly#${pIdx} outer < PI`).toBeLessThan(Math.PI);
    if (checkSelfX) {
      expect(ringSegmentsIntersect(outer), `${label} poly#${pIdx} outer self-intersection`).toBe(false);
    }

    for (let hIdx = 1; hIdx < poly.length; hIdx++) {
      const hole = poly[hIdx];
      expect(hole.length, `${label} poly#${pIdx} hole#${hIdx} coords`).toBeGreaterThanOrEqual(4);
      expect(signedArea2D(hole), `${label} poly#${pIdx} hole#${hIdx} CCW`).toBeGreaterThan(0);
      const holeCw = [...hole].reverse();
      const holeArea = geoArea({ type: 'Polygon', coordinates: [holeCw] } as never);
      expect(holeArea, `${label} poly#${pIdx} hole#${hIdx} slit hole`).toBeGreaterThanOrEqual(5e-8);
      if (checkSelfX) {
        expect(ringSegmentsIntersect(hole), `${label} poly#${pIdx} hole#${hIdx} self-intersection`).toBe(false);
      }
    }
  }
}

const EXPECTED_COUNTS: Record<ArchiveElectionId, { provs: number; dists: number }> = {
  '2024_local': { provs: 81, dists: 87 },
  '2023_pres_r2': { provs: 81, dists: 87 },
  '2023_pres_r1': { provs: 81, dists: 87 },
  '2023_general': { provs: 81, dists: 87 },
  '2019_local': { provs: 81, dists: 87 },
  '2018_pres': { provs: 81, dists: 87 },
  '2018_general': { provs: 81, dists: 87 },
  '2017_ref': { provs: 81, dists: 85 },
  '2015_nov': { provs: 81, dists: 85 },
  '2015_june': { provs: 81, dists: 85 },
  '2014_pres': { provs: 81, dists: 85 },
  '2014_local': { provs: 81, dists: 85 },
  '2011_general': { provs: 81, dists: 85 },
  '2010_ref': { provs: 81, dists: 85 },
  '2009_local': { provs: 81, dists: 85 },
  '2007_general': { provs: 81, dists: 85 },
  '2002_general': { provs: 81, dists: 85 },
  '1999_general': { provs: 80, dists: 84 },
  '1995_general': { provs: 79, dists: 83 },
  '1991_general': { provs: 74, dists: 107 },
  '1987_general': { provs: 67, dists: 104 },
};

describe('Zero-noise polygon-clipping geoDissolve across all 21 archives', () => {
  it('validates counts, d3-geo winding, zero self-intersections, and clean holes on all 21 archives', () => {
    const allIds = Object.keys(ARCHIVE_ELECTIONS) as ArchiveElectionId[];
    expect(allIds.length).toBe(21);

    for (const id of allIds) {
      const dyn = buildDynamicArchiveGeo({
        archiveId: id,
        provincesGeo,
        districts87Geo,
        ilcelerGeo,
      });
      expect(dyn.provincesGeo).not.toBeNull();
      expect(dyn.districts87Geo).not.toBeNull();
      expect(dyn.ilcelerGeo).not.toBeNull();

      const exp = EXPECTED_COUNTS[id];
      expect(dyn.provincesGeo!.features.length, `${id} provinces count`).toBe(exp.provs);
      expect(dyn.districts87Geo!.features.length, `${id} districts count`).toBe(exp.dists);

      for (const f of dyn.provincesGeo!.features) {
        assertCleanD3GeoFeature(f, `${id}:prov:${f.properties.id}`);
      }
      for (const f of dyn.districts87Geo!.features) {
        assertCleanD3GeoFeature(f, `${id}:dist:${f.properties.id}`);
      }
      for (const f of dyn.ilcelerGeo!.features) {
        assertCleanD3GeoFeature(f, `${id}:ilce:${f.properties.id}`);
      }
    }
  });

  it('preserves 34-adalar island, 1991 16-1 true enclave hole around 16-yildirim, eliminates bogus holes & inter-feature slits, and leaves Bosphorus unbridged', () => {
    const dyn87 = buildDynamicArchiveGeo({
      archiveId: '1987_general',
      provincesGeo,
      districts87Geo,
      ilcelerGeo,
    });
    const dyn91 = buildDynamicArchiveGeo({
      archiveId: '1991_general',
      provincesGeo,
      districts87Geo,
      ilcelerGeo,
    });

    // 34-adalar preserved cleanly
    const adalar87 = dyn87.ilcelerGeo!.features.find((f) => f.properties.id === '34-adalar');
    expect(adalar87).toBeDefined();
    expect(adalar87!.properties.districtId).toBe('34-3');

    // Bogus seam holes in 18 (Çankırı) and 42-3 (Konya) are completely gone in both 1987 and 1991
    for (const [tag, dyn] of [
      ['1987', dyn87],
      ['1991', dyn91],
    ] as const) {
      for (const badId of ['18', '42-3']) {
        const feat = dyn.districts87Geo!.features.find((f) => f.properties.id === badId)!;
        expect(feat, `${tag} missing ${badId}`).toBeDefined();
        const fGeom = feat.geometry as { type: string; coordinates: unknown };
        const polys = (
          fGeom.type === 'Polygon' ? [fGeom.coordinates] : fGeom.coordinates
        ) as number[][][][];
        expect(
          polys.every((p) => p.length === 1),
          `${tag} ${badId} must have zero interior holes`
        ).toBe(true);
      }
    }

    // 1991 Bursa 16-1 encloses 16-yildirim (16-2) => must retain its genuine interior CCW enclave hole
    const bursa91_1 = dyn91.districts87Geo!.features.find((f) => f.properties.id === '16-1')!;
    const b91Geom = bursa91_1.geometry as { type: string; coordinates: unknown };
    const b91Polys = (
      b91Geom.type === 'Polygon' ? [b91Geom.coordinates] : b91Geom.coordinates
    ) as number[][][][];
    expect(b91Polys.some((poly) => poly.length >= 2 && signedArea2D(poly[1]) > 0)).toBe(true);

    // Bosphorus must NOT be bridged in Istanbul district 34-4 (Üsküdar+Sarıyer+Beykoz)
    const ist34_4 = dyn87.districts87Geo!.features.find((f) => f.properties.id === '34-4')!;
    expect((ist34_4.geometry as { type: string; coordinates: unknown[] }).type).toBe('MultiPolygon');
    expect((ist34_4.geometry as { coordinates: unknown[] }).coordinates.length).toBeGreaterThanOrEqual(2);

    // Verify 0 inter-feature interior gap slits when uniting all districts across old & new layers
    for (const id of ['2023_general', '2011_general', '1991_general', '1987_general'] as ArchiveElectionId[]) {
      const dyn = buildDynamicArchiveGeo({
        archiveId: id,
        provincesGeo,
        districts87Geo,
        ilcelerGeo,
      });
      let layer: PCMultiPolygon[] = dyn.districts87Geo!.features.map((f) => {
        const g = f.geometry as { type: string; coordinates: unknown };
        const ps = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates) as number[][][][];
        return ps.map((p) =>
          p.map((r, rIdx) => {
            const wantCCW = rIdx === 0;
            const s = signedArea2D(r);
            return ((wantCCW ? s > 0 : s < 0) ? r : [...r].reverse()) as PCPair[];
          })
        );
      });
      while (layer.length > 1) {
        const next: PCMultiPolygon[] = [];
        for (let i = 0; i < layer.length; i += 2) {
          next.push(i + 1 < layer.length ? pcUnion(layer[i], layer[i + 1]) : layer[i]);
        }
        layer = next;
      }
      const totalGapHoles = (layer[0] || []).reduce((acc, p) => acc + Math.max(0, p.length - 1), 0);
      expect(totalGapHoles, `${id} inter-district white gap slits`).toBe(0);
    }
  });

  it('places historical split ilçeler into exact Resmî Gazete provinces and electoral regions', () => {
    const getIlce = (id: ArchiveElectionId, ilceId: string) => {
      const dyn = buildDynamicArchiveGeo({
        archiveId: id,
        provincesGeo,
        districts87Geo,
        ilcelerGeo,
      });
      return dyn.ilcelerGeo!.features.find((f) => f.properties.id === ilceId)!;
    };

    // Post-2002 Ankara split updates
    expect(getIlce('2009_local', '06-elmadag').properties.districtId).toBe('06-2');
    expect(getIlce('2010_ref', '06-elmadag').properties.districtId).toBe('06-2');
    expect(getIlce('2011_general', '06-elmadag').properties.districtId).toBe('06-2');
    expect(getIlce('2014_local', '06-akyurt').properties.districtId).toBe('06-1');

    // 1995 & 1999 historical region membership
    for (const id of ['1995_general', '1999_general'] as ArchiveElectionId[]) {
      expect(getIlce(id, '06-elmadag').properties.districtId).toBe('06-1');
      expect(getIlce(id, '34-zeytinburnu').properties.districtId).toBe('34-3');
      expect(getIlce(id, '35-kemalpasa').properties.districtId).toBe('35-1');
    }

    // 1987 cross-province & split-circle transfers
    expect(getIlce('1987_general', '68-agacoren').properties.ilId).toBe('06');
    expect(getIlce('1987_general', '68-agacoren').properties.districtId).toBe('06-1');
    expect(getIlce('1987_general', '68-sariyahsi').properties.districtId).toBe('06-1');
    expect(getIlce('1987_general', '71-merkez').properties.districtId).toBe('06-2');
    expect(getIlce('1987_general', '71-keskin').properties.districtId).toBe('06-4');
    expect(getIlce('1987_general', '71-karakecili').properties.districtId).toBe('06-1');
    expect(getIlce('1987_general', '74-merkez').properties.districtId).toBe('67-1');
    expect(getIlce('1987_general', '74-ulus').properties.districtId).toBe('67-2');
    expect(getIlce('1987_general', '77-altinova').properties.ilId).toBe('41');
    expect(getIlce('1987_general', '77-altinova').properties.districtId).toBe('41-2');
    expect(getIlce('1987_general', '77-armutlu').properties.ilId).toBe('16');
    expect(getIlce('1987_general', '77-armutlu').properties.districtId).toBe('16-2');
    expect(getIlce('1987_general', '72-gercus').properties.ilId).toBe('47');

    // 1991 Bartın separates while Altınova/Armutlu/Eskipazar remain in historical parents
    expect(getIlce('1991_general', '74-merkez').properties.ilId).toBe('74');
    expect(getIlce('1991_general', '74-ulus').properties.districtId).toBe('74');
    expect(getIlce('1991_general', '77-altinova').properties.districtId).toBe('41-2');
    expect(getIlce('1991_general', '77-armutlu').properties.districtId).toBe('16-2');
    expect(getIlce('1991_general', '78-eskipazar').properties.districtId).toBe('18');
  });
});
