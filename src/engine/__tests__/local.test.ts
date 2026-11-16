import { describe, expect, it } from 'vitest';
import { BASELINE_2019, LOCAL_BASELINES } from '../../data/baselines';
import { DEFAULT_PARTIES } from '../../data/defaultParties';
import {
  DEFAULT_LOCAL_ALLIANCE_RULES,
  PROVINCE_MUNICIPAL_META,
  WINNERS_2024_ILCELER,
  WINNERS_2024_PROVINCES,
} from '../../data/local2024Winners';
import { buildDefaultLocalDefectionConfig } from '../../data/localDefections';
import { buildDefaultLocalIncumbencyConfig } from '../../data/localIncumbencyDefaults';
import { computeLocalProjection } from '../local';

const DEFAULT_PARTY_SHARES: Record<string, number> = {
  AKP: 28.68,
  CHP: 2.96,
  MHP: 7.25,
  IYI: 4.96,
  DEM: 8.41,
  YRP: 4.09,
  ZP: 2.51,
  TIP: 1.62,
  A: 4.04,
  YENI: 32.61,
  SAADET: 1.02,
  BBP: 1.03,
  OTHER: 0.82,
};

describe('Local Election Engine', () => {
  const localBase = LOCAL_BASELINES['2024_local'];

  it('has exact 30 Büyükşehir + 51 Merkez İlçe = 81 provinces and exact 2024 official winner totals', () => {
    const bbCount = Object.values(PROVINCE_MUNICIPAL_META).filter((m) => m.isBuyuksehir).length;
    const ilCount = Object.values(PROVINCE_MUNICIPAL_META).filter((m) => !m.isBuyuksehir).length;
    expect(bbCount).toBe(30);
    expect(ilCount).toBe(51);

    const w24 = Object.values(WINNERS_2024_PROVINCES);
    expect(w24.length).toBe(81);
    const counts: Record<string, number> = {};
    for (const p of w24) counts[p] = (counts[p] || 0) + 1;
    expect(counts).toEqual({
      CHP: 35,
      AKP: 24,
      DEM: 10,
      MHP: 8,
      YRP: 2,
      IYI: 1,
      BBP: 1,
    });
  });

  it('computes 81 province wins (30 BB + 51 İl) and 973 ilçe wins with zero-sum ±2024 deltas', () => {
    const proj = computeLocalProjection({
      baseline: localBase,
      parties: DEFAULT_PARTIES,
      swingMode: 'proportional',
      localProvinceMode: 'merkez_ilce',
      targetShares: DEFAULT_PARTY_SHARES,
      targetTurnout: localBase.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      provinceOverrides: {},
      ilceOverrides: {},
      localAllianceRules: DEFAULT_LOCAL_ALLIANCE_RULES,
    });

    const summaries = Object.values(proj.partySummaries);
    const totalBB = summaries.reduce((s, x) => s + x.buyuksehirWins, 0);
    const totalIl = summaries.reduce((s, x) => s + x.ilMerkezWins, 0);
    const totalProv = summaries.reduce((s, x) => s + x.totalProvinceWins, 0);
    const totalIlce = summaries.reduce((s, x) => s + x.ilceWins, 0);
    const sumDeltaProv = summaries.reduce((s, x) => s + x.deltaProvinceFrom2024, 0);
    const sumDeltaIlce = summaries.reduce((s, x) => s + x.deltaIlceFrom2024, 0);

    expect(totalBB).toBe(30);
    expect(totalIl).toBe(51);
    expect(totalProv).toBe(81);
    expect(totalIlce).toBe(973);
    expect(sumDeltaProv).toBe(0);
    expect(sumDeltaIlce).toBe(0);
  });

  it('only alters the 51 non-Büyükşehir provinces when switching between merkez_ilce and province_wide', () => {
    const merkezProj = computeLocalProjection({
      baseline: localBase,
      parties: DEFAULT_PARTIES,
      swingMode: 'proportional',
      localProvinceMode: 'merkez_ilce',
      targetShares: DEFAULT_PARTY_SHARES,
      targetTurnout: localBase.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      provinceOverrides: {},
      ilceOverrides: {},
      localAllianceRules: [],
    });

    const wideProj = computeLocalProjection({
      baseline: localBase,
      parties: DEFAULT_PARTIES,
      swingMode: 'proportional',
      localProvinceMode: 'province_wide',
      targetShares: DEFAULT_PARTY_SHARES,
      targetTurnout: localBase.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      provinceOverrides: {},
      ilceOverrides: {},
      localAllianceRules: [],
    });

    for (const id of Object.keys(merkezProj.provinceResults)) {
      const mRes = merkezProj.provinceResults[id];
      const wRes = wideProj.provinceResults[id];
      if (mRes.isBuyuksehir) {
        expect(mRes.winnerPartyId).toBe(wRes.winnerPartyId);
        expect(mRes.validVotes).toBe(wRes.validVotes);
      } else {
        expect(mRes.countingBasis).toBe('merkez_ilce');
        expect(wRes.countingBasis).toBe('province_wide');
        expect(wRes.validVotes).toBeGreaterThanOrEqual(mRes.validVotes);
      }
    }
  });

  it('applies Cumhur Ortak Adayı withdrawal transfer when enabled', () => {
    const noRules = computeLocalProjection({
      baseline: localBase,
      parties: DEFAULT_PARTIES,
      swingMode: 'proportional',
      localProvinceMode: 'merkez_ilce',
      targetShares: DEFAULT_PARTY_SHARES,
      targetTurnout: localBase.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      provinceOverrides: {},
      ilceOverrides: {},
      localAllianceRules: DEFAULT_LOCAL_ALLIANCE_RULES,
    });

    const withRules = computeLocalProjection({
      baseline: localBase,
      parties: DEFAULT_PARTIES,
      swingMode: 'proportional',
      localProvinceMode: 'merkez_ilce',
      targetShares: DEFAULT_PARTY_SHARES,
      targetTurnout: localBase.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      provinceOverrides: {},
      ilceOverrides: {},
      localAllianceRules: DEFAULT_LOCAL_ALLIANCE_RULES.map((r) => ({ ...r, enabled: true })),
    });

    // In İstanbul ('34'), MHP withdraws in favor of AKP => MHP has 0 votes and AKP increases
    expect(withRules.provinceResults['34'].partyVotes.MHP).toBe(0);
    expect(withRules.provinceResults['34'].partyVotes.AKP).toBeGreaterThan(
      noRules.provinceResults['34'].partyVotes.AKP
    );
    // In Manisa ('45'), AKP withdraws in favor of MHP => AKP has 0 votes and MHP increases
    expect(withRules.provinceResults['45'].partyVotes.AKP).toBe(0);
    expect(withRules.provinceResults['45'].partyVotes.MHP).toBeGreaterThan(
      noRules.provinceResults['45'].partyVotes.MHP
    );
  });

  it('applies 2024-calibrated incumbency bonuses while conserving 100% province shares', () => {
    const incConfig = buildDefaultLocalIncumbencyConfig();
    const withoutInc = computeLocalProjection({
      baseline: localBase,
      parties: DEFAULT_PARTIES,
      swingMode: 'proportional',
      localProvinceMode: 'merkez_ilce',
      targetShares: DEFAULT_PARTY_SHARES,
      targetTurnout: localBase.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      provinceOverrides: {},
      ilceOverrides: {},
      localAllianceRules: [],
      localIncumbency: { ...incConfig, intensityPct: 0 },
    });

    const withInc = computeLocalProjection({
      baseline: localBase,
      parties: DEFAULT_PARTIES,
      swingMode: 'proportional',
      localProvinceMode: 'merkez_ilce',
      targetShares: DEFAULT_PARTY_SHARES,
      targetTurnout: localBase.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      provinceOverrides: {},
      ilceOverrides: {},
      localAllianceRules: [],
      localIncumbency: incConfig,
    });

    // Nevşehir ('50') gets calibrated IYI candidate bonus
    expect(withInc.provinceResults['50'].partyShares.IYI).toBeGreaterThan(
      withoutInc.provinceResults['50'].partyShares.IYI + 8
    );
    // Afyonkarahisar ('03') gets calibrated YENI bonus
    expect(withInc.provinceResults['03'].partyShares.YENI).toBeGreaterThan(
      withoutInc.provinceResults['03'].partyShares.YENI + 6
    );
    // Province shares remain normalized to 100%
    const sum50 = Object.values(withInc.provinceResults['50'].partyShares).reduce((a, b) => a + b, 0);
    expect(sum50).toBeCloseTo(100, 1);
  });

  it('triggers soft tactical consolidation only in competitive races and respects ballot floor', () => {
    const baseProj = computeLocalProjection({
      baseline: localBase,
      parties: DEFAULT_PARTIES,
      swingMode: 'proportional',
      localProvinceMode: 'merkez_ilce',
      targetShares: DEFAULT_PARTY_SHARES,
      targetTurnout: localBase.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      provinceOverrides: {
        // Competitive metropolis: gap = 3 pp (< 12 pp trigger)
        '34': {
          isLocked: true,
          partyShares: { YENI: 39, AKP: 42, DEM: 10, MHP: 4, YRP: 3, OTHER: 2 },
        },
        // Non-competitive landslide: gap = 25 pp (> 12 pp trigger)
        '09': {
          isLocked: true,
          partyShares: { YENI: 55, AKP: 30, DEM: 8, MHP: 4, OTHER: 3 },
        },
      },
      ilceOverrides: {},
      localAllianceRules: [],
    });

    const tacticalProj = computeLocalProjection({
      baseline: localBase,
      parties: DEFAULT_PARTIES,
      swingMode: 'proportional',
      localProvinceMode: 'merkez_ilce',
      targetShares: DEFAULT_PARTY_SHARES,
      targetTurnout: localBase.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      provinceOverrides: {
        '34': {
          isLocked: true,
          partyShares: { YENI: 39, AKP: 42, DEM: 10, MHP: 4, YRP: 3, OTHER: 2 },
        },
        '09': {
          isLocked: true,
          partyShares: { YENI: 55, AKP: 30, DEM: 8, MHP: 4, OTHER: 3 },
        },
      },
      ilceOverrides: {},
      localAllianceRules: [
        {
          id: 'test_soft',
          name: 'Soft Tactical',
          enabled: true,
          mode: 'tactical_soft',
          sourcePartyId: 'DEM',
          targetPartyId: 'YENI',
          provinceIds: ['34', '09'],
          transferEfficiency: 50,
          abstainPct: 10,
          maxMarginTriggerPct: 12,
          retainFloorPct: 35,
        },
      ],
    });

    // Safe race ('09', 25pp gap): DEM does not shift
    expect(tacticalProj.provinceResults['09'].partyVotes.DEM).toBe(
      baseProj.provinceResults['09'].partyVotes.DEM
    );
    expect(tacticalProj.provinceResults['09'].partyVotes.YENI).toBe(
      baseProj.provinceResults['09'].partyVotes.YENI
    );

    // Competitive race ('34', 3pp gap): DEM shifts to YENI and flips '34', yet stays >= 35% floor on ballot
    expect(tacticalProj.provinceResults['34'].partyVotes.DEM).toBeGreaterThanOrEqual(
      Math.floor(baseProj.provinceResults['34'].partyVotes.DEM * 0.35)
    );
    expect(tacticalProj.provinceResults['34'].partyVotes.DEM).toBeLessThan(
      baseProj.provinceResults['34'].partyVotes.DEM
    );
    expect(tacticalProj.provinceResults['34'].partyVotes.YENI).toBeGreaterThan(
      baseProj.provinceResults['34'].partyVotes.YENI
    );
    expect(tacticalProj.provinceResults['34'].winnerPartyId).toBe('YENI');
  });

  it('tracks post-2024 defections in Mevcut Yönetim baseline, transfers/penalizes incumbency, and toggles kayyım trustees', () => {
    const defConfig = buildDefaultLocalDefectionConfig();
    const incConfig = buildDefaultLocalIncumbencyConfig();

    const currentProj = computeLocalProjection({
      baseline: localBase,
      parties: DEFAULT_PARTIES,
      swingMode: 'proportional',
      localProvinceMode: 'merkez_ilce',
      targetShares: DEFAULT_PARTY_SHARES,
      targetTurnout: localBase.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      provinceOverrides: {},
      ilceOverrides: {},
      localAllianceRules: [],
      localIncumbency: incConfig,
      localDefections: { ...defConfig, referenceBaseline: 'current', includeKayyim: false },
    });

    // Current control reflects post-2024 switches
    expect(currentProj.referenceBaseline).toBe('current');
    expect(currentProj.provinceResults['35'].winner2024PartyId).toBe('AKP');
    expect(currentProj.provinceResults['09'].winner2024PartyId).toBe('AKP');
    expect(currentProj.provinceResults['03'].winner2024PartyId).toBe('AKP');
    expect(currentProj.provinceResults['63'].winner2024PartyId).toBe('OTHER');
    expect(currentProj.provinceResults['34'].winner2024PartyId).toBe('YENI');
    expect(currentProj.provinceResults['50'].winner2024PartyId).toBe('AKP');
    expect(currentProj.provinceResults['79'].winner2024PartyId).toBe('OTHER');
    expect(currentProj.provinceResults['06'].winner2024PartyId).toBe('OTHER');
    expect(currentProj.ilceResults['22-kesan'].baseline2024WinnerPartyId).toBe('AKP');
    expect(currentProj.ilceResults['34-beykoz'].baseline2024WinnerPartyId).toBe('AKP');
    // Without kayyim toggle, Mardin stays DEM
    expect(currentProj.provinceResults['47'].winner2024PartyId).toBe('DEM');

    // Cross-bloc defection removes YENI bonus in Afyonkarahisar ('03') & IYI bonus in Nevsehir ('50') vs no-defection run
    const noDefProj = computeLocalProjection({
      baseline: localBase,
      parties: DEFAULT_PARTIES,
      swingMode: 'proportional',
      localProvinceMode: 'merkez_ilce',
      targetShares: DEFAULT_PARTY_SHARES,
      targetTurnout: localBase.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      provinceOverrides: {},
      ilceOverrides: {},
      localAllianceRules: [],
      localIncumbency: incConfig,
    });
    expect(noDefProj.provinceResults['50'].winner2024PartyId).toBe('IYI');
    expect(currentProj.provinceResults['50'].partyShares.IYI).toBeLessThan(
      noDefProj.provinceResults['50'].partyShares.IYI - 8
    );
    expect(currentProj.provinceResults['50'].partyShares.AKP).toBeGreaterThan(
      noDefProj.provinceResults['50'].partyShares.AKP + 3
    );
    expect(currentProj.provinceResults['03'].partyShares.YENI).toBeLessThan(
      noDefProj.provinceResults['03'].partyShares.YENI - 5
    );
    expect(currentProj.provinceResults['03'].partyShares.AKP).toBeGreaterThan(
      noDefProj.provinceResults['03'].partyShares.AKP
    );

    // Enabling kayyim toggle switches trustee provinces/districts to OTHER and maintains zero-sum deltas
    const kayyimProj = computeLocalProjection({
      baseline: localBase,
      parties: DEFAULT_PARTIES,
      swingMode: 'proportional',
      localProvinceMode: 'merkez_ilce',
      targetShares: DEFAULT_PARTY_SHARES,
      targetTurnout: localBase.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      provinceOverrides: {},
      ilceOverrides: {},
      localAllianceRules: [],
      localIncumbency: incConfig,
      localDefections: { ...defConfig, referenceBaseline: 'current', includeKayyim: true },
    });

    expect(kayyimProj.provinceResults['47'].winner2024PartyId).toBe('OTHER');
    expect(kayyimProj.provinceResults['30'].winner2024PartyId).toBe('OTHER');
    expect(kayyimProj.ilceResults['34-esenyurt'].baseline2024WinnerPartyId).toBe('OTHER');
    expect(kayyimProj.ilceResults['62-ovacik'].baseline2024WinnerPartyId).toBe('OTHER');
    expect(kayyimProj.ilceResults['65-bahcesaray'].baseline2024WinnerPartyId).toBe('OTHER');

    const sumDeltaProv = Object.values(kayyimProj.partySummaries).reduce(
      (s, x) => s + x.deltaProvinceFrom2024,
      0
    );
    const sumDeltaIlce = Object.values(kayyimProj.partySummaries).reduce(
      (s, x) => s + x.deltaIlceFrom2024,
      0
    );
    expect(sumDeltaProv).toBe(0);
    expect(sumDeltaIlce).toBe(0);
  });

  it('builds 50/30/20 blend with conditional 2019 renormalization and joint-list de-aliasing', () => {
    const blendBase = LOCAL_BASELINES.local_50_30_20;
    const base24 = LOCAL_BASELINES['2024_local'];

    expect(blendBase.ilceler.length).toBe(973);
    expect(blendBase.abroad.enabled).toBe(false);

    // Every blended ilce sums to 100%
    for (const ilce of blendBase.ilceler) {
      const sum = Object.values(ilce.partyShares).reduce((s, v) => s + v, 0);
      expect(sum).toBeCloseTo(100, 1);
    }

    // YRP & ZP didn't run in 2019: conditional blend must NOT slash them by 20%
    expect(BASELINE_2019.nationalBaseShares.YRP).toBe(0);
    expect(blendBase.nationalBaseShares.YRP).toBeGreaterThan(base24.nationalBaseShares.YRP * 0.65);

    // Istanbul ('34') had 2019 council withdrawals for MHP (2.16%) and IYI (3.47%);
    // de-aliasing restores intra-bloc ratios so 2019 MHP lifts blended share above 2019/2024 raw
    const istIlces3020 = blendBase.ilceler.filter((i) => i.ilId === '34');
    const istIlces19Raw = BASELINE_2019.ilceler.filter((i) => i.ilId === '34');
    const weightedAvg = (list: typeof istIlces3020, pid: string) => {
      let totV = 0;
      let pV = 0;
      for (const i of list) {
        const v = i.registeredVoters * (i.turnout / 100);
        totV += v;
        pV += v * ((i.partyShares[pid] || 0) / 100);
      }
      return (pV / totV) * 100;
    };
    const mhp19Raw = weightedAvg(istIlces19Raw, 'MHP');
    const mhpBlend = weightedAvg(istIlces3020, 'MHP');
    expect(mhp19Raw).toBeLessThan(2.5);
    expect(mhpBlend).toBeGreaterThan(3.1);

    // Projection on local_50_30_20 maintains exact 81/973 zero-sum deltas
    const proj = computeLocalProjection({
      baseline: blendBase,
      parties: DEFAULT_PARTIES,
      swingMode: 'proportional',
      localProvinceMode: 'merkez_ilce',
      targetShares: DEFAULT_PARTY_SHARES,
      targetTurnout: blendBase.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      provinceOverrides: {},
      ilceOverrides: {},
      localAllianceRules: DEFAULT_LOCAL_ALLIANCE_RULES,
      localIncumbency: buildDefaultLocalIncumbencyConfig(),
      localDefections: buildDefaultLocalDefectionConfig(),
    });
    expect(Object.keys(proj.provinceResults).length).toBe(81);
    expect(Object.keys(proj.ilceResults).length).toBe(973);
    const sumProv = Object.values(proj.partySummaries).reduce((s, x) => s + x.deltaProvinceFrom2024, 0);
    const sumIlce = Object.values(proj.partySummaries).reduce((s, x) => s + x.deltaIlceFrom2024, 0);
    expect(sumProv).toBe(0);
    expect(sumIlce).toBe(0);
  });

  it('uses authentic YSK 973-ilce 2024 mayoral winners and realistic Kadikoy vs Sultanbeyli differentiation', () => {
    expect(Object.keys(WINNERS_2024_ILCELER).length).toBe(973);
    expect(WINNERS_2024_ILCELER['34-kadikoy']).toBe('CHP');
    expect(WINNERS_2024_ILCELER['34-esenyurt']).toBe('CHP');
    expect(WINNERS_2024_ILCELER['34-kagithane']).toBe('AKP');

    const base24 = LOCAL_BASELINES['2024_local'];
    const kadikoy = base24.ilceler.find((i) => i.id === '34-kadikoy')!;
    const sultanbeyli = base24.ilceler.find((i) => i.id === '34-sultanbeyli')!;

    expect(kadikoy.registeredVoters).toBeGreaterThan(250000);
    expect(sultanbeyli.registeredVoters).toBeGreaterThan(200000);
    expect((kadikoy.partyShares.YENI || 0) + (kadikoy.partyShares.CHP || 0)).toBeGreaterThan(65);
    expect(sultanbeyli.partyShares.AKP).toBeGreaterThan(40);
    expect(kadikoy.partyShares.AKP).toBeLessThan(20);
  });
});
