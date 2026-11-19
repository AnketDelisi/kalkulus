import fs from 'node:fs';
import path from 'node:path';
import { geoArea } from 'd3-geo';
import { describe, expect, it } from 'vitest';
import { useElectionStore } from '../../store/useElectionStore';
import { buildDynamicArchiveGeo } from '../../utils/geoDissolve';
import { computeElectoralMetrics } from '../../utils/electoralMetrics';
import { alignParliamentaryComparison } from '../../utils/archiveCompare';
import { ARCHIVE_ELECTIONS } from '../../data/archiveRegistry';
import type { GeoCollection } from '../../data/geoCache';
import { WINNERS_2024_ILCELER, WINNERS_2024_PROVINCES } from '../../data/local2024Winners';
import { WINNERS_2019_ILCELER, WINNERS_2019_PROVINCES } from '../../data/local2019Winners';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

function foldTr(s: string): string {
  return s
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .toLowerCase()
    .replace(/\u0307/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

describe('Interactive Past Election Archive (Auto-Loaded Studio Mode)', () => {
  it('auto-loads 2023 General Election with exact 600 official seats across all 87 districts, handles Reset & Mode Exit', async () => {
    const store = useElectionStore.getState();
    store.resetAllToBaseline();
    const preChp = useElectionStore.getState().nationalTargetShares.CHP;
    const preYeni = useElectionStore.getState().nationalTargetShares.YENI;

    await useElectionStore.getState().enterArchiveElection('2023_general');

    const arch23 = useElectionStore.getState();
    expect(arch23.activeArchiveId).toBe('2023_general');
    expect(arch23.electionMode).toBe('parliamentary');
    expect(arch23.baselineId).toBe('custom');
    expect(arch23.customBaseline?.ilceler.find((i) => i.id === '06-gudul')?.districtId).toBe('06-2');
    expect(arch23.parties.some((p) => p.id === 'YENI')).toBe(false);
    expect(arch23.parties.some((p) => p.id === 'A')).toBe(false);
    expect(arch23.parties.some((p) => p.id === 'DEVA')).toBe(true);
    expect(arch23.parties.find((p) => p.id === 'CHP')?.color).toBe('#ED1C24');
    expect(arch23.nationalTargetShares.YENI).toBeUndefined();
    expect(arch23.nationalTargetShares.DEVA).toBe(0);
    expect(arch23.projection.totalSeatsAllocated).toBe(600);
    expect(arch23.projection.partyTotalSeats.AKP).toBe(268);
    expect(arch23.projection.partyTotalSeats.CHP).toBe(169);
    expect(arch23.projection.partyTotalSeats.DEM).toBe(61);
    expect(arch23.projection.partyTotalSeats.MHP).toBe(50);
    expect(arch23.projection.partyTotalSeats.IYI).toBe(43);
    expect(arch23.projection.partyTotalSeats.YRP).toBe(5);
    expect(arch23.projection.partyTotalSeats.TIP).toBe(4);
    expect(arch23.archiveSelfBaselineProjection.partyTotalSeats).toEqual(arch23.projection.partyTotalSeats);
    expect(arch23.archiveComparisonId).toBe('2018_general');

    // Verify all 87 electoral districts match official YSK 2023 mv2023 seat counts
    const geo600 = JSON.parse(
      fs.readFileSync(path.resolve('scripts/data/repo600_geo.json'), 'utf8')
    ).map as { mv2023: Record<string, Record<string, number>> };
    const provById = Object.fromEntries(arch23.customBaseline!.provinces.map((p) => [p.id, p]));
    const distDiffs23: string[] = [];
    for (const [dId, dRes] of Object.entries(arch23.projection.districtResults)) {
      const pFold = foldTr(provById[dRes.ilId].name);
      const key600 = dId.includes('-')
        ? `${pFold}-${['i', 'ii', 'iii'][Number(dId.split('-')[1]) - 1]}`
        : pFold;
      const expMap = geo600.mv2023[key600] || {};
      for (const pid of ['AKP', 'CHP', 'DEM', 'MHP', 'IYI', 'YRP', 'TIP']) {
        const got = dRes.partySeats[pid] || 0;
        const exp = expMap[pid.toLowerCase()] || 0;
        if (got !== exp) distDiffs23.push(`${dId}(${dRes.name}):${pid} got=${got} exp=${exp}`);
      }
    }
    expect(distDiffs23).toEqual([]);

    // User can edit directly on the loaded 2023 result, and resetAllToBaseline restores official 2023
    const official23Chp = arch23.nationalTargetShares.CHP;
    useElectionStore.getState().updateNationalPartyShare('CHP', 31.5);
    expect(useElectionStore.getState().nationalTargetShares.CHP).toBe(31.5);

    useElectionStore.getState().resetAllToBaseline();
    await new Promise((r) => setTimeout(r, 25));
    expect(useElectionStore.getState().activeArchiveId).toBe('2023_general');
    expect(useElectionStore.getState().nationalTargetShares.CHP).toBeCloseTo(official23Chp, 2);

    // Clicking live mode tab cleanly exits Archive Mode and restores pre-archive scenario first
    useElectionStore.getState().setElectionMode('presidential');
    const switched = useElectionStore.getState();
    expect(switched.activeArchiveId).toBeNull();
    expect(switched.electionMode).toBe('presidential');
    expect(switched.parties.some((p) => p.id === 'YENI')).toBe(true);
    expect(switched.nationalTargetShares.CHP).toBeCloseTo(preChp, 2);
    expect(switched.nationalTargetShares.YENI).toBeCloseTo(preYeni, 2);
  });

  it('auto-loads 2024 Local Election in True Mayoral Mode (0/81 prov flips, 0/973 ilce flips) and What-If 600-MP mode', async () => {
    await useElectionStore.getState().enterArchiveElection('2024_local', false);
    const loc24 = useElectionStore.getState();
    expect(loc24.activeArchiveId).toBe('2024_local');
    expect(loc24.electionMode).toBe('local');
    expect(loc24.localProvinceMode).toBe('merkez_ilce');
    // Auto-pairs 2019_local by default; switching comparison to 'self' checks 0/81 and 0/973 vs 2024
    expect(loc24.archiveComparisonId).toBe('2019_local');
    expect(loc24.localProjection.referenceYear).toBe(2019);
    expect(loc24.localProjection.flippedProvinceIds.length).toBeGreaterThan(0);

    await useElectionStore.getState().setArchiveComparisonId('self');
    const loc24Self = useElectionStore.getState();
    expect(loc24Self.localProjection.referenceYear).toBe(2024);
    expect(loc24Self.localProjection.flippedProvinceIds).toEqual([]);
    expect(loc24Self.localProjection.flippedIlceIds).toEqual([]);
    expect(loc24Self.parties.some((p) => p.id === 'YENI' || p.id === 'A')).toBe(false);
    expect(loc24Self.localTargetShares.CHP).toBeGreaterThan(33);
    expect(loc24Self.localDefections.entries.length).toBe(0);

    expect(loc24Self.localProjection.ilceResults['02-celikhan'].winnerPartyId).toBe('DEVA');
    expect(loc24Self.localProjection.ilceResults['29-siran'].winnerPartyId).toBe('DP');

    const provWins24: Record<string, number> = {};
    for (const [id, res] of Object.entries(loc24.localProjection.provinceResults)) {
      expect(res.winnerPartyId).toBe(WINNERS_2024_PROVINCES[id]);
      provWins24[res.winnerPartyId] = (provWins24[res.winnerPartyId] || 0) + 1;
    }
    expect(provWins24).toEqual({
      CHP: 35,
      AKP: 24,
      DEM: 10,
      MHP: 8,
      YRP: 2,
      IYI: 1,
      BBP: 1,
    });
    for (const [id, res] of Object.entries(loc24.localProjection.ilceResults)) {
      expect(res.winnerPartyId).toBe(WINNERS_2024_ILCELER[id]);
    }

    await useElectionStore.getState().enterArchiveElection('2024_local', true);
    const parl24 = useElectionStore.getState();
    expect(parl24.archiveWhatIfParl).toBe(true);
    expect(parl24.electionMode).toBe('parliamentary');
    expect(parl24.projection.totalSeatsAllocated).toBe(600);

    useElectionStore.getState().exitArchiveMode();
  });

  it('lazy-loads 2019 Local Election in True Mayoral Mode (incl. June 23 Istanbul & Tunceli TKP) and What-If 600-MP mode', async () => {
    await useElectionStore.getState().enterArchiveElection('2019_local', false);
    const autoPaired = useElectionStore.getState();
    expect(autoPaired.activeArchiveId).toBe('2019_local');
    expect(autoPaired.archiveComparisonId).toBe('2014_local');
    expect(autoPaired.localProjection.referenceYear).toBe(2014);

    await useElectionStore.getState().setArchiveComparisonId('self');
    const loc19 = useElectionStore.getState();
    expect(loc19.archiveComparisonId).toBe('self');
    expect(loc19.archiveWhatIfParl).toBe(false);
    expect(loc19.electionMode).toBe('local');
    expect(loc19.localProvinceMode).toBe('merkez_ilce');
    expect(loc19.localProjection.referenceYear).toBe(2019);
    expect(loc19.parties.some((p) => p.id === 'YENI' || p.id === 'ZP' || p.id === 'DEVA')).toBe(false);
    expect(loc19.parties.find((p) => p.id === 'DEM')?.shortName).toBe('HDP');
    expect(loc19.parties.some((p) => p.id === 'TKP')).toBe(true);

    // Exact 81/81 provincial mayors & 973/973 ilce mayors
    expect(loc19.localProjection.flippedProvinceIds).toEqual([]);
    expect(loc19.localProjection.flippedIlceIds).toEqual([]);

    const provWins19: Record<string, number> = {};
    for (const [id, res] of Object.entries(loc19.localProjection.provinceResults)) {
      expect(res.winnerPartyId).toBe(WINNERS_2019_PROVINCES[id]);
      provWins19[res.winnerPartyId] = (provWins19[res.winnerPartyId] || 0) + 1;
    }
    expect(provWins19).toEqual({
      AKP: 39,
      CHP: 21,
      MHP: 11,
      DEM: 8,
      TKP: 1,
      OTHER: 1,
    });
    expect(loc19.localProjection.provinceResults['34'].partyShares.CHP).toBeCloseTo(54.22, 1);
    expect(loc19.localProjection.provinceResults['34'].partyShares.AKP).toBeCloseTo(45.0, 1);
    expect(loc19.localProjection.provinceResults['62'].winnerPartyId).toBe('TKP');
    expect(loc19.localProjection.provinceResults['39'].winnerPartyId).toBe('OTHER');
    expect(loc19.localProjection.ilceResults['20-honaz'].winnerPartyId).toBe('CHP');
    for (const [id, res] of Object.entries(loc19.localProjection.ilceResults)) {
      expect(res.winnerPartyId).toBe(WINNERS_2019_ILCELER[id]);
    }

    // What-If 600-MP D'Hondt toggle on 2019 council ballots
    await useElectionStore.getState().enterArchiveElection('2019_local', true);
    const parl19 = useElectionStore.getState();
    expect(parl19.archiveWhatIfParl).toBe(true);
    expect(parl19.electionMode).toBe('parliamentary');
    expect(parl19.customBaseline?.id).toBe('2019_local');
    expect(parl19.projection.totalSeatsAllocated).toBe(600);

    useElectionStore.getState().exitArchiveMode();
    expect(useElectionStore.getState().activeArchiveId).toBeNull();
  });

  it('lazy-loads 2018 General Election with exact 600 seats across all 81 provinces and all 5 parties', async () => {
    await useElectionStore.getState().enterArchiveElection('2018_general');
    const arch18 = useElectionStore.getState();
    expect(arch18.activeArchiveId).toBe('2018_general');
    expect(arch18.electionMode).toBe('parliamentary');
    expect(arch18.dhondtMode).toBe('2018_alliance');
    expect(arch18.thresholdPct).toBe(10.0);
    expect(arch18.parties.some((p) => p.id === 'YENI' || p.id === 'A' || p.id === 'ZP' || p.id === 'YRP')).toBe(false);
    expect(arch18.parties.find((p) => p.id === 'DEM')?.shortName).toBe('HDP');
    expect(arch18.parties.some((p) => p.id === 'VP')).toBe(true);
    expect(arch18.parties.find((p) => p.id === 'CHP')?.color).toBe('#ED1C24');
    expect(arch18.customBaseline?.districts.find((d) => d.id === '07')?.mpCount).toBe(16);
    expect(arch18.projection.totalSeatsAllocated).toBe(600);
    expect(arch18.archiveSelfBaselineProjection.partyTotalSeats).toEqual(arch18.projection.partyTotalSeats);

    const officialProv = JSON.parse(
      fs.readFileSync(path.resolve(FIXTURES_DIR, 'official2018_prov.json'), 'utf8')
    ) as Record<string, Record<string, number>>;
    const provDiffs: string[] = [];
    for (const [ilId, pRes] of Object.entries(arch18.projection.provinceResults)) {
      const off = officialProv[ilId] || {};
      for (const pid of ['AKP', 'CHP', 'DEM', 'MHP', 'IYI']) {
        const got = pRes.partySeats[pid] || 0;
        const exp = off[pid] || 0;
        if (got !== exp) provDiffs.push(`${ilId}(${pRes.name}):${pid} got=${got} exp=${exp}`);
      }
    }
    expect(provDiffs).toEqual([]);
    expect({
      AKP: arch18.projection.partyTotalSeats.AKP,
      CHP: arch18.projection.partyTotalSeats.CHP,
      DEM: arch18.projection.partyTotalSeats.DEM,
      MHP: arch18.projection.partyTotalSeats.MHP,
      IYI: arch18.projection.partyTotalSeats.IYI,
    }).toEqual({ AKP: 295, CHP: 146, DEM: 67, MHP: 49, IYI: 43 });

    useElectionStore.getState().exitArchiveMode();
    expect(useElectionStore.getState().activeArchiveId).toBeNull();
  });

  it('dynamically dissolves 87-district and 973-ilce maps for historical overrides (Gudul -> 06-2, Derecik merged into Semdinli in 2018)', () => {
    const ilcelerGeo = JSON.parse(
      fs.readFileSync(path.resolve('public/tr-ilceler.geojson'), 'utf8')
    ) as GeoCollection;
    const districts87Geo = JSON.parse(
      fs.readFileSync(path.resolve('public/tr-districts-87.geojson'), 'utf8')
    ) as GeoCollection;

    const dyn18 = buildDynamicArchiveGeo({
      archiveId: '2018_general',
      districts87Geo,
      ilcelerGeo,
    });

    expect(dyn18.ilcelerGeo?.features.some((f) => f.properties.id === '30-derecik')).toBe(false);
    expect(dyn18.ilcelerGeo?.features.find((f) => f.properties.id === '06-gudul')?.properties.districtId).toBe('06-2');

    const semOrig = ilcelerGeo.features.find((f) => f.properties.id === '30-semdinli')!;
    const semMerged = dyn18.ilcelerGeo!.features.find((f) => f.properties.id === '30-semdinli')!;
    expect(semMerged.geometry).not.toEqual(semOrig.geometry);
    expect(geoArea(semMerged as any)).toBeLessThan(0.001);
    expect(geoArea(semMerged as any)).toBeGreaterThan(geoArea(semOrig as any));

    const ank2Orig = districts87Geo.features.find((f) => f.properties.id === '06-2')!;
    const ank3Orig = districts87Geo.features.find((f) => f.properties.id === '06-3')!;
    const ank2Dyn = dyn18.districts87Geo!.features.find((f) => f.properties.id === '06-2')!;
    const ank3Dyn = dyn18.districts87Geo!.features.find((f) => f.properties.id === '06-3')!;
    expect(ank2Dyn.geometry).not.toEqual(ank2Orig.geometry);
    expect(ank3Dyn.geometry).not.toEqual(ank3Orig.geometry);
    const ank2Geom = ank2Dyn.geometry as { type: string; coordinates: number[][][][] };
    const ank3Geom = ank3Dyn.geometry as { type: string; coordinates: number[][][] };
    expect(['Polygon', 'MultiPolygon']).toContain(ank2Geom.type);
    const ank2Polys = ank2Geom.type === 'Polygon' ? [ank2Geom.coordinates] : ank2Geom.coordinates;
    expect(ank2Polys.every((p) => p.length === 1)).toBe(true);
    expect(ank3Geom.type).toBe('Polygon');
    expect(ank3Geom.coordinates.length).toBe(1);
    expect(geoArea(ank2Dyn as any)).toBeLessThan(0.001);
    expect(geoArea(ank3Dyn as any)).toBeLessThan(0.001);
    expect(geoArea(ank2Dyn as any)).toBeGreaterThan(geoArea(ank2Orig as any));
    expect(geoArea(ank3Dyn as any)).toBeLessThan(geoArea(ank3Orig as any));
    expect(
      Math.abs(
        geoArea(ank2Dyn as any) +
          geoArea(ank3Dyn as any) -
          (geoArea(ank2Orig as any) + geoArea(ank3Orig as any))
      )
    ).toBeLessThan(1e-6);
  });

  it('lazy-loads Nov 2015, June 2015, and 2011 General Elections with exact 550 seats across all 85 districts and 81 provinces', async () => {
    const cases: {
      id: '2015_nov' | '2015_june' | '2011_general';
      provFile: string;
      expectedNat: Record<string, number>;
      expectedIlceler: number;
    }[] = [
      {
        id: '2015_nov',
        provFile: path.resolve(FIXTURES_DIR, 'official2015Nov_prov.json'),
        expectedNat: { AKP: 317, CHP: 134, DEM: 59, MHP: 40 },
        expectedIlceler: 970,
      },
      {
        id: '2015_june',
        provFile: path.resolve(FIXTURES_DIR, 'official2015June_prov.json'),
        expectedNat: { AKP: 258, CHP: 132, MHP: 80, DEM: 80 },
        expectedIlceler: 970,
      },
      {
        id: '2011_general',
        provFile: path.resolve(FIXTURES_DIR, 'official2011_prov.json'),
        expectedNat: { AKP: 327, CHP: 135, MHP: 53, DEM: 35 },
        expectedIlceler: 955,
      },
    ];

    for (const c of cases) {
      await useElectionStore.getState().enterArchiveElection(c.id);
      const st = useElectionStore.getState();
      expect(st.activeArchiveId).toBe(c.id);
      expect(st.electionMode).toBe('parliamentary');
      expect(st.dhondtMode).toBe('2022_separate');
      expect(st.thresholdPct).toBe(10.0);
      expect(Object.keys(st.projection.districtResults).length).toBe(85);
      expect(Object.keys(st.projection.ilceResults).length).toBe(c.expectedIlceler);
      expect(st.projection.totalSeatsAllocated).toBe(550);
      expect(st.archiveSelfBaselineProjection.partyTotalSeats).toEqual(st.projection.partyTotalSeats);

      const officialProv = JSON.parse(fs.readFileSync(c.provFile, 'utf8')) as Record<
        string,
        Record<string, number>
      >;
      const diffs: string[] = [];
      for (const [ilId, pRes] of Object.entries(st.projection.provinceResults)) {
        const off = officialProv[ilId] || {};
        for (const pid of ['AKP', 'CHP', 'MHP', 'DEM']) {
          const got = pRes.partySeats[pid] || 0;
          const exp = off[pid] || 0;
          if (got !== exp) diffs.push(`${c.id} ${ilId}(${pRes.name}):${pid} got=${got} exp=${exp}`);
        }
      }
      expect(diffs).toEqual([]);
      expect({
        AKP: st.projection.partyTotalSeats.AKP,
        CHP: st.projection.partyTotalSeats.CHP,
        MHP: st.projection.partyTotalSeats.MHP,
        DEM: st.projection.partyTotalSeats.DEM,
      }).toEqual(c.expectedNat);

      if (c.id === '2011_general') {
        expect(st.projection.ilceResults['06-elmadag'].districtId).toBe('06-2');
        expect(st.projection.districtResults['06-1'].mpCount).toBe(16);
        expect(st.projection.districtResults['06-2'].mpCount).toBe(15);
      }
    }

    await useElectionStore.getState().enterArchiveElection('2014_local');
    expect(useElectionStore.getState().customBaseline?.ilceler.find((i) => i.id === '06-akyurt')?.districtId).toBe('06-1');

    await useElectionStore.getState().enterArchiveElection('2010_ref');
    expect(useElectionStore.getState().customBaseline?.ilceler.find((i) => i.id === '06-elmadag')?.districtId).toBe('06-2');

    await useElectionStore.getState().enterArchiveElection('2009_local');
    expect(useElectionStore.getState().customBaseline?.ilceler.find((i) => i.id === '06-elmadag')?.districtId).toBe('06-2');

    useElectionStore.getState().exitArchiveMode();
    expect(useElectionStore.getState().activeArchiveId).toBeNull();
  });

  it('lazy-loads 2007, 2002, 1999, and 1995 General Elections with exact 550 seats and historical province/district counts', async () => {
    const cases: {
      id: '2007_general' | '2002_general' | '1999_general' | '1995_general';
      provFile: string;
      checkParties: string[];
      expectedNat: Record<string, number>;
      expectedProvinces?: number;
      expectedDistricts?: number;
      expectedIlceler: number;
    }[] = [
      {
        id: '2007_general',
        provFile: path.resolve(FIXTURES_DIR, 'official2007_prov.json'),
        checkParties: ['AKP', 'CHP', 'MHP', 'DEM'],
        expectedNat: { AKP: 341, CHP: 112, MHP: 71, DEM: 26 },
        expectedProvinces: 81,
        expectedDistricts: 85,
        expectedIlceler: 919,
      },
      {
        id: '2002_general',
        provFile: path.resolve(FIXTURES_DIR, 'official2002_prov.json'),
        checkParties: ['AKP', 'CHP', 'IND'],
        expectedNat: { AKP: 363, CHP: 178, IND: 9 },
        expectedProvinces: 81,
        expectedDistricts: 85,
        expectedIlceler: 919,
      },
      {
        id: '1999_general',
        provFile: path.resolve(FIXTURES_DIR, 'official1999_prov.json'),
        checkParties: ['DSP', 'MHP', 'SAADET', 'ANAP', 'DP', 'IND'],
        expectedNat: { DSP: 136, MHP: 129, SAADET: 111, ANAP: 86, DP: 85, IND: 3 },
        expectedProvinces: 80,
        expectedDistricts: 84,
        expectedIlceler: 919,
      },
      {
        id: '1995_general',
        provFile: path.resolve(FIXTURES_DIR, 'official1995_prov.json'),
        checkParties: ['SAADET', 'ANAP', 'DP', 'DSP', 'CHP'],
        expectedNat: { SAADET: 158, ANAP: 132, DP: 135, DSP: 76, CHP: 49 },
        expectedProvinces: 79,
        expectedDistricts: 83,
        expectedIlceler: 919,
      },
    ];

    for (const c of cases) {
      await useElectionStore.getState().enterArchiveElection(c.id);
      const st = useElectionStore.getState();
      expect(st.activeArchiveId).toBe(c.id);
      expect(st.electionMode).toBe('parliamentary');
      expect(st.dhondtMode).toBe('2022_separate');
      expect(st.thresholdPct).toBe(10.0);
      expect(Object.keys(st.projection.provinceResults).length).toBe(c.expectedProvinces ?? 81);
      expect(Object.keys(st.projection.districtResults).length).toBe(c.expectedDistricts ?? 85);
      expect(Object.keys(st.projection.ilceResults).length).toBe(c.expectedIlceler);
      expect(st.projection.totalSeatsAllocated).toBe(550);
      expect(st.archiveSelfBaselineProjection.partyTotalSeats).toEqual(st.projection.partyTotalSeats);

      const officialProv = JSON.parse(fs.readFileSync(c.provFile, 'utf8')) as Record<
        string,
        Record<string, number>
      >;
      const diffs: string[] = [];
      for (const [ilId, pRes] of Object.entries(st.projection.provinceResults)) {
        const off = officialProv[ilId] || {};
        for (const pid of c.checkParties) {
          const got = pRes.partySeats[pid] || 0;
          const exp = off[pid] || 0;
          if (got !== exp) diffs.push(`${c.id} ${ilId}(${pRes.name}):${pid} got=${got} exp=${exp}`);
        }
      }
      expect(diffs).toEqual([]);
      const gotNat: Record<string, number> = {};
      for (const pid of c.checkParties) gotNat[pid] = st.projection.partyTotalSeats[pid] || 0;
      expect(gotNat).toEqual(c.expectedNat);

      if (c.id === '1999_general' || c.id === '1995_general') {
        const reg9599 = JSON.parse(
          fs.readFileSync(path.resolve(FIXTURES_DIR, 'official_regions_1995_1999.json'), 'utf8')
        ) as Record<string, Record<string, { mpCount: number; seats: Record<string, number> }>>;
        const yrKey = c.id === '1999_general' ? '1999' : '1995';
        const regDiffs: string[] = [];
        for (const [dId, rExp] of Object.entries(reg9599[yrKey])) {
          const dGot = st.projection.districtResults[dId];
          expect(dGot.mpCount, `${c.id} ${dId} mpCount`).toBe(rExp.mpCount);
          for (const pid of c.checkParties) {
            const g = dGot.partySeats[pid] || 0;
            const e = rExp.seats[pid] || 0;
            if (g !== e) regDiffs.push(`${c.id} ${dId}:${pid} got=${g} exp=${e}`);
          }
        }
        expect(regDiffs).toEqual([]);
        expect(st.projection.ilceResults['06-elmadag'].districtId).toBe('06-1');
        expect(st.projection.ilceResults['34-zeytinburnu'].districtId).toBe('34-3');
        expect(st.projection.ilceResults['35-kemalpasa'].districtId).toBe('35-1');
      }
    }

    // Verify 2002 threshold What-If: lowering threshold to 5% admits DYP (DP), MHP, GP, DEHAP (DEM), ANAP
    await useElectionStore.getState().enterArchiveElection('2002_general');
    useElectionStore.getState().setThresholdPct(5.0);
    const whatIf02 = useElectionStore.getState().projection;
    expect(whatIf02.totalSeatsAllocated).toBe(550);
    expect(whatIf02.partyTotalSeats.DP).toBeGreaterThan(0);
    expect(whatIf02.partyTotalSeats.MHP).toBeGreaterThan(0);
    expect(whatIf02.partyTotalSeats.GP).toBeGreaterThan(0);
    expect(whatIf02.partyTotalSeats.DEM).toBeGreaterThan(0);
    expect(whatIf02.partyTotalSeats.ANAP).toBeGreaterThan(0);

    // Verify 1999 threshold What-If: lowering threshold to 4.5% admits CHP and HADEP (DEM)
    await useElectionStore.getState().enterArchiveElection('1999_general');
    useElectionStore.getState().setThresholdPct(4.5);
    const whatIf99 = useElectionStore.getState().projection;
    expect(whatIf99.totalSeatsAllocated).toBe(550);
    expect(whatIf99.partyTotalSeats.CHP).toBeGreaterThan(0);
    expect(whatIf99.partyTotalSeats.DEM).toBeGreaterThan(0);

    // Verify 1995 threshold What-If: lowering threshold to 4.0% admits MHP and HADEP (DEM)
    await useElectionStore.getState().enterArchiveElection('1995_general');
    useElectionStore.getState().setThresholdPct(4.0);
    const whatIf95 = useElectionStore.getState().projection;
    expect(whatIf95.totalSeatsAllocated).toBe(550);
    expect(whatIf95.partyTotalSeats.MHP).toBeGreaterThan(0);
    expect(whatIf95.partyTotalSeats.DEM).toBeGreaterThan(0);

    useElectionStore.getState().exitArchiveMode();
    expect(useElectionStore.getState().activeArchiveId).toBeNull();
  });

  it('dynamically dissolves 85-district and pre-2017/pre-2012/pre-2008 ilce maps for 2015, 2011, 2007, and 2002 with clean single-ring polygons', () => {
    const ilcelerGeo = JSON.parse(
      fs.readFileSync(path.resolve('public/tr-ilceler.geojson'), 'utf8')
    ) as GeoCollection;
    const districts87Geo = JSON.parse(
      fs.readFileSync(path.resolve('public/tr-districts-87.geojson'), 'utf8')
    ) as GeoCollection;

    const ank1Orig = districts87Geo.features.find((f) => f.properties.id === '06-1')!;
    const ank2Orig = districts87Geo.features.find((f) => f.properties.id === '06-2')!;
    const ank3Orig = districts87Geo.features.find((f) => f.properties.id === '06-3')!;
    const bur1Orig = districts87Geo.features.find((f) => f.properties.id === '16-1')!;
    const bur2Orig = districts87Geo.features.find((f) => f.properties.id === '16-2')!;

    for (const [id, expectedIlceler] of [
      ['2015_nov', 970],
      ['2015_june', 970],
      ['2011_general', 955],
      ['2007_general', 919],
      ['2002_general', 919],
    ] as const) {
      const dyn = buildDynamicArchiveGeo({
        archiveId: id,
        districts87Geo,
        ilcelerGeo,
      });

      expect(dyn.districts87Geo?.features.length).toBe(85);
      expect(dyn.ilcelerGeo?.features.length).toBe(expectedIlceler);

      const a1 = dyn.districts87Geo!.features.find((f) => f.properties.id === '06-1')!;
      const a2 = dyn.districts87Geo!.features.find((f) => f.properties.id === '06-2')!;
      const burs = dyn.districts87Geo!.features.find((f) => f.properties.id === '16')!;
      expect(burs.properties.name).toBe('Bursa');
      expect((a1.geometry as any).type).toBe('Polygon');
      expect((a1.geometry as any).coordinates.length).toBe(1);
      expect((a2.geometry as any).type).toBe('Polygon');
      expect((a2.geometry as any).coordinates.length).toBe(1);
      expect((burs.geometry as any).type).toBe('Polygon');
      expect((burs.geometry as any).coordinates.length).toBe(1);

      expect(
        Math.abs(
          geoArea(a1 as any) +
            geoArea(a2 as any) -
            (geoArea(ank1Orig as any) + geoArea(ank2Orig as any) + geoArea(ank3Orig as any))
        )
      ).toBeLessThan(1e-5);
      expect(
        Math.abs(geoArea(burs as any) - (geoArea(bur1Orig as any) + geoArea(bur2Orig as any)))
      ).toBeLessThan(1e-5);

      if (id === '2007_general' || id === '2002_general') {
        const mergedChecks = [
          '01-seyhan',
          '07-muratpasa',
          '21-sur',
          '25-yakutiye',
          '33-akdeniz',
          '34-kadikoy',
          '34-umraniye',
          '34-gaziosmanpasa',
          '34-catalca',
          '34-kucukcekmece',
          '34-buyukcekmece',
          '35-konak',
          '35-karsiyaka',
          '41-i-zmit',
          '41-gebze',
          '54-adapazari',
          '55-i-lkadim',
        ];
        for (const mId of mergedChecks) {
          const mf = dyn.ilcelerGeo!.features.find((f) => f.properties.id === mId)!;
          expect(mf, `missing merged parent ${mId}`).toBeTruthy();
          expect(geoArea(mf as any)).toBeLessThan(0.001);
          expect((mf.geometry as any).coordinates.length).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('dynamically merges historical provinces (81->14 in 1999; 81->14 and 80->01 in 1995) across provincesGeo, districts87Geo, and ilcelerGeo', () => {
    const provincesGeo = JSON.parse(
      fs.readFileSync(path.resolve('public/tr-provinces.geojson'), 'utf8')
    ) as GeoCollection;
    const ilcelerGeo = JSON.parse(
      fs.readFileSync(path.resolve('public/tr-ilceler.geojson'), 'utf8')
    ) as GeoCollection;
    const districts87Geo = JSON.parse(
      fs.readFileSync(path.resolve('public/tr-districts-87.geojson'), 'utf8')
    ) as GeoCollection;

    const p01Orig = provincesGeo.features.find((f) => f.properties.id === '01')!;
    const p80Orig = provincesGeo.features.find((f) => f.properties.id === '80')!;
    const p14Orig = provincesGeo.features.find((f) => f.properties.id === '14')!;
    const p81Orig = provincesGeo.features.find((f) => f.properties.id === '81')!;

    const d01Orig = districts87Geo.features.find((f) => f.properties.id === '01')!;
    const d80Orig = districts87Geo.features.find((f) => f.properties.id === '80')!;
    const d14Orig = districts87Geo.features.find((f) => f.properties.id === '14')!;
    const d81Orig = districts87Geo.features.find((f) => f.properties.id === '81')!;

    // 1999 General Election: 80 provinces / 84 districts (Düzce 81 -> Bolu 14)
    const dyn99 = buildDynamicArchiveGeo({
      archiveId: '1999_general',
      provincesGeo,
      districts87Geo,
      ilcelerGeo,
    });
    expect(dyn99.provincesGeo?.features.length).toBe(80);
    expect(dyn99.districts87Geo?.features.length).toBe(84);
    expect(dyn99.ilcelerGeo?.features.length).toBe(919);
    expect(dyn99.provincesGeo!.features.some((f) => f.properties.id === '81')).toBe(false);
    expect(dyn99.districts87Geo!.features.some((f) => f.properties.id === '81')).toBe(false);

    const p14Merged99 = dyn99.provincesGeo!.features.find((f) => f.properties.id === '14')!;
    const d14Merged99 = dyn99.districts87Geo!.features.find((f) => f.properties.id === '14')!;
    expect(p14Merged99).toBeTruthy();
    expect(d14Merged99).toBeTruthy();
    expect(
      Math.abs(geoArea(p14Merged99 as any) - (geoArea(p14Orig as any) + geoArea(p81Orig as any)))
    ).toBeLessThan(1e-5);
    expect(
      Math.abs(geoArea(d14Merged99 as any) - (geoArea(d14Orig as any) + geoArea(d81Orig as any)))
    ).toBeLessThan(1e-5);
    const duzceIlces99 = dyn99.ilcelerGeo!.features.filter((f) => f.properties.id.startsWith('81-'));
    expect(duzceIlces99.length).toBeGreaterThan(0);
    for (const f of duzceIlces99) {
      expect(f.properties.ilId).toBe('14');
      expect(f.properties.districtId).toBe('14');
    }

    // 1995 General Election: 79 provinces / 83 districts (Düzce 81 -> Bolu 14, Osmaniye 80 -> Adana 01)
    const dyn95 = buildDynamicArchiveGeo({
      archiveId: '1995_general',
      provincesGeo,
      districts87Geo,
      ilcelerGeo,
    });
    expect(dyn95.provincesGeo?.features.length).toBe(79);
    expect(dyn95.districts87Geo?.features.length).toBe(83);
    expect(dyn95.ilcelerGeo?.features.length).toBe(919);
    expect(dyn95.provincesGeo!.features.some((f) => f.properties.id === '81')).toBe(false);
    expect(dyn95.provincesGeo!.features.some((f) => f.properties.id === '80')).toBe(false);
    expect(dyn95.districts87Geo!.features.some((f) => f.properties.id === '81')).toBe(false);
    expect(dyn95.districts87Geo!.features.some((f) => f.properties.id === '80')).toBe(false);

    const p01Merged95 = dyn95.provincesGeo!.features.find((f) => f.properties.id === '01')!;
    const d01Merged95 = dyn95.districts87Geo!.features.find((f) => f.properties.id === '01')!;
    const p14Merged95 = dyn95.provincesGeo!.features.find((f) => f.properties.id === '14')!;
    const d14Merged95 = dyn95.districts87Geo!.features.find((f) => f.properties.id === '14')!;
    expect(
      Math.abs(geoArea(p01Merged95 as any) - (geoArea(p01Orig as any) + geoArea(p80Orig as any)))
    ).toBeLessThan(1e-5);
    expect(
      Math.abs(geoArea(d01Merged95 as any) - (geoArea(d01Orig as any) + geoArea(d80Orig as any)))
    ).toBeLessThan(1e-5);
    expect(
      Math.abs(geoArea(p14Merged95 as any) - (geoArea(p14Orig as any) + geoArea(p81Orig as any)))
    ).toBeLessThan(1e-5);
    expect(
      Math.abs(geoArea(d14Merged95 as any) - (geoArea(d14Orig as any) + geoArea(d81Orig as any)))
    ).toBeLessThan(1e-5);

    const duzceIlces95 = dyn95.ilcelerGeo!.features.filter((f) => f.properties.id.startsWith('81-'));
    const osmaniyeIlces95 = dyn95.ilcelerGeo!.features.filter((f) => f.properties.id.startsWith('80-'));
    expect(duzceIlces95.length).toBeGreaterThan(0);
    expect(osmaniyeIlces95.length).toBeGreaterThan(0);
    for (const f of duzceIlces95) {
      expect(f.properties.ilId).toBe('14');
      expect(f.properties.districtId).toBe('14');
    }
    for (const f of osmaniyeIlces95) {
      expect(f.properties.ilId).toBe('01');
      expect(f.properties.districtId).toBe('01');
    }
  });

  it('computes live Wasted Vote %, Gallagher LSq, and ENEP/ENPP metrics across threshold What-If changes', async () => {
    await useElectionStore.getState().enterArchiveElection('2002_general');
    const st02 = useElectionStore.getState();
    expect(st02.archiveComparisonId).toBe('1999_general');

    const officialMetrics = computeElectoralMetrics(st02.projection, st02.parties);
    expect(officialMetrics.wastedVotePct).toBeGreaterThan(42);
    expect(officialMetrics.wastedVotePct).toBeLessThan(48);
    expect(officialMetrics.gallagherIndex).toBeGreaterThan(20);
    expect(officialMetrics.seatWinningPartiesCount).toBe(3);

    // What-If 5% threshold automatically drops unrepresented share, lowers Gallagher LSq, and reverts comparison to 'self'
    useElectionStore.getState().setThresholdPct(5.0);
    const after5 = useElectionStore.getState();
    expect(after5.archiveComparisonId).toBe('self');
    const loweredMetrics = computeElectoralMetrics(after5.projection, after5.parties);
    expect(loweredMetrics.wastedVotePct).toBeLessThan(15);
    expect(loweredMetrics.gallagherIndex).toBeLessThan(officialMetrics.gallagherIndex - 10);
    expect(loweredMetrics.seatWinningPartiesCount).toBeGreaterThanOrEqual(7);

    useElectionStore.getState().exitArchiveMode();
  });

  it('lazy-loads 2023 R1/R2, 2018, 2014 Presidential and 2017, 2010 Referendum archives with 0/81 province winner flips', async () => {
    const official = JSON.parse(
      fs.readFileSync(path.resolve(FIXTURES_DIR, 'official_pres_ref_prov.json'), 'utf8')
    ) as Record<
      string,
      {
        nationalShares: Record<string, number>;
        abroadShares: Record<string, number>;
        provinces: Record<string, { winner: string; shares: Record<string, number> }>;
      }
    >;

    const cases: Array<{
      id: '2023_pres_r2' | '2023_pres_r1' | '2018_pres' | '2014_pres' | '2017_ref' | '2010_ref';
      expectedRound: 1 | 2;
      expectedWinner: string;
      expectedCompare: '2023_pres_r1' | '2018_pres' | '2014_pres' | '2010_ref' | 'self';
    }> = [
      { id: '2023_pres_r2', expectedRound: 1, expectedWinner: 'erdogan', expectedCompare: '2023_pres_r1' },
      { id: '2023_pres_r1', expectedRound: 2, expectedWinner: 'erdogan', expectedCompare: '2018_pres' },
      { id: '2018_pres', expectedRound: 1, expectedWinner: 'erdogan', expectedCompare: '2014_pres' },
      { id: '2014_pres', expectedRound: 1, expectedWinner: 'erdogan', expectedCompare: 'self' },
      { id: '2017_ref', expectedRound: 1, expectedWinner: 'evet', expectedCompare: '2010_ref' },
      { id: '2010_ref', expectedRound: 1, expectedWinner: 'evet', expectedCompare: 'self' },
    ];

    for (const c of cases) {
      await useElectionStore.getState().enterArchiveElection(c.id);
      const st = useElectionStore.getState();
      expect(st.activeArchiveId).toBe(c.id);
      expect(st.electionMode).toBe('presidential');
      expect(st.archiveComparisonId).toBe(c.expectedCompare);
      expect(st.presidentialProjection.decidedInRound).toBe(c.expectedRound);
      expect(st.presidentialProjection.winnerCandidateId).toBe(c.expectedWinner);

      const ref = official[c.id];
      const provDiffs: string[] = [];
      for (const [ilId, pRes] of Object.entries(st.presidentialProjection.round1.provinceResults)) {
        const expWinner = ref.provinces[ilId]?.winner.toLowerCase();
        if (expWinner && pRes.leadingCandidateId !== expWinner) {
          provDiffs.push(`${c.id} ${ilId}(${pRes.name}): got=${pRes.leadingCandidateId} exp=${expWinner}`);
        }
      }
      expect(provDiffs).toEqual([]);

      // National shares match official within 0.15pp across all candidates/options
      for (const [key, expPct] of Object.entries(ref.nationalShares)) {
        const candSum = st.presidentialProjection.round1.candidateSummaries.find(
          (s) => s.candidateId === key.toLowerCase()
        );
        expect(candSum, `${c.id} missing candidate ${key}`).toBeTruthy();
        expect(Math.abs((candSum?.share ?? 0) - expPct)).toBeLessThan(0.15);
      }

      // Abroad shares also match official within 0.25pp (confirming ABROAD_COUNTRIES_2023 fallback fix!)
      const abrTotal = st.presidentialProjection.round1.abroadValidVotes || 1;
      for (const [key, expAbrPct] of Object.entries(ref.abroadShares)) {
        const candSum = st.presidentialProjection.round1.candidateSummaries.find(
          (s) => s.candidateId === key.toLowerCase()
        );
        const gotAbrPct = ((candSum?.abroadVotes ?? 0) / abrTotal) * 100;
        expect(Math.abs(gotAbrPct - expAbrPct)).toBeLessThan(0.25);
      }
    }

    useElectionStore.getState().exitArchiveMode();
  });

  it('auto-pairs cross-election comparisons, reverts to self on What-If edits, and remaps zoomed scope via stepArchiveElection', async () => {
    // Nov 2015 auto-pairs June 2015: AKP seat delta = 317 - 258 = +59
    await useElectionStore.getState().enterArchiveElection('2015_nov');
    const stNov = useElectionStore.getState();
    expect(stNov.archiveComparisonId).toBe('2015_june');
    expect(stNov.projection.partyTotalSeats.AKP - stNov.baselineProjection.partyTotalSeats.AKP).toBe(59);

    // Editing a What-If party share immediately reverts comparison reference back to 'self'
    useElectionStore.getState().updateNationalPartyShare('CHP', 28.0);
    const afterEdit = useElectionStore.getState();
    expect(afterEdit.archiveComparisonId).toBe('self');
    expect(afterEdit.baselineProjection.partyTotalSeats).toEqual(
      afterEdit.archiveSelfBaselineProjection.partyTotalSeats
    );

    // Chronological stepping preserves zoom/scope and remaps province boundaries across eras
    await useElectionStore.getState().enterArchiveElection('2002_general');
    useElectionStore.getState().setZoomedProvinceId('81');
    useElectionStore.getState().setActiveScope({ type: 'province', ilId: '81' });

    await useElectionStore.getState().stepArchiveElection(-1, 'general');
    const st99 = useElectionStore.getState();
    expect(st99.activeArchiveId).toBe('1999_general');
    expect(st99.zoomedProvinceId).toBe('14');
    expect(st99.activeScope).toEqual({ type: 'province', ilId: '14' });

    // Next check Osmaniye ('80') remapping into Adana ('01') when stepping from 1999 -> 1995
    useElectionStore.getState().setZoomedProvinceId('80');
    useElectionStore.getState().setActiveScope({ type: 'province', ilId: '80' });
    await useElectionStore.getState().stepArchiveElection(-1, 'general');
    const st95 = useElectionStore.getState();
    expect(st95.activeArchiveId).toBe('1995_general');
    expect(st95.zoomedProvinceId).toBe('01');
    expect(st95.activeScope).toEqual({ type: 'province', ilId: '01' });

    useElectionStore.getState().exitArchiveMode();
    expect(useElectionStore.getState().activeArchiveId).toBeNull();
  });

  it('lazy-loads 2014 and 2009 Local Elections with 30 vs 16 Büyükşehir, 970/955 ilçeler, and 0/81 province flips in self mode', async () => {
    await useElectionStore.getState().enterArchiveElection('2014_local', false);
    const st14Auto = useElectionStore.getState();
    expect(st14Auto.activeArchiveId).toBe('2014_local');
    expect(st14Auto.archiveComparisonId).toBe('2009_local');
    expect(st14Auto.localProjection.referenceYear).toBe(2009);

    await useElectionStore.getState().setArchiveComparisonId('self');
    const st14 = useElectionStore.getState();
    expect(st14.localProjection.referenceYear).toBe(2014);
    expect(Object.keys(st14.localProjection.provinceResults).length).toBe(81);
    expect(Object.keys(st14.localProjection.ilceResults).length).toBe(970);
    expect(
      Object.values(st14.localProjection.provinceResults).filter((p) => p.isBuyuksehir).length
    ).toBe(30);
    expect(st14.localProjection.flippedProvinceIds).toEqual([]);
    expect(st14.localProjection.flippedIlceIds).toEqual([]);
    expect(st14.localProjection.provinceResults['77'].winnerPartyId).toBe('CHP');
    expect(st14.localProjection.provinceResults['04'].winnerPartyId).toBe('DEM');
    expect(st14.localProjection.provinceResults['47'].winnerPartyId).toBe('OTHER');

    await useElectionStore.getState().enterArchiveElection('2009_local', false);
    const st09 = useElectionStore.getState();
    expect(st09.activeArchiveId).toBe('2009_local');
    expect(st09.archiveComparisonId).toBe('self');
    expect(st09.localProjection.referenceYear).toBe(2009);
    expect(Object.keys(st09.localProjection.provinceResults).length).toBe(81);
    expect(Object.keys(st09.localProjection.ilceResults).length).toBe(955);
    expect(
      Object.values(st09.localProjection.provinceResults).filter((p) => p.isBuyuksehir).length
    ).toBe(16);
    expect(st09.localProjection.flippedProvinceIds).toEqual([]);
    expect(st09.localProjection.flippedIlceIds).toEqual([]);
    expect(st09.localProjection.provinceResults['63'].winnerPartyId).toBe('OTHER');
    expect(st09.localProjection.provinceResults['58'].winnerPartyId).toBe('BBP');
    expect(st09.localProjection.provinceResults['26'].winnerPartyId).toBe('DSP');

    useElectionStore.getState().exitArchiveMode();
  });

  it('lazy-loads 1991 (107 regions) and 1987 (104 regions) General Elections with 450 MPs, 0 subCircles, 0 regional & provincial diffs, and cross-era compare', async () => {
    const official1991 = JSON.parse(
      fs.readFileSync(path.resolve(FIXTURES_DIR, 'official1991_prov.json'), 'utf8')
    ) as Record<string, Record<string, number>>;
    const official1987 = JSON.parse(
      fs.readFileSync(path.resolve(FIXTURES_DIR, 'official1987_prov.json'), 'utf8')
    ) as Record<string, Record<string, number>>;
    const officialRegions1991 = JSON.parse(
      fs.readFileSync(path.resolve(FIXTURES_DIR, 'official_regions_1991.json'), 'utf8')
    ) as Array<{ id: string; mpCount: number; officialSeats: Record<string, number> }>;
    const officialRegions1987 = JSON.parse(
      fs.readFileSync(path.resolve(FIXTURES_DIR, 'official_regions_1987.json'), 'utf8')
    ) as Array<{ id: string; mpCount: number; officialSeats: Record<string, number> }>;

    await useElectionStore.getState().enterArchiveElection('1991_general');
    const st91 = useElectionStore.getState();
    expect(st91.activeArchiveId).toBe('1991_general');
    expect(st91.archiveComparisonId).toBe('1987_general');
    expect(st91.dhondtMode).toBe('1987_kontenjan');
    expect(st91.projection.totalSeatsAllocated).toBe(450);
    expect(Object.keys(st91.projection.provinceResults).length).toBe(74);
    expect(Object.keys(st91.projection.districtResults).length).toBe(107);
    expect(Object.keys(st91.projection.ilceResults).length).toBe(919);
    expect(st91.customBaseline?.districts.every((d) => !d.subCircles || d.subCircles.length === 0)).toBe(true);
    expect(st91.projection.partyTotalSeats).toEqual({
      DP: 178,
      ANAP: 115,
      CHP: 88,
      SAADET: 62,
      DSP: 7,
      OTHER: 0,
    });
    for (const [ilId, exp] of Object.entries(official1991)) {
      const got = st91.projection.provinceResults[ilId].partySeats;
      for (const p of ['DP', 'ANAP', 'CHP', 'SAADET', 'DSP']) {
        expect(got[p] ?? 0, `1991 ${ilId}:${p}`).toBe(exp[p] ?? 0);
      }
    }
    const regDiffs91: string[] = [];
    for (const rExp of officialRegions1991) {
      const dGot = st91.projection.districtResults[rExp.id];
      expect(dGot.mpCount, `1991 ${rExp.id} mpCount`).toBe(rExp.mpCount);
      for (const p of ['DP', 'ANAP', 'CHP', 'SAADET', 'DSP']) {
        const g = dGot.partySeats[p] || 0;
        const e = rExp.officialSeats[p] || 0;
        if (g !== e) regDiffs91.push(`1991 ${rExp.id}:${p} got=${g} exp=${e}`);
      }
    }
    expect(regDiffs91).toEqual([]);
    const st91BaselineProj = st91.projection;

    // Switching 1991 to normal D'Hondt keeps 450 MPs while redistributing bonus-skewed seats
    useElectionStore.getState().setDHondtMode('2022_separate');
    const st91WhatIf = useElectionStore.getState();
    expect(st91WhatIf.archiveComparisonId).toBe('self');
    expect(st91WhatIf.projection.totalSeatsAllocated).toBe(450);
    expect(st91WhatIf.projection.partyTotalSeats.DSP).toBeGreaterThan(20);

    await useElectionStore.getState().enterArchiveElection('1987_general');
    const st87 = useElectionStore.getState();
    expect(st87.activeArchiveId).toBe('1987_general');
    expect(st87.dhondtMode).toBe('1987_kontenjan');
    expect(st87.projection.totalSeatsAllocated).toBe(450);
    expect(Object.keys(st87.projection.provinceResults).length).toBe(67);
    expect(Object.keys(st87.projection.districtResults).length).toBe(104);
    expect(Object.keys(st87.projection.ilceResults).length).toBe(920);
    expect(st87.customBaseline?.districts.every((d) => !d.subCircles || d.subCircles.length === 0)).toBe(true);
    expect(st87.projection.partyTotalSeats).toEqual({
      ANAP: 292,
      CHP: 99,
      DP: 59,
      DSP: 0,
      SAADET: 0,
      MHP: 0,
      IDP: 0,
      OTHER: 0,
    });
    for (const [ilId, exp] of Object.entries(official1987)) {
      const got = st87.projection.provinceResults[ilId].partySeats;
      for (const p of ['ANAP', 'CHP', 'DP']) {
        expect(got[p] ?? 0, `1987 ${ilId}:${p}`).toBe(exp[p] ?? 0);
      }
    }
    const regDiffs87: string[] = [];
    for (const rExp of officialRegions1987) {
      const dGot = st87.projection.districtResults[rExp.id];
      expect(dGot.mpCount, `1987 ${rExp.id} mpCount`).toBe(rExp.mpCount);
      for (const p of ['ANAP', 'CHP', 'DP']) {
        const g = dGot.partySeats[p] || 0;
        const e = rExp.officialSeats[p] || 0;
        if (g !== e) regDiffs87.push(`1987 ${rExp.id}:${p} got=${g} exp=${e}`);
      }
    }
    expect(regDiffs87).toEqual([]);

    // Cross-era alignParliamentaryComparison between 1991 (107) and 1987 (104)
    const aligned = alignParliamentaryComparison(
      st87.projection,
      ARCHIVE_ELECTIONS['1987_general'],
      st91BaselineProj,
      ARCHIVE_ELECTIONS['1991_general']
    );
    // Single-province identical region ('22' Edirne) preserves comparison partySeats directly
    expect(aligned.districtResults['22'].partySeats).toEqual(st87.projection.districtResults['22'].partySeats);
    // Reshaped circle ('16-1') aggregates matching ilce shares and omits incompatible regional partySeats
    expect(aligned.districtResults['16-1'].partySeats).toEqual({});

    // Switching 1987 to normal D'Hondt drops ANAP sharply from 292 while preserving 450 MPs
    useElectionStore.getState().setDHondtMode('2022_separate');
    const st87WhatIf = useElectionStore.getState();
    expect(st87WhatIf.projection.totalSeatsAllocated).toBe(450);
    expect(st87WhatIf.projection.partyTotalSeats.ANAP).toBeLessThan(260);

    useElectionStore.getState().exitArchiveMode();
  });

  it('dynamically dissolves 1991 (74 prov / 107 dist) and 1987 (67 prov / 104 dist) with authentic cross-province splits', () => {
    const provincesGeo = JSON.parse(
      fs.readFileSync(path.resolve('public/tr-provinces.geojson'), 'utf8')
    ) as GeoCollection;
    const ilcelerGeo = JSON.parse(
      fs.readFileSync(path.resolve('public/tr-ilceler.geojson'), 'utf8')
    ) as GeoCollection;
    const districts87Geo = JSON.parse(
      fs.readFileSync(path.resolve('public/tr-districts-87.geojson'), 'utf8')
    ) as GeoCollection;

    const p34Orig = provincesGeo.features.find((f) => f.properties.id === '34')!;
    const p16Orig = provincesGeo.features.find((f) => f.properties.id === '16')!;
    const p41Orig = provincesGeo.features.find((f) => f.properties.id === '41')!;
    const p77Orig = provincesGeo.features.find((f) => f.properties.id === '77')!;

    const dyn91 = buildDynamicArchiveGeo({
      archiveId: '1991_general',
      provincesGeo,
      districts87Geo,
      ilcelerGeo,
    });
    expect(dyn91.provincesGeo?.features.length).toBe(74);
    expect(dyn91.districts87Geo?.features.length).toBe(107);
    expect(dyn91.ilcelerGeo?.features.length).toBe(919);
    expect(dyn91.provincesGeo!.features.some((f) => f.properties.id === '77')).toBe(false);
    const p34Merged91 = dyn91.provincesGeo!.features.find((f) => f.properties.id === '34')!;
    const p16Merged91 = dyn91.provincesGeo!.features.find((f) => f.properties.id === '16')!;
    const p41Merged91 = dyn91.provincesGeo!.features.find((f) => f.properties.id === '41')!;
    expect(geoArea(p34Merged91 as any)).toBeGreaterThan(geoArea(p34Orig as any));
    expect(
      Math.abs(
        geoArea(p34Merged91 as any) +
          geoArea(p16Merged91 as any) +
          geoArea(p41Merged91 as any) -
          (geoArea(p34Orig as any) + geoArea(p16Orig as any) + geoArea(p41Orig as any) + geoArea(p77Orig as any))
      )
    ).toBeLessThan(1e-5);
    const yalovaIlce91 = dyn91.ilcelerGeo!.features.find((f) => f.properties.id === '77-merkez')!;
    expect(yalovaIlce91.properties.ilId).toBe('34');
    expect(yalovaIlce91.properties.districtId).toBe('34-1');

    const dyn87 = buildDynamicArchiveGeo({
      archiveId: '1987_general',
      provincesGeo,
      districts87Geo,
      ilcelerGeo,
    });
    expect(dyn87.provincesGeo?.features.length).toBe(67);
    expect(dyn87.districts87Geo?.features.length).toBe(104);
    expect(dyn87.ilcelerGeo?.features.length).toBe(920);
    expect(dyn87.provincesGeo!.features.some((f) => f.properties.id === '71')).toBe(false);
    expect(dyn87.provincesGeo!.features.some((f) => f.properties.id === '68')).toBe(false);
    expect(dyn87.districts87Geo!.features.some((f) => f.properties.id === '77')).toBe(false);
    const yalovaIlce87 = dyn87.ilcelerGeo!.features.find((f) => f.properties.id === '77-merkez')!;
    expect(yalovaIlce87.properties.ilId).toBe('34');
    expect(yalovaIlce87.properties.districtId).toBe('34-3');
  });
});
