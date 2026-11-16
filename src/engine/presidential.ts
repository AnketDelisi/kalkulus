import { ABROAD_COUNTRIES_2023 } from '../data/abroadCountries';
import { getDefaultTransferForCandidate } from '../data/presidentialDefaults';
import {
  AbroadVoteConfig,
  BaselineDataset,
  ComputedPresidentialProjection,
  LocalBuffRule,
  PartyConfig,
  PresidentialCandidateConfig,
  PresidentialCandidateSummary,
  PresidentialRound2Dynamics,
  PresidentialRoundResult,
  PresidentialTransferSplit,
  PresidentialUnitResult,
  SwingMode,
} from '../types/election';
import { allocateVotesLargestRemainder } from './abroad';
import { applyLocalBuffsToShares, resolveMatchingBuffs } from './buffs';
import { IlceOverride, ProvinceOverride, swingShareVector } from './swing';

export interface PresidentialEngineInput {
  baseline: BaselineDataset;
  parties: PartyConfig[];
  candidates: PresidentialCandidateConfig[];
  swingMode: SwingMode;
  candidateTargetShares: Record<string, number>;
  targetTurnout: number;
  voterScaleFactor: number;
  abroadConfig: AbroadVoteConfig;
  provinceOverrides: Record<string, ProvinceOverride>;
  ilceOverrides: Record<string, IlceOverride>;
  abroadCountryOverrides?: Record<string, ProvinceOverride>;
  localBuffs?: LocalBuffRule[];
  transferMatrix: Record<string, PresidentialTransferSplit>;
  /** Round 2 finalist mobilization, geographic transfer tilt, and R2 abroad turnout */
  round2Dynamics?: PresidentialRound2Dynamics;
  /** Reference party weights used only when splitting a proxy-backed party (e.g. YENI & CHP split across different candidates) */
  referencePartyWeights?: Record<string, number>;
}

function toCandidatePseudoParties(candidates: PresidentialCandidateConfig[]): PartyConfig[] {
  return candidates.map((c) => ({
    id: c.id,
    shortName: c.shortName,
    fullName: c.name,
    color: c.color,
    allianceId: null,
    isOther: c.isOther,
  }));
}

function normalizeCandidateVector(
  shares: Record<string, number>,
  candidates: PresidentialCandidateConfig[]
): Record<string, number> {
  const out: Record<string, number> = {};
  let sum = 0;
  for (const c of candidates) {
    const val = Math.max(0, Number(shares[c.id] ?? 0));
    out[c.id] = val;
    sum += val;
  }
  if (sum <= 0) {
    const eq = candidates.length > 0 ? 100 / candidates.length : 0;
    for (const c of candidates) out[c.id] = eq;
    return out;
  }
  for (const c of candidates) {
    out[c.id] = (out[c.id] / sum) * 100;
  }
  return out;
}

/**
 * Derive a candidate's baseline shares in a geographic unit (ilçe or abroad)
 * by resolving its backing parties' shares, including proxy-backed parties like YENİ -> CHP
 * proportionally split if host & proxy sit on different candidates.
 */
function deriveCandidateBaseSharesForUnit(
  unitPartyShares: Record<string, number>,
  candidates: PresidentialCandidateConfig[],
  partyById: Record<string, PartyConfig>,
  referencePartyWeights: Record<string, number>
): Record<string, number> {
  // First determine how each baseline party is claimed (directly or via proxyWeights)
  const partyClaims: Record<string, Array<{ candidateId: string; weight: number }>> = {};

  for (const c of candidates) {
    for (const pid of c.backingPartyIds) {
      const p = partyById[pid];
      const rawVal = unitPartyShares[pid] ?? 0;
      if (rawVal > 0.05 || !p?.proxyWeights) {
        if (!partyClaims[pid]) partyClaims[pid] = [];
        partyClaims[pid].push({ candidateId: c.id, weight: Math.max(0.1, referencePartyWeights[pid] ?? 1) });
      } else {
        for (const [proxyPid, pw] of Object.entries(p.proxyWeights)) {
          if (!partyClaims[proxyPid]) partyClaims[proxyPid] = [];
          const w = Math.max(0.1, referencePartyWeights[pid] ?? 1) * pw;
          partyClaims[proxyPid].push({ candidateId: c.id, weight: w });
        }
      }
    }
  }

  const out: Record<string, number> = {};
  for (const c of candidates) out[c.id] = 0;

  for (const [pid, share] of Object.entries(unitPartyShares)) {
    if (share <= 0) continue;
    const claims = partyClaims[pid];
    if (!claims || claims.length === 0) {
      const otherCand = candidates.find((c) => c.isOther) || candidates[candidates.length - 1];
      if (otherCand) out[otherCand.id] += share;
      continue;
    }
    const totalW = claims.reduce((s, cl) => s + cl.weight, 0);
    for (const cl of claims) {
      out[cl.candidateId] += totalW > 0 ? share * (cl.weight / totalW) : share / claims.length;
    }
  }

  return normalizeCandidateVector(out, candidates);
}

function resolveLeaderAndRunnerUp(
  votes: Record<string, number>,
  totalValidVotes: number,
  candidates: PresidentialCandidateConfig[]
): {
  leadingCandidateId: string;
  runnerUpCandidateId: string;
  marginVotes: number;
  marginPct: number;
} {
  const sorted = [...candidates]
    .map((c) => ({ id: c.id, v: votes[c.id] ?? 0 }))
    .sort((a, b) => b.v - a.v);

  const first = sorted[0] || { id: '', v: 0 };
  const second = sorted[1] || { id: '', v: 0 };
  const marginVotes = Math.max(0, first.v - second.v);
  const marginPct = totalValidVotes > 0 ? (marginVotes / totalValidVotes) * 100 : 0;
  return {
    leadingCandidateId: first.id,
    runnerUpCandidateId: second.id,
    marginVotes,
    marginPct,
  };
}

export function computePresidentialProjection(
  input: PresidentialEngineInput
): ComputedPresidentialProjection {
  const {
    baseline,
    parties,
    candidates,
    swingMode,
    candidateTargetShares,
    targetTurnout,
    voterScaleFactor,
    abroadConfig,
    provinceOverrides,
    ilceOverrides,
    abroadCountryOverrides = {},
    localBuffs = [],
    transferMatrix,
    referencePartyWeights = {},
  } = input;

  const partyById: Record<string, PartyConfig> = {};
  for (const p of parties) partyById[p.id] = p;

  const pseudoParties = toCandidatePseudoParties(candidates);
  const normalizedTarget = normalizeCandidateVector(candidateTargetShares, candidates);
  const turnoutDelta = targetTurnout - baseline.nationalBaseTurnout;

  // 1. Pre-compute candidate baseline shares per ilçe, province, abroad, and national aggregate
  const ilceBaseCandShares: Record<string, Record<string, number>> = {};
  const provBaseAgg: Record<
    string,
    { validVotes: number; candVotes: Record<string, number>; shares: Record<string, number> }
  > = {};

  let baseTotalValid = 0;
  const baseCandVotes: Record<string, number> = {};
  for (const c of candidates) baseCandVotes[c.id] = 0;

  for (const ilce of baseline.ilceler) {
    const candShares = deriveCandidateBaseSharesForUnit(
      ilce.partyShares,
      candidates,
      partyById,
      referencePartyWeights
    );
    ilceBaseCandShares[ilce.id] = candShares;

    const cast = Math.round(ilce.registeredVoters * (ilce.turnout / 100));
    const valid = Math.round(cast * (ilce.validVoteRatio / 100));
    baseTotalValid += valid;

    if (!provBaseAgg[ilce.ilId]) {
      provBaseAgg[ilce.ilId] = { validVotes: 0, candVotes: {}, shares: {} };
    }
    provBaseAgg[ilce.ilId].validVotes += valid;

    for (const c of candidates) {
      const v = valid * ((candShares[c.id] ?? 0) / 100);
      baseCandVotes[c.id] += v;
      provBaseAgg[ilce.ilId].candVotes[c.id] = (provBaseAgg[ilce.ilId].candVotes[c.id] || 0) + v;
    }
  }

  for (const pAgg of Object.values(provBaseAgg)) {
    for (const c of candidates) {
      pAgg.shares[c.id] =
        pAgg.validVotes > 0 ? ((pAgg.candVotes[c.id] || 0) / pAgg.validVotes) * 100 : 0;
    }
  }

  const abroadBaseCandShares = deriveCandidateBaseSharesForUnit(
    baseline.abroad.partyShares,
    candidates,
    partyById,
    referencePartyWeights
  );

  if (baseline.abroad.enabled && baseline.abroad.registeredVoters > 0) {
    const abValid =
      baseline.abroad.registeredVoters *
      (baseline.abroad.turnout / 100) *
      (baseline.abroad.validVoteRatio / 100);
    baseTotalValid += abValid;
    for (const c of candidates) {
      baseCandVotes[c.id] += abValid * ((abroadBaseCandShares[c.id] ?? 0) / 100);
    }
  }

  const nationalBaseCandShares: Record<string, number> = {};
  for (const c of candidates) {
    nationalBaseCandShares[c.id] =
      baseTotalValid > 0 ? (baseCandVotes[c.id] / baseTotalValid) * 100 : 100 / candidates.length;
  }

  // Check if any unit locks exist
  const hasLocks =
    Object.values(ilceOverrides).some((o) => o?.isLocked) ||
    Object.values(provinceOverrides).some((o) => o?.isLocked) ||
    Object.values(abroadCountryOverrides).some((o) => o?.isLocked);

  // Calibrate virtual swing targets on unlocked runs (3 passes) so national shares closely match user targets
  let effectiveSwingTarget = { ...normalizedTarget };
  const abroadTurnoutScale = abroadConfig.turnout / 100;
  const abroadValid = abroadConfig.enabled
    ? Math.round(
        abroadConfig.registeredVoters * abroadTurnoutScale * (abroadConfig.validVoteRatio / 100)
      )
    : 0;

  if (!hasLocks) {
    for (let pass = 0; pass < 3; pass++) {
      let simTotalValid = 0;
      const simVotes: Record<string, number> = {};
      for (const c of candidates) simVotes[c.id] = 0;

      for (const ilce of baseline.ilceler) {
        const voters = Math.round(ilce.registeredVoters * voterScaleFactor);
        const turnout = Math.min(100, Math.max(0, ilce.turnout + turnoutDelta));
        const valid = Math.round(voters * (turnout / 100) * (ilce.validVoteRatio / 100));
        const swung = swingShareVector(
          ilceBaseCandShares[ilce.id],
          nationalBaseCandShares,
          effectiveSwingTarget,
          swingMode,
          pseudoParties
        );
        simTotalValid += valid;
        for (const c of candidates) {
          simVotes[c.id] += valid * ((swung[c.id] ?? 0) / 100);
        }
      }

      if (abroadValid > 0) {
        const abSwung = abroadConfig.syncWithNationalSwing
          ? swingShareVector(
              abroadBaseCandShares,
              nationalBaseCandShares,
              effectiveSwingTarget,
              swingMode,
              pseudoParties
            )
          : deriveCandidateBaseSharesForUnit(
              abroadConfig.partyShares,
              candidates,
              partyById,
              referencePartyWeights
            );
        simTotalValid += abroadValid;
        for (const c of candidates) {
          simVotes[c.id] += abroadValid * ((abSwung[c.id] ?? 0) / 100);
        }
      }

      if (simTotalValid <= 0) break;
      const nextCal: Record<string, number> = {};
      for (const c of candidates) {
        const actualPct = (simVotes[c.id] / simTotalValid) * 100;
        const desiredPct = normalizedTarget[c.id] ?? 0;
        if (desiredPct <= 0.001) {
          nextCal[c.id] = 0;
        } else if (actualPct > 0.01) {
          nextCal[c.id] = Math.max(0, effectiveSwingTarget[c.id] * (desiredPct / actualPct));
        } else {
          nextCal[c.id] = desiredPct;
        }
      }
      effectiveSwingTarget = normalizeCandidateVector(nextCal, candidates);
    }
  }

  // 2. Build Round 1 unit results (973 ilçeler -> 81 provinces -> abroad -> national)
  const r1IlceResults: Record<string, PresidentialUnitResult> = {};
  const r1ProvinceAccum: Record<
    string,
    {
      registeredVoters: number;
      castVotes: number;
      validVotes: number;
      candVotes: Record<string, number>;
      isLocked: boolean;
    }
  > = {};

  for (const prov of baseline.provinces) {
    r1ProvinceAccum[prov.id] = {
      registeredVoters: 0,
      castVotes: 0,
      validVotes: 0,
      candVotes: {},
      isLocked: Boolean(provinceOverrides[prov.id]?.isLocked),
    };
    for (const c of candidates) r1ProvinceAccum[prov.id].candVotes[c.id] = 0;
  }

  let r1DomesticValid = 0;
  let r1DomesticReg = 0;
  let r1DomesticCast = 0;
  const r1DomesticCandVotes: Record<string, number> = {};
  for (const c of candidates) r1DomesticCandVotes[c.id] = 0;

  for (const ilce of baseline.ilceler) {
    const ilceOvr = ilceOverrides[ilce.id];
    const provOvr = provinceOverrides[ilce.ilId];
    const ilceBase = ilceBaseCandShares[ilce.id];

    let voters = Math.round(ilce.registeredVoters * voterScaleFactor);
    let turnout = Math.min(100, Math.max(0, ilce.turnout + turnoutDelta));
    let shares: Record<string, number>;
    let isLocked = false;

    if (ilceOvr?.isLocked) {
      isLocked = true;
      if (ilceOvr.registeredVoters !== undefined) voters = Math.max(0, ilceOvr.registeredVoters);
      if (ilceOvr.turnout !== undefined) turnout = Math.min(100, Math.max(0, ilceOvr.turnout));
      shares = ilceOvr.partyShares
        ? normalizeCandidateVector(ilceOvr.partyShares, candidates)
        : swingShareVector(ilceBase, nationalBaseCandShares, effectiveSwingTarget, swingMode, pseudoParties);
    } else if (provOvr?.isLocked) {
      if (provOvr.turnout !== undefined) turnout = Math.min(100, Math.max(0, provOvr.turnout));
      if (provOvr.partyShares) {
        const pAgg = provBaseAgg[ilce.ilId];
        shares = swingShareVector(
          ilceBase,
          pAgg ? pAgg.shares : nationalBaseCandShares,
          normalizeCandidateVector(provOvr.partyShares, candidates),
          swingMode,
          pseudoParties
        );
      } else {
        shares = swingShareVector(
          ilceBase,
          nationalBaseCandShares,
          effectiveSwingTarget,
          swingMode,
          pseudoParties
        );
      }
    } else {
      shares = swingShareVector(
        ilceBase,
        nationalBaseCandShares,
        effectiveSwingTarget,
        swingMode,
        pseudoParties
      );
    }

    if (!isLocked && localBuffs.length > 0) {
      const matchingBuffs = resolveMatchingBuffs(
        localBuffs,
        'presidential',
        ilce.ilId,
        ilce.districtId,
        ilce.id
      );
      if (matchingBuffs.length > 0) {
        shares = applyLocalBuffsToShares(
          shares,
          matchingBuffs,
          candidates.map((c) => c.id)
        );
      }
    }

    const cast = Math.round(voters * (turnout / 100));
    const valid = Math.round(cast * (ilce.validVoteRatio / 100));
    const candVotes: Record<string, number> = {};
    for (const c of candidates) {
      const v = Math.round(valid * ((shares[c.id] ?? 0) / 100));
      candVotes[c.id] = v;
      r1DomesticCandVotes[c.id] += v;
      r1ProvinceAccum[ilce.ilId].candVotes[c.id] += v;
    }

    r1DomesticReg += voters;
    r1DomesticCast += cast;
    r1DomesticValid += valid;
    r1ProvinceAccum[ilce.ilId].registeredVoters += voters;
    r1ProvinceAccum[ilce.ilId].castVotes += cast;
    r1ProvinceAccum[ilce.ilId].validVotes += valid;

    const { leadingCandidateId, runnerUpCandidateId, marginVotes, marginPct } =
      resolveLeaderAndRunnerUp(candVotes, valid, candidates);

    r1IlceResults[ilce.id] = {
      id: ilce.id,
      name: ilce.name,
      ilId: ilce.ilId,
      registeredVoters: voters,
      turnout,
      validVotes: valid,
      candidateVotes: candVotes,
      candidateShares: shares,
      leadingCandidateId,
      runnerUpCandidateId,
      marginVotes,
      marginPct,
      isLocked,
    };
  }

  // Round 1 Abroad Countries -> Aggregate Abroad Rollup
  const r1AbroadCountryResults: Record<string, PresidentialUnitResult> = {};
  const r1AbroadCandVotes: Record<string, number> = {};
  for (const c of candidates) r1AbroadCandVotes[c.id] = 0;

  const candIds = candidates.map((c) => c.id);
  const manualAbroadCandShares = !abroadConfig.syncWithNationalSwing
    ? deriveCandidateBaseSharesForUnit(
        abroadConfig.partyShares,
        candidates,
        partyById,
        referencePartyWeights
      )
    : {};

  const baseCountriesValidSum = ABROAD_COUNTRIES_2023.reduce((s, c) => s + c.validVotes, 0);
  const baseCountriesRegSum = ABROAD_COUNTRIES_2023.reduce((s, c) => s + c.registeredVoters, 0);
  const abroadVolumeScale = baseCountriesValidSum > 0 ? abroadValid / baseCountriesValidSum : 1;
  const abroadRegScale =
    baseCountriesRegSum > 0 ? abroadConfig.registeredVoters / baseCountriesRegSum : 1;
  const hasAbroadCountryLocks = ABROAD_COUNTRIES_2023.some(
    (c) => abroadCountryOverrides[c.id]?.isLocked
  );

  const countryR1ValidMap: Record<string, number> = {};
  if (!abroadConfig.enabled || abroadValid <= 0) {
    for (const c of ABROAD_COUNTRIES_2023) countryR1ValidMap[c.id] = 0;
  } else if (!hasAbroadCountryLocks) {
    const weights: Record<string, number> = {};
    for (const c of ABROAD_COUNTRIES_2023) weights[c.id] = c.validVotes;
    Object.assign(
      countryR1ValidMap,
      allocateVotesLargestRemainder(
        abroadValid,
        weights,
        ABROAD_COUNTRIES_2023.map((c) => c.id)
      )
    );
  } else {
    for (const c of ABROAD_COUNTRIES_2023) {
      const ovr = abroadCountryOverrides[c.id];
      if (ovr?.isLocked) {
        if (c.isCustoms) {
          const tRatio = ovr.turnout !== undefined && c.turnout > 0 ? ovr.turnout / c.turnout : 1;
          countryR1ValidMap[c.id] = Math.max(0, Math.round(c.validVotes * abroadVolumeScale * tRatio));
        } else {
          const effReg = ovr.registeredVoters ?? Math.round(c.registeredVoters * abroadRegScale);
          const effTurnout =
            ovr.turnout ??
            c.turnout * Math.min(1.6, Math.max(0.3, abroadVolumeScale / Math.max(0.1, abroadRegScale)));
          countryR1ValidMap[c.id] = Math.max(
            0,
            Math.round(effReg * (effTurnout / 100) * (c.validVoteRatio / 100))
          );
        }
      } else {
        countryR1ValidMap[c.id] = Math.max(0, Math.round(c.validVotes * abroadVolumeScale));
      }
    }
  }

  let r1AbroadValidActual = 0;
  let abroadCountryRegDelta = 0;

  for (const country of ABROAD_COUNTRIES_2023) {
    const ovr = abroadCountryOverrides[country.id];
    const isLocked = Boolean(ovr?.isLocked);
    const countryBaseCand = deriveCandidateBaseSharesForUnit(
      country.partyShares,
      candidates,
      partyById,
      referencePartyWeights
    );
    const cShares =
      isLocked && ovr?.partyShares
        ? normalizeCandidateVector(ovr.partyShares, candidates)
        : abroadConfig.syncWithNationalSwing
        ? swingShareVector(
            countryBaseCand,
            nationalBaseCandShares,
            effectiveSwingTarget,
            swingMode,
            pseudoParties
          )
        : swingShareVector(
            countryBaseCand,
            abroadBaseCandShares,
            manualAbroadCandShares,
            swingMode,
            pseudoParties
          );

    const cValid = countryR1ValidMap[country.id] || 0;
    const cCandVotes = allocateVotesLargestRemainder(cValid, cShares, candIds);
    const effReg = country.isCustoms
      ? 0
      : isLocked && ovr?.registeredVoters !== undefined
      ? ovr.registeredVoters
      : Math.round(country.registeredVoters * abroadRegScale);

    if (!country.isCustoms && isLocked && ovr?.registeredVoters !== undefined) {
      abroadCountryRegDelta +=
        ovr.registeredVoters - Math.round(country.registeredVoters * abroadRegScale);
    }

    const effTurnout = !abroadConfig.enabled
      ? 0
      : country.isCustoms
      ? isLocked && ovr?.turnout !== undefined
        ? ovr.turnout
        : country.turnout * abroadVolumeScale
      : effReg > 0 && country.validVoteRatio > 0
      ? Math.min(100, ((cValid / (country.validVoteRatio / 100)) / effReg) * 100)
      : 0;

    const { leadingCandidateId, runnerUpCandidateId, marginVotes, marginPct } =
      resolveLeaderAndRunnerUp(cCandVotes, cValid, candidates);

    r1AbroadCountryResults[country.id] = {
      id: country.id,
      name: country.nameTr,
      registeredVoters: effReg,
      turnout: Number(effTurnout.toFixed(2)),
      validVotes: cValid,
      candidateVotes: cCandVotes,
      candidateShares: cShares,
      leadingCandidateId,
      runnerUpCandidateId,
      marginVotes,
      marginPct,
      isLocked,
    };

    r1AbroadValidActual += cValid;
    for (const c of candidates) {
      r1AbroadCandVotes[c.id] += cCandVotes[c.id] || 0;
    }
  }

  // Round 1 Provinces & National Summary
  const r1ProvinceResults: Record<string, PresidentialUnitResult> = {};
  const r1ProvincesWon: Record<string, number> = {};
  const r1IlcesWon: Record<string, number> = {};
  for (const c of candidates) {
    r1ProvincesWon[c.id] = 0;
    r1IlcesWon[c.id] = 0;
  }
  for (const ilceRes of Object.values(r1IlceResults)) {
    r1IlcesWon[ilceRes.leadingCandidateId] = (r1IlcesWon[ilceRes.leadingCandidateId] || 0) + 1;
  }

  for (const prov of baseline.provinces) {
    const acc = r1ProvinceAccum[prov.id];
    const shares: Record<string, number> = {};
    for (const c of candidates) {
      shares[c.id] = acc.validVotes > 0 ? (acc.candVotes[c.id] / acc.validVotes) * 100 : 0;
    }
    const { leadingCandidateId, runnerUpCandidateId, marginVotes, marginPct } =
      resolveLeaderAndRunnerUp(acc.candVotes, acc.validVotes, candidates);
    r1ProvincesWon[leadingCandidateId] = (r1ProvincesWon[leadingCandidateId] || 0) + 1;

    r1ProvinceResults[prov.id] = {
      id: prov.id,
      name: prov.name,
      plateCode: prov.plateCode,
      registeredVoters: acc.registeredVoters,
      turnout: acc.registeredVoters > 0 ? (acc.castVotes / acc.registeredVoters) * 100 : 0,
      validVotes: acc.validVotes,
      candidateVotes: acc.candVotes,
      candidateShares: shares,
      leadingCandidateId,
      runnerUpCandidateId,
      marginVotes,
      marginPct,
      isLocked: acc.isLocked,
    };
  }

  const r1TotalValid = r1DomesticValid + r1AbroadValidActual;
  const r1TotalReg =
    r1DomesticReg +
    (abroadConfig.enabled ? Math.max(0, abroadConfig.registeredVoters + abroadCountryRegDelta) : 0);
  const r1AbroadCast = abroadConfig.enabled
    ? Math.round(
        Math.max(0, abroadConfig.registeredVoters + abroadCountryRegDelta) *
          (abroadConfig.turnout / 100)
      )
    : 0;
  const r1Turnout = r1TotalReg > 0 ? ((r1DomesticCast + r1AbroadCast) / r1TotalReg) * 100 : 0;

  const r1CandidateSummaries: PresidentialCandidateSummary[] = candidates
    .map((c) => {
      const domV = r1DomesticCandVotes[c.id] || 0;
      const abV = r1AbroadCandVotes[c.id] || 0;
      const votes = domV + abV;
      return {
        candidateId: c.id,
        votes,
        share: r1TotalValid > 0 ? (votes / r1TotalValid) * 100 : 0,
        domesticVotes: domV,
        abroadVotes: abV,
        provincesWon: r1ProvincesWon[c.id] || 0,
        ilcelerWon: r1IlcesWon[c.id] || 0,
      };
    })
    .sort((a, b) => b.votes - a.votes);

  const r1Leader = r1CandidateSummaries[0];
  const r1Runner = r1CandidateSummaries[1] || r1Leader;
  const topTwoCandidateIds: [string, string] = [r1Leader.candidateId, r1Runner.candidateId];
  const hasAbsoluteMajority =
    r1TotalValid > 0 && r1Leader.votes > Math.floor(r1TotalValid / 2);

  const round1: PresidentialRoundResult = {
    round: 1,
    totalRegisteredVoters: r1TotalReg,
    totalValidVotes: r1TotalValid,
    domesticValidVotes: r1DomesticValid,
    abroadValidVotes: r1AbroadValidActual,
    turnout: r1Turnout,
    candidateSummaries: r1CandidateSummaries,
    leadingCandidateId: r1Leader.candidateId,
    runnerUpCandidateId: r1Runner.candidateId,
    marginVotes: Math.max(0, r1Leader.votes - r1Runner.votes),
    marginPct: Math.max(0, r1Leader.share - r1Runner.share),
    hasAbsoluteMajority,
    provinceResults: r1ProvinceResults,
    ilceResults: r1IlceResults,
    abroadCountryResults: r1AbroadCountryResults,
    closestProvinces: Object.values(r1ProvinceResults)
      .sort((a, b) => a.marginPct - b.marginPct)
      .slice(0, 15),
  };

  // 3. Build Round 2 Runoff between topTwoCandidateIds across all 973 ilçeler and abroad
  const [firstId, secondId] = topTwoCandidateIds;
  const finalists = candidates.filter((c) => c.id === firstId || c.id === secondId);
  const resolvedTransfers: Record<string, PresidentialTransferSplit> = {};

  for (const c of candidates) {
    if (c.id === firstId || c.id === secondId) continue;
    const rawSplit =
      transferMatrix[c.id] || getDefaultTransferForCandidate(c.id, firstId, secondId);
    const t1 = Math.max(0, rawSplit.toFirstPct);
    const t2 = Math.max(0, rawSplit.toSecondPct);
    const tab = Math.max(0, rawSplit.abstainPct);
    const sum = t1 + t2 + tab;
    resolvedTransfers[c.id] =
      sum > 0
        ? {
            toFirstPct: (t1 / sum) * 100,
            toSecondPct: (t2 / sum) * 100,
            abstainPct: (tab / sum) * 100,
          }
        : { toFirstPct: 40, toSecondPct: 40, abstainPct: 20 };
  }

  // Round 2 dynamics: finalist retention/mobilization, geographic transfer tilt, R2 abroad turnout
  const r2Dyn = input.round2Dynamics;
  const dyn1 = r2Dyn?.finalistDynamics?.[firstId] || { retentionPct: 100, mobilizationPct: 0 };
  const dyn2 = r2Dyn?.finalistDynamics?.[secondId] || { retentionPct: 100, mobilizationPct: 0 };
  const ret1 = Math.min(1.1, Math.max(0.5, dyn1.retentionPct / 100));
  const ret2 = Math.min(1.1, Math.max(0.5, dyn2.retentionPct / 100));
  const mob1 = Math.min(0.25, Math.max(0, dyn1.mobilizationPct / 100));
  const mob2 = Math.min(0.25, Math.max(0, dyn2.mobilizationPct / 100));
  const tiltStrength = Math.min(1, Math.max(0, (r2Dyn?.geographicTransferTilt ?? 0) / 100));
  const abroadR2Mult = Math.min(1.5, Math.max(0.5, r2Dyn?.abroadRound2TurnoutMultiplier ?? 1.0));

  const r1IlceList = Object.values(r1IlceResults);

  // Calibrate per-ilçe, per-eliminated-candidate transfer splits so local finalist strength tilts
  // transfers while preserving each eliminated candidate's exact national transfer share.
  const calibratedTiltedFirstShare: Record<string, Record<string, number>> = {};
  for (const c of candidates) {
    if (c.id === firstId || c.id === secondId) continue;
    const tr = resolvedTransfers[c.id];
    const activePct = tr.toFirstPct + tr.toSecondPct;
    const perIlceMap: Record<string, number> = {};

    if (activePct <= 0.001) {
      for (const u of r1IlceList) perIlceMap[u.id] = 0.5;
      calibratedTiltedFirstShare[c.id] = perIlceMap;
      continue;
    }

    const baseP1 = tr.toFirstPct / activePct;
    if (tiltStrength <= 0.001 || baseP1 <= 0.001 || baseP1 >= 0.999) {
      for (const u of r1IlceList) perIlceMap[u.id] = baseP1;
      calibratedTiltedFirstShare[c.id] = perIlceMap;
      continue;
    }

    const logits: Record<string, number> = {};
    let totalCandVotes = 0;
    for (const u of r1IlceList) {
      const cv = u.candidateVotes[c.id] || 0;
      totalCandVotes += cv;
      const f1 = u.candidateVotes[firstId] || 0;
      const f2 = u.candidateVotes[secondId] || 0;
      const localBalance = f1 + f2 > 0 ? f1 / (f1 + f2) - 0.5 : 0;
      const rawP = Math.min(0.98, Math.max(0.02, baseP1 + tiltStrength * localBalance));
      logits[u.id] = Math.log(rawP / (1 - rawP));
    }

    const desiredFirstPool = totalCandVotes * baseP1;
    let lo = -8;
    let hi = 8;
    for (let iter = 0; iter < 20; iter++) {
      const mid = (lo + hi) / 2;
      let sum = 0;
      for (const u of r1IlceList) {
        const cv = u.candidateVotes[c.id] || 0;
        if (cv <= 0) continue;
        sum += cv / (1 + Math.exp(-(logits[u.id] + mid)));
      }
      if (sum < desiredFirstPool) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    const finalShift = (lo + hi) / 2;
    for (const u of r1IlceList) {
      perIlceMap[u.id] = 1 / (1 + Math.exp(-(logits[u.id] + finalShift)));
    }
    calibratedTiltedFirstShare[c.id] = perIlceMap;
  }

  const r2IlceResults: Record<string, PresidentialUnitResult> = {};
  const r2ProvAccum: Record<
    string,
    { registeredVoters: number; validVotes: number; r1Valid: number; r1Cast: number; v1: number; v2: number }
  > = {};
  for (const prov of baseline.provinces) {
    r2ProvAccum[prov.id] = {
      registeredVoters: 0,
      validVotes: 0,
      r1Valid: 0,
      r1Cast: 0,
      v1: 0,
      v2: 0,
    };
  }

  let r2DomValid = 0;
  let r2DomV1 = 0;
  let r2DomV2 = 0;
  const r2IlcesWon: Record<string, number> = { [firstId]: 0, [secondId]: 0 };

  for (const ilceRes of r1IlceList) {
    const f1R1 = ilceRes.candidateVotes[firstId] || 0;
    const f2R1 = ilceRes.candidateVotes[secondId] || 0;
    const fSum = f1R1 + f2R1;
    const w1 = fSum > 0 ? f1R1 / fSum : 0.5;
    const w2 = 1 - w1;

    // Non-voter mobilization bounded inside realistic 95% ilçe ceiling
    const maxReachable = Math.round(ilceRes.registeredVoters * 0.95);
    const nonVoterPool = Math.max(0, maxReachable - ilceRes.validVotes);
    let mobVotes1 = nonVoterPool * mob1 * (0.5 + 0.5 * w1);
    let mobVotes2 = nonVoterPool * mob2 * (0.5 + 0.5 * w2);
    if (mobVotes1 + mobVotes2 > nonVoterPool && nonVoterPool > 0) {
      const capScale = nonVoterPool / (mobVotes1 + mobVotes2);
      mobVotes1 *= capScale;
      mobVotes2 *= capScale;
    }

    let v1 = Math.round(f1R1 * ret1 + mobVotes1);
    let v2 = Math.round(f2R1 * ret2 + mobVotes2);

    for (const c of candidates) {
      if (c.id === firstId || c.id === secondId) continue;
      const cv = ilceRes.candidateVotes[c.id] || 0;
      const tr = resolvedTransfers[c.id];
      const activeRatio = (tr.toFirstPct + tr.toSecondPct) / 100;
      const p1 = calibratedTiltedFirstShare[c.id]?.[ilceRes.id] ?? (activeRatio > 0 ? tr.toFirstPct / (tr.toFirstPct + tr.toSecondPct) : 0.5);
      const totalTransferred = cv * activeRatio;
      const add1 = Math.round(totalTransferred * p1);
      const add2 = Math.max(0, Math.round(totalTransferred) - add1);
      v1 += add1;
      v2 += add2;
    }

    const r2Valid = Math.max(1, v1 + v2);
    const r2Turnout =
      ilceRes.validVotes > 0 && ilceRes.registeredVoters > 0
        ? Math.min(
            98,
            Math.max(0, ilceRes.turnout * (r2Valid / ilceRes.validVotes))
          )
        : ilceRes.turnout;

    r2DomValid += r2Valid;
    r2DomV1 += v1;
    r2DomV2 += v2;

    if (ilceRes.ilId && r2ProvAccum[ilceRes.ilId]) {
      const acc = r2ProvAccum[ilceRes.ilId];
      acc.registeredVoters += ilceRes.registeredVoters;
      acc.validVotes += r2Valid;
      acc.r1Valid += ilceRes.validVotes;
      acc.r1Cast += Math.round(ilceRes.registeredVoters * (ilceRes.turnout / 100));
      acc.v1 += v1;
      acc.v2 += v2;
    }

    const leaderId = v1 >= v2 ? firstId : secondId;
    const runnerId = leaderId === firstId ? secondId : firstId;
    r2IlcesWon[leaderId] = (r2IlcesWon[leaderId] || 0) + 1;

    const r2Votes = { [firstId]: v1, [secondId]: v2 };
    const r2Shares = {
      [firstId]: (v1 / r2Valid) * 100,
      [secondId]: (v2 / r2Valid) * 100,
    };
    const marginVotes = Math.abs(v1 - v2);

    r2IlceResults[ilceRes.id] = {
      id: ilceRes.id,
      name: ilceRes.name,
      ilId: ilceRes.ilId,
      registeredVoters: ilceRes.registeredVoters,
      turnout: r2Turnout,
      validVotes: r2Valid,
      candidateVotes: r2Votes,
      candidateShares: r2Shares,
      leadingCandidateId: leaderId,
      runnerUpCandidateId: runnerId,
      marginVotes,
      marginPct: (marginVotes / r2Valid) * 100,
      isLocked: ilceRes.isLocked,
    };
  }

  // Round 2 Abroad Countries -> Aggregate Rollup
  const r2AbroadCountryResults: Record<string, PresidentialUnitResult> = {};
  let r2AbV1 = 0;
  let r2AbV2 = 0;

  for (const country of ABROAD_COUNTRIES_2023) {
    const r1C = r1AbroadCountryResults[country.id];
    const cReg = r1C?.registeredVoters || 0;
    let cv1 = Math.round((r1C?.candidateVotes[firstId] || 0) * ret1 * abroadR2Mult);
    let cv2 = Math.round((r1C?.candidateVotes[secondId] || 0) * ret2 * abroadR2Mult);
    for (const c of candidates) {
      if (c.id === firstId || c.id === secondId) continue;
      const cv = (r1C?.candidateVotes[c.id] || 0) * abroadR2Mult;
      const tr = resolvedTransfers[c.id];
      cv1 += Math.round(cv * (tr.toFirstPct / 100));
      cv2 += Math.round(cv * (tr.toSecondPct / 100));
    }
    if (!abroadConfig.enabled) {
      cv1 = 0;
      cv2 = 0;
    }
    const cValid = cv1 + cv2;
    const leaderId = cv1 >= cv2 ? firstId : secondId;
    const runnerId = leaderId === firstId ? secondId : firstId;
    const mVotes = Math.abs(cv1 - cv2);
    const r2CTurnout =
      cValid > 0 && r1C && r1C.validVotes > 0
        ? Math.min(100, r1C.turnout * (cValid / r1C.validVotes))
        : 0;

    r2AbroadCountryResults[country.id] = {
      id: country.id,
      name: country.nameTr,
      registeredVoters: cReg,
      turnout: Number(r2CTurnout.toFixed(2)),
      validVotes: cValid,
      candidateVotes: { [firstId]: cv1, [secondId]: cv2 },
      candidateShares: {
        [firstId]: cValid > 0 ? (cv1 / cValid) * 100 : 0,
        [secondId]: cValid > 0 ? (cv2 / cValid) * 100 : 0,
      },
      leadingCandidateId: leaderId,
      runnerUpCandidateId: runnerId,
      marginVotes: mVotes,
      marginPct: cValid > 0 ? (mVotes / cValid) * 100 : 0,
      isLocked: r1C?.isLocked,
    };

    r2AbV1 += cv1;
    r2AbV2 += cv2;
  }
  const r2AbValid = abroadConfig.enabled ? r2AbV1 + r2AbV2 : 0;

  // Round 2 Provinces
  const r2ProvinceResults: Record<string, PresidentialUnitResult> = {};
  const r2ProvsWon: Record<string, number> = { [firstId]: 0, [secondId]: 0 };
  const flippedProvinceIds: string[] = [];

  for (const prov of baseline.provinces) {
    const acc = r2ProvAccum[prov.id];
    const valid = Math.max(1, acc.validVotes);
    const leaderId = acc.v1 >= acc.v2 ? firstId : secondId;
    const runnerId = leaderId === firstId ? secondId : firstId;
    r2ProvsWon[leaderId] = (r2ProvsWon[leaderId] || 0) + 1;

    if (r1ProvinceResults[prov.id]?.leadingCandidateId !== leaderId) {
      flippedProvinceIds.push(prov.id);
    }

    const r2Turnout =
      acc.registeredVoters > 0 && acc.r1Valid > 0
        ? Math.min(100, (acc.r1Cast / acc.registeredVoters) * 100 * (valid / acc.r1Valid))
        : 0;
    const marginVotes = Math.abs(acc.v1 - acc.v2);

    r2ProvinceResults[prov.id] = {
      id: prov.id,
      name: prov.name,
      plateCode: prov.plateCode,
      registeredVoters: acc.registeredVoters,
      turnout: r2Turnout,
      validVotes: valid,
      candidateVotes: { [firstId]: acc.v1, [secondId]: acc.v2 },
      candidateShares: {
        [firstId]: (acc.v1 / valid) * 100,
        [secondId]: (acc.v2 / valid) * 100,
      },
      leadingCandidateId: leaderId,
      runnerUpCandidateId: runnerId,
      marginVotes,
      marginPct: (marginVotes / valid) * 100,
      isLocked: r1ProvinceResults[prov.id]?.isLocked,
    };
  }

  const r2TotalValid = r2DomValid + r2AbValid;
  const r2Summaries: PresidentialCandidateSummary[] = finalists
    .map((c) => {
      const domV = c.id === firstId ? r2DomV1 : r2DomV2;
      const abV = abroadConfig.enabled ? (c.id === firstId ? r2AbV1 : r2AbV2) : 0;
      const votes = domV + abV;
      return {
        candidateId: c.id,
        votes,
        share: r2TotalValid > 0 ? (votes / r2TotalValid) * 100 : 0,
        domesticVotes: domV,
        abroadVotes: abV,
        provincesWon: r2ProvsWon[c.id] || 0,
        ilcelerWon: r2IlcesWon[c.id] || 0,
      };
    })
    .sort((a, b) => b.votes - a.votes);

  const r2Win = r2Summaries[0];
  const r2Lose = r2Summaries[1] || r2Win;
  const r2Turnout =
    r1TotalValid > 0 ? Math.min(100, r1Turnout * (r2TotalValid / r1TotalValid)) : r1Turnout;

  const round2: PresidentialRoundResult = {
    round: 2,
    totalRegisteredVoters: r1TotalReg,
    totalValidVotes: r2TotalValid,
    domesticValidVotes: r2DomValid,
    abroadValidVotes: r2AbValid,
    turnout: r2Turnout,
    candidateSummaries: r2Summaries,
    leadingCandidateId: r2Win.candidateId,
    runnerUpCandidateId: r2Lose.candidateId,
    marginVotes: Math.max(0, r2Win.votes - r2Lose.votes),
    marginPct: Math.max(0, r2Win.share - r2Lose.share),
    hasAbsoluteMajority: true,
    provinceResults: r2ProvinceResults,
    ilceResults: r2IlceResults,
    abroadCountryResults: r2AbroadCountryResults,
    closestProvinces: Object.values(r2ProvinceResults)
      .sort((a, b) => a.marginPct - b.marginPct)
      .slice(0, 15),
  };

  return {
    decidedInRound: hasAbsoluteMajority ? 1 : 2,
    topTwoCandidateIds,
    winnerCandidateId: hasAbsoluteMajority ? r1Leader.candidateId : r2Win.candidateId,
    round1,
    round2,
    flippedProvinceIds,
  };
}
