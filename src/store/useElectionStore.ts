import { create } from 'zustand';
import {
  ScenarioHistoryManager,
  ScenarioHistorySnapshot,
  captureScenarioSnapshot,
} from './storeHistory';
import {
  getCachedBaseline,
  getCachedLocalBaseline,
  getCachedRaw2023,
  getCachedRawBaseline,
  hasCachedLocalBaseline,
  initCoreBaselines,
  loadLocalBaseline,
  loadRawBaseline,
} from '../data/baselineCache';
import {
  ARCHIVE_ELECTIONS,
  ARCHIVE_ELECTION_LIST,
  ArchiveElectionConfig,
  BUYUKSEHIR_2009_IDS,
} from '../data/archiveRegistry';
import {
  alignParliamentaryComparison,
  alignPresidentialComparison,
  archiveFamily,
  prepareArchiveRaw,
} from '../utils/archiveCompare';
import { DEFAULT_ALLIANCES, DEFAULT_PARTIES } from '../data/defaultParties';
import {
  DEFAULT_LOCAL_ALLIANCE_RULES,
  WINNERS_2024_ILCELER,
  WINNERS_2024_PROVINCES,
} from '../data/local2024Winners';
import { WINNERS_2019_ILCELER, WINNERS_2019_PROVINCES } from '../data/local2019Winners';
import { WINNERS_2014_ILCELER, WINNERS_2014_PROVINCES } from '../data/local2014Winners';
import { WINNERS_2009_ILCELER, WINNERS_2009_PROVINCES } from '../data/local2009Winners';
import { buildDefaultLocalDefectionConfig } from '../data/localDefections';
import { buildDefaultLocalIncumbencyConfig } from '../data/localIncumbencyDefaults';
import { buildDefaultLocalBuffs } from '../data/localBuffDefaults';
import {
  DEFAULT_PRESIDENTIAL_CANDIDATES,
  buildDefaultPresidentialR2Dynamics,
  buildDefaultTransferMatrix,
  deriveCandidateSharesFromParties,
} from '../data/presidentialDefaults';
import { computeLocalProjection } from '../engine/local';
import { computePresidentialProjection } from '../engine/presidential';
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
  ArchiveCategory,
  ArchiveComparisonRef,
  ArchiveElectionId,
  BaselineDataset,
  BaselineId,
  ComputedElectionProjection,
  ComputedLocalProjection,
  ComputedPresidentialProjection,
  DHondtMode,
  ElectionMode,
  FinalistR2Dynamic,
  JointListRule,
  Language,
  LocalAllianceRule,
  LocalBaselineId,
  LocalBuffRule,
  LocalDefectionConfig,
  LocalDefectionEntry,
  LocalIncumbencyConfig,
  LocalProvinceMode,
  LocalReferenceBaseline,
  MapColorMode,
  MapLayerMode,
  PartyConfig,
  PresidentialCandidateConfig,
  PresidentialRound2Dynamics,
  PresidentialRoundView,
  PresidentialTransferSplit,
  SwingMode,
} from '../types/election';

export type ActiveEditorScope =
  | { type: 'national' }
  | { type: 'abroad' }
  | { type: 'abroadCountry'; countryId: string }
  | { type: 'province'; ilId: string }
  | { type: 'district'; districtId: string }
  | { type: 'ilce'; ilceId: string };

interface ElectionStoreState {
  lang: Language;
  electionMode: ElectionMode;
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
  abroadCountryOverrides: Record<string, ProvinceOverride>;

  // Tactical voting / joint candidate lists & local strength buffs
  jointListRules: JointListRule[];
  localBuffs: LocalBuffRule[];

  // Presidential slice
  presBaselineId: BaselineId;
  presSwingMode: SwingMode;
  presCandidates: PresidentialCandidateConfig[];
  presTargetShares: Record<string, number>;
  presTargetTurnout: number;
  presVoterScaleFactor: number;
  presAbroadConfig: AbroadVoteConfig;
  presProvinceOverrides: Record<string, ProvinceOverride>;
  presIlceOverrides: Record<string, IlceOverride>;
  presAbroadCountryOverrides: Record<string, ProvinceOverride>;
  presTransferMatrix: Record<string, PresidentialTransferSplit>;
  presTransferFinalists: [string, string] | null;
  presR2Dynamics: PresidentialRound2Dynamics;
  presRoundView: PresidentialRoundView;
  presidentialProjection: ComputedPresidentialProjection;

  // Local election slice
  localBaselineId: LocalBaselineId;
  localSwingMode: SwingMode;
  localProvinceMode: LocalProvinceMode;
  localTargetShares: Record<string, number>;
  localTargetTurnout: number;
  localVoterScaleFactor: number;
  localProvinceOverrides: Record<string, ProvinceOverride>;
  localIlceOverrides: Record<string, IlceOverride>;
  localAllianceRules: LocalAllianceRule[];
  localIncumbency: LocalIncumbencyConfig;
  localDefections: LocalDefectionConfig;
  localProjection: ComputedLocalProjection;
  partyTurnoutMultipliers: Record<string, number>;
  provinceTurnoutMultipliers: Record<string, Record<string, number>>;
  localPartyTurnoutMultipliers: Record<string, number>;
  localProvinceTurnoutMultipliers: Record<string, Record<string, number>>;
  presCandidateTurnoutMultipliers: Record<string, number>;
  presProvinceTurnoutMultipliers: Record<string, Record<string, number>>;

  // Map & UI selection state
  mapLayer: MapLayerMode;
  mapColorMode: MapColorMode;
  mapFocusEntityId: string | null;
  activeArchiveId: ArchiveElectionId | null;
  archiveWhatIfParl: boolean;
  archiveLoading: boolean;
  archiveComparisonId: ArchiveComparisonRef | null;
  archiveSelfBaselineProjection: ComputedElectionProjection;
  archiveComparisonProjection: ComputedElectionProjection | null;
  archivePresSelfBaselineProjection: ComputedPresidentialProjection | null;
  archivePresComparisonProjection: ComputedPresidentialProjection | null;
  preArchiveSnapshot: ScenarioHistorySnapshot | null;
  zoomedProvinceId: string | null;
  activeScope: ActiveEditorScope;

  // Computed results (memoized & updated on every state change)
  baselinesReady: boolean;
  localBaselineLoading: boolean;
  projection: ComputedElectionProjection;
  baselineProjection: ComputedElectionProjection;
  official2023Projection: ComputedElectionProjection;
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  undo: () => void;
  redo: () => void;
  initBaselines: () => Promise<void>;
  setLanguage: (lang: Language) => void;
  setElectionMode: (mode: ElectionMode) => void;
  setBaselineId: (id: BaselineId) => void;
  loadCustomBaseline: (dataset: BaselineDataset) => void;
  setSwingMode: (mode: SwingMode) => void;
  setDHondtMode: (mode: DHondtMode) => void;
  setThresholdPct: (pct: number) => void;
  setMapLayer: (layer: MapLayerMode) => void;
  setMapColorMode: (mode: MapColorMode) => void;
  setMapFocusEntityId: (entityId: string | null) => void;
  enterArchiveElection: (id: ArchiveElectionId, whatIfParl?: boolean) => Promise<void>;
  setArchiveComparisonId: (compareId: ArchiveComparisonRef) => Promise<void>;
  stepArchiveElection: (delta: 1 | -1, categoryFilter?: ArchiveCategory | 'all') => Promise<void>;
  exitArchiveMode: () => void;
  setZoomedProvinceId: (ilId: string | null) => void;
  setActiveScope: (scope: ActiveEditorScope) => void;

  // Input editing actions
  updateNationalPartyShare: (partyId: string, share: number) => void;
  setNationalSharesBulk: (shares: Record<string, number>) => void;
  normalizeActiveScopeShares: () => void;
  sendActiveScopeRemainderToOther: () => void;
  setNationalTurnout: (turnout: number) => void;
  setNationalRegisteredVoters: (totalVoters: number) => void;
  setPartyTurnoutMultiplier: (partyId: string, factor: number) => void;
  resetPartyTurnoutMultipliers: () => void;
  setProvinceTurnoutMultiplier: (ilId: string, partyId: string, factor: number) => void;
  resetProvinceTurnoutMultipliers: (ilId: string) => void;
  setLocalPartyTurnoutMultiplier: (partyId: string, factor: number) => void;
  resetLocalPartyTurnoutMultipliers: () => void;
  setLocalProvinceTurnoutMultiplier: (ilId: string, partyId: string, factor: number) => void;
  resetLocalProvinceTurnoutMultipliers: (ilId: string) => void;
  setPresCandidateTurnoutMultiplier: (candidateId: string, factor: number) => void;
  resetPresCandidateTurnoutMultipliers: () => void;
  setPresProvinceTurnoutMultiplier: (ilId: string, candidateId: string, factor: number) => void;
  resetPresProvinceTurnoutMultipliers: (ilId: string) => void;

  // Abroad editing actions
  updateAbroadConfig: (partial: Partial<AbroadVoteConfig>) => void;
  updateAbroadPartyShare: (partyId: string, share: number) => void;
  updateAbroadCountryShare: (countryId: string, partyId: string, share: number) => void;
  updateAbroadCountryTurnoutAndVoters: (
    countryId: string,
    turnout?: number,
    registeredVoters?: number
  ) => void;
  unlockAbroadCountry: (countryId: string) => void;

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
  resetPartyColors: () => void;
  addAlliance: (name: string, shortName: string, color: string) => void;
  addJointListRule: (rule: Omit<JointListRule, 'id'>) => void;
  updateJointListRule: (id: string, partial: Partial<JointListRule>) => void;
  removeJointListRule: (id: string) => void;
  addLocalBuff: (rule: Omit<LocalBuffRule, 'id'>) => void;
  updateLocalBuff: (id: string, partial: Partial<LocalBuffRule>) => void;
  removeLocalBuff: (id: string) => void;
  toggleLocalBuff: (id: string) => void;
  clearLocalBuffsForUnit: (mode: ElectionMode, unitType: LocalBuffRule['unitType'], unitId: string) => void;

  // Scenario Import / Export
  exportScenarioJson: () => string;
  importScenarioJson: (jsonStr: string) => boolean;

  // Presidential Actions
  setPresBaselineId: (id: BaselineId) => void;
  setPresSwingMode: (mode: SwingMode) => void;
  setPresRoundView: (view: PresidentialRoundView) => void;
  updatePresCandidateShare: (candidateId: string, share: number) => void;
  setPresSharesBulk: (shares: Record<string, number>) => void;
  normalizePresCandidateShares: () => void;
  sendPresRemainderToOther: () => void;
  setPresTurnout: (turnout: number) => void;
  setPresRegisteredVoters: (totalVoters: number) => void;
  updatePresAbroadConfig: (partial: Partial<AbroadVoteConfig>) => void;
  addPresCandidate: (name: string, shortName: string, color: string) => void;
  updatePresCandidate: (candidateId: string, partial: Partial<PresidentialCandidateConfig>) => void;
  removePresCandidate: (candidateId: string) => void;
  assignPartyToCandidate: (partyId: string, targetCandidateId: string) => void;
  syncPresidentialFromParliamentary: () => void;
  updatePresTransfer: (eliminatedId: string, partial: Partial<PresidentialTransferSplit>) => void;
  resetPresTransfersToDefault: () => void;
  setPresR2Dynamics: (partial: Partial<PresidentialRound2Dynamics>) => void;
  setPresFinalistR2Dynamic: (candidateId: string, partial: Partial<FinalistR2Dynamic>) => void;
  resetPresR2Dynamics: (neutral?: boolean) => void;
  updatePresProvinceShare: (ilId: string, candidateId: string, share: number) => void;
  unlockPresProvince: (ilId: string) => void;
  updatePresIlceShare: (ilceId: string, candidateId: string, share: number) => void;
  unlockPresIlce: (ilceId: string) => void;
  updatePresAbroadCountryShare: (countryId: string, candidateId: string, share: number) => void;
  updatePresAbroadCountryTurnoutAndVoters: (
    countryId: string,
    turnout?: number,
    registeredVoters?: number
  ) => void;
  unlockPresAbroadCountry: (countryId: string) => void;
  resetPresidential: () => void;

  // Local Election Actions
  setLocalBaselineId: (id: LocalBaselineId) => void;
  setLocalSwingMode: (mode: SwingMode) => void;
  setLocalProvinceMode: (mode: LocalProvinceMode) => void;
  updateLocalPartyShare: (partyId: string, share: number) => void;
  setLocalSharesBulk: (shares: Record<string, number>) => void;
  normalizeLocalShares: (scopeType?: 'province' | 'ilce', scopeId?: string) => void;
  sendLocalRemainderToOther: (scopeType?: 'province' | 'ilce', scopeId?: string) => void;
  setLocalTurnout: (turnout: number) => void;
  setLocalRegisteredVoters: (totalVoters: number) => void;
  syncLocalFromParliamentary: () => void;
  updateLocalProvinceShare: (ilId: string, partyId: string, share: number) => void;
  updateLocalProvinceTurnoutAndVoters: (ilId: string, turnout?: number, registeredVoters?: number) => void;
  unlockLocalProvince: (ilId: string) => void;
  updateLocalIlceShare: (ilceId: string, partyId: string, share: number) => void;
  updateLocalIlceTurnoutAndVoters: (ilceId: string, turnout?: number, registeredVoters?: number) => void;
  unlockLocalIlce: (ilceId: string) => void;
  toggleLocalAllianceRule: (id: string) => void;
  updateLocalAllianceRule: (id: string, partial: Partial<LocalAllianceRule>) => void;
  addLocalAllianceRule: (rule: Omit<LocalAllianceRule, 'id'>) => void;
  removeLocalAllianceRule: (id: string) => void;
  setLocalIncumbencyIntensity: (intensityPct: number) => void;
  setLocalProvinceIncumbencyBonus: (provinceId: string, partyId: string, bonusPp: number, note?: string) => void;
  removeLocalProvinceIncumbencyBonus: (provinceId: string) => void;
  resetLocalIncumbency: (neutral?: boolean) => void;
  setLocalReferenceBaseline: (baseline: LocalReferenceBaseline) => void;
  setLocalIncludeKayyim: (include: boolean) => void;
  setLocalDefectionCarryover: (carryoverPct: number) => void;
  setLocalDefectionBacklash: (backlashPp: number) => void;
  toggleLocalDefectionEntry: (id: string) => void;
  addLocalDefectionEntry: (entry: Omit<LocalDefectionEntry, 'id'>) => void;
  removeLocalDefectionEntry: (id: string) => void;
  resetLocalDefections: () => void;
  resetLocal: () => void;
}

function getActiveBaseline(id: BaselineId, custom: BaselineDataset | null): BaselineDataset {
  return getCachedBaseline(id, custom);
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
  abroadCountryOverrides: Record<string, ProvinceOverride>;
  localBuffs: LocalBuffRule[];
  partyTurnoutMultipliers?: Record<string, number>;
  provinceTurnoutMultipliers?: Record<string, Record<string, number>>;
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
    abroadCountryOverrides: state.abroadCountryOverrides,
    localBuffs: state.localBuffs,
    partyTurnoutMultipliers: state.partyTurnoutMultipliers,
    provinceTurnoutMultipliers: state.provinceTurnoutMultipliers,
    jointListRules: state.jointListRules,
  });
}

const DEFAULT_TARGET_SHARES: Record<string, number> = {
  AKP: 28.28,
  CHP: 2.96,
  MHP: 7.25,
  IYI: 4.96,
  DEM: 8.41,
  YRP: 4.09,
  ZP: 2.51,
  TIP: 1.62,
  A: 4.04,
  YENI: 32.11,
  SAADET: 1.02,
  BBP: 1.03,
  HUDAPAR: 0.30,
  DEVA: 0.40,
  DP: 0.30,
  OTHER: 0.72,
};

function recomputePresidential(state: {
  presBaselineId: BaselineId;
  customBaseline: BaselineDataset | null;
  parties: PartyConfig[];
  presCandidates: PresidentialCandidateConfig[];
  presSwingMode: SwingMode;
  presTargetShares: Record<string, number>;
  presTargetTurnout: number;
  presVoterScaleFactor: number;
  presAbroadConfig: AbroadVoteConfig;
  presProvinceOverrides: Record<string, ProvinceOverride>;
  presIlceOverrides: Record<string, IlceOverride>;
  presAbroadCountryOverrides: Record<string, ProvinceOverride>;
  localBuffs?: LocalBuffRule[];
  presCandidateTurnoutMultipliers?: Record<string, number>;
  presProvinceTurnoutMultipliers?: Record<string, Record<string, number>>;
  presTransferMatrix: Record<string, PresidentialTransferSplit>;
  presTransferFinalists: [string, string] | null;
  presR2Dynamics: PresidentialRound2Dynamics;
}): ComputedPresidentialProjection {
  const baseline = getActiveBaseline(state.presBaselineId, state.customBaseline);
  const transferMatrix = state.presTransferMatrix;
  const finalists = state.presTransferFinalists || ['imamoglu', 'erdogan'];

  const proj = computePresidentialProjection({
    baseline,
    parties: state.parties,
    candidates: state.presCandidates,
    swingMode: state.presSwingMode,
    candidateTargetShares: state.presTargetShares,
    targetTurnout: state.presTargetTurnout,
    voterScaleFactor: state.presVoterScaleFactor,
    abroadConfig: state.presAbroadConfig,
    provinceOverrides: state.presProvinceOverrides,
    ilceOverrides: state.presIlceOverrides,
    abroadCountryOverrides: state.presAbroadCountryOverrides,
    localBuffs: state.localBuffs,
    candidateTurnoutMultipliers: state.presCandidateTurnoutMultipliers,
    provinceTurnoutMultipliers: state.presProvinceTurnoutMultipliers,
    transferMatrix,
    round2Dynamics: state.presR2Dynamics,
    referencePartyWeights: DEFAULT_TARGET_SHARES,
  });

  const newFirstId = proj.round1.leadingCandidateId || 'imamoglu';
  const newSecondId = proj.round1.runnerUpCandidateId || 'erdogan';

  if (finalists[0] !== newFirstId || finalists[1] !== newSecondId) {
    if (finalists[0] === newSecondId && finalists[1] === newFirstId) {
      // Rankings swapped between the top 2 candidates: swap toFirstPct and toSecondPct across entries
      const swappedMatrix: Record<string, PresidentialTransferSplit> = {};
      for (const [candId, split] of Object.entries(transferMatrix)) {
        swappedMatrix[candId] = {
          toFirstPct: split.toSecondPct,
          toSecondPct: split.toFirstPct,
          abstainPct: split.abstainPct,
        };
      }
      state.presTransferMatrix = swappedMatrix;
      state.presTransferFinalists = [newFirstId, newSecondId];
      return computePresidentialProjection({
        baseline,
        parties: state.parties,
        candidates: state.presCandidates,
        swingMode: state.presSwingMode,
        candidateTargetShares: state.presTargetShares,
        targetTurnout: state.presTargetTurnout,
        voterScaleFactor: state.presVoterScaleFactor,
        abroadConfig: state.presAbroadConfig,
        provinceOverrides: state.presProvinceOverrides,
        ilceOverrides: state.presIlceOverrides,
        abroadCountryOverrides: state.presAbroadCountryOverrides,
        localBuffs: state.localBuffs,
        transferMatrix: swappedMatrix,
        round2Dynamics: state.presR2Dynamics,
        referencePartyWeights: DEFAULT_TARGET_SHARES,
      });
    } else {
      // A new candidate entered the top 2: regenerate default matrix
      const defaultMatrix = buildDefaultTransferMatrix(state.presCandidates, newFirstId, newSecondId);
      state.presTransferMatrix = defaultMatrix;
      state.presTransferFinalists = [newFirstId, newSecondId];
      return computePresidentialProjection({
        baseline,
        parties: state.parties,
        candidates: state.presCandidates,
        swingMode: state.presSwingMode,
        candidateTargetShares: state.presTargetShares,
        targetTurnout: state.presTargetTurnout,
        voterScaleFactor: state.presVoterScaleFactor,
        abroadConfig: state.presAbroadConfig,
        provinceOverrides: state.presProvinceOverrides,
        ilceOverrides: state.presIlceOverrides,
        abroadCountryOverrides: state.presAbroadCountryOverrides,
        localBuffs: state.localBuffs,
        transferMatrix: defaultMatrix,
        round2Dynamics: state.presR2Dynamics,
        referencePartyWeights: DEFAULT_TARGET_SHARES,
      });
    }
  }

  state.presTransferFinalists = [newFirstId, newSecondId];
  return proj;
}

/**
 * Hydrates an Archive raw baseline dataset into Mayoral mode by promoting
 * ilce.mayorPartyShares, ilce.mayorOtherMaxCandidateRatio, and mayorNationalBaseShares.
 */
function buildArchiveMayoralDataset(raw: BaselineDataset): BaselineDataset {
  return {
    ...raw,
    nationalBaseShares: raw.mayorNationalBaseShares
      ? { ...raw.mayorNationalBaseShares }
      : { ...raw.nationalBaseShares },
    ilceler: raw.ilceler.map((ilce) => ({
      ...ilce,
      partyShares: ilce.mayorPartyShares ? { ...ilce.mayorPartyShares } : { ...ilce.partyShares },
      otherMaxCandidateRatio:
        ilce.mayorOtherMaxCandidateRatio !== undefined
          ? ilce.mayorOtherMaxCandidateRatio
          : ilce.otherMaxCandidateRatio,
    })),
  };
}

/**
 * Strips mayoral overrides from a raw baseline so "What-If 600-MP D'Hondt" strictly uses council ballots.
 */
function buildArchiveCouncilDataset(raw: BaselineDataset): BaselineDataset {
  return {
    ...raw,
    provinces: raw.provinces.map(({ mayorPartyShares: _drop, ...rest }) => rest),
  };
}

/**
 * Loads and computes the unedited official projection for an archive election
 * to serve as the comparison baseline (`A vs B`) in Studio & Maps.
 */
async function computeOfficialArchiveProjection(
  cmpId: ArchiveElectionId
): Promise<
  | { kind: 'presidential'; cfg: ArchiveElectionConfig; proj: ComputedPresidentialProjection }
  | { kind: 'parliamentary'; cfg: ArchiveElectionConfig; proj: ComputedElectionProjection }
> {
  const cmpCfg = ARCHIVE_ELECTIONS[cmpId];
  const cmpRawBase = await loadRawBaseline(cmpCfg.baselineKey);
  const cmpRaw = prepareArchiveRaw(cmpCfg, cmpRawBase);

  if (cmpCfg.defaultMode === 'presidential' && cmpCfg.presCandidates) {
    const cands = cmpCfg.presCandidates.map((c) => ({
      ...c,
      backingPartyIds: [...c.backingPartyIds],
    }));
    const targetShares = deriveCandidateSharesFromParties(cands, cmpRaw.nationalBaseShares);
    const ranked = [...cands].sort((a, b) => (targetShares[b.id] ?? 0) - (targetShares[a.id] ?? 0));
    const f0 = ranked[0]?.id ?? cands[0]?.id ?? 'erdogan';
    const f1 = ranked[1]?.id ?? cands[1]?.id ?? 'kilicdaroglu';
    const proj = computePresidentialProjection({
      baseline: cmpRaw,
      parties: cmpCfg.parties,
      candidates: cands,
      swingMode: 'proportional',
      candidateTargetShares: targetShares,
      targetTurnout: cmpRaw.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      abroadConfig: {
        ...cmpRaw.abroad,
        enabled: cmpCfg.abroadEnabled,
        syncWithNationalSwing: false,
        partyShares: { ...cmpRaw.abroad.partyShares },
      },
      provinceOverrides: {},
      ilceOverrides: {},
      transferMatrix: buildDefaultTransferMatrix(cands, f0, f1),
      round2Dynamics: buildDefaultPresidentialR2Dynamics(cands, true),
      referencePartyWeights: cmpRaw.nationalBaseShares,
    });
    return { kind: 'presidential', cfg: cmpCfg, proj };
  }

  const parlRaw = cmpCfg.supportsWhatIfParl ? buildArchiveCouncilDataset(cmpRaw) : cmpRaw;
  const targetShares: Record<string, number> = {};
  for (const p of cmpCfg.parties) {
    targetShares[p.id] = parlRaw.nationalBaseShares[p.id] ?? 0;
  }
  const proj = runMultiLayerProjection({
    baseline: parlRaw,
    parties: cmpCfg.parties,
    alliances: cmpCfg.alliances,
    swingMode: 'proportional',
    dhondtMode: cmpCfg.dhondtMode,
    thresholdPct: cmpCfg.thresholdPct,
    nationalTargetShares: targetShares,
    nationalTargetTurnout: parlRaw.nationalBaseTurnout,
    nationalVoterScaleFactor: 1.0,
    abroadConfig: {
      ...parlRaw.abroad,
      enabled: cmpCfg.abroadEnabled,
      partyShares: { ...parlRaw.abroad.partyShares },
    },
    ilceOverrides: {},
    districtOverrides: {},
    provinceOverrides: {},
    jointListRules: [],
    localBuffs: [],
  });
  return { kind: 'parliamentary', cfg: cmpCfg, proj };
}

/**
 * Preserves and spatially remaps the user's current province/district/ilçe scope and map zoom
 * when stepping or switching between archive elections across boundary eras.
 */
function remapArchiveScopeAndZoom(
  prevScope: ActiveEditorScope,
  prevZoom: string | null,
  targetCfg: ArchiveElectionConfig,
  targetRaw: BaselineDataset,
  targetMode: ElectionMode
): { activeScope: ActiveEditorScope; zoomedProvinceId: string | null } {
  const provSet = new Set(targetRaw.provinces.map((p) => p.id));
  const distSet = new Set(targetRaw.districts.map((d) => d.id));
  const ilceMap = new Map(targetRaw.ilceler.map((i) => [i.id, i]));

  const remapProv = (ilId: string | null): string | null => {
    if (!ilId) return null;
    const mapped = targetCfg.provinceMergeMap?.[ilId] ?? ilId;
    return provSet.has(mapped) ? mapped : null;
  };

  const zoomedProvinceId = remapProv(prevZoom);

  if (prevScope.type === 'province') {
    const p = remapProv(prevScope.ilId);
    return {
      activeScope: p ? { type: 'province', ilId: p } : { type: 'national' },
      zoomedProvinceId,
    };
  }
  if (prevScope.type === 'district') {
    if (targetMode === 'parliamentary') {
      const remappedDist = targetCfg.districtMergeMap?.[prevScope.districtId] ?? prevScope.districtId;
      const renamedDist = targetCfg.districtRenameMap?.[remappedDist]?.id ?? remappedDist;
      if (distSet.has(renamedDist)) {
        return { activeScope: { type: 'district', districtId: renamedDist }, zoomedProvinceId };
      }
      if (distSet.has(remappedDist)) {
        return { activeScope: { type: 'district', districtId: remappedDist }, zoomedProvinceId };
      }
      if (targetCfg.customDistricts?.length) {
        const prefix = prevScope.districtId.split('-')[0];
        const centerIlce = targetRaw.ilceler.find((i) => i.id === `${prefix}-merkez`);
        const matchedCustom =
          (centerIlce && distSet.has(centerIlce.districtId) ? centerIlce.districtId : null) ||
          targetCfg.customDistricts.find((spec) =>
            spec.ilceIds.some((id) => id === `${prefix}-merkez` || id.startsWith(`${prefix}-`))
          )?.id;
        if (matchedCustom && distSet.has(matchedCustom)) {
          const matchedIlId = targetRaw.districts.find((d) => d.id === matchedCustom)?.ilId ?? zoomedProvinceId;
          return {
            activeScope: { type: 'district', districtId: matchedCustom },
            zoomedProvinceId: remapProv(matchedIlId),
          };
        }
      }
    }
    const rawIlId = prevScope.districtId.split('-')[0];
    const p = remapProv(rawIlId);
    return {
      activeScope: p ? { type: 'province', ilId: p } : { type: 'national' },
      zoomedProvinceId,
    };
  }
  if (prevScope.type === 'ilce') {
    const mappedIlceId = targetCfg.ilceMergeMap?.[prevScope.ilceId] ?? prevScope.ilceId;
    const targetIlce = ilceMap.get(mappedIlceId);
    if (targetIlce) {
      return {
        activeScope: { type: 'ilce', ilceId: mappedIlceId },
        zoomedProvinceId: remapProv(targetIlce.ilId) ?? zoomedProvinceId,
      };
    }
    const rawIlId = mappedIlceId.split('-')[0];
    const overrideIl = targetCfg.ilceProvinceOverrides?.[mappedIlceId];
    const p = remapProv(overrideIl || rawIlId);
    return {
      activeScope: p ? { type: 'province', ilId: p } : { type: 'national' },
      zoomedProvinceId: p ?? zoomedProvinceId,
    };
  }
  if ((prevScope.type === 'abroad' || prevScope.type === 'abroadCountry') && !targetCfg.abroadEnabled) {
    return { activeScope: { type: 'national' }, zoomedProvinceId };
  }
  return { activeScope: prevScope, zoomedProvinceId };
}

function getLocalWinnersForArchive(
  id: ArchiveElectionId
): {
  year: 2009 | 2014 | 2019 | 2024;
  provinces: Record<string, string>;
  ilceler: Record<string, string>;
} | null {
  const base =
    id === '2024_local'
      ? { year: 2024 as const, provinces: WINNERS_2024_PROVINCES, ilceler: WINNERS_2024_ILCELER }
      : id === '2019_local'
      ? { year: 2019 as const, provinces: WINNERS_2019_PROVINCES, ilceler: WINNERS_2019_ILCELER }
      : id === '2014_local'
      ? { year: 2014 as const, provinces: WINNERS_2014_PROVINCES, ilceler: WINNERS_2014_ILCELER }
      : id === '2009_local'
      ? { year: 2009 as const, provinces: WINNERS_2009_PROVINCES, ilceler: WINNERS_2009_ILCELER }
      : null;
  if (!base) return null;
  const mergeMap = ARCHIVE_ELECTIONS[id]?.ilceMergeMap;
  if (!mergeMap) return base;
  const ilcelerWithParents = { ...base.ilceler };
  for (const [childId, parentId] of Object.entries(mergeMap)) {
    if (!ilcelerWithParents[childId] && ilcelerWithParents[parentId]) {
      ilcelerWithParents[childId] = ilcelerWithParents[parentId];
    }
  }
  return { ...base, ilceler: ilcelerWithParents };
}

function recomputeLocal(state: {
  localBaselineId: LocalBaselineId;
  activeArchiveId?: ArchiveElectionId | null;
  archiveComparisonId?: ArchiveComparisonRef | null;
  customBaseline?: BaselineDataset | null;
  parties: PartyConfig[];
  localSwingMode: SwingMode;
  localProvinceMode: LocalProvinceMode;
  localTargetShares: Record<string, number>;
  localTargetTurnout: number;
  localVoterScaleFactor: number;
  localProvinceOverrides: Record<string, ProvinceOverride>;
  localIlceOverrides: Record<string, IlceOverride>;
  localAllianceRules: LocalAllianceRule[];
  localIncumbency: LocalIncumbencyConfig;
  localDefections: LocalDefectionConfig;
  localBuffs: LocalBuffRule[];
  localPartyTurnoutMultipliers?: Record<string, number>;
  localProvinceTurnoutMultipliers?: Record<string, Record<string, number>>;
}): ComputedLocalProjection {
  const activeCfg = state.activeArchiveId ? ARCHIVE_ELECTIONS[state.activeArchiveId] : null;
  const isArchiveLocal = Boolean(activeCfg && activeCfg.defaultMode === 'local');
  const compareLocalId =
    state.activeArchiveId && isArchiveLocal
      ? state.archiveComparisonId &&
        state.archiveComparisonId !== 'self' &&
        ARCHIVE_ELECTIONS[state.archiveComparisonId]?.defaultMode === 'local'
        ? state.archiveComparisonId
        : state.activeArchiveId
      : null;
  const refWinners = compareLocalId ? getLocalWinnersForArchive(compareLocalId) : null;
  const baseline =
    isArchiveLocal && state.customBaseline
      ? state.customBaseline
      : isArchiveLocal && activeCfg
      ? getCachedRawBaseline(activeCfg.baselineKey) ?? getCachedLocalBaseline(state.localBaselineId)
      : getCachedLocalBaseline(state.localBaselineId);
  return computeLocalProjection({
    baseline,
    parties: state.parties,
    swingMode: state.localSwingMode,
    localProvinceMode: state.localProvinceMode,
    targetShares: state.localTargetShares,
    targetTurnout: state.localTargetTurnout,
    voterScaleFactor: state.localVoterScaleFactor,
    provinceOverrides: state.localProvinceOverrides,
    ilceOverrides: state.localIlceOverrides,
    localAllianceRules: state.localAllianceRules,
    localIncumbency: state.localIncumbency,
    localDefections: state.localDefections,
    localBuffs: state.localBuffs,
    partyTurnoutMultipliers: state.localPartyTurnoutMultipliers,
    provinceTurnoutMultipliers: state.localProvinceTurnoutMultipliers,
    buyuksehirIds: state.activeArchiveId === '2009_local' ? BUYUKSEHIR_2009_IDS : undefined,
    referenceYear: refWinners?.year ?? 2024,
    referenceProvinceWinners: refWinners?.provinces,
    referenceIlceWinners: refWinners?.ilceler,
  });
}

const initialBaseline = getCachedBaseline('blended_90_10', null);
const initialLocalBaseline = getCachedLocalBaseline('2024_local');
const initialRaw2023 = getCachedRaw2023();

const initialPresTargetShares = deriveCandidateSharesFromParties(
  DEFAULT_PRESIDENTIAL_CANDIDATES,
  DEFAULT_TARGET_SHARES
);
const initialPresTransferMatrix = buildDefaultTransferMatrix(
  DEFAULT_PRESIDENTIAL_CANDIDATES,
  'imamoglu',
  'erdogan'
);
const initialPresR2Dynamics = buildDefaultPresidentialR2Dynamics(DEFAULT_PRESIDENTIAL_CANDIDATES);
const initialLocalIncumbency = buildDefaultLocalIncumbencyConfig();
const initialLocalDefections = buildDefaultLocalDefectionConfig();
const initialLocalBuffs = buildDefaultLocalBuffs();
const initialPresAbroadConfig: AbroadVoteConfig = {
  ...initialBaseline.abroad,
  partyShares: { ...initialBaseline.abroad.partyShares },
};

const initialPresidentialProjection = computePresidentialProjection({
  baseline: initialBaseline,
  parties: DEFAULT_PARTIES,
  candidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
  swingMode: 'proportional',
  candidateTargetShares: initialPresTargetShares,
  targetTurnout: initialBaseline.nationalBaseTurnout,
  voterScaleFactor: 1.0,
  abroadConfig: initialPresAbroadConfig,
  provinceOverrides: {},
  ilceOverrides: {},
  transferMatrix: initialPresTransferMatrix,
  round2Dynamics: initialPresR2Dynamics,
  referencePartyWeights: DEFAULT_TARGET_SHARES,
});

const initialLocalProjection = computeLocalProjection({
  baseline: initialLocalBaseline,
  parties: DEFAULT_PARTIES,
  swingMode: 'proportional',
  localProvinceMode: 'merkez_ilce',
  targetShares: { ...DEFAULT_TARGET_SHARES },
  targetTurnout: initialLocalBaseline.nationalBaseTurnout,
  voterScaleFactor: 1.0,
  provinceOverrides: {},
  ilceOverrides: {},
  localAllianceRules: DEFAULT_LOCAL_ALLIANCE_RULES,
  localIncumbency: initialLocalIncumbency,
  localDefections: initialLocalDefections,
});

const initialBaselineProjection = runMultiLayerProjection({
  baseline: initialRaw2023,
  parties: DEFAULT_PARTIES,
  alliances: DEFAULT_ALLIANCES,
  swingMode: 'proportional',
  dhondtMode: '2022_separate',
  thresholdPct: 7.0,
  nationalTargetShares: { ...initialRaw2023.nationalBaseShares },
  nationalTargetTurnout: initialRaw2023.nationalBaseTurnout,
  nationalVoterScaleFactor: 1.0,
  abroadConfig: { ...initialRaw2023.abroad, partyShares: { ...initialRaw2023.abroad.partyShares } },
  ilceOverrides: {},
  districtOverrides: {},
  provinceOverrides: {},
  jointListRules: [],
  localBuffs: initialLocalBuffs,
});

const initialProjection = runMultiLayerProjection({
  baseline: initialBaseline,
  parties: DEFAULT_PARTIES,
  alliances: DEFAULT_ALLIANCES,
  swingMode: 'proportional',
  dhondtMode: '2022_separate',
  thresholdPct: 7.0,
  nationalTargetShares: { ...DEFAULT_TARGET_SHARES },
  nationalTargetTurnout: initialBaseline.nationalBaseTurnout,
  nationalVoterScaleFactor: 1.0,
  abroadConfig: { ...initialBaseline.abroad, partyShares: { ...initialBaseline.abroad.partyShares } },
  ilceOverrides: {},
  districtOverrides: {},
  provinceOverrides: {},
  jointListRules: [],
  localBuffs: initialLocalBuffs,
});

const historyManager = new ScenarioHistoryManager();

export const useElectionStore = create<ElectionStoreState>((rawSet, get) => {
  const set = rawSet;
  const commit = (
    updater: (state: ElectionStoreState) => Partial<ElectionStoreState>,
    coalesceKey?: string
  ) =>
    rawSet((state) => {
      historyManager.push(state, coalesceKey);
      // Any What-If edit inside an archive election resets deltas to that election's own official result.
      const needsSelfRevert = Boolean(
        state.activeArchiveId && state.archiveComparisonId && state.archiveComparisonId !== 'self'
      );
      const effective = needsSelfRevert
        ? { ...state, archiveComparisonId: 'self' as ArchiveComparisonRef }
        : state;
      const patch = updater(effective);
      return {
        ...patch,
        ...(needsSelfRevert
          ? {
              archiveComparisonId: 'self' as ArchiveComparisonRef,
              baselineProjection: state.archiveSelfBaselineProjection,
              archiveComparisonProjection: null,
              archivePresComparisonProjection: null,
            }
          : {}),
        canUndo: historyManager.canUndo,
        canRedo: historyManager.canRedo,
      };
    });

  return {
  lang: 'tr',
  electionMode: 'parliamentary',
  baselineId: 'blended_90_10',
  customBaseline: null,
  parties: DEFAULT_PARTIES,
  alliances: DEFAULT_ALLIANCES,
  swingMode: 'proportional',
  dhondtMode: '2022_separate',
  thresholdPct: 7.0,

  nationalTargetShares: { ...DEFAULT_TARGET_SHARES },
  nationalTargetTurnout: initialBaseline.nationalBaseTurnout,
  nationalVoterScaleFactor: 1.0,
  abroadConfig: { ...initialBaseline.abroad, partyShares: { ...initialBaseline.abroad.partyShares } },

  provinceOverrides: {},
  districtOverrides: {},
  ilceOverrides: {},
  abroadCountryOverrides: {},
  jointListRules: [],
  localBuffs: initialLocalBuffs,

  presBaselineId: 'blended_90_10',
  presSwingMode: 'proportional',
  presCandidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
  presTargetShares: initialPresTargetShares,
  presTargetTurnout: initialBaseline.nationalBaseTurnout,
  presVoterScaleFactor: 1.0,
  presAbroadConfig: initialPresAbroadConfig,
  presProvinceOverrides: {},
  presIlceOverrides: {},
  presAbroadCountryOverrides: {},
  presTransferMatrix: initialPresTransferMatrix,
  presTransferFinalists: ['imamoglu', 'erdogan'],
  presR2Dynamics: initialPresR2Dynamics,
  presRoundView: 'round1',
  presidentialProjection: initialPresidentialProjection,

  localBaselineId: '2024_local',
  localSwingMode: 'proportional',
  localProvinceMode: 'merkez_ilce',
  localTargetShares: { ...DEFAULT_TARGET_SHARES },
  localTargetTurnout: initialLocalBaseline.nationalBaseTurnout,
  localVoterScaleFactor: 1.0,
  localProvinceOverrides: {},
  localIlceOverrides: {},
  localAllianceRules: DEFAULT_LOCAL_ALLIANCE_RULES,
  localIncumbency: initialLocalIncumbency,
  localDefections: initialLocalDefections,
  localProjection: initialLocalProjection,
  partyTurnoutMultipliers: {},
  provinceTurnoutMultipliers: {},
  localPartyTurnoutMultipliers: {},
  localProvinceTurnoutMultipliers: {},
  presCandidateTurnoutMultipliers: {},
  presProvinceTurnoutMultipliers: {},

  mapLayer: '87_district',
  mapColorMode: 'leader',
  mapFocusEntityId: null,
  activeArchiveId: null,
  archiveWhatIfParl: false,
  archiveLoading: false,
  archiveComparisonId: null,
  archiveSelfBaselineProjection: initialBaselineProjection,
  archiveComparisonProjection: null,
  archivePresSelfBaselineProjection: null,
  archivePresComparisonProjection: null,
  preArchiveSnapshot: null,
  zoomedProvinceId: null,
  activeScope: { type: 'national' },

  baselinesReady: false,
  localBaselineLoading: false,
  projection: initialProjection,
  baselineProjection: initialBaselineProjection,
  official2023Projection: initialBaselineProjection,
  canUndo: false,
  canRedo: false,

  undo: () =>
    rawSet((state) => {
      const snap = historyManager.undo(state);
      if (!snap) return state;
      const next = { ...state, ...snap };
      return {
        ...next,
        projection: recompute(next),
        presidentialProjection: recomputePresidential(next),
        localProjection: recomputeLocal(next),
        canUndo: historyManager.canUndo,
        canRedo: historyManager.canRedo,
      };
    }),

  redo: () =>
    rawSet((state) => {
      const snap = historyManager.redo(state);
      if (!snap) return state;
      const next = { ...state, ...snap };
      return {
        ...next,
        projection: recompute(next),
        presidentialProjection: recomputePresidential(next),
        localProjection: recomputeLocal(next),
        canUndo: historyManager.canUndo,
        canRedo: historyManager.canRedo,
      };
    }),

  initBaselines: async () => {
    await initCoreBaselines();
    if (get().baselinesReady) return;
    set((state) => {
      const base = getCachedBaseline(state.baselineId, state.customBaseline);
      const raw23 = getCachedRaw2023();
      const presBase = getCachedBaseline(state.presBaselineId, state.customBaseline);
      const locBase = getCachedLocalBaseline(state.localBaselineId);
      const abroadConfig: AbroadVoteConfig = {
        ...base.abroad,
        partyShares: { ...base.abroad.partyShares },
      };
      const presAbroadConfig: AbroadVoteConfig = {
        ...presBase.abroad,
        partyShares: { ...presBase.abroad.partyShares },
      };
      const nextState = {
        ...state,
        baselinesReady: true,
        nationalTargetTurnout: base.nationalBaseTurnout,
        abroadConfig,
        presTargetTurnout: presBase.nationalBaseTurnout,
        presAbroadConfig,
        localTargetTurnout: locBase.nationalBaseTurnout,
      };
      const baselineProjection = runMultiLayerProjection({
        baseline: raw23,
        parties: state.parties,
        alliances: state.alliances,
        swingMode: 'proportional',
        dhondtMode: state.dhondtMode,
        thresholdPct: state.thresholdPct,
        nationalTargetShares: { ...raw23.nationalBaseShares },
        nationalTargetTurnout: raw23.nationalBaseTurnout,
        nationalVoterScaleFactor: 1.0,
        abroadConfig: { ...raw23.abroad, partyShares: { ...raw23.abroad.partyShares } },
        ilceOverrides: {},
        districtOverrides: {},
        provinceOverrides: {},
        jointListRules: [],
      });
      return {
        ...nextState,
        baselineProjection,
        official2023Projection: baselineProjection,
        projection: recompute(nextState),
        presidentialProjection: recomputePresidential(nextState),
        localProjection: recomputeLocal(nextState),
      };
    });
  },

  setLanguage: (lang) => set({ lang }),

  setElectionMode: (mode) => {
    if (get().activeArchiveId !== null) {
      get().exitArchiveMode();
    }
    set((state) => {
      let mapLayer = state.mapLayer;
      let mapColorMode = state.mapColorMode;
      if (mode !== 'parliamentary' && mapLayer === '87_district') {
        mapLayer = '81_il';
      }
      if (mode === 'local' && mapLayer === 'abroad_world') {
        mapLayer = '81_il';
      }
      if (mode !== 'parliamentary' && mapColorMode === 'alliance') {
        mapColorMode = 'leader';
      }
      if (mode !== 'local' && mapColorMode === 'flips') {
        mapColorMode = 'leader';
      }
      const activeScope =
        mode !== 'parliamentary' && state.activeScope.type === 'district'
          ? { type: 'national' as const }
          : mode === 'local' &&
            (state.activeScope.type === 'abroad' || state.activeScope.type === 'abroadCountry')
          ? { type: 'national' as const }
          : state.activeScope;
      return {
        electionMode: mode,
        mapLayer,
        mapColorMode,
        activeScope,
      };
    });
  },

  setBaselineId: (id) =>
    set((state) => {
      const base = getActiveBaseline(id, state.customBaseline);
      const nextAbroad: AbroadVoteConfig = {
        ...base.abroad,
        partyShares: { ...base.abroad.partyShares },
      };
      // Preserve user's current nationalTargetShares when switching base election.
      const nextState = {
        ...state,
        baselineId: id,
        nationalTargetTurnout: base.nationalBaseTurnout,
        nationalVoterScaleFactor: 1.0,
        abroadConfig: nextAbroad,
        provinceOverrides: {},
        districtOverrides: {},
        ilceOverrides: {},
        abroadCountryOverrides: {},
      };
      const proj = recompute(nextState);
      const baselineProjection = runMultiLayerProjection({
        baseline: base,
        parties: state.parties,
        alliances: state.alliances,
        swingMode: 'proportional',
        dhondtMode: state.dhondtMode,
        thresholdPct: state.thresholdPct,
        nationalTargetShares: { ...base.nationalBaseShares },
        nationalTargetTurnout: base.nationalBaseTurnout,
        nationalVoterScaleFactor: 1.0,
        abroadConfig: { ...base.abroad, partyShares: { ...base.abroad.partyShares } },
        ilceOverrides: {},
        districtOverrides: {},
        provinceOverrides: {},
        abroadCountryOverrides: {},
        jointListRules: [],
      });
      return {
        ...nextState,
        projection: proj,
        baselineProjection,
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
        abroadCountryOverrides: {},
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
      const revert =
        state.activeArchiveId && state.archiveComparisonId && state.archiveComparisonId !== 'self'
          ? {
              archiveComparisonId: 'self' as ArchiveComparisonRef,
              baselineProjection: state.archiveSelfBaselineProjection,
              archiveComparisonProjection: null,
            }
          : {};
      return { dhondtMode, projection: recompute(next), ...revert };
    }),

  setThresholdPct: (thresholdPct) =>
    set((state) => {
      const clamped = Math.max(0, Math.min(25, thresholdPct));
      const next = { ...state, thresholdPct: clamped };
      const revert =
        state.activeArchiveId && state.archiveComparisonId && state.archiveComparisonId !== 'self'
          ? {
              archiveComparisonId: 'self' as ArchiveComparisonRef,
              baselineProjection: state.archiveSelfBaselineProjection,
              archiveComparisonProjection: null,
            }
          : {};
      return { thresholdPct: clamped, projection: recompute(next), ...revert };
    }),

  setMapLayer: (mapLayer) => set({ mapLayer }),
  setMapColorMode: (mapColorMode) => set({ mapColorMode }),
  setMapFocusEntityId: (mapFocusEntityId) => set({ mapFocusEntityId }),

  enterArchiveElection: async (id, whatIfParl = false) => {
    set({ archiveLoading: true });
    try {
      const cfg = ARCHIVE_ELECTIONS[id];
      const rawBase = await loadRawBaseline(cfg.baselineKey);
      const raw = prepareArchiveRaw(cfg, rawBase);
      const hasSpatialOverrides = raw !== rawBase;

      const isArchiveLocalMayoral = cfg.defaultMode === 'local' && !whatIfParl;
      const isArchivePresOrRef = cfg.defaultMode === 'presidential' && Boolean(cfg.presCandidates);
      if (isArchiveLocalMayoral && !hasCachedLocalBaseline('2024_local')) {
        await loadLocalBaseline('2024_local');
      }

      const targetRuntimeMode: ElectionMode = isArchiveLocalMayoral
        ? 'local'
        : isArchivePresOrRef
        ? 'presidential'
        : 'parliamentary';

      // Auto-pair chronological predecessor of compatible runtime mode by default
      let resolvedDefaultCompare: ArchiveComparisonRef = 'self';
      let precomputedCompare: Awaited<ReturnType<typeof computeOfficialArchiveProjection>> | null = null;
      if (cfg.defaultCompareId) {
        const cmpCfg = ARCHIVE_ELECTIONS[cfg.defaultCompareId];
        if (targetRuntimeMode === 'local' && archiveFamily(cmpCfg) === 'local') {
          resolvedDefaultCompare = cfg.defaultCompareId;
        } else if (
          targetRuntimeMode === 'presidential' &&
          archiveFamily(cmpCfg) === 'presidential'
        ) {
          resolvedDefaultCompare = cfg.defaultCompareId;
          precomputedCompare = await computeOfficialArchiveProjection(cfg.defaultCompareId);
        } else if (
          targetRuntimeMode === 'parliamentary' &&
          (archiveFamily(cmpCfg) === 'parliamentary' || cmpCfg.supportsWhatIfParl)
        ) {
          resolvedDefaultCompare = cfg.defaultCompareId;
          precomputedCompare = await computeOfficialArchiveProjection(cfg.defaultCompareId);
        }
      }

      set((state) => {
        const preArchiveSnapshot =
          state.activeArchiveId === null ? captureScenarioSnapshot(state) : state.preArchiveSnapshot;

        const preserved =
          state.activeArchiveId !== null
            ? remapArchiveScopeAndZoom(
                state.activeScope,
                state.zoomedProvinceId,
                cfg,
                raw,
                targetRuntimeMode
              )
            : { activeScope: { type: 'national' } as ActiveEditorScope, zoomedProvinceId: null };

        const archiveParties = cfg.parties.map((p) => ({ ...p }));
        const archiveAlliances = cfg.alliances.map((a) => ({ ...a }));

        if (isArchiveLocalMayoral) {
          const mayoralRaw = buildArchiveMayoralDataset(raw);
          const localTargetShares: Record<string, number> = {};
          for (const p of archiveParties) {
            localTargetShares[p.id] = mayoralRaw.nationalBaseShares[p.id] ?? 0;
          }
          const sanitizedMapLayer =
            state.mapLayer === '87_district' || state.mapLayer === 'abroad_world'
              ? ('81_il' as const)
              : state.mapLayer;
          const sanitizedColorMode =
            state.mapColorMode === 'alliance' ? ('leader' as const) : state.mapColorMode;

          const next = {
            ...state,
            parties: archiveParties,
            alliances: archiveAlliances,
            activeArchiveId: id,
            archiveWhatIfParl: false,
            archiveLoading: false,
            archiveComparisonId: resolvedDefaultCompare,
            archiveComparisonProjection: null,
            archivePresSelfBaselineProjection: null,
            archivePresComparisonProjection: null,
            preArchiveSnapshot,
            customBaseline: mayoralRaw,
            electionMode: 'local' as ElectionMode,
            mapLayer: sanitizedMapLayer,
            mapColorMode: sanitizedColorMode,
            localBaselineId: '2024_local' as LocalBaselineId,
            localSwingMode: 'proportional' as SwingMode,
            localProvinceMode: 'merkez_ilce' as LocalProvinceMode,
            localTargetShares,
            localTargetTurnout: mayoralRaw.nationalBaseTurnout,
            localVoterScaleFactor: 1.0,
            localProvinceOverrides: {},
            localIlceOverrides: {},
            localAllianceRules: [],
            localIncumbency: { intensityPct: 0, provinceBonuses: {} },
            localDefections: {
              ...state.localDefections,
              referenceBaseline: '2024' as LocalReferenceBaseline,
              includeKayyim: false,
              entries: [],
            },
            localPartyTurnoutMultipliers: {},
            localProvinceTurnoutMultipliers: {},
            localBuffs: [],
            activeScope: preserved.activeScope,
            zoomedProvinceId: preserved.zoomedProvinceId,
          };
          return { ...next, localProjection: recomputeLocal(next) };
        }

        if (isArchivePresOrRef && cfg.presCandidates) {
          const archivePresCands = cfg.presCandidates.map((c) => ({
            ...c,
            backingPartyIds: [...c.backingPartyIds],
          }));
          const presTargetShares = deriveCandidateSharesFromParties(
            archivePresCands,
            raw.nationalBaseShares
          );
          const rankedCands = [...archivePresCands].sort(
            (a, b) => (presTargetShares[b.id] ?? 0) - (presTargetShares[a.id] ?? 0)
          );
          const f0 = rankedCands[0]?.id ?? archivePresCands[0]?.id ?? 'erdogan';
          const f1 = rankedCands[1]?.id ?? archivePresCands[1]?.id ?? 'kilicdaroglu';
          const sanitizedMapLayer =
            state.mapLayer === '87_district'
              ? ('81_il' as const)
              : state.mapLayer === 'abroad_world' && !cfg.abroadEnabled
              ? ('81_il' as const)
              : state.mapLayer;
          const sanitizedColorMode =
            state.mapColorMode === 'alliance' ? ('leader' as const) : state.mapColorMode;

          const next = {
            ...state,
            parties: archiveParties,
            alliances: archiveAlliances,
            activeArchiveId: id,
            archiveWhatIfParl: false,
            archiveLoading: false,
            preArchiveSnapshot,
            electionMode: 'presidential' as ElectionMode,
            mapLayer: sanitizedMapLayer,
            mapColorMode: sanitizedColorMode,
            presBaselineId: 'custom' as BaselineId,
            customBaseline: raw,
            presSwingMode: 'proportional' as SwingMode,
            presCandidates: archivePresCands,
            presTargetShares,
            presTargetTurnout: raw.nationalBaseTurnout,
            presVoterScaleFactor: 1.0,
            presAbroadConfig: {
              ...raw.abroad,
              enabled: cfg.abroadEnabled,
              syncWithNationalSwing: false,
              partyShares: { ...raw.abroad.partyShares },
            },
            presProvinceOverrides: {},
            presIlceOverrides: {},
            presAbroadCountryOverrides: {},
            presCandidateTurnoutMultipliers: {},
            presProvinceTurnoutMultipliers: {},
            localBuffs: [],
            presTransferFinalists: [f0, f1] as [string, string],
            presTransferMatrix: buildDefaultTransferMatrix(archivePresCands, f0, f1),
            presR2Dynamics: buildDefaultPresidentialR2Dynamics(archivePresCands, true),
            presRoundView: 'round1' as PresidentialRoundView,
            activeScope: preserved.activeScope,
            zoomedProvinceId: preserved.zoomedProvinceId,
          };
          const selfPresProj = recomputePresidential(next);
          const alignedCmpPres =
            precomputedCompare && precomputedCompare.kind === 'presidential'
              ? alignPresidentialComparison(precomputedCompare.proj, precomputedCompare.cfg, selfPresProj, cfg)
              : null;
          return {
            ...next,
            presidentialProjection: selfPresProj,
            archivePresSelfBaselineProjection: selfPresProj,
            archivePresComparisonProjection: alignedCmpPres,
            archiveComparisonProjection: null,
            archiveComparisonId: alignedCmpPres ? resolvedDefaultCompare : ('self' as ArchiveComparisonRef),
          };
        }

        const parlRaw = cfg.supportsWhatIfParl ? buildArchiveCouncilDataset(raw) : raw;
        const nationalTargetShares: Record<string, number> = {};
        for (const p of archiveParties) {
          nationalTargetShares[p.id] = parlRaw.nationalBaseShares[p.id] ?? 0;
        }
        const sanitizedMapLayer =
          state.mapLayer === 'abroad_world' && !cfg.abroadEnabled
            ? ('81_il' as const)
            : state.mapLayer;
        const sanitizedColorMode = state.mapColorMode;

        const next = {
          ...state,
          parties: archiveParties,
          alliances: archiveAlliances,
          activeArchiveId: id,
          archiveWhatIfParl: cfg.supportsWhatIfParl ? whatIfParl : false,
          archiveLoading: false,
          preArchiveSnapshot,
          electionMode: 'parliamentary' as ElectionMode,
          mapLayer: sanitizedMapLayer,
          mapColorMode: sanitizedColorMode,
          baselineId: (id === '2023_general' && !hasSpatialOverrides ? '2023_general' : 'custom') as BaselineId,
          customBaseline: id === '2023_general' && !hasSpatialOverrides ? null : parlRaw,
          swingMode: 'proportional' as SwingMode,
          dhondtMode: cfg.dhondtMode,
          thresholdPct: cfg.thresholdPct,
          nationalTargetShares,
          nationalTargetTurnout: parlRaw.nationalBaseTurnout,
          nationalVoterScaleFactor: 1.0,
          abroadConfig: {
            ...parlRaw.abroad,
            enabled: cfg.abroadEnabled,
            partyShares: { ...parlRaw.abroad.partyShares },
          },
          provinceOverrides: {},
          districtOverrides: {},
          ilceOverrides: {},
          abroadCountryOverrides: {},
          partyTurnoutMultipliers: {},
          provinceTurnoutMultipliers: {},
          jointListRules: [],
          localBuffs: [],
          activeScope: preserved.activeScope,
          zoomedProvinceId: preserved.zoomedProvinceId,
        };
        const selfProj = recompute(next);
        const alignedCmpParl =
          precomputedCompare && precomputedCompare.kind === 'parliamentary'
            ? alignParliamentaryComparison(precomputedCompare.proj, precomputedCompare.cfg, selfProj, cfg)
            : null;
        return {
          ...next,
          projection: selfProj,
          archiveSelfBaselineProjection: selfProj,
          archiveComparisonProjection: alignedCmpParl,
          archivePresSelfBaselineProjection: null,
          archivePresComparisonProjection: null,
          baselineProjection: alignedCmpParl ?? selfProj,
          archiveComparisonId: alignedCmpParl ? resolvedDefaultCompare : ('self' as ArchiveComparisonRef),
        };
      });
    } catch {
      set({ archiveLoading: false });
    }
  },

  setArchiveComparisonId: async (compareId) => {
    const curState = get();
    if (!curState.activeArchiveId) return;
    if (compareId === 'self') {
      set((state) => {
        const next = {
          ...state,
          archiveComparisonId: 'self' as ArchiveComparisonRef,
          archiveComparisonProjection: null,
          archivePresComparisonProjection: null,
          baselineProjection: state.archiveSelfBaselineProjection,
        };
        return state.electionMode === 'local'
          ? { ...next, localProjection: recomputeLocal(next) }
          : next;
      });
      return;
    }

    const activeCfg = ARCHIVE_ELECTIONS[curState.activeArchiveId];
    if (curState.electionMode === 'local') {
      if (
        compareId !== curState.activeArchiveId &&
        ARCHIVE_ELECTIONS[compareId]?.defaultMode === 'local'
      ) {
        set((state) => {
          const next = { ...state, archiveComparisonId: compareId };
          return { ...next, localProjection: recomputeLocal(next) };
        });
      }
      return;
    }

    set({ archiveLoading: true });
    try {
      const computed = await computeOfficialArchiveProjection(compareId);
      set((state) => {
        if (state.activeArchiveId !== activeCfg.id) {
          return { archiveLoading: false };
        }
        if (state.electionMode === 'presidential' && computed.kind === 'presidential') {
          const selfPres = state.archivePresSelfBaselineProjection ?? state.presidentialProjection;
          const aligned = alignPresidentialComparison(computed.proj, computed.cfg, selfPres, activeCfg);
          return {
            archiveLoading: false,
            archiveComparisonId: compareId,
            archivePresComparisonProjection: aligned,
            archiveComparisonProjection: null,
          };
        }
        if (state.electionMode === 'parliamentary' && computed.kind === 'parliamentary') {
          const aligned = alignParliamentaryComparison(
            computed.proj,
            computed.cfg,
            state.archiveSelfBaselineProjection,
            activeCfg
          );
          return {
            archiveLoading: false,
            archiveComparisonId: compareId,
            archiveComparisonProjection: aligned,
            archivePresComparisonProjection: null,
            baselineProjection: aligned,
          };
        }
        return { archiveLoading: false };
      });
    } catch {
      set({ archiveLoading: false });
    }
  },

  stepArchiveElection: async (delta, categoryFilter = 'all') => {
    const st = get();
    if (!st.activeArchiveId) return;
    const filtered =
      categoryFilter === 'all'
        ? ARCHIVE_ELECTION_LIST
        : ARCHIVE_ELECTION_LIST.filter((e) => e.category === categoryFilter);
    const pool = filtered.length > 0 ? filtered : ARCHIVE_ELECTION_LIST;
    const curIdx = pool.findIndex((e) => e.id === st.activeArchiveId);
    if (curIdx < 0) return;
    // ARCHIVE_ELECTION_LIST is newest -> oldest: delta = -1 steps older (+1 index), +1 steps newer (-1 index).
    const nextIdx = delta < 0 ? curIdx + 1 : curIdx - 1;
    if (nextIdx < 0 || nextIdx >= pool.length) return;
    await get().enterArchiveElection(pool[nextIdx].id, false);
  },

  exitArchiveMode: () =>
    set((state) => {
      const snap = state.preArchiveSnapshot;
      if (!snap) {
        return {
          activeArchiveId: null,
          archiveWhatIfParl: false,
          archiveComparisonId: null,
          archiveComparisonProjection: null,
          archivePresSelfBaselineProjection: null,
          archivePresComparisonProjection: null,
        };
      }
      const nextMapLayer =
        snap.electionMode !== 'parliamentary' && state.mapLayer === '87_district'
          ? ('81_il' as const)
          : snap.electionMode === 'local' && state.mapLayer === 'abroad_world'
          ? ('81_il' as const)
          : state.mapLayer;
      const nextColorMode =
        snap.electionMode !== 'parliamentary' && state.mapColorMode === 'alliance'
          ? ('leader' as const)
          : snap.electionMode !== 'local' && state.mapColorMode === 'flips'
          ? ('leader' as const)
          : state.mapColorMode;
      const next = {
        ...state,
        ...snap,
        mapLayer: nextMapLayer,
        mapColorMode: nextColorMode,
        customBaseline: null,
        activeArchiveId: null,
        archiveWhatIfParl: false,
        archiveComparisonId: null,
        archiveComparisonProjection: null,
        archivePresSelfBaselineProjection: null,
        archivePresComparisonProjection: null,
        preArchiveSnapshot: null,
        activeScope: { type: 'national' } as ActiveEditorScope,
        zoomedProvinceId: null,
      };
      return {
        ...next,
        baselineProjection: state.official2023Projection,
        archiveSelfBaselineProjection: state.official2023Projection,
        projection: recompute(next),
        presidentialProjection: recomputePresidential(next),
        localProjection: recomputeLocal(next),
      };
    }),
  setZoomedProvinceId: (zoomedProvinceId) => set({ zoomedProvinceId }),
  setActiveScope: (activeScope) => set({ activeScope }),

  updateNationalPartyShare: (partyId, share) =>
    commit((state) => {
      const val = Math.max(0, Math.min(100, Number(share) || 0));
      const nationalTargetShares = { ...state.nationalTargetShares, [partyId]: val };
      const next = { ...state, nationalTargetShares };
      return { nationalTargetShares, projection: recompute(next) };
    }, `nat-share:${partyId}`),

  setNationalSharesBulk: (shares) =>
    commit((state) => {
      const next = { ...state, nationalTargetShares: { ...shares } };
      return { nationalTargetShares: { ...shares }, projection: recompute(next) };
    }),

  setPartyTurnoutMultiplier: (partyId, factor) =>
    commit((state) => {
      const clamped = Math.max(0.5, Math.min(1.5, Number(factor) || 1.0));
      const partyTurnoutMultipliers = { ...state.partyTurnoutMultipliers, [partyId]: clamped };
      const next = { ...state, partyTurnoutMultipliers };
      return { partyTurnoutMultipliers, projection: recompute(next) };
    }, `parl-turnout:${partyId}`),

  resetPartyTurnoutMultipliers: () =>
    commit((state) => {
      const next = { ...state, partyTurnoutMultipliers: {} };
      return { partyTurnoutMultipliers: {}, projection: recompute(next) };
    }),

  setProvinceTurnoutMultiplier: (ilId, partyId, factor) =>
    commit((state) => {
      const clamped = Math.max(0.5, Math.min(1.5, Number(factor) || 1.0));
      const prevProv = state.provinceTurnoutMultipliers[ilId] || {};
      const provinceTurnoutMultipliers = {
        ...state.provinceTurnoutMultipliers,
        [ilId]: { ...prevProv, [partyId]: clamped },
      };
      const next = { ...state, provinceTurnoutMultipliers };
      return { provinceTurnoutMultipliers, projection: recompute(next) };
    }, `parl-prov-turnout:${ilId}:${partyId}`),

  resetProvinceTurnoutMultipliers: (ilId) =>
    commit((state) => {
      const provinceTurnoutMultipliers = { ...state.provinceTurnoutMultipliers };
      delete provinceTurnoutMultipliers[ilId];
      const next = { ...state, provinceTurnoutMultipliers };
      return { provinceTurnoutMultipliers, projection: recompute(next) };
    }),

  setLocalPartyTurnoutMultiplier: (partyId, factor) =>
    commit((state) => {
      const clamped = Math.max(0.5, Math.min(1.5, Number(factor) || 1.0));
      const localPartyTurnoutMultipliers = { ...state.localPartyTurnoutMultipliers, [partyId]: clamped };
      const next = { ...state, localPartyTurnoutMultipliers };
      return { localPartyTurnoutMultipliers, localProjection: recomputeLocal(next) };
    }, `loc-turnout:${partyId}`),

  resetLocalPartyTurnoutMultipliers: () =>
    commit((state) => {
      const next = { ...state, localPartyTurnoutMultipliers: {} };
      return { localPartyTurnoutMultipliers: {}, localProjection: recomputeLocal(next) };
    }),

  setLocalProvinceTurnoutMultiplier: (ilId, partyId, factor) =>
    commit((state) => {
      const clamped = Math.max(0.5, Math.min(1.5, Number(factor) || 1.0));
      const prevProv = state.localProvinceTurnoutMultipliers[ilId] || {};
      const localProvinceTurnoutMultipliers = {
        ...state.localProvinceTurnoutMultipliers,
        [ilId]: { ...prevProv, [partyId]: clamped },
      };
      const next = { ...state, localProvinceTurnoutMultipliers };
      return { localProvinceTurnoutMultipliers, localProjection: recomputeLocal(next) };
    }, `loc-prov-turnout:${ilId}:${partyId}`),

  resetLocalProvinceTurnoutMultipliers: (ilId) =>
    commit((state) => {
      const localProvinceTurnoutMultipliers = { ...state.localProvinceTurnoutMultipliers };
      delete localProvinceTurnoutMultipliers[ilId];
      const next = { ...state, localProvinceTurnoutMultipliers };
      return { localProvinceTurnoutMultipliers, localProjection: recomputeLocal(next) };
    }),

  setPresCandidateTurnoutMultiplier: (candidateId, factor) =>
    commit((state) => {
      const clamped = Math.max(0.5, Math.min(1.5, Number(factor) || 1.0));
      const presCandidateTurnoutMultipliers = { ...state.presCandidateTurnoutMultipliers, [candidateId]: clamped };
      const next = { ...state, presCandidateTurnoutMultipliers };
      return { presCandidateTurnoutMultipliers, presidentialProjection: recomputePresidential(next) };
    }, `pres-turnout:${candidateId}`),

  resetPresCandidateTurnoutMultipliers: () =>
    commit((state) => {
      const next = { ...state, presCandidateTurnoutMultipliers: {} };
      return { presCandidateTurnoutMultipliers: {}, presidentialProjection: recomputePresidential(next) };
    }),

  setPresProvinceTurnoutMultiplier: (ilId, candidateId, factor) =>
    commit((state) => {
      const clamped = Math.max(0.5, Math.min(1.5, Number(factor) || 1.0));
      const prevProv = state.presProvinceTurnoutMultipliers[ilId] || {};
      const presProvinceTurnoutMultipliers = {
        ...state.presProvinceTurnoutMultipliers,
        [ilId]: { ...prevProv, [candidateId]: clamped },
      };
      const next = { ...state, presProvinceTurnoutMultipliers };
      return { presProvinceTurnoutMultipliers, presidentialProjection: recomputePresidential(next) };
    }, `pres-prov-turnout:${ilId}:${candidateId}`),

  resetPresProvinceTurnoutMultipliers: (ilId) =>
    commit((state) => {
      const presProvinceTurnoutMultipliers = { ...state.presProvinceTurnoutMultipliers };
      delete presProvinceTurnoutMultipliers[ilId];
      const next = { ...state, presProvinceTurnoutMultipliers };
      return { presProvinceTurnoutMultipliers, presidentialProjection: recomputePresidential(next) };
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
      if (scope.type === 'abroadCountry') {
        const currentShares =
          state.abroadCountryOverrides[scope.countryId]?.partyShares ||
          state.projection.abroadCountryResults[scope.countryId]?.partyShares ||
          {};
        const partyShares = normalizeSharesTo100(currentShares, state.parties);
        for (const k of Object.keys(partyShares)) partyShares[k] = Number(partyShares[k].toFixed(2));
        const abroadCountryOverrides = {
          ...state.abroadCountryOverrides,
          [scope.countryId]: {
            ...state.abroadCountryOverrides[scope.countryId],
            partyShares,
            isLocked: true,
          },
        };
        const next = { ...state, abroadCountryOverrides };
        return { abroadCountryOverrides, projection: recompute(next) };
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
      if (scope.type === 'abroadCountry') {
        const currentShares =
          state.abroadCountryOverrides[scope.countryId]?.partyShares ||
          state.projection.abroadCountryResults[scope.countryId]?.partyShares ||
          {};
        const partyShares = sendRemainderToOther(currentShares, state.parties);
        const abroadCountryOverrides = {
          ...state.abroadCountryOverrides,
          [scope.countryId]: {
            ...state.abroadCountryOverrides[scope.countryId],
            partyShares,
            isLocked: true,
          },
        };
        const next = { ...state, abroadCountryOverrides };
        return { abroadCountryOverrides, projection: recompute(next) };
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
    commit((state) => {
      const abroadConfig = { ...state.abroadConfig, ...partial };
      const next = { ...state, abroadConfig };
      return { abroadConfig, projection: recompute(next) };
    }, 'abroad-cfg'),

  updateAbroadPartyShare: (partyId, share) =>
    commit((state) => {
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
    }, `abroad-share:${partyId}`),

  updateAbroadCountryShare: (countryId, partyId, share) =>
    commit((state) => {
      const val = Math.max(0, Math.min(100, Number(share) || 0));
      const existing =
        state.abroadCountryOverrides[countryId]?.partyShares ||
        state.projection.abroadCountryResults[countryId]?.partyShares ||
        {};
      const nextShares = { ...existing, [partyId]: val };
      const abroadCountryOverrides: Record<string, ProvinceOverride> = {
        ...state.abroadCountryOverrides,
        [countryId]: {
          ...state.abroadCountryOverrides[countryId],
          partyShares: nextShares,
          isLocked: true,
        },
      };
      const next = { ...state, abroadCountryOverrides };
      return { abroadCountryOverrides, projection: recompute(next) };
    }, `abroad-c:${countryId}:${partyId}`),

  updateAbroadCountryTurnoutAndVoters: (countryId, turnout, registeredVoters) =>
    commit((state) => {
      const current = state.abroadCountryOverrides[countryId] || { isLocked: true };
      const abroadCountryOverrides: Record<string, ProvinceOverride> = {
        ...state.abroadCountryOverrides,
        [countryId]: {
          ...current,
          turnout: turnout !== undefined ? turnout : current.turnout,
          registeredVoters:
            registeredVoters !== undefined ? registeredVoters : current.registeredVoters,
          isLocked: true,
        },
      };
      const next = { ...state, abroadCountryOverrides };
      return { abroadCountryOverrides, projection: recompute(next) };
    }, `abroad-ctv:${countryId}`),

  unlockAbroadCountry: (countryId) =>
    commit((state) => {
      const abroadCountryOverrides = { ...state.abroadCountryOverrides };
      delete abroadCountryOverrides[countryId];
      const next = { ...state, abroadCountryOverrides };
      return { abroadCountryOverrides, projection: recompute(next) };
    }),

  updateProvinceShare: (ilId, partyId, share) =>
    commit((state) => {
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
    }, `prov-share:${ilId}:${partyId}`),

  updateProvinceTurnoutAndVoters: (ilId, turnout, registeredVoters) =>
    commit((state) => {
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
    }, `prov-tv:${ilId}`),

  unlockProvince: (ilId) =>
    commit((state) => {
      const provinceOverrides = { ...state.provinceOverrides };
      delete provinceOverrides[ilId];
      const next = { ...state, provinceOverrides };
      return { provinceOverrides, projection: recompute(next) };
    }),

  updateDistrictShare: (districtId, partyId, share) =>
    commit((state) => {
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
    }, `dist-share:${districtId}:${partyId}`),

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
    commit((state) => {
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
    }, `ilce-share:${ilceId}:${partyId}`),

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
    commit((state) => {
      if (state.electionMode === 'presidential') {
        const next = {
          ...state,
          presProvinceOverrides: {},
          presIlceOverrides: {},
          presAbroadCountryOverrides: {},
        };
        return {
          presProvinceOverrides: {},
          presIlceOverrides: {},
          presAbroadCountryOverrides: {},
          presidentialProjection: recomputePresidential(next),
        };
      }
      if (state.electionMode === 'local') {
        const next = { ...state, localProvinceOverrides: {}, localIlceOverrides: {} };
        return {
          localProvinceOverrides: {},
          localIlceOverrides: {},
          localProjection: recomputeLocal(next),
        };
      }
      const next = {
        ...state,
        provinceOverrides: {},
        districtOverrides: {},
        ilceOverrides: {},
        abroadCountryOverrides: {},
      };
      return {
        provinceOverrides: {},
        districtOverrides: {},
        ilceOverrides: {},
        abroadCountryOverrides: {},
        projection: recompute(next),
      };
    }),

  resetAllToBaseline: () => {
    const activeArchiveId = get().activeArchiveId;
    if (activeArchiveId) {
      void get().enterArchiveElection(activeArchiveId, get().archiveWhatIfParl);
      return;
    }
    const mode = get().electionMode;
    if (mode === 'presidential') {
      get().resetPresidential();
      return;
    }
    if (mode === 'local') {
      get().resetLocal();
      return;
    }
    commit((state) => {
      const base = getActiveBaseline(state.baselineId, state.customBaseline);
      const nationalTargetShares: Record<string, number> = {};
      for (const p of state.parties) {
        nationalTargetShares[p.id] = DEFAULT_TARGET_SHARES[p.id] ?? 0;
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
        abroadCountryOverrides: {},
        jointListRules: [],
        localBuffs: [
          ...state.localBuffs.filter((b) => b.mode !== 'parliamentary'),
          ...buildDefaultLocalBuffs(),
        ],
      };
      return {
        ...next,
        projection: recompute(next),
      };
    });
  },

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

  resetPartyColors: () =>
    commit((state) => {
      const defaultColorById: Record<string, string> = {};
      for (const p of DEFAULT_PARTIES) defaultColorById[p.id] = p.color;
      const parties = state.parties.map((p) =>
        defaultColorById[p.id] ? { ...p, color: defaultColorById[p.id] } : p
      );
      const next = { ...state, parties };
      return {
        parties,
        projection: recompute(next),
        presidentialProjection: recomputePresidential(next),
        localProjection: recomputeLocal(next),
      };
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

  addLocalBuff: (rule) =>
    commit((state) => {
      const clampedBonus = Math.max(-30, Math.min(30, rule.bonusPp));
      const nextRule: LocalBuffRule = {
        ...rule,
        bonusPp: clampedBonus,
        id: `buff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      };
      const localBuffs = [...state.localBuffs, nextRule];
      const next = { ...state, localBuffs };
      if (nextRule.mode === 'presidential') {
        return { localBuffs, presidentialProjection: recomputePresidential(next) };
      }
      if (nextRule.mode === 'local') {
        return { localBuffs, localProjection: recomputeLocal(next) };
      }
      return { localBuffs, projection: recompute(next) };
    }),

  updateLocalBuff: (id, partial) =>
    commit((state) => {
      let targetMode: ElectionMode | null = null;
      const localBuffs = state.localBuffs.map((b) => {
        if (b.id !== id) return b;
        targetMode = b.mode;
        const nextBonus =
          partial.bonusPp !== undefined ? Math.max(-30, Math.min(30, partial.bonusPp)) : b.bonusPp;
        return { ...b, ...partial, bonusPp: nextBonus };
      });
      const next = { ...state, localBuffs };
      if (targetMode === 'presidential') {
        return { localBuffs, presidentialProjection: recomputePresidential(next) };
      }
      if (targetMode === 'local') {
        return { localBuffs, localProjection: recomputeLocal(next) };
      }
      return { localBuffs, projection: recompute(next) };
    }, `buff_update_${id}`),

  removeLocalBuff: (id) =>
    commit((state) => {
      const existing = state.localBuffs.find((b) => b.id === id);
      const localBuffs = state.localBuffs.filter((b) => b.id !== id);
      const next = { ...state, localBuffs };
      if (existing?.mode === 'presidential') {
        return { localBuffs, presidentialProjection: recomputePresidential(next) };
      }
      if (existing?.mode === 'local') {
        return { localBuffs, localProjection: recomputeLocal(next) };
      }
      return { localBuffs, projection: recompute(next) };
    }),

  toggleLocalBuff: (id) =>
    commit((state) => {
      const existing = state.localBuffs.find((b) => b.id === id);
      const localBuffs = state.localBuffs.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b));
      const next = { ...state, localBuffs };
      if (existing?.mode === 'presidential') {
        return { localBuffs, presidentialProjection: recomputePresidential(next) };
      }
      if (existing?.mode === 'local') {
        return { localBuffs, localProjection: recomputeLocal(next) };
      }
      return { localBuffs, projection: recompute(next) };
    }),

  clearLocalBuffsForUnit: (mode, unitType, unitId) =>
    commit((state) => {
      const localBuffs = state.localBuffs.filter(
        (b) => !(b.mode === mode && b.unitType === unitType && b.unitId === unitId)
      );
      const next = { ...state, localBuffs };
      if (mode === 'presidential') {
        return { localBuffs, presidentialProjection: recomputePresidential(next) };
      }
      if (mode === 'local') {
        return { localBuffs, localProjection: recomputeLocal(next) };
      }
      return { localBuffs, projection: recompute(next) };
    }),

  exportScenarioJson: () => {
    const s = get();
    return JSON.stringify(
      {
        version: '2.1',
        electionMode: s.electionMode,
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
        abroadCountryOverrides: s.abroadCountryOverrides,
        jointListRules: s.jointListRules,
        localBuffs: s.localBuffs,
        partyTurnoutMultipliers: s.partyTurnoutMultipliers,
        provinceTurnoutMultipliers: s.provinceTurnoutMultipliers,
        presidential: {
          baselineId: s.presBaselineId,
          swingMode: s.presSwingMode,
          candidates: s.presCandidates,
          targetShares: s.presTargetShares,
          targetTurnout: s.presTargetTurnout,
          voterScaleFactor: s.presVoterScaleFactor,
          abroadConfig: s.presAbroadConfig,
          provinceOverrides: s.presProvinceOverrides,
          ilceOverrides: s.presIlceOverrides,
          abroadCountryOverrides: s.presAbroadCountryOverrides,
          transferMatrix: s.presTransferMatrix,
          round2Dynamics: s.presR2Dynamics,
          roundView: s.presRoundView,
          candidateTurnoutMultipliers: s.presCandidateTurnoutMultipliers,
          provinceTurnoutMultipliers: s.presProvinceTurnoutMultipliers,
        },
        local: {
          baselineId: s.localBaselineId,
          swingMode: s.localSwingMode,
          provinceMode: s.localProvinceMode,
          targetShares: s.localTargetShares,
          targetTurnout: s.localTargetTurnout,
          voterScaleFactor: s.localVoterScaleFactor,
          provinceOverrides: s.localProvinceOverrides,
          ilceOverrides: s.localIlceOverrides,
          allianceRules: s.localAllianceRules,
          incumbency: s.localIncumbency,
          defections: s.localDefections,
          partyTurnoutMultipliers: s.localPartyTurnoutMultipliers,
          provinceTurnoutMultipliers: s.localProvinceTurnoutMultipliers,
        },
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
        const pres = parsed.presidential || {};
        const loc = parsed.local || {};
        const nextLocalId: LocalBaselineId = loc.baselineId || state.localBaselineId;
        const next = {
          ...state,
          electionMode: parsed.electionMode || state.electionMode,
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
          abroadCountryOverrides: parsed.abroadCountryOverrides || {},
          jointListRules: parsed.jointListRules || [],
          localBuffs: parsed.localBuffs || [],
          partyTurnoutMultipliers: parsed.partyTurnoutMultipliers || {},
          provinceTurnoutMultipliers: parsed.provinceTurnoutMultipliers || {},
          localPartyTurnoutMultipliers: loc.partyTurnoutMultipliers || {},
          localProvinceTurnoutMultipliers: loc.provinceTurnoutMultipliers || {},
          presCandidateTurnoutMultipliers: pres.candidateTurnoutMultipliers || {},
          presProvinceTurnoutMultipliers: pres.provinceTurnoutMultipliers || {},
          presBaselineId: pres.baselineId || state.presBaselineId,
          presSwingMode: pres.swingMode || state.presSwingMode,
          presCandidates: pres.candidates || state.presCandidates,
          presTargetShares: pres.targetShares || state.presTargetShares,
          presTargetTurnout: pres.targetTurnout ?? state.presTargetTurnout,
          presVoterScaleFactor: pres.voterScaleFactor ?? 1.0,
          presAbroadConfig: pres.abroadConfig || state.presAbroadConfig,
          presProvinceOverrides: pres.provinceOverrides || {},
          presIlceOverrides: pres.ilceOverrides || {},
          presAbroadCountryOverrides: pres.abroadCountryOverrides || {},
          presTransferMatrix: pres.transferMatrix || state.presTransferMatrix,
          presR2Dynamics: pres.round2Dynamics || state.presR2Dynamics,
          presRoundView: pres.roundView || state.presRoundView,
          localBaselineId: nextLocalId,
          localSwingMode: loc.swingMode || state.localSwingMode,
          localProvinceMode: loc.provinceMode || state.localProvinceMode,
          localTargetShares: loc.targetShares || state.localTargetShares,
          localTargetTurnout: loc.targetTurnout ?? state.localTargetTurnout,
          localVoterScaleFactor: loc.voterScaleFactor ?? 1.0,
          localProvinceOverrides: loc.provinceOverrides || {},
          localIlceOverrides: loc.ilceOverrides || {},
          localAllianceRules: loc.allianceRules || state.localAllianceRules,
          localIncumbency: loc.incumbency || state.localIncumbency,
          localDefections: loc.defections || state.localDefections,
        };
        return {
          ...next,
          projection: recompute(next),
          presidentialProjection: recomputePresidential(next),
          localProjection: recomputeLocal(next),
        };
      });
      const resolvedLocalId = get().localBaselineId;
      if (!hasCachedLocalBaseline(resolvedLocalId)) {
        set({ localBaselineLoading: true });
        void loadLocalBaseline(resolvedLocalId)
          .then(() => {
            if (get().localBaselineId !== resolvedLocalId) return;
            set((curr) => ({ localProjection: recomputeLocal(curr), localBaselineLoading: false }));
          })
          .catch(() => {
            set({ localBaselineLoading: false });
          });
      }
      return true;
    } catch {
      return false;
    }
  },

  // ================================
  // PRESIDENTIAL ACTIONS
  // ================================

  setPresBaselineId: (id) =>
    set((state) => {
      const base = getActiveBaseline(id, state.customBaseline);
      const next = {
        ...state,
        presBaselineId: id,
        presTargetTurnout: base.nationalBaseTurnout,
        presVoterScaleFactor: 1.0,
        presAbroadConfig: { ...base.abroad, partyShares: { ...base.abroad.partyShares } },
        presProvinceOverrides: {},
        presIlceOverrides: {},
        presAbroadCountryOverrides: {},
      };
      return { ...next, presidentialProjection: recomputePresidential(next) };
    }),

  setPresSwingMode: (mode) =>
    set((state) => {
      const next = { ...state, presSwingMode: mode };
      return { presSwingMode: mode, presidentialProjection: recomputePresidential(next) };
    }),

  setPresRoundView: (view) =>
    set((state) => {
      const isRef = Boolean(state.activeArchiveId && state.activeArchiveId.endsWith('_ref'));
      const noRunoff = isRef || state.presidentialProjection.decidedInRound === 1;
      return { presRoundView: view === 'round2' && noRunoff ? 'round1' : view };
    }),

  updatePresCandidateShare: (candidateId, share) =>
    commit((state) => {
      const clamped = Math.max(0, Math.min(100, Number(share) || 0));
      const presTargetShares = { ...state.presTargetShares, [candidateId]: clamped };
      const next = { ...state, presTargetShares };
      const proj = recomputePresidential(next);
      return {
        ...next,
        presTargetShares,
        presTransferMatrix: next.presTransferMatrix,
        presTransferFinalists: next.presTransferFinalists,
        presidentialProjection: proj,
      };
    }, `pres-share:${candidateId}`),

  setPresSharesBulk: (shares) =>
    commit((state) => {
      const presTargetShares = { ...shares };
      const next = { ...state, presTargetShares };
      const proj = recomputePresidential(next);
      return {
        ...next,
        presTargetShares,
        presTransferMatrix: next.presTransferMatrix,
        presTransferFinalists: next.presTransferFinalists,
        presidentialProjection: proj,
      };
    }),

  normalizePresCandidateShares: () =>
    set((state) => {
      const pseudo = state.presCandidates.map((c) => ({
        id: c.id,
        shortName: c.shortName,
        fullName: c.name,
        color: c.color,
        allianceId: null,
        isOther: c.isOther,
      }));
      const normalized = normalizeSharesTo100(state.presTargetShares, pseudo);
      const rounded: Record<string, number> = {};
      for (const c of state.presCandidates) {
        rounded[c.id] = Number((normalized[c.id] || 0).toFixed(2));
      }
      const next = { ...state, presTargetShares: rounded };
      const proj = recomputePresidential(next);
      return {
        ...next,
        presTargetShares: rounded,
        presTransferMatrix: next.presTransferMatrix,
        presTransferFinalists: next.presTransferFinalists,
        presidentialProjection: proj,
      };
    }),

  sendPresRemainderToOther: () =>
    set((state) => {
      const pseudo = state.presCandidates.map((c) => ({
        id: c.id,
        shortName: c.shortName,
        fullName: c.name,
        color: c.color,
        allianceId: null,
        isOther: c.isOther,
      }));
      const filled = sendRemainderToOther(state.presTargetShares, pseudo);
      const next = { ...state, presTargetShares: filled };
      const proj = recomputePresidential(next);
      return {
        ...next,
        presTargetShares: filled,
        presTransferMatrix: next.presTransferMatrix,
        presTransferFinalists: next.presTransferFinalists,
        presidentialProjection: proj,
      };
    }),

  setPresTurnout: (turnout) =>
    set((state) => {
      const val = Math.max(0, Math.min(100, Number(turnout) || 0));
      const next = { ...state, presTargetTurnout: val };
      return { ...next, presTargetTurnout: val, presidentialProjection: recomputePresidential(next) };
    }),

  setPresRegisteredVoters: (totalVoters) =>
    set((state) => {
      const baseDom = getActiveBaseline(state.presBaselineId, state.customBaseline).ilceler.reduce(
        (s, i) => s + i.registeredVoters,
        0
      );
      const factor = baseDom > 0 ? Math.max(0.1, totalVoters / baseDom) : 1.0;
      const next = { ...state, presVoterScaleFactor: factor };
      return { ...next, presVoterScaleFactor: factor, presidentialProjection: recomputePresidential(next) };
    }),

  updatePresAbroadConfig: (partial) =>
    set((state) => {
      const presAbroadConfig = { ...state.presAbroadConfig, ...partial };
      const next = { ...state, presAbroadConfig };
      return { ...next, presAbroadConfig, presidentialProjection: recomputePresidential(next) };
    }),

  addPresCandidate: (name, shortName, color) =>
    set((state) => {
      if (state.presCandidates.length >= 9) return state;
      const id =
        shortName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 10) || `cand_${Date.now()}`;
      if (state.presCandidates.some((c) => c.id === id)) return state;
      const newCand: PresidentialCandidateConfig = {
        id,
        name: name.trim() || shortName,
        shortName: shortName.trim().toUpperCase(),
        color,
        backingPartyIds: [],
      };
      const otherIdx = state.presCandidates.findIndex((c) => c.isOther);
      const presCandidates = [...state.presCandidates];
      if (otherIdx >= 0) {
        presCandidates.splice(otherIdx, 0, newCand);
      } else {
        presCandidates.push(newCand);
      }
      const presTargetShares = { ...state.presTargetShares, [id]: 0 };
      const next = { ...state, presCandidates, presTargetShares };
      return { ...next, presCandidates, presTargetShares, presidentialProjection: recomputePresidential(next) };
    }),

  updatePresCandidate: (candidateId, partial) =>
    set((state) => {
      const presCandidates = state.presCandidates.map((c) =>
        c.id === candidateId ? { ...c, ...partial } : c
      );
      const next = { ...state, presCandidates };
      return { ...next, presCandidates, presidentialProjection: recomputePresidential(next) };
    }),

  removePresCandidate: (candidateId) =>
    set((state) => {
      const nonOther = state.presCandidates.filter((c) => !c.isOther);
      const target = state.presCandidates.find((c) => c.id === candidateId);
      if (!target || target.isOther || nonOther.length <= 2) return state;

      const otherCand = state.presCandidates.find((c) => c.isOther) || nonOther.find((c) => c.id !== candidateId)!;
      const freedShare = state.presTargetShares[candidateId] ?? 0;
      const presCandidates = state.presCandidates
        .filter((c) => c.id !== candidateId)
        .map((c) =>
          c.id === otherCand.id
            ? { ...c, backingPartyIds: [...c.backingPartyIds, ...target.backingPartyIds] }
            : c
        );
      const presTargetShares = { ...state.presTargetShares };
      delete presTargetShares[candidateId];
      presTargetShares[otherCand.id] = Number(
        ((presTargetShares[otherCand.id] ?? 0) + freedShare).toFixed(2)
      );
      const next = { ...state, presCandidates, presTargetShares };
      return { ...next, presCandidates, presTargetShares, presidentialProjection: recomputePresidential(next) };
    }),

  assignPartyToCandidate: (partyId, targetCandidateId) =>
    set((state) => {
      const presCandidates = state.presCandidates.map((c) => {
        const filtered = c.backingPartyIds.filter((pid) => pid !== partyId);
        if (c.id === targetCandidateId) {
          return { ...c, backingPartyIds: [...filtered, partyId] };
        }
        return { ...c, backingPartyIds: filtered };
      });
      const next = { ...state, presCandidates };
      return { ...next, presCandidates, presidentialProjection: recomputePresidential(next) };
    }),

  syncPresidentialFromParliamentary: () =>
    set((state) => {
      const presTargetShares = deriveCandidateSharesFromParties(
        state.presCandidates,
        state.nationalTargetShares
      );
      const next = { ...state, presTargetShares };
      return { ...next, presTargetShares, presidentialProjection: recomputePresidential(next) };
    }),

  updatePresTransfer: (eliminatedId, partial) =>
    set((state) => {
      const [firstId, secondId] = state.presidentialProjection.topTwoCandidateIds;
      const current = state.presTransferMatrix[eliminatedId] || {
        toFirstPct: 40,
        toSecondPct: 40,
        abstainPct: 20,
      };
      let toFirstPct = Math.max(0, Math.min(100, partial.toFirstPct ?? current.toFirstPct));
      let toSecondPct = Math.max(0, Math.min(100, partial.toSecondPct ?? current.toSecondPct));
      let abstainPct = Math.max(0, Math.min(100, partial.abstainPct ?? current.abstainPct));

      // Keep total at 100 by adjusting the non-edited slices cleanly
      if (partial.toFirstPct !== undefined) {
        const rem = 100 - toFirstPct;
        const origOther = current.toSecondPct + current.abstainPct;
        if (origOther > 0) {
          toSecondPct = Math.round(rem * (current.toSecondPct / origOther));
          abstainPct = Math.max(0, rem - toSecondPct);
        } else {
          toSecondPct = rem;
          abstainPct = 0;
        }
      } else if (partial.toSecondPct !== undefined) {
        const rem = 100 - toSecondPct;
        const origOther = current.toFirstPct + current.abstainPct;
        if (origOther > 0) {
          toFirstPct = Math.round(rem * (current.toFirstPct / origOther));
          abstainPct = Math.max(0, rem - toFirstPct);
        } else {
          toFirstPct = rem;
          abstainPct = 0;
        }
      } else if (partial.abstainPct !== undefined) {
        const active = 100 - abstainPct;
        const origActive = current.toFirstPct + current.toSecondPct;
        if (origActive > 0) {
          toFirstPct = Math.round(active * (current.toFirstPct / origActive));
          toSecondPct = Math.max(0, active - toFirstPct);
        } else {
          toFirstPct = Math.floor(active / 2);
          toSecondPct = active - toFirstPct;
        }
      }

      const presTransferMatrix = {
        ...state.presTransferMatrix,
        [eliminatedId]: { toFirstPct, toSecondPct, abstainPct },
      };
      // Ensure top 2 keys stay preserved in case caller changed matrix
      void firstId;
      void secondId;
      const next = { ...state, presTransferMatrix };
      return { presTransferMatrix, presidentialProjection: recomputePresidential(next) };
    }),

  resetPresTransfersToDefault: () =>
    set((state) => {
      const [firstId, secondId] = state.presidentialProjection.topTwoCandidateIds;
      const presTransferMatrix = buildDefaultTransferMatrix(
        state.presCandidates,
        firstId,
        secondId
      );
      const next = { ...state, presTransferMatrix };
      return { presTransferMatrix, presidentialProjection: recomputePresidential(next) };
    }),

  setPresR2Dynamics: (partial) =>
    set((state) => {
      const presR2Dynamics = { ...state.presR2Dynamics, ...partial };
      const next = { ...state, presR2Dynamics };
      return { presR2Dynamics, presidentialProjection: recomputePresidential(next) };
    }),

  setPresFinalistR2Dynamic: (candidateId, partial) =>
    set((state) => {
      const cur = state.presR2Dynamics.finalistDynamics[candidateId] || {
        retentionPct: 100,
        mobilizationPct: 0,
      };
      const presR2Dynamics: PresidentialRound2Dynamics = {
        ...state.presR2Dynamics,
        finalistDynamics: {
          ...state.presR2Dynamics.finalistDynamics,
          [candidateId]: {
            retentionPct: Math.min(105, Math.max(70, partial.retentionPct ?? cur.retentionPct)),
            mobilizationPct: Math.min(15, Math.max(0, partial.mobilizationPct ?? cur.mobilizationPct)),
          },
        },
      };
      const next = { ...state, presR2Dynamics };
      return { presR2Dynamics, presidentialProjection: recomputePresidential(next) };
    }),

  resetPresR2Dynamics: (neutral = false) =>
    set((state) => {
      const presR2Dynamics = buildDefaultPresidentialR2Dynamics(state.presCandidates, neutral);
      const next = { ...state, presR2Dynamics };
      return { presR2Dynamics, presidentialProjection: recomputePresidential(next) };
    }),

  updatePresProvinceShare: (ilId, candidateId, share) =>
    set((state) => {
      const val = Math.max(0, Math.min(100, Number(share) || 0));
      const existing =
        state.presProvinceOverrides[ilId]?.partyShares ||
        state.presidentialProjection.round1.provinceResults[ilId]?.candidateShares ||
        {};
      const presProvinceOverrides: Record<string, ProvinceOverride> = {
        ...state.presProvinceOverrides,
        [ilId]: {
          ...state.presProvinceOverrides[ilId],
          partyShares: { ...existing, [candidateId]: val },
          isLocked: true,
        },
      };
      const next = { ...state, presProvinceOverrides };
      return { presProvinceOverrides, presidentialProjection: recomputePresidential(next) };
    }),

  unlockPresProvince: (ilId) =>
    set((state) => {
      const presProvinceOverrides = { ...state.presProvinceOverrides };
      delete presProvinceOverrides[ilId];
      const next = { ...state, presProvinceOverrides };
      return { presProvinceOverrides, presidentialProjection: recomputePresidential(next) };
    }),

  updatePresIlceShare: (ilceId, candidateId, share) =>
    set((state) => {
      const val = Math.max(0, Math.min(100, Number(share) || 0));
      const existing =
        state.presIlceOverrides[ilceId]?.partyShares ||
        state.presidentialProjection.round1.ilceResults[ilceId]?.candidateShares ||
        {};
      const presIlceOverrides: Record<string, IlceOverride> = {
        ...state.presIlceOverrides,
        [ilceId]: {
          ...state.presIlceOverrides[ilceId],
          partyShares: { ...existing, [candidateId]: val },
          isLocked: true,
        },
      };
      const next = { ...state, presIlceOverrides };
      return { presIlceOverrides, presidentialProjection: recomputePresidential(next) };
    }),

  unlockPresIlce: (ilceId) =>
    commit((state) => {
      const presIlceOverrides = { ...state.presIlceOverrides };
      delete presIlceOverrides[ilceId];
      const next = { ...state, presIlceOverrides };
      return { presIlceOverrides, presidentialProjection: recomputePresidential(next) };
    }),

  updatePresAbroadCountryShare: (countryId, candidateId, share) =>
    commit((state) => {
      const val = Math.max(0, Math.min(100, Number(share) || 0));
      const existing =
        state.presAbroadCountryOverrides[countryId]?.partyShares ||
        state.presidentialProjection.round1.abroadCountryResults[countryId]?.candidateShares ||
        {};
      const presAbroadCountryOverrides: Record<string, ProvinceOverride> = {
        ...state.presAbroadCountryOverrides,
        [countryId]: {
          ...state.presAbroadCountryOverrides[countryId],
          partyShares: { ...existing, [candidateId]: val },
          isLocked: true,
        },
      };
      const next = { ...state, presAbroadCountryOverrides };
      return { presAbroadCountryOverrides, presidentialProjection: recomputePresidential(next) };
    }, `pres-abroad-c:${countryId}:${candidateId}`),

  updatePresAbroadCountryTurnoutAndVoters: (countryId, turnout, registeredVoters) =>
    commit((state) => {
      const current = state.presAbroadCountryOverrides[countryId] || { isLocked: true };
      const presAbroadCountryOverrides: Record<string, ProvinceOverride> = {
        ...state.presAbroadCountryOverrides,
        [countryId]: {
          ...current,
          turnout: turnout !== undefined ? turnout : current.turnout,
          registeredVoters:
            registeredVoters !== undefined ? registeredVoters : current.registeredVoters,
          isLocked: true,
        },
      };
      const next = { ...state, presAbroadCountryOverrides };
      return { presAbroadCountryOverrides, presidentialProjection: recomputePresidential(next) };
    }, `pres-abroad-ctv:${countryId}`),

  unlockPresAbroadCountry: (countryId) =>
    commit((state) => {
      const presAbroadCountryOverrides = { ...state.presAbroadCountryOverrides };
      delete presAbroadCountryOverrides[countryId];
      const next = { ...state, presAbroadCountryOverrides };
      return { presAbroadCountryOverrides, presidentialProjection: recomputePresidential(next) };
    }),

  resetPresidential: () =>
    commit((state) => {
      const base = getActiveBaseline(state.presBaselineId, state.customBaseline);
      const presCandidates = DEFAULT_PRESIDENTIAL_CANDIDATES;
      const presTargetShares = deriveCandidateSharesFromParties(
        presCandidates,
        DEFAULT_TARGET_SHARES
      );
      const presTransferMatrix = buildDefaultTransferMatrix(
        presCandidates,
        'imamoglu',
        'erdogan'
      );
      const presR2Dynamics = buildDefaultPresidentialR2Dynamics(presCandidates);
      const next = {
        ...state,
        presSwingMode: 'proportional' as SwingMode,
        presCandidates,
        presTargetShares,
        presTargetTurnout: base.nationalBaseTurnout,
        presVoterScaleFactor: 1.0,
        presAbroadConfig: { ...base.abroad, partyShares: { ...base.abroad.partyShares } },
        presProvinceOverrides: {},
        presIlceOverrides: {},
        presAbroadCountryOverrides: {},
        presTransferMatrix,
        presTransferFinalists: ['imamoglu', 'erdogan'] as [string, string] | null,
        presR2Dynamics,
        presRoundView: 'round1' as PresidentialRoundView,
        localBuffs: state.localBuffs.filter((b) => b.mode !== 'presidential'),
      };
      return { ...next, presidentialProjection: recomputePresidential(next) };
    }),

  // ================================
  // LOCAL ELECTION ACTIONS
  // ================================

  setLocalBaselineId: (id) => {
    if (!hasCachedLocalBaseline(id)) {
      set({ localBaselineId: id, localBaselineLoading: true });
      void loadLocalBaseline(id)
        .then((base) => {
          if (get().localBaselineId !== id) return;
          set((state) => {
            const next = {
              ...state,
              localBaselineId: id,
              localTargetTurnout: base.nationalBaseTurnout,
              localVoterScaleFactor: 1.0,
              localProvinceOverrides: {},
              localIlceOverrides: {},
              localBaselineLoading: false,
            };
            return { ...next, localProjection: recomputeLocal(next) };
          });
        })
        .catch(() => {
          set({ localBaselineLoading: false });
        });
      return;
    }
    set((state) => {
      const base = getCachedLocalBaseline(id);
      const next = {
        ...state,
        localBaselineId: id,
        localBaselineLoading: false,
        localTargetTurnout: base.nationalBaseTurnout,
        localVoterScaleFactor: 1.0,
        localProvinceOverrides: {},
        localIlceOverrides: {},
      };
      return { ...next, localProjection: recomputeLocal(next) };
    });
  },

  setLocalSwingMode: (mode) =>
    set((state) => {
      const next = { ...state, localSwingMode: mode };
      return { localSwingMode: mode, localProjection: recomputeLocal(next) };
    }),

  setLocalProvinceMode: (mode) =>
    set((state) => {
      const next = { ...state, localProvinceMode: mode };
      return { localProvinceMode: mode, localProjection: recomputeLocal(next) };
    }),

  updateLocalPartyShare: (partyId, share) =>
    commit((state) => {
      const clamped = Math.max(0, Math.min(100, Number(share) || 0));
      const localTargetShares = { ...state.localTargetShares, [partyId]: clamped };
      const next = { ...state, localTargetShares };
      return { localTargetShares, localProjection: recomputeLocal(next) };
    }, `loc-share:${partyId}`),

  setLocalSharesBulk: (shares) =>
    commit((state) => {
      const localTargetShares = { ...shares };
      const next = { ...state, localTargetShares };
      return { localTargetShares, localProjection: recomputeLocal(next) };
    }),

  normalizeLocalShares: (scopeType?: 'province' | 'ilce', scopeId?: string) =>
    set((state) => {
      const targetType = scopeType || state.activeScope.type;
      const targetProvId =
        scopeType === 'province' && scopeId
          ? scopeId
          : state.activeScope.type === 'province'
          ? state.activeScope.ilId
          : null;
      const targetIlceId =
        scopeType === 'ilce' && scopeId
          ? scopeId
          : state.activeScope.type === 'ilce'
          ? state.activeScope.ilceId
          : null;

      if (targetType === 'province' && targetProvId) {
        const currentShares =
          state.localProvinceOverrides[targetProvId]?.partyShares ||
          state.localProjection.provinceResults[targetProvId]?.partyShares ||
          {};
        const partyShares = normalizeSharesTo100(currentShares, state.parties);
        for (const k of Object.keys(partyShares)) {
          partyShares[k] = Number(partyShares[k].toFixed(2));
        }
        const localProvinceOverrides = {
          ...state.localProvinceOverrides,
          [targetProvId]: {
            ...state.localProvinceOverrides[targetProvId],
            partyShares,
            isLocked: true,
          },
        };
        const next = { ...state, localProvinceOverrides };
        return { localProvinceOverrides, localProjection: recomputeLocal(next) };
      }
      if (targetType === 'ilce' && targetIlceId) {
        const currentShares =
          state.localIlceOverrides[targetIlceId]?.partyShares ||
          state.localProjection.ilceResults[targetIlceId]?.partyShares ||
          {};
        const partyShares = normalizeSharesTo100(currentShares, state.parties);
        for (const k of Object.keys(partyShares)) {
          partyShares[k] = Number(partyShares[k].toFixed(2));
        }
        const localIlceOverrides = {
          ...state.localIlceOverrides,
          [targetIlceId]: {
            ...state.localIlceOverrides[targetIlceId],
            partyShares,
            isLocked: true,
          },
        };
        const next = { ...state, localIlceOverrides };
        return { localIlceOverrides, localProjection: recomputeLocal(next) };
      }
      const normalized = normalizeSharesTo100(state.localTargetShares, state.parties);
      const rounded: Record<string, number> = {};
      for (const p of state.parties) {
        rounded[p.id] = Number((normalized[p.id] || 0).toFixed(2));
      }
      const next = { ...state, localTargetShares: rounded };
      return { localTargetShares: rounded, localProjection: recomputeLocal(next) };
    }),

  sendLocalRemainderToOther: (scopeType?: 'province' | 'ilce', scopeId?: string) =>
    set((state) => {
      const targetType = scopeType || state.activeScope.type;
      const targetProvId =
        scopeType === 'province' && scopeId
          ? scopeId
          : state.activeScope.type === 'province'
          ? state.activeScope.ilId
          : null;
      const targetIlceId =
        scopeType === 'ilce' && scopeId
          ? scopeId
          : state.activeScope.type === 'ilce'
          ? state.activeScope.ilceId
          : null;

      if (targetType === 'province' && targetProvId) {
        const currentShares =
          state.localProvinceOverrides[targetProvId]?.partyShares ||
          state.localProjection.provinceResults[targetProvId]?.partyShares ||
          {};
        const partyShares = sendRemainderToOther(currentShares, state.parties);
        const localProvinceOverrides = {
          ...state.localProvinceOverrides,
          [targetProvId]: {
            ...state.localProvinceOverrides[targetProvId],
            partyShares,
            isLocked: true,
          },
        };
        const next = { ...state, localProvinceOverrides };
        return { localProvinceOverrides, localProjection: recomputeLocal(next) };
      }
      if (targetType === 'ilce' && targetIlceId) {
        const currentShares =
          state.localIlceOverrides[targetIlceId]?.partyShares ||
          state.localProjection.ilceResults[targetIlceId]?.partyShares ||
          {};
        const partyShares = sendRemainderToOther(currentShares, state.parties);
        const localIlceOverrides = {
          ...state.localIlceOverrides,
          [targetIlceId]: {
            ...state.localIlceOverrides[targetIlceId],
            partyShares,
            isLocked: true,
          },
        };
        const next = { ...state, localIlceOverrides };
        return { localIlceOverrides, localProjection: recomputeLocal(next) };
      }
      const balanced = sendRemainderToOther(state.localTargetShares, state.parties);
      const next = { ...state, localTargetShares: balanced };
      return { localTargetShares: balanced, localProjection: recomputeLocal(next) };
    }),

  setLocalTurnout: (turnout) =>
    set((state) => {
      const val = Math.max(0, Math.min(100, Number(turnout) || 0));
      const next = { ...state, localTargetTurnout: val };
      return { localTargetTurnout: val, localProjection: recomputeLocal(next) };
    }),

  setLocalRegisteredVoters: (totalVoters) =>
    set((state) => {
      const base = getCachedLocalBaseline(state.localBaselineId);
      const baseDom = base.ilceler.reduce((s, i) => s + i.registeredVoters, 0);
      const factor = baseDom > 0 ? Math.max(0.1, totalVoters / baseDom) : 1.0;
      const next = { ...state, localVoterScaleFactor: factor };
      return { localVoterScaleFactor: factor, localProjection: recomputeLocal(next) };
    }),

  syncLocalFromParliamentary: () =>
    set((state) => {
      const localTargetShares = { ...state.nationalTargetShares };
      const next = { ...state, localTargetShares };
      return { localTargetShares, localProjection: recomputeLocal(next) };
    }),

  updateLocalProvinceShare: (ilId, partyId, share) =>
    set((state) => {
      const val = Math.max(0, Math.min(100, Number(share) || 0));
      const existing =
        state.localProvinceOverrides[ilId]?.partyShares ||
        state.localProjection.provinceResults[ilId]?.partyShares ||
        {};
      const localProvinceOverrides: Record<string, ProvinceOverride> = {
        ...state.localProvinceOverrides,
        [ilId]: {
          ...state.localProvinceOverrides[ilId],
          partyShares: { ...existing, [partyId]: val },
          isLocked: true,
        },
      };
      const next = { ...state, localProvinceOverrides };
      return { localProvinceOverrides, localProjection: recomputeLocal(next) };
    }),

  updateLocalProvinceTurnoutAndVoters: (ilId, turnout, registeredVoters) =>
    set((state) => {
      const current = state.localProvinceOverrides[ilId] || { isLocked: true };
      const localProvinceOverrides: Record<string, ProvinceOverride> = {
        ...state.localProvinceOverrides,
        [ilId]: {
          ...current,
          turnout: turnout !== undefined ? turnout : current.turnout,
          registeredVoters:
            registeredVoters !== undefined ? registeredVoters : current.registeredVoters,
          isLocked: true,
        },
      };
      const next = { ...state, localProvinceOverrides };
      return { localProvinceOverrides, localProjection: recomputeLocal(next) };
    }),

  unlockLocalProvince: (ilId) =>
    set((state) => {
      const localProvinceOverrides = { ...state.localProvinceOverrides };
      delete localProvinceOverrides[ilId];
      const next = { ...state, localProvinceOverrides };
      return { localProvinceOverrides, localProjection: recomputeLocal(next) };
    }),

  updateLocalIlceShare: (ilceId, partyId, share) =>
    set((state) => {
      const val = Math.max(0, Math.min(100, Number(share) || 0));
      const existing =
        state.localIlceOverrides[ilceId]?.partyShares ||
        state.localProjection.ilceResults[ilceId]?.partyShares ||
        {};
      const localIlceOverrides: Record<string, IlceOverride> = {
        ...state.localIlceOverrides,
        [ilceId]: {
          ...state.localIlceOverrides[ilceId],
          partyShares: { ...existing, [partyId]: val },
          isLocked: true,
        },
      };
      const next = { ...state, localIlceOverrides };
      return { localIlceOverrides, localProjection: recomputeLocal(next) };
    }),

  updateLocalIlceTurnoutAndVoters: (ilceId, turnout, registeredVoters) =>
    set((state) => {
      const current = state.localIlceOverrides[ilceId] || { isLocked: true };
      const localIlceOverrides: Record<string, IlceOverride> = {
        ...state.localIlceOverrides,
        [ilceId]: {
          ...current,
          turnout: turnout !== undefined ? turnout : current.turnout,
          registeredVoters:
            registeredVoters !== undefined ? registeredVoters : current.registeredVoters,
          isLocked: true,
        },
      };
      const next = { ...state, localIlceOverrides };
      return { localIlceOverrides, localProjection: recomputeLocal(next) };
    }),

  unlockLocalIlce: (ilceId) =>
    set((state) => {
      const localIlceOverrides = { ...state.localIlceOverrides };
      delete localIlceOverrides[ilceId];
      const next = { ...state, localIlceOverrides };
      return { localIlceOverrides, localProjection: recomputeLocal(next) };
    }),

  toggleLocalAllianceRule: (id) =>
    set((state) => {
      const localAllianceRules = state.localAllianceRules.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      );
      const next = { ...state, localAllianceRules };
      return { localAllianceRules, localProjection: recomputeLocal(next) };
    }),

  updateLocalAllianceRule: (id, partial) =>
    set((state) => {
      const localAllianceRules = state.localAllianceRules.map((r) =>
        r.id === id ? { ...r, ...partial } : r
      );
      const next = { ...state, localAllianceRules };
      return { localAllianceRules, localProjection: recomputeLocal(next) };
    }),

  addLocalAllianceRule: (rule) =>
    set((state) => {
      const localAllianceRules = [
        ...state.localAllianceRules,
        { ...rule, id: `loc_rule_${Date.now()}` },
      ];
      const next = { ...state, localAllianceRules };
      return { localAllianceRules, localProjection: recomputeLocal(next) };
    }),

  removeLocalAllianceRule: (id) =>
    set((state) => {
      const localAllianceRules = state.localAllianceRules.filter((r) => r.id !== id);
      const next = { ...state, localAllianceRules };
      return { localAllianceRules, localProjection: recomputeLocal(next) };
    }),

  setLocalIncumbencyIntensity: (intensityPct) =>
    set((state) => {
      const clamped = Math.min(150, Math.max(0, Number(intensityPct) || 0));
      const localIncumbency: LocalIncumbencyConfig = {
        ...state.localIncumbency,
        intensityPct: clamped,
      };
      const next = { ...state, localIncumbency };
      return { localIncumbency, localProjection: recomputeLocal(next) };
    }),

  setLocalProvinceIncumbencyBonus: (provinceId, partyId, bonusPp, note) =>
    set((state) => {
      const clampedPp = Math.min(25, Math.max(-15, Number(bonusPp) || 0));
      const localIncumbency: LocalIncumbencyConfig = {
        ...state.localIncumbency,
        provinceBonuses: {
          ...state.localIncumbency.provinceBonuses,
          [provinceId]: {
            partyId,
            bonusPp: clampedPp,
            note: note ?? state.localIncumbency.provinceBonuses[provinceId]?.note,
          },
        },
      };
      const next = { ...state, localIncumbency };
      return { localIncumbency, localProjection: recomputeLocal(next) };
    }),

  removeLocalProvinceIncumbencyBonus: (provinceId) =>
    set((state) => {
      const provinceBonuses = { ...state.localIncumbency.provinceBonuses };
      delete provinceBonuses[provinceId];
      const localIncumbency: LocalIncumbencyConfig = {
        ...state.localIncumbency,
        provinceBonuses,
      };
      const next = { ...state, localIncumbency };
      return { localIncumbency, localProjection: recomputeLocal(next) };
    }),

  resetLocalIncumbency: (neutral = false) =>
    set((state) => {
      const baseInc = buildDefaultLocalIncumbencyConfig();
      const localIncumbency: LocalIncumbencyConfig = neutral
        ? { ...baseInc, intensityPct: 0 }
        : baseInc;
      const next = { ...state, localIncumbency };
      return { localIncumbency, localProjection: recomputeLocal(next) };
    }),

  setLocalReferenceBaseline: (referenceBaseline) =>
    set((state) => {
      const localDefections: LocalDefectionConfig = {
        ...state.localDefections,
        referenceBaseline,
      };
      const next = { ...state, localDefections };
      return { localDefections, localProjection: recomputeLocal(next) };
    }),

  setLocalIncludeKayyim: (includeKayyim) =>
    set((state) => {
      const localDefections: LocalDefectionConfig = {
        ...state.localDefections,
        includeKayyim,
      };
      const next = { ...state, localDefections };
      return { localDefections, localProjection: recomputeLocal(next) };
    }),

  setLocalDefectionCarryover: (carryoverPct) =>
    set((state) => {
      const clamped = Math.min(100, Math.max(0, Number(carryoverPct) || 0));
      const localDefections: LocalDefectionConfig = {
        ...state.localDefections,
        carryoverPct: clamped,
      };
      const next = { ...state, localDefections };
      return { localDefections, localProjection: recomputeLocal(next) };
    }),

  setLocalDefectionBacklash: (backlashPp) =>
    set((state) => {
      const clamped = Math.min(8, Math.max(0, Number(backlashPp) || 0));
      const localDefections: LocalDefectionConfig = {
        ...state.localDefections,
        backlashPp: clamped,
      };
      const next = { ...state, localDefections };
      return { localDefections, localProjection: recomputeLocal(next) };
    }),

  toggleLocalDefectionEntry: (id) =>
    set((state) => {
      const entries = state.localDefections.entries.map((e) =>
        e.id === id ? { ...e, enabled: !e.enabled } : e
      );
      const localDefections: LocalDefectionConfig = { ...state.localDefections, entries };
      const next = { ...state, localDefections };
      return { localDefections, localProjection: recomputeLocal(next) };
    }),

  addLocalDefectionEntry: (entry) =>
    set((state) => {
      const id = `def-custom-${Date.now()}`;
      const entries = [{ ...entry, id }, ...state.localDefections.entries];
      const localDefections: LocalDefectionConfig = { ...state.localDefections, entries };
      const next = { ...state, localDefections };
      return { localDefections, localProjection: recomputeLocal(next) };
    }),

  removeLocalDefectionEntry: (id) =>
    set((state) => {
      const entries = state.localDefections.entries.filter((e) => e.id !== id);
      const localDefections: LocalDefectionConfig = { ...state.localDefections, entries };
      const next = { ...state, localDefections };
      return { localDefections, localProjection: recomputeLocal(next) };
    }),

  resetLocalDefections: () =>
    set((state) => {
      const localDefections = buildDefaultLocalDefectionConfig();
      const next = { ...state, localDefections };
      return { localDefections, localProjection: recomputeLocal(next) };
    }),

  resetLocal: () =>
    set((state) => {
      const base = getCachedLocalBaseline(state.localBaselineId);
      const localTargetShares: Record<string, number> = {};
      for (const p of state.parties) {
        localTargetShares[p.id] = DEFAULT_TARGET_SHARES[p.id] ?? 0;
      }
      const next = {
        ...state,
        localSwingMode: 'proportional' as SwingMode,
        localProvinceMode: 'merkez_ilce' as LocalProvinceMode,
        localTargetShares,
        localTargetTurnout: base.nationalBaseTurnout,
        localVoterScaleFactor: 1.0,
        localProvinceOverrides: {},
        localIlceOverrides: {},
        localAllianceRules: DEFAULT_LOCAL_ALLIANCE_RULES,
        localIncumbency: buildDefaultLocalIncumbencyConfig(),
        localDefections: buildDefaultLocalDefectionConfig(),
        localBuffs: state.localBuffs.filter((b) => b.mode !== 'local'),
      };
      return { ...next, localProjection: recomputeLocal(next) };
    }),
};
});

void useElectionStore.getState().initBaselines();
