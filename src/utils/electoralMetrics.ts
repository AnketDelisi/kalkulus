import { ComputedElectionProjection, PartyConfig } from '../types/election';

export interface ElectoralMetricsSummary {
  /** Percentage of valid votes cast for parties/lists winning 0 seats ("Baraj Altı / Temsil Dışı Oy %"). */
  wastedVotePct: number;
  /** Gallagher Least Squares Disproportionality Index: sqrt(0.5 * sum((Vi - Si)^2)). */
  gallagherIndex: number;
  /** Laakso-Taagepera Effective Number of Electoral Parties (by votes). */
  enep: number;
  /** Laakso-Taagepera Effective Number of Parliamentary Parties (by seats). */
  enpp: number;
  /** Count of distinct parties/blocs holding >= 1 seat. */
  seatWinningPartiesCount: number;
}

/**
 * Computes standard comparative electoral metrics live from any computed parliamentary projection:
 * - Unrepresented (wasted / below-threshold) vote share %
 * - Gallagher disproportionality index (LSq)
 * - Effective Number of Electoral & Parliamentary Parties (ENEP & ENPP)
 */
export function computeElectoralMetrics(
  projection: ComputedElectionProjection,
  parties: PartyConfig[]
): ElectoralMetricsSummary {
  const totalSeats = Math.max(0, projection.totalSeatsAllocated || 0);
  const allIds = new Set<string>([
    ...parties.map((p) => p.id),
    ...Object.keys(projection.nationalPartyShares || {}),
    ...Object.keys(projection.partyTotalSeats || {}),
  ]);

  let wastedVotePct = 0;
  let sqDiffSum = 0;
  let voteHhi = 0;
  let seatHhi = 0;
  let seatWinningPartiesCount = 0;

  for (const pid of allIds) {
    const vPct = Math.max(0, projection.nationalPartyShares[pid] || 0);
    const seats = Math.max(0, projection.partyTotalSeats[pid] || 0);
    const sPct = totalSeats > 0 ? (seats / totalSeats) * 100 : 0;

    if (seats === 0 && vPct > 0) {
      wastedVotePct += vPct;
    }
    if (seats > 0) {
      seatWinningPartiesCount += 1;
    }

    if (pid === 'OTHER') {
      // Residual "OTHER" bucket is composed of fragmented minor lists that win 0 seats each;
      // treat its Gallagher term as 1% micro-shards so it stays in wastedVotePct without skewing LSq/ENEP.
      if (vPct > 0) {
        const chunk = Math.min(1, vPct);
        const pieces = vPct / chunk;
        sqDiffSum += pieces * chunk * chunk;
      }
      continue;
    }

    const diff = vPct - sPct;
    sqDiffSum += diff * diff;

    if (vPct > 0) {
      const vFrac = vPct / 100;
      voteHhi += vFrac * vFrac;
    }
    if (sPct > 0) {
      const sFrac = sPct / 100;
      seatHhi += sFrac * sFrac;
    }
  }

  const gallagherIndex = Math.sqrt(0.5 * sqDiffSum);
  const enep = voteHhi > 0 ? 1 / voteHhi : 0;
  const enpp = seatHhi > 0 ? 1 / seatHhi : 0;

  return {
    wastedVotePct: Number(Math.max(0, Math.min(100, wastedVotePct)).toFixed(2)),
    gallagherIndex: Number(gallagherIndex.toFixed(2)),
    enep: Number(enep.toFixed(2)),
    enpp: Number(enpp.toFixed(2)),
    seatWinningPartiesCount,
  };
}
