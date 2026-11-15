import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import baseline2023Raw from '../../data/baseline2023.json';
import baseline2024Raw from '../../data/baseline2024.json';
import { DEFAULT_ALLIANCES, DEFAULT_PARTIES } from '../../data/defaultParties';
import { allocateDistrictSeatsDHondt, evaluateNationalThreshold } from '../dhondt';
import {
  normalizeSharesTo100,
  runMultiLayerProjection,
  sendRemainderToOther,
} from '../swing';
import { BaselineDataset } from '../../types/election';

const baseline2023 = baseline2023Raw as unknown as BaselineDataset;
const baseline2024 = baseline2024Raw as unknown as BaselineDataset;

describe('Kalkülüs Electoral Calculation Engine', () => {
  it('allocates the exact official YSK May 14, 2023 600 MPs across all 87 electoral districts matching repo 600', () => {
    const result = runMultiLayerProjection({
      baseline: baseline2023,
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      swingMode: 'proportional',
      dhondtMode: '2022_separate',
      thresholdPct: 7.0,
      nationalTargetShares: { ...baseline2023.nationalBaseShares },
      nationalTargetTurnout: baseline2023.nationalBaseTurnout,
      nationalVoterScaleFactor: 1.0,
      abroadConfig: baseline2023.abroad,
      ilceOverrides: {},
      districtOverrides: {},
      provinceOverrides: {},
      jointListRules: [],
    });

    expect(result.totalSeatsAllocated).toBe(600);
    expect(Object.keys(result.provinceResults).length).toBe(81);
    expect(Object.keys(result.districtResults).length).toBe(87);
    expect(Object.keys(result.ilceResults).length).toBe(973);

    // Exact YSK May 14, 2023 Seat Totals
    expect(result.partyTotalSeats['AKP']).toBe(268);
    expect(result.partyTotalSeats['CHP']).toBe(169);
    expect(result.partyTotalSeats['DEM']).toBe(61);
    expect(result.partyTotalSeats['MHP']).toBe(50);
    expect(result.partyTotalSeats['IYI']).toBe(43);
    expect(result.partyTotalSeats['YRP']).toBe(5);
    expect(result.partyTotalSeats['TIP']).toBe(4);

    // Verify per-district seat match against repo 600's mv2023 across all 87 districts
    const geo600Path = path.resolve(process.cwd(), 'scripts/data/repo600_geo.json');
    const geo600 = JSON.parse(fs.readFileSync(geo600Path, 'utf8')).map;
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
    for (const p of baseline2023.provinces) provFold[p.id] = foldTr(p.name);

    for (const d of baseline2023.districts) {
      const pFold = provFold[d.ilId];
      const key600 = d.id.includes('-')
        ? `${pFold}-${['i', 'ii', 'iii'][parseInt(d.id.split('-')[1], 10) - 1]}`
        : pFold;
      const expectedMv = geo600.mv2023[key600] || {};
      const actualSeats = result.districtResults[d.id].partySeats;
      expect(actualSeats['AKP'] || 0).toBe(expectedMv['akp'] || 0);
      expect(actualSeats['CHP'] || 0).toBe(expectedMv['chp'] || 0);
      expect(actualSeats['MHP'] || 0).toBe(expectedMv['mhp'] || 0);
      expect(actualSeats['IYI'] || 0).toBe(expectedMv['iyi'] || 0);
      expect(actualSeats['DEM'] || 0).toBe(expectedMv['dem'] || 0);
      expect(actualSeats['YRP'] || 0).toBe(expectedMv['yrp'] || 0);
      expect(actualSeats['TIP'] || 0).toBe(expectedMv['tip'] || 0);
    }

    // Verify major parties pass the 7% threshold via their alliances
    expect(result.partyPassedThreshold['AKP']).toBe(true);
    expect(result.partyPassedThreshold['CHP']).toBe(true);
    expect(result.partyPassedThreshold['MHP']).toBe(true);
    expect(result.partyPassedThreshold['IYI']).toBe(true);
    expect(result.partyPassedThreshold['DEM']).toBe(true);
    expect(result.partyPassedThreshold['YRP']).toBe(true); // Passed via Cumhur Alliance
    expect(result.partyPassedThreshold['ZP']).toBe(false); // Ata alliance below 7%
  });

  it('provides 87 unified electoral district polygons in public/tr-districts-87.geojson', () => {
    const geoPath = path.resolve(process.cwd(), 'public/tr-districts-87.geojson');
    const raw = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
    expect(raw.type).toBe('FeatureCollection');
    expect(raw.features.length).toBe(87);
    const ids = new Set(raw.features.map((f: any) => f.properties.id));
    expect(ids.has('34-1')).toBe(true);
    expect(ids.has('34-2')).toBe(true);
    expect(ids.has('34-3')).toBe(true);
    expect(ids.has('06-1')).toBe(true);
    expect(ids.has('06-2')).toBe(true);
    expect(ids.has('06-3')).toBe(true);
    expect(ids.has('35-1')).toBe(true);
    expect(ids.has('35-2')).toBe(true);
    expect(ids.has('16-1')).toBe(true);
    expect(ids.has('16-2')).toBe(true);
  });

  it('correctly applies National Threshold (Baraj) for solo parties vs. alliance members', () => {
    const votes = {
      AKP: 350000,
      YRP: 25000, // 2.5% solo, but in Cumhur alliance with AKP (35% + 2.5% = 37.5% >= 7%)
      ZP: 65000,  // 6.5% solo, in Ata alliance (6.5% < 7%)
      CHP: 560000,
    };
    const evalRes = evaluateNationalThreshold(votes, 1000000, DEFAULT_PARTIES, 7.0);
    expect(evalRes.partyPassed['YRP']).toBe(true);
    expect(evalRes.partyPassed['ZP']).toBe(false);
  });

  it('allocates district seats with D’Hondt and calculates exact votes to flip the last seat', () => {
    const eligible = new Set(['AKP', 'CHP', 'MHP']);
    const out = allocateDistrictSeatsDHondt({
      districtId: '05',
      mpCount: 3,
      partyVotes: {
        AKP: 100000,
        CHP: 75000,
        MHP: 48000,
      },
      eligiblePartyIds: eligible,
      parties: DEFAULT_PARTIES,
      dhondtMode: '2022_separate',
      jointListRules: [],
    });

    expect(out.partySeats['AKP']).toBe(2);
    expect(out.partySeats['CHP']).toBe(1);
    expect(out.partySeats['MHP']).toBe(0);
    expect(out.lastSeatWinnerPartyId).toBe('AKP');
    expect(out.closestChallengerPartyId).toBe('MHP');
    expect(out.votesToFlipLastSeat).toBe(2001);
  });

  it('preserves locked ilçe overrides when national shares swing', () => {
    const kadikoyId = '34-kadikoy';
    const customKadikoyShares = {
      AKP: 10,
      CHP: 70,
      MHP: 2,
      IYI: 5,
      DEM: 5,
      YRP: 1,
      ZP: 2,
      TIP: 4,
      BBP: 0.5,
      OTHER: 0.5,
    };

    const res = runMultiLayerProjection({
      baseline: baseline2023,
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      swingMode: 'uniform',
      dhondtMode: '2022_separate',
      thresholdPct: 7.0,
      nationalTargetShares: {
        ...baseline2023.nationalBaseShares,
        AKP: 50,
        CHP: 15,
      },
      nationalTargetTurnout: 85,
      nationalVoterScaleFactor: 1.0,
      abroadConfig: baseline2023.abroad,
      ilceOverrides: {
        [kadikoyId]: {
          partyShares: customKadikoyShares,
          turnout: 92.5,
          registeredVoters: 450000,
          isLocked: true,
        },
      },
      districtOverrides: {},
      provinceOverrides: {},
      jointListRules: [],
    });

    const kadikoyRes = res.ilceResults[kadikoyId];
    expect(kadikoyRes.isLocked).toBe(true);
    expect(kadikoyRes.partyShares['CHP']).toBeCloseTo(70, 1);
    expect(kadikoyRes.partyShares['AKP']).toBeCloseTo(10, 1);
    expect(kadikoyRes.turnout).toBeCloseTo(92.5, 2);
    expect(kadikoyRes.registeredVoters).toBe(450000);
  });

  it('normalizes shares to 100% and sends remainder to OTHER accurately', () => {
    const unnormalized = { AKP: 40, CHP: 40, MHP: 0, IYI: 0, DEM: 0, YRP: 0, ZP: 0, TIP: 0, BBP: 0, OTHER: 0 };
    const norm = normalizeSharesTo100(unnormalized, DEFAULT_PARTIES);
    expect(norm['AKP']).toBeCloseTo(50, 2);
    expect(norm['CHP']).toBeCloseTo(50, 2);

    const withOther = sendRemainderToOther(unnormalized, DEFAULT_PARTIES);
    expect(withOther['AKP']).toBe(40);
    expect(withOther['CHP']).toBe(40);
    expect(withOther['OTHER']).toBe(20);
  });

  it('projects exact 600 seats on 2024 local baseline without error', () => {
    const res = runMultiLayerProjection({
      baseline: baseline2024,
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      swingMode: 'proportional',
      dhondtMode: '2022_separate',
      thresholdPct: 7.0,
      nationalTargetShares: { ...baseline2024.nationalBaseShares },
      nationalTargetTurnout: baseline2024.nationalBaseTurnout,
      nationalVoterScaleFactor: 1.0,
      abroadConfig: baseline2024.abroad,
      ilceOverrides: {},
      districtOverrides: {},
      provinceOverrides: {},
      jointListRules: [],
    });

    expect(res.totalSeatsAllocated).toBe(600);
    expect(res.partyTotalSeats['AKP']).toBe(267);
    expect(res.partyTotalSeats['CHP']).toBe(241);
    expect(res.partyTotalSeats['YRP']).toBe(43);
    expect(res.partyTotalSeats['MHP']).toBe(36);
    expect(res.partyTotalSeats['IYI']).toBe(10);
    expect(res.partyTotalSeats['BBP']).toBe(3);
    expect(res.partyTotalSeats['DEM'] || 0).toBe(0); // DEM is at 5.88% below 7% threshold

    // When threshold is lowered to 5%, DEM passes and wins seats
    const resLowerBaraj = runMultiLayerProjection({
      baseline: baseline2024,
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      swingMode: 'proportional',
      dhondtMode: '2022_separate',
      thresholdPct: 5.0,
      nationalTargetShares: { ...baseline2024.nationalBaseShares },
      nationalTargetTurnout: baseline2024.nationalBaseTurnout,
      nationalVoterScaleFactor: 1.0,
      abroadConfig: baseline2024.abroad,
      ilceOverrides: {},
      districtOverrides: {},
      provinceOverrides: {},
      jointListRules: [],
    });
    expect(resLowerBaraj.partyTotalSeats['DEM']).toBe(45);
    expect(resLowerBaraj.totalSeatsAllocated).toBe(600);
  });

  it('correctly executes 2018 alliance pool D\'Hondt mode', () => {
    const eligible = new Set(['AKP', 'MHP', 'CHP', 'IYI']);
    const partiesWithAlliances = DEFAULT_PARTIES.map((p) => {
      if (p.id === 'AKP' || p.id === 'MHP') return { ...p, allianceId: 'cumhur' };
      if (p.id === 'CHP' || p.id === 'IYI') return { ...p, allianceId: 'millet' };
      return p;
    });

    const out = allocateDistrictSeatsDHondt({
      districtId: '06-1',
      mpCount: 5,
      partyVotes: {
        AKP: 120000,
        MHP: 80000,
        CHP: 150000,
        IYI: 40000,
      },
      eligiblePartyIds: eligible,
      parties: partiesWithAlliances,
      dhondtMode: '2018_alliance',
      jointListRules: [],
    });

    const cumhurSeats = (out.partySeats['AKP'] || 0) + (out.partySeats['MHP'] || 0);
    const milletSeats = (out.partySeats['CHP'] || 0) + (out.partySeats['IYI'] || 0);
    expect(cumhurSeats + milletSeats).toBe(5);
    expect(out.partySeats['AKP']).toBeGreaterThanOrEqual(1);
    expect(out.partySeats['CHP']).toBeGreaterThanOrEqual(1);
  });

  it('transfers votes and reserves seats under joint candidate list rules', () => {
    const eligible = new Set(['AKP', 'CHP', 'TIP']);
    const jointRule = {
      id: 'rule-tip-chp',
      sourcePartyId: 'TIP',
      targetPartyId: 'CHP',
      districtIds: ['01'],
      transferEfficiency: 90,
      reservedSeatsPerDistrict: 1,
      enabled: true,
    };

    const out = allocateDistrictSeatsDHondt({
      districtId: '01',
      mpCount: 4,
      partyVotes: {
        AKP: 100000,
        CHP: 60000,
        TIP: 40000,
      },
      eligiblePartyIds: eligible,
      parties: DEFAULT_PARTIES,
      dhondtMode: '2022_separate',
      jointListRules: [jointRule],
    });

    // Effective votes
    expect(out.effectivePartyVotes['TIP']).toBe(0);
    expect(out.effectivePartyVotes['CHP']).toBe(96000);
    // Reserved seats transferred back to source party
    expect(out.partySeats['TIP']).toBe(1);
  });

  it('identifies true closest challenger minimizing votes-to-flip rather than highest quotient', () => {
    // Scenario where Party A has higher quotient but needs MORE votes because divisor is larger:
    // Party A: 140,000 votes, 2 seats, next divisor 3, next quotient 46,666.7
    // Party B: 45,000 votes, 0 seats, next divisor 1, next quotient 45,000.0
    // Last seat winner Party C: 50,000 votes, 1 seat, last quotient 50,000.0
    // Party A needed votes: floor(50,000 * 3) + 1 - 140,000 = 10,001 votes
    // Party B needed votes: 50,000 * 1 = 50,000 (ties C's quotient and votes, wins alphabetical tie-break) -> 50,000 - 45,000 = 5,000 votes
    // True closest challenger must be Party B (5,000 votes), NOT Party A (10,001 votes)!
    const eligible = new Set(['A', 'B', 'C']);
    const customParties = [
      { id: 'A', name: 'Party A', shortName: 'A', color: '#ff0000', isOther: false },
      { id: 'B', name: 'Party B', shortName: 'B', color: '#00ff00', isOther: false },
      { id: 'C', name: 'Party C', shortName: 'C', color: '#0000ff', isOther: false },
    ] as any;

    const out = allocateDistrictSeatsDHondt({
      districtId: 'TEST-1',
      mpCount: 3,
      partyVotes: {
        A: 140000,
        B: 45000,
        C: 50000,
      },
      eligiblePartyIds: eligible,
      parties: customParties,
      dhondtMode: '2022_separate',
      jointListRules: [],
    });

    expect(out.partySeats['A']).toBe(2);
    expect(out.partySeats['C']).toBe(1);
    expect(out.partySeats['B']).toBe(0);
    expect(out.lastSeatWinnerPartyId).toBe('C');
    expect(out.lastSeatQuotient).toBe(50000);

    // True closest challenger must be B (min votes = 5,000 with tie-break awareness), not A
    expect(out.closestChallengerPartyId).toBe('B');
    expect(out.votesToFlipLastSeat).toBe(5000);

    // Verify on 2023 baseline Antalya (07):
    // AKP won the last seat (quotient 82,853.33).
    // CHP has a higher losing quotient (78,938.14 vs TIP 77,792.0), but divisor 7 -> needs 27,407 votes.
    // TIP has divisor 1 -> needs only 5,062 votes.
    // Algorithmic fix ensures TIP is correctly identified as the true closest challenger!
    const res23 = runMultiLayerProjection({
      baseline: baseline2023,
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      swingMode: 'proportional',
      dhondtMode: '2022_separate',
      thresholdPct: 7.0,
      nationalTargetShares: { ...baseline2023.nationalBaseShares },
      nationalTargetTurnout: baseline2023.nationalBaseTurnout,
      nationalVoterScaleFactor: 1.0,
      abroadConfig: baseline2023.abroad,
      ilceOverrides: {},
      districtOverrides: {},
      provinceOverrides: {},
      jointListRules: [],
    });

    const antalya = res23.districtResults['07'];
    expect(antalya.lastSeatWinnerPartyId).toBe('AKP');
    expect(antalya.closestChallengerPartyId).toBe('TIP');
    expect(antalya.votesToFlipLastSeat).toBe(5062);
  });

  it('conserves abroad votes exactly across all 87 districts with Hare-Niemeyer', () => {
    const res = runMultiLayerProjection({
      baseline: baseline2023,
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      swingMode: 'proportional',
      dhondtMode: '2022_separate',
      thresholdPct: 7.0,
      nationalTargetShares: { ...baseline2023.nationalBaseShares },
      nationalTargetTurnout: baseline2023.nationalBaseTurnout,
      nationalVoterScaleFactor: 1.0,
      abroadConfig: baseline2023.abroad,
      ilceOverrides: {},
      districtOverrides: {},
      provinceOverrides: {},
      jointListRules: [],
    });

    // Check exact conservation of abroad votes per party across all 87 districts
    for (const p of DEFAULT_PARTIES) {
      const nationalAbroad = res.abroadPartyVotes[p.id] || 0;
      let sumDistrictAbroad = 0;
      for (const d of baseline2023.districts) {
        sumDistrictAbroad += res.districtResults[d.id].abroadPartyVotes[p.id] || 0;
      }
      expect(sumDistrictAbroad).toBe(nationalAbroad);
    }

    // Check exact conservation of total abroad valid votes across all 87 districts
    let totalDistrictAbroadAdded = 0;
    for (const d of baseline2023.districts) {
      totalDistrictAbroadAdded += res.districtResults[d.id].abroadValidVotesAdded;
    }
    expect(totalDistrictAbroadAdded).toBe(res.abroadValidVotes);
  });

  it('handles zero turnout, zero MP, and 100% threshold boundary conditions safely', () => {
    const outZeroMp = allocateDistrictSeatsDHondt({
      districtId: '01',
      mpCount: 0,
      partyVotes: { AKP: 1000, CHP: 500 },
      eligiblePartyIds: new Set(['AKP', 'CHP']),
      parties: DEFAULT_PARTIES,
      dhondtMode: '2022_separate',
      jointListRules: [],
    });
    expect(outZeroMp.votesToFlipLastSeat).toBe(0);

    const evalHigh = evaluateNationalThreshold({ AKP: 500000, CHP: 500000 }, 1000000, DEFAULT_PARTIES, 100.0);
    expect(evalHigh.eligiblePartyIds.size).toBe(0);

    const evalZero = evaluateNationalThreshold({}, 0, DEFAULT_PARTIES, 7.0);
    expect(evalZero.eligiblePartyIds.size).toBe(0);
  });

  it('empirically verifies minimal votes to flip across all 87 electoral districts in baseline 2023', () => {
    const proj = runMultiLayerProjection({
      baseline: baseline2023,
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      swingMode: 'proportional',
      dhondtMode: '2022_separate',
      thresholdPct: 7.0,
      nationalTargetShares: { ...baseline2023.nationalBaseShares },
      nationalTargetTurnout: baseline2023.nationalBaseTurnout,
      nationalVoterScaleFactor: 1.0,
      abroadConfig: baseline2023.abroad,
      ilceOverrides: {},
      districtOverrides: {},
      provinceOverrides: {},
      jointListRules: [],
    });

    const eligiblePartyIds = new Set(
      Object.entries(proj.partyPassedThreshold)
        .filter(([_, p]) => p)
        .map(([id]) => id)
    );

    let districtsVerified = 0;

    for (const d of baseline2023.districts) {
      const dRes = proj.districtResults[d.id];
      expect(dRes).toBeDefined();
      expect(dRes.closestChallengerPartyId).toBeTruthy();
      expect(dRes.votesToFlipLastSeat).toBeGreaterThan(0);

      const chal = dRes.closestChallengerPartyId;
      const lastWinner = dRes.lastSeatWinnerPartyId;
      const origSeats = dRes.partySeats;
      const votesToFlip = dRes.votesToFlipLastSeat;

      // 1. Giving challenger exactly votesToFlipLastSeat must flip the seat (challenger gains, last winner loses)
      const resExact = allocateDistrictSeatsDHondt({
        districtId: d.id,
        mpCount: dRes.mpCount,
        partyVotes: {
          ...dRes.effectivePartyVotes,
          [chal]: (dRes.effectivePartyVotes[chal] || 0) + votesToFlip,
        },
        eligiblePartyIds,
        parties: DEFAULT_PARTIES,
        dhondtMode: '2022_separate',
        jointListRules: [],
      });

      expect(resExact.partySeats[chal] || 0).toBe((origSeats[chal] || 0) + 1);
      expect(resExact.partySeats[lastWinner] || 0).toBe((origSeats[lastWinner] || 0) - 1);

      // 2. Giving challenger votesToFlipLastSeat - 1 must strictly FAIL to flip the seat
      if (votesToFlip > 1) {
        const resMinus1 = allocateDistrictSeatsDHondt({
          districtId: d.id,
          mpCount: dRes.mpCount,
          partyVotes: {
            ...dRes.effectivePartyVotes,
            [chal]: (dRes.effectivePartyVotes[chal] || 0) + (votesToFlip - 1),
          },
          eligiblePartyIds,
          parties: DEFAULT_PARTIES,
          dhondtMode: '2022_separate',
          jointListRules: [],
        });

        expect(resMinus1.partySeats[chal] || 0).toBe(origSeats[chal] || 0);
        expect(resMinus1.partySeats[lastWinner] || 0).toBe(origSeats[lastWinner] || 0);
      }

      districtsVerified++;
    }

    expect(districtsVerified).toBe(87);
  });

  it('keeps YENI, A, and SAADET at 0 votes/seats at baseline and applies non-uniform proxy geography when given vote targets', () => {
    const baseProj = runMultiLayerProjection({
      baseline: baseline2023,
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      swingMode: 'proportional',
      dhondtMode: '2022_separate',
      thresholdPct: 7.0,
      nationalTargetShares: { ...baseline2023.nationalBaseShares },
      nationalTargetTurnout: baseline2023.nationalBaseTurnout,
      nationalVoterScaleFactor: 1.0,
      abroadConfig: baseline2023.abroad,
      ilceOverrides: {},
      districtOverrides: {},
      provinceOverrides: {},
      jointListRules: [],
    });

    for (const pid of ['A', 'YENI', 'SAADET']) {
      expect(baseProj.nationalPartyVotes[pid]).toBe(0);
      expect(baseProj.partyTotalSeats[pid]).toBe(0);
    }

    for (const swingMode of ['proportional', 'uniform'] as const) {
      const targetShares = {
        ...baseline2023.nationalBaseShares,
        AKP: Math.max(0, baseline2023.nationalBaseShares['AKP'] - 3),
        CHP: Math.max(0, baseline2023.nationalBaseShares['CHP'] - 5),
        IYI: Math.max(0, baseline2023.nationalBaseShares['IYI'] - 4),
        YRP: Math.max(0, baseline2023.nationalBaseShares['YRP'] - 1),
        YENI: 5,
        A: 6,
        SAADET: 2,
      };

      const proj = runMultiLayerProjection({
        baseline: baseline2023,
        parties: DEFAULT_PARTIES,
        alliances: DEFAULT_ALLIANCES,
        swingMode,
        dhondtMode: '2022_separate',
        thresholdPct: 7.0,
        nationalTargetShares: targetShares,
        nationalTargetTurnout: baseline2023.nationalBaseTurnout,
        nationalVoterScaleFactor: 1.0,
        abroadConfig: baseline2023.abroad,
        ilceOverrides: {},
        districtOverrides: {},
        provinceOverrides: {},
        jointListRules: [],
      });

      const kadikoy = proj.ilceResults['34-kadikoy'];
      const konyaMeram = proj.ilceResults['42-meram'];
      expect(kadikoy).toBeDefined();
      expect(konyaMeram).toBeDefined();

      // YENI follows CHP geography (higher in Kadikoy than in Meram), never flat uniform
      expect(kadikoy.partyShares['YENI']).toBeGreaterThan(konyaMeram.partyShares['YENI'] * 2);

      // SAADET follows YRP geography (higher in Meram than in Kadikoy)
      expect(konyaMeram.partyShares['SAADET']).toBeGreaterThan(kadikoy.partyShares['SAADET'] * 2);

      // A follows 75% IYI + 25% AKP geography (varies widely across ilceler, non-uniform)
      const aShares = Object.values(proj.ilceResults).map((r) => r.partyShares['A']);
      const minA = Math.min(...aShares);
      const maxA = Math.max(...aShares);
      expect(maxA).toBeGreaterThan(minA * 3);

      // Abroad also gets proxy-weighted non-zero shares when syncWithNationalSwing is enabled
      expect(proj.abroadPartyVotes['YENI']).toBeGreaterThan(0);
      expect(proj.abroadPartyVotes['A']).toBeGreaterThan(0);
      expect(proj.abroadPartyVotes['SAADET']).toBeGreaterThan(0);
      expect(proj.totalSeatsAllocated).toBe(600);
    }
  });
});
