import baseline2023Raw from './baseline2023.json';
import baseline2024Raw from './baseline2024.json';
import { BaselineDataset, BaselineId, IlceData } from '../types/election';

const BASELINE_2023 = baseline2023Raw as unknown as BaselineDataset;
const BASELINE_2024 = baseline2024Raw as unknown as BaselineDataset;

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

function dealias2023IlceShares(ilce: IlceData): Record<string, number> {
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
    const baseShares23 = dealias2023IlceShares(i23);
    const i24 = ilce24Map.get(i23.id);
    if (!i24) {
      return {
        ...i23,
        partyShares: baseShares23,
      };
    }

    const allPartyIds = new Set<string>([
      ...Object.keys(baseShares23),
      ...Object.keys(i24.partyShares),
    ]);

    const rawShares: Record<string, number> = {};
    let sum = 0;
    for (const pid of allPartyIds) {
      const s23 = baseShares23[pid] ?? 0;
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
      Object.assign(partyShares, baseShares23);
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
