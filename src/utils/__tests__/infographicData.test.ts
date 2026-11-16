import { describe, expect, it } from 'vitest';
import { BASELINES, LOCAL_BASELINES } from '../../data/baselines';
import { DEFAULT_ALLIANCES, DEFAULT_PARTIES } from '../../data/defaultParties';
import { DEFAULT_LOCAL_ALLIANCE_RULES } from '../../data/local2024Winners';
import { buildDefaultLocalDefectionConfig } from '../../data/localDefections';
import { buildDefaultLocalIncumbencyConfig } from '../../data/localIncumbencyDefaults';
import {
  DEFAULT_PRESIDENTIAL_CANDIDATES,
  buildDefaultPresidentialR2Dynamics,
  buildDefaultTransferMatrix,
  deriveCandidateSharesFromParties,
} from '../../data/presidentialDefaults';
import { runMultiLayerProjection } from '../../engine/swing';
import { computePresidentialProjection } from '../../engine/presidential';
import { computeLocalProjection } from '../../engine/local';
import { clampHoverPosition } from '../../components/MapHoverCard';
import { buildInfographicDataModel } from '../../components/infographic/infographicData';
import { InfographicConfig } from '../../components/infographic/infographicTypes';
import { OFFICIAL_2023_NATIONAL_SEATS } from '../../data/official2023Seats';
import { getContrastRatio, getContrastTextColor } from '../color';
import { computeHemicycleSeats } from '../hemicycleGeometry';
import { SEAT_OFFSETS_81, computeSeatClusterLayout } from '../seatCirclesGeometry';

describe('Hemicycle Geometry, Seat Circles, Hover Clamping & Infographic Data', () => {
  it('computes 600 ordered hemicycle seats with finite coordinates', () => {
    const seats = computeHemicycleSeats(
      [
        { id: 'CHP', label: 'CHP', color: '#E30A17', seats: 250 },
        { id: 'AKP', label: 'AKP', color: '#F59E0B', seats: 260 },
        { id: 'DEM', label: 'DEM', color: '#7C3AED', seats: 90 },
      ],
      { cx: 210, cy: 195, rMin: 72, rMax: 180, rows: 10, totalSeats: 600 }
    );

    expect(seats.length).toBe(600);
    for (const s of seats) {
      expect(Number.isFinite(s.x)).toBe(true);
      expect(Number.isFinite(s.y)).toBe(true);
    }
    expect(seats[0].x).toBeLessThan(210);
    expect(seats[599].x).toBeGreaterThan(210);
  });

  it('computes scaled seat circle clusters with Istanbul callout leader line', () => {
    const cluster = computeSeatClusterLayout(
      '34',
      [250, 120],
      { AKP: 40, CHP: 35, DEM: 10, YRP: 5, MHP: 8 },
      { AKP: 3500000, CHP: 3100000, DEM: 900000, YRP: 450000, MHP: 650000 },
      { AKP: '#fda000', CHP: '#E30A17', DEM: '#734B9C', YRP: '#2E8B57', MHP: '#0062A7' },
      SEAT_OFFSETS_81,
      true,
      0.8
    );

    expect(cluster).not.toBeNull();
    expect(cluster!.dots.length).toBe(98);
    expect(cluster!.leaderLine).toBeDefined();
  });

  it('clamps hover tooltip coordinates strictly within map viewport boundaries', () => {
    const insideTopLeft = clampHoverPosition(12, 12, 900, 500, 264, 200);
    expect(insideTopLeft.left).toBeGreaterThanOrEqual(10);
    expect(insideTopLeft.top).toBeGreaterThanOrEqual(10);

    const flippedBottomRight = clampHoverPosition(880, 485, 900, 500, 264, 200);
    expect(flippedBottomRight.left + 264).toBeLessThanOrEqual(900);
    expect(flippedBottomRight.top + 200).toBeLessThanOrEqual(500);
    expect(flippedBottomRight.left).toBeLessThan(880);
    expect(flippedBottomRight.top).toBeLessThan(485);
  });

  it('builds parliamentary party, alliance, seat-map, and Istanbul province-level spotlight models', () => {
    const b23 = BASELINES['2023_general'];
    const proj = runMultiLayerProjection({
      baseline: b23,
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      swingMode: 'proportional',
      dhondtMode: '2022_separate',
      thresholdPct: 7.0,
      nationalTargetShares: { ...b23.nationalBaseShares },
      nationalTargetTurnout: b23.nationalBaseTurnout,
      nationalVoterScaleFactor: 1.0,
      abroadConfig: b23.abroad,
      ilceOverrides: {},
      districtOverrides: {},
      provinceOverrides: {},
      jointListRules: [],
    });

    const baseConfig: InfographicConfig = {
      template: 'wiki_sheet',
      theme: 'wiki_light',
      aspect: '16:10',
      grouping: 'party',
      mapLayer: 'dual_il_ilce',
      mapColorMode: 'leader',
      spotlightProvinceId: '34',
      minVoteCutoffPct: 1.5,
      showMap: true,
      showSeatCircles: true,
      showPartyLogos: true,
      showVisualSummary: true,
      showTable: true,
      showDeltaColumn: true,
      showSeatBars: true,
      showWatermark: true,
      title: 'Test',
      subtitle: 'Sub',
      footerNote: 'Src',
    };

    const partyModel = buildInfographicDataModel({
      config: baseConfig,
      lang: 'tr',
      electionMode: 'parliamentary',
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      projection: proj,
      baselineProjection: proj,
      presCandidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
      presRoundView: 'round1',
      presidentialProjection: {} as never,
      localProjection: {} as never,
      localDefections: buildDefaultLocalDefectionConfig(),
    });

    const totalSeats = partyModel.rows.reduce((s, r) => s + (r.primaryStat || 0), 0);
    expect(totalSeats).toBe(600);
    expect(Object.keys(partyModel.provinceFillById).length).toBe(81);
    expect(Object.keys(partyModel.districtFillById).length).toBe(87);
    expect(Object.keys(partyModel.ilceFillById).length).toBe(973);
    expect(Object.keys(partyModel.provinceSeatMap).length).toBe(81);

    // Confirm MP deltas use official 2023 YSK results (AKP 268, CHP 169, MHP 50, IYI 43)
    const officialSum = Object.values(OFFICIAL_2023_NATIONAL_SEATS).reduce((a, b) => a + b, 0);
    expect(officialSum).toBe(600);
    const akpRow = partyModel.rows.find((r) => r.id === 'AKP')!;
    expect(akpRow.deltaPrimary).toBe((akpRow.primaryStat || 0) - 268);

    // Istanbul Spotlight returns Istanbul province-wide party results summing to 98 MPs
    const istModel = buildInfographicDataModel({
      config: { ...baseConfig, grouping: 'alliance', template: 'province_spotlight' },
      lang: 'tr',
      electionMode: 'parliamentary',
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      projection: proj,
      baselineProjection: proj,
      presCandidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
      presRoundView: 'round1',
      presidentialProjection: {} as never,
      localProjection: {} as never,
      localDefections: buildDefaultLocalDefectionConfig(),
    });

    expect(istModel.rows.some((r) => r.id.startsWith('alliance:'))).toBe(true);
    expect(istModel.spotlightProvinceName).toBe('İstanbul');
    const istSeatsSum = istModel.spotlightRows.reduce((s, r) => s + (r.primaryStat || 0), 0);
    expect(istSeatsSum).toBe(istModel.spotlightProvinceMpCount);
    expect(istSeatsSum).toBeGreaterThan(90);
    expect(istModel.spotlightRows.some((r) => Boolean(r.logoUrl))).toBe(true);
  });

  it('builds presidential and local infographic models with province-level spotlight rows', () => {
    const b23 = BASELINES['2023_general'];
    const presShares = deriveCandidateSharesFromParties(
      DEFAULT_PRESIDENTIAL_CANDIDATES,
      b23.nationalBaseShares
    );
    const presProj = computePresidentialProjection({
      baseline: b23,
      parties: DEFAULT_PARTIES,
      candidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
      swingMode: 'proportional',
      candidateTargetShares: presShares,
      targetTurnout: b23.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      abroadConfig: b23.abroad,
      provinceOverrides: {},
      ilceOverrides: {},
      transferMatrix: buildDefaultTransferMatrix(
        DEFAULT_PRESIDENTIAL_CANDIDATES,
        'imamoglu',
        'erdogan'
      ),
      round2Dynamics: buildDefaultPresidentialR2Dynamics(DEFAULT_PRESIDENTIAL_CANDIDATES),
      referencePartyWeights: b23.nationalBaseShares,
    });

    const presModel = buildInfographicDataModel({
      config: {
        template: 'province_spotlight',
        theme: 'kalkulus_dark',
        aspect: '4:5',
        grouping: 'party',
        mapLayer: '81_il',
        mapColorMode: 'leader',
        spotlightProvinceId: '06',
        minVoteCutoffPct: 0.5,
        showMap: true,
        showSeatCircles: true,
        showPartyLogos: true,
        showVisualSummary: true,
        showTable: true,
        showDeltaColumn: true,
        showSeatBars: true,
        showWatermark: true,
        title: 'CB',
        subtitle: '',
        footerNote: '',
      },
      lang: 'en',
      electionMode: 'presidential',
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      projection: {} as never,
      baselineProjection: {} as never,
      presCandidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
      presRoundView: 'round2',
      presidentialProjection: presProj,
      localProjection: {} as never,
      localDefections: buildDefaultLocalDefectionConfig(),
    });
    expect(presModel.rows.length).toBe(2);
    expect(presModel.spotlightProvinceName).toBe('Ankara');
    expect(presModel.spotlightRows.length).toBe(2);

    const locBase = LOCAL_BASELINES['2024_local'];
    const locProj = computeLocalProjection({
      baseline: locBase,
      parties: DEFAULT_PARTIES,
      swingMode: 'proportional',
      localProvinceMode: 'merkez_ilce',
      targetShares: locBase.nationalBaseShares,
      targetTurnout: locBase.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      provinceOverrides: {},
      ilceOverrides: {},
      localAllianceRules: DEFAULT_LOCAL_ALLIANCE_RULES,
      localIncumbency: buildDefaultLocalIncumbencyConfig(),
      localDefections: buildDefaultLocalDefectionConfig(),
    });
    const locModel = buildInfographicDataModel({
      config: {
        template: 'province_spotlight',
        theme: 'wiki_light',
        aspect: '16:10',
        grouping: 'party',
        mapLayer: '81_il',
        mapColorMode: 'flips',
        spotlightProvinceId: '34',
        minVoteCutoffPct: 0.5,
        showMap: true,
        showSeatCircles: true,
        showPartyLogos: true,
        showVisualSummary: true,
        showTable: true,
        showDeltaColumn: true,
        showSeatBars: true,
        showWatermark: true,
        title: 'Local',
        subtitle: '',
        footerNote: '',
      },
      lang: 'tr',
      electionMode: 'local',
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      projection: {} as never,
      baselineProjection: {} as never,
      presCandidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
      presRoundView: 'round1',
      presidentialProjection: {} as never,
      localProjection: locProj,
      localDefections: buildDefaultLocalDefectionConfig(),
    });
    const provSum = locModel.rows.reduce((s, r) => s + (r.primaryStat || 0), 0);
    expect(provSum).toBe(81);
    expect(locModel.spotlightProvinceName).toBe('İstanbul');
    expect(locModel.spotlightRows.length).toBeGreaterThan(3);
  });

  it('matches presidential candidate colors to parties and ensures accessible pill text contrast', () => {
    const partyColorById = Object.fromEntries(DEFAULT_PARTIES.map((p) => [p.id, p.color]));
    expect(partyColorById.A).toBe('#3B4CCA');
    expect(partyColorById.ZP).toBe('#6D4C3D');
    expect(partyColorById.CHP).toBe('#F08080');
    expect(partyColorById.BBP).toBe('#78716C');
    expect(partyColorById.TIP).toBe('#9F1239');
    expect(partyColorById.AKP).toBe('#F59300');
    expect(partyColorById.IYI).toBe('#0EA5E9');

    const candById = Object.fromEntries(DEFAULT_PRESIDENTIAL_CANDIDATES.map((c) => [c.id, c.color]));
    expect(candById.imamoglu).toBe(partyColorById.YENI);
    expect(candById.erdogan).toBe(partyColorById.AKP);
    expect(candById.dervisoglu).toBe(partyColorById.IYI);
    expect(candById.erbakan).toBe(partyColorById.YRP);
    expect(candById.agiralioglu).toBe(partyColorById.A);
    expect(candById.kilicdaroglu).toBe(partyColorById.CHP);

    expect(getContrastTextColor('#F59300')).toBe('#090A0F');
    expect(getContrastTextColor('#9F1239')).toBe('#FFFFFF');
    expect(getContrastTextColor('#3B4CCA')).toBe('#FFFFFF');

    for (const p of DEFAULT_PARTIES) {
      const ink = getContrastTextColor(p.color);
      expect(getContrastRatio(p.color, ink)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
