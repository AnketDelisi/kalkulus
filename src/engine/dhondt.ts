import { DHondtMode, HistoricalSubCircleConfig, JointListRule, PartyConfig } from '../types/election';

export interface DistrictDHondtInput {
  districtId: string;
  mpCount: number;
  partyVotes: Record<string, number>; // Raw valid votes in district (Domestic + Abroad)
  eligiblePartyIds: Set<string>; // Parties that passed the national threshold (either solo or via alliance)
  parties: PartyConfig[];
  dhondtMode: DHondtMode;
  jointListRules: JointListRule[];
  independentSplitWeights?: Record<string, number[]>;
  kontenjanSeats?: number;
  constituencyThresholdPct?: number;
  subCircles?: HistoricalSubCircleConfig[];
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
    const passedSolo = Boolean(party.thresholdExempt) || share >= thresholdPct - 1e-9;
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
 * Allocates MPs inside a single 1987/1991 Law 3270 circle:
 * 1) Constituency threshold ("çevre barajı") filters district eligibility among nationally eligible parties
 *    (if none meet it, all nationally eligible parties with >0 votes compete).
 * 2) Majority-plurality bonus seat(s) ("kontenjan milletvekili") go to #1 list in the circle.
 * 3) Remaining seats (mpCount - kSeats) are distributed via standard D'Hondt.
 */
function allocateSingleKontenjanCircle(
  votes: Record<string, number>,
  mpCount: number,
  kontenjanSeats: number,
  constituencyThresholdPct: number,
  parties: PartyConfig[],
  eligiblePartyIds: Set<string>
): Omit<DistrictDHondtOutput, 'effectivePartyVotes'> {
  const circleSeats: Record<string, number> = {};
  for (const p of parties) {
    circleSeats[p.id] = 0;
  }
  let lastSeatWinnerPartyId = '';
  let lastSeatQuotient = 0;
  let closestChallengerPartyId = '';
  let closestChallengerQuotient = 0;
  let votesToFlipLastSeat = 0;

  const rawEligible = parties.filter(
    (p) => !p.isOther && eligiblePartyIds.has(p.id) && (votes[p.id] || 0) > 0
  );
  if (rawEligible.length === 0) {
    return {
      partySeats: circleSeats,
      lastSeatWinnerPartyId,
      lastSeatQuotient,
      closestChallengerPartyId,
      closestChallengerQuotient,
      votesToFlipLastSeat,
    };
  }

  const distValidTotal =
    Object.values(votes).reduce((sum, v) => sum + Math.max(0, v), 0) || 1;
  const thresholded =
    constituencyThresholdPct > 0
      ? rawEligible.filter(
          (p) => ((votes[p.id] || 0) / distValidTotal) * 100 >= constituencyThresholdPct - 1e-9
        )
      : rawEligible;
  const competing = thresholded.length > 0 ? thresholded : rawEligible;

  const rankedByVotes = [...competing].sort((a, b) => {
    const diff = (votes[b.id] || 0) - (votes[a.id] || 0);
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });

  const kSeats = Math.min(mpCount, Math.max(0, kontenjanSeats));
  if (kSeats > 0 && rankedByVotes[0]) {
    circleSeats[rankedByVotes[0].id] = (circleSeats[rankedByVotes[0].id] || 0) + kSeats;
  }

  const remSeats = Math.max(0, mpCount - kSeats);
  if (remSeats > 0) {
    const qList: { partyId: string; divisor: number; quotient: number; votes: number }[] = [];
    for (const p of competing) {
      const v = votes[p.id] || 0;
      for (let d = 1; d <= remSeats + 1; d++) {
        qList.push({ partyId: p.id, divisor: d, quotient: v / d, votes: v });
      }
    }
    qList.sort((a, b) => {
      if (Math.abs(b.quotient - a.quotient) > 1e-6) return b.quotient - a.quotient;
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.partyId.localeCompare(b.partyId);
    });
    const remWinners = qList.slice(0, remSeats);
    const dhondtSeats: Record<string, number> = {};
    for (const w of remWinners) {
      circleSeats[w.partyId] = (circleSeats[w.partyId] || 0) + 1;
      dhondtSeats[w.partyId] = (dhondtSeats[w.partyId] || 0) + 1;
    }
    if (remWinners.length > 0) {
      const lastW = remWinners[remWinners.length - 1];
      lastSeatWinnerPartyId = lastW.partyId;
      lastSeatQuotient = lastW.quotient;
      let minFlip = Infinity;
      let bestChall = '';
      let bestQ = 0;
      for (const p of competing) {
        if (p.id === lastW.partyId) continue;
        const v = votes[p.id] || 0;
        const nextDiv = (dhondtSeats[p.id] || 0) + 1;
        const q = v / nextDiv;
        const needed = Math.floor(lastSeatQuotient * nextDiv) + 1;
        const diff = Math.max(1, needed - v);
        if (diff < minFlip || (diff === minFlip && q > bestQ)) {
          minFlip = diff;
          bestChall = p.id;
          bestQ = q;
        }
      }
      if (bestChall) {
        closestChallengerPartyId = bestChall;
        closestChallengerQuotient = bestQ;
        votesToFlipLastSeat = minFlip;
      }
    }
  } else if (rankedByVotes[0]) {
    lastSeatWinnerPartyId = rankedByVotes[0].id;
    lastSeatQuotient = votes[rankedByVotes[0].id] || 0;
    if (rankedByVotes[1]) {
      closestChallengerPartyId = rankedByVotes[1].id;
      closestChallengerQuotient = votes[rankedByVotes[1].id] || 0;
      votesToFlipLastSeat = Math.max(
        1,
        Math.floor(
          ((votes[rankedByVotes[0].id] || 0) - (votes[rankedByVotes[1].id] || 0)) / 2
        ) + 1
      );
    }
  }

  return {
    partySeats: circleSeats,
    lastSeatWinnerPartyId,
    lastSeatQuotient,
    closestChallengerPartyId,
    closestChallengerQuotient,
    votesToFlipLastSeat,
  };
}

/**
 * Allocates MPs for a single electoral district using D'Hondt.
 * Supports:
 * - Post-2022 Separate Party D'Hondt (every eligible party competes on its own district votes)
 * - 2018 Alliance Pool D'Hondt (alliances win seats as a bloc first, then distribute internally via D'Hondt)
 * - 1987/1991 Constituency Threshold + Kontenjan D'Hondt (with optional historical sub-circles)
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

    // Generate quotients up to mpCount + 1 (or single-divisor independent candidates when split weights are set)
    const allQuotients: { partyId: string; divisor: number; quotient: number; votes: number }[] = [];
    for (const p of competingParties) {
      const v = effectivePartyVotes[p.id] || 0;
      const indWeights = input.independentSplitWeights?.[p.id];
      if (indWeights) {
        for (const w of indWeights) {
          if (w > 0) {
            allQuotients.push({
              partyId: p.id,
              divisor: 1,
              quotient: v * w,
              votes: Math.round(v * w),
            });
          }
        }
      } else {
        for (let d = 1; d <= mpCount + 1; d++) {
          allQuotients.push({
            partyId: p.id,
            divisor: d,
            quotient: v / d,
            votes: v,
          });
        }
      }
    }

    // Sort descending by quotient, tie-break by raw votes, then partyId
    allQuotients.sort((a, b) => {
      if (Math.abs(b.quotient - a.quotient) > 1e-6) return b.quotient - a.quotient;
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.partyId.localeCompare(b.partyId);
    });

    const winningEntries = allQuotients.slice(0, mpCount);
    for (const entry of winningEntries) {
      partySeats[entry.partyId] = (partySeats[entry.partyId] || 0) + 1;
    }

    if (winningEntries.length > 0) {
      const lastWinner = winningEntries[winningEntries.length - 1];
      lastSeatWinnerPartyId = lastWinner.partyId;
      lastSeatQuotient = lastWinner.quotient;
      const lastWinnerVotes = lastWinner.votes;

      // Find the eligible party requiring the MINIMUM additional votes to overtake lastSeatQuotient:
      // Includes all eligible parties (even those with 0 current district votes).
      // Accounts for deterministic tie-breakers when lastSeatQuotient * nextDiv is an exact integer.
      let minVotesToFlip = Infinity;
      let bestChallengerId = '';
      let bestChallengerQuotient = 0;

      const eligibleParties = parties.filter((p) => !p.isOther && eligiblePartyIds.has(p.id));
      for (const p of eligibleParties) {
        if (p.id === lastWinner.partyId) continue;
        const indWeights = input.independentSplitWeights?.[p.id];
        const v = effectivePartyVotes[p.id] || 0;
        let q: number;
        let diff: number;

        if (indWeights) {
          const nextIdx = partySeats[p.id] || 0;
          if (nextIdx >= indWeights.length) continue;
          const nextW = indWeights[nextIdx];
          if (!nextW || nextW <= 0) continue;
          q = v * nextW;
          diff = Math.max(1, Math.ceil((lastSeatQuotient - q) / nextW));
        } else {
          const nextDiv = (partySeats[p.id] || 0) + 1;
          q = v / nextDiv;
          const T = lastSeatQuotient * nextDiv;
          const K = Math.round(T);
          let neededVotes: number;
          if (Math.abs(T - K) < 1e-6) {
            let winsTie = false;
            if (K !== lastWinnerVotes) {
              winsTie = K > lastWinnerVotes;
            } else {
              winsTie = p.id.localeCompare(lastWinner.partyId) < 0;
            }
            neededVotes = winsTie ? K : K + 1;
          } else {
            neededVotes = Math.floor(T) + 1;
          }
          diff = Math.max(1, neededVotes - v);
        }

        if (diff < minVotesToFlip || (diff === minVotesToFlip && q > bestChallengerQuotient)) {
          minVotesToFlip = diff;
          bestChallengerId = p.id;
          bestChallengerQuotient = q;
        }
      }

      if (bestChallengerId) {
        closestChallengerPartyId = bestChallengerId;
        closestChallengerQuotient = bestChallengerQuotient;
        votesToFlipLastSeat = minVotesToFlip;
      }
    }
  } else if (dhondtMode === '1987_kontenjan') {
    if (input.subCircles && input.subCircles.length > 0) {
      let bestFlip = Infinity;
      for (const circle of input.subCircles) {
        const circleVotes: Record<string, number> = {};
        for (const p of parties) {
          const factor = circle.partyRelFactors?.[p.id] ?? 1;
          circleVotes[p.id] = Math.round((effectivePartyVotes[p.id] || 0) * circle.weight * factor);
        }
        const res = allocateSingleKontenjanCircle(
          circleVotes,
          circle.mpCount,
          circle.kontenjanSeats,
          circle.constituencyThresholdPct,
          parties,
          eligiblePartyIds
        );
        for (const p of parties) {
          partySeats[p.id] = (partySeats[p.id] || 0) + (res.partySeats[p.id] || 0);
        }
        if (res.lastSeatWinnerPartyId && (res.votesToFlipLastSeat < bestFlip || bestFlip === Infinity)) {
          bestFlip = res.votesToFlipLastSeat;
          lastSeatWinnerPartyId = res.lastSeatWinnerPartyId;
          lastSeatQuotient = res.lastSeatQuotient;
          closestChallengerPartyId = res.closestChallengerPartyId;
          closestChallengerQuotient = res.closestChallengerQuotient;
          votesToFlipLastSeat = res.votesToFlipLastSeat;
        }
      }
    } else {
      const res = allocateSingleKontenjanCircle(
        effectivePartyVotes,
        mpCount,
        input.kontenjanSeats ?? 0,
        input.constituencyThresholdPct ?? 0,
        parties,
        eligiblePartyIds
      );
      for (const p of parties) {
        partySeats[p.id] = res.partySeats[p.id] || 0;
      }
      lastSeatWinnerPartyId = res.lastSeatWinnerPartyId;
      lastSeatQuotient = res.lastSeatQuotient;
      closestChallengerPartyId = res.closestChallengerPartyId;
      closestChallengerQuotient = res.closestChallengerQuotient;
      votesToFlipLastSeat = res.votesToFlipLastSeat;
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
    blocQuotients.sort((a, b) => {
      if (Math.abs(b.quotient - a.quotient) > 1e-6) return b.quotient - a.quotient;
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.blocId.localeCompare(b.blocId);
    });

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
        internalQ.sort((a, b) => {
          if (Math.abs(b.quotient - a.quotient) > 1e-6) return b.quotient - a.quotient;
          if (b.votes !== a.votes) return b.votes - a.votes;
          return a.partyId.localeCompare(b.partyId);
        });
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
    flatPartyQ.sort((a, b) => {
      if (Math.abs(a.quotient - b.quotient) > 1e-6) return a.quotient - b.quotient;
      if (a.votes !== b.votes) return a.votes - b.votes;
      return a.partyId.localeCompare(b.partyId);
    });
    let lastWinnerVotes = 0;
    if (flatPartyQ.length > 0) {
      lastSeatWinnerPartyId = flatPartyQ[0].partyId;
      lastSeatQuotient = flatPartyQ[0].quotient;
      lastWinnerVotes = flatPartyQ[0].votes;
    }

    let minVotesToFlip = Infinity;
    let bestChallengerId = '';
    let bestChallengerQuotient = 0;

    for (const p of parties) {
      if (p.isOther || !eligiblePartyIds.has(p.id) || p.id === lastSeatWinnerPartyId) continue;
      const v = effectivePartyVotes[p.id] || 0;
      const nextDiv = (partySeats[p.id] || 0) + 1;
      const q = v / nextDiv;
      const T = lastSeatQuotient * nextDiv;
      const K = Math.round(T);
      let needed: number;
      if (Math.abs(T - K) < 1e-6) {
        let winsTie = false;
        if (K !== lastWinnerVotes) {
          winsTie = K > lastWinnerVotes;
        } else {
          winsTie = p.id.localeCompare(lastSeatWinnerPartyId) < 0;
        }
        needed = winsTie ? K : K + 1;
      } else {
        needed = Math.floor(T) + 1;
      }
      const diff = Math.max(1, needed - v);
      if (diff < minVotesToFlip || (diff === minVotesToFlip && q > bestChallengerQuotient)) {
        minVotesToFlip = diff;
        bestChallengerId = p.id;
        bestChallengerQuotient = q;
      }
    }

    if (bestChallengerId) {
      closestChallengerPartyId = bestChallengerId;
      closestChallengerQuotient = bestChallengerQuotient;
      votesToFlipLastSeat = minVotesToFlip;
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

  // Update lastSeatWinnerPartyId if the host party transferred all its won seats
  if (lastSeatWinnerPartyId && (partySeats[lastSeatWinnerPartyId] || 0) === 0) {
    const appliedRule = activeJointRules.find(
      (r) => r.targetPartyId === lastSeatWinnerPartyId && r.reservedSeatsPerDistrict > 0
    );
    if (appliedRule && (partySeats[appliedRule.sourcePartyId] || 0) > 0) {
      lastSeatWinnerPartyId = appliedRule.sourcePartyId;
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
