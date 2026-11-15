import { AbroadVoteConfig, PartyConfig, SwingMode } from '../types/election';

export interface AbroadComputedResult {
  abroadRegisteredVoters: number;
  abroadValidVotes: number;
  abroadPartyVotes: Record<string, number>;
  abroadPartyShares: Record<string, number>;
  districtAbroadPartyVotes: Record<string, Record<string, number>>; // districtId -> partyId -> votes
  districtAbroadTotalVotes: Record<string, number>; // districtId -> total abroad votes added
}

/**
 * Computes Yurt Dışı & Gümrük (Abroad & Customs) valid votes per party and
 * distributes them proportionally across the 87 electoral districts according
 * to each district's share of domestic valid votes (Law No. 2839 Art. 94/B).
 */
export function computeAndDistributeAbroadVotes(
  abroadConfig: AbroadVoteConfig,
  baseAbroadShares: Record<string, number>,
  nationalBaseShares: Record<string, number>,
  nationalTargetShares: Record<string, number>,
  swingMode: SwingMode,
  districtDomesticValidVotes: Record<string, number>,
  totalDomesticValidVotes: number,
  parties: PartyConfig[]
): AbroadComputedResult {
  const abroadPartyVotes: Record<string, number> = {};
  const abroadPartyShares: Record<string, number> = {};
  const districtAbroadPartyVotes: Record<string, Record<string, number>> = {};
  const districtAbroadTotalVotes: Record<string, number> = {};

  for (const dId of Object.keys(districtDomesticValidVotes)) {
    districtAbroadPartyVotes[dId] = {};
    districtAbroadTotalVotes[dId] = 0;
  }

  if (!abroadConfig.enabled || abroadConfig.registeredVoters <= 0 || abroadConfig.turnout <= 0) {
    for (const p of parties) {
      abroadPartyVotes[p.id] = 0;
      abroadPartyShares[p.id] = 0;
    }
    return {
      abroadRegisteredVoters: abroadConfig.enabled ? abroadConfig.registeredVoters : 0,
      abroadValidVotes: 0,
      abroadPartyVotes,
      abroadPartyShares,
      districtAbroadPartyVotes,
      districtAbroadTotalVotes,
    };
  }

  const totalCast = Math.round(abroadConfig.registeredVoters * (abroadConfig.turnout / 100));
  const abroadValidVotes = Math.round(totalCast * (abroadConfig.validVoteRatio / 100));

  // Determine effective abroad party shares
  let rawShares: Record<string, number> = {};
  if (abroadConfig.syncWithNationalSwing) {
    for (const p of parties) {
      const baseAbroad = baseAbroadShares[p.id] ?? 0;
      const natBase = nationalBaseShares[p.id] ?? 0;
      const natTarget = nationalTargetShares[p.id] ?? natBase;
      if (swingMode === 'proportional') {
        if (natBase > 0.05) {
          rawShares[p.id] = Math.max(0, baseAbroad * (natTarget / natBase));
        } else {
          rawShares[p.id] = Math.max(0, baseAbroad + (natTarget - natBase));
        }
      } else {
        rawShares[p.id] = Math.max(0, baseAbroad + (natTarget - natBase));
      }
    }
  } else {
    for (const p of parties) {
      rawShares[p.id] = Math.max(0, abroadConfig.partyShares[p.id] ?? 0);
    }
  }

  // Normalize shares to 100%
  const sumShares = Object.values(rawShares).reduce((a, b) => a + b, 0);
  for (const p of parties) {
    abroadPartyShares[p.id] = sumShares > 0 ? (rawShares[p.id] / sumShares) * 100 : 0;
    abroadPartyVotes[p.id] = Math.round(abroadValidVotes * (abroadPartyShares[p.id] / 100));
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

      // Distribute remaining votes to districts with highest remainders
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
    abroadRegisteredVoters: abroadConfig.registeredVoters,
    abroadValidVotes,
    abroadPartyVotes,
    abroadPartyShares,
    districtAbroadPartyVotes,
    districtAbroadTotalVotes,
  };
}
