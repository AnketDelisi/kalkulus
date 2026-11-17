import {
  AbroadVoteConfig,
  AllianceConfig,
  BaselineDataset,
  ComputedDistrictResult,
  ComputedElectionProjection,
  ComputedIlceResult,
  ComputedProvinceResult,
  DHondtMode,
  ElectoralDistrictConfig,
  IlceData,
  JointListRule,
  LocalBuffRule,
  PartyConfig,
  SwingMode,
} from '../types/election';
import { computeAndDistributeAbroadVotes, getProxyShare } from './abroad';
import { applyLocalBuffsToShares, resolveMatchingBuffs } from './buffs';
import { allocateDistrictSeatsDHondt, evaluateNationalThreshold } from './dhondt';

export { getProxyShare };

export interface IlceOverride {
  partyShares?: Record<string, number>;
  turnout?: number;
  registeredVoters?: number;
  isLocked: boolean;
}

export interface DistrictOverride {
  partyShares?: Record<string, number>;
  turnout?: number;
  registeredVoters?: number;
  mpCount?: number;
  isLocked: boolean;
}

export interface ProvinceOverride {
  partyShares?: Record<string, number>;
  turnout?: number;
  registeredVoters?: number;
  isLocked: boolean;
}

export interface ProjectionEngineInput {
  baseline: BaselineDataset;
  parties: PartyConfig[];
  alliances: AllianceConfig[];
  swingMode: SwingMode;
  dhondtMode: DHondtMode;
  thresholdPct: number;
  nationalTargetShares: Record<string, number>; // User's National Target % inputs
  nationalTargetTurnout: number; // User's National Turnout % input
  nationalVoterScaleFactor: number; // Default 1.0, or ratio if user changes national voter count
  abroadConfig: AbroadVoteConfig;
  ilceOverrides: Record<string, IlceOverride>;
  districtOverrides: Record<string, DistrictOverride>;
  provinceOverrides: Record<string, ProvinceOverride>;
  abroadCountryOverrides?: Record<string, ProvinceOverride>;
  localBuffs?: LocalBuffRule[];
  partyTurnoutMultipliers?: Record<string, number>;
  provinceTurnoutMultipliers?: Record<string, Record<string, number>>;
  jointListRules: JointListRule[];
}

/**
 * Applies per-party (or per-candidate) differential turnout multipliers (0.5..1.5, default 1.0)
 * to an ilce's projected vote shares and effective turnout.
 */
export function applyTurnoutMultipliers(
  shares: Record<string, number>,
  turnout: number,
  multipliers: Record<string, number> | undefined,
  ids: string[]
): { shares: Record<string, number>; turnout: number } {
  if (!multipliers) return { shares, turnout };
  let hasNonDefault = false;
  for (const id of ids) {
    const m = multipliers[id];
    if (m !== undefined && Math.abs(m - 1.0) > 0.001) {
      hasNonDefault = true;
      break;
    }
  }
  if (!hasNonDefault) return { shares, turnout };

  const scaled: Record<string, number> = {};
  let totalScaled = 0;
  for (const id of ids) {
    const s = Math.max(0, shares[id] ?? 0);
    const factor = Math.max(0.5, Math.min(1.5, multipliers[id] ?? 1.0));
    const val = s * factor;
    scaled[id] = val;
    totalScaled += val;
  }

  if (totalScaled <= 0) return { shares, turnout };

  const nextShares: Record<string, number> = {};
  for (const id of ids) {
    nextShares[id] = (scaled[id] / totalScaled) * 100;
  }
  const nextTurnout = Math.min(100, Math.max(0, turnout * (totalScaled / 100)));
  return { shares: nextShares, turnout: nextTurnout };
}

/**
 * Helper to normalize a share dictionary so all non-negative values sum to 100.
 */
export function normalizeSharesTo100(
  shares: Record<string, number>,
  parties: PartyConfig[]
): Record<string, number> {
  const result: Record<string, number> = {};
  let sum = 0;
  for (const p of parties) {
    const val = Math.max(0, Number(shares[p.id] ?? 0));
    result[p.id] = val;
    sum += val;
  }
  if (sum <= 0) {
    const equal = parties.length > 0 ? 100 / parties.length : 0;
    for (const p of parties) result[p.id] = equal;
    return result;
  }
  for (const p of parties) {
    result[p.id] = (result[p.id] / sum) * 100;
  }
  return result;
}

/**
 * Helper to send any remaining percentage (100 - sum of non-Other parties) to the "other" party bucket,
 * or normalize if sum exceeds 100%.
 */
export function sendRemainderToOther(
  shares: Record<string, number>,
  parties: PartyConfig[]
): Record<string, number> {
  const otherParty = parties.find((p) => p.isOther) || parties[parties.length - 1];
  if (!otherParty) return normalizeSharesTo100(shares, parties);

  const result: Record<string, number> = {};
  let nonOtherSum = 0;
  for (const p of parties) {
    if (p.id === otherParty.id) continue;
    const val = Math.max(0, Number(shares[p.id] ?? 0));
    result[p.id] = val;
    nonOtherSum += val;
  }

  if (nonOtherSum <= 100) {
    result[otherParty.id] = Number((100 - nonOtherSum).toFixed(2));
    return result;
  } else {
    result[otherParty.id] = 0;
    return normalizeSharesTo100(result, parties);
  }
}

/**
 * Applies Uniform Swing (UNS) or Proportional Swing (PS) from a base share distribution
 * to a target aggregate share distribution.
 */
export function swingShareVector(
  unitBaseShares: Record<string, number>,
  parentBaseShares: Record<string, number>,
  parentTargetShares: Record<string, number>,
  swingMode: SwingMode,
  parties: PartyConfig[],
  maxMinorOutlierMultiplier?: number
): Record<string, number> {
  const raw: Record<string, number> = {};

  for (const p of parties) {
    const uBase = unitBaseShares[p.id] ?? 0;
    const pBase = parentBaseShares[p.id] ?? 0;
    const pTarget = parentTargetShares[p.id] ?? pBase;
    const delta = pTarget - pBase;

    if (Math.abs(delta) < 1e-6) {
      raw[p.id] = uBase;
      continue;
    }

    if (uBase <= 0.1 && pBase <= 0.1 && p.proxyWeights) {
      const uProxy = getProxyShare(unitBaseShares, p);
      const pProxy = getProxyShare(parentBaseShares, p);
      if (pProxy > 0.1) {
        // Non-uniform proxy geography projection for 0%-baseline parties
        raw[p.id] = Math.max(0, pTarget * (uProxy / pProxy));
        continue;
      }
    }

    if (swingMode === 'proportional') {
      if (pBase > 0.01) {
        // Proportional scaling where party has an existing baseline
        let projected = uBase * (pTarget / pBase);
        if (maxMinorOutlierMultiplier && p.id !== 'HUDAPAR' && pBase < 1.0 && pTarget > 0) {
          projected = Math.min(projected, pTarget * maxMinorOutlierMultiplier);
        }
        raw[p.id] = Math.max(0, projected);
      } else {
        // Fallback to additive swing for brand-new / custom parties with 0% baseline
        raw[p.id] = Math.max(0, uBase + delta);
      }
    } else {
      // Uniform Swing (UNS)
      raw[p.id] = Math.max(0, uBase + delta);
    }
  }

  return normalizeSharesTo100(raw, parties);
}

/**
 * In the May 2023 parliamentary election, CHP withdrew its list in 7 provinces in favor of IYI Parti,
 * and IYI Parti withdrew its list in 9 provinces in favor of CHP. When projecting changes away from
 * the untouched 2023 baseline, we split the host party's 2023 share using each province's 2024
 * local-election CHP : IYI ratio so both parties carry realistic baseline strength.
 */
const JOINT_2023_PROVINCE_SPLITS: Record<
  string,
  { withdrawn: string; host: string; withdrawnRatio: number }
> = {
  // 7 provinces where CHP = 0% in 2023 (ran on IYI list)
  '68': { withdrawn: 'CHP', host: 'IYI', withdrawnRatio: 0.3778 }, // Aksaray
  '69': { withdrawn: 'CHP', host: 'IYI', withdrawnRatio: 0.5842 }, // Bayburt
  '13': { withdrawn: 'CHP', host: 'IYI', withdrawnRatio: 0.4241 }, // Bitlis
  '18': { withdrawn: 'CHP', host: 'IYI', withdrawnRatio: 0.6860 }, // Çankırı
  '29': { withdrawn: 'CHP', host: 'IYI', withdrawnRatio: 0.6510 }, // Gümüşhane
  '49': { withdrawn: 'CHP', host: 'IYI', withdrawnRatio: 0.5351 }, // Muş
  '66': { withdrawn: 'CHP', host: 'IYI', withdrawnRatio: 0.6908 }, // Yozgat
  // 9 provinces where IYI = 0% in 2023 (ran on CHP list)
  '02': { withdrawn: 'IYI', host: 'CHP', withdrawnRatio: 0.0253 }, // Adıyaman
  '74': { withdrawn: 'IYI', host: 'CHP', withdrawnRatio: 0.0541 }, // Bartın
  '72': { withdrawn: 'IYI', host: 'CHP', withdrawnRatio: 0.1145 }, // Batman
  '19': { withdrawn: 'IYI', host: 'CHP', withdrawnRatio: 0.1322 }, // Çorum
  '81': { withdrawn: 'IYI', host: 'CHP', withdrawnRatio: 0.2743 }, // Düzce
  '24': { withdrawn: 'IYI', host: 'CHP', withdrawnRatio: 0.1171 }, // Erzincan
  '30': { withdrawn: 'IYI', host: 'CHP', withdrawnRatio: 0.0826 }, // Hakkari
  '53': { withdrawn: 'IYI', host: 'CHP', withdrawnRatio: 0.1576 }, // Rize
  '65': { withdrawn: 'IYI', host: 'CHP', withdrawnRatio: 0.1514 }, // Van
};

function isProjectionModifiedFromBaseline(input: ProjectionEngineInput): boolean {
  const {
    baseline,
    parties,
    nationalTargetShares,
    nationalTargetTurnout,
    nationalVoterScaleFactor,
    ilceOverrides,
    districtOverrides,
    provinceOverrides,
    jointListRules,
  } = input;

  if (Math.abs(nationalVoterScaleFactor - 1.0) > 1e-4) return true;
  if (Math.abs(nationalTargetTurnout - baseline.nationalBaseTurnout) > 0.05) return true;
  if (jointListRules.length > 0) return true;

  for (const p of parties) {
    if (Math.abs((nationalTargetShares[p.id] ?? 0) - (baseline.nationalBaseShares[p.id] ?? 0)) > 0.05) {
      return true;
    }
  }
  for (const ovr of Object.values(ilceOverrides)) {
    if (ovr?.isLocked) return true;
  }
  for (const ovr of Object.values(districtOverrides)) {
    if (ovr?.isLocked) return true;
  }
  for (const ovr of Object.values(provinceOverrides)) {
    if (ovr?.isLocked) return true;
  }
  return false;
}

export function getEffectiveIlceBaseShares(
  ilce: IlceData,
  applyJoint2023Dealiasing: boolean
): Record<string, number> {
  if (!applyJoint2023Dealiasing) return ilce.partyShares;
  const split = JOINT_2023_PROVINCE_SPLITS[ilce.ilId];
  if (!split) return ilce.partyShares;

  const withdrawnVal = ilce.partyShares[split.withdrawn] ?? 0;
  const hostVal = ilce.partyShares[split.host] ?? 0;
  if (withdrawnVal === 0 && hostVal > 0) {
    const withdrawnShare = Number((hostVal * split.withdrawnRatio).toFixed(2));
    const hostShare = Number((hostVal - withdrawnShare).toFixed(2));
    return {
      ...ilce.partyShares,
      [split.withdrawn]: withdrawnShare,
      [split.host]: hostShare,
    };
  }
  return ilce.partyShares;
}

/**
 * Executes the full multi-layer hierarchical projection across:
 * - 973 İlçeler (respecting locked ilçe overrides, locked district/il overrides, or national swing)
 * - 87 Electoral Districts (aggregating domestic ilçe votes + distributing Yurt Dışı & Gümrük votes + running D'Hondt)
 * - 81 Provinces (aggregating districts)
 * - National Summary (total votes, alliances, threshold checks, 600 MP totals, closest races)
 */
export function runMultiLayerProjection(input: ProjectionEngineInput): ComputedElectionProjection {
  const {
    baseline,
    parties,
    alliances,
    swingMode,
    dhondtMode,
    thresholdPct,
    nationalTargetShares,
    nationalTargetTurnout,
    nationalVoterScaleFactor,
    abroadConfig,
    ilceOverrides,
    districtOverrides,
    provinceOverrides,
    abroadCountryOverrides = {},
    localBuffs = [],
    partyTurnoutMultipliers,
    provinceTurnoutMultipliers,
    jointListRules,
  } = input;
  const partyIds = parties.map((p) => p.id);

  const applyJoint2023Dealiasing =
    baseline.id === '2023_general' && isProjectionModifiedFromBaseline(input);
  const ilceBaseSharesById: Record<string, Record<string, number>> = {};

  // Pre-compute baseline aggregates per electoral district and per province so that
  // locked district/province overrides can swing their unlocked child ilçeler accurately.
  const districtBaseAgg: Record<
    string,
    { validVotes: number; partyVotes: Record<string, number>; shares: Record<string, number>; turnout: number; voters: number }
  > = {};
  const provinceBaseAgg: Record<
    string,
    { validVotes: number; partyVotes: Record<string, number>; shares: Record<string, number>; turnout: number; voters: number }
  > = {};

  for (const ilce of baseline.ilceler) {
    const ilceBaseShares = getEffectiveIlceBaseShares(ilce, applyJoint2023Dealiasing);
    ilceBaseSharesById[ilce.id] = ilceBaseShares;

    const cast = Math.round(ilce.registeredVoters * (ilce.turnout / 100));
    const valid = Math.round(cast * (ilce.validVoteRatio / 100));

    if (!districtBaseAgg[ilce.districtId]) {
      districtBaseAgg[ilce.districtId] = { validVotes: 0, partyVotes: {}, shares: {}, turnout: 0, voters: 0 };
    }
    if (!provinceBaseAgg[ilce.ilId]) {
      provinceBaseAgg[ilce.ilId] = { validVotes: 0, partyVotes: {}, shares: {}, turnout: 0, voters: 0 };
    }

    districtBaseAgg[ilce.districtId].voters += ilce.registeredVoters;
    districtBaseAgg[ilce.districtId].turnout += cast;
    districtBaseAgg[ilce.districtId].validVotes += valid;

    provinceBaseAgg[ilce.ilId].voters += ilce.registeredVoters;
    provinceBaseAgg[ilce.ilId].turnout += cast;
    provinceBaseAgg[ilce.ilId].validVotes += valid;

    for (const p of parties) {
      const pv = Math.round(valid * ((ilceBaseShares[p.id] ?? 0) / 100));
      districtBaseAgg[ilce.districtId].partyVotes[p.id] =
        (districtBaseAgg[ilce.districtId].partyVotes[p.id] || 0) + pv;
      provinceBaseAgg[ilce.ilId].partyVotes[p.id] =
        (provinceBaseAgg[ilce.ilId].partyVotes[p.id] || 0) + pv;
    }
  }

  for (const dAgg of Object.values(districtBaseAgg)) {
    dAgg.turnout = dAgg.voters > 0 ? (dAgg.turnout / dAgg.voters) * 100 : 85;
    for (const p of parties) {
      dAgg.shares[p.id] = dAgg.validVotes > 0 ? ((dAgg.partyVotes[p.id] || 0) / dAgg.validVotes) * 100 : 0;
    }
  }

  for (const pAgg of Object.values(provinceBaseAgg)) {
    pAgg.turnout = pAgg.voters > 0 ? (pAgg.turnout / pAgg.voters) * 100 : 85;
    for (const p of parties) {
      pAgg.shares[p.id] = pAgg.validVotes > 0 ? ((pAgg.partyVotes[p.id] || 0) / pAgg.validVotes) * 100 : 0;
    }
  }

  const turnoutSwingDelta = nationalTargetTurnout - baseline.nationalBaseTurnout;
  const normalizedNationalTarget = normalizeSharesTo100(nationalTargetShares, parties);

  // Step 1: Resolve all 973 İlçeler
  const ilceResults: Record<string, ComputedIlceResult> = {};
  const districtDomesticValidVotes: Record<string, number> = {};
  let domesticRegisteredVoters = 0;
  let domesticVotesCast = 0;
  let domesticValidVotes = 0;
  const domesticPartyVotes: Record<string, number> = {};
  for (const p of parties) domesticPartyVotes[p.id] = 0;

  const minorOutlierCap = baseline.id === 'blended_90_10' ? 7.0 : undefined;

  for (const ilce of baseline.ilceler) {
    const ilceBaseShares = ilceBaseSharesById[ilce.id] || ilce.partyShares;
    const ilceOvr = ilceOverrides[ilce.id];
    const distOvr = districtOverrides[ilce.districtId];
    const provOvr = provinceOverrides[ilce.ilId];

    let effectiveVoters = Math.round(ilce.registeredVoters * nationalVoterScaleFactor);
    let effectiveTurnout = Math.min(100, Math.max(0, ilce.turnout + turnoutSwingDelta));
    let effectiveShares: Record<string, number>;
    let isLocked = false;

    if (ilceOvr && ilceOvr.isLocked) {
      // Layer 3 Lock: İlçe directly locked by user
      isLocked = true;
      if (ilceOvr.registeredVoters !== undefined) effectiveVoters = Math.max(0, Math.round(ilceOvr.registeredVoters));
      if (ilceOvr.turnout !== undefined) effectiveTurnout = Math.min(100, Math.max(0, ilceOvr.turnout));
      effectiveShares = ilceOvr.partyShares
        ? normalizeSharesTo100(ilceOvr.partyShares, parties)
        : normalizeSharesTo100(ilceBaseShares, parties);
    } else if (distOvr && distOvr.isLocked) {
      // Layer 2a Lock: Parent Electoral District locked by user -> swing unlocked child ilçeler
      isLocked = true;
      const dBase = districtBaseAgg[ilce.districtId];
      if (distOvr.registeredVoters !== undefined && dBase && dBase.voters > 0) {
        effectiveVoters = Math.round(ilce.registeredVoters * (distOvr.registeredVoters / dBase.voters));
      }
      if (distOvr.turnout !== undefined && dBase) {
        const dTurnoutDelta = distOvr.turnout - dBase.turnout;
        effectiveTurnout = Math.min(100, Math.max(0, ilce.turnout + dTurnoutDelta));
      }
      const targetDistShares = distOvr.partyShares
        ? normalizeSharesTo100(distOvr.partyShares, parties)
        : dBase.shares;
      effectiveShares = swingShareVector(
        ilceBaseShares,
        dBase ? dBase.shares : baseline.nationalBaseShares,
        targetDistShares,
        swingMode,
        parties,
        minorOutlierCap
      );
    } else if (provOvr && provOvr.isLocked) {
      // Layer 2b Lock: Parent Province (İl) locked by user -> swing unlocked child ilçeler
      isLocked = true;
      const pBase = provinceBaseAgg[ilce.ilId];
      if (provOvr.registeredVoters !== undefined && pBase && pBase.voters > 0) {
        effectiveVoters = Math.round(ilce.registeredVoters * (provOvr.registeredVoters / pBase.voters));
      }
      if (provOvr.turnout !== undefined && pBase) {
        const pTurnoutDelta = provOvr.turnout - pBase.turnout;
        effectiveTurnout = Math.min(100, Math.max(0, ilce.turnout + pTurnoutDelta));
      }
      const targetProvShares = provOvr.partyShares
        ? normalizeSharesTo100(provOvr.partyShares, parties)
        : pBase.shares;
      effectiveShares = swingShareVector(
        ilceBaseShares,
        pBase ? pBase.shares : baseline.nationalBaseShares,
        targetProvShares,
        swingMode,
        parties,
        minorOutlierCap
      );
    } else {
      // Layer 1 (Unlocked): Swing from National Baseline to National Target
      effectiveShares = swingShareVector(
        ilceBaseShares,
        baseline.nationalBaseShares,
        normalizedNationalTarget,
        swingMode,
        parties,
        minorOutlierCap
      );
    }

    if (!isLocked && localBuffs.length > 0) {
      const matchingBuffs = resolveMatchingBuffs(
        localBuffs,
        'parliamentary',
        ilce.ilId,
        ilce.districtId,
        ilce.id
      );
      if (matchingBuffs.length > 0) {
        effectiveShares = applyLocalBuffsToShares(effectiveShares, matchingBuffs, partyIds);
      }
    }

    const provMults = provinceTurnoutMultipliers?.[ilce.ilId];
    if (partyTurnoutMultipliers || provMults) {
      const mergedMults = provMults
        ? { ...(partyTurnoutMultipliers || {}), ...provMults }
        : partyTurnoutMultipliers;
      const adjusted = applyTurnoutMultipliers(
        effectiveShares,
        effectiveTurnout,
        mergedMults,
        partyIds
      );
      effectiveShares = adjusted.shares;
      effectiveTurnout = adjusted.turnout;
    }

    const totalVotesCast = Math.round(effectiveVoters * (effectiveTurnout / 100));
    const validVotes = Math.round(totalVotesCast * (ilce.validVoteRatio / 100));

    const partyVotes: Record<string, number> = {};
    let leadingPartyId = parties[0]?.id || '';
    let runnerUpPartyId = parties[1]?.id || '';
    let maxVotes = -1;
    let secondVotes = -1;

    for (const p of parties) {
      const share = effectiveShares[p.id] ?? 0;
      const votes = Math.round(validVotes * (share / 100));
      partyVotes[p.id] = votes;
      domesticPartyVotes[p.id] = (domesticPartyVotes[p.id] || 0) + votes;

      if (!p.isOther) {
        if (votes > maxVotes) {
          secondVotes = maxVotes;
          runnerUpPartyId = leadingPartyId;
          maxVotes = votes;
          leadingPartyId = p.id;
        } else if (votes > secondVotes) {
          secondVotes = votes;
          runnerUpPartyId = p.id;
        }
      }
    }

    const marginVotes = Math.max(0, maxVotes - Math.max(0, secondVotes));
    const marginPct = validVotes > 0 ? (marginVotes / validVotes) * 100 : 0;

    ilceResults[ilce.id] = {
      id: ilce.id,
      name: ilce.name,
      ilId: ilce.ilId,
      districtId: ilce.districtId,
      registeredVoters: effectiveVoters,
      turnout: effectiveTurnout,
      totalVotesCast,
      validVotes,
      partyVotes,
      partyShares: effectiveShares,
      leadingPartyId,
      runnerUpPartyId,
      marginVotes,
      marginPct,
      isLocked,
    };

    domesticRegisteredVoters += effectiveVoters;
    domesticVotesCast += totalVotesCast;
    domesticValidVotes += validVotes;
    districtDomesticValidVotes[ilce.districtId] =
      (districtDomesticValidVotes[ilce.districtId] || 0) + validVotes;
  }

  // Step 2: Compute Yurt Dışı & Gümrük votes and distribute across the 87 electoral districts
  const abroadResult = computeAndDistributeAbroadVotes(
    abroadConfig,
    baseline.abroad.partyShares,
    baseline.nationalBaseShares,
    normalizedNationalTarget,
    swingMode,
    districtDomesticValidVotes,
    domesticValidVotes,
    parties,
    abroadCountryOverrides
  );

  const totalRegisteredVoters = domesticRegisteredVoters + abroadResult.abroadRegisteredVoters;
  const totalValidVotes = domesticValidVotes + abroadResult.abroadValidVotes;
  const domesticTurnout =
    domesticRegisteredVoters > 0 ? (domesticVotesCast / domesticRegisteredVoters) * 100 : 0;
  const totalTurnout =
    totalRegisteredVoters > 0
      ? ((domesticVotesCast + abroadResult.abroadValidVotes) / totalRegisteredVoters) * 100
      : 0;

  // Step 3: Aggregate National Totals & Evaluate National Threshold (Baraj)
  const nationalPartyVotes: Record<string, number> = {};
  const nationalPartyShares: Record<string, number> = {};
  const domesticPartyShares: Record<string, number> = {};

  for (const p of parties) {
    const domV = domesticPartyVotes[p.id] || 0;
    const abrV = abroadResult.abroadPartyVotes[p.id] || 0;
    const totV = domV + abrV;
    nationalPartyVotes[p.id] = totV;
    nationalPartyShares[p.id] = totalValidVotes > 0 ? (totV / totalValidVotes) * 100 : 0;
    domesticPartyShares[p.id] = domesticValidVotes > 0 ? (domV / domesticValidVotes) * 100 : 0;
  }

  const thresholdEval = evaluateNationalThreshold(
    nationalPartyVotes,
    totalValidVotes,
    parties,
    thresholdPct
  );

  // Step 4: Aggregate 87 Electoral Districts & Allocate 600 MPs via D'Hondt
  const districtResults: Record<string, ComputedDistrictResult> = {};
  const partyTotalSeats: Record<string, number> = {};
  const allianceTotalSeats: Record<string, number> = {};
  for (const p of parties) partyTotalSeats[p.id] = 0;
  for (const a of alliances) allianceTotalSeats[a.id] = 0;
  let totalSeatsAllocated = 0;

  // Group ilceResults by districtId
  const ilcesByDistrict: Record<string, ComputedIlceResult[]> = {};
  for (const ilceRes of Object.values(ilceResults)) {
    if (!ilcesByDistrict[ilceRes.districtId]) ilcesByDistrict[ilceRes.districtId] = [];
    ilcesByDistrict[ilceRes.districtId].push(ilceRes);
  }

  for (const distConfig of baseline.districts) {
    const dOvr = districtOverrides[distConfig.id];
    const pOvr = provinceOverrides[distConfig.ilId];
    const mpCount = dOvr?.mpCount !== undefined ? dOvr.mpCount : distConfig.mpCount;
    const childIlces = ilcesByDistrict[distConfig.id] || [];

    let dRegVoters = 0;
    let dVotesCast = 0;
    let dDomValidVotes = 0;
    const dDomPartyVotes: Record<string, number> = {};
    for (const p of parties) dDomPartyVotes[p.id] = 0;

    for (const c of childIlces) {
      dRegVoters += c.registeredVoters;
      dVotesCast += c.totalVotesCast;
      dDomValidVotes += c.validVotes;
      for (const p of parties) {
        dDomPartyVotes[p.id] += c.partyVotes[p.id] || 0;
      }
    }

    const dAbroadPartyVotes = abroadResult.districtAbroadPartyVotes[distConfig.id] || {};
    const dAbroadTotal = abroadResult.districtAbroadTotalVotes[distConfig.id] || 0;
    const dTotalValidVotes = dDomValidVotes + dAbroadTotal;

    const dTotalPartyVotes: Record<string, number> = {};
    const dPartyShares: Record<string, number> = {};
    const dDomPartyShares: Record<string, number> = {};

    let leadingPartyId = parties[0]?.id || '';
    let runnerUpPartyId = parties[1]?.id || '';
    let maxV = -1;
    let secondV = -1;

    for (const p of parties) {
      const totV = (dDomPartyVotes[p.id] || 0) + (dAbroadPartyVotes[p.id] || 0);
      dTotalPartyVotes[p.id] = totV;
      dPartyShares[p.id] = dTotalValidVotes > 0 ? (totV / dTotalValidVotes) * 100 : 0;
      dDomPartyShares[p.id] = dDomValidVotes > 0 ? ((dDomPartyVotes[p.id] || 0) / dDomValidVotes) * 100 : 0;

      if (!p.isOther) {
        if (totV > maxV) {
          secondV = maxV;
          runnerUpPartyId = leadingPartyId;
          maxV = totV;
          leadingPartyId = p.id;
        } else if (totV > secondV) {
          secondV = totV;
          runnerUpPartyId = p.id;
        }
      }
    }

    const marginPct =
      dTotalValidVotes > 0 ? (Math.max(0, maxV - Math.max(0, secondV)) / dTotalValidVotes) * 100 : 0;

    const dhondtOut = allocateDistrictSeatsDHondt({
      districtId: distConfig.id,
      mpCount,
      partyVotes: dTotalPartyVotes,
      eligiblePartyIds: thresholdEval.eligiblePartyIds,
      parties,
      dhondtMode,
      jointListRules,
    });

    for (const p of parties) {
      const seatsWon = dhondtOut.partySeats[p.id] || 0;
      partyTotalSeats[p.id] = (partyTotalSeats[p.id] || 0) + seatsWon;
      totalSeatsAllocated += seatsWon;
      if (p.allianceId) {
        allianceTotalSeats[p.allianceId] = (allianceTotalSeats[p.allianceId] || 0) + seatsWon;
      }
    }

    const pctToFlipLastSeat =
      dTotalValidVotes > 0 ? (dhondtOut.votesToFlipLastSeat / dTotalValidVotes) * 100 : 0;

    districtResults[distConfig.id] = {
      id: distConfig.id,
      ilId: distConfig.ilId,
      name: distConfig.name,
      mpCount,
      registeredVoters: dRegVoters,
      turnout: dRegVoters > 0 ? (dVotesCast / dRegVoters) * 100 : 0,
      domesticValidVotes: dDomValidVotes,
      abroadValidVotesAdded: dAbroadTotal,
      totalValidVotes: dTotalValidVotes,
      domesticPartyVotes: dDomPartyVotes,
      abroadPartyVotes: dAbroadPartyVotes,
      totalPartyVotes: dTotalPartyVotes,
      effectivePartyVotes: dhondtOut.effectivePartyVotes,
      partyShares: dPartyShares,
      domesticPartyShares: dDomPartyShares,
      partySeats: dhondtOut.partySeats,
      leadingPartyId,
      runnerUpPartyId,
      marginPct,
      lastSeatWinnerPartyId: dhondtOut.lastSeatWinnerPartyId,
      lastSeatQuotient: dhondtOut.lastSeatQuotient,
      closestChallengerPartyId: dhondtOut.closestChallengerPartyId,
      closestChallengerQuotient: dhondtOut.closestChallengerQuotient,
      votesToFlipLastSeat: dhondtOut.votesToFlipLastSeat,
      pctToFlipLastSeat,
      isLocked: Boolean(dOvr?.isLocked || pOvr?.isLocked),
    };
  }

  // Step 5: Aggregate 81 Provinces
  const provinceResults: Record<string, ComputedProvinceResult> = {};
  for (const prov of baseline.provinces) {
    let pRegVoters = 0;
    let pDomValid = 0;
    let pAbrValid = 0;
    let pTotValid = 0;
    let pMpCount = 0;
    let weightedTurnoutVotes = 0;
    const pPartyVotes: Record<string, number> = {};
    const pPartySeats: Record<string, number> = {};
    for (const p of parties) {
      pPartyVotes[p.id] = 0;
      pPartySeats[p.id] = 0;
    }

    for (const dId of prov.districtIds) {
      const dRes = districtResults[dId];
      if (!dRes) continue;
      pRegVoters += dRes.registeredVoters;
      weightedTurnoutVotes += Math.round(dRes.registeredVoters * (dRes.turnout / 100));
      pDomValid += dRes.domesticValidVotes;
      pAbrValid += dRes.abroadValidVotesAdded;
      pTotValid += dRes.totalValidVotes;
      pMpCount += dRes.mpCount;
      for (const p of parties) {
        pPartyVotes[p.id] += dRes.totalPartyVotes[p.id] || 0;
        pPartySeats[p.id] += dRes.partySeats[p.id] || 0;
      }
    }

    const pPartyShares: Record<string, number> = {};
    let leadingPartyId = parties[0]?.id || '';
    let runnerUpPartyId = parties[1]?.id || '';
    let maxV = -1;
    let secondV = -1;

    for (const p of parties) {
      const v = pPartyVotes[p.id] || 0;
      pPartyShares[p.id] = pTotValid > 0 ? (v / pTotValid) * 100 : 0;
      if (!p.isOther) {
        if (v > maxV) {
          secondV = maxV;
          runnerUpPartyId = leadingPartyId;
          maxV = v;
          leadingPartyId = p.id;
        } else if (v > secondV) {
          secondV = v;
          runnerUpPartyId = p.id;
        }
      }
    }

    const marginPct = pTotValid > 0 ? (Math.max(0, maxV - Math.max(0, secondV)) / pTotValid) * 100 : 0;

    provinceResults[prov.id] = {
      id: prov.id,
      plateCode: prov.plateCode,
      name: prov.name,
      mpCount: pMpCount,
      registeredVoters: pRegVoters,
      turnout: pRegVoters > 0 ? (weightedTurnoutVotes / pRegVoters) * 100 : 0,
      domesticValidVotes: pDomValid,
      abroadValidVotesAdded: pAbrValid,
      totalValidVotes: pTotValid,
      partyVotes: pPartyVotes,
      partyShares: pPartyShares,
      partySeats: pPartySeats,
      leadingPartyId,
      runnerUpPartyId,
      marginPct,
      districtIds: prov.districtIds,
    };
  }

  // Step 6: Sort Closest Races across the 87 districts by votesToFlipLastSeat ascending
  const closestDistrictRaces = Object.values(districtResults)
    .filter((d) => d.votesToFlipLastSeat > 0 && d.closestChallengerPartyId !== '')
    .sort((a, b) => a.votesToFlipLastSeat - b.votesToFlipLastSeat);

  return {
    domesticRegisteredVoters,
    domesticVotesCast,
    domesticValidVotes,
    domesticTurnout,
    abroadRegisteredVoters: abroadResult.abroadRegisteredVoters,
    abroadValidVotes: abroadResult.abroadValidVotes,
    totalRegisteredVoters,
    totalValidVotes,
    totalTurnout,
    nationalPartyVotes,
    nationalPartyShares,
    domesticPartyVotes,
    domesticPartyShares,
    abroadPartyVotes: abroadResult.abroadPartyVotes,
    abroadPartyShares: abroadResult.abroadPartyShares,
    allianceVotes: thresholdEval.allianceVotes,
    allianceShares: thresholdEval.allianceShares,
    alliancePassedThreshold: thresholdEval.alliancePassed,
    partyPassedThreshold: thresholdEval.partyPassed,
    partyTotalSeats,
    allianceTotalSeats,
    totalSeatsAllocated,
    ilceResults,
    districtResults,
    provinceResults,
    abroadCountryResults: abroadResult.abroadCountryResults,
    closestDistrictRaces,
  };
}
