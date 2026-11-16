import { LocalIncumbencyConfig, LocalProvinceBonus } from '../types/election';

/**
 * Calibrated municipal incumbency / strong-candidate bonuses (percentage points).
 * Grounded against 2024 Mayor-vs-Council gaps (~60-70% conservative attenuation)
 * so parliamentary swings still drive flips while personal local strength matters.
 */
export const DEFAULT_LOCAL_INCUMBENCY_BONUSES: Record<string, LocalProvinceBonus> = {
  '50': {
    partyId: 'IYI',
    bonusPp: 12.0,
    note: 'Nevşehir — Güçlü aday / eski başkan etkisi (2024 meclis %17.8 → başkanlık ~%52.0)',
  },
  '03': {
    partyId: 'YENI',
    bonusPp: 9.0,
    note: 'Afyonkarahisar — Güçlü aday primi (2024 meclis %25.6 → başkanlık ~%50.7)',
  },
  '02': {
    partyId: 'YENI',
    bonusPp: 8.5,
    note: 'Adıyaman — Güçlü aday primi (2024 meclis %29.2 → başkanlık ~%49.7)',
  },
  '37': {
    partyId: 'YENI',
    bonusPp: 8.0,
    note: 'Kastamonu — Güçlü aday primi (2024 meclis %30.1 → başkanlık ~%49.2)',
  },
  '66': {
    partyId: 'YRP',
    bonusPp: 8.0,
    note: 'Yozgat — Yerel aday primi (2024 meclis %12.1 → başkanlık ~%36.3)',
  },
  '06': {
    partyId: 'YENI',
    bonusPp: 7.5,
    note: 'Ankara BB — Görevdeki başkan primi (2024 meclis %49.4 → başkanlık ~%60.4)',
  },
  '14': {
    partyId: 'YENI',
    bonusPp: 7.5,
    note: 'Bolu — Görevdeki başkan primi (2024 meclis %40.2 → başkanlık ~%52.9)',
  },
  '60': {
    partyId: 'MHP',
    bonusPp: 7.0,
    note: 'Tokat — Güçlü aday primi (2024 meclis %38.9 → başkanlık ~%54.9)',
  },
  '58': {
    partyId: 'BBP',
    bonusPp: 6.5,
    note: 'Sivas — Yerel aday primi (2024 meclis %30.5 → başkanlık ~%43.3)',
  },
  '63': {
    partyId: 'YRP',
    bonusPp: 5.0,
    note: 'Şanlıurfa BB — Yerel aday primi (2024 meclis %29.9 → başkanlık ~%38.9)',
  },
  '43': {
    partyId: 'YENI',
    bonusPp: 4.5,
    note: 'Kütahya — Aday etkisi (2024 meclis %19.6 → başkanlık ~%29.7)',
  },
  '71': {
    partyId: 'YENI',
    bonusPp: 4.0,
    note: 'Kırıkkale — Görevdeki başkan / aday etkisi',
  },
  '34': {
    partyId: 'YENI',
    bonusPp: 3.5,
    note: 'İstanbul BB — Görevdeki başkan primi (2024 meclis %45.8 → başkanlık ~%51.1)',
  },
  '26': {
    partyId: 'YENI',
    bonusPp: 3.5,
    note: 'Eskişehir BB — Kurumsal belediyecilik primi',
  },
  '09': {
    partyId: 'YENI',
    bonusPp: 3.5,
    note: 'Aydın BB — Görevdeki başkan primi',
  },
};

export function buildDefaultLocalIncumbencyConfig(): LocalIncumbencyConfig {
  const provinceBonuses: Record<string, LocalProvinceBonus> = {};
  for (const [provId, entry] of Object.entries(DEFAULT_LOCAL_INCUMBENCY_BONUSES)) {
    provinceBonuses[provId] = { ...entry };
  }
  return {
    intensityPct: 100,
    provinceBonuses,
  };
}
