export type InfographicTemplate =
  | 'wiki_sheet'
  | 'social_card'
  | 'province_spotlight'
  | 'top_cards';
export type InfographicTheme = 'wiki_light' | 'kalkulus_dark';
export type InfographicAspect = '16:10' | '16:9' | '4:5' | '1:1';
export type InfographicGrouping = 'party' | 'alliance';
export type InfographicMapLayer =
  | '81_il'
  | '87_district'
  | '973_ilce'
  | 'dual_il_ilce'
  | 'abroad_world';
export type InfographicMapColor = 'leader' | 'alliance' | 'margin' | 'flips';

export interface InfographicConfig {
  template: InfographicTemplate;
  theme: InfographicTheme;
  aspect: InfographicAspect;
  grouping: InfographicGrouping;
  mapLayer: InfographicMapLayer;
  mapColorMode: InfographicMapColor;
  spotlightProvinceId: string;
  minVoteCutoffPct: number;
  showMap: boolean;
  showSeatCircles: boolean;
  showPartyLogos: boolean;
  showVisualSummary: boolean;
  showTable: boolean;
  showDeltaColumn: boolean;
  showSeatBars: boolean;
  showWatermark: boolean;
  title: string;
  subtitle: string;
  footerNote: string;
}

export interface InfographicRow {
  id: string;
  shortName: string;
  fullName: string;
  color: string;
  logoUrl?: string;
  allianceId?: string | null;
  allianceName?: string;
  votes: number;
  share: number;
  primaryStat?: number; // MPs (parl), Provinces won (pres), Total provinces won (local)
  secondaryStat?: number; // İlçeler won (local), etc.
  deltaShare?: number; // pp delta vs baseline
  deltaPrimary?: number; // seat or province delta vs baseline
  isWinner?: boolean;
}

export interface InfographicDataModel {
  mode: 'parliamentary' | 'presidential' | 'local';
  modeBadge: string;
  turnoutPct: number;
  totalValidVotes: number;
  majorityTarget?: number; // e.g., 301 for TBMM
  decidedLabel?: string;
  rows: InfographicRow[];
  totalPrimaryCount: number;
  // Color resolution keyed by entity id (ilId, districtId, ilceId)
  provinceFillById: Record<string, string>;
  districtFillById: Record<string, string>;
  ilceFillById: Record<string, string>;
  abroadCountryFillById?: Record<string, string>;
  // Seat circle data for parliamentary 81_il / 87_district maps
  partyColorMap: Record<string, string>;
  provinceSeatMap: Record<string, { seats: Record<string, number>; votes: Record<string, number> }>;
  districtSeatMap: Record<string, { seats: Record<string, number>; votes: Record<string, number> }>;
  // Selected Province Spotlight data (full İl-level breakdown!)
  spotlightProvinceName?: string;
  spotlightProvinceLeader?: { shortName: string; color: string; share: number };
  spotlightProvinceValidVotes?: number;
  spotlightProvinceTurnout?: number;
  spotlightProvinceMpCount?: number;
  spotlightRows: InfographicRow[];
}
