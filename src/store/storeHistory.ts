import {
  AbroadVoteConfig,
  AllianceConfig,
  BaselineId,
  DHondtMode,
  ElectionMode,
  JointListRule,
  LocalAllianceRule,
  LocalBaselineId,
  LocalBuffRule,
  LocalDefectionConfig,
  LocalIncumbencyConfig,
  LocalProvinceMode,
  PartyConfig,
  PresidentialCandidateConfig,
  PresidentialRound2Dynamics,
  PresidentialTransferSplit,
  SwingMode,
} from '../types/election';
import { DistrictOverride, IlceOverride, ProvinceOverride } from '../engine/swing';

export interface ScenarioHistorySnapshot {
  electionMode: ElectionMode;
  baselineId: BaselineId;
  parties: PartyConfig[];
  alliances: AllianceConfig[];
  swingMode: SwingMode;
  dhondtMode: DHondtMode;
  thresholdPct: number;
  nationalTargetShares: Record<string, number>;
  nationalTargetTurnout: number;
  nationalVoterScaleFactor: number;
  abroadConfig: AbroadVoteConfig;
  provinceOverrides: Record<string, ProvinceOverride>;
  districtOverrides: Record<string, DistrictOverride>;
  ilceOverrides: Record<string, IlceOverride>;
  abroadCountryOverrides: Record<string, ProvinceOverride>;
  jointListRules: JointListRule[];
  localBuffs: LocalBuffRule[];

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
}

const MAX_HISTORY_STEPS = 40;
const COALESCE_MS = 450;

export function captureScenarioSnapshot(s: ScenarioHistorySnapshot): ScenarioHistorySnapshot {
  return structuredClone({
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
    presBaselineId: s.presBaselineId,
    presSwingMode: s.presSwingMode,
    presCandidates: s.presCandidates,
    presTargetShares: s.presTargetShares,
    presTargetTurnout: s.presTargetTurnout,
    presVoterScaleFactor: s.presVoterScaleFactor,
    presAbroadConfig: s.presAbroadConfig,
    presProvinceOverrides: s.presProvinceOverrides,
    presIlceOverrides: s.presIlceOverrides,
    presAbroadCountryOverrides: s.presAbroadCountryOverrides,
    presTransferMatrix: s.presTransferMatrix,
    presTransferFinalists: s.presTransferFinalists,
    presR2Dynamics: s.presR2Dynamics,
    localBaselineId: s.localBaselineId,
    localSwingMode: s.localSwingMode,
    localProvinceMode: s.localProvinceMode,
    localTargetShares: s.localTargetShares,
    localTargetTurnout: s.localTargetTurnout,
    localVoterScaleFactor: s.localVoterScaleFactor,
    localProvinceOverrides: s.localProvinceOverrides,
    localIlceOverrides: s.localIlceOverrides,
    localAllianceRules: s.localAllianceRules,
    localIncumbency: s.localIncumbency,
    localDefections: s.localDefections,
  });
}

export class ScenarioHistoryManager {
  private past: ScenarioHistorySnapshot[] = [];
  private future: ScenarioHistorySnapshot[] = [];
  private lastCoalesceKey: string | null = null;
  private lastCoalesceAt = 0;

  push(beforeState: ScenarioHistorySnapshot, coalesceKey?: string, now = Date.now()) {
    if (
      coalesceKey &&
      this.lastCoalesceKey === coalesceKey &&
      now - this.lastCoalesceAt < COALESCE_MS &&
      this.past.length > 0
    ) {
      this.lastCoalesceAt = now;
      return;
    }

    this.past.push(captureScenarioSnapshot(beforeState));
    if (this.past.length > MAX_HISTORY_STEPS) {
      this.past.shift();
    }
    this.future = [];
    this.lastCoalesceKey = coalesceKey || null;
    this.lastCoalesceAt = now;
  }

  undo(currentState: ScenarioHistorySnapshot): ScenarioHistorySnapshot | null {
    const prev = this.past.pop();
    if (!prev) return null;
    this.future.push(captureScenarioSnapshot(currentState));
    this.lastCoalesceKey = null;
    return captureScenarioSnapshot(prev);
  }

  redo(currentState: ScenarioHistorySnapshot): ScenarioHistorySnapshot | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(captureScenarioSnapshot(currentState));
    this.lastCoalesceKey = null;
    return captureScenarioSnapshot(next);
  }

  clear() {
    this.past = [];
    this.future = [];
    this.lastCoalesceKey = null;
  }

  get canUndo() {
    return this.past.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }
}
