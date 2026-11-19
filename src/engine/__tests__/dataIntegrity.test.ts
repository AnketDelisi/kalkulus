import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import baseline2019Raw from '../../data/baseline2019.json';
import baseline2023Raw from '../../data/baseline2023.json';
import baseline2024Raw from '../../data/baseline2024.json';
import { DEFAULT_ALLIANCES, DEFAULT_PARTIES } from '../../data/defaultParties';
import { runMultiLayerProjection } from '../swing';
import { BaselineDataset } from '../../types/election';

const b19 = baseline2019Raw as unknown as BaselineDataset;
const b23 = baseline2023Raw as unknown as BaselineDataset;
const b24 = baseline2024Raw as unknown as BaselineDataset;

describe('Continuous Baseline Data Integrity Suite', () => {
  it('validates 81 provinces, 87 districts, 973 ilceler, and exact 600 MPs in all baselines', () => {
    for (const [name, ds] of [
      ['2019 Baseline', b19],
      ['2023 Baseline', b23],
      ['2024 Baseline', b24],
    ] as const) {
      expect(ds.provinces.length, `${name} must have 81 provinces`).toBe(81);
      expect(ds.districts.length, `${name} must have 87 districts`).toBe(87);
      expect(ds.ilceler.length, `${name} must have 973 ilceler`).toBe(973);

      const totalMps = ds.districts.reduce((s, d) => s + d.mpCount, 0);
      expect(totalMps, `${name} total MPs must be 600`).toBe(600);

      // Verify unique IDs
      const provIds = new Set(ds.provinces.map((p) => p.id));
      expect(provIds.size, `${name} province IDs must be unique`).toBe(81);

      const distIds = new Set(ds.districts.map((d) => d.id));
      expect(distIds.size, `${name} district IDs must be unique`).toBe(87);

      const ilceIds = new Set(ds.ilceler.map((i) => i.id));
      expect(ilceIds.size, `${name} ilce IDs must be unique`).toBe(973);
    }
  });

  it('verifies all ilçeler have non-negative voters, valid turnout (0-100], and ~100% share sums', () => {
    for (const [name, ds] of [
      ['2019 Baseline', b19],
      ['2023 Baseline', b23],
      ['2024 Baseline', b24],
    ] as const) {
      for (const ilce of ds.ilceler) {
        expect(ilce.registeredVoters, `${name} ilce ${ilce.id} registeredVoters > 0`).toBeGreaterThan(0);
        expect(ilce.turnout, `${name} ilce ${ilce.id} turnout > 0`).toBeGreaterThan(0);
        expect(ilce.turnout, `${name} ilce ${ilce.id} turnout <= 100`).toBeLessThanOrEqual(100);
        expect(ilce.validVoteRatio, `${name} ilce ${ilce.id} validVoteRatio > 0`).toBeGreaterThan(0);
        expect(ilce.validVoteRatio, `${name} ilce ${ilce.id} validVoteRatio <= 100`).toBeLessThanOrEqual(100);

        // Every ilce must have all 10 standard parties
        for (const party of DEFAULT_PARTIES) {
          expect(ilce.partyShares[party.id], `${name} ilce ${ilce.id} has party ${party.id}`).toBeDefined();
          expect(ilce.partyShares[party.id]).toBeGreaterThanOrEqual(0);
        }

        const sum = Object.values(ilce.partyShares).reduce((a, b) => a + b, 0);
        expect(sum, `${name} ilce ${ilce.id} partyShares must sum close to 100`).toBeCloseTo(100, 1);
      }
    }
  });

  it('validates relational consistency between provinces, districts, and ilçeler', () => {
    for (const [name, ds] of [
      ['2019 Baseline', b19],
      ['2023 Baseline', b23],
      ['2024 Baseline', b24],
    ] as const) {
      const provMap = new Map(ds.provinces.map((p) => [p.id, p]));
      const distMap = new Map(ds.districts.map((d) => [d.id, d]));

      // Districts refer to existing provinces
      for (const dist of ds.districts) {
        expect(provMap.has(dist.ilId), `${name} district ${dist.id} references valid ilId ${dist.ilId}`).toBe(true);
        expect(dist.mpCount, `${name} district ${dist.id} has positive mpCount`).toBeGreaterThan(0);
      }

      // Provinces refer to existing districts
      for (const prov of ds.provinces) {
        expect(prov.districtIds.length, `${name} prov ${prov.id} has at least 1 district`).toBeGreaterThan(0);
        for (const dId of prov.districtIds) {
          expect(distMap.has(dId), `${name} prov ${prov.id} references valid districtId ${dId}`).toBe(true);
        }
      }

      // İlçeler refer to existing province and district
      for (const ilce of ds.ilceler) {
        expect(provMap.has(ilce.ilId), `${name} ilce ${ilce.id} references valid ilId ${ilce.ilId}`).toBe(true);
        expect(distMap.has(ilce.districtId), `${name} ilce ${ilce.id} references valid districtId ${ilce.districtId}`).toBe(true);
      }

      const is2018Apportionment = name.includes('2018') || name.includes('2019');
      // Ankara: 2018/2019 = 36 (13+11+12), 2023/2024 = 37 (13+11+13)
      const ankaraMps = ['06-1', '06-2', '06-3'].reduce((s, id) => s + (distMap.get(id)?.mpCount || 0), 0);
      expect(ankaraMps).toBe(is2018Apportionment ? 36 : 37);

      // Bursa: 2018/2019 = 20 (10+10), 2023/2024 = 21 (11+10)
      const bursaMps = ['16-1', '16-2'].reduce((s, id) => s + (distMap.get(id)?.mpCount || 0), 0);
      expect(bursaMps).toBe(is2018Apportionment ? 20 : 21);

      // Istanbul: 2018/2019 = 98 (35+28+35), 2023/2024 = 96 (35+25+36)
      const istanbulMps = ['34-1', '34-2', '34-3'].reduce((s, id) => s + (distMap.get(id)?.mpCount || 0), 0);
      expect(istanbulMps).toBe(is2018Apportionment ? 98 : 96);

      // Izmir: 14 + 14 = 28
      const izmirMps = ['35-1', '35-2'].reduce((s, id) => s + (distMap.get(id)?.mpCount || 0), 0);
      expect(izmirMps).toBe(28);
    }
  });

  it('allocates exactly 600 seats on 2024 local baseline projection', () => {
    const res = runMultiLayerProjection({
      baseline: b24,
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      swingMode: 'proportional',
      dhondtMode: '2022_separate',
      thresholdPct: 7.0,
      nationalTargetShares: { ...b24.nationalBaseShares },
      nationalTargetTurnout: b24.nationalBaseTurnout,
      nationalVoterScaleFactor: 1.0,
      abroadConfig: b24.abroad,
      ilceOverrides: {},
      districtOverrides: {},
      provinceOverrides: {},
      jointListRules: [],
    });

    expect(res.totalSeatsAllocated).toBe(600);
    expect(Object.keys(res.provinceResults).length).toBe(81);
    expect(Object.keys(res.districtResults).length).toBe(87);
    expect(Object.keys(res.ilceResults).length).toBe(973);
  });

  it('verifies GeoJSON features link 100% to baseline dataset', () => {
    const geoDist = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'public/tr-districts-87.geojson'), 'utf8')
    );
    const geoProv = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'public/tr-provinces.geojson'), 'utf8')
    );
    const geoIlce = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'public/tr-ilceler.geojson'), 'utf8')
    );

    expect(geoDist.features.length).toBe(87);
    expect(geoProv.features.length).toBe(81);
    expect(geoIlce.features.length).toBe(973);

    const geoIlceIds = new Set(geoIlce.features.map((f: { properties: { id: string } }) => f.properties.id));
    expect(geoIlceIds.size).toBe(973);

    const b23DistIds = new Set(b23.districts.map((d) => d.id));
    for (const f of geoDist.features) {
      expect(b23DistIds.has(f.properties.id), `District feature ${f.properties.id} exists in baseline`).toBe(true);
    }

    const b23ProvIds = new Set(b23.provinces.map((p) => p.id));
    for (const f of geoProv.features) {
      expect(b23ProvIds.has(f.properties.id), `Province feature ${f.properties.id} exists in baseline`).toBe(true);
    }

    const b23IlceIds = new Set(b23.ilceler.map((i) => i.id));
    for (const f of geoIlce.features) {
      expect(b23IlceIds.has(f.properties.id), `Ilce feature ${f.properties.id} exists in baseline`).toBe(true);
    }
  });

  it('verifies merged provinces in tr-provinces.geojson have zero interior seam holes and default alliances exclude millet/ata', () => {
    const geoProv = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'public/tr-provinces.geojson'), 'utf8')
    );

    const multiDistrictProvs = new Set(['06', '16', '34', '35']);
    for (const f of geoProv.features) {
      const geom = f.geometry;
      if (geom.type === 'Polygon') {
        expect(
          geom.coordinates.length,
          `Province ${f.properties.id} Polygon should have no interior hole rings`
        ).toBe(1);
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
          expect(
            poly.length,
            `Province ${f.properties.id} MultiPolygon part should have no interior hole rings`
          ).toBe(1);
        }
      }
      multiDistrictProvs.delete(f.properties.id);
    }
    expect(multiDistrictProvs.size).toBe(0);

    expect(DEFAULT_ALLIANCES.map((a) => a.id)).toEqual(['cumhur', 'emek']);

    const geo600 = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'scripts/data/repo600_geo.json'), 'utf8')
    ).map;
    const foldTr = (s: string) =>
      s
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/i̇/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/â/g, 'a')
        .replace(/[^a-z0-9]/g, '');
    const provFold: Record<string, string> = {};
    for (const p of b23.provinces) provFold[p.id] = foldTr(p.name);

    for (const ds of [b23, b24]) {
      let total = 0;
      for (const d of ds.districts) {
        const pFold = provFold[d.ilId];
        const key600 = d.id.includes('-')
          ? `${pFold}-${['i', 'ii', 'iii'][parseInt(d.id.split('-')[1], 10) - 1]}`
          : pFold;
        expect(d.mpCount, `District ${d.id} matches prDistricts`).toBe(geo600.prDistricts[key600]);
        total += d.mpCount;
      }
      expect(total).toBe(600);
    }
  });
});
