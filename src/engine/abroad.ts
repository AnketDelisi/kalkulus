import { ABROAD_COUNTRIES_2023 } from '../data/abroadCountries';
import {
  AbroadCountryData,
  AbroadCountryResult,
  AbroadVoteConfig,
  PartyConfig,
  SwingMode,
} from '../types/election';

export interface AbroadCountryOverrideInput {
  isLocked: boolean;
  partyShares?: Record<string, number>;
  turnout?: number;
  registeredVoters?: number;
}

/**
 * Computes a party's regional proxy vote share from donor parties' weights
 * (used for new/0%-baseline parties such as YENİ, A, SAADET).
 */
export function getProxyShare(
  shares: Record<string, number>,
  party: PartyConfig
): number {
  if (!party.proxyWeights) return 0;
  let weighted = 0;
  for (const [donorId, weight] of Object.entries(party.proxyWeights)) {
    weighted += weight * (shares[donorId] ?? 0);
  }
  return weighted;
}

/**
 * Distributes an integer vote total across keys according to percentage shares using
 * Hare-Niemeyer largest remainder so the integer counts sum strictly to `totalVotes`.
 */
export function allocateVotesLargestRemainder(
  totalVotes: number,
  shares: Record<string, number>,
  keys: string[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = 0;
  const target = Math.max(0, Math.round(totalVotes));
  if (target <= 0 || keys.length === 0) return out;

  let sumShares = 0;
  for (const k of keys) sumShares += Math.max(0, shares[k] ?? 0);
  if (sumShares <= 0) {
    out[keys[0]] = target;
    return out;
  }

  const rows: { k: string; votes: number; rem: number }[] = [];
  let allocated = 0;
  for (const k of keys) {
    const exact = target * (Math.max(0, shares[k] ?? 0) / sumShares);
    const fl = Math.floor(exact);
    rows.push({ k, votes: fl, rem: exact - fl });
    allocated += fl;
  }

  const left = target - allocated;
  rows.sort((a, b) => b.rem - a.rem || a.k.localeCompare(b.k));
  for (let i = 0; i < left && i < rows.length; i++) {
    rows[i].votes += 1;
  }
  for (const r of rows) out[r.k] = r.votes;
  return out;
}

function normalizeSharesByParties(
  raw: Record<string, number>,
  parties: PartyConfig[]
): Record<string, number> {
  const out: Record<string, number> = {};
  let sum = 0;
  for (const p of parties) {
    const v = Math.max(0, Number(raw[p.id] ?? 0));
    out[p.id] = v;
    sum += v;
  }
  if (sum <= 0) {
    const eq = parties.length > 0 ? 100 / parties.length : 0;
    for (const p of parties) out[p.id] = eq;
    return out;
  }
  for (const p of parties) {
    out[p.id] = (out[p.id] / sum) * 100;
  }
  return out;
}

function swingUnitShares(
  unitBaseShares: Record<string, number>,
  refBaseShares: Record<string, number>,
  refTargetShares: Record<string, number>,
  swingMode: SwingMode,
  parties: PartyConfig[]
): Record<string, number> {
  const raw: Record<string, number> = {};
  for (const p of parties) {
    const unitBase = unitBaseShares[p.id] ?? 0;
    const refBase = refBaseShares[p.id] ?? 0;
    const refTarget = refTargetShares[p.id] ?? refBase;

    if (refBase <= 0.05 && p.proxyWeights) {
      if (Math.abs(refTarget - refBase) < 1e-6) {
        raw[p.id] = unitBase;
      } else {
        const unitProxy = getProxyShare(unitBaseShares, p);
        const refProxy = getProxyShare(refBaseShares, p);
        if (refProxy > 0.05) {
          raw[p.id] = Math.max(0, refTarget * (unitProxy / refProxy));
        } else {
          raw[p.id] = Math.max(0, unitBase + (refTarget - refBase));
        }
      }
    } else if (swingMode === 'proportional') {
      if (refBase > 0.05) {
        raw[p.id] = Math.max(0, unitBase * (refTarget / refBase));
      } else {
        raw[p.id] = Math.max(0, unitBase + (refTarget - refBase));
      }
    } else {
      raw[p.id] = Math.max(0, unitBase + (refTarget - refBase));
    }
  }
  return normalizeSharesByParties(raw, parties);
}

export interface AbroadComputedResult {
  abroadRegisteredVoters: number;
  abroadValidVotes: number;
  abroadPartyVotes: Record<string, number>;
  abroadPartyShares: Record<string, number>;
  abroadCountryResults: Record<string, AbroadCountryResult>;
  districtAbroadPartyVotes: Record<string, Record<string, number>>; // districtId -> partyId -> votes
  districtAbroadTotalVotes: Record<string, number>; // districtId -> total abroad votes added
}

/**
 * Computes Yurt Dışı & Gümrük (Abroad & Customs) valid votes across all ~74 countries +
 * Customs ports (with optional per-country locks), sums exact party ballots, and
 * distributes them proportionally across the 87 domestic districts (Law No. 2839 Art. 94/B).
 */
export function computeAndDistributeAbroadVotes(
  abroadConfig: AbroadVoteConfig,
  baseAbroadShares: Record<string, number>,
  nationalBaseShares: Record<string, number>,
  nationalTargetShares: Record<string, number>,
  swingMode: SwingMode,
  districtDomesticValidVotes: Record<string, number>,
  totalDomesticValidVotes: number,
  parties: PartyConfig[],
  abroadCountryOverrides: Record<string, AbroadCountryOverrideInput> = {},
  abroadCountries: AbroadCountryData[] = ABROAD_COUNTRIES_2023
): AbroadComputedResult {
  const abroadPartyVotes: Record<string, number> = {};
  const abroadPartyShares: Record<string, number> = {};
  const abroadCountryResults: Record<string, AbroadCountryResult> = {};
  const districtAbroadPartyVotes: Record<string, Record<string, number>> = {};
  const districtAbroadTotalVotes: Record<string, number> = {};
  const partyKeys = parties.map((p) => p.id);

  for (const p of parties) {
    abroadPartyVotes[p.id] = 0;
    abroadPartyShares[p.id] = 0;
  }

  for (const dId of Object.keys(districtDomesticValidVotes)) {
    districtAbroadPartyVotes[dId] = {};
    districtAbroadTotalVotes[dId] = 0;
  }

  if (!abroadConfig.enabled || abroadConfig.registeredVoters <= 0 || abroadConfig.turnout <= 0) {
    for (const c of abroadCountries) {
      const zeroVotes: Record<string, number> = {};
      const zeroShares: Record<string, number> = {};
      for (const p of parties) {
        zeroVotes[p.id] = 0;
        zeroShares[p.id] = 0;
      }
      abroadCountryResults[c.id] = {
        id: c.id,
        nameTr: c.nameTr,
        fullNameTr: c.fullNameTr,
        nameEn: c.nameEn,
        region: c.region,
        isCustoms: c.isCustoms,
        isInset: c.isInset,
        registeredVoters: 0,
        turnout: 0,
        validVotes: 0,
        partyVotes: zeroVotes,
        partyShares: zeroShares,
        leadingPartyId: parties[0]?.id || 'AKP',
        runnerUpPartyId: parties[1]?.id || 'CHP',
        marginVotes: 0,
        marginPct: 0,
        isLocked: Boolean(abroadCountryOverrides[c.id]?.isLocked),
      };
    }

    return {
      abroadRegisteredVoters: abroadConfig.enabled ? abroadConfig.registeredVoters : 0,
      abroadValidVotes: 0,
      abroadPartyVotes,
      abroadPartyShares,
      abroadCountryResults,
      districtAbroadPartyVotes,
      districtAbroadTotalVotes,
    };
  }

  const totalCastTarget = Math.round(abroadConfig.registeredVoters * (abroadConfig.turnout / 100));
  const aggregateValidTarget = Math.round(totalCastTarget * (abroadConfig.validVoteRatio / 100));
  const baseCountriesTotalValid = abroadCountries.reduce((s, c) => s + c.validVotes, 0);
  const volumeScale =
    baseCountriesTotalValid > 0 ? aggregateValidTarget / baseCountriesTotalValid : 1;

  const baseRegTotal = abroadCountries.reduce((s, c) => s + c.registeredVoters, 0);
  const regScale = baseRegTotal > 0 ? abroadConfig.registeredVoters / baseRegTotal : 1;

  const normalizedManualAbroadTarget = !abroadConfig.syncWithNationalSwing
    ? normalizeSharesByParties(abroadConfig.partyShares, parties)
    : {};

  const hasAnyCountryLock = abroadCountries.some((c) => abroadCountryOverrides[c.id]?.isLocked);

  // Compute exact country valid votes first (Hare-Niemeyer exact conservation when no countries are locked)
  const rawCountryValid: Record<string, number> = {};
  if (!hasAnyCountryLock) {
    const shareByCountry: Record<string, number> = {};
    for (const c of abroadCountries) {
      shareByCountry[c.id] = c.validVotes;
    }
    const allocated = allocateVotesLargestRemainder(
      aggregateValidTarget,
      shareByCountry,
      abroadCountries.map((c) => c.id)
    );
    Object.assign(rawCountryValid, allocated);
  } else {
    for (const c of abroadCountries) {
      const ovr = abroadCountryOverrides[c.id];
      if (ovr?.isLocked) {
        if (c.isCustoms) {
          const tRatio =
            ovr.turnout !== undefined && c.turnout > 0 ? ovr.turnout / c.turnout : 1;
          rawCountryValid[c.id] = Math.max(0, Math.round(c.validVotes * volumeScale * tRatio));
        } else {
          const effReg = ovr.registeredVoters ?? Math.round(c.registeredVoters * regScale);
          const effTurnout = ovr.turnout ?? c.turnout * Math.min(1.6, Math.max(0.3, volumeScale / Math.max(0.1, regScale)));
          rawCountryValid[c.id] = Math.max(
            0,
            Math.round(effReg * (effTurnout / 100) * (c.validVoteRatio / 100))
          );
        }
      } else {
        rawCountryValid[c.id] = Math.max(0, Math.round(c.validVotes * volumeScale));
      }
    }
  }

  let abroadValidVotes = 0;
  let countryRegisteredDelta = 0;

  for (const c of abroadCountries) {
    const ovr = abroadCountryOverrides[c.id];
    const isLocked = Boolean(ovr?.isLocked);

    const effectiveShares =
      isLocked && ovr?.partyShares
        ? normalizeSharesByParties(ovr.partyShares, parties)
        : abroadConfig.syncWithNationalSwing
        ? swingUnitShares(
            c.partyShares,
            nationalBaseShares,
            nationalTargetShares,
            swingMode,
            parties
          )
        : swingUnitShares(
            c.partyShares,
            baseAbroadShares,
            normalizedManualAbroadTarget,
            swingMode,
            parties
          );

    const cValid = rawCountryValid[c.id] || 0;
    const cPartyVotes = allocateVotesLargestRemainder(cValid, effectiveShares, partyKeys);

    const effReg = c.isCustoms
      ? 0
      : isLocked && ovr?.registeredVoters !== undefined
      ? ovr.registeredVoters
      : Math.round(c.registeredVoters * regScale);

    if (!c.isCustoms && isLocked && ovr?.registeredVoters !== undefined) {
      countryRegisteredDelta += ovr.registeredVoters - Math.round(c.registeredVoters * regScale);
    }

    const effTurnout = c.isCustoms
      ? isLocked && ovr?.turnout !== undefined
        ? ovr.turnout
        : c.turnout * volumeScale
      : effReg > 0 && c.validVoteRatio > 0
      ? Math.min(100, ((cValid / (c.validVoteRatio / 100)) / effReg) * 100)
      : 0;

    const sortedParties = [...parties]
      .filter((p) => !p.isOther)
      .sort((a, b) => (cPartyVotes[b.id] || 0) - (cPartyVotes[a.id] || 0));
    const leader = sortedParties[0];
    const runner = sortedParties[1];
    const leadV = leader ? cPartyVotes[leader.id] || 0 : 0;
    const runV = runner ? cPartyVotes[runner.id] || 0 : 0;
    const leadS = leader ? effectiveShares[leader.id] || 0 : 0;
    const runS = runner ? effectiveShares[runner.id] || 0 : 0;

    abroadCountryResults[c.id] = {
      id: c.id,
      nameTr: c.nameTr,
      fullNameTr: c.fullNameTr,
      nameEn: c.nameEn,
      region: c.region,
      isCustoms: c.isCustoms,
      isInset: c.isInset,
      registeredVoters: effReg,
      turnout: Number(effTurnout.toFixed(2)),
      validVotes: cValid,
      partyVotes: cPartyVotes,
      partyShares: effectiveShares,
      leadingPartyId: leader?.id || 'AKP',
      runnerUpPartyId: runner?.id || 'CHP',
      marginVotes: Math.max(0, leadV - runV),
      marginPct: Math.max(0, leadS - runS),
      isLocked,
    };

    abroadValidVotes += cValid;
    for (const p of parties) {
      abroadPartyVotes[p.id] += cPartyVotes[p.id] || 0;
    }
  }

  for (const p of parties) {
    abroadPartyShares[p.id] =
      abroadValidVotes > 0 ? (abroadPartyVotes[p.id] / abroadValidVotes) * 100 : 0;
  }

  // Distribute abroad party votes to each of the 87 electoral districts with exact conservation (Hare-Niemeyer)
  if (totalDomesticValidVotes > 0) {
    for (const p of parties) {
      const totalPVotes = abroadPartyVotes[p.id] || 0;
      if (totalPVotes <= 0) {
        for (const dId of Object.keys(districtDomesticValidVotes)) {
          districtAbroadPartyVotes[dId][p.id] = 0;
        }
        continue;
      }

      const allocations: { dId: string; votes: number; remainder: number }[] = [];
      let allocatedSum = 0;

      for (const [dId, domValid] of Object.entries(districtDomesticValidVotes)) {
        const exact = totalPVotes * (domValid / totalDomesticValidVotes);
        const floorVotes = Math.floor(exact);
        allocations.push({ dId, votes: floorVotes, remainder: exact - floorVotes });
        allocatedSum += floorVotes;
      }

      const remainderVotes = totalPVotes - allocatedSum;
      allocations.sort((a, b) => b.remainder - a.remainder || a.dId.localeCompare(b.dId));
      for (let i = 0; i < remainderVotes; i++) {
        allocations[i].votes += 1;
      }

      for (const alloc of allocations) {
        districtAbroadPartyVotes[alloc.dId][p.id] = alloc.votes;
        districtAbroadTotalVotes[alloc.dId] = (districtAbroadTotalVotes[alloc.dId] || 0) + alloc.votes;
      }
    }
  }

  return {
    abroadRegisteredVoters: Math.max(0, abroadConfig.registeredVoters + countryRegisteredDelta),
    abroadValidVotes,
    abroadPartyVotes,
    abroadPartyShares,
    abroadCountryResults,
    districtAbroadPartyVotes,
    districtAbroadTotalVotes,
  };
}
