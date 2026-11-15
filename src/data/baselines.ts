import baseline2023Raw from './baseline2023.json';
import baseline2024Raw from './baseline2024.json';
import { BaselineDataset, BaselineId, IlceData } from '../types/election';

const BASELINE_2023 = baseline2023Raw as unknown as BaselineDataset;
const BASELINE_2024 = baseline2024Raw as unknown as BaselineDataset;

function buildBlendedBaseline(
  base23: BaselineDataset,
  base24: BaselineDataset,
  weight23 = 0.9,
  weight24 = 0.1
): BaselineDataset {
  const ilce24Map = new Map<string, IlceData>();
  for (const i of base24.ilceler) {
    ilce24Map.set(i.id, i);
  }

  const blendedIlceler: IlceData[] = base23.ilceler.map((i23) => {
    const i24 = ilce24Map.get(i23.id);
    if (!i24) return i23;

    const allPartyIds = new Set<string>([
      ...Object.keys(i23.partyShares),
      ...Object.keys(i24.partyShares),
    ]);

    const rawShares: Record<string, number> = {};
    let sum = 0;
    for (const pid of allPartyIds) {
      const s23 = i23.partyShares[pid] ?? 0;
      const s24 = i24.partyShares[pid] ?? 0;
      const blended = weight23 * s23 + weight24 * s24;
      if (blended > 0) {
        rawShares[pid] = blended;
        sum += blended;
      }
    }

    const partyShares: Record<string, number> = {};
    if (sum > 0) {
      for (const [pid, val] of Object.entries(rawShares)) {
        partyShares[pid] = (val / sum) * 100;
      }
    } else {
      Object.assign(partyShares, i23.partyShares);
    }

    return {
      ...i23,
      turnout: weight23 * i23.turnout + weight24 * i24.turnout,
      validVoteRatio: weight23 * i23.validVoteRatio + weight24 * i24.validVoteRatio,
      partyShares,
    };
  });

  // Recompute nationalBaseShares and nationalBaseTurnout from blended ilceler + abroad
  let totalReg = 0;
  let totalCast = 0;
  let totalValid = 0;
  const partyVoteSums: Record<string, number> = {};

  for (const ilce of blendedIlceler) {
    totalReg += ilce.registeredVoters;
    const cast = ilce.registeredVoters * (ilce.turnout / 100);
    const valid = cast * (ilce.validVoteRatio / 100);
    totalCast += cast;
    totalValid += valid;
    for (const [pid, share] of Object.entries(ilce.partyShares)) {
      partyVoteSums[pid] = (partyVoteSums[pid] || 0) + valid * (share / 100);
    }
  }

  if (base23.abroad?.enabled && base23.abroad.registeredVoters > 0) {
    const abroadValid =
      base23.abroad.registeredVoters *
      (base23.abroad.turnout / 100) *
      (base23.abroad.validVoteRatio / 100);
    totalValid += abroadValid;
    for (const [pid, share] of Object.entries(base23.abroad.partyShares)) {
      partyVoteSums[pid] = (partyVoteSums[pid] || 0) + abroadValid * (share / 100);
    }
  }

  const nationalBaseShares: Record<string, number> = {};
  if (totalValid > 0) {
    for (const [pid, v] of Object.entries(partyVoteSums)) {
      nationalBaseShares[pid] = (v / totalValid) * 100;
    }
  }

  return {
    ...base23,
    id: 'blended_90_10',
    nationalBaseTurnout: totalReg > 0 ? (totalCast / totalReg) * 100 : base23.nationalBaseTurnout,
    nationalBaseShares,
    ilceler: blendedIlceler,
  };
}

export const BASELINE_BLENDED_90_10 = buildBlendedBaseline(BASELINE_2023, BASELINE_2024, 0.9, 0.1);

export const BASELINES: Record<Exclude<BaselineId, 'custom'>, BaselineDataset> = {
  blended_90_10: BASELINE_BLENDED_90_10,
  '2023_general': BASELINE_2023,
};

export { BASELINE_2023 };
