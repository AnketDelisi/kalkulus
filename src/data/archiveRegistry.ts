import {
  AllianceConfig,
  ArchiveCategory,
  ArchiveComparisonRef,
  ArchiveElectionId,
  DHondtMode,
  ElectionMode,
  PartyConfig,
  PresidentialCandidateConfig,
} from '../types/election';
import { RawBaselineKey } from './baselineCache';
import { DEFAULT_ALLIANCES, DEFAULT_PARTIES } from './defaultParties';
import { ALLIANCE_COLORS, CANDIDATE_COLORS, PARTY_COLORS } from './partyColors';
import {
  CUSTOM_DISTRICTS_1987,
  CUSTOM_DISTRICTS_1991,
  CustomDistrictSpec,
  ILCE_MERGES_1987,
  ILCE_MERGES_1991,
  ILCE_PROVINCE_OVERRIDES_1987,
  ILCE_PROVINCE_OVERRIDES_1991,
} from './historicalElectoralRegions';

export interface ArchiveElectionConfig {
  id: ArchiveElectionId;
  year:
    | 1987
    | 1991
    | 1995
    | 1999
    | 2002
    | 2007
    | 2009
    | 2010
    | 2011
    | 2014
    | 2015
    | 2017
    | 2018
    | 2019
    | 2023
    | 2024;
  category: ArchiveCategory;
  /** Chronologically previous same-type election used as the default cross-election comparison. */
  defaultCompareId?: ArchiveElectionId;
  historicalGovTr?: string;
  historicalGovEn?: string;
  presCandidates?: PresidentialCandidateConfig[];
  baselineKey: RawBaselineKey;
  shortLabelTr: string;
  shortLabelEn: string;
  dateLabelTr: string;
  dateLabelEn: string;
  deltaLabelTr: string;
  deltaLabelEn: string;
  defaultMode: ElectionMode;
  supportsWhatIfParl: boolean;
  dhondtMode: DHondtMode;
  thresholdPct: number;
  abroadEnabled: boolean;
  alliances: AllianceConfig[];
  parties: PartyConfig[];
  provinceMergeMap?: Record<string, string>;
  ilceProvinceOverrides?: Record<string, string>;
  districtOverrides?: Record<string, string>;
  districtMergeMap?: Record<string, string>;
  districtRenameMap?: Record<string, { id: string; name: string }>;
  districtMpOverrides?: Record<string, number>;
  customDistricts?: CustomDistrictSpec[];
  ilceMergeMap?: Record<string, string>;
}

const VP_PARTY: PartyConfig = {
  id: 'VP',
  shortName: 'VP',
  fullName: 'Vatan Partisi',
  color: PARTY_COLORS.VP,
  logoUrl: 'logos/VP.svg',
  allianceId: null,
};

const TKP_PARTY: PartyConfig = {
  id: 'TKP',
  shortName: 'TKP',
  fullName: 'Türkiye Komünist Partisi',
  color: PARTY_COLORS.TKP,
  logoUrl: 'logos/TKP.svg',
  allianceId: null,
};

const HAS_PARTY: PartyConfig = {
  id: 'HAS',
  shortName: 'HAS',
  fullName: 'Halkın Sesi Partisi',
  color: PARTY_COLORS.HAS,
  logoUrl: 'logos/HAS.svg',
  allianceId: null,
};

const GP_PARTY: PartyConfig = {
  id: 'GP',
  shortName: 'GP',
  fullName: 'Genç Parti',
  color: PARTY_COLORS.GP,
  logoUrl: 'logos/GP.svg',
  allianceId: null,
};

const BTP_PARTY: PartyConfig = {
  id: 'BTP',
  shortName: 'BTP',
  fullName: 'Bağımsız Türkiye Partisi',
  color: PARTY_COLORS.BTP,
  logoUrl: 'logos/BTP.svg',
  allianceId: null,
};

const ANAP_PARTY: PartyConfig = {
  id: 'ANAP',
  shortName: 'ANAP',
  fullName: 'Anavatan Partisi',
  color: PARTY_COLORS.ANAP,
  logoUrl: 'logos/ANAP.svg',
  allianceId: null,
};

const DSP_PARTY: PartyConfig = {
  id: 'DSP',
  shortName: 'DSP',
  fullName: 'Demokratik Sol Parti',
  color: PARTY_COLORS.DSP,
  logoUrl: 'logos/DSP.svg',
  allianceId: null,
};

const YTP_PARTY: PartyConfig = {
  id: 'YTP',
  shortName: 'YTP',
  fullName: 'Yeni Türkiye Partisi',
  color: PARTY_COLORS.YTP,
  logoUrl: 'logos/YTP.svg',
  allianceId: null,
};

const IND_PARTY: PartyConfig = {
  id: 'IND',
  shortName: 'BĞMSZ',
  fullName: 'Bağımsız Adaylar',
  color: PARTY_COLORS.IND,
  allianceId: null,
  thresholdExempt: true,
};

const ODP_PARTY: PartyConfig = {
  id: 'ODP',
  shortName: 'ÖDP',
  fullName: 'Özgürlük ve Dayanışma Partisi',
  color: PARTY_COLORS.ODP,
  logoUrl: 'logos/ODP.svg',
  allianceId: null,
};

const MP_PARTY: PartyConfig = {
  id: 'MP',
  shortName: 'MP',
  fullName: 'Millet Partisi',
  color: PARTY_COLORS.MP,
  logoUrl: 'logos/MP.svg',
  allianceId: null,
};

const IDP_PARTY: PartyConfig = {
  id: 'IDP',
  shortName: 'IDP',
  fullName: 'Islahatçı Demokrasi Partisi',
  color: PARTY_COLORS.IDP,
  logoUrl: 'logos/IDP.svg',
  allianceId: null,
};

export const BUYUKSEHIR_2009_IDS = new Set([
  '01',
  '06',
  '07',
  '16',
  '21',
  '25',
  '26',
  '27',
  '33',
  '34',
  '35',
  '38',
  '41',
  '42',
  '54',
  '55',
]);

const ILCE_MERGES_2015: Record<string, string> = {
  '30-derecik': '30-semdinli',
  '08-kemalpasa': '08-hopa',
  '68-sultanhani': '68-merkez',
};
const ILCE_MERGES_2014 = ILCE_MERGES_2015;

const PROV_MERGES_1991: Record<string, string> = {
  '81': '14',
  '80': '01',
  '79': '27',
  '78': '67',
  '77': '34',
  '76': '36',
  '75': '36',
};

const PROV_MERGES_1987: Record<string, string> = {
  ...PROV_MERGES_1991,
  '74': '67',
  '73': '56',
  '72': '56',
  '71': '06',
  '70': '42',
  '69': '29',
  '68': '51',
};

const ILCE_MERGES_2011: Record<string, string> = {
  ...ILCE_MERGES_2015,
  '10-altieylul': '10-karesi',
  '20-merkezefendi': '20-pamukkale',
  '31-defne': '31-antakya',
  '31-arsuz': '31-i-skenderun',
  '31-payas': '31-dortyol',
  '45-sehzadeler': '45-yunusemre',
  '46-dulkadiroglu': '46-onikisubat',
  '48-seydikemer': '48-fethiye',
  '59-kapakli': '59-cerkezkoy',
  '59-ergene': '59-corlu',
  '63-haliliye': '63-eyyubiye',
  '63-karakopru': '63-eyyubiye',
  '65-tusba': '65-i-pekyolu',
  '67-kilimli': '67-merkez',
  '67-kozlu': '67-merkez',
};

const ILCE_MERGES_2007: Record<string, string> = {
  ...ILCE_MERGES_2011,
  '01-cukurova': '01-seyhan',
  '01-saricam': '01-yuregir',
  '06-pursaklar': '06-kecioren',
  '07-aksu': '07-muratpasa',
  '07-dosemealti': '07-muratpasa',
  '07-kepez': '07-muratpasa',
  '07-konyaalti': '07-muratpasa',
  '21-baglar': '21-sur',
  '21-kayapinar': '21-sur',
  '21-yenisehir': '21-sur',
  '25-palandoken': '25-yakutiye',
  '25-aziziye': '25-yakutiye',
  '26-tepebasi': '26-odunpazari',
  '33-mezitli': '33-akdeniz',
  '33-toroslar': '33-akdeniz',
  '33-yenisehir': '33-akdeniz',
  '34-atasehir': '34-kadikoy',
  '34-cekmekoy': '34-umraniye',
  '34-sancaktepe': '34-umraniye',
  '34-sultangazi': '34-gaziosmanpasa',
  '34-arnavutkoy': '34-catalca',
  '34-basaksehir': '34-kucukcekmece',
  '34-beylikduzu': '34-buyukcekmece',
  '34-esenyurt': '34-buyukcekmece',
  '35-karabaglar': '35-konak',
  '35-bayrakli': '35-karsiyaka',
  '41-basiskele': '41-i-zmit',
  '41-kartepe': '41-i-zmit',
  '41-cayirova': '41-gebze',
  '41-darica': '41-gebze',
  '41-dilovasi': '41-gebze',
  '54-arifiye': '54-adapazari',
  '54-erenler': '54-adapazari',
  '54-serdivan': '54-adapazari',
  '55-atakum': '55-i-lkadim',
  '55-canik': '55-i-lkadim',
};

function buildPartiesForArchive(
  includedIds: string[],
  overrides: Record<string, Partial<PartyConfig>> = {},
  extraParties: PartyConfig[] = []
): PartyConfig[] {
  const byId = new Map<string, PartyConfig>();
  for (const p of DEFAULT_PARTIES) {
    byId.set(p.id, p);
  }
  for (const p of extraParties) {
    byId.set(p.id, p);
  }

  const result: PartyConfig[] = [];
  for (const id of includedIds) {
    const base = byId.get(id);
    if (!base) continue;
    const ov = overrides[id];
    result.push(ov ? { ...base, ...ov } : { ...base });
  }
  return result;
}

const MILLET_ALLIANCE: AllianceConfig = {
  id: 'millet',
  name: 'Millet İttifakı',
  shortName: 'MİLLET',
  color: ALLIANCE_COLORS.millet,
};

const ATA_ALLIANCE: AllianceConfig = {
  id: 'ata',
  name: 'ATA İttifakı',
  shortName: 'ATA',
  color: ALLIANCE_COLORS.ata,
};

const MP_COUNTS_2023_OVERRIDES: Record<string, number> = {
  '06-3': 12,
  '07': 17,
  '16-1': 10,
  '25': 6,
  '26': 6,
  '31': 11,
  '34-2': 27,
  '43': 5,
  '48': 7,
  '62': 1,
  '63': 14,
  '66': 4,
  '78': 3,
};

type RawArchiveConfig = Omit<
  ArchiveElectionConfig,
  'category' | 'defaultCompareId' | 'historicalGovTr' | 'historicalGovEn'
>;

function pseudoParty(
  id: string,
  shortName: string,
  fullName: string,
  color: string,
  logoUrl?: string
): PartyConfig {
  return { id, shortName, fullName, color, ...(logoUrl ? { logoUrl } : {}), allianceId: null };
}

function presCand(
  id: string,
  name: string,
  shortName: string,
  color: string,
  partyId: string,
  logoUrl?: string
): PresidentialCandidateConfig {
  return {
    id,
    name,
    shortName,
    color,
    ...(logoUrl ? { logoUrl } : {}),
    backingPartyIds: [partyId],
  };
}

const PRES_2023_PARTIES = [
  pseudoParty('ERDOGAN', 'ERDOĞAN', 'Recep Tayyip Erdoğan', CANDIDATE_COLORS.ERDOGAN),
  pseudoParty('KILICDAROGLU', 'KILIÇDAROĞLU', 'Kemal Kılıçdaroğlu', CANDIDATE_COLORS.KILICDAROGLU),
  pseudoParty('OGAN', 'OĞAN', 'Sinan Oğan', CANDIDATE_COLORS.OGAN),
  pseudoParty('INCE', 'İNCE', 'Muharrem İnce', CANDIDATE_COLORS.INCE_MP),
];
const PRES_2023_CANDS = [
  presCand('erdogan', 'Recep Tayyip Erdoğan', 'ERDOĞAN', CANDIDATE_COLORS.ERDOGAN, 'ERDOGAN'),
  presCand('kilicdaroglu', 'Kemal Kılıçdaroğlu', 'KILIÇDAROĞLU', CANDIDATE_COLORS.KILICDAROGLU, 'KILICDAROGLU'),
  presCand('ogan', 'Sinan Oğan', 'OĞAN', CANDIDATE_COLORS.OGAN, 'OGAN'),
  presCand('ince', 'Muharrem İnce', 'İNCE', CANDIDATE_COLORS.INCE_MP, 'INCE'),
];
const PRES_2023_R2_PARTIES = PRES_2023_PARTIES.slice(0, 2);
const PRES_2023_R2_CANDS = PRES_2023_CANDS.slice(0, 2);

const PRES_2018_PARTIES = [
  pseudoParty('ERDOGAN', 'ERDOĞAN', 'Recep Tayyip Erdoğan', CANDIDATE_COLORS.ERDOGAN),
  pseudoParty('INCE', 'İNCE', 'Muharrem İnce', CANDIDATE_COLORS.INCE_CHP),
  pseudoParty('DEMIRTAS', 'DEMİRTAŞ', 'Selahattin Demirtaş', CANDIDATE_COLORS.DEMIRTAS),
  pseudoParty('AKSENER', 'AKŞENER', 'Meral Akşener', CANDIDATE_COLORS.AKSENER),
  pseudoParty('KARAMOLLAOGLU', 'KARAMOLLAOĞLU', 'Temel Karamollaoğlu', CANDIDATE_COLORS.KARAMOLLAOGLU),
  pseudoParty('PERINCEK', 'PERİNÇEK', 'Doğu Perinçek', CANDIDATE_COLORS.PERINCEK),
];
const PRES_2018_CANDS = [
  presCand('erdogan', 'Recep Tayyip Erdoğan', 'ERDOĞAN', CANDIDATE_COLORS.ERDOGAN, 'ERDOGAN'),
  presCand('ince', 'Muharrem İnce', 'İNCE', CANDIDATE_COLORS.INCE_CHP, 'INCE'),
  presCand('demirtas', 'Selahattin Demirtaş', 'DEMİRTAŞ', CANDIDATE_COLORS.DEMIRTAS, 'DEMIRTAS'),
  presCand('aksener', 'Meral Akşener', 'AKŞENER', CANDIDATE_COLORS.AKSENER, 'AKSENER'),
  presCand('karamollaoglu', 'Temel Karamollaoğlu', 'KARAMOLLAOĞLU', CANDIDATE_COLORS.KARAMOLLAOGLU, 'KARAMOLLAOGLU'),
  presCand('perincek', 'Doğu Perinçek', 'PERİNÇEK', CANDIDATE_COLORS.PERINCEK, 'PERINCEK'),
];

const PRES_2014_PARTIES = [
  pseudoParty('ERDOGAN', 'ERDOĞAN', 'Recep Tayyip Erdoğan', CANDIDATE_COLORS.ERDOGAN),
  pseudoParty('IHSANOGLU', 'İHSANOĞLU', 'Ekmeleddin İhsanoğlu', CANDIDATE_COLORS.IHSANOGLU),
  pseudoParty('DEMIRTAS', 'DEMİRTAŞ', 'Selahattin Demirtaş', CANDIDATE_COLORS.DEMIRTAS),
];
const PRES_2014_CANDS = [
  presCand('erdogan', 'Recep Tayyip Erdoğan', 'ERDOĞAN', CANDIDATE_COLORS.ERDOGAN, 'ERDOGAN'),
  presCand('ihsanoglu', 'Ekmeleddin İhsanoğlu', 'İHSANOĞLU', CANDIDATE_COLORS.IHSANOGLU, 'IHSANOGLU'),
  presCand('demirtas', 'Selahattin Demirtaş', 'DEMİRTAŞ', CANDIDATE_COLORS.DEMIRTAS, 'DEMIRTAS'),
];

const REF_2017_PARTIES = [
  pseudoParty('EVET', 'EVET', 'Evet', CANDIDATE_COLORS.EVET, 'logos/evet2017.svg'),
  pseudoParty('HAYIR', 'HAYIR', 'Hayır', CANDIDATE_COLORS.HAYIR, 'logos/hayir2017.svg'),
];
const REF_2017_CANDS = [
  presCand('evet', 'Evet', 'EVET', CANDIDATE_COLORS.EVET, 'EVET', 'logos/evet2017.svg'),
  presCand('hayir', 'Hayır', 'HAYIR', CANDIDATE_COLORS.HAYIR, 'HAYIR', 'logos/hayir2017.svg'),
];

const REF_2010_PARTIES = [
  pseudoParty('EVET', 'EVET', 'Evet', CANDIDATE_COLORS.EVET),
  pseudoParty('HAYIR', 'HAYIR', 'Hayır', CANDIDATE_COLORS.HAYIR),
];
const REF_2010_CANDS = [
  presCand('evet', 'Evet', 'EVET', CANDIDATE_COLORS.EVET, 'EVET'),
  presCand('hayir', 'Hayır', 'HAYIR', CANDIDATE_COLORS.HAYIR, 'HAYIR'),
];

function presArchive(
  id: ArchiveElectionId,
  year: ArchiveElectionConfig['year'],
  baselineKey: RawBaselineKey,
  labels: { shortTr: string; shortEn: string; dateTr: string; dateEn: string; deltaTr: string; deltaEn: string },
  parties: PartyConfig[],
  cands: PresidentialCandidateConfig[],
  ilceMergeMap?: Record<string, string>
): RawArchiveConfig {
  return {
    id,
    year,
    baselineKey,
    shortLabelTr: labels.shortTr,
    shortLabelEn: labels.shortEn,
    dateLabelTr: labels.dateTr,
    dateLabelEn: labels.dateEn,
    deltaLabelTr: labels.deltaTr,
    deltaLabelEn: labels.deltaEn,
    defaultMode: 'presidential',
    supportsWhatIfParl: false,
    dhondtMode: '2022_separate',
    thresholdPct: 0,
    abroadEnabled: true,
    ilceMergeMap,
    alliances: [],
    parties: parties.map((p) => ({ ...p })),
    presCandidates: cands.map((c) => ({ ...c, backingPartyIds: [...c.backingPartyIds] })),
  };
}

const RAW_ARCHIVE_ELECTIONS: Record<ArchiveElectionId, RawArchiveConfig> = {
  '2023_pres_r2': presArchive(
    '2023_pres_r2',
    2023,
    '2023_pres_r2',
    {
      shortTr: '2023 CB 2. Tur',
      shortEn: '2023 Pres R2',
      dateTr: '28 Mayıs 2023 Cumhurbaşkanlığı 2. Tur',
      dateEn: 'May 28, 2023 Presidential Runoff',
      deltaTr: '2023 2.T',
      deltaEn: '2023 R2',
    },
    PRES_2023_R2_PARTIES,
    PRES_2023_R2_CANDS
  ),
  '2023_pres_r1': presArchive(
    '2023_pres_r1',
    2023,
    '2023_pres_r1',
    {
      shortTr: '2023 CB 1. Tur',
      shortEn: '2023 Pres R1',
      dateTr: '14 Mayıs 2023 Cumhurbaşkanlığı 1. Tur',
      dateEn: 'May 14, 2023 Presidential Round 1',
      deltaTr: '2023 1.T',
      deltaEn: '2023 R1',
    },
    PRES_2023_PARTIES,
    PRES_2023_CANDS
  ),
  '2018_pres': presArchive(
    '2018_pres',
    2018,
    '2018_pres',
    {
      shortTr: '2018 CB',
      shortEn: '2018 Pres',
      dateTr: '24 Haziran 2018 Cumhurbaşkanlığı Seçimi',
      dateEn: 'June 24, 2018 Presidential Election',
      deltaTr: '2018 CB',
      deltaEn: '2018 Pres',
    },
    PRES_2018_PARTIES,
    PRES_2018_CANDS
  ),
  '2014_pres': {
    ...presArchive(
      '2014_pres',
      2014,
      '2014_pres',
      {
        shortTr: '2014 CB',
        shortEn: '2014 Pres',
        dateTr: '10 Ağustos 2014 Cumhurbaşkanlığı Seçimi',
        dateEn: 'August 10, 2014 Presidential Election',
        deltaTr: '2014 CB',
        deltaEn: '2014 Pres',
      },
      PRES_2014_PARTIES,
      PRES_2014_CANDS,
      ILCE_MERGES_2015
    ),
    districtOverrides: {
      '06-etimesgut': '06-1',
      '06-sincan': '06-1',
      '06-akyurt': '06-1',
    },
    districtMergeMap: { '06-3': '06-2', '16-2': '16-1' },
    districtRenameMap: { '16-1': { id: '16', name: 'Bursa' } },
  },
  '2017_ref': {
    ...presArchive(
      '2017_ref',
      2017,
      '2017_ref',
      {
        shortTr: '2017 Ref.',
        shortEn: '2017 Ref.',
        dateTr: '16 Nisan 2017 Anayasa Referandumu',
        dateEn: 'April 16, 2017 Constitutional Referendum',
        deltaTr: '2017 Ref',
        deltaEn: '2017 Ref',
      },
      REF_2017_PARTIES,
      REF_2017_CANDS,
      ILCE_MERGES_2015
    ),
    districtOverrides: {
      '06-etimesgut': '06-1',
      '06-sincan': '06-1',
      '06-akyurt': '06-1',
    },
    districtMergeMap: { '06-3': '06-2', '16-2': '16-1' },
    districtRenameMap: { '16-1': { id: '16', name: 'Bursa' } },
  },
  '2010_ref': {
    ...presArchive(
      '2010_ref',
      2010,
      '2010_ref',
      {
        shortTr: '2010 Ref.',
        shortEn: '2010 Ref.',
        dateTr: '12 Eylül 2010 Anayasa Referandumu',
        dateEn: 'September 12, 2010 Constitutional Referendum',
        deltaTr: '2010 Ref',
        deltaEn: '2010 Ref',
      },
      REF_2010_PARTIES,
      REF_2010_CANDS,
      ILCE_MERGES_2011
    ),
    districtOverrides: {
      '06-etimesgut': '06-1',
      '06-sincan': '06-1',
      '06-elmadag': '06-2',
    },
    districtMergeMap: { '06-3': '06-2', '16-2': '16-1' },
    districtRenameMap: { '16-1': { id: '16', name: 'Bursa' } },
  },
  '2024_local': {
    id: '2024_local',
    year: 2024,
    baselineKey: 2024,
    shortLabelTr: '2024 Yerel',
    shortLabelEn: '2024 Local',
    dateLabelTr: '31 Mart 2024 Yerel Seçimi',
    dateLabelEn: 'March 31, 2024 Local Election',
    deltaLabelTr: '2024',
    deltaLabelEn: '2024',
    defaultMode: 'local',
    supportsWhatIfParl: true,
    dhondtMode: '2022_separate',
    thresholdPct: 7.0,
    abroadEnabled: false,
    districtOverrides: { '06-gudul': '06-2' },
    districtMpOverrides: MP_COUNTS_2023_OVERRIDES,
    alliances: DEFAULT_ALLIANCES.map((a) => ({ ...a })),
    // Exclude YENI (fictional) and A (Anahtar Parti founded Oct 2024)
    parties: buildPartiesForArchive(
      ['CHP', 'AKP', 'YRP', 'DEM', 'MHP', 'IYI', 'ZP', 'SAADET', 'HUDAPAR', 'DEVA', 'BBP', 'TIP', 'DP', 'OTHER'],
      {
        CHP: { color: PARTY_COLORS.CHP },
        AKP: { allianceId: null },
        MHP: { allianceId: null },
        BBP: { allianceId: null },
        HUDAPAR: { allianceId: null },
        DEM: { allianceId: null },
        TIP: { allianceId: null },
      }
    ),
  },
  '2023_general': {
    id: '2023_general',
    year: 2023,
    baselineKey: 2023,
    shortLabelTr: '2023 Genel',
    shortLabelEn: '2023 General',
    dateLabelTr: '14 Mayıs 2023 Genel Seçimi',
    dateLabelEn: 'May 14, 2023 General Election',
    deltaLabelTr: '2023',
    deltaLabelEn: '2023',
    defaultMode: 'parliamentary',
    supportsWhatIfParl: false,
    dhondtMode: '2022_separate',
    thresholdPct: 7.0,
    abroadEnabled: true,
    districtOverrides: { '06-gudul': '06-2' },
    districtMpOverrides: MP_COUNTS_2023_OVERRIDES,
    alliances: [
      ...DEFAULT_ALLIANCES.map((a) => ({ ...a })),
      MILLET_ALLIANCE,
      ATA_ALLIANCE,
    ],
    // Exclude YENI and A; keep joint-list partners (DEVA, SAADET, DP, HUDAPAR) at 0%
    parties: buildPartiesForArchive(
      ['AKP', 'CHP', 'MHP', 'IYI', 'DEM', 'YRP', 'ZP', 'TIP', 'BBP', 'SAADET', 'HUDAPAR', 'DEVA', 'DP', 'OTHER'],
      {
        YRP: { allianceId: 'cumhur' },
        CHP: { color: PARTY_COLORS.CHP, allianceId: 'millet' },
        IYI: { allianceId: 'millet' },
        SAADET: { allianceId: 'millet' },
        DEVA: { allianceId: 'millet' },
        DP: { allianceId: 'millet' },
        ZP: { allianceId: 'ata' },
      }
    ),
  },
  '2019_local': {
    id: '2019_local',
    year: 2019,
    baselineKey: 2019,
    shortLabelTr: '2019 Yerel',
    shortLabelEn: '2019 Local',
    dateLabelTr: '31 Mart 2019 Yerel Seçimi',
    dateLabelEn: 'March 31, 2019 Local Election',
    deltaLabelTr: '2019',
    deltaLabelEn: '2019',
    defaultMode: 'local',
    supportsWhatIfParl: true,
    dhondtMode: '2018_alliance',
    thresholdPct: 10.0,
    abroadEnabled: false,
    districtOverrides: { '06-gudul': '06-2' },
    alliances: [
      DEFAULT_ALLIANCES[0], // Cumhur İttifakı
      MILLET_ALLIANCE,
    ],
    // Exclude YENI, A, ZP (2021), DEVA (2020), YRP (did not run in 2019 local); DEM -> HDP; include TKP
    parties: buildPartiesForArchive(
      ['AKP', 'CHP', 'IYI', 'MHP', 'DEM', 'SAADET', 'BBP', 'DP', 'TKP', 'HUDAPAR', 'TIP', 'OTHER'],
      {
        DEM: {
          shortName: 'HDP',
          fullName: 'Halkların Demokratik Partisi',
          logoUrl: 'logos/HDP.svg',
          allianceId: null,
        },
        CHP: { color: PARTY_COLORS.CHP, allianceId: 'millet' },
        IYI: { allianceId: 'millet' },
        SAADET: { allianceId: null },
        DP: { allianceId: null },
        HUDAPAR: { allianceId: null },
        TIP: { allianceId: null },
      },
      [TKP_PARTY]
    ),
  },
  '2018_general': {
    id: '2018_general',
    year: 2018,
    baselineKey: 2018,
    shortLabelTr: '2018 Genel',
    shortLabelEn: '2018 General',
    dateLabelTr: '24 Haziran 2018 Genel Seçimi',
    dateLabelEn: 'June 24, 2018 General Election',
    deltaLabelTr: '2018',
    deltaLabelEn: '2018',
    defaultMode: 'parliamentary',
    supportsWhatIfParl: false,
    dhondtMode: '2018_alliance',
    thresholdPct: 10.0,
    abroadEnabled: true,
    districtOverrides: { '06-gudul': '06-2' },
    ilceMergeMap: { '30-derecik': '30-semdinli' },
    alliances: [
      DEFAULT_ALLIANCES[0], // Cumhur İttifakı
      MILLET_ALLIANCE,
    ],
    // Exclude YENI, A, ZP, DEVA, YRP, TIP; DEM -> HDP; include VP; keep BBP & DP at 0% in alliances
    parties: buildPartiesForArchive(
      ['AKP', 'CHP', 'DEM', 'MHP', 'IYI', 'SAADET', 'HUDAPAR', 'VP', 'BBP', 'DP', 'OTHER'],
      {
        DEM: {
          shortName: 'HDP',
          fullName: 'Halkların Demokratik Partisi',
          logoUrl: 'logos/HDP.svg',
          allianceId: null,
        },
        CHP: { color: PARTY_COLORS.CHP, allianceId: 'millet' },
        IYI: { allianceId: 'millet' },
        SAADET: { allianceId: 'millet' },
        DP: { allianceId: 'millet' },
        HUDAPAR: { allianceId: null },
      },
      [VP_PARTY]
    ),
  },
  '2015_nov': {
    id: '2015_nov',
    year: 2015,
    baselineKey: '2015_nov',
    shortLabelTr: 'Kas 2015',
    shortLabelEn: 'Nov 2015',
    dateLabelTr: '1 Kasım 2015 Genel Seçimi',
    dateLabelEn: 'November 1, 2015 General Election',
    deltaLabelTr: 'Kas 15',
    deltaLabelEn: 'Nov 15',
    defaultMode: 'parliamentary',
    supportsWhatIfParl: false,
    dhondtMode: '2022_separate',
    thresholdPct: 10.0,
    abroadEnabled: true,
    districtOverrides: {
      '06-etimesgut': '06-1',
      '06-sincan': '06-1',
      '06-akyurt': '06-1',
    },
    districtMergeMap: { '06-3': '06-2', '16-2': '16-1' },
    districtRenameMap: { '16-1': { id: '16', name: 'Bursa' } },
    ilceMergeMap: ILCE_MERGES_2015,
    alliances: [],
    parties: buildPartiesForArchive(
      ['AKP', 'CHP', 'MHP', 'DEM', 'SAADET', 'BBP', 'VP', 'DP', 'OTHER'],
      {
        AKP: { allianceId: null },
        CHP: { color: PARTY_COLORS.CHP, allianceId: null },
        MHP: { allianceId: null },
        DEM: {
          shortName: 'HDP',
          fullName: 'Halkların Demokratik Partisi',
          logoUrl: 'logos/HDP.svg',
          allianceId: null,
        },
        SAADET: { allianceId: null },
        BBP: { allianceId: null },
        DP: { allianceId: null },
      },
      [VP_PARTY]
    ),
  },
  '2015_june': {
    id: '2015_june',
    year: 2015,
    baselineKey: '2015_june',
    shortLabelTr: 'Haz 2015',
    shortLabelEn: 'Jun 2015',
    dateLabelTr: '7 Haziran 2015 Genel Seçimi',
    dateLabelEn: 'June 7, 2015 General Election',
    deltaLabelTr: 'Haz 15',
    deltaLabelEn: 'Jun 15',
    defaultMode: 'parliamentary',
    supportsWhatIfParl: false,
    dhondtMode: '2022_separate',
    thresholdPct: 10.0,
    abroadEnabled: true,
    districtOverrides: {
      '06-etimesgut': '06-1',
      '06-sincan': '06-1',
      '06-akyurt': '06-1',
    },
    districtMergeMap: { '06-3': '06-2', '16-2': '16-1' },
    districtRenameMap: { '16-1': { id: '16', name: 'Bursa' } },
    ilceMergeMap: ILCE_MERGES_2015,
    alliances: [],
    parties: buildPartiesForArchive(
      ['AKP', 'CHP', 'MHP', 'DEM', 'SAADET', 'BBP', 'VP', 'DP', 'OTHER'],
      {
        AKP: { allianceId: null },
        CHP: { color: PARTY_COLORS.CHP, allianceId: null },
        MHP: { allianceId: null },
        DEM: {
          shortName: 'HDP',
          fullName: 'Halkların Demokratik Partisi',
          logoUrl: 'logos/HDP.svg',
          allianceId: null,
        },
        SAADET: { allianceId: null },
        BBP: { allianceId: null },
        DP: { allianceId: null },
      },
      [VP_PARTY]
    ),
  },
  '2011_general': {
    id: '2011_general',
    year: 2011,
    baselineKey: 2011,
    shortLabelTr: '2011 Genel',
    shortLabelEn: '2011 General',
    dateLabelTr: '12 Haziran 2011 Genel Seçimi',
    dateLabelEn: 'June 12, 2011 General Election',
    deltaLabelTr: '2011',
    deltaLabelEn: '2011',
    defaultMode: 'parliamentary',
    supportsWhatIfParl: false,
    dhondtMode: '2022_separate',
    thresholdPct: 10.0,
    abroadEnabled: true,
    districtOverrides: {
      '06-etimesgut': '06-1',
      '06-sincan': '06-1',
      '06-elmadag': '06-2',
    },
    districtMergeMap: { '06-3': '06-2', '16-2': '16-1' },
    districtRenameMap: { '16-1': { id: '16', name: 'Bursa' } },
    ilceMergeMap: ILCE_MERGES_2011,
    alliances: [],
    parties: buildPartiesForArchive(
      ['AKP', 'CHP', 'MHP', 'DEM', 'SAADET', 'HAS', 'BBP', 'DP', 'TKP', 'OTHER'],
      {
        AKP: { allianceId: null },
        CHP: { color: PARTY_COLORS.CHP, allianceId: null },
        MHP: { allianceId: null },
        DEM: {
          shortName: 'BDP',
          fullName: 'BDP & Bağımsız Blok',
          logoUrl: 'logos/BDP.svg',
          allianceId: null,
          thresholdExempt: true,
        },
        SAADET: { allianceId: null },
        BBP: { allianceId: null },
        DP: { allianceId: null },
      },
      [HAS_PARTY, TKP_PARTY]
    ),
  },
  '2007_general': {
    id: '2007_general',
    year: 2007,
    baselineKey: 2007,
    shortLabelTr: '2007 Genel',
    shortLabelEn: '2007 General',
    dateLabelTr: '22 Temmuz 2007 Genel Seçimi',
    dateLabelEn: 'July 22, 2007 General Election',
    deltaLabelTr: '2007',
    deltaLabelEn: '2007',
    defaultMode: 'parliamentary',
    supportsWhatIfParl: false,
    dhondtMode: '2022_separate',
    thresholdPct: 10.0,
    abroadEnabled: true,
    districtOverrides: {
      '06-etimesgut': '06-1',
      '06-sincan': '06-1',
      '06-elmadag': '06-2',
    },
    districtMergeMap: { '06-3': '06-2', '16-2': '16-1' },
    districtRenameMap: { '16-1': { id: '16', name: 'Bursa' } },
    ilceMergeMap: ILCE_MERGES_2007,
    alliances: [],
    parties: buildPartiesForArchive(
      ['AKP', 'CHP', 'MHP', 'DP', 'DEM', 'GP', 'SAADET', 'BTP', 'VP', 'TKP', 'OTHER'],
      {
        AKP: { allianceId: null },
        CHP: { color: PARTY_COLORS.CHP, allianceId: null },
        MHP: { allianceId: null },
        DP: { allianceId: null },
        DEM: {
          shortName: 'BĞMSZ',
          fullName: 'DTP & Bağımsız Adaylar',
          logoUrl: 'logos/BDP.svg',
          allianceId: null,
          thresholdExempt: true,
        },
        SAADET: { allianceId: null },
        VP: { shortName: 'İP', fullName: 'İşçi Partisi', allianceId: null },
      },
      [GP_PARTY, BTP_PARTY, VP_PARTY, TKP_PARTY]
    ),
  },
  '2002_general': {
    id: '2002_general',
    year: 2002,
    baselineKey: 2002,
    shortLabelTr: '2002 Genel',
    shortLabelEn: '2002 General',
    dateLabelTr: '3 Kasım 2002 Genel Seçimi',
    dateLabelEn: 'November 3, 2002 General Election',
    deltaLabelTr: '2002',
    deltaLabelEn: '2002',
    defaultMode: 'parliamentary',
    supportsWhatIfParl: false,
    dhondtMode: '2022_separate',
    thresholdPct: 10.0,
    abroadEnabled: true,
    districtOverrides: {
      '06-etimesgut': '06-1',
      '06-sincan': '06-1',
      '06-elmadag': '06-2',
    },
    districtMergeMap: { '06-3': '06-2', '16-2': '16-1' },
    districtRenameMap: { '16-1': { id: '16', name: 'Bursa' } },
    ilceMergeMap: ILCE_MERGES_2007,
    alliances: [],
    parties: buildPartiesForArchive(
      ['AKP', 'CHP', 'DP', 'MHP', 'GP', 'DEM', 'ANAP', 'SAADET', 'DSP', 'YTP', 'BBP', 'IND', 'OTHER'],
      {
        AKP: { allianceId: null },
        CHP: { color: PARTY_COLORS.CHP, allianceId: null },
        DP: {
          shortName: 'DYP',
          fullName: 'Doğru Yol Partisi',
          logoUrl: 'logos/DYP.svg',
          allianceId: null,
        },
        MHP: { allianceId: null },
        DEM: {
          shortName: 'DEHAP',
          fullName: 'Demokratik Halk Partisi',
          logoUrl: 'logos/BDP.svg',
          allianceId: null,
          thresholdExempt: false,
        },
        SAADET: { allianceId: null },
        BBP: { allianceId: null },
      },
      [GP_PARTY, ANAP_PARTY, DSP_PARTY, YTP_PARTY, IND_PARTY]
    ),
  },
  '1999_general': {
    id: '1999_general',
    year: 1999,
    baselineKey: 1999,
    shortLabelTr: '1999 Genel',
    shortLabelEn: '1999 General',
    dateLabelTr: '18 Nisan 1999 Genel Seçimi',
    dateLabelEn: 'April 18, 1999 General Election',
    deltaLabelTr: '1999',
    deltaLabelEn: '1999',
    defaultMode: 'parliamentary',
    supportsWhatIfParl: false,
    dhondtMode: '2022_separate',
    thresholdPct: 10.0,
    abroadEnabled: true,
    provinceMergeMap: { '81': '14' },
    districtOverrides: {
      '06-etimesgut': '06-1',
      '06-sincan': '06-1',
      '34-zeytinburnu': '34-3',
      '35-kemalpasa': '35-1',
    },
    districtMergeMap: { '06-3': '06-2', '16-2': '16-1', '81': '14' },
    districtRenameMap: { '16-1': { id: '16', name: 'Bursa' } },
    ilceMergeMap: ILCE_MERGES_2007,
    alliances: [],
    parties: buildPartiesForArchive(
      ['DSP', 'MHP', 'SAADET', 'ANAP', 'DP', 'CHP', 'DEM', 'BBP', 'IND', 'ODP', 'MP', 'VP', 'OTHER'],
      {
        CHP: { color: PARTY_COLORS.CHP, allianceId: null },
        MHP: { allianceId: null },
        SAADET: {
          shortName: 'FP',
          fullName: 'Fazilet Partisi',
          logoUrl: 'logos/FP.svg',
          allianceId: null,
        },
        DP: {
          shortName: 'DYP',
          fullName: 'Doğru Yol Partisi',
          logoUrl: 'logos/DYP.svg',
          allianceId: null,
        },
        DEM: {
          shortName: 'HADEP',
          fullName: 'Halkın Demokrasi Partisi',
          logoUrl: 'logos/HADEP.svg',
          allianceId: null,
          thresholdExempt: false,
        },
        BBP: { allianceId: null },
        VP: { shortName: 'İP', fullName: 'İşçi Partisi', allianceId: null },
      },
      [DSP_PARTY, ANAP_PARTY, IND_PARTY, ODP_PARTY, MP_PARTY, VP_PARTY]
    ),
  },
  '1995_general': {
    id: '1995_general',
    year: 1995,
    baselineKey: 1995,
    shortLabelTr: '1995 Genel',
    shortLabelEn: '1995 General',
    dateLabelTr: '24 Aralık 1995 Genel Seçimi',
    dateLabelEn: 'December 24, 1995 General Election',
    deltaLabelTr: '1995',
    deltaLabelEn: '1995',
    defaultMode: 'parliamentary',
    supportsWhatIfParl: false,
    dhondtMode: '2022_separate',
    thresholdPct: 10.0,
    abroadEnabled: true,
    provinceMergeMap: { '81': '14', '80': '01' },
    districtOverrides: {
      '06-etimesgut': '06-1',
      '06-sincan': '06-1',
      '34-zeytinburnu': '34-3',
      '35-kemalpasa': '35-1',
    },
    districtMergeMap: { '06-3': '06-2', '16-2': '16-1', '81': '14', '80': '01' },
    districtRenameMap: { '16-1': { id: '16', name: 'Bursa' } },
    ilceMergeMap: ILCE_MERGES_2007,
    alliances: [],
    parties: buildPartiesForArchive(
      ['SAADET', 'ANAP', 'DP', 'DSP', 'CHP', 'MHP', 'DEM', 'MP', 'VP', 'IND', 'OTHER'],
      {
        SAADET: {
          shortName: 'RP',
          fullName: 'Refah Partisi',
          logoUrl: 'logos/RP.svg',
          allianceId: null,
        },
        DP: {
          shortName: 'DYP',
          fullName: 'Doğru Yol Partisi',
          logoUrl: 'logos/DYP.svg',
          allianceId: null,
        },
        CHP: { color: PARTY_COLORS.CHP, allianceId: null },
        MHP: { allianceId: null },
        DEM: {
          shortName: 'HADEP',
          fullName: 'Halkın Demokrasi Partisi',
          logoUrl: 'logos/HADEP.svg',
          allianceId: null,
          thresholdExempt: false,
        },
        MP: { logoUrl: undefined },
        VP: { shortName: 'İP', fullName: 'İşçi Partisi', allianceId: null },
      },
      [ANAP_PARTY, DSP_PARTY, MP_PARTY, VP_PARTY, IND_PARTY]
    ),
  },
  '2014_local': {
    id: '2014_local',
    year: 2014,
    baselineKey: 2014,
    shortLabelTr: '2014 Yerel',
    shortLabelEn: '2014 Local',
    dateLabelTr: '30 Mart 2014 Yerel Seçimi',
    dateLabelEn: 'March 30, 2014 Local Election',
    deltaLabelTr: '2014 Y',
    deltaLabelEn: '2014 L',
    defaultMode: 'local',
    supportsWhatIfParl: true,
    dhondtMode: '2022_separate',
    thresholdPct: 10.0,
    abroadEnabled: false,
    districtOverrides: {
      '06-etimesgut': '06-1',
      '06-sincan': '06-1',
      '06-akyurt': '06-1',
    },
    districtMergeMap: { '06-3': '06-2', '16-2': '16-1' },
    districtRenameMap: { '16-1': { id: '16', name: 'Bursa' } },
    ilceMergeMap: ILCE_MERGES_2014,
    alliances: [],
    parties: buildPartiesForArchive(
      ['AKP', 'CHP', 'MHP', 'DEM', 'SAADET', 'BBP', 'DP', 'DSP', 'HUDAPAR', 'VP', 'TKP', 'OTHER'],
      {
        AKP: { allianceId: null },
        CHP: { color: PARTY_COLORS.CHP, allianceId: null },
        MHP: { allianceId: null },
        DEM: {
          shortName: 'BDP',
          fullName: 'Barış ve Demokrasi Partisi / HDP',
          logoUrl: 'logos/BDP.svg',
          allianceId: null,
        },
        SAADET: { allianceId: null },
        BBP: { allianceId: null },
        DP: { allianceId: null },
        HUDAPAR: { allianceId: null },
        VP: { shortName: 'İP', fullName: 'İşçi Partisi', allianceId: null },
      },
      [DSP_PARTY, VP_PARTY, TKP_PARTY]
    ),
  },
  '2009_local': {
    id: '2009_local',
    year: 2009,
    baselineKey: 2009,
    shortLabelTr: '2009 Yerel',
    shortLabelEn: '2009 Local',
    dateLabelTr: '29 Mart 2009 Yerel Seçimi',
    dateLabelEn: 'March 29, 2009 Local Election',
    deltaLabelTr: '2009',
    deltaLabelEn: '2009',
    defaultMode: 'local',
    supportsWhatIfParl: true,
    dhondtMode: '2022_separate',
    thresholdPct: 10.0,
    abroadEnabled: false,
    districtOverrides: {
      '06-etimesgut': '06-1',
      '06-sincan': '06-1',
      '06-elmadag': '06-2',
    },
    districtMergeMap: { '06-3': '06-2', '16-2': '16-1' },
    districtRenameMap: { '16-1': { id: '16', name: 'Bursa' } },
    ilceMergeMap: ILCE_MERGES_2011,
    alliances: [],
    parties: buildPartiesForArchive(
      ['AKP', 'CHP', 'MHP', 'DEM', 'SAADET', 'DP', 'DSP', 'BBP', 'ANAP', 'TKP', 'OTHER'],
      {
        AKP: { allianceId: null },
        CHP: { color: PARTY_COLORS.CHP, allianceId: null },
        MHP: { allianceId: null },
        DEM: {
          shortName: 'DTP',
          fullName: 'Demokratik Toplum Partisi',
          logoUrl: 'logos/BDP.svg',
          allianceId: null,
        },
        SAADET: { allianceId: null },
        DP: { allianceId: null },
        BBP: { allianceId: null },
      },
      [DSP_PARTY, ANAP_PARTY, TKP_PARTY]
    ),
  },
  '1991_general': {
    id: '1991_general',
    year: 1991,
    baselineKey: 1991,
    shortLabelTr: '1991 Genel',
    shortLabelEn: '1991 General',
    dateLabelTr: '20 Ekim 1991 Genel Seçimi',
    dateLabelEn: 'October 20, 1991 General Election',
    deltaLabelTr: '1991',
    deltaLabelEn: '1991',
    defaultMode: 'parliamentary',
    supportsWhatIfParl: false,
    dhondtMode: '1987_kontenjan',
    thresholdPct: 10.0,
    abroadEnabled: true,
    provinceMergeMap: PROV_MERGES_1991,
    ilceProvinceOverrides: ILCE_PROVINCE_OVERRIDES_1991,
    customDistricts: CUSTOM_DISTRICTS_1991,
    ilceMergeMap: ILCE_MERGES_1991,
    alliances: [],
    parties: buildPartiesForArchive(
      ['DP', 'ANAP', 'CHP', 'SAADET', 'DSP', 'OTHER'],
      {
        DP: {
          shortName: 'DYP',
          fullName: 'Doğru Yol Partisi',
          logoUrl: 'logos/DYP.svg',
          allianceId: null,
        },
        CHP: {
          shortName: 'SHP',
          fullName: 'Sosyaldemokrat Halkçı Parti',
          color: PARTY_COLORS.CHP,
          logoUrl: 'logos/SHP.svg',
          allianceId: null,
        },
        SAADET: {
          shortName: 'RP',
          fullName: 'Refah Partisi',
          logoUrl: 'logos/RP.svg',
          allianceId: null,
        },
      },
      [ANAP_PARTY, DSP_PARTY]
    ),
  },
  '1987_general': {
    id: '1987_general',
    year: 1987,
    baselineKey: 1987,
    shortLabelTr: '1987 Genel',
    shortLabelEn: '1987 General',
    dateLabelTr: '29 Kasım 1987 Genel Seçimi',
    dateLabelEn: 'November 29, 1987 General Election',
    deltaLabelTr: '1987',
    deltaLabelEn: '1987',
    defaultMode: 'parliamentary',
    supportsWhatIfParl: false,
    dhondtMode: '1987_kontenjan',
    thresholdPct: 10.0,
    abroadEnabled: true,
    provinceMergeMap: PROV_MERGES_1987,
    ilceProvinceOverrides: ILCE_PROVINCE_OVERRIDES_1987,
    customDistricts: CUSTOM_DISTRICTS_1987,
    ilceMergeMap: ILCE_MERGES_1987,
    alliances: [],
    parties: buildPartiesForArchive(
      ['ANAP', 'CHP', 'DP', 'DSP', 'SAADET', 'MHP', 'IDP', 'OTHER'],
      {
        CHP: {
          shortName: 'SHP',
          fullName: 'Sosyaldemokrat Halkçı Parti',
          color: PARTY_COLORS.CHP,
          logoUrl: 'logos/SHP.svg',
          allianceId: null,
        },
        DP: {
          shortName: 'DYP',
          fullName: 'Doğru Yol Partisi',
          logoUrl: 'logos/DYP.svg',
          allianceId: null,
        },
        SAADET: {
          shortName: 'RP',
          fullName: 'Refah Partisi',
          logoUrl: 'logos/RP.svg',
          allianceId: null,
        },
        MHP: {
          shortName: 'MÇP',
          fullName: 'Milliyetçi Çalışma Partisi',
          logoUrl: 'logos/MCP.svg',
          allianceId: null,
        },
      },
      [ANAP_PARTY, DSP_PARTY, IDP_PARTY]
    ),
  },
};

const ARCHIVE_META: Record<
  ArchiveElectionId,
  {
    category: ArchiveCategory;
    defaultCompareId?: ArchiveElectionId;
    gov?: [string, string];
  }
> = {
  '2024_local': {
    category: 'local',
    defaultCompareId: '2019_local',
    gov: ['CHP 1. Parti (35 İl, 14 Büyükşehir)', 'CHP first party (35 provinces, 14 metropolitan)'],
  },
  '2023_pres_r2': {
    category: 'presidential',
    defaultCompareId: '2023_pres_r1',
    gov: ['Erdoğan 3. dönem (%52,18)', 'Erdoğan third term (52.18%)'],
  },
  '2023_pres_r1': {
    category: 'presidential',
    defaultCompareId: '2018_pres',
    gov: ['İlk kez 2. tura kalındı', 'First-ever runoff'],
  },
  '2023_general': {
    category: 'general',
    defaultCompareId: '2018_general',
    gov: ['Cumhur İttifakı çoğunluğu (323 MV)', "People's Alliance majority (323 MPs)"],
  },
  '2019_local': {
    category: 'local',
    defaultCompareId: '2014_local',
    gov: ['İstanbul ve Ankara muhalefete geçti', 'Istanbul and Ankara flipped to the opposition'],
  },
  '2018_pres': {
    category: 'presidential',
    defaultCompareId: '2014_pres',
    gov: ['Cumhurbaşkanlığı sistemine geçiş', 'Start of presidential system'],
  },
  '2018_general': {
    category: 'general',
    defaultCompareId: '2015_nov',
    gov: ['Cumhurbaşkanlığı Hükümet Sistemi (344 MV Cumhur)', 'Presidential system begins (344 MPs Cumhur)'],
  },
  '2017_ref': {
    category: 'referendum',
    defaultCompareId: '2010_ref',
    gov: ['Evet %51,41 · Cumhurbaşkanlığı sistemi', 'Yes 51.41% · presidential system'],
  },
  '2015_nov': {
    category: 'general',
    defaultCompareId: '2015_june',
    gov: ['64. Hükümet: AK Parti tek başına (317 MV)', '64th Gov: AKP single-party (317 MPs)'],
  },
  '2015_june': {
    category: 'general',
    defaultCompareId: '2011_general',
    gov: ['Koalisyon kurulamadı · seçim hükümeti', 'Hung parliament · repeat election'],
  },
  '2014_pres': {
    category: 'presidential',
    gov: ['İlk halk oylamasıyla CB seçimi', 'First popularly elected president'],
  },
  '2014_local': {
    category: 'local',
    defaultCompareId: '2009_local',
    gov: ['30 Büyükşehir yasasıyla ilk yerel seçim (AK Parti %43,4)', 'First 30-metro local election (AKP 43.4%)'],
  },
  '2011_general': {
    category: 'general',
    defaultCompareId: '2007_general',
    gov: ['61. Hükümet: AK Parti (327 MV)', '61st Gov: AKP single-party (327 MPs)'],
  },
  '2010_ref': {
    category: 'referendum',
    gov: ['Evet %57,88 · 12 Eylül paketi', 'Yes 57.88% · constitutional package'],
  },
  '2009_local': {
    category: 'local',
    gov: ['16 Büyükşehir · AK Parti %38,4 · CHP %23,1', '16 metros · AKP 38.4% · CHP 23.1%'],
  },
  '2007_general': {
    category: 'general',
    defaultCompareId: '2002_general',
    gov: ['60. Hükümet: AK Parti (341 MV)', '60th Gov: AKP single-party (341 MPs)'],
  },
  '2002_general': {
    category: 'general',
    defaultCompareId: '1999_general',
    gov: ['58. Hükümet: AK Parti (363 MV · %45,3 baraj altı)', '58th Gov: AKP majority (363 MPs · 45.3% wasted)'],
  },
  '1999_general': {
    category: 'general',
    defaultCompareId: '1995_general',
    gov: ['57. Hükümet: DSP–MHP–ANAP koalisyonu', '57th Gov: DSP–MHP–ANAP coalition'],
  },
  '1995_general': {
    category: 'general',
    defaultCompareId: '1991_general',
    gov: ['ANAYOL · Refahyol · ANASOL-D', 'ANAYOL · Refahyol · ANASOL-D'],
  },
  '1991_general': {
    category: 'general',
    defaultCompareId: '1987_general',
    gov: ['49. Hükümet: DYP–SHP koalisyonu (Çevre barajı + kontenjan)', '49th Gov: DYP–SHP coalition (district baraj + bonus)'],
  },
  '1987_general': {
    category: 'general',
    gov: ['46. Hükümet: ANAP (292 MV · %36,3 oyla %64,9 koltuk)', '46th Gov: ANAP (292 MPs · 64.9% seats on 36.3% vote)'],
  },
};

export const ARCHIVE_ELECTIONS = Object.fromEntries(
  (Object.keys(RAW_ARCHIVE_ELECTIONS) as ArchiveElectionId[]).map((id) => {
    const meta = ARCHIVE_META[id];
    const cfg: ArchiveElectionConfig = {
      ...RAW_ARCHIVE_ELECTIONS[id],
      category: meta.category,
      defaultCompareId: meta.defaultCompareId,
      historicalGovTr: meta.gov?.[0],
      historicalGovEn: meta.gov?.[1],
    };
    return [id, cfg];
  })
) as Record<ArchiveElectionId, ArchiveElectionConfig>;

export const ARCHIVE_ELECTION_LIST: ArchiveElectionConfig[] = [
  ARCHIVE_ELECTIONS['2024_local'],
  ARCHIVE_ELECTIONS['2023_pres_r2'],
  ARCHIVE_ELECTIONS['2023_pres_r1'],
  ARCHIVE_ELECTIONS['2023_general'],
  ARCHIVE_ELECTIONS['2019_local'],
  ARCHIVE_ELECTIONS['2018_pres'],
  ARCHIVE_ELECTIONS['2018_general'],
  ARCHIVE_ELECTIONS['2017_ref'],
  ARCHIVE_ELECTIONS['2015_nov'],
  ARCHIVE_ELECTIONS['2015_june'],
  ARCHIVE_ELECTIONS['2014_pres'],
  ARCHIVE_ELECTIONS['2014_local'],
  ARCHIVE_ELECTIONS['2011_general'],
  ARCHIVE_ELECTIONS['2010_ref'],
  ARCHIVE_ELECTIONS['2009_local'],
  ARCHIVE_ELECTIONS['2007_general'],
  ARCHIVE_ELECTIONS['2002_general'],
  ARCHIVE_ELECTIONS['1999_general'],
  ARCHIVE_ELECTIONS['1995_general'],
  ARCHIVE_ELECTIONS['1991_general'],
  ARCHIVE_ELECTIONS['1987_general'],
];

export function getArchiveComparisonLabel(
  comparisonId: ArchiveComparisonRef | null | undefined,
  lang: 'tr' | 'en',
  fallback: string | number = 'Resmi'
): string {
  if (!comparisonId || comparisonId === 'self') {
    return String(lang === 'tr' ? (fallback === 'Resmi' ? 'Resmi' : fallback) : fallback === 'Resmi' ? 'Official' : fallback);
  }
  const cfg = ARCHIVE_ELECTIONS[comparisonId];
  return lang === 'tr' ? cfg.deltaLabelTr : cfg.deltaLabelEn;
}
