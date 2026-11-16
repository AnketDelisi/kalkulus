export type ElectionMode = 'parliamentary' | 'presidential' | 'local';
export type BaselineId = 'blended_90_10' | '2023_general' | 'custom';
export type LocalBaselineId = '2024_local' | 'local_50_30_20' | 'local_50_50';
export type LocalProvinceMode = 'merkez_ilce' | 'province_wide';
export type PresidentialRoundView = 'round1' | 'round2';
export type SwingMode = 'proportional' | 'uniform';
export type DHondtMode = '2022_separate' | '2018_alliance';
export type MapLayerMode = '81_il' | '87_district' | '973_ilce' | 'abroad_world';
export type MapColorMode = 'leader' | 'alliance' | 'margin' | 'turnout' | 'swing' | 'flips';
export type Language = 'tr' | 'en';

export interface PartyConfig {
  id: string;
  shortName: string;
  fullName: string;
  color: string;
  logoUrl?: string;
  allianceId: string | null;
  proxyWeights?: Record<string, number>;
  isCustom?: boolean;
  isOther?: boolean;
}

export interface AllianceConfig {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

export type BuffUnitType = 'province' | 'district' | 'ilce';

export interface LocalBuffRule {
  id: string;
  enabled: boolean;
  mode: ElectionMode;
  unitType: BuffUnitType;
  unitId: string;
  targetId: string; // partyId (parliamentary/local) or candidateId (presidential)
  sourceId?: string | null; // optional donor party/candidate; null => proportional drain from others
  bonusPp: number; // -30..+30 percentage points
  label?: string;
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

export interface AbroadCountryData {
  id: string; // ISO Alpha-3 e.g. "DEU", "USA", "KKTC", or "CUSTOMS"
  atlasName: string | null;
  nameTr: string;
  fullNameTr: string;
  nameEn: string;
  region: string;
  isCustoms: boolean;
  isInset: boolean;
  registeredVoters: number;
  turnout: number;
  validVoteRatio: number;
  validVotes: number;
  invalidVotes: number;
  partyVotes: Record<string, number>;
  partyShares: Record<string, number>;
}

export interface AbroadCountryResult {
  id: string;
  nameTr: string;
  fullNameTr: string;
  nameEn: string;
  region: string;
  isCustoms: boolean;
  isInset: boolean;
  registeredVoters: number;
  turnout: number;
  validVotes: number;
  partyVotes: Record<string, number>;
  partyShares: Record<string, number>;
  leadingPartyId: string;
  runnerUpPartyId: string;
  marginVotes: number;
  marginPct: number;
  isLocked: boolean;
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
  id: BaselineId | LocalBaselineId | string;
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
  abroadCountryResults: Record<string, AbroadCountryResult>;
  closestDistrictRaces: ComputedDistrictResult[];
}

// ================================
// PRESIDENTIAL ELECTION TYPES
// ================================

export interface PresidentialCandidateConfig {
  id: string;
  name: string;
  shortName: string;
  color: string;
  backingPartyIds: string[];
  isOther?: boolean;
}

/**
 * Second-round vote transfer split for an eliminated 1st-round candidate.
 * Values represent percentages (0..100) summing to 100.
 */
export interface PresidentialTransferSplit {
  toFirstPct: number;
  toSecondPct: number;
  abstainPct: number;
}

export interface FinalistR2Dynamic {
  /** % of Round 1 voters who turn out again in Round 2 (70..105). Default 100. */
  retentionPct: number;
  /** % of Round 1 non-voters newly mobilized for this finalist in Round 2 (0..15). Default 0. */
  mobilizationPct: number;
}

export interface PresidentialRound2Dynamics {
  /** Per-candidate R2 turnout retention & non-voter mobilization (used if candidate reaches R2) */
  finalistDynamics: Record<string, FinalistR2Dynamic>;
  /** 0..100: how strongly ilçe-level eliminated transfers tilt toward the locally stronger finalist */
  geographicTransferTilt: number;
  /** 0.50..1.50: independent Round 2 multiplier for abroad turnout */
  abroadRound2TurnoutMultiplier: number;
}

export interface PresidentialCandidateSummary {
  candidateId: string;
  votes: number;
  share: number;
  domesticVotes: number;
  abroadVotes: number;
  provincesWon: number;
  ilcelerWon: number;
}

export interface PresidentialUnitResult {
  id: string;
  name: string;
  ilId?: string;
  plateCode?: number;
  registeredVoters: number;
  turnout: number;
  validVotes: number;
  candidateVotes: Record<string, number>;
  candidateShares: Record<string, number>;
  leadingCandidateId: string;
  runnerUpCandidateId: string;
  marginVotes: number;
  marginPct: number;
  isLocked?: boolean;
}

export interface PresidentialRoundResult {
  round: 1 | 2;
  totalRegisteredVoters: number;
  totalValidVotes: number;
  domesticValidVotes: number;
  abroadValidVotes: number;
  turnout: number;
  candidateSummaries: PresidentialCandidateSummary[];
  leadingCandidateId: string;
  runnerUpCandidateId: string;
  marginVotes: number;
  marginPct: number;
  hasAbsoluteMajority: boolean; // > 50% + 1 in Round 1
  provinceResults: Record<string, PresidentialUnitResult>;
  ilceResults: Record<string, PresidentialUnitResult>;
  abroadCountryResults: Record<string, PresidentialUnitResult>;
  closestProvinces: PresidentialUnitResult[];
}

export interface ComputedPresidentialProjection {
  decidedInRound: 1 | 2;
  topTwoCandidateIds: [string, string];
  winnerCandidateId: string;
  round1: PresidentialRoundResult;
  round2: PresidentialRoundResult;
  flippedProvinceIds: string[]; // Provinces changing winner from Round 1 to Round 2
}

// ================================
// LOCAL ELECTION TYPES
// ================================

export type LocalRuleMode = 'withdrawal' | 'tactical_soft';

export interface LocalAllianceRule {
  id: string;
  name: string;
  enabled: boolean;
  /** 'withdrawal' removes sourceParty completely; 'tactical_soft' shifts voters in competitive races while keeping sourceParty on ballot */
  mode?: LocalRuleMode;
  sourcePartyId: string;
  targetPartyId: string;
  /** Province IDs ("01".."81") eligible for this rule. Empty => all (or none when applyNationwide is false). */
  provinceIds: string[];
  /** When true (useful for tactical_soft), rule applies across all 81 provinces where margin <= maxMarginTriggerPct */
  applyNationwide?: boolean;
  /** Percentage of eligible sourceParty votes transferring to targetParty (0..100). */
  transferEfficiency: number;
  /** Percentage of shifting voters who stay home instead of voting for targetParty (0..100). */
  abstainPct?: number;
  /** tactical_soft only: max preliminary |leader - runnerUp| pp gap at which tactical shift begins (default 12) */
  maxMarginTriggerPct?: number;
  /** tactical_soft only: minimum % of sourceParty's base votes retained on the ballot (default 30) */
  retainFloorPct?: number;
}

export interface LocalProvinceBonus {
  partyId: string;
  /** Percentage-point shift added before province renormalization (-15 .. +25) */
  bonusPp: number;
  note?: string;
}

export interface LocalIncumbencyConfig {
  /** Global multiplier in % (0 = off, 100 = calibrated baseline, max 150) */
  intensityPct: number;
  /** Map of provinceId ("01".."81") -> strong-candidate/incumbent bonus */
  provinceBonuses: Record<string, LocalProvinceBonus>;
}

export type LocalReferenceBaseline = 'current' | '2024';

export interface LocalDefectionEntry {
  id: string;
  unitType: 'province' | 'ilce';
  unitId: string;
  unitName: string;
  kind: 'defection' | 'kayyim';
  fromPartyId: string;
  /** Destination party ID ('AKP', 'YENI', or 'OTHER' for independent / kayyım) */
  toPartyId: string;
  enabled: boolean;
  /** Optional per-entry override (0..100%) on how much personal incumbency follows the mayor */
  personalCarryoverPct?: number;
  /** Optional per-entry override (pp) on anti-defection backlash against toPartyId */
  backlashPp?: number;
  note?: string;
}

export interface LocalDefectionConfig {
  /** Which baseline drives ± deltas & flipped indicators ('current' = after defections, default) */
  referenceBaseline: LocalReferenceBaseline;
  /** Toggle whether trustee-appointed (kayyım) seats override elected holders in 'current' mode */
  includeKayyim: boolean;
  /** Global multiplier (0..100%) for personal vote carryover when a mayor defects across blocs */
  carryoverPct: number;
  /** Global anti-defection backlash (0..8 pp) subtracted from cross-bloc defector destination */
  backlashPp: number;
  entries: LocalDefectionEntry[];
}

export interface ComputedLocalIlceResult {
  id: string;
  name: string;
  ilId: string;
  isMerkez: boolean;
  registeredVoters: number;
  turnout: number;
  validVotes: number;
  partyVotes: Record<string, number>;
  partyShares: Record<string, number>;
  winnerPartyId: string;
  runnerUpPartyId: string;
  marginVotes: number;
  marginPct: number;
  baseline2024WinnerPartyId: string;
  flippedFrom2024: boolean;
  isLocked: boolean;
}

export interface ComputedLocalProvinceResult {
  id: string;
  plateCode: number;
  name: string;
  isBuyuksehir: boolean;
  merkezIlceId: string | null;
  countingBasis: LocalProvinceMode; // Whether this winner reflects province-wide or Merkez ilçe
  registeredVoters: number;
  turnout: number;
  validVotes: number;
  partyVotes: Record<string, number>;
  partyShares: Record<string, number>;
  winnerPartyId: string;
  runnerUpPartyId: string;
  marginVotes: number;
  marginPct: number;
  winner2024PartyId: string;
  flippedFrom2024: boolean;
}

export interface LocalPartySeatSummary {
  partyId: string;
  nationalVotes: number;
  nationalShare: number;
  buyuksehirWins: number;
  ilMerkezWins: number;
  totalProvinceWins: number;
  ilceWins: number;
  deltaProvinceFrom2024: number;
  deltaIlceFrom2024: number;
}

export interface ComputedLocalProjection {
  referenceBaseline: LocalReferenceBaseline;
  totalRegisteredVoters: number;
  totalVotesCast: number;
  totalValidVotes: number;
  turnout: number;
  nationalPartyVotes: Record<string, number>;
  nationalPartyShares: Record<string, number>;
  partySummaries: Record<string, LocalPartySeatSummary>;
  provinceResults: Record<string, ComputedLocalProvinceResult>; // 81 provinces (30 BB + 51 İl)
  ilceResults: Record<string, ComputedLocalIlceResult>; // 973 ilçeler
  flippedProvinceIds: string[];
  flippedIlceIds: string[];
  closestProvinces: ComputedLocalProvinceResult[];
  closestIlces: ComputedLocalIlceResult[];
}
