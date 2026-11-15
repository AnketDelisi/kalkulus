import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import baseline2023Raw from '../../data/baseline2023.json';
import { DEFAULT_ALLIANCES, DEFAULT_PARTIES } from '../../data/defaultParties';
import { allocateDistrictSeatsDHondt, evaluateNationalThreshold } from '../dhondt';
import {
  normalizeSharesTo100,
  runMultiLayerProjection,
  sendRemainderToOther,
} from '../swing';
import { BaselineDataset } from '../../types/election';

const baseline2023 = baseline2023Raw as unknown as BaselineDataset;

describe('Kalkülüs Electoral Calculation Engine', () => {
  it('allocates the exact official YSK May 14, 2023 600 MPs across all 87 electoral districts', () => {
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
});
