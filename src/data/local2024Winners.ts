import WINNERS_2024_ILCELER_RAW from './local2024IlceWinners.json';
import { LocalAllianceRule } from '../types/election';

/**
 * Official YSK 31 March 2024 Local Election 81-province Mayoral Winners (30 Büyükşehir + 51 İl).
 * Totals: CHP 35, AKP 24, DEM 10, MHP 8, YRP 2, IYI 1, BBP 1 = 81.
 */
export const WINNERS_2024_PROVINCES: Record<string, string> = {
  '01': 'CHP', // Adana (BB)
  '02': 'CHP', // Adıyaman
  '03': 'CHP', // Afyonkarahisar
  '04': 'DEM', // Ağrı
  '05': 'CHP', // Amasya
  '06': 'CHP', // Ankara (BB)
  '07': 'CHP', // Antalya (BB)
  '08': 'CHP', // Artvin
  '09': 'CHP', // Aydın (BB)
  '10': 'CHP', // Balıkesir (BB)
  '11': 'CHP', // Bilecik
  '12': 'AKP', // Bingöl
  '13': 'AKP', // Bitlis
  '14': 'CHP', // Bolu
  '15': 'CHP', // Burdur
  '16': 'CHP', // Bursa (BB)
  '17': 'CHP', // Çanakkale
  '18': 'MHP', // Çankırı
  '19': 'AKP', // Çorum
  '20': 'CHP', // Denizli (BB)
  '21': 'DEM', // Diyarbakır (BB)
  '22': 'CHP', // Edirne
  '23': 'AKP', // Elazığ
  '24': 'MHP', // Erzincan
  '25': 'AKP', // Erzurum (BB)
  '26': 'CHP', // Eskişehir (BB)
  '27': 'AKP', // Gaziantep (BB)
  '28': 'CHP', // Giresun
  '29': 'MHP', // Gümüşhane
  '30': 'DEM', // Hakkari
  '31': 'AKP', // Hatay (BB)
  '32': 'AKP', // Isparta
  '33': 'CHP', // Mersin (BB)
  '34': 'CHP', // İstanbul (BB)
  '35': 'CHP', // İzmir (BB)
  '36': 'MHP', // Kars
  '37': 'CHP', // Kastamonu
  '38': 'AKP', // Kayseri (BB)
  '39': 'MHP', // Kırklareli
  '40': 'CHP', // Kırşehir
  '41': 'AKP', // Kocaeli (BB)
  '42': 'AKP', // Konya (BB)
  '43': 'CHP', // Kütahya
  '44': 'AKP', // Malatya (BB)
  '45': 'CHP', // Manisa (BB)
  '46': 'AKP', // Kahramanmaraş (BB)
  '47': 'DEM', // Mardin (BB)
  '48': 'CHP', // Muğla (BB)
  '49': 'DEM', // Muş
  '50': 'IYI', // Nevşehir
  '51': 'AKP', // Niğde
  '52': 'AKP', // Ordu (BB)
  '53': 'AKP', // Rize
  '54': 'AKP', // Sakarya (BB)
  '55': 'AKP', // Samsun (BB)
  '56': 'DEM', // Siirt
  '57': 'CHP', // Sinop
  '58': 'BBP', // Sivas
  '59': 'CHP', // Tekirdağ (BB)
  '60': 'MHP', // Tokat
  '61': 'AKP', // Trabzon (BB)
  '62': 'DEM', // Tunceli
  '63': 'YRP', // Şanlıurfa (BB)
  '64': 'CHP', // Uşak
  '65': 'DEM', // Van (BB)
  '66': 'YRP', // Yozgat
  '67': 'CHP', // Zonguldak
  '68': 'AKP', // Aksaray
  '69': 'AKP', // Bayburt
  '70': 'MHP', // Karaman
  '71': 'CHP', // Kırıkkale
  '72': 'DEM', // Batman
  '73': 'AKP', // Şırnak
  '74': 'CHP', // Bartın
  '75': 'CHP', // Ardahan
  '76': 'DEM', // Iğdır
  '77': 'CHP', // Yalova
  '78': 'AKP', // Karabük
  '79': 'CHP', // Kilis
  '80': 'MHP', // Osmaniye
  '81': 'AKP', // Düzce
};

export interface ProvinceMunicipalMeta {
  ilId: string;
  isBuyuksehir: boolean;
  merkezIlceId: string | null;
}

export const WINNERS_2024_ILCELER: Record<string, string> =
  WINNERS_2024_ILCELER_RAW as Record<string, string>;

/**
 * 30 Büyükşehir municipalities lack a "Merkez" ilçe and elect mayors province-wide;
 * 51 provincial municipalities each have one "Merkez" ilçe.
 */
export const PROVINCE_MUNICIPAL_META: Record<string, ProvinceMunicipalMeta> = (() => {
  const meta: Record<string, ProvinceMunicipalMeta> = {};
  for (const ilId of Object.keys(WINNERS_2024_PROVINCES)) {
    const merkezId = `${ilId}-merkez`;
    const hasMerkez = Object.prototype.hasOwnProperty.call(WINNERS_2024_ILCELER, merkezId);
    meta[ilId] = {
      ilId,
      isBuyuksehir: !hasMerkez,
      merkezIlceId: hasMerkez ? merkezId : null,
    };
  }
  return meta;
})();

// 2024 Cumhur İttifakı ortak aday paylaşım listesi
const MHP_ALLOCATED_PROVINCES_2024 = [
  '18', // Çankırı
  '24', // Erzincan
  '29', // Gümüşhane
  '33', // Mersin (BB)
  '36', // Kars
  '39', // Kırklareli
  '45', // Manisa (BB)
  '60', // Tokat
  '70', // Karaman
  '74', // Bartın
  '80', // Osmaniye
];

const AKP_ALLOCATED_PROVINCES_2024 = Object.keys(WINNERS_2024_PROVINCES).filter(
  (id) => !MHP_ALLOCATED_PROVINCES_2024.includes(id)
);

export const DEFAULT_LOCAL_ALLIANCE_RULES: LocalAllianceRule[] = [
  {
    id: 'cumhur_mhp_to_akp',
    name: 'Cumhur Ortak Adayı (MHP → AKP)',
    enabled: false,
    mode: 'withdrawal',
    sourcePartyId: 'MHP',
    targetPartyId: 'AKP',
    provinceIds: AKP_ALLOCATED_PROVINCES_2024,
    transferEfficiency: 88,
  },
  {
    id: 'cumhur_akp_to_mhp',
    name: 'Cumhur Ortak Adayı (AKP → MHP)',
    enabled: false,
    mode: 'withdrawal',
    sourcePartyId: 'AKP',
    targetPartyId: 'MHP',
    provinceIds: MHP_ALLOCATED_PROVINCES_2024,
    transferEfficiency: 88,
  },
  {
    id: 'tactical_kent_uzlasisi',
    name: 'Kent Uzlaşısı / Taktiksel Oy (DEM → YENİ)',
    enabled: true,
    mode: 'tactical_soft',
    sourcePartyId: 'DEM',
    targetPartyId: 'YENI',
    provinceIds: ['34', '06', '35', '16', '01', '33', '07', '41', '59', '10', '20', '26', '31'],
    applyNationwide: false,
    transferEfficiency: 45,
    abstainPct: 10,
    maxMarginTriggerPct: 12,
    retainFloorPct: 35,
  },
  {
    id: 'tactical_muhalif_konsolidasyon',
    name: 'Muhalif Taktiksel Konsolidasyon (İYİ → YENİ)',
    enabled: false,
    mode: 'tactical_soft',
    sourcePartyId: 'IYI',
    targetPartyId: 'YENI',
    provinceIds: [],
    applyNationwide: true,
    transferEfficiency: 35,
    abstainPct: 5,
    maxMarginTriggerPct: 8,
    retainFloorPct: 45,
  },
];
