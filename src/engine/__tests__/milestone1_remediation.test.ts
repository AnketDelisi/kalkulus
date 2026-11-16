import { describe, expect, it } from 'vitest';
import { allocateDistrictSeatsDHondt } from '../dhondt';
import { computePresidentialProjection } from '../presidential';
import { computeLocalProjection } from '../local';
import { getEffectiveIlceBaseShares } from '../swing';
import { BASELINES } from '../../data/baselines';
import { DEFAULT_PARTIES } from '../../data/defaultParties';
import {
  DEFAULT_PRESIDENTIAL_CANDIDATES,
  buildDefaultTransferMatrix,
  deriveCandidateSharesFromParties,
} from '../../data/presidentialDefaults';
import {
  buildLocal5050Blend,
  buildThreeWayLocalBlend,
} from '../../data/baselineBuilders';
import { useElectionStore } from '../../store/useElectionStore';
import { clearBaselineCache, loadRawBaseline } from '../../data/baselineCache';
import baseline2024Raw from '../../data/baseline2024.json';
import baseline2023Raw from '../../data/baseline2023.json';
import ysk973Raw from '../../../scripts/data/ysk_973_ilceler.json';
import { BaselineDataset, JointListRule, LocalAllianceRule, LocalDefectionConfig } from '../../types/election';

const baseline2024 = baseline2024Raw as unknown as BaselineDataset;
const baseline2023 = baseline2023Raw as unknown as BaselineDataset;
const ysk973 = ysk973Raw as Record<string, any>;

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

describe('Milestone 1 Remediation & Quality Suite', () => {
  describe('1. Parliamentary D\'Hondt Engine', () => {
    it('updates lastSeatWinnerPartyId after Step 3 joint list reserved seat transfer when host party transfers all won seats', () => {
      // 1 MP district where AKP wins the sole seat, but joint rule transfers 1 seat to MHP
      const jointRule: JointListRule = {
        id: 'test-rule-1',
        enabled: true,
        sourcePartyId: 'MHP',
        targetPartyId: 'AKP',
        districtIds: ['TEST-1'],
        transferEfficiency: 100,
        reservedSeatsPerDistrict: 1,
      };

      const out = allocateDistrictSeatsDHondt({
        districtId: 'TEST-1',
        mpCount: 1,
        partyVotes: {
          AKP: 100000,
          CHP: 80000,
          MHP: 0,
        },
        eligiblePartyIds: new Set(['AKP', 'CHP', 'MHP']),
        parties: DEFAULT_PARTIES,
        dhondtMode: '2022_separate',
        jointListRules: [jointRule],
      });

      expect(out.partySeats['AKP'] || 0).toBe(0);
      expect(out.partySeats['MHP']).toBe(1);
      // The last seat winner must be MHP (the party that actually holds the seat), not AKP
      expect(out.lastSeatWinnerPartyId).toBe('MHP');
    });

    it('evaluates closest challenger across ALL eligible parties, including those with 0 district votes', () => {
      // District where AKP wins, and DEM is nationally eligible but has 0 votes in this district
      const out = allocateDistrictSeatsDHondt({
        districtId: 'TEST-2',
        mpCount: 1,
        partyVotes: {
          AKP: 100000,
          CHP: 90000,
          DEM: 0,
        },
        eligiblePartyIds: new Set(['AKP', 'CHP', 'DEM']),
        parties: DEFAULT_PARTIES,
        dhondtMode: '2022_separate',
        jointListRules: [],
      });

      expect(out.lastSeatWinnerPartyId).toBe('AKP');
      // CHP is closer (diff = 10001), but DEM was eligible and evaluated without error
      expect(out.closestChallengerPartyId).toBe('CHP');
      expect(out.votesToFlipLastSeat).toBe(10001);

      // Now if only DEM is eligible as challenger and has 0 votes:
      const out2 = allocateDistrictSeatsDHondt({
        districtId: 'TEST-3',
        mpCount: 1,
        partyVotes: {
          AKP: 50000,
          DEM: 0,
        },
        eligiblePartyIds: new Set(['AKP', 'DEM']),
        parties: DEFAULT_PARTIES,
        dhondtMode: '2022_separate',
        jointListRules: [],
      });

      expect(out2.lastSeatWinnerPartyId).toBe('AKP');
      expect(out2.closestChallengerPartyId).toBe('DEM');
      // DEM needs 50001 votes (or tiebreak) to flip the seat from 0 votes
      expect(out2.votesToFlipLastSeat).toBeGreaterThanOrEqual(50000);
    });
  });

  describe('2. Presidential Mode Engine & State Sync', () => {
    const baseline = BASELINES['blended_90_10'];
    const candidates = DEFAULT_PRESIDENTIAL_CANDIDATES;
    const defaultShares = deriveCandidateSharesFromParties(
      candidates,
      DEFAULT_PARTY_SHARES
    );
    const transferMatrix = buildDefaultTransferMatrix(candidates, 'imamoglu', 'erdogan');

    it('gates Round 2 abroad votes on abroadConfig.enabled', () => {
      // 1. With abroad disabled
      const projDisabled = computePresidentialProjection({
        baseline,
        parties: DEFAULT_PARTIES,
        candidates,
        swingMode: 'proportional',
        candidateTargetShares: defaultShares,
        targetTurnout: baseline.nationalBaseTurnout,
        voterScaleFactor: 1.0,
        abroadConfig: {
          ...baseline.abroad,
          enabled: false,
        },
        provinceOverrides: {},
        ilceOverrides: {},
        transferMatrix,
        referencePartyWeights: DEFAULT_PARTY_SHARES,
      });

      expect(projDisabled.decidedInRound).toBe(2);
      expect(projDisabled.round2).toBeDefined();
      const firstCandDisabled = projDisabled.round2.candidateSummaries[0];
      const secondCandDisabled = projDisabled.round2.candidateSummaries[1];
      expect(firstCandDisabled.abroadVotes).toBe(0);
      expect(secondCandDisabled.abroadVotes).toBe(0);
      expect(firstCandDisabled.votes).toBe(firstCandDisabled.domesticVotes);
      expect(projDisabled.round2.abroadValidVotes).toBe(0);

      // 2. With abroad enabled
      const projEnabled = computePresidentialProjection({
        baseline,
        parties: DEFAULT_PARTIES,
        candidates,
        swingMode: 'proportional',
        candidateTargetShares: defaultShares,
        targetTurnout: baseline.nationalBaseTurnout,
        voterScaleFactor: 1.0,
        abroadConfig: {
          ...baseline.abroad,
          enabled: true,
        },
        provinceOverrides: {},
        ilceOverrides: {},
        transferMatrix,
        referencePartyWeights: DEFAULT_PARTY_SHARES,
      });

      const firstCandEnabled = projEnabled.round2.candidateSummaries[0];
      const secondCandEnabled = projEnabled.round2.candidateSummaries[1];
      expect(firstCandEnabled.abroadVotes).toBeGreaterThan(0);
      expect(secondCandEnabled.abroadVotes).toBeGreaterThan(0);
      expect(projEnabled.round2.abroadValidVotes).toBeGreaterThan(0);
    });

    it('tracks finalists in store and swaps toFirstPct and toSecondPct when ranking flips', async () => {
      await useElectionStore.getState().initBaselines();
      const store = useElectionStore.getState();
      store.setElectionMode('presidential');

      // Set shares where imamoglu is #1 and erdogan is #2
      store.updatePresCandidateShare('imamoglu', 46);
      store.updatePresCandidateShare('erdogan', 42);
      store.updatePresCandidateShare('dervisoglu', 12);

      const state1 = useElectionStore.getState();
      expect(state1.presTransferFinalists).toEqual(['imamoglu', 'erdogan']);
      const dervToFirst1 = state1.presTransferMatrix['dervisoglu']?.toFirstPct;
      const dervToSecond1 = state1.presTransferMatrix['dervisoglu']?.toSecondPct;

      // Now flip rankings so erdogan is #1 and imamoglu is #2
      store.updatePresCandidateShare('erdogan', 48);
      store.updatePresCandidateShare('imamoglu', 40);

      const state2 = useElectionStore.getState();
      expect(state2.presTransferFinalists).toEqual(['erdogan', 'imamoglu']);
      // When rankings flip, toFirstPct (now to erdogan) should equal previous toSecondPct (previously to erdogan)
      expect(state2.presTransferMatrix['dervisoglu'].toFirstPct).toBe(dervToSecond1);
      expect(state2.presTransferMatrix['dervisoglu'].toSecondPct).toBe(dervToFirst1);
    });
  });

  describe('3. Local Election Engine Remediation', () => {
    it('allows OTHER (Independents) to win plurality without false flips in local mode', () => {
      const proj = computeLocalProjection({
        baseline: baseline2024,
        parties: DEFAULT_PARTIES,
        swingMode: 'proportional',
        localProvinceMode: 'merkez_ilce',
        targetShares: { ...baseline2024.nationalBaseShares },
        targetTurnout: baseline2024.nationalBaseTurnout,
        voterScaleFactor: 1.0,
        provinceOverrides: {},
        ilceOverrides: {
          '34-adalar': {
            isLocked: true,
            partyShares: {
              OTHER: 55,
              AKP: 25,
              CHP: 20,
            },
          },
        },
        localAllianceRules: [],
      });

      const adalar = proj.ilceResults['34-adalar'];
      expect(adalar).toBeDefined();
      expect(adalar.winnerPartyId).toBe('OTHER');
      expect(adalar.marginPct).toBeCloseTo(30, 1);
    });

    it('applies ilce-level defection personal carryovers and tactical alliance shifts to ilceResults', () => {
      const targetIlceId = '34-kadikoy';
      const baseProjBefore = computeLocalProjection({
        baseline: baseline2024,
        parties: DEFAULT_PARTIES,
        swingMode: 'proportional',
        localProvinceMode: 'merkez_ilce',
        targetShares: { ...baseline2024.nationalBaseShares },
        targetTurnout: baseline2024.nationalBaseTurnout,
        voterScaleFactor: 1.0,
        provinceOverrides: {},
        ilceOverrides: {},
        localAllianceRules: [],
      });
      const akpBefore = baseProjBefore.ilceResults[targetIlceId]?.partyVotes['AKP'] || 0;
      const chpBefore = baseProjBefore.ilceResults[targetIlceId]?.partyVotes['CHP'] || 0;

      // Add a tactical alliance rule: withdrawal from CHP to AKP in 34-kadikoy
      const allianceRule: LocalAllianceRule = {
        id: 'test-kadikoy-alliance',
        name: 'Kadıköy Test Alliance',
        enabled: true,
        mode: 'withdrawal',
        sourcePartyId: 'CHP',
        targetPartyId: 'AKP',
        provinceIds: ['34'],
        transferEfficiency: 100,
      };

      const projAfter = computeLocalProjection({
        baseline: baseline2024,
        parties: DEFAULT_PARTIES,
        swingMode: 'proportional',
        localProvinceMode: 'merkez_ilce',
        targetShares: { ...baseline2024.nationalBaseShares },
        targetTurnout: baseline2024.nationalBaseTurnout,
        voterScaleFactor: 1.0,
        provinceOverrides: {},
        ilceOverrides: {},
        localAllianceRules: [allianceRule],
      });

      const kadikoyRes = projAfter.ilceResults[targetIlceId];
      expect(kadikoyRes).toBeDefined();
      // AKP votes in Kadıköy must have received the shifted votes from CHP
      expect(kadikoyRes.partyVotes['AKP']).toBeGreaterThan(akpBefore);
      expect(kadikoyRes.partyVotes['CHP'] || 0).toBe(0);

      // Also test localDefections on ilce level with active incumbency
      const defectionConfig: LocalDefectionConfig = {
        referenceBaseline: 'current',
        includeKayyim: false,
        carryoverPct: 80,
        backlashPp: 0,
        entries: [
          {
            id: 'kadikoy-def-1',
            unitType: 'ilce',
            unitId: targetIlceId,
            unitName: 'Kadıköy',
            kind: 'defection',
            fromPartyId: 'CHP',
            toPartyId: 'YENI',
            enabled: true,
            personalCarryoverPct: 50,
          },
        ],
      };

      const projDefection = computeLocalProjection({
        baseline: baseline2024,
        parties: DEFAULT_PARTIES,
        swingMode: 'proportional',
        localProvinceMode: 'merkez_ilce',
        targetShares: { ...baseline2024.nationalBaseShares },
        targetTurnout: baseline2024.nationalBaseTurnout,
        voterScaleFactor: 1.0,
        provinceOverrides: {},
        ilceOverrides: {},
        localAllianceRules: [],
        localIncumbency: { intensityPct: 100, provinceBonuses: {} },
        localDefections: defectionConfig,
      });

      const kadikoyDef = projDefection.ilceResults[targetIlceId];
      expect(kadikoyDef.partyVotes['YENI']).toBeGreaterThan(0);
      expect(kadikoyDef.partyVotes['CHP']).toBeLessThan(chpBefore);
    });

    it('respects ilceOverrides[merkezIlceId]?.isLocked in non-Büyükşehir merkez ilçe calculations', () => {
      // 60 Tokat is a non-Büyükşehir province where the mayor is elected in the merkez ilçe (60-merkez)
      const merkezId = '60-merkez';
      const proj = computeLocalProjection({
        baseline: baseline2024,
        parties: DEFAULT_PARTIES,
        swingMode: 'proportional',
        localProvinceMode: 'merkez_ilce',
        targetShares: { ...baseline2024.nationalBaseShares },
        targetTurnout: baseline2024.nationalBaseTurnout,
        voterScaleFactor: 1.0,
        provinceOverrides: {},
        ilceOverrides: {
          [merkezId]: {
            isLocked: true,
            partyShares: {
              MHP: 60,
              AKP: 30,
              CHP: 10,
            },
          },
        },
      });

      const tokatProvince = proj.provinceResults['60'];
      expect(tokatProvince).toBeDefined();
      expect(tokatProvince.winnerPartyId).toBe('MHP');
      expect(tokatProvince.countingBasis).toBe('merkez_ilce');
      expect(tokatProvince.partyShares['MHP']).toBeCloseTo(60, 1);
    });
  });

  describe('4. Baseline Dataset & Types Remediation', () => {
    it('generates authentic baseline IDs local_50_50 and local_50_30_20', () => {
      const b5050 = buildLocal5050Blend(baseline2023, baseline2024);
      expect(b5050.id).toBe('local_50_50');
      expect(b5050.nameTr).toContain('50');

      const b503020 = buildThreeWayLocalBlend(baseline2024, baseline2023, baseline2023);
      expect(b503020.id).toBe('local_50_30_20');
      expect(b503020.nameTr).toContain('50');
    });

    it('strictly restricts 2023 general dealiasing when applyJoint2023Dealiasing flag is false', () => {
      const yozgatIlce = {
        id: '66-merkez',
        districtId: '66',
        ilId: '66',
        name: 'Yozgat Merkez',
        lat: 39.82,
        lng: 34.81,
        registeredVoters: 70000,
        turnout: 85,
        validVoteRatio: 98,
        partyShares: {
          AKP: 40,
          IYI: 30,
          CHP: 0,
        },
      };

      // When applyJoint2023Dealiasing is false (local elections or unmodified baseline):
      const unshifted = getEffectiveIlceBaseShares(yozgatIlce, false);
      expect(unshifted['CHP']).toBe(0);
      expect(unshifted['IYI']).toBe(30);

      // When applyJoint2023Dealiasing is true (2023 general modified baseline):
      const dealiased = getEffectiveIlceBaseShares(yozgatIlce, true);
      expect(dealiased['CHP']).toBeGreaterThan(0);
      expect(dealiased['IYI']).toBeLessThan(30);
    });
  });

  describe('5. YSK Data Pipeline Remediation', () => {
    it('verifies 60-almus has authentic 2024 council shares and valid total', () => {
      const almusYsk = ysk973['60-almus'];
      expect(almusYsk).toBeDefined();
      expect(almusYsk.v24).toBeDefined();

      // Check authentic YSK 2024 local council shares
      expect(almusYsk.v24['MHP']).toBeCloseTo(49.33, 1);
      expect(almusYsk.v24['AKP']).toBeCloseTo(45.45, 1);
      expect(almusYsk.v24['CHP']).toBeCloseTo(3.25, 1);

      // Verify in baseline2024
      const almus = baseline2024.ilceler.find((i) => i.id === '60-almus');
      expect(almus).toBeDefined();
      expect(almus!.partyShares).toBeDefined();
      expect(almus!.partyShares['MHP']).toBeGreaterThan(40);
      expect(almus!.partyShares['AKP']).toBeGreaterThan(30);

      // Shares sum to ~100%
      const totalShares = Object.values(almus!.partyShares).reduce((a, b) => a + b, 0);
      expect(totalShares).toBeGreaterThan(99.5);
      expect(totalShares).toBeLessThan(100.5);

      // National YRP 2024 share is below 7% threshold (6.99%)
      expect(baseline2024.nationalBaseShares['YRP']).toBeLessThan(7.0);
      expect(baseline2024.nationalBaseShares['YRP']).toBeGreaterThan(6.9);
    });
  });

  describe('6. Baseline Caching & State Sync Remediation', () => {
    it('evicts rejected promises from rawPromiseCache so subsequent fetches can retry', async () => {
      clearBaselineCache();
      // Request an invalid baseline year
      await expect(loadRawBaseline(9999 as any)).rejects.toThrow();

      // Second call should also attempt load (and reject cleanly) instead of returning a permanently stuck promise
      await expect(loadRawBaseline(9999 as any)).rejects.toThrow();
    });

    it('setBaselineId updates baselineProjection to synchronize with active baseline', async () => {
      await useElectionStore.getState().initBaselines();
      const store = useElectionStore.getState();

      store.setBaselineId('2023_general');
      const state2023 = useElectionStore.getState();
      expect(state2023.baselineId).toBe('2023_general');
      // In 2023 baseline, total AKP seats is 269 (with default unallied YRP under threshold)
      expect(state2023.baselineProjection.partyTotalSeats['AKP']).toBe(269);

      store.setBaselineId('blended_90_10');
      const stateBlended = useElectionStore.getState();
      expect(stateBlended.baselineId).toBe('blended_90_10');
      // In blended 90/10, baseline projection seats reflect blended baseline (270 seats)
      expect(stateBlended.baselineProjection.partyTotalSeats['AKP']).toBe(270);
    });
  });

  describe('7. Local UI Scope-Aware Operations', () => {
    it('updates local turnout and voters at province and ilce scopes and normalizes correctly', () => {
      const store = useElectionStore.getState();
      store.setElectionMode('local');

      // Province scope turnout & registered voters
      store.updateLocalProvinceTurnoutAndVoters('34', 86.5, 11400000);
      expect(useElectionStore.getState().localProvinceOverrides['34']?.turnout).toBe(86.5);
      expect(useElectionStore.getState().localProvinceOverrides['34']?.registeredVoters).toBe(11400000);

      // İlçe scope turnout & registered voters
      store.updateLocalIlceTurnoutAndVoters('34-kadikoy', 89.2, 274000);
      expect(useElectionStore.getState().localIlceOverrides['34-kadikoy']?.turnout).toBe(89.2);
      expect(useElectionStore.getState().localIlceOverrides['34-kadikoy']?.registeredVoters).toBe(274000);

      // Normalization at ilce scope with explicit scope parameter
      store.updateLocalIlceShare('34-kadikoy', 'CHP', 60);
      store.updateLocalIlceShare('34-kadikoy', 'AKP', 20);
      store.normalizeLocalShares('ilce', '34-kadikoy');

      const kadikoyShares = useElectionStore.getState().localIlceOverrides['34-kadikoy']?.partyShares || {};
      const sum = Object.values(kadikoyShares).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(100, 1);
    });
  });
});
