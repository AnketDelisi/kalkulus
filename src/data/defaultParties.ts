import { AllianceConfig, PartyConfig } from '../types/election';

export const DEFAULT_ALLIANCES: AllianceConfig[] = [
  {
    id: 'cumhur',
    name: 'Cumhur İttifakı',
    shortName: 'CUMHUR',
    color: '#f59e0b',
  },
  {
    id: 'millet',
    name: 'Millet İttifakı',
    shortName: 'MİLLET',
    color: '#ef4444',
  },
  {
    id: 'emek',
    name: 'Emek ve Özgürlük İttifakı',
    shortName: 'EMEK',
    color: '#a855f7',
  },
  {
    id: 'ata',
    name: 'Ata İttifakı',
    shortName: 'ATA',
    color: '#06b6d4',
  },
];

export const DEFAULT_PARTIES: PartyConfig[] = [
  {
    id: 'AKP',
    shortName: 'AKP',
    fullName: 'Adalet ve Kalkınma Partisi',
    color: '#f59e0b',
    allianceId: 'cumhur',
  },
  {
    id: 'CHP',
    shortName: 'CHP',
    fullName: 'Cumhuriyet Halk Partisi',
    color: '#ef4444',
    allianceId: 'millet',
  },
  {
    id: 'MHP',
    shortName: 'MHP',
    fullName: 'Milliyetçi Hareket Partisi',
    color: '#b91c1c',
    allianceId: 'cumhur',
  },
  {
    id: 'IYI',
    shortName: 'İYİ',
    fullName: 'İYİ Parti',
    color: '#38bdf8',
    allianceId: 'millet',
  },
  {
    id: 'DEM',
    shortName: 'DEM',
    fullName: 'DEM Parti (Yeşil Sol)',
    color: '#a855f7',
    allianceId: 'emek',
  },
  {
    id: 'YRP',
    shortName: 'YRP',
    fullName: 'Yeniden Refah Partisi',
    color: '#10b981',
    allianceId: 'cumhur',
  },
  {
    id: 'ZP',
    shortName: 'ZP',
    fullName: 'Zafer Partisi',
    color: '#dc2626',
    allianceId: 'ata',
  },
  {
    id: 'TIP',
    shortName: 'TİP',
    fullName: 'Türkiye İşçi Partisi',
    color: '#be123c',
    allianceId: 'emek',
  },
  {
    id: 'BBP',
    shortName: 'BBP',
    fullName: 'Büyük Birlik Partisi',
    color: '#fb7185',
    allianceId: 'cumhur',
  },
  {
    id: 'OTHER',
    shortName: 'DİĞER',
    fullName: 'Diğer / Bağımsızlar',
    color: '#64748b',
    allianceId: null,
    isOther: true,
  },
];
