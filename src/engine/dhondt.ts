import { DHondtMode, JointListRule, PartyConfig } from '../types/election';

export interface DistrictDHondtInput {
  districtId: string;
  mpCount: number;
  partyVotes: Record<string, number>; // Raw valid votes in district (Domestic + Abroad)
  eligiblePartyIds: Set<string>; // Parties that passed the national threshold (either solo or via alliance)
  parties: PartyConfig[];
  dhondtMode: DHondtMode;
  jointListRules: JointListRule[];
}

export interface DistrictDHondtOutput {
  partySeats: Record<string, number>;
  effectivePartyVotes: Record<string, number>;
  lastSeatWinnerPartyId: string;
  lastSeatQuotient: number;
  closestChallengerPartyId: string;
  closestChallengerQuotient: number;
  votesToFlipLastSeat: number;
}

/**
 * Evaluates which parties and alliances pass the national threshold (Baraj).
 * Under Turkish electoral law (Law No. 2839):
 * - An alliance passes the threshold if the sum of its member parties' total valid votes
 *   (domestic + abroad) >= thresholdPct% of total valid votes.
 * - All member parties of a passing alliance are eligible for D'Hondt MP allocation.
 * - Unallied parties must individually achieve >= thresholdPct% of total valid votes.
 */
export function evaluateNationalThreshold(
  nationalPartyVotes: Record<string, number>,
  totalValidVotes: number,
  parties: PartyConfig[],
  thresholdPct: number
): {
  allianceVotes: Record<string, number>;
  allianceShares: Record<string, number>;
  alliancePassed: Record<string, boolean>;
  partyPassed: Record<string, boolean>;
  eligiblePartyIds: Set<string>;
} {
  const allianceVotes: Record<string, number> = {};
  const allianceShares: Record<string, number> = {};
  const alliancePassed: Record<string, boolean> = {};
  const partyPassed: Record<string, boolean> = {};
  const eligiblePartyIds = new Set<string>();

  if (totalValidVotes <= 0) {
    return { allianceVotes, allianceShares, alliancePassed, partyPassed, eligiblePartyIds };
  }

  // Sum votes per alliance
  for (const party of parties) {
    if (party.isOther) continue; // "Other" / "Diğer" is an aggregate bucket, does not win MPs directly
    const votes = nationalPartyVotes[party.id] || 0;
    if (party.allianceId) {
      allianceVotes[party.allianceId] = (allianceVotes[party.allianceId] || 0) + votes;
    }
  }

  for (const [allianceId, votes] of Object.entries(allianceVotes)) {
    const share = (votes / totalValidVotes) * 100;
    allianceShares[allianceId] = share;
    alliancePassed[allianceId] = share >= thresholdPct - 1e-9;
  }

  for (const party of parties) {
    if (party.isOther) {
      partyPassed[party.id] = false;
      continue;
    }
    const votes = nationalPartyVotes[party.id] || 0;
    const share = (votes / totalValidVotes) * 100;
    const passedViaAlliance = party.allianceId ? Boolean(alliancePassed[party.allianceId]) : false;
    const passedSolo = share >= thresholdPct - 1e-9;
    const passed = passedViaAlliance || passedSolo;

    partyPassed[party.id] = passed;
    if (passed) {
      eligiblePartyIds.add(party.id);
    }
  }

  return {
    allianceVotes,
    allianceShares,
    alliancePassed,
    partyPassed,
    eligiblePartyIds,
  };
}

/**
 * Allocates MPs for a single electoral district using D'Hondt.
 * Supports:
 * - Post-2022 Separate Party D'Hondt (every eligible party competes on its own district votes)
 * - 2018 Alliance Pool D'Hondt (alliances win seats as a bloc first, then distribute internally via D'Hondt)
 * - Joint Candidate List rules (Party B runs inside Party A's list in selected districts)
 */
export function allocateDistrictSeatsDHondt(input: DistrictDHondtInput): DistrictDHondtOutput {
  const {
    districtId,
    mpCount,
    partyVotes,
    eligiblePartyIds,
    parties,
    dhondtMode,
    jointListRules,
  } = input;

  const effectivePartyVotes: Record<string, number> = { ...partyVotes };
  const partySeats: Record<string, number> = {};
  for (const p of parties) {
    partySeats[p.id] = 0;
  }

  if (mpCount <= 0) {
    return {
      partySeats,
      effectivePartyVotes,
      lastSeatWinnerPartyId: '',
      lastSeatQuotient: 0,
      closestChallengerPartyId: '',
      closestChallengerQuotient: 0,
      votesToFlipLastSeat: 0,
    };
  }

  // Apply active Joint List rules for this district
  const activeJointRules = jointListRules.filter((rule) => {
    if (!rule.enabled) return false;
    if (rule.sourcePartyId === rule.targetPartyId) return false;
    const matchesDistrict =
      rule.districtIds.includes('ALL') ||
      rule.districtIds.includes(districtId) ||
      (rule.maxDistrictMpThreshold !== undefined &&
        rule.maxDistrictMpThreshold > 0 &&
        mpCount <= rule.maxDistrictMpThreshold);
    return matchesDistrict;
  });

  for (const rule of activeJointRules) {
    const srcVotes = effectivePartyVotes[rule.sourcePartyId] || 0;
    if (srcVotes > 0) {
      const transferred = Math.round(srcVotes * (rule.transferEfficiency / 100));
      effectivePartyVotes[rule.targetPartyId] =
        (effectivePartyVotes[rule.targetPartyId] || 0) + transferred;
      effectivePartyVotes[rule.sourcePartyId] = 0;
    }
  }

  let lastSeatWinnerPartyId = '';
  let lastSeatQuotient = 0;
  let closestChallengerPartyId = '';
  let closestChallengerQuotient = 0;
  let votesToFlipLastSeat = 0;

  if (dhondtMode === '2022_separate') {
    // Standard Post-2022 Separate Party D'Hondt
    const competingParties = parties.filter(
      (p) => !p.isOther && eligiblePartyIds.has(p.id) && (effectivePartyVotes[p.id] || 0) > 0
    );

    if (competingParties.length === 0) {
      return {
        partySeats,
        effectivePartyVotes,
        lastSeatWinnerPartyId,
        lastSeatQuotient,
        closestChallengerPartyId,
        closestChallengerQuotient,
        votesToFlipLastSeat,
      };
    }

    // Generate all quotients up to mpCount + 1 for competing parties
    const allQuotients: { partyId: string; divisor: number; quotient: number; votes: number }[] = [];
    for (const p of competingParties) {
      const v = effectivePartyVotes[p.id] || 0;
      for (let d = 1; d <= mpCount + 1; d++) {
        allQuotients.push({
          partyId: p.id,
          divisor: d,
          quotient: v / d,
          votes: v,
        });
      }
    }

    // Sort descending by quotient, tie-break by raw votes
    allQuotients.sort((a, b) => {
      if (Math.abs(b.quotient - a.quotient) > 1e-6) return b.quotient - a.quotient;
      return b.votes - a.votes;
    });

    const winningEntries = allQuotients.slice(0, mpCount);
    for (const entry of winningEntries) {
      partySeats[entry.partyId] = (partySeats[entry.partyId] || 0) + 1;
    }

    if (winningEntries.length > 0) {
      const lastWinner = winningEntries[winningEntries.length - 1];
      lastSeatWinnerPartyId = lastWinner.partyId;
      lastSeatQuotient = lastWinner.quotient;

      // Find highest losing quotient belonging to a DIFFERENT party than lastWinner
      const remainingEntries = allQuotients.slice(mpCount);
      const challenger = remainingEntries.find((e) => e.partyId !== lastWinner.partyId);
      if (challenger) {
        closestChallengerPartyId = challenger.partyId;
        closestChallengerQuotient = challenger.quotient;
        // Challenger needs its (currentSeats + 1) quotient to exceed lastSeatQuotient:
        // newVotes / challenger.divisor > lastSeatQuotient
        const neededVotes = Math.floor(lastSeatQuotient * challenger.divisor) + 1;
        votesToFlipLastSeat = Math.max(1, neededVotes - challenger.votes);
      }
    }
  } else {
    // 2018 Alliance Pool D'Hondt Mode:
    // Step 1: Group eligible parties by allianceId (unallied eligible parties form solo blocs)
    const blocVotes: Record<string, number> = {};
    const blocParties: Record<string, string[]> = {};

    for (const p of parties) {
      if (p.isOther || !eligiblePartyIds.has(p.id)) continue;
      const v = effectivePartyVotes[p.id] || 0;
      if (v <= 0) continue;
      const blocId = p.allianceId ? `alliance:${p.allianceId}` : `party:${p.id}`;
      blocVotes[blocId] = (blocVotes[blocId] || 0) + v;
      if (!blocParties[blocId]) blocParties[blocId] = [];
      blocParties[blocId].push(p.id);
    }

    const blocQuotients: { blocId: string; divisor: number; quotient: number; votes: number }[] = [];
    for (const [blocId, v] of Object.entries(blocVotes)) {
      for (let d = 1; d <= mpCount + 1; d++) {
        blocQuotients.push({ blocId, divisor: d, quotient: v / d, votes: v });
      }
    }
    blocQuotients.sort((a, b) => b.quotient - a.quotient || b.votes - a.votes);

    const blocSeats: Record<string, number> = {};
    const winningBlocs = blocQuotients.slice(0, mpCount);
    for (const entry of winningBlocs) {
      blocSeats[entry.blocId] = (blocSeats[entry.blocId] || 0) + 1;
    }

    // Step 2: Inside each bloc, distribute blocSeats among member parties via D'Hondt
    for (const [blocId, seatsWon] of Object.entries(blocSeats)) {
      if (seatsWon <= 0) continue;
      const memberIds = blocParties[blocId] || [];
      if (memberIds.length === 1) {
        partySeats[memberIds[0]] = seatsWon;
      } else {
        const internalQ: { partyId: string; divisor: number; quotient: number; votes: number }[] = [];
        for (const pid of memberIds) {
          const pv = effectivePartyVotes[pid] || 0;
          for (let d = 1; d <= seatsWon; d++) {
            internalQ.push({ partyId: pid, divisor: d, quotient: pv / d, votes: pv });
          }
        }
        internalQ.sort((a, b) => b.quotient - a.quotient || b.votes - a.votes);
        for (const w of internalQ.slice(0, seatsWon)) {
          partySeats[w.partyId] = (partySeats[w.partyId] || 0) + 1;
        }
      }
    }

    // Compute last seat winner & challenger across parties for display
    const flatPartyQ: { partyId: string; divisor: number; quotient: number; votes: number }[] = [];
    for (const p of parties) {
      if (p.isOther || !eligiblePartyIds.has(p.id)) continue;
      const v = effectivePartyVotes[p.id] || 0;
      const s = partySeats[p.id] || 0;
      if (s > 0) {
        flatPartyQ.push({ partyId: p.id, divisor: s, quotient: v / s, votes: v });
      }
    }
    flatPartyQ.sort((a, b) => a.quotient - b.quotient);
    if (flatPartyQ.length > 0) {
      lastSeatWinnerPartyId = flatPartyQ[0].partyId;
      lastSeatQuotient = flatPartyQ[0].quotient;
    }

    let bestChallengerQ = -1;
    for (const p of parties) {
      if (p.isOther || !eligiblePartyIds.has(p.id) || p.id === lastSeatWinnerPartyId) continue;
      const v = effectivePartyVotes[p.id] || 0;
      const nextDiv = (partySeats[p.id] || 0) + 1;
      const q = v / nextDiv;
      if (q > bestChallengerQ) {
        bestChallengerQ = q;
        closestChallengerPartyId = p.id;
        closestChallengerQuotient = q;
        const needed = Math.floor(lastSeatQuotient * nextDiv) + 1;
        votesToFlipLastSeat = Math.max(1, needed - v);
      }
    }
  }

  // Step 3: Apply Joint List reserved seat transfers back to sourceParty
  for (const rule of activeJointRules) {
    if (rule.reservedSeatsPerDistrict > 0) {
      const hostSeats = partySeats[rule.targetPartyId] || 0;
      const transferredSeats = Math.min(hostSeats, rule.reservedSeatsPerDistrict);
      if (transferredSeats > 0) {
        partySeats[rule.targetPartyId] -= transferredSeats;
        partySeats[rule.sourcePartyId] = (partySeats[rule.sourcePartyId] || 0) + transferredSeats;
      }
    }
  }

  return {
    partySeats,
    effectivePartyVotes,
    lastSeatWinnerPartyId,
    lastSeatQuotient,
    closestChallengerPartyId,
    closestChallengerQuotient,
    votesToFlipLastSeat,
  };
}
