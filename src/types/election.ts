export type BaselineId = '2023_general' | '2024_local' | 'custom';
export type SwingMode = 'proportional' | 'uniform';
export type DHondtMode = '2022_separate' | '2018_alliance';
export type MapLayerMode = '81_il' | '87_district' | '973_ilce';
export type MapColorMode = 'leader' | 'alliance' | 'margin' | 'turnout' | 'swing';
export type Language = 'tr' | 'en';

export interface PartyConfig {
  id: string;
  shortName: string;
  fullName: string;
  color: string;
  allianceId: string | null;
  isCustom?: boolean;
  isOther?: boolean;
}

export interface AllianceConfig {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

export interface JointListRule {
  id: string;
  enabled: boolean;
  sourcePartyId: string; // Party withdrawing its separate list in specified districts
  targetPartyId: string; // Host party whose list they run on
  districtIds: string[]; // Empty array or ['ALL'] or specific district IDs like ['34-1', '06-2']
  maxDistrictMpThreshold?: number; // Optional: apply automatically to districts with <= N MPs
  transferEfficiency: number; // 0 to 100 (%)
  reservedSeatsPerDistrict: number; // Seats transferred back to sourceParty after D'Hondt if targetParty wins enough seats
}

export interface IlceData {
  id: string; // e.g., "34-kadikoy"
  name: string; // e.g., "Kadıköy"
  ilId: string; // Plate code "01".."81"
  districtId: string; // Electoral district ID, e.g., "34-1", "06-2", or "01"
  registeredVoters: number; // Seçmen sayısı
  turnout: number; // 0..100 (%)
  validVoteRatio: number; // 0..100 (%), ratio of valid votes to total cast votes
  partyShares: Record<string, number>; // partyId -> percentage (0..100)
  isLocked?: boolean;
  // Geometric coordinates for rapid map rendering and fallback polygons
  lat: number;
  lng: number;
}

export interface ElectoralDistrictConfig {
  id: string; // "01".."81", with "34-1", "34-2", "34-3", "06-1", "06-2", "06-3", "35-1", "35-2", "16-1", "16-2"
  ilId: string; // "01".."81"
  name: string; // e.g., "İstanbul 1. Bölge", "Adana"
  mpCount: number; // Number of MPs allocated to this electoral district
  isLocked?: boolean;
  lockedShares?: Record<string, number>;
  lockedTurnout?: number;
  lockedRegisteredVoters?: number;
}

export interface ProvinceConfig {
  id: string; // "01".."81"
  plateCode: number; // 1..81
  name: string; // e.g., "Adana", "İstanbul"
  region: string; // Marmara, Ege, İç Anadolu, Akdeniz, Karadeniz, Doğu Anadolu, Güneydoğu Anadolu
  districtIds: string[]; // Usually [id], or ["34-1", "34-2", "34-3"]
  lat: number;
  lng: number;
}

export interface AbroadVoteConfig {
  enabled: boolean;
  syncWithNationalSwing: boolean;
  registeredVoters: number;
  turnout: number; // 0..100 (%)
  validVoteRatio: number; // 0..100 (%)
  partyShares: Record<string, number>; // partyId -> percentage (0..100)
}

export interface BaselineDataset {
  id: BaselineId;
  nameTr: string;
  nameEn: string;
  provinces: ProvinceConfig[];
  districts: ElectoralDistrictConfig[];
  ilceler: IlceData[];
  abroad: AbroadVoteConfig;
  nationalBaseShares: Record<string, number>;
  nationalBaseTurnout: number;
}

export interface ComputedIlceResult {
  id: string;
  name: string;
  ilId: string;
  districtId: string;
  registeredVoters: number;
  turnout: number;
  totalVotesCast: number;
  validVotes: number;
  partyVotes: Record<string, number>;
  partyShares: Record<string, number>;
  leadingPartyId: string;
  runnerUpPartyId: string;
  marginVotes: number;
  marginPct: number;
  isLocked: boolean;
}

export interface DHondtQuotientEntry {
  partyId: string;
  divisor: number;
  quotient: number;
  rank: number;
  wonSeat: boolean;
}

export interface ComputedDistrictResult {
  id: string;
  ilId: string;
  name: string;
  mpCount: number;
  registeredVoters: number;
  turnout: number;
  domesticValidVotes: number;
  abroadValidVotesAdded: number;
  totalValidVotes: number;
  domesticPartyVotes: Record<string, number>;
  abroadPartyVotes: Record<string, number>;
  totalPartyVotes: Record<string, number>;
  effectivePartyVotes: Record<string, number>; // After joint list transfers
  partyShares: Record<string, number>; // Domestic + Abroad valid vote %
  domesticPartyShares: Record<string, number>;
  partySeats: Record<string, number>; // Final seats after D'Hondt & joint list reservations
  leadingPartyId: string;
  runnerUpPartyId: string;
  marginPct: number;
  lastSeatWinnerPartyId: string;
  lastSeatQuotient: number;
  closestChallengerPartyId: string;
  closestChallengerQuotient: number;
  votesToFlipLastSeat: number;
  pctToFlipLastSeat: number;
  isLocked: boolean;
}

export interface ComputedProvinceResult {
  id: string;
  plateCode: number;
  name: string;
  mpCount: number;
  registeredVoters: number;
  turnout: number;
  domesticValidVotes: number;
  abroadValidVotesAdded: number;
  totalValidVotes: number;
  partyVotes: Record<string, number>;
  partyShares: Record<string, number>;
  partySeats: Record<string, number>;
  leadingPartyId: string;
  runnerUpPartyId: string;
  marginPct: number;
  districtIds: string[];
}

export interface ComputedElectionProjection {
  domesticRegisteredVoters: number;
  domesticVotesCast: number;
  domesticValidVotes: number;
  domesticTurnout: number;
  abroadRegisteredVoters: number;
  abroadValidVotes: number;
  totalRegisteredVoters: number;
  totalValidVotes: number;
  totalTurnout: number;
  nationalPartyVotes: Record<string, number>; // Domestic + Abroad
  nationalPartyShares: Record<string, number>; // 0..100
  domesticPartyVotes: Record<string, number>;
  domesticPartyShares: Record<string, number>;
  abroadPartyVotes: Record<string, number>;
  abroadPartyShares: Record<string, number>;
  allianceVotes: Record<string, number>;
  allianceShares: Record<string, number>;
  alliancePassedThreshold: Record<string, boolean>;
  partyPassedThreshold: Record<string, boolean>;
  partyTotalSeats: Record<string, number>;
  allianceTotalSeats: Record<string, number>;
  totalSeatsAllocated: number;
  ilceResults: Record<string, ComputedIlceResult>;
  districtResults: Record<string, ComputedDistrictResult>;
  provinceResults: Record<string, ComputedProvinceResult>;
  closestDistrictRaces: ComputedDistrictResult[];
}
