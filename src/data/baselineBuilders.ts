import {
  AbroadVoteConfig,
  BaselineDataset,
  IlceData,
} from '../types/election';

export const EMPTY_BASELINE_STUB: BaselineDataset = {
  id: 'blended_90_10',
  nameTr: 'Yükleniyor...',
  nameEn: 'Loading...',
  provinces: [],
  districts: [],
  ilceler: [],
  abroad: {
    enabled: false,
    syncWithNationalSwing: true,
    registeredVoters: 0,
    turnout: 50,
    validVoteRatio: 98,
    partyShares: {},
  },
  nationalBaseShares: {},
  nationalBaseTurnout: 85,
};

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

export function dealias2023IlceShares(ilce: IlceData): Record<string, number> {
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

export function summarizeNationalFromIlceler(
  ilceler: IlceData[],
  abroad?: AbroadVoteConfig
): { nationalBaseShares: Record<string, number>; nationalBaseTurnout: number } {
  let totalReg = 0;
  let totalCast = 0;
  let totalValid = 0;
  const partyVoteSums: Record<string, number> = {};

  for (const ilce of ilceler) {
    totalReg += ilce.registeredVoters;
    const cast = ilce.registeredVoters * (ilce.turnout / 100);
    const valid = cast * (ilce.validVoteRatio / 100);
    totalCast += cast;
    totalValid += valid;
    for (const [pid, share] of Object.entries(ilce.partyShares)) {
      partyVoteSums[pid] = (partyVoteSums[pid] || 0) + valid * (share / 100);
    }
  }

  if (abroad?.enabled && abroad.registeredVoters > 0) {
    const abroadValid =
      abroad.registeredVoters * (abroad.turnout / 100) * (abroad.validVoteRatio / 100);
    totalValid += abroadValid;
    for (const [pid, share] of Object.entries(abroad.partyShares)) {
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
    nationalBaseShares,
    nationalBaseTurnout: totalReg > 0 ? (totalCast / totalReg) * 100 : 85.0,
  };
}

export function buildBlendedBaseline(
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

  const { nationalBaseShares, nationalBaseTurnout } = summarizeNationalFromIlceler(
    blendedIlceler,
    base23.abroad
  );

  return {
    ...base23,
    id: 'blended_90_10',
    nationalBaseTurnout,
    nationalBaseShares,
    ilceler: blendedIlceler,
  };
}

// Default YENİ / CHP split ratio aligned with Kalkülüs default scenario (32.61 vs 2.96)
const YENI_TO_CHP_LOCAL_RATIO = 32.61 / (32.61 + 2.96);

function splitChpIntoYeniAndChp(shares: Record<string, number>): Record<string, number> {
  const chpVal = shares.CHP ?? 0;
  const yeniVal = shares.YENI ?? 0;
  const nextShares = { ...shares };

  if (yeniVal === 0 && chpVal > 0) {
    const yeniPortion = Number((chpVal * YENI_TO_CHP_LOCAL_RATIO).toFixed(2));
    const chpPortion = Number((chpVal - yeniPortion).toFixed(2));
    nextShares.YENI = yeniPortion;
    nextShares.CHP = chpPortion;
  }
  return nextShares;
}

export function split2024ChpForYeni(base24: BaselineDataset): BaselineDataset {
  const ilceler: IlceData[] = base24.ilceler.map(
    ({ mayorPartyShares: _mDrop, mayorOtherMaxCandidateRatio: _rDrop, ...i24 }) => ({
      ...i24,
      partyShares: splitChpIntoYeniAndChp(i24.partyShares),
    })
  );

  const { nationalBaseShares, nationalBaseTurnout } = summarizeNationalFromIlceler(ilceler);

  return {
    ...base24,
    id: '2024_local',
    nameTr: '31 Mart 2024 Yerel Seçim bazı',
    nameEn: 'March 31, 2024 Local Election baseline',
    provinces: base24.provinces.map(({ mayorPartyShares: _pDrop, ...rest }) => rest),
    ilceler,
    abroad: {
      ...base24.abroad,
      enabled: false,
    },
    nationalBaseTurnout,
    nationalBaseShares,
  };
}

export function buildLocal5050Blend(
  base23: BaselineDataset,
  base24Local: BaselineDataset
): BaselineDataset {
  const blended = buildBlendedBaseline(base23, base24Local, 0.5, 0.5);
  return {
    ...blended,
    id: 'local_50_50',
    nameTr: '%50 2024 Yerel + %50 2023 Genel bazı',
    nameEn: '50% 2024 Local + 50% 2023 General baseline',
    abroad: {
      ...blended.abroad,
      enabled: false,
    },
  };
}

const PARTIES_ABSENT_2019 = new Set(['YRP', 'ZP', 'TIP', 'A']);

function computeProvinceShareMap(
  ilceler: IlceData[],
  shareGetter: (i: IlceData) => Record<string, number>
): Record<string, Record<string, number>> {
  const acc: Record<string, { valid: number; votes: Record<string, number> }> = {};
  for (const ilce of ilceler) {
    const valid = ilce.registeredVoters * (ilce.turnout / 100) * (ilce.validVoteRatio / 100);
    if (!acc[ilce.ilId]) acc[ilce.ilId] = { valid: 0, votes: {} };
    acc[ilce.ilId].valid += valid;
    const shares = shareGetter(ilce);
    for (const [pid, s] of Object.entries(shares)) {
      acc[ilce.ilId].votes[pid] = (acc[ilce.ilId].votes[pid] || 0) + valid * (s / 100);
    }
  }
  const out: Record<string, Record<string, number>> = {};
  for (const [ilId, data] of Object.entries(acc)) {
    out[ilId] = {};
    if (data.valid > 0) {
      for (const [pid, v] of Object.entries(data.votes)) {
        out[ilId][pid] = (v / data.valid) * 100;
      }
    }
  }
  return out;
}

/**
 * De-alias 2019 Cumhur (AKP/MHP) & Millet (CHP/IYI) joint council-list withdrawals using
 * un-aliased 2023+2024 province party ratios, then split CHP heritage into YENİ/CHP.
 */
function buildDealiasedPairSplit(
  s19A: number,
  s19B: number,
  refA: number,
  refB: number
): [number, number] | null {
  const aSuppressed = refA >= 2.0 && s19A < 0.5 * refA && s19B >= 0.95 * refB;
  const bSuppressed = refB >= 2.0 && s19B < 0.5 * refB && s19A >= 0.95 * refA;
  if (!aSuppressed && !bSuppressed) return null;
  const refSum = refA + refB;
  if (refSum <= 0) return null;
  return [refA / refSum, refB / refSum];
}

export function buildThreeWayLocalBlend(
  base24Local: BaselineDataset,
  base23: BaselineDataset,
  base19: BaselineDataset,
  w24 = 0.5,
  w23 = 0.3,
  w19 = 0.2
): BaselineDataset {
  // Use un-aliased 2023 General shares as party-ratio reference (2024 also had local council withdrawals)
  const prov23 = computeProvinceShareMap(base23.ilceler, (i) => dealias2023IlceShares(i));
  const prov19 = computeProvinceShareMap(base19.ilceler, (i) => i.partyShares);

  const cumSplitByProv: Record<string, [number, number] | null> = {};
  const milSplitByProv: Record<string, [number, number] | null> = {};
  const demAbsentIn2019 = new Set<string>();

  for (const prov of base24Local.provinces) {
    const p23 = prov23[prov.id] || {};
    const p19 = prov19[prov.id] || {};

    cumSplitByProv[prov.id] = buildDealiasedPairSplit(
      p19.AKP ?? 0,
      p19.MHP ?? 0,
      p23.AKP ?? 0,
      p23.MHP ?? 0
    );

    milSplitByProv[prov.id] = buildDealiasedPairSplit(
      p19.CHP ?? 0,
      p19.IYI ?? 0,
      p23.CHP ?? 0,
      p23.IYI ?? 0
    );

    if ((p19.DEM ?? 0) < 0.05) {
      demAbsentIn2019.add(prov.id);
    }
  }

  const ilce23Map = new Map(base23.ilceler.map((i) => [i.id, i]));
  const ilce19Map = new Map(base19.ilceler.map((i) => [i.id, i]));
  const w24_23Sum = w24 + w23;

  const blendedIlceler: IlceData[] = base24Local.ilceler.map((i24) => {
    const i23 = ilce23Map.get(i24.id);
    const i19 = ilce19Map.get(i24.id);
    if (!i23 || !i19) return i24;

    const s24Map = i24.partyShares;
    const s23Map = dealias2023IlceShares(i23);
    const raw19 = { ...i19.partyShares };

    const cumSplit = cumSplitByProv[i24.ilId];
    if (cumSplit) {
      const cumTotal = (raw19.AKP ?? 0) + (raw19.MHP ?? 0);
      raw19.AKP = cumTotal * cumSplit[0];
      raw19.MHP = cumTotal * cumSplit[1];
    }

    const milSplit = milSplitByProv[i24.ilId];
    if (milSplit) {
      const milTotal = (raw19.CHP ?? 0) + (raw19.IYI ?? 0);
      raw19.CHP = milTotal * milSplit[0];
      raw19.IYI = milTotal * milSplit[1];
    }

    const s19Map = splitChpIntoYeniAndChp(raw19);
    const allPartyIds = new Set<string>([
      ...Object.keys(s24Map),
      ...Object.keys(s23Map),
      ...Object.keys(s19Map),
    ]);

    const combined: Record<string, number> = {};
    let sum = 0;
    for (const pid of allPartyIds) {
      const v24 = s24Map[pid] ?? 0;
      const v23 = s23Map[pid] ?? 0;
      const v19 = s19Map[pid] ?? 0;
      const skip2019 =
        PARTIES_ABSENT_2019.has(pid) || (pid === 'DEM' && demAbsentIn2019.has(i24.ilId));

      const val =
        skip2019 && w24_23Sum > 0
          ? (w24 * v24 + w23 * v23) / w24_23Sum
          : w24 * v24 + w23 * v23 + w19 * v19;

      if (val > 0) {
        combined[pid] = val;
        sum += val;
      }
    }

    const partyShares: Record<string, number> = {};
    if (sum > 0) {
      for (const [pid, val] of Object.entries(combined)) {
        partyShares[pid] = (val / sum) * 100;
      }
    } else {
      Object.assign(partyShares, s24Map);
    }

    return {
      ...i24,
      turnout: w24 * i24.turnout + w23 * i23.turnout + w19 * i19.turnout,
      validVoteRatio: w24 * i24.validVoteRatio + w23 * i23.validVoteRatio + w19 * i19.validVoteRatio,
      partyShares,
    };
  });

  const { nationalBaseShares, nationalBaseTurnout } = summarizeNationalFromIlceler(blendedIlceler);

  return {
    ...base24Local,
    id: 'local_50_30_20',
    nameTr: '%50 2024 Yerel + %30 2023 Genel + %20 2019 Yerel bazı',
    nameEn: '50% 2024 Local + 30% 2023 General + 20% 2019 Local baseline',
    ilceler: blendedIlceler,
    abroad: {
      ...base24Local.abroad,
      enabled: false,
    },
    nationalBaseTurnout,
    nationalBaseShares,
  };
}
