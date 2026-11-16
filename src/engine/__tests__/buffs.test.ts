import { describe, expect, it } from 'vitest';
import baseline2023Raw from '../../data/baseline2023.json';
import { getCachedLocalBaseline } from '../../data/baselineCache';
import { DEFAULT_ALLIANCES, DEFAULT_PARTIES } from '../../data/defaultParties';
import {
  DEFAULT_PRESIDENTIAL_CANDIDATES,
  buildDefaultPresidentialR2Dynamics,
  buildDefaultTransferMatrix,
} from '../../data/presidentialDefaults';
import { DEFAULT_LOCAL_ALLIANCE_RULES } from '../../data/local2024Winners';
import { buildDefaultLocalDefectionConfig } from '../../data/localDefections';
import { buildDefaultLocalIncumbencyConfig } from '../../data/localIncumbencyDefaults';
import { useElectionStore } from '../../store/useElectionStore';
import type { BaselineDataset, LocalBuffRule } from '../../types/election';
import { applyLocalBuffsToShares, resolveMatchingBuffs } from '../buffs';
import { computeLocalProjection } from '../local';
import { computePresidentialProjection } from '../presidential';
import { runMultiLayerProjection } from '../swing';

const baseline2023 = baseline2023Raw as unknown as BaselineDataset;
const DEFAULT_TARGET_SHARES: Record<string, number> = {
  AKP: 35,
  CHP: 26,
  MHP: 10,
  IYI: 9,
  DEM: 9,
  YRP: 3,
  ZP: 2,
  TIP: 2,
  BBP: 1,
  A: 1,
  OTHER: 2,
};

describe('Local Buff System (Yerel Güç / Buff)', () => {
  it('applyLocalBuffsToShares handles proportional drain and explicit donor transfer', () => {
    const base = { AKP: 35, CHP: 30, MHP: 10, DEM: 10, IYI: 10, OTHER: 5 };
    const entities = Object.keys(base);

    const propBuff: LocalBuffRule = {
      id: 'b1',
      enabled: true,
      mode: 'parliamentary',
      unitType: 'province',
      unitId: '26',
      targetId: 'CHP',
      sourceId: null,
      bonusPp: 5,
    };

    const afterProp = applyLocalBuffsToShares(base, [propBuff], entities);
    expect(afterProp.CHP).toBeCloseTo(35, 6);
    expect(afterProp.AKP).toBeLessThan(35);
    const propSum = Object.values(afterProp).reduce((a, b) => a + b, 0);
    expect(propSum).toBeCloseTo(100, 6);

    const donorBuff: LocalBuffRule = {
      id: 'b2',
      enabled: true,
      mode: 'parliamentary',
      unitType: 'province',
      unitId: '26',
      targetId: 'CHP',
      sourceId: 'AKP',
      bonusPp: 4,
    };

    const afterDonor = applyLocalBuffsToShares(base, [donorBuff], entities);
    expect(afterDonor.CHP).toBeCloseTo(34, 6);
    expect(afterDonor.AKP).toBeCloseTo(31, 6);
    expect(afterDonor.MHP).toBeCloseTo(10, 6);
    expect(afterDonor.IYI).toBeCloseTo(10, 6);

    const negativeBuff: LocalBuffRule = {
      id: 'b3',
      enabled: true,
      mode: 'parliamentary',
      unitType: 'province',
      unitId: '26',
      targetId: 'AKP',
      sourceId: 'CHP',
      bonusPp: -3,
    };
    const afterNeg = applyLocalBuffsToShares(base, [negativeBuff], entities);
    expect(afterNeg.AKP).toBeCloseTo(32, 6);
    expect(afterNeg.CHP).toBeCloseTo(33, 6);
  });

  it('resolveMatchingBuffs filters by mode, enabled flag, and province/district/ilce hierarchy', () => {
    const buffs: LocalBuffRule[] = [
      {
        id: 'p1',
        enabled: true,
        mode: 'parliamentary',
        unitType: 'province',
        unitId: '26',
        targetId: 'CHP',
        bonusPp: 4,
      },
      {
        id: 'd1',
        enabled: true,
        mode: 'parliamentary',
        unitType: 'district',
        unitId: '34-1',
        targetId: 'CHP',
        bonusPp: 2,
      },
      {
        id: 'disabled',
        enabled: false,
        mode: 'parliamentary',
        unitType: 'province',
        unitId: '26',
        targetId: 'AKP',
        bonusPp: 5,
      },
      {
        id: 'pres',
        enabled: true,
        mode: 'presidential',
        unitType: 'province',
        unitId: '26',
        targetId: 'imamoglu',
        bonusPp: 4,
      },
    ];

    const matched26 = resolveMatchingBuffs(buffs, 'parliamentary', '26', '26-1', '2601');
    expect(matched26.map((b) => b.id)).toEqual(['p1']);

    const matchedPres26 = resolveMatchingBuffs(buffs, 'presidential', '26', undefined, '2601');
    expect(matchedPres26.map((b) => b.id)).toEqual(['pres']);
  });

  it('cascades Parliamentary province buff to unlocked ilceler while respecting hard ilce locks', () => {
    const prov26Ilceler = baseline2023.ilceler.filter((i) => i.ilId === '26');
    expect(prov26Ilceler.length).toBeGreaterThan(1);
    const lockedIlce = prov26Ilceler[0];
    const unlockedIlce = prov26Ilceler[1];

    const common = {
      baseline: baseline2023,
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      swingMode: 'proportional' as const,
      dhondtMode: '2022_separate' as const,
      thresholdPct: 7.0,
      nationalTargetShares: DEFAULT_TARGET_SHARES,
      nationalTargetTurnout: baseline2023.nationalBaseTurnout,
      nationalVoterScaleFactor: 1.0,
      abroadConfig: baseline2023.abroad,
      provinceOverrides: {},
      districtOverrides: {},
      ilceOverrides: {
        [lockedIlce.id]: {
          isLocked: true,
          partyShares: { ...lockedIlce.partyShares },
        },
      },
      jointListRules: [],
    };

    const withoutBuff = runMultiLayerProjection({ ...common, localBuffs: [] });
    const withBuff = runMultiLayerProjection({
      ...common,
      localBuffs: [
        {
          id: 'esk-chp',
          enabled: true,
          mode: 'parliamentary',
          unitType: 'province',
          unitId: '26',
          targetId: 'CHP',
          sourceId: 'AKP',
          bonusPp: 6,
        },
      ],
    });

    // Unlocked ilce receives the +6pp CHP / -6pp AKP buff
    const chpBefore = withoutBuff.ilceResults[unlockedIlce.id].partyShares.CHP;
    const chpAfter = withBuff.ilceResults[unlockedIlce.id].partyShares.CHP;
    expect(chpAfter - chpBefore).toBeGreaterThan(4.5);

    // Locked ilce ignores the buff
    expect(withBuff.ilceResults[lockedIlce.id].partyShares.CHP).toBeCloseTo(
      withoutBuff.ilceResults[lockedIlce.id].partyShares.CHP,
      6
    );
  });

  it('applies Presidential province buff in Round 1 and propagates to Round 2', () => {
    const candidateTargetShares = {
      imamoglu: 38.0,
      erdogan: 38.0,
      dervisoglu: 8.0,
      erbakan: 6.0,
      agiralioglu: 5.0,
      kilicdaroglu: 3.0,
      other: 2.0,
    };
    const transferMatrix = buildDefaultTransferMatrix(
      DEFAULT_PRESIDENTIAL_CANDIDATES,
      'imamoglu',
      'erdogan'
    );
    const round2Dynamics = buildDefaultPresidentialR2Dynamics(DEFAULT_PRESIDENTIAL_CANDIDATES);

    const common = {
      baseline: baseline2023,
      parties: DEFAULT_PARTIES,
      candidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
      swingMode: 'proportional' as const,
      candidateTargetShares,
      targetTurnout: baseline2023.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      abroadConfig: baseline2023.abroad,
      provinceOverrides: {},
      ilceOverrides: {},
      transferMatrix,
      round2Dynamics,
      referencePartyWeights: DEFAULT_TARGET_SHARES,
    };

    const basePres = computePresidentialProjection({ ...common, localBuffs: [] });
    const buffedPres = computePresidentialProjection({
      ...common,
      localBuffs: [
        {
          id: 'pres-06',
          enabled: true,
          mode: 'presidential',
          unitType: 'province',
          unitId: '06',
          targetId: 'imamoglu',
          sourceId: 'erdogan',
          bonusPp: 5,
        },
      ],
    });

    expect(buffedPres.round1.provinceResults['06'].candidateShares.imamoglu).toBeGreaterThan(
      basePres.round1.provinceResults['06'].candidateShares.imamoglu + 4
    );
    expect(buffedPres.round2.provinceResults['06'].candidateShares.imamoglu).toBeGreaterThan(
      basePres.round2.provinceResults['06'].candidateShares.imamoglu
    );
  });

  it('applies Local ilce buff inside computeLocalProjection', () => {
    const localBase = getCachedLocalBaseline('2024_local');
    const targetIlce = localBase.ilceler[0];
    const common = {
      baseline: localBase,
      parties: DEFAULT_PARTIES,
      swingMode: 'proportional' as const,
      localProvinceMode: 'merkez_ilce' as const,
      targetShares: DEFAULT_TARGET_SHARES,
      targetTurnout: localBase.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      provinceOverrides: {},
      ilceOverrides: {},
      localAllianceRules: DEFAULT_LOCAL_ALLIANCE_RULES,
      localIncumbency: buildDefaultLocalIncumbencyConfig(),
      localDefections: buildDefaultLocalDefectionConfig(),
    };

    const before = computeLocalProjection({ ...common, localBuffs: [] });
    const after = computeLocalProjection({
      ...common,
      localBuffs: [
        {
          id: 'loc-ilce',
          enabled: true,
          mode: 'local',
          unitType: 'ilce',
          unitId: targetIlce.id,
          targetId: 'CHP',
          sourceId: null,
          bonusPp: 7,
        },
      ],
    });

    expect(after.ilceResults[targetIlce.id].partyShares.CHP).toBeGreaterThan(
      before.ilceResults[targetIlce.id].partyShares.CHP + 5
    );
  });

  it('supports store CRUD, Undo/Redo, and JSON export/import round-trip for localBuffs', () => {
    const store = useElectionStore.getState();
    store.resetAllToBaseline();

    const beforeChp26 = useElectionStore.getState().projection.provinceResults['26'].partyShares.CHP;

    store.addLocalBuff({
      enabled: true,
      mode: 'parliamentary',
      unitType: 'province',
      unitId: '26',
      targetId: 'CHP',
      sourceId: 'AKP',
      bonusPp: 4,
      label: 'Eskişehir test buff',
    });

    const added = useElectionStore.getState().localBuffs;
    expect(added.length).toBe(1);
    const buffId = added[0].id;
    expect(useElectionStore.getState().projection.provinceResults['26'].partyShares.CHP).toBeGreaterThan(
      beforeChp26 + 3
    );

    // Toggle off
    useElectionStore.getState().toggleLocalBuff(buffId);
    expect(useElectionStore.getState().localBuffs[0].enabled).toBe(false);
    expect(useElectionStore.getState().projection.provinceResults['26'].partyShares.CHP).toBeCloseTo(
      beforeChp26,
      5
    );

    // Undo toggle -> back on
    useElectionStore.getState().undo();
    expect(useElectionStore.getState().localBuffs[0].enabled).toBe(true);

    // Export & Import round-trip
    const exported = useElectionStore.getState().exportScenarioJson();
    useElectionStore.getState().removeLocalBuff(buffId);
    expect(useElectionStore.getState().localBuffs.length).toBe(0);

    const ok = useElectionStore.getState().importScenarioJson(exported);
    expect(ok).toBe(true);
    expect(useElectionStore.getState().localBuffs.length).toBe(1);
    expect(useElectionStore.getState().localBuffs[0].label).toBe('Eskişehir test buff');

    // Clean up
    useElectionStore.getState().resetAllToBaseline();
  });
});
