import fs from 'node:fs';
import path from 'node:path';
import { geoContains, geoMercator, geoPath } from 'd3-geo';
import { describe, expect, it } from 'vitest';
import type { GeoCollection } from '../../data/geoCache';
import baseline1987 from '../../data/baseline1987.json';
import baseline1991 from '../../data/baseline1991.json';
import baseline2023 from '../../data/baseline2023.json';
import type { ArchiveElectionId } from '../../types/election';
import { buildDynamicArchiveGeo } from '../geoDissolve';
import { computeMapSeatLayouts } from '../seatCirclesGeometry';

const provincesGeo = JSON.parse(
  fs.readFileSync(path.resolve('public/tr-provinces.geojson'), 'utf8')
) as GeoCollection;
const districts87Geo = JSON.parse(
  fs.readFileSync(path.resolve('public/tr-districts-87.geojson'), 'utf8')
) as GeoCollection;
const ilcelerGeo = JSON.parse(
  fs.readFileSync(path.resolve('public/tr-ilceler.geojson'), 'utf8')
) as GeoCollection;

const BASELINE_DIST_MPS: Record<'2023_general' | '1991_general' | '1987_general', Record<string, number>> = {
  '2023_general': Object.fromEntries(baseline2023.districts.map((d) => [d.id, d.mpCount])),
  '1991_general': Object.fromEntries(baseline1991.districts.map((d) => [d.id, d.mpCount])),
  '1987_general': Object.fromEntries(baseline1987.districts.map((d) => [d.id, d.mpCount])),
};

describe('Polylabel & Collision-Free Seat Circle Layout Engine', () => {
  it('places every anchor inside its polygon and eliminates all cluster & Istanbul panel overlaps across 1987, 1991, and 2023', () => {
    const viewports = [
      {
        label: 'MapPanel 980x470',
        box: { x: 0, y: 0, w: 980, h: 470 },
        fit: [
          [22, 18],
          [958, 452],
        ] as [[number, number], [number, number]],
      },
      {
        label: 'Infographic 796x430',
        box: { x: 12, y: 34, w: 796, h: 430 },
        fit: [
          [22, 42],
          [798, 456],
        ] as [[number, number], [number, number]],
      },
      {
        label: 'Infographic Dual 500x320',
        box: { x: 12, y: 34, w: 500, h: 320 },
        fit: [
          [22, 42],
          [502, 346],
        ] as [[number, number], [number, number]],
      },
    ];

    for (const archiveId of ['2023_general', '1991_general', '1987_general'] as const) {
      const dyn = buildDynamicArchiveGeo({
        archiveId: archiveId as ArchiveElectionId,
        provincesGeo,
        districts87Geo,
        ilcelerGeo,
      });
      const fc = dyn.districts87Geo!;
      const mpById = BASELINE_DIST_MPS[archiveId];

      for (const vp of viewports) {
        const proj = geoMercator().fitExtent(vp.fit, fc as never);
        const pathGen = geoPath().projection(proj);

        const units = fc.features.map((f) => ({
          id: f.properties.id,
          ilId: f.properties.ilId || f.properties.id.split('-')[0],
          feature: f,
          partySeats: { A: mpById[f.properties.id] || 1 },
          partyVotes: { A: 100 },
        }));

        const layout = computeMapSeatLayouts({
          units,
          projection: (pt) => proj(pt),
          viewportBox: vp.box,
          partyColorMap: { A: '#090A0F' },
          isDistrictLayer: true,
        });

        // 1. Every on-map Polylabel anchor sits strictly inside its own polygon
        for (const c of layout.clusters) {
          const feat = fc.features.find((x) => x.properties.id === c.id)!;
          const inv = proj.invert!(c.anchor);
          expect(inv, `${archiveId} ${vp.label} invert anchor ${c.id}`).not.toBeNull();
          expect(
            geoContains(feat as never, inv!),
            `${archiveId} ${vp.label} anchor outside polygon ${c.id}`
          ).toBe(true);
        }

        // 2. Zero pairwise AABB overlaps among all on-map clusters
        for (let i = 0; i < layout.clusters.length; i++) {
          for (let j = i + 1; j < layout.clusters.length; j++) {
            const a = layout.clusters[i];
            const b = layout.clusters[j];
            const ox = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
            const oy = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
            expect(
              ox > 0.01 && oy > 0.01,
              `${archiveId} ${vp.label} cluster collision ${a.id} <-> ${b.id}`
            ).toBe(false);
          }
        }

        // 3. Istanbul editorial callout panel appears strictly iff Istanbul has > 3 regions
        if (archiveId === '2023_general') {
          expect(layout.istanbulPanel).toBeNull();
          expect(layout.clusters.length).toBe(87);
        } else {
          expect(layout.istanbulPanel).not.toBeNull();
          const panel = layout.istanbulPanel!;
          const expIstCount = archiveId === '1987_general' ? 8 : 9;
          expect(panel.districtCount).toBe(expIstCount);
          expect(panel.cells.length).toBe(expIstCount);
          expect(layout.clusters.length).toBe(fc.features.length - expIstCount);

          // Panel has zero overlap with any on-map cluster
          for (const c of layout.clusters) {
            const overlapsCluster = !(
              c.maxX < panel.x ||
              c.minX > panel.x + panel.w ||
              c.maxY < panel.y ||
              c.minY > panel.y + panel.h
            );
            expect(
              overlapsCluster,
              `${archiveId} ${vp.label} panel overlaps cluster ${c.id}`
            ).toBe(false);
          }

          // Panel sits cleanly over the Black Sea water margin without overlapping land
          for (const feat of fc.features) {
            const [[fx0, fy0], [fx1, fy1]] = pathGen.bounds(feat as never);
            if (!(fx1 < panel.x || fx0 > panel.x + panel.w || fy1 < panel.y || fy0 > panel.y + panel.h)) {
              let hitsLand = false;
              for (let sx = panel.x; sx <= panel.x + panel.w && !hitsLand; sx += 2) {
                for (let sy = panel.y; sy <= panel.y + panel.h && !hitsLand; sy += 2) {
                  const ll = proj.invert!([sx, sy]);
                  if (ll && geoContains(feat as never, ll)) hitsLand = true;
                }
              }
              expect(
                hitsLand,
                `${archiveId} ${vp.label} panel overlaps land ${feat.properties.id}`
              ).toBe(false);
            }
          }
        }
      }
    }
  });

  it('keeps 81-province layer free of collisions without rendering an Istanbul panel', () => {
    const proj = geoMercator().fitExtent(
      [
        [22, 18],
        [958, 452],
      ],
      provincesGeo as never
    );
    const units = provincesGeo.features.map((f) => ({
      id: f.properties.id,
      ilId: f.properties.id,
      feature: f,
      partySeats: { A: f.properties.id === '34' ? 98 : 6 },
      partyVotes: { A: 100 },
    }));
    const layout = computeMapSeatLayouts({
      units,
      projection: (pt) => proj(pt),
      viewportBox: { x: 0, y: 0, w: 980, h: 470 },
      partyColorMap: { A: '#090A0F' },
      isDistrictLayer: false,
    });
    expect(layout.istanbulPanel).toBeNull();
    expect(layout.clusters.length).toBe(81);
    for (let i = 0; i < layout.clusters.length; i++) {
      for (let j = i + 1; j < layout.clusters.length; j++) {
        const a = layout.clusters[i];
        const b = layout.clusters[j];
        const ox = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
        const oy = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
        expect(ox > 0.01 && oy > 0.01, `81-il collision ${a.id} <-> ${b.id}`).toBe(false);
      }
    }
  });
});
