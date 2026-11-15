import { AllianceConfig, PartyConfig } from '../types/election';

export const DEFAULT_ALLIANCES: AllianceConfig[] = [
  {
    id: 'cumhur',
    name: 'Cumhur İttifakı',
    shortName: 'CUMHUR',
    color: '#f59e0b',
  },
  {
    id: 'emek',
    name: 'Emek ve Özgürlük İttifakı',
    shortName: 'EMEK',
    color: '#a855f7',
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
    allianceId: null,
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
    allianceId: null,
  },
  {
    id: 'DEM',
    shortName: 'DEM',
    fullName: 'DEM Parti',
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
    allianceId: null,
  },
  {
    id: 'TIP',
    shortName: 'TİP',
    fullName: 'Türkiye İşçi Partisi',
    color: '#be123c',
    allianceId: 'emek',
  },
  {
    id: 'A',
    shortName: 'A',
    fullName: 'Anahtar Parti',
    color: '#192B4F',
    allianceId: null,
    proxyWeights: { IYI: 0.75, AKP: 0.25 },
  },
  {
    id: 'YENI',
    shortName: 'YENİ',
    fullName: 'Yeni Parti',
    color: '#ED1C24',
    allianceId: null,
    proxyWeights: { CHP: 1.0 },
  },
  {
    id: 'SAADET',
    shortName: 'SAADET',
    fullName: 'Saadet Partisi',
    color: '#FF2E84',
    allianceId: null,
    proxyWeights: { YRP: 1.0 },
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
