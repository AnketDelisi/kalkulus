import { create } from 'zustand';
import baseline2023Raw from '../data/baseline2023.json';
import baseline2024Raw from '../data/baseline2024.json';
import { DEFAULT_ALLIANCES, DEFAULT_PARTIES } from '../data/defaultParties';
import {
  DistrictOverride,
  IlceOverride,
  ProvinceOverride,
  normalizeSharesTo100,
  runMultiLayerProjection,
  sendRemainderToOther,
} from '../engine/swing';
import {
  AbroadVoteConfig,
  AllianceConfig,
  BaselineDataset,
  BaselineId,
  ComputedElectionProjection,
  DHondtMode,
  JointListRule,
  Language,
  MapColorMode,
  MapLayerMode,
  PartyConfig,
  SwingMode,
} from '../types/election';

const BASELINES: Record<string, BaselineDataset> = {
  '2023_general': baseline2023Raw as unknown as BaselineDataset,
  '2024_local': baseline2024Raw as unknown as BaselineDataset,
};

export type ActiveEditorScope =
  | { type: 'national' }
  | { type: 'abroad' }
  | { type: 'province'; ilId: string }
  | { type: 'district'; districtId: string }
  | { type: 'ilce'; ilceId: string };

interface ElectionStoreState {
  lang: Language;
  baselineId: BaselineId;
  customBaseline: BaselineDataset | null;
  parties: PartyConfig[];
  alliances: AllianceConfig[];
  swingMode: SwingMode;
  dhondtMode: DHondtMode;
  thresholdPct: number;

  // National & Abroad user inputs
  nationalTargetShares: Record<string, number>;
  nationalTargetTurnout: number;
  nationalVoterScaleFactor: number;
  abroadConfig: AbroadVoteConfig;

  // Hierarchical overrides
  provinceOverrides: Record<string, ProvinceOverride>;
  districtOverrides: Record<string, DistrictOverride>;
  ilceOverrides: Record<string, IlceOverride>;

  // Tactical voting / joint candidate lists
  jointListRules: JointListRule[];

  // Map & UI selection state
  mapLayer: MapLayerMode;
  mapColorMode: MapColorMode;
  zoomedProvinceId: string | null;
  activeScope: ActiveEditorScope;

  // Computed results (memoized & updated on every state change)
  projection: ComputedElectionProjection;
  baselineProjection: ComputedElectionProjection;

  // Actions
  setLanguage: (lang: Language) => void;
  setBaselineId: (id: BaselineId) => void;
  loadCustomBaseline: (dataset: BaselineDataset) => void;
  setSwingMode: (mode: SwingMode) => void;
  setDHondtMode: (mode: DHondtMode) => void;
  setThresholdPct: (pct: number) => void;
  setMapLayer: (layer: MapLayerMode) => void;
  setMapColorMode: (mode: MapColorMode) => void;
  setZoomedProvinceId: (ilId: string | null) => void;
  setActiveScope: (scope: ActiveEditorScope) => void;

  // Input editing actions
  updateNationalPartyShare: (partyId: string, share: number) => void;
  setNationalSharesBulk: (shares: Record<string, number>) => void;
  normalizeActiveScopeShares: () => void;
  sendActiveScopeRemainderToOther: () => void;
  setNationalTurnout: (turnout: number) => void;
  setNationalRegisteredVoters: (totalVoters: number) => void;

  // Abroad editing actions
  updateAbroadConfig: (partial: Partial<AbroadVoteConfig>) => void;
  updateAbroadPartyShare: (partyId: string, share: number) => void;

  // Province / District / İlçe override actions
  updateProvinceShare: (ilId: string, partyId: string, share: number) => void;
  updateProvinceTurnoutAndVoters: (ilId: string, turnout?: number, registeredVoters?: number) => void;
  unlockProvince: (ilId: string) => void;

  updateDistrictShare: (districtId: string, partyId: string, share: number) => void;
  updateDistrictTurnoutAndVoters: (districtId: string, turnout?: number, registeredVoters?: number) => void;
  updateDistrictMpCount: (districtId: string, mpCount: number) => void;
  unlockDistrict: (districtId: string) => void;

  updateIlceShare: (ilceId: string, partyId: string, share: number) => void;
  updateIlceTurnoutAndVoters: (ilceId: string, turnout?: number, registeredVoters?: number) => void;
  unlockIlce: (ilceId: string) => void;

  resetAllLocks: () => void;
  resetAllToBaseline: () => void;

  // Party, Alliance & Joint List management
  addCustomParty: (
    shortName: string,
    fullName: string,
    color: string,
    allianceId: string | null,
    proxyWeights?: Record<string, number>
  ) => void;
  updatePartyConfig: (partyId: string, partial: Partial<PartyConfig>) => void;
  addAlliance: (name: string, shortName: string, color: string) => void;
  addJointListRule: (rule: Omit<JointListRule, 'id'>) => void;
  updateJointListRule: (id: string, partial: Partial<JointListRule>) => void;
  removeJointListRule: (id: string) => void;

  // Scenario Import / Export
  exportScenarioJson: () => string;
  importScenarioJson: (jsonStr: string) => boolean;
}

function getActiveBaseline(id: BaselineId, custom: BaselineDataset | null): BaselineDataset {
  if (id === 'custom' && custom) return custom;
  return BASELINES[id] || BASELINES['2023_general'];
}

function recompute(state: {
  baselineId: BaselineId;
  customBaseline: BaselineDataset | null;
  parties: PartyConfig[];
  alliances: AllianceConfig[];
  swingMode: SwingMode;
  dhondtMode: DHondtMode;
  thresholdPct: number;
  nationalTargetShares: Record<string, number>;
  nationalTargetTurnout: number;
  nationalVoterScaleFactor: number;
  abroadConfig: AbroadVoteConfig;
  ilceOverrides: Record<string, IlceOverride>;
  districtOverrides: Record<string, DistrictOverride>;
  provinceOverrides: Record<string, ProvinceOverride>;
  jointListRules: JointListRule[];
}): ComputedElectionProjection {
  const baseline = getActiveBaseline(state.baselineId, state.customBaseline);
  return runMultiLayerProjection({
    baseline,
    parties: state.parties,
    alliances: state.alliances,
    swingMode: state.swingMode,
    dhondtMode: state.dhondtMode,
    thresholdPct: state.thresholdPct,
    nationalTargetShares: state.nationalTargetShares,
    nationalTargetTurnout: state.nationalTargetTurnout,
    nationalVoterScaleFactor: state.nationalVoterScaleFactor,
    abroadConfig: state.abroadConfig,
    ilceOverrides: state.ilceOverrides,
    districtOverrides: state.districtOverrides,
    provinceOverrides: state.provinceOverrides,
    jointListRules: state.jointListRules,
  });
}

const initialBaseline = BASELINES['2023_general'];
const initialProjection = runMultiLayerProjection({
  baseline: initialBaseline,
  parties: DEFAULT_PARTIES,
  alliances: DEFAULT_ALLIANCES,
  swingMode: 'proportional',
  dhondtMode: '2022_separate',
  thresholdPct: 7.0,
  nationalTargetShares: { ...initialBaseline.nationalBaseShares },
  nationalTargetTurnout: initialBaseline.nationalBaseTurnout,
  nationalVoterScaleFactor: 1.0,
  abroadConfig: { ...initialBaseline.abroad, partyShares: { ...initialBaseline.abroad.partyShares } },
  ilceOverrides: {},
  districtOverrides: {},
  provinceOverrides: {},
  jointListRules: [],
});

export const useElectionStore = create<ElectionStoreState>((set, get) => ({
  lang: 'tr',
  baselineId: '2023_general',
  customBaseline: null,
  parties: DEFAULT_PARTIES,
  alliances: DEFAULT_ALLIANCES,
  swingMode: 'proportional',
  dhondtMode: '2022_separate',
  thresholdPct: 7.0,

  nationalTargetShares: { ...initialBaseline.nationalBaseShares },
  nationalTargetTurnout: initialBaseline.nationalBaseTurnout,
  nationalVoterScaleFactor: 1.0,
  abroadConfig: { ...initialBaseline.abroad, partyShares: { ...initialBaseline.abroad.partyShares } },

  provinceOverrides: {},
  districtOverrides: {},
  ilceOverrides: {},
  jointListRules: [],

  mapLayer: '87_district',
  mapColorMode: 'leader',
  zoomedProvinceId: null,
  activeScope: { type: 'national' },

  projection: initialProjection,
  baselineProjection: initialProjection,

  setLanguage: (lang) => set({ lang }),

  setBaselineId: (id) =>
    set((state) => {
      const base = getActiveBaseline(id, state.customBaseline);
      const nextShares: Record<string, number> = {};
      for (const p of state.parties) {
        nextShares[p.id] = base.nationalBaseShares[p.id] ?? 0;
      }
      const nextAbroad: AbroadVoteConfig = {
        ...base.abroad,
        partyShares: { ...base.abroad.partyShares },
      };
      const nextState = {
        ...state,
        baselineId: id,
        nationalTargetShares: nextShares,
        nationalTargetTurnout: base.nationalBaseTurnout,
        nationalVoterScaleFactor: 1.0,
        abroadConfig: nextAbroad,
        provinceOverrides: {},
        districtOverrides: {},
        ilceOverrides: {},
      };
      const proj = recompute(nextState);
      return {
        ...nextState,
        projection: proj,
        baselineProjection: proj,
      };
    }),

  loadCustomBaseline: (dataset) =>
    set((state) => {
      const nextShares: Record<string, number> = {};
      for (const p of state.parties) {
        nextShares[p.id] = dataset.nationalBaseShares[p.id] ?? 0;
      }
      const nextState = {
        ...state,
        baselineId: 'custom' as BaselineId,
        customBaseline: dataset,
        nationalTargetShares: nextShares,
        nationalTargetTurnout: dataset.nationalBaseTurnout,
        nationalVoterScaleFactor: 1.0,
        abroadConfig: { ...dataset.abroad },
        provinceOverrides: {},
        districtOverrides: {},
        ilceOverrides: {},
      };
      const proj = recompute(nextState);
      return {
        ...nextState,
        projection: proj,
        baselineProjection: proj,
      };
    }),

  setSwingMode: (swingMode) =>
    set((state) => {
      const next = { ...state, swingMode };
      return { swingMode, projection: recompute(next) };
    }),

  setDHondtMode: (dhondtMode) =>
    set((state) => {
      const next = { ...state, dhondtMode };
      return { dhondtMode, projection: recompute(next) };
    }),

  setThresholdPct: (thresholdPct) =>
    set((state) => {
      const clamped = Math.max(0, Math.min(25, thresholdPct));
      const next = { ...state, thresholdPct: clamped };
      return { thresholdPct: clamped, projection: recompute(next) };
    }),

  setMapLayer: (mapLayer) => set({ mapLayer }),
  setMapColorMode: (mapColorMode) => set({ mapColorMode }),
  setZoomedProvinceId: (zoomedProvinceId) => set({ zoomedProvinceId }),
  setActiveScope: (activeScope) => set({ activeScope }),

  updateNationalPartyShare: (partyId, share) =>
    set((state) => {
      const val = Math.max(0, Math.min(100, Number(share) || 0));
      const nationalTargetShares = { ...state.nationalTargetShares, [partyId]: val };
      const next = { ...state, nationalTargetShares };
      return { nationalTargetShares, projection: recompute(next) };
    }),

  setNationalSharesBulk: (shares) =>
    set((state) => {
      const next = { ...state, nationalTargetShares: { ...shares } };
      return { nationalTargetShares: { ...shares }, projection: recompute(next) };
    }),

  normalizeActiveScopeShares: () =>
    set((state) => {
      const scope = state.activeScope;
      if (scope.type === 'national') {
        const nationalTargetShares = normalizeSharesTo100(state.nationalTargetShares, state.parties);
        for (const k of Object.keys(nationalTargetShares)) {
          nationalTargetShares[k] = Number(nationalTargetShares[k].toFixed(2));
        }
        const next = { ...state, nationalTargetShares };
        return { nationalTargetShares, projection: recompute(next) };
      }
      if (scope.type === 'abroad') {
        const partyShares = normalizeSharesTo100(state.abroadConfig.partyShares, state.parties);
        for (const k of Object.keys(partyShares)) {
          partyShares[k] = Number(partyShares[k].toFixed(2));
        }
        const abroadConfig = { ...state.abroadConfig, partyShares, syncWithNationalSwing: false };
        const next = { ...state, abroadConfig };
        return { abroadConfig, projection: recompute(next) };
      }
      if (scope.type === 'province') {
        const currentShares =
          state.provinceOverrides[scope.ilId]?.partyShares ||
          state.projection.provinceResults[scope.ilId]?.partyShares ||
          {};
        const partyShares = normalizeSharesTo100(currentShares, state.parties);
        for (const k of Object.keys(partyShares)) partyShares[k] = Number(partyShares[k].toFixed(2));
        const provinceOverrides = {
          ...state.provinceOverrides,
          [scope.ilId]: {
            ...state.provinceOverrides[scope.ilId],
            partyShares,
            isLocked: true,
          },
        };
        const next = { ...state, provinceOverrides };
        return { provinceOverrides, projection: recompute(next) };
      }
      if (scope.type === 'district') {
        const currentShares =
          state.districtOverrides[scope.districtId]?.partyShares ||
          state.projection.districtResults[scope.districtId]?.domesticPartyShares ||
          {};
        const partyShares = normalizeSharesTo100(currentShares, state.parties);
        for (const k of Object.keys(partyShares)) partyShares[k] = Number(partyShares[k].toFixed(2));
        const districtOverrides = {
          ...state.districtOverrides,
          [scope.districtId]: {
            ...state.districtOverrides[scope.districtId],
            partyShares,
            isLocked: true,
          },
        };
        const next = { ...state, districtOverrides };
        return { districtOverrides, projection: recompute(next) };
      }
      if (scope.type === 'ilce') {
        const currentShares =
          state.ilceOverrides[scope.ilceId]?.partyShares ||
          state.projection.ilceResults[scope.ilceId]?.partyShares ||
          {};
        const partyShares = normalizeSharesTo100(currentShares, state.parties);
        for (const k of Object.keys(partyShares)) partyShares[k] = Number(partyShares[k].toFixed(2));
        const ilceOverrides = {
          ...state.ilceOverrides,
          [scope.ilceId]: {
            ...state.ilceOverrides[scope.ilceId],
            partyShares,
            isLocked: true,
          },
        };
        const next = { ...state, ilceOverrides };
        return { ilceOverrides, projection: recompute(next) };
      }
      return state;
    }),

  sendActiveScopeRemainderToOther: () =>
    set((state) => {
      const scope = state.activeScope;
      if (scope.type === 'national') {
        const nationalTargetShares = sendRemainderToOther(state.nationalTargetShares, state.parties);
        const next = { ...state, nationalTargetShares };
        return { nationalTargetShares, projection: recompute(next) };
      }
      if (scope.type === 'abroad') {
        const partyShares = sendRemainderToOther(state.abroadConfig.partyShares, state.parties);
        const abroadConfig = { ...state.abroadConfig, partyShares, syncWithNationalSwing: false };
        const next = { ...state, abroadConfig };
        return { abroadConfig, projection: recompute(next) };
      }
      if (scope.type === 'province') {
        const currentShares =
          state.provinceOverrides[scope.ilId]?.partyShares ||
          state.projection.provinceResults[scope.ilId]?.partyShares ||
          {};
        const partyShares = sendRemainderToOther(currentShares, state.parties);
        const provinceOverrides = {
          ...state.provinceOverrides,
          [scope.ilId]: {
            ...state.provinceOverrides[scope.ilId],
            partyShares,
            isLocked: true,
          },
        };
        const next = { ...state, provinceOverrides };
        return { provinceOverrides, projection: recompute(next) };
      }
      if (scope.type === 'district') {
        const currentShares =
          state.districtOverrides[scope.districtId]?.partyShares ||
          state.projection.districtResults[scope.districtId]?.domesticPartyShares ||
          {};
        const partyShares = sendRemainderToOther(currentShares, state.parties);
        const districtOverrides = {
          ...state.districtOverrides,
          [scope.districtId]: {
            ...state.districtOverrides[scope.districtId],
            partyShares,
            isLocked: true,
          },
        };
        const next = { ...state, districtOverrides };
        return { districtOverrides, projection: recompute(next) };
      }
      if (scope.type === 'ilce') {
        const currentShares =
          state.ilceOverrides[scope.ilceId]?.partyShares ||
          state.projection.ilceResults[scope.ilceId]?.partyShares ||
          {};
        const partyShares = sendRemainderToOther(currentShares, state.parties);
        const ilceOverrides = {
          ...state.ilceOverrides,
          [scope.ilceId]: {
            ...state.ilceOverrides[scope.ilceId],
            partyShares,
            isLocked: true,
          },
        };
        const next = { ...state, ilceOverrides };
        return { ilceOverrides, projection: recompute(next) };
      }
      return state;
    }),

  setNationalTurnout: (turnout) =>
    set((state) => {
      const nationalTargetTurnout = Math.max(1, Math.min(100, turnout));
      const next = { ...state, nationalTargetTurnout };
      return { nationalTargetTurnout, projection: recompute(next) };
    }),

  setNationalRegisteredVoters: (totalVoters) =>
    set((state) => {
      const base = getActiveBaseline(state.baselineId, state.customBaseline);
      const baseVoters = base.ilceler.reduce((s, i) => s + i.registeredVoters, 0);
      const nationalVoterScaleFactor = baseVoters > 0 ? Math.max(0.1, totalVoters / baseVoters) : 1.0;
      const next = { ...state, nationalVoterScaleFactor };
      return { nationalVoterScaleFactor, projection: recompute(next) };
    }),

  updateAbroadConfig: (partial) =>
    set((state) => {
      const abroadConfig = { ...state.abroadConfig, ...partial };
      const next = { ...state, abroadConfig };
      return { abroadConfig, projection: recompute(next) };
    }),

  updateAbroadPartyShare: (partyId, share) =>
    set((state) => {
      const val = Math.max(0, Math.min(100, Number(share) || 0));
      const abroadConfig: AbroadVoteConfig = {
        ...state.abroadConfig,
        syncWithNationalSwing: false,
        partyShares: {
          ...state.abroadConfig.partyShares,
          [partyId]: val,
        },
      };
      const next = { ...state, abroadConfig };
      return { abroadConfig, projection: recompute(next) };
    }),

  updateProvinceShare: (ilId, partyId, share) =>
    set((state) => {
      const val = Math.max(0, Math.min(100, Number(share) || 0));
      const existing = state.provinceOverrides[ilId]?.partyShares ||
        state.projection.provinceResults[ilId]?.partyShares || {};
      const nextShares = { ...existing, [partyId]: val };
      const provinceOverrides: Record<string, ProvinceOverride> = {
        ...state.provinceOverrides,
        [ilId]: {
          ...state.provinceOverrides[ilId],
          partyShares: nextShares,
          isLocked: true,
        },
      };
      const next = { ...state, provinceOverrides };
      return { provinceOverrides, projection: recompute(next) };
    }),

  updateProvinceTurnoutAndVoters: (ilId, turnout, registeredVoters) =>
    set((state) => {
      const current = state.provinceOverrides[ilId] || { isLocked: true };
      const provinceOverrides: Record<string, ProvinceOverride> = {
        ...state.provinceOverrides,
        [ilId]: {
          ...current,
          turnout: turnout !== undefined ? turnout : current.turnout,
          registeredVoters: registeredVoters !== undefined ? registeredVoters : current.registeredVoters,
          isLocked: true,
        },
      };
      const next = { ...state, provinceOverrides };
      return { provinceOverrides, projection: recompute(next) };
    }),

  unlockProvince: (ilId) =>
    set((state) => {
      const provinceOverrides = { ...state.provinceOverrides };
      delete provinceOverrides[ilId];
      const next = { ...state, provinceOverrides };
      return { provinceOverrides, projection: recompute(next) };
    }),

  updateDistrictShare: (districtId, partyId, share) =>
    set((state) => {
      const val = Math.max(0, Math.min(100, Number(share) || 0));
      const existing =
        state.districtOverrides[districtId]?.partyShares ||
        state.projection.districtResults[districtId]?.domesticPartyShares ||
        {};
      const nextShares = { ...existing, [partyId]: val };
      const districtOverrides: Record<string, DistrictOverride> = {
        ...state.districtOverrides,
        [districtId]: {
          ...state.districtOverrides[districtId],
          partyShares: nextShares,
          isLocked: true,
        },
      };
      const next = { ...state, districtOverrides };
      return { districtOverrides, projection: recompute(next) };
    }),

  updateDistrictTurnoutAndVoters: (districtId, turnout, registeredVoters) =>
    set((state) => {
      const current = state.districtOverrides[districtId] || { isLocked: true };
      const districtOverrides: Record<string, DistrictOverride> = {
        ...state.districtOverrides,
        [districtId]: {
          ...current,
          turnout: turnout !== undefined ? turnout : current.turnout,
          registeredVoters: registeredVoters !== undefined ? registeredVoters : current.registeredVoters,
          isLocked: true,
        },
      };
      const next = { ...state, districtOverrides };
      return { districtOverrides, projection: recompute(next) };
    }),

  updateDistrictMpCount: (districtId, mpCount) =>
    set((state) => {
      const current = state.districtOverrides[districtId] || { isLocked: false };
      const districtOverrides: Record<string, DistrictOverride> = {
        ...state.districtOverrides,
        [districtId]: {
          ...current,
          mpCount: Math.max(1, Math.round(mpCount)),
        },
      };
      const next = { ...state, districtOverrides };
      return { districtOverrides, projection: recompute(next) };
    }),

  unlockDistrict: (districtId) =>
    set((state) => {
      const districtOverrides = { ...state.districtOverrides };
      if (districtOverrides[districtId]) {
        const mpCount = districtOverrides[districtId].mpCount;
        if (mpCount !== undefined) {
          districtOverrides[districtId] = { isLocked: false, mpCount };
        } else {
          delete districtOverrides[districtId];
        }
      }
      const next = { ...state, districtOverrides };
      return { districtOverrides, projection: recompute(next) };
    }),

  updateIlceShare: (ilceId, partyId, share) =>
    set((state) => {
      const val = Math.max(0, Math.min(100, Number(share) || 0));
      const existing =
        state.ilceOverrides[ilceId]?.partyShares ||
        state.projection.ilceResults[ilceId]?.partyShares ||
        {};
      const nextShares = { ...existing, [partyId]: val };
      const ilceOverrides: Record<string, IlceOverride> = {
        ...state.ilceOverrides,
        [ilceId]: {
          ...state.ilceOverrides[ilceId],
          partyShares: nextShares,
          isLocked: true,
        },
      };
      const next = { ...state, ilceOverrides };
      return { ilceOverrides, projection: recompute(next) };
    }),

  updateIlceTurnoutAndVoters: (ilceId, turnout, registeredVoters) =>
    set((state) => {
      const current = state.ilceOverrides[ilceId] || { isLocked: true };
      const ilceOverrides: Record<string, IlceOverride> = {
        ...state.ilceOverrides,
        [ilceId]: {
          ...current,
          turnout: turnout !== undefined ? turnout : current.turnout,
          registeredVoters: registeredVoters !== undefined ? registeredVoters : current.registeredVoters,
          isLocked: true,
        },
      };
      const next = { ...state, ilceOverrides };
      return { ilceOverrides, projection: recompute(next) };
    }),

  unlockIlce: (ilceId) =>
    set((state) => {
      const ilceOverrides = { ...state.ilceOverrides };
      delete ilceOverrides[ilceId];
      const next = { ...state, ilceOverrides };
      return { ilceOverrides, projection: recompute(next) };
    }),

  resetAllLocks: () =>
    set((state) => {
      const next = {
        ...state,
        provinceOverrides: {},
        districtOverrides: {},
        ilceOverrides: {},
      };
      return {
        provinceOverrides: {},
        districtOverrides: {},
        ilceOverrides: {},
        projection: recompute(next),
      };
    }),

  resetAllToBaseline: () =>
    set((state) => {
      const base = getActiveBaseline(state.baselineId, state.customBaseline);
      const nationalTargetShares: Record<string, number> = {};
      for (const p of state.parties) {
        nationalTargetShares[p.id] = base.nationalBaseShares[p.id] ?? 0;
      }
      const abroadConfig: AbroadVoteConfig = {
        ...base.abroad,
        partyShares: { ...base.abroad.partyShares },
      };
      const next = {
        ...state,
        nationalTargetShares,
        nationalTargetTurnout: base.nationalBaseTurnout,
        nationalVoterScaleFactor: 1.0,
        abroadConfig,
        provinceOverrides: {},
        districtOverrides: {},
        ilceOverrides: {},
        jointListRules: [],
      };
      return {
        ...next,
        projection: recompute(next),
      };
    }),

  addCustomParty: (shortName, fullName, color, allianceId, proxyWeights) =>
    set((state) => {
      const id = shortName.toUpperCase().replace(/[^A-Z0-9ĞÜŞİÖÇ]/g, '').slice(0, 8) || `P${Date.now()}`;
      if (state.parties.some((p) => p.id === id)) return state;
      const newParty: PartyConfig = {
        id,
        shortName,
        fullName,
        color,
        allianceId,
        ...(proxyWeights ? { proxyWeights } : {}),
        isCustom: true,
      };
      // Insert right before OTHER
      const otherIdx = state.parties.findIndex((p) => p.isOther);
      const parties = [...state.parties];
      if (otherIdx >= 0) {
        parties.splice(otherIdx, 0, newParty);
      } else {
        parties.push(newParty);
      }
      const nationalTargetShares = { ...state.nationalTargetShares, [id]: 0 };
      const next = { ...state, parties, nationalTargetShares };
      return { parties, nationalTargetShares, projection: recompute(next) };
    }),

  updatePartyConfig: (partyId, partial) =>
    set((state) => {
      const parties = state.parties.map((p) => (p.id === partyId ? { ...p, ...partial } : p));
      const next = { ...state, parties };
      return { parties, projection: recompute(next) };
    }),

  addAlliance: (name, shortName, color) =>
    set((state) => {
      const id = shortName.toLowerCase().replace(/[^a-z0-9]/g, '') || `alliance_${Date.now()}`;
      if (state.alliances.some((a) => a.id === id)) return state;
      const alliances = [...state.alliances, { id, name, shortName, color }];
      const next = { ...state, alliances };
      return { alliances, projection: recompute(next) };
    }),

  addJointListRule: (rule) =>
    set((state) => {
      const jointListRules = [
        ...state.jointListRules,
        { ...rule, id: `jl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` },
      ];
      const next = { ...state, jointListRules };
      return { jointListRules, projection: recompute(next) };
    }),

  updateJointListRule: (id, partial) =>
    set((state) => {
      const jointListRules = state.jointListRules.map((r) => (r.id === id ? { ...r, ...partial } : r));
      const next = { ...state, jointListRules };
      return { jointListRules, projection: recompute(next) };
    }),

  removeJointListRule: (id) =>
    set((state) => {
      const jointListRules = state.jointListRules.filter((r) => r.id !== id);
      const next = { ...state, jointListRules };
      return { jointListRules, projection: recompute(next) };
    }),

  exportScenarioJson: () => {
    const s = get();
    return JSON.stringify(
      {
        version: '1.0',
        baselineId: s.baselineId,
        parties: s.parties,
        alliances: s.alliances,
        swingMode: s.swingMode,
        dhondtMode: s.dhondtMode,
        thresholdPct: s.thresholdPct,
        nationalTargetShares: s.nationalTargetShares,
        nationalTargetTurnout: s.nationalTargetTurnout,
        nationalVoterScaleFactor: s.nationalVoterScaleFactor,
        abroadConfig: s.abroadConfig,
        provinceOverrides: s.provinceOverrides,
        districtOverrides: s.districtOverrides,
        ilceOverrides: s.ilceOverrides,
        jointListRules: s.jointListRules,
      },
      null,
      2
    );
  },

  importScenarioJson: (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || !parsed.nationalTargetShares) return false;
      set((state) => {
        const next = {
          ...state,
          baselineId: parsed.baselineId || state.baselineId,
          parties: parsed.parties || state.parties,
          alliances: parsed.alliances || state.alliances,
          swingMode: parsed.swingMode || state.swingMode,
          dhondtMode: parsed.dhondtMode || state.dhondtMode,
          thresholdPct: parsed.thresholdPct ?? state.thresholdPct,
          nationalTargetShares: parsed.nationalTargetShares,
          nationalTargetTurnout: parsed.nationalTargetTurnout ?? state.nationalTargetTurnout,
          nationalVoterScaleFactor: parsed.nationalVoterScaleFactor ?? 1.0,
          abroadConfig: parsed.abroadConfig || state.abroadConfig,
          provinceOverrides: parsed.provinceOverrides || {},
          districtOverrides: parsed.districtOverrides || {},
          ilceOverrides: parsed.ilceOverrides || {},
          jointListRules: parsed.jointListRules || [],
        };
        return {
          ...next,
          projection: recompute(next),
        };
      });
      return true;
    } catch {
      return false;
    }
  },
}));
