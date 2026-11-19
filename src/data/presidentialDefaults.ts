import {
  FinalistR2Dynamic,
  PresidentialCandidateConfig,
  PresidentialRound2Dynamics,
  PresidentialTransferSplit,
} from '../types/election';
import { CANDIDATE_COLORS } from './partyColors';

export const DEFAULT_PRESIDENTIAL_CANDIDATES: PresidentialCandidateConfig[] = [
  {
    id: 'imamoglu',
    name: 'Ekrem İmamoğlu',
    shortName: 'İMAMOĞLU',
    color: CANDIDATE_COLORS.IMAMOGLU,
    backingPartyIds: ['YENI', 'DEM', 'TIP', 'DEVA', 'DP'],
  },
  {
    id: 'erdogan',
    name: 'Recep Tayyip Erdoğan',
    shortName: 'ERDOĞAN',
    color: CANDIDATE_COLORS.ERDOGAN,
    backingPartyIds: ['AKP', 'MHP', 'BBP', 'HUDAPAR'],
  },
  {
    id: 'dervisoglu',
    name: 'Müsavat Dervişoğlu',
    shortName: 'DERVİŞOĞLU',
    color: CANDIDATE_COLORS.DERVISOGLU,
    backingPartyIds: ['IYI', 'ZP'],
  },
  {
    id: 'erbakan',
    name: 'Fatih Erbakan',
    shortName: 'ERBAKAN',
    color: CANDIDATE_COLORS.ERBAKAN,
    backingPartyIds: ['YRP', 'SAADET'],
  },
  {
    id: 'agiralioglu',
    name: 'Yavuz Ağıralioğlu',
    shortName: 'AĞIRALİOĞLU',
    color: CANDIDATE_COLORS.AGIRALIOGLU,
    backingPartyIds: ['A'],
  },
  {
    id: 'kilicdaroglu',
    name: 'Kemal Kılıçdaroğlu',
    shortName: 'KILIÇDAROĞLU',
    color: CANDIDATE_COLORS.KILICDAROGLU_LIVE,
    backingPartyIds: ['CHP'],
  },
  {
    id: 'other',
    name: 'Bağımsız / Diğer',
    shortName: 'DİĞER',
    color: CANDIDATE_COLORS.OTHER,
    backingPartyIds: ['OTHER'],
    isOther: true,
  },
];

/**
 * Derive candidate vote shares directly by summing their backing parties' shares.
 */
export function deriveCandidateSharesFromParties(
  candidates: PresidentialCandidateConfig[],
  partyShares: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  let sum = 0;
  for (const c of candidates) {
    let cSum = 0;
    for (const pid of c.backingPartyIds) {
      cSum += Math.max(0, partyShares[pid] ?? 0);
    }
    result[c.id] = Number(cSum.toFixed(2));
    sum += result[c.id];
  }
  // Ensure clean 100.00 rounding if minor floating drift exists
  if (sum > 0 && Math.abs(sum - 100) <= 0.15) {
    const otherCandidate = candidates.find((c) => c.isOther) || candidates[candidates.length - 1];
    if (otherCandidate) {
      result[otherCandidate.id] = Number(Math.max(0, result[otherCandidate.id] + (100 - sum)).toFixed(2));
    }
  }
  return result;
}

/**
 * Ideological preset for 2nd-round transfers based on eliminated candidate vs finalists.
 * Returns { toFirstPct, toSecondPct, abstainPct } summing to 100.
 */
export function getDefaultTransferForCandidate(
  eliminatedId: string,
  firstId: string,
  secondId: string
): PresidentialTransferSplit {
  // Pair-aware affinity weights per candidate bloc
  const AFFINITY: Record<string, Record<string, number>> = {
    dervisoglu: { erdogan: 0.22, imamoglu: 0.48, agiralioglu: 0.55, erbakan: 0.20, kilicdaroglu: 0.42, abstain: 0.22 },
    agiralioglu: { erdogan: 0.36, imamoglu: 0.34, dervisoglu: 0.60, erbakan: 0.45, kilicdaroglu: 0.24, abstain: 0.20 },
    erbakan: { erdogan: 0.55, imamoglu: 0.25, dervisoglu: 0.35, agiralioglu: 0.50, kilicdaroglu: 0.18, abstain: 0.18 },
    kilicdaroglu: { erdogan: 0.08, imamoglu: 0.80, dervisoglu: 0.55, agiralioglu: 0.35, erbakan: 0.20, abstain: 0.16 },
    erdogan: { imamoglu: 0.14, dervisoglu: 0.42, agiralioglu: 0.62, erbakan: 0.72, kilicdaroglu: 0.10, abstain: 0.22 },
    imamoglu: { erdogan: 0.12, dervisoglu: 0.55, agiralioglu: 0.38, erbakan: 0.22, kilicdaroglu: 0.78, abstain: 0.18 },
    other: { erdogan: 0.35, imamoglu: 0.40, dervisoglu: 0.40, agiralioglu: 0.38, erbakan: 0.35, kilicdaroglu: 0.35, abstain: 0.25 },
  };

  const prefs = AFFINITY[eliminatedId] || AFFINITY.other;
  const w1 = prefs[firstId] ?? 0.35;
  const w2 = prefs[secondId] ?? 0.35;
  const abstain = Math.round((prefs.abstain ?? 0.20) * 100);
  const activePool = 100 - abstain;

  if (w1 + w2 <= 0) {
    const half = Math.floor(activePool / 2);
    return { toFirstPct: half, toSecondPct: activePool - half, abstainPct: abstain };
  }

  const toFirstPct = Math.round((w1 / (w1 + w2)) * activePool);
  const toSecondPct = activePool - toFirstPct;
  return { toFirstPct, toSecondPct, abstainPct: abstain };
}

export function buildDefaultTransferMatrix(
  candidates: PresidentialCandidateConfig[],
  firstId: string,
  secondId: string
): Record<string, PresidentialTransferSplit> {
  const matrix: Record<string, PresidentialTransferSplit> = {};
  for (const c of candidates) {
    if (c.id === firstId || c.id === secondId) continue;
    matrix[c.id] = getDefaultTransferForCandidate(c.id, firstId, secondId);
  }
  return matrix;
}

export function buildDefaultPresidentialR2Dynamics(
  candidates: PresidentialCandidateConfig[],
  neutral = false
): PresidentialRound2Dynamics {
  const finalistDynamics: Record<string, FinalistR2Dynamic> = {};
  for (const c of candidates) {
    finalistDynamics[c.id] = {
      retentionPct: 100,
      mobilizationPct: 0,
    };
  }
  return {
    finalistDynamics,
    geographicTransferTilt: neutral ? 0 : 30,
    abroadRound2TurnoutMultiplier: neutral ? 1.0 : 1.04,
  };
}
