import React, { useMemo } from 'react';
import { geoMercator, geoNaturalEarth1, geoPath } from 'd3-geo';
import { GeoCollection, GeoFeature } from '../../data/geoCache';
import {
  getColoredPartyLogoDataUri,
  getKalkulusLogoDataUri,
} from '../../data/partyLogoCache';
import { Language } from '../../types/election';
import { getContrastTextColor, getDynamicPartyBoxTheme } from '../../utils/color';
import { formatInt, formatPct } from '../../utils/format';
import { computeHemicycleSeats } from '../../utils/hemicycleGeometry';
import {
  IstanbulCalloutPanel,
  buildOrderedSeatColors,
  computeMapSeatLayouts,
} from '../../utils/seatCirclesGeometry';
import {
  InfographicAspect,
  InfographicConfig,
  InfographicDataModel,
} from './infographicTypes';

export const ASPECT_DIMENSIONS: Record<InfographicAspect, { width: number; height: number }> = {
  '16:10': { width: 1600, height: 1000 },
  '16:9': { width: 1600, height: 900 },
  '4:5': { width: 1200, height: 1500 },
  '1:1': { width: 1200, height: 1200 },
};

interface InfographicSvgCanvasProps {
  svgRef?: React.RefObject<SVGSVGElement>;
  config: InfographicConfig;
  data: InfographicDataModel;
  lang: Language;
  provincesGeo: GeoCollection | null;
  districts87Geo: GeoCollection | null;
  ilcelerGeo: GeoCollection | null;
  worldGeo?: GeoCollection | null;
  logosLoadedTick?: number;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(1, maxLen - 1))}…`;
}

interface ProjectedMapPane {
  paths: { id: string; d: string; fill: string }[];
  borders: string[];
  seatClusters: {
    id: string;
    leaderLine?: { x1: number; y1: number; x2: number; y2: number };
    dots: { x: number; y: number; r: number; color: string }[];
  }[];
  istanbulPanel?: IstanbulCalloutPanel | null;
}

function buildProjectedMapPane(
  box: { x: number; y: number; w: number; h: number },
  features: GeoFeature[],
  fitCollection: GeoCollection,
  fillById: Record<string, string>,
  borderFeatures: GeoFeature[],
  seatConfig?: {
    enabled: boolean;
    seatMap: Record<string, { seats: Record<string, number>; votes: Record<string, number> }>;
    partyColorMap: Record<string, string>;
    isDistrictLayer: boolean;
  }
): ProjectedMapPane {
  if (features.length === 0) {
    return { paths: [], borders: [], seatClusters: [], istanbulPanel: null };
  }

  const proj = geoMercator();
  proj.fitExtent(
    [
      [box.x + 10, box.y + 8],
      [box.x + box.w - 10, box.y + box.h - 8],
    ],
    fitCollection as never
  );

  const pathFn = geoPath().projection(proj);
  const paths = features.map((feat) => ({
    id: feat.properties.id,
    d: pathFn(feat as never) || '',
    fill: fillById[feat.properties.id] || '#CBD5E1',
  }));
  const borders = borderFeatures.map((f) => pathFn(f as never) || '').filter(Boolean);

  let seatClusters: ProjectedMapPane['seatClusters'] = [];
  let istanbulPanel: IstanbulCalloutPanel | null = null;
  if (seatConfig?.enabled) {
    const units = features
      .map((feat) => {
        const id = feat.properties.id;
        const entry = seatConfig.seatMap[id];
        if (!entry) return null;
        return {
          id,
          ilId: feat.properties.ilId || id.split('-')[0],
          feature: feat,
          partySeats: entry.seats,
          partyVotes: entry.votes,
        };
      })
      .filter((u): u is NonNullable<typeof u> => u !== null);

    const layout = computeMapSeatLayouts({
      units,
      projection: (pt) => proj(pt),
      viewportBox: box,
      partyColorMap: seatConfig.partyColorMap,
      isDistrictLayer: seatConfig.isDistrictLayer,
    });
    seatClusters = layout.clusters.map((c) => ({
      id: c.id,
      leaderLine: c.leaderLine,
      dots: c.dots,
    }));
    istanbulPanel = layout.istanbulPanel;
  }

  return { paths, borders, seatClusters, istanbulPanel };
}

export const InfographicSvgCanvas: React.FC<InfographicSvgCanvasProps> = ({
  svgRef,
  config,
  data,
  lang,
  provincesGeo,
  districts87Geo,
  ilcelerGeo,
  worldGeo,
  logosLoadedTick,
}) => {
  void logosLoadedTick;
  const { width, height } = ASPECT_DIMENSIONS[config.aspect];
  const isDark = config.theme === 'kalkulus_dark';
  const isVertical = config.aspect === '4:5' || config.aspect === '1:1';
  const isSpotlight = config.template === 'province_spotlight';
  const isTopCards = config.template === 'top_cards';
  const isDualMap = !isSpotlight && !isTopCards && config.mapLayer === 'dual_il_ilce';

  const palette = isDark
    ? {
        bg: '#090A0F',
        panel: '#11131A',
        panelAlt: '#161923',
        headerBg: '#151822',
        border: '#2D3348',
        strongBorder: '#475569',
        ink: '#F8FAFC',
        muted: '#94A3B8',
        subtleBar: '#1E293B',
        mapBg: '#0D0F16',
        strokeMap: '#090A0F',
        pos: '#34D399',
        neg: '#FB7185',
      }
    : {
        bg: '#FFFFFF',
        panel: '#FFFFFF',
        panelAlt: '#F8F9FA',
        headerBg: '#EAECF0',
        border: '#A2A9B1',
        strongBorder: '#202122',
        ink: '#202122',
        muted: '#54595D',
        subtleBar: '#E9ECEF',
        mapBg: '#F8F9FA',
        strokeMap: '#090A0F',
        pos: '#14804A',
        neg: '#C81E1E',
      };

  // Use provincial metrics when Province Spotlight is active
  const displayRows = isSpotlight && data.spotlightRows.length > 0 ? data.spotlightRows : data.rows;
  const displayTurnout =
    isSpotlight && data.spotlightProvinceTurnout !== undefined
      ? data.spotlightProvinceTurnout
      : data.turnoutPct;
  const displayValidVotes =
    isSpotlight && data.spotlightProvinceValidVotes !== undefined
      ? data.spotlightProvinceValidVotes
      : data.totalValidVotes;
  const displayTotalSeats =
    isSpotlight && data.spotlightProvinceMpCount !== undefined
      ? data.spotlightProvinceMpCount
      : data.totalPrimaryCount;

  // Outer Layout Coordinates (slim, clean Wikipedia-style header & generous body area)
  const padX = 44;
  const headerTop = 22;
  const headerBottom = 100;
  const footerTop = config.showWatermark ? height - 34 : height - 16;
  const bodyTop = isTopCards ? 22 : headerBottom + 14;
  const bodyBottom = footerTop - 10;
  const bodyH = bodyBottom - bodyTop;

  const topCardsBox = {
    x: padX,
    y: bodyTop,
    w: width - padX * 2,
    h: isVertical ? 228 : 216,
  };

  let mapBox = { x: padX, y: bodyTop, w: 820, h: bodyH };
  let rightColBox = { x: padX + 844, y: bodyTop, w: width - padX * 2 - 844, h: bodyH };

  if (isTopCards) {
    mapBox = {
      x: padX - 12,
      y: bodyTop + topCardsBox.h + 8,
      w: width - (padX - 12) * 2,
      h: Math.max(240, bodyH - topCardsBox.h - 8),
    };
  } else if (isVertical) {
    const mapH = Math.round(bodyH * (isDualMap ? 0.39 : 0.41));
    if (config.showMap && (config.showVisualSummary || config.showTable)) {
      mapBox = { x: padX, y: bodyTop, w: width - padX * 2, h: mapH };
      rightColBox = {
        x: padX,
        y: bodyTop + mapH + 16,
        w: width - padX * 2,
        h: bodyH - mapH - 16,
      };
    } else if (config.showMap) {
      mapBox = { x: padX, y: bodyTop, w: width - padX * 2, h: bodyH };
    } else {
      rightColBox = { x: padX, y: bodyTop, w: width - padX * 2, h: bodyH };
    }
  } else if (!config.showMap) {
    rightColBox = { x: padX, y: bodyTop, w: width - padX * 2, h: bodyH };
  } else if (!config.showVisualSummary && !config.showTable) {
    mapBox = { x: padX, y: bodyTop, w: width - padX * 2, h: bodyH };
  }

  const mapInnerBox = isTopCards
    ? {
        x: mapBox.x + 4,
        y: mapBox.y + 4,
        w: mapBox.w - 8,
        h: Math.max(160, mapBox.h - 8),
      }
    : {
        x: mapBox.x + 12,
        y: mapBox.y + 34,
        w: mapBox.w - 24,
        h: Math.max(140, mapBox.h - 44),
      };

  // Sub-pane boxes for Dual İl + İlçe mode vs Single Map mode
  const dualTopBox = isVertical
    ? { x: mapInnerBox.x, y: mapInnerBox.y + 20, w: (mapInnerBox.w - 14) / 2, h: mapInnerBox.h - 24 }
    : { x: mapInnerBox.x, y: mapInnerBox.y + 20, w: mapInnerBox.w, h: (mapInnerBox.h - 44) / 2 };

  const dualBottomBox = isVertical
    ? {
        x: mapInnerBox.x + (mapInnerBox.w - 14) / 2 + 14,
        y: mapInnerBox.y + 20,
        w: (mapInnerBox.w - 14) / 2,
        h: mapInnerBox.h - 24,
      }
    : {
        x: mapInnerBox.x,
        y: mapInnerBox.y + 20 + (mapInnerBox.h - 44) / 2 + 24,
        w: mapInnerBox.w,
        h: (mapInnerBox.h - 44) / 2,
      };

  // Compute primary & optional secondary map panes
  const { primaryPane, secondaryPane } = useMemo(() => {
    const empty: ProjectedMapPane = { paths: [], borders: [], seatClusters: [] };
    if (!config.showMap) return { primaryPane: empty, secondaryPane: null as ProjectedMapPane | null };

    if (isSpotlight && ilcelerGeo && provincesGeo) {
      const pFeat = provincesGeo.features.find((f) => f.properties.id === config.spotlightProvinceId);
      const ilceFeatures = ilcelerGeo.features.filter(
        (f) => f.properties.ilId === config.spotlightProvinceId
      );
      if (!pFeat) return { primaryPane: empty, secondaryPane: null };
      const spotlightPane = buildProjectedMapPane(
        mapInnerBox,
        ilceFeatures,
        { type: 'FeatureCollection', features: [pFeat] },
        data.ilceFillById,
        []
      );
      return { primaryPane: spotlightPane, secondaryPane: null };
    }

    if (isDualMap) {
      if (!provincesGeo) return { primaryPane: empty, secondaryPane: empty };
      const useDistrict87Top = data.mode === 'parliamentary' && Boolean(districts87Geo);
      const topFeatures = useDistrict87Top ? districts87Geo!.features : provincesGeo.features;
      const topFit = useDistrict87Top ? districts87Geo! : provincesGeo;
      const topPane = buildProjectedMapPane(
        dualTopBox,
        topFeatures,
        topFit,
        useDistrict87Top ? data.districtFillById : data.provinceFillById,
        [],
        data.mode === 'parliamentary'
          ? {
              enabled: config.showSeatCircles,
              seatMap: useDistrict87Top ? data.districtSeatMap : data.provinceSeatMap,
              partyColorMap: data.partyColorMap,
              isDistrictLayer: useDistrict87Top,
            }
          : undefined
      );

      const bottomPane = ilcelerGeo
        ? buildProjectedMapPane(
            dualBottomBox,
            ilcelerGeo.features,
            provincesGeo,
            data.ilceFillById,
            provincesGeo.features
          )
        : empty;

      return { primaryPane: topPane, secondaryPane: bottomPane };
    }

    // Abroad World Map Mode
    if (config.mapLayer === 'abroad_world' && data.mode !== 'local' && worldGeo) {
      const proj = geoNaturalEarth1();
      proj.fitExtent(
        [
          [mapInnerBox.x + 10, mapInnerBox.y + 8],
          [mapInnerBox.x + mapInnerBox.w - 10, mapInnerBox.y + mapInnerBox.h - 8],
        ],
        worldGeo as never
      );
      const pathFn = geoPath().projection(proj);
      const fills = data.abroadCountryFillById || {};
      const paths = worldGeo.features.map((feat, idx) => {
        const id = feat.properties.id || `w-${idx}`;
        const fill = feat.properties.isTurkey
          ? isDark
            ? '#334155'
            : '#CBD5E1'
          : feat.properties.isBallotCountry
          ? fills[id] || '#CBD5E1'
          : isDark
          ? '#181B24'
          : '#F1F5F9';
        return {
          id: `${id}-${idx}`,
          d: pathFn(feat as never) || '',
          fill,
        };
      });
      return {
        primaryPane: { paths, borders: [], seatClusters: [] },
        secondaryPane: null,
      };
    }

    // Single Turkey Map Mode
    const use87 = data.mode === 'parliamentary' && config.mapLayer === '87_district' && Boolean(districts87Geo);
    const use973 = config.mapLayer === '973_ilce' && Boolean(ilcelerGeo);
    const activeGeo = use87 ? districts87Geo : use973 ? ilcelerGeo : provincesGeo;
    if (!activeGeo) return { primaryPane: empty, secondaryPane: null };

    const fillMap = use87
      ? data.districtFillById
      : use973
      ? data.ilceFillById
      : data.provinceFillById;
    const borderOverlay = use973
      ? (data.mode === 'parliamentary' && districts87Geo ? districts87Geo : provincesGeo)?.features || []
      : [];

    const singlePane = buildProjectedMapPane(
      mapInnerBox,
      activeGeo.features,
      provincesGeo || activeGeo,
      fillMap,
      borderOverlay,
      data.mode === 'parliamentary' && !use973
        ? {
            enabled: config.showSeatCircles,
            seatMap: use87 ? data.districtSeatMap : data.provinceSeatMap,
            partyColorMap: data.partyColorMap,
            isDistrictLayer: use87,
          }
        : undefined
    );

    return { primaryPane: singlePane, secondaryPane: null };
  }, [
    config.showMap,
    config.mapLayer,
    config.spotlightProvinceId,
    config.showSeatCircles,
    isSpotlight,
    isDualMap,
    data,
    provincesGeo,
    districts87Geo,
    ilcelerGeo,
    worldGeo,
    isDark,
    mapInnerBox.x,
    mapInnerBox.y,
    mapInnerBox.w,
    mapInnerBox.h,
    dualTopBox.x,
    dualTopBox.y,
    dualTopBox.w,
    dualTopBox.h,
    dualBottomBox.x,
    dualBottomBox.y,
    dualBottomBox.w,
    dualBottomBox.h,
  ]);

  // Split right column cleanly (Province Spotlight uses compact seat-circle strip instead of tall hemicycle)
  const visualFrac = data.mode === 'parliamentary' && !isSpotlight ? 0.42 : 0.24;
  const visualH =
    config.showVisualSummary && config.showTable
      ? Math.round(rightColBox.h * visualFrac)
      : config.showVisualSummary
      ? rightColBox.h
      : 0;
  const visualBox = {
    x: rightColBox.x,
    y: rightColBox.y,
    w: rightColBox.w,
    h: visualH,
  };
  const tableBox = {
    x: rightColBox.x,
    y: config.showVisualSummary ? rightColBox.y + visualH + 14 : rightColBox.y,
    w: rightColBox.w,
    h: config.showVisualSummary ? rightColBox.h - visualH - 14 : rightColBox.h,
  };

  // National Wikipedia circular hemicycle dots (never rendered for Province Spotlight)
  const hemicycleDots = useMemo(() => {
    if (!config.showVisualSummary || data.mode !== 'parliamentary' || isSpotlight) return [];
    const groups = displayRows
      .filter((r) => (r.primaryStat || 0) > 0)
      .map((r) => ({
        id: r.id.replace('alliance:', '').replace('party:', ''),
        label: r.shortName,
        color: r.color,
        seats: r.primaryStat || 0,
      }));
    const cx = visualBox.x + visualBox.w / 2;
    const cy = visualBox.y + visualBox.h - 24;
    const rMax = Math.min(visualBox.w * 0.43, visualBox.h - 46);
    const rMin = rMax * 0.36;
    return computeHemicycleSeats(groups, {
      cx,
      cy,
      rMin: Math.max(36, rMin),
      rMax: Math.max(82, rMax),
      rows: 14,
      totalSeats: displayTotalSeats || 600,
    });
  }, [config.showVisualSummary, data.mode, displayRows, displayTotalSeats, isSpotlight, visualBox]);

  // Province Spotlight Seat Circles grid: choose optimal column count maximizing circle size
  const spotlightSeatCircleDots = useMemo(() => {
    if (!isSpotlight || data.mode !== 'parliamentary' || !config.showVisualSummary) return [];
    const entry = data.provinceSeatMap[config.spotlightProvinceId];
    if (!entry) return [];
    const colors = buildOrderedSeatColors(entry.seats, entry.votes, data.partyColorMap);
    const n = colors.length;
    if (n === 0) return [];

    const pad = 18;
    const availW = Math.max(80, visualBox.w - pad * 2);
    const availH = Math.max(40, visualBox.h - 42);

    let bestCols = n;
    let bestStep = 0;
    for (let c = 1; c <= n; c++) {
      const rCnt = Math.ceil(n / c);
      const stepC = Math.min(availW / c, availH / rCnt);
      if (stepC > bestStep) {
        bestStep = stepC;
        bestCols = c;
      }
    }

    const rowCount = Math.ceil(n / bestCols);
    const step = Math.min(56, bestStep);
    const r = Math.max(4, Math.min(23, step * 0.4));
    const totalGridW = (bestCols - 1) * step;
    const totalGridH = (rowCount - 1) * step;
    const startX = visualBox.x + (visualBox.w - totalGridW) / 2;
    const startY = visualBox.y + 34 + (availH - totalGridH) / 2;

    return colors.map((color, idx) => ({
      x: startX + (idx % bestCols) * step,
      y: startY + Math.floor(idx / bestCols) * step,
      r,
      color,
    }));
  }, [isSpotlight, data.mode, data.provinceSeatMap, data.partyColorMap, config.spotlightProvinceId, config.showVisualSummary, visualBox]);

  const topStripRows = displayRows.filter((r) => r.share > 0);
  const kalkulusLogoUri = getKalkulusLogoDataUri(isDark);

  const primaryStatLabel =
    data.mode === 'parliamentary'
      ? lang === 'tr'
        ? 'MV'
        : 'Seats'
      : data.mode === 'presidential'
      ? isSpotlight
        ? lang === 'tr'
          ? 'Oylar'
          : 'Votes'
        : lang === 'tr'
        ? 'İl'
        : 'Prov'
      : isSpotlight
      ? lang === 'tr'
        ? 'Oylar'
        : 'Votes'
      : lang === 'tr'
      ? 'İl / İlçe'
      : 'Prov / Dist';

  const maxVisibleRows = Math.min(
    displayRows.length,
    Math.max(5, Math.floor((tableBox.h - 56) / 40))
  );

  // Tidy, responsive column anchors inside tableBox
  const colDeltaX = tableBox.x + tableBox.w - 16;
  const colStatX = config.showDeltaColumn ? tableBox.x + tableBox.w - 86 : tableBox.x + tableBox.w - 16;
  const colPctX = colStatX - 78;
  const barWMax = config.showSeatBars ? Math.min(120, Math.max(60, tableBox.w - 390)) : 0;
  const barStartX = colPctX - 66 - barWMax;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto block select-none"
      fontFamily="'Geist', 'Inter', 'Liberation Sans', 'DejaVu Sans', Arial, sans-serif"
    >
      {/* Canvas Background */}
      <rect x={0} y={0} width={width} height={height} fill={palette.bg} />

      {/* Top Coalition / Result Ribbon */}
      {!isTopCards && (() => {
        let curX = 0;
        return topStripRows.map((row) => {
          const segW = (row.share / 100) * width;
          const x = curX;
          curX += segW;
          return <rect key={`strip-${row.id}`} x={x} y={0} width={segW + 0.5} height={7} fill={row.color} />;
        });
      })()}

      {/* Clean Minimal Editorial Header */}
      {!isTopCards && (
      <g>
        <text
          x={padX}
          y={headerTop + 34}
          fontSize={isVertical ? 25 : 30}
          fontWeight={800}
          fill={palette.ink}
        >
          {truncateText(config.title || data.modeBadge, isVertical ? 42 : 52)}
        </text>
        <text
          x={padX}
          y={headerTop + 60}
          fontSize={isVertical ? 13.5 : 14.5}
          fontWeight={500}
          fill={palette.muted}
        >
          {truncateText(config.subtitle, isVertical ? 64 : 86)}
        </text>

        {/* Non-Repetitive Right Summary Metrics */}
        <text
          x={width - padX}
          y={headerTop + 32}
          textAnchor="end"
          fontSize={14}
          fontWeight={800}
          fill={palette.ink}
        >
          {isSpotlight && data.spotlightProvinceName
            ? `${data.spotlightProvinceName} · ${lang === 'tr' ? 'Katılım' : 'Turnout'} ${formatPct(
                displayTurnout,
                lang,
                1
              )}`
            : `${lang === 'tr' ? 'Katılım' : 'Turnout'} ${formatPct(displayTurnout, lang, 1)}`}
        </text>
        <text
          x={width - padX}
          y={headerTop + 58}
          textAnchor="end"
          fontSize={13}
          fontWeight={600}
          fill={palette.muted}
        >
          {`${formatInt(displayValidVotes, lang)} ${lang === 'tr' ? 'Geçerli Oy' : 'Valid Votes'}`}
        </text>

        <line
          x1={padX}
          y1={headerBottom}
          x2={width - padX}
          y2={headerBottom}
          stroke={palette.border}
          strokeWidth={1.5}
        />
      </g>
      )}

      {/* Top Party Boxes Band (Üst Kartlar Mode) */}
      {isTopCards && (() => {
        const cardRows = displayRows
          .filter((r) => r.id !== 'OTHER' && (r.share >= config.minVoteCutoffPct || (r.primaryStat ?? 0) > 0))
          .sort((a, b) => b.share - a.share)
          .slice(0, 12);

        const showAllianceHeaders = data.mode === 'parliamentary';

        let orderedRows = cardRows;
        if (showAllianceHeaders) {
          const allianceOrder: string[] = [];
          const byAlliance: Record<string, typeof cardRows> = {};
          for (const r of cardRows) {
            const key = r.allianceId || `__INDEP__${r.id}`;
            if (!byAlliance[key]) {
              byAlliance[key] = [];
              allianceOrder.push(key);
            }
            byAlliance[key].push(r);
          }
          // Order groups by total vote share descending (independent parties ordered individually by share)
          allianceOrder.sort((a, b) => {
            const aShare = byAlliance[a].reduce((s, r) => s + r.share, 0);
            const bShare = byAlliance[b].reduce((s, r) => s + r.share, 0);
            return bShare - aShare;
          });
          orderedRows = allianceOrder.flatMap((k) =>
            [...byAlliance[k]].sort((a, b) => b.share - a.share)
          );
        }

        const turnoutW = isVertical ? 104 : 120;
        const turnoutGap = 16;
        const gap = orderedRows.length > 8 ? 9 : 13;
        const availW = topCardsBox.w - turnoutW - turnoutGap - 16;
        const n = Math.max(1, orderedRows.length);
        const cardW = Math.min(86, Math.max(58, Math.floor((availW - gap * (n - 1)) / n)));
        const boxH = Math.round(cardW * 1.28);
        const totalBoxesW = n * cardW + (n - 1) * gap;
        const startX = topCardsBox.x + Math.max(turnoutW + turnoutGap, (topCardsBox.w - totalBoxesW) / 2);
        const headerOffset = showAllianceHeaders ? 24 : 2;
        const boxY = topCardsBox.y + 4 + headerOffset;
        const statY = boxY + boxH + 34;
        const pctY = boxY + boxH + 58;

        const allianceSpans: { label: string; startIdx: number; endIdx: number }[] = [];
        if (showAllianceHeaders) {
          let curKey: string | null = null;
          let curLabel = '';
          let sIdx = 0;
          orderedRows.forEach((r, idx) => {
            const key = r.allianceId || null;
            const lbl = r.allianceName ? r.allianceName.toUpperCase() : '';
            if (key !== curKey) {
              if (curKey !== null) {
                allianceSpans.push({ label: curLabel, startIdx: sIdx, endIdx: idx - 1 });
              }
              curKey = key;
              curLabel = lbl;
              sIdx = idx;
            }
          });
          if (curKey !== null) {
            allianceSpans.push({ label: curLabel, startIdx: sIdx, endIdx: orderedRows.length - 1 });
          }
        }

        return (
          <g>
            {/* Turnout Block — baseline-aligned with Seat Count & Vote % right next to first party */}
            <g>
              <text
                x={startX - turnoutGap}
                y={statY}
                textAnchor="end"
                fill={palette.ink}
                fontSize={cardW < 72 ? 20 : 25}
                fontWeight={800}
                letterSpacing={-0.3}
              >
                {lang === 'tr' ? 'Katılım' : 'Turnout'}
              </text>
              <text
                x={startX - turnoutGap}
                y={pctY}
                textAnchor="end"
                fill={palette.ink}
                fontSize={cardW < 72 ? 14 : 17}
                fontWeight={700}
              >
                {formatPct(displayTurnout, lang, 2)}
              </text>
            </g>

            {/* Alliance Header Lines */}
            {allianceSpans.map((sp, sIdx) => {
              const x1 = startX + sp.startIdx * (cardW + gap);
              const x2 = startX + sp.endIdx * (cardW + gap) + cardW;
              const midX = (x1 + x2) / 2;
              return (
                <g key={`${sp.label}-${sIdx}`}>
                  <text
                    x={midX}
                    y={topCardsBox.y + 14}
                    textAnchor="middle"
                    fill={palette.ink}
                    fontSize={11}
                    fontWeight={700}
                    letterSpacing={0.5}
                  >
                    {truncateText(sp.label, Math.max(10, Math.floor((x2 - x1) / 6.5)))}
                  </text>
                  <line
                    x1={x1}
                    y1={topCardsBox.y + 21}
                    x2={x2}
                    y2={topCardsBox.y + 21}
                    stroke={palette.border}
                    strokeWidth={1.5}
                  />
                </g>
              );
            })}

            {/* Square Dynamic Party Tiles */}
            {orderedRows.map((row, idx) => {
              const x = startX + idx * (cardW + gap);
              const boxTheme = getDynamicPartyBoxTheme(row.id, row.color);
              const logoUri = config.showPartyLogos
                ? getColoredPartyLogoDataUri(row.logoUrl, boxTheme.fg)
                : null;
              const logoSize = Math.round(cardW * 0.8);
              const statVal =
                row.primaryStat !== undefined ? String(row.primaryStat) : formatPct(row.share, lang, 1);

              return (
                <g key={row.id}>
                  <rect
                    x={x}
                    y={boxY}
                    width={cardW}
                    height={boxH}
                    rx={0}
                    fill={boxTheme.bg}
                    stroke={boxTheme.border}
                    strokeWidth={1.5}
                  />
                  {logoUri ? (
                    <image
                      href={logoUri}
                      x={x + (cardW - logoSize) / 2}
                      y={boxY + Math.round(boxH * 0.05)}
                      width={logoSize}
                      height={logoSize}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  ) : (
                    <circle
                      cx={x + cardW / 2}
                      cy={boxY + Math.round(boxH * 0.36)}
                      r={logoSize * 0.36}
                      fill={boxTheme.fg}
                      opacity={0.92}
                    />
                  )}
                  <text
                    x={x + cardW / 2}
                    y={boxY + boxH - 9}
                    textAnchor="middle"
                    fill={boxTheme.fg}
                    fontSize={cardW < 78 ? 16 : 21}
                    fontWeight={800}
                    letterSpacing={0.2}
                  >
                    {truncateText(row.shortName, 8)}
                  </text>

                  {/* Big Bold Primary Stat (Seats / Provinces Won) */}
                  <text
                    x={x + cardW / 2}
                    y={statY}
                    textAnchor="middle"
                    fill={palette.ink}
                    fontSize={cardW < 78 ? 24 : 31}
                    fontWeight={800}
                    letterSpacing={-0.5}
                  >
                    {statVal}
                  </text>

                  {/* Bold Vote Share % */}
                  <text
                    x={x + cardW / 2}
                    y={pctY}
                    textAnchor="middle"
                    fill={palette.ink}
                    fontSize={cardW < 78 ? 13 : 16}
                    fontWeight={700}
                  >
                    {formatPct(row.share, lang, 2)}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })()}

      {/* Choropleth Map Block */}
      {config.showMap && (
        <g>
          {!isTopCards && (
            <>
              <rect
                x={mapBox.x}
                y={mapBox.y}
                width={mapBox.w}
                height={mapBox.h}
                fill={palette.mapBg}
                stroke={palette.border}
                strokeWidth={1.5}
              />
              <text
                x={mapBox.x + 16}
                y={mapBox.y + 24}
                fontSize={13}
                fontWeight={700}
                fill={palette.ink}
              >
                {lang === 'tr' ? 'Harita' : 'Map'}
              </text>
            </>
          )}

          {/* Dual Pane Minimal Corner Labels */}
          {isDualMap && (() => {
            const dualDistCount = Object.keys(data.districtFillById).length || 87;
            const dualProvCount = Object.keys(data.provinceFillById).length || 81;
            const dualIlceCount = Object.keys(data.ilceFillById).length || 973;
            return (
              <>
                <text
                  x={dualTopBox.x + 6}
                  y={dualTopBox.y - 4}
                  fontSize={11}
                  fontWeight={700}
                  fill={palette.muted}
                >
                  {data.mode === 'parliamentary'
                    ? lang === 'tr'
                      ? `Üst: ${dualDistCount} Seçim Çevresi`
                      : `Top: ${dualDistCount} Electoral Districts`
                    : lang === 'tr'
                    ? `Üst: ${dualProvCount} İl`
                    : `Top: ${dualProvCount} Provinces`}
                </text>
                <text
                  x={dualBottomBox.x + 6}
                  y={dualBottomBox.y - 4}
                  fontSize={11}
                  fontWeight={700}
                  fill={palette.muted}
                >
                  {lang === 'tr' ? `Alt: ${dualIlceCount} İlçe` : `Bottom: ${dualIlceCount} Districts`}
                </text>
              </>
            );
          })()}

          {/* Primary Map Pane */}
          <g>
            {primaryPane.paths.map((f) => (
              <path
                key={`p-${f.id}`}
                d={f.d}
                fill={f.fill}
                fillRule="evenodd"
                strokeLinejoin="round"
                stroke={
                  isSpotlight
                    ? '#090A0F'
                    : !isDualMap && config.mapLayer === '973_ilce'
                    ? '#FFFFFF'
                    : palette.strokeMap
                }
                strokeWidth={
                  isSpotlight ? 1.1 : !isDualMap && config.mapLayer === '973_ilce' ? 0.3 : 0.75
                }
              />
            ))}
            {primaryPane.borders.map((d, idx) => (
              <path
                key={`pb-${idx}`}
                d={d}
                fill="none"
                stroke="#090A0F"
                strokeWidth={0.95}
                strokeLinejoin="round"
                strokeOpacity={0.7}
              />
            ))}
            {primaryPane.seatClusters.map((cluster) => (
              <g key={`psc-${cluster.id}`}>
                {cluster.leaderLine && (
                  <line
                    x1={cluster.leaderLine.x1}
                    y1={cluster.leaderLine.y1}
                    x2={cluster.leaderLine.x2}
                    y2={cluster.leaderLine.y2}
                    stroke={isDark ? '#E2E8F0' : '#090A0F'}
                    strokeWidth={0.7}
                    strokeOpacity={0.6}
                  />
                )}
                {cluster.dots.map((dot, idx) => (
                  <circle
                    key={`psc-${cluster.id}-${idx}`}
                    cx={dot.x}
                    cy={dot.y}
                    r={dot.r}
                    fill={dot.color}
                    stroke="#090A0F"
                    strokeWidth={0.55}
                  />
                ))}
              </g>
            ))}

            {primaryPane.istanbulPanel && (() => {
              const p = primaryPane.istanbulPanel;
              const panelBg = isDark ? '#11131A' : '#FFFFFF';
              const panelBorder = isDark ? palette.strongBorder : '#090A0F';
              const headerFill = isDark ? '#2D3348' : '#090A0F';
              const headerTextFill = '#FFFFFF';
              const cellBg = isDark ? '#161923' : '#FFFFFF';
              const cellStroke = isDark ? '#2D3348' : '#E2E8F0';
              const hdrFont = Math.max(4.5, Math.min(7.2, p.headerH * 0.56));
              const cellFont = Math.max(4.2, Math.min(6.8, (p.cells[0]?.h || 10) * 0.48));
              return (
                <g>
                  <line
                    x1={p.stem.x1}
                    y1={p.stem.y1}
                    x2={p.stem.x2}
                    y2={p.stem.y2}
                    stroke={isDark ? '#E2E8F0' : '#090A0F'}
                    strokeWidth={0.85}
                    strokeOpacity={0.6}
                  />
                  <rect
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={p.h}
                    fill={panelBg}
                    stroke={panelBorder}
                    strokeWidth={1.1}
                  />
                  <rect
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={p.headerH}
                    fill={headerFill}
                  />
                  <text
                    x={p.x + 3.5}
                    y={p.y + p.headerH * 0.74}
                    fontSize={hdrFont}
                    fontWeight={700}
                    letterSpacing={0.25}
                    fill={headerTextFill}
                  >
                    {lang === 'tr'
                      ? `İSTANBUL · ${p.districtCount} BÖLGE (${p.totalMps} MV)`
                      : `ISTANBUL · ${p.districtCount} DIST. (${p.totalMps} MPs)`}
                  </text>
                  {p.cells.map((cell) => (
                    <g key={`inf-ist-${cell.id}`}>
                      <rect
                        x={cell.x}
                        y={cell.y}
                        width={cell.w}
                        height={cell.h}
                        fill={cellBg}
                        stroke={cellStroke}
                        strokeWidth={0.45}
                      />
                      <text
                        x={cell.x + 2}
                        y={cell.y + cell.h * 0.5 + cellFont * 0.36}
                        fontSize={cellFont}
                        fontWeight={700}
                        fill={palette.ink}
                      >
                        {cell.shortLabel}
                      </text>
                      {cell.dots.map((dot, dIdx) => (
                        <circle
                          key={`inf-ist-d-${cell.id}-${dIdx}`}
                          cx={dot.x}
                          cy={dot.y}
                          r={dot.r}
                          fill={dot.color}
                          stroke="#090A0F"
                          strokeWidth={0.4}
                        />
                      ))}
                    </g>
                  ))}
                </g>
              );
            })()}

            {!isSpotlight && !isDualMap && config.mapLayer === 'abroad_world' && data.abroadCountryFillById && (
              <g>
                {(
                  [
                    { id: 'KKTC', yOffset: 62, title: 'KKTC' },
                    {
                      id: 'CUSTOMS',
                      yOffset: 30,
                      title: lang === 'tr' ? 'Gümrük Kapıları' : 'Customs',
                    },
                  ] as const
                ).map((ins) => {
                  const y = mapInnerBox.y + mapInnerBox.h - ins.yOffset;
                  const x = mapInnerBox.x + 12;
                  const fill = data.abroadCountryFillById?.[ins.id] || '#CBD5E1';
                  return (
                    <g key={`inf-inset-${ins.id}`}>
                      <rect
                        x={x}
                        y={y}
                        width={126}
                        height={24}
                        fill={palette.panel}
                        stroke={palette.border}
                        strokeWidth={1.1}
                      />
                      <rect
                        x={x + 5}
                        y={y + 4}
                        width={10}
                        height={16}
                        fill={fill}
                        stroke={palette.border}
                        strokeWidth={0.7}
                      />
                      <text
                        x={x + 21}
                        y={y + 15.5}
                        fontSize={10.5}
                        fontWeight={700}
                        fill={palette.ink}
                      >
                        {ins.title}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
          </g>

          {/* Secondary Dual Map Pane (973 İlçeler) */}
          {secondaryPane && (
            <g>
              {secondaryPane.paths.map((f) => (
                <path
                  key={`s-${f.id}`}
                  d={f.d}
                  fill={f.fill}
                  fillRule="evenodd"
                  strokeLinejoin="round"
                  stroke="#FFFFFF"
                  strokeWidth={0.22}
                />
              ))}
              {secondaryPane.borders.map((d, idx) => (
                <path
                  key={`sb-${idx}`}
                  d={d}
                  fill="none"
                  stroke="#090A0F"
                  strokeWidth={0.75}
                  strokeLinejoin="round"
                  strokeOpacity={0.65}
                />
              ))}
            </g>
          )}
        </g>
      )}

      {/* Right Visual Summary Block */}
      {!isTopCards && config.showVisualSummary && (
        <g>
          <rect
            x={visualBox.x}
            y={visualBox.y}
            width={visualBox.w}
            height={visualBox.h}
            fill={palette.panel}
            stroke={palette.border}
            strokeWidth={1.5}
          />

          {data.mode === 'parliamentary' && (
            isSpotlight ? (
              <>
                <text
                  x={visualBox.x + 14}
                  y={visualBox.y + 22}
                  fontSize={12}
                  fontWeight={700}
                  fill={palette.muted}
                >
                  {lang === 'tr' ? 'MİLLETVEKİLLERİ' : 'MPs'}
                </text>
                <text
                  x={visualBox.x + visualBox.w - 14}
                  y={visualBox.y + 22}
                  textAnchor="end"
                  fontSize={12}
                  fontWeight={800}
                  fill={palette.ink}
                >
                  {`${displayTotalSeats} ${lang === 'tr' ? 'MV' : 'MPs'}`}
                </text>
                {spotlightSeatCircleDots.map((dot, idx) => (
                  <circle
                    key={`spc-${idx}`}
                    cx={dot.x}
                    cy={dot.y}
                    r={dot.r}
                    fill={dot.color}
                    stroke={palette.strongBorder}
                    strokeWidth={0.8}
                  />
                ))}
              </>
            ) : (
              <>
                <text
                  x={visualBox.x + 14}
                  y={visualBox.y + 22}
                  fontSize={12}
                  fontWeight={700}
                  fill={palette.muted}
                >
                  {lang === 'tr' ? 'TBMM KOLTUK DAĞILIMI' : 'PARLIAMENT SEAT COMPOSITION'}
                </text>
                {hemicycleDots.map((dot, idx) => (
                  <circle
                    key={`hd-${idx}`}
                    cx={dot.x}
                    cy={dot.y}
                    r={dot.r}
                    fill={dot.color}
                  />
                ))}
                <text
                  x={visualBox.x + visualBox.w / 2}
                  y={visualBox.y + visualBox.h - 24}
                  textAnchor="middle"
                  fontSize={34}
                  fontWeight={800}
                  fill={palette.ink}
                >
                  {displayTotalSeats}
                </text>
              </>
            )
          )}

          {data.mode === 'presidential' && (
            <g>
              <text
                x={visualBox.x + 14}
                y={visualBox.y + 24}
                fontSize={12}
                fontWeight={700}
                fill={palette.muted}
              >
                {lang === 'tr' ? 'ADAY OY ORANI BARI (%50+1 SINIRI)' : 'CANDIDATE VOTE BAR (50%+1)'}
              </text>
              {(() => {
                const barX = visualBox.x + 16;
                const barW = visualBox.w - 32;
                const barY = visualBox.y + 42;
                const barH = Math.max(36, visualBox.h - 90);
                let cx = barX;
                return (
                  <>
                    {displayRows.map((r) => {
                      const w = (r.share / 100) * barW;
                      const segX = cx;
                      cx += w;
                      return (
                        <g key={`pbar-${r.id}`}>
                          <rect x={segX} y={barY} width={w} height={barH} fill={r.color} />
                          {w > 56 && (
                            <text
                              x={segX + w / 2}
                              y={barY + barH / 2 + 5}
                              textAnchor="middle"
                              fontSize={13}
                              fontWeight={800}
                              fill={getContrastTextColor(r.color)}
                            >
                              {`${r.shortName} ${formatPct(r.share, lang, 1)}`}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    <line
                      x1={barX + barW / 2}
                      y1={barY - 8}
                      x2={barX + barW / 2}
                      y2={barY + barH + 14}
                      stroke={palette.strongBorder}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                    <text
                      x={barX + barW / 2}
                      y={barY + barH + 28}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={700}
                      fill={palette.muted}
                    >
                      50,0%
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {data.mode === 'local' && (
            <g>
              <text
                x={visualBox.x + 14}
                y={visualBox.y + 24}
                fontSize={12}
                fontWeight={700}
                fill={palette.muted}
              >
                {isSpotlight && data.spotlightProvinceName
                  ? `${data.spotlightProvinceName.toUpperCase()} OY DAĞILIMI`
                  : lang === 'tr'
                  ? '81 İL & 973 İLÇE BELEDİYE DAĞILIMI'
                  : '81 PROVINCES & 973 DISTRICTS'}
              </text>
              {isSpotlight ? (
                (() => {
                  const barX = visualBox.x + 16;
                  const barW = visualBox.w - 32;
                  const barY = visualBox.y + 44;
                  const barH = Math.max(36, visualBox.h - 76);
                  let cx = barX;
                  return displayRows.map((r) => {
                    const w = (r.share / 100) * barW;
                    const segX = cx;
                    cx += w;
                    return (
                      <g key={`splb-${r.id}`}>
                        <rect x={segX} y={barY} width={w} height={barH} fill={r.color} />
                        {w > 54 && (
                          <text
                            x={segX + w / 2}
                            y={barY + barH / 2 + 5}
                            textAnchor="middle"
                            fontSize={12}
                            fontWeight={800}
                            fill={getContrastTextColor(r.color)}
                          >
                            {`${r.shortName} ${formatPct(r.share, lang, 1)}`}
                          </text>
                        )}
                      </g>
                    );
                  });
                })()
              ) : (
                (() => {
                  const barX = visualBox.x + 16;
                  const barW = visualBox.w - 32;
                  const yProv = visualBox.y + 42;
                  const yIlce = visualBox.y + 88;
                  const totalIlces = Math.max(
                    1,
                    data.rows.reduce((s, r) => s + (r.secondaryStat || 0), 0)
                  );
                  let cxP = barX;
                  let cxI = barX;
                  return (
                    <>
                      <text x={barX} y={yProv - 4} fontSize={11} fontWeight={700} fill={palette.ink}>
                        {lang === 'tr' ? '81 İl (Büyükşehir + İl Merkezi)' : '81 Provinces'}
                      </text>
                      {data.rows.map((r) => {
                        const wP = ((r.primaryStat || 0) / 81) * barW;
                        const x = cxP;
                        cxP += wP;
                        return wP > 0 ? (
                          <g key={`lp-${r.id}`}>
                            <rect x={x} y={yProv + 2} width={wP} height={24} fill={r.color} />
                            {wP > 36 && (
                              <text
                                x={x + wP / 2}
                                y={yProv + 18}
                                textAnchor="middle"
                                fontSize={11}
                                fontWeight={800}
                                fill={getContrastTextColor(r.color)}
                              >
                                {r.primaryStat}
                              </text>
                            )}
                          </g>
                        ) : null;
                      })}

                      <text x={barX} y={yIlce - 4} fontSize={11} fontWeight={700} fill={palette.ink}>
                        {lang === 'tr' ? '973 İlçe Belediyesi' : '973 District Municipalities'}
                      </text>
                      {data.rows.map((r) => {
                        const wI = ((r.secondaryStat || 0) / totalIlces) * barW;
                        const x = cxI;
                        cxI += wI;
                        return wI > 0 ? (
                          <g key={`li-${r.id}`}>
                            <rect x={x} y={yIlce + 2} width={wI} height={24} fill={r.color} />
                            {wI > 40 && (
                              <text
                                x={x + wI / 2}
                                y={yIlce + 18}
                                textAnchor="middle"
                                fontSize={11}
                                fontWeight={800}
                                fill={getContrastTextColor(r.color)}
                              >
                                {r.secondaryStat}
                              </text>
                            )}
                          </g>
                        ) : null;
                      })}
                    </>
                  );
                })()
              )}
            </g>
          )}
        </g>
      )}

      {/* Results Table Box (Turkey or Selected İl Full Breakdown) */}
      {!isTopCards && config.showTable && (
        <g>
          <rect
            x={tableBox.x}
            y={tableBox.y}
            width={tableBox.w}
            height={tableBox.h}
            fill={palette.panel}
            stroke={palette.border}
            strokeWidth={1.5}
          />

          {/* Table Column Header */}
          <rect
            x={tableBox.x}
            y={tableBox.y}
            width={tableBox.w}
            height={34}
            fill={palette.headerBg}
            stroke={palette.border}
            strokeWidth={1}
          />

          <text x={tableBox.x + 14} y={tableBox.y + 22} fontSize={12} fontWeight={700} fill={palette.ink}>
            {isSpotlight && data.spotlightProvinceName
              ? `${data.spotlightProvinceName} · ${
                  data.mode === 'presidential'
                    ? lang === 'tr'
                      ? 'Aday Sonuçları'
                      : 'Province Candidates'
                    : lang === 'tr'
                    ? 'İl Sonuçları'
                    : 'Province Results'
                }`
              : data.mode === 'presidential'
              ? lang === 'tr'
                ? 'Aday'
                : 'Candidate'
              : config.grouping === 'alliance' && data.mode === 'parliamentary'
              ? lang === 'tr'
                ? 'İttifak / Parti'
                : 'Alliance / Party'
              : lang === 'tr'
              ? 'Parti'
              : 'Party'}
          </text>
          <text
            x={colPctX}
            y={tableBox.y + 22}
            textAnchor="end"
            fontSize={12}
            fontWeight={700}
            fill={palette.ink}
          >
            {lang === 'tr' ? 'Oy %' : 'Vote %'}
          </text>
          <text
            x={colStatX}
            y={tableBox.y + 22}
            textAnchor="end"
            fontSize={12}
            fontWeight={700}
            fill={palette.ink}
          >
            {primaryStatLabel}
          </text>
          {config.showDeltaColumn && (
            <text
              x={colDeltaX}
              y={tableBox.y + 22}
              textAnchor="end"
              fontSize={12}
              fontWeight={700}
              fill={palette.ink}
            >
              ±
            </text>
          )}

          {displayRows.slice(0, maxVisibleRows).map((row, idx) => {
            const rowH = Math.min(42, (tableBox.h - 42) / Math.max(1, maxVisibleRows));
            const ry = tableBox.y + 36 + idx * rowH;
            const maxShare = Math.max(1, displayRows[0]?.share || 40);
            const barW = barWMax > 0 ? Math.max(2, (row.share / maxShare) * barWMax) : 0;

            const statText =
              data.mode === 'local'
                ? isSpotlight
                  ? formatInt(row.votes, lang)
                  : `${row.primaryStat ?? 0} / ${row.secondaryStat ?? 0}`
                : data.mode === 'presidential' && isSpotlight
                ? formatInt(row.votes, lang)
                : String(row.primaryStat ?? 0);

            const deltaVal =
              data.mode === 'local'
                ? isSpotlight
                  ? undefined
                  : row.deltaPrimary
                : row.deltaPrimary ?? row.deltaShare;
            const deltaStr =
              deltaVal === undefined
                ? '—'
                : deltaVal > 0
                ? `+${Number.isInteger(deltaVal) ? deltaVal : deltaVal.toFixed(1)}`
                : Number.isInteger(deltaVal)
                ? String(deltaVal)
                : deltaVal.toFixed(1);

            const logoUri =
              config.showPartyLogos && row.logoUrl
                ? getColoredPartyLogoDataUri(row.logoUrl, row.color)
                : null;
            const nameStartX = logoUri ? tableBox.x + 42 : tableBox.x + 22;

            return (
              <g key={`row-${row.id}`}>
                {idx % 2 === 1 && (
                  <rect
                    x={tableBox.x + 1}
                    y={ry}
                    width={tableBox.w - 2}
                    height={rowH}
                    fill={palette.panelAlt}
                  />
                )}
                <rect x={tableBox.x + 8} y={ry + 6} width={5} height={rowH - 12} fill={row.color} />

                {logoUri && (
                  <image
                    href={logoUri}
                    x={tableBox.x + 18}
                    y={ry + (rowH - 18) / 2}
                    width={18}
                    height={18}
                    preserveAspectRatio="xMidYMid meet"
                  />
                )}

                <text
                  x={nameStartX}
                  y={ry + rowH * 0.62}
                  fontSize={13.5}
                  fontWeight={row.isWinner ? 800 : 700}
                  fill={palette.ink}
                >
                  {truncateText(row.shortName, 16)}
                </text>

                {barWMax > 0 && (
                  <g>
                    <rect
                      x={barStartX}
                      y={ry + rowH * 0.36}
                      width={barWMax}
                      height={8}
                      fill={palette.subtleBar}
                    />
                    <rect
                      x={barStartX}
                      y={ry + rowH * 0.36}
                      width={barW}
                      height={8}
                      fill={row.color}
                    />
                  </g>
                )}

                <text
                  x={colPctX}
                  y={ry + rowH * 0.62}
                  textAnchor="end"
                  fontSize={13}
                  fontWeight={700}
                  fill={palette.ink}
                >
                  {formatPct(row.share, lang, 1)}
                </text>

                <text
                  x={colStatX}
                  y={ry + rowH * 0.62}
                  textAnchor="end"
                  fontSize={13.5}
                  fontWeight={800}
                  fill={palette.ink}
                >
                  {statText}
                </text>

                {config.showDeltaColumn && (
                  <text
                    x={colDeltaX}
                    y={ry + rowH * 0.62}
                    textAnchor="end"
                    fontSize={12}
                    fontWeight={700}
                    fill={
                      deltaVal && deltaVal > 0
                        ? palette.pos
                        : deltaVal && deltaVal < 0
                        ? palette.neg
                        : palette.muted
                    }
                  >
                    {deltaStr}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* Kalkülüs Logo Watermark (Clean Footer without Kaynak Text) */}
      {config.showWatermark &&
        (kalkulusLogoUri ? (
          <image
            href={kalkulusLogoUri}
            x={width - padX - 96}
            y={footerTop + 1}
            width={96}
            height={20.5}
            preserveAspectRatio="xMaxYMid meet"
          />
        ) : (
          <text
            x={width - padX}
            y={footerTop + 16}
            textAnchor="end"
            fontSize={12}
            fontWeight={800}
            letterSpacing={1.4}
            fill={palette.ink}
          >
            KALKÜLÜS
          </text>
        ))}
    </svg>
  );
};
