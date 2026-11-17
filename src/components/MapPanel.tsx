import React, { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoNaturalEarth1, geoPath } from 'd3-geo';
import {
  ChevronRight,
  CircleDot,
  Download,
  Globe2,
  Maximize2,
  MousePointer2,
  Pin,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ABROAD_COUNTRY_BY_ID } from '../data/abroadCountries';
import {
  GeoCollection,
  GeoFeature,
  getCachedGeoLayer,
  loadDistricts87Geo,
  loadIlcelerGeo,
  loadProvincesGeo,
  loadWorldCountriesGeo,
} from '../data/geoCache';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { MapColorMode, MapLayerMode } from '../types/election';
import {
  getBattlegroundMarginColor,
  getDivergingSwingColor,
  getPartyHeatmapColor,
  interpolateHex,
} from '../utils/color';
import {
  SEAT_OFFSETS_81,
  SEAT_OFFSETS_87,
  computeSeatClusterLayout,
} from '../utils/seatCirclesGeometry';
import { renderSvgElementToPngBlob } from '../utils/svgExport';
import { HoverTelemetryData, MapHoverCard } from './MapHoverCard';

function blendHexWithWhite(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c * alpha + 255 * (1 - alpha));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

interface MapPanelProps {
  onEditUnitMobile?: () => void;
}

export const MapPanel: React.FC<MapPanelProps> = ({ onEditUnitMobile }) => {
  const {
    lang,
    electionMode,
    parties,
    alliances,
    mapLayer,
    mapColorMode,
    mapFocusEntityId,
    zoomedProvinceId,
    activeScope,
    provinceOverrides,
    districtOverrides,
    ilceOverrides,
    abroadCountryOverrides,
    projection,
    official2023Projection,
    presCandidates,
    presRoundView,
    presProvinceOverrides,
    presIlceOverrides,
    presAbroadCountryOverrides,
    presidentialProjection,
    localProvinceOverrides,
    localIlceOverrides,
    localDefections,
    localProjection,
    setMapLayer,
    setMapColorMode,
    setMapFocusEntityId,
    setZoomedProvinceId,
    setActiveScope,
    setPresRoundView,
  } = useElectionStore();

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [provincesGeo, setProvincesGeo] = useState<GeoCollection | null>(() =>
    getCachedGeoLayer('provinces')
  );
  const [districts87Geo, setDistricts87Geo] = useState<GeoCollection | null>(() =>
    getCachedGeoLayer('districts87')
  );
  const [ilcelerGeo, setIlcelerGeo] = useState<GeoCollection | null>(() =>
    getCachedGeoLayer('ilceler')
  );
  const [worldGeo, setWorldGeo] = useState<GeoCollection | null>(() =>
    getCachedGeoLayer('world')
  );
  const fetchedDistricts87Ref = useRef(Boolean(districts87Geo));
  const fetchedIlcelerRef = useRef(Boolean(ilcelerGeo));
  const fetchedWorldRef = useRef(Boolean(worldGeo));
  const [hovered, setHovered] = useState<HoverTelemetryData | null>(null);
  const [touchTelemetry, setTouchTelemetry] = useState<{
    data: HoverTelemetryData;
    zoomProvinceId?: string;
  } | null>(null);
  const lastInputTouchRef = useRef(false);
  const [hoverCursor, setHoverCursor] = useState<{ x: number; y: number } | null>(null);
  const [hoverContainerSize, setHoverContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [hoverDockedCorner, setHoverDockedCorner] = useState(false);
  const [showSeatCircles, setShowSeatCircles] = useState(true);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);
  const panAnchorRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number; moved: boolean } | null>(null);

  const t = translations[lang];

  const isWorldView =
    electionMode !== 'local' &&
    !zoomedProvinceId &&
    (activeScope.type === 'abroad' ||
      activeScope.type === 'abroadCountry' ||
      mapLayer === 'abroad_world');

  const needDistricts87 = electionMode === 'parliamentary' && !isWorldView && mapLayer === '87_district';
  const needIlceler = (!isWorldView && mapLayer === '973_ilce') || zoomedProvinceId !== null;
  const needWorld = isWorldView;
  const isMapReady = Boolean(
    (needWorld ? worldGeo : provincesGeo) &&
    (!needDistricts87 || districts87Geo) &&
    (!needIlceler || ilcelerGeo)
  );

  useEffect(() => {
    if (!provincesGeo) {
      loadProvincesGeo()
        .then((data) => setProvincesGeo(data))
        .catch(() => {});
    }
  }, [provincesGeo]);

  useEffect(() => {
    if (needDistricts87 && !districts87Geo && !fetchedDistricts87Ref.current) {
      fetchedDistricts87Ref.current = true;
      loadDistricts87Geo()
        .then((data) => setDistricts87Geo(data))
        .catch(() => {
          fetchedDistricts87Ref.current = false;
        });
    }
  }, [needDistricts87, districts87Geo]);

  useEffect(() => {
    if (needIlceler && !ilcelerGeo && !fetchedIlcelerRef.current) {
      fetchedIlcelerRef.current = true;
      loadIlcelerGeo()
        .then((data) => setIlcelerGeo(data))
        .catch(() => {
          fetchedIlcelerRef.current = false;
        });
    }
  }, [needIlceler, ilcelerGeo]);

  useEffect(() => {
    if (needWorld && !worldGeo && !fetchedWorldRef.current) {
      fetchedWorldRef.current = true;
      loadWorldCountriesGeo()
        .then((data) => setWorldGeo(data))
        .catch(() => {
          fetchedWorldRef.current = false;
        });
    }
  }, [needWorld, worldGeo]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setTouchTelemetry(null);
  }, [zoomedProvinceId, mapLayer, electionMode]);

  const partyMap = useMemo(() => {
    const m: Record<string, (typeof parties)[0]> = {};
    for (const p of parties) m[p.id] = p;
    return m;
  }, [parties]);

  const allianceMap = useMemo(() => {
    const m: Record<string, (typeof alliances)[0]> = {};
    for (const a of alliances) m[a.id] = a;
    return m;
  }, [alliances]);

  const candMap = useMemo(() => {
    const m: Record<string, (typeof presCandidates)[0]> = {};
    for (const c of presCandidates) m[c.id] = c;
    return m;
  }, [presCandidates]);

  const activePresRound =
    presRoundView === 'round2'
      ? presidentialProjection.round2
      : presidentialProjection.round1;

  const focusEntityList = useMemo(
    () =>
      electionMode === 'presidential'
        ? presCandidates
            .filter((c) => !c.isOther)
            .map((c) => ({ id: c.id, shortName: c.shortName, color: c.color }))
        : parties
            .filter((p) => !p.isOther)
            .map((p) => ({ id: p.id, shortName: p.shortName, color: p.color })),
    [electionMode, presCandidates, parties]
  );

  const focusColorById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of focusEntityList) map[e.id] = e.color;
    return map;
  }, [focusEntityList]);

  const effectiveFocusId = useMemo(() => {
    if (mapFocusEntityId && focusColorById[mapFocusEntityId]) return mapFocusEntityId;
    return focusEntityList[0]?.id ?? '';
  }, [mapFocusEntityId, focusColorById, focusEntityList]);

  const getCustomEntityFill = (
    colorHex: string,
    marginPct: number,
    turnout: number,
    isFlipped?: boolean,
    extra?: { shares?: Record<string, number>; runnerUpColor?: string }
  ): string => {
    if (mapColorMode === 'flips') {
      return isFlipped ? blendHexWithWhite(colorHex, 0.96) : '#e2e8f0';
    }
    if (mapColorMode === 'runner_up') {
      return extra?.runnerUpColor ? blendHexWithWhite(extra.runnerUpColor, 0.88) : '#CBD5E1';
    }
    if (mapColorMode === 'margin') {
      return getBattlegroundMarginColor(marginPct);
    }
    if (mapColorMode === 'party_share' && effectiveFocusId && extra?.shares) {
      return getPartyHeatmapColor(
        focusColorById[effectiveFocusId] || '#090A0F',
        extra.shares[effectiveFocusId] ?? 0
      );
    }
    if (mapColorMode === 'turnout') {
      return interpolateHex('#CBD5E1', '#090A0F', Math.max(0, Math.min(1, (turnout - 72) / 18)));
    }
    const intensity = Math.min(0.95, Math.max(0.58, 0.55 + marginPct / 42));
    return blendHexWithWhite(colorHex, intensity);
  };

  const { pathGenerator } = useMemo(() => {
    const width = 980;
    const height = 470;
    const proj = geoMercator();

    if (zoomedProvinceId && provincesGeo) {
      const pFeat = provincesGeo.features.find((f) => f.properties.id === zoomedProvinceId);
      if (pFeat) {
        proj.fitExtent(
          [
            [48, 36],
            [width - 48, height - 36],
          ],
          pFeat as any
        );
        return { pathGenerator: geoPath().projection(proj) };
      }
    }

    const baseGeo = districts87Geo || provincesGeo;
    if (baseGeo) {
      proj.fitExtent(
        [
          [22, 18],
          [width - 22, height - 18],
        ],
        baseGeo as any
      );
    } else {
      proj.center([35.3, 39.0]).scale(2500).translate([width / 2, height / 2]);
    }

    return { pathGenerator: geoPath().projection(proj) };
  }, [provincesGeo, districts87Geo, zoomedProvinceId]);

  const ilcePathMap = useMemo(() => {
    if (!ilcelerGeo) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const feat of ilcelerGeo.features) {
      map.set(feat.properties.id, pathGenerator(feat as any) || '');
    }
    return map;
  }, [ilcelerGeo, pathGenerator]);

  const worldPathGenerator = useMemo(() => {
    const width = 980;
    const height = 470;
    const proj = geoNaturalEarth1();
    if (worldGeo) {
      proj.fitExtent(
        [
          [16, 16],
          [width - 16, height - 16],
        ],
        worldGeo as any
      );
    }
    return geoPath().projection(proj);
  }, [worldGeo]);

  const getFillColor = (
    leadingPartyId: string,
    partyShares: Record<string, number>,
    basePartyShares: Record<string, number>,
    marginPct: number,
    turnout: number
  ): string => {
    const leader = partyMap[leadingPartyId];
    const baseHex = leader?.color || '#64748b';

    if (mapColorMode === 'leader') {
      const intensity = Math.min(0.95, Math.max(0.58, 0.55 + marginPct / 42));
      return blendHexWithWhite(baseHex, intensity);
    }
    if (mapColorMode === 'runner_up') {
      let runnerUpId = '';
      let bestShare = -1;
      for (const p of parties) {
        if (p.id === leadingPartyId || p.isOther) continue;
        const val = partyShares[p.id] ?? 0;
        if (val > bestShare) {
          bestShare = val;
          runnerUpId = p.id;
        }
      }
      const rHex = partyMap[runnerUpId]?.color || '#CBD5E1';
      return blendHexWithWhite(rHex, 0.88);
    }
    if (mapColorMode === 'alliance') {
      const aHex =
        leader?.allianceId && allianceMap[leader.allianceId]
          ? allianceMap[leader.allianceId].color
          : baseHex;
      return blendHexWithWhite(aHex, 0.88);
    }
    if (mapColorMode === 'margin') {
      return getBattlegroundMarginColor(marginPct);
    }
    if (mapColorMode === 'party_share' && effectiveFocusId) {
      return getPartyHeatmapColor(
        focusColorById[effectiveFocusId] || '#090A0F',
        partyShares[effectiveFocusId] ?? 0
      );
    }
    if (mapColorMode === 'turnout') {
      return interpolateHex('#CBD5E1', '#090A0F', Math.max(0, Math.min(1, (turnout - 72) / 18)));
    }
    // Swing mode: specific party diverging or max positive swing
    if (mapFocusEntityId && partyMap[mapFocusEntityId]) {
      const delta = (partyShares[mapFocusEntityId] || 0) - (basePartyShares[mapFocusEntityId] || 0);
      return getDivergingSwingColor(delta);
    }
    let maxSwing = -999;
    let bestSwingPartyId = leadingPartyId;
    for (const p of parties) {
      if (p.isOther) continue;
      const sw = (partyShares[p.id] || 0) - (basePartyShares[p.id] || 0);
      if (sw > maxSwing) {
        maxSwing = sw;
        bestSwingPartyId = p.id;
      }
    }
    if (Math.abs(maxSwing) < 0.15) return '#F1F5F9';
    const swHex = partyMap[bestSwingPartyId]?.color || '#64748b';
    const swAlpha = Math.min(0.96, Math.max(0.4, Math.abs(maxSwing) / 10));
    return blendHexWithWhite(swHex, swAlpha);
  };

  const activeDefectionByUnit = useMemo(() => {
    const prov: Record<string, { kind: 'defection' | 'kayyim'; label: string }> = {};
    const ilce: Record<string, { kind: 'defection' | 'kayyim'; label: string }> = {};
    for (const entry of localDefections.entries) {
      if (!entry.enabled) continue;
      if (entry.kind === 'kayyim' && !localDefections.includeKayyim) continue;
      const fromShort = partyMap[entry.fromPartyId]?.shortName || entry.fromPartyId;
      const toShort =
        entry.kind === 'kayyim'
          ? lang === 'tr'
            ? 'Kayyım'
            : 'Trustee'
          : partyMap[entry.toPartyId]?.shortName || entry.toPartyId;
      const label =
        entry.kind === 'kayyim'
          ? lang === 'tr'
            ? `Kayyım ataması (${fromShort})`
            : `Trustee appointed (${fromShort})`
          : lang === 'tr'
          ? `Parti değişimi: ${fromShort} → ${toShort}`
          : `Party defection: ${fromShort} → ${toShort}`;
      const badge = { kind: entry.kind, label };
      if (entry.unitType === 'province') prov[entry.unitId] = badge;
      else ilce[entry.unitId] = badge;
    }
    return { prov, ilce };
  }, [localDefections, partyMap, lang]);

  const resolveIlceMapData = (
    ilceId: string
  ): { name: string; fill: string; isLocked: boolean; telemetry: HoverTelemetryData } | null => {
    if (electionMode === 'presidential') {
      const u = activePresRound.ilceResults[ilceId];
      if (!u) return null;
      const leaderColor = candMap[u.leadingCandidateId]?.color || '#64748b';
      const provName = activePresRound.provinceResults[u.ilId || '']?.name || u.ilId || '';
      const sorted = presCandidates
        .filter((c) => !c.isOther && (u.candidateVotes[c.id] || 0) > 0)
        .sort((a, b) => (u.candidateVotes[b.id] || 0) - (u.candidateVotes[a.id] || 0));
      const barEntries = sorted.map((c) => ({
        id: c.id,
        shortName: c.shortName,
        color: c.color,
        share: u.candidateShares[c.id] || 0,
        votes: u.candidateVotes[c.id] || 0,
      }));
      const topEntries = barEntries.slice(0, 6);
      const isLocked = Boolean(presIlceOverrides[ilceId]?.isLocked);
      return {
        name: u.name,
        fill: getCustomEntityFill(leaderColor, u.marginPct, u.turnout, undefined, {
          shares: u.candidateShares,
          runnerUpColor: focusColorById[u.runnerUpCandidateId],
        }),
        isLocked,
        telemetry: {
          id: ilceId,
          mode: 'presidential',
          title: u.name,
          subtitle: provName,
          unitBadge: lang === 'tr' ? 'İlçe' : 'District',
          registeredVoters: u.registeredVoters,
          turnout: u.turnout,
          validVotes: u.validVotes,
          isLocked,
          leader: sorted[0]
            ? {
                shortName: sorted[0].shortName,
                color: sorted[0].color,
                share: u.candidateShares[sorted[0].id] || 0,
              }
            : undefined,
          runnerUp: sorted[1]
            ? {
                shortName: sorted[1].shortName,
                color: sorted[1].color,
                share: u.candidateShares[sorted[1].id] || 0,
              }
            : undefined,
          marginPct: u.marginPct,
          marginVotes: u.marginVotes,
          topEntries,
          barEntries,
          presRound: presRoundView,
        },
      };
    }

    if (electionMode === 'local') {
      const l = localProjection.ilceResults[ilceId];
      if (!l) return null;
      const winP = partyMap[l.winnerPartyId];
      const oldP = partyMap[l.baseline2024WinnerPartyId];
      const provName = localProjection.provinceResults[l.ilId]?.name || l.ilId;
      const sorted = parties
        .filter((p) => !p.isOther && (l.partyVotes[p.id] || 0) > 0)
        .sort((a, b) => (l.partyVotes[b.id] || 0) - (l.partyVotes[a.id] || 0));
      const barEntries = sorted.map((p) => ({
        id: p.id,
        shortName: p.shortName,
        color: p.color,
        share: l.partyShares[p.id] || 0,
        votes: l.partyVotes[p.id] || 0,
      }));
      const topEntries = barEntries.slice(0, 6);
      const isLocked = Boolean(localIlceOverrides[ilceId]?.isLocked);
      return {
        name: l.name,
        fill: getCustomEntityFill(
          winP?.color || '#64748b',
          l.marginPct,
          l.turnout,
          l.flippedFrom2024,
          {
            shares: l.partyShares,
            runnerUpColor: partyMap[l.runnerUpPartyId]?.color,
          }
        ),
        isLocked,
        telemetry: {
          id: ilceId,
          mode: 'local',
          title: l.name,
          subtitle: provName,
          unitBadge: l.isMerkez
            ? lang === 'tr'
              ? 'İl Merkezi'
              : 'Prov Center'
            : lang === 'tr'
            ? 'İlçe'
            : 'District',
          registeredVoters: l.registeredVoters,
          turnout: l.turnout,
          validVotes: l.validVotes,
          isLocked,
          leader: winP
            ? {
                shortName: winP.shortName,
                color: winP.color,
                share: l.partyShares[winP.id] || 0,
              }
            : undefined,
          runnerUp: partyMap[l.runnerUpPartyId]
            ? {
                shortName: partyMap[l.runnerUpPartyId].shortName,
                color: partyMap[l.runnerUpPartyId].color,
                share: l.partyShares[l.runnerUpPartyId] || 0,
              }
            : undefined,
          marginPct: l.marginPct,
          marginVotes: l.marginVotes,
          topEntries,
          barEntries,
          localRefLabel:
            localProjection.referenceBaseline === 'current'
              ? lang === 'tr'
                ? 'Mevcut'
                : 'Current'
              : '2024',
          localPrevWinnerShort: oldP?.shortName || l.baseline2024WinnerPartyId,
          localPrevWinnerColor: oldP?.color || '#94a3b8',
          localWinnerShort: winP?.shortName || l.winnerPartyId,
          localWinnerColor: winP?.color || '#94a3b8',
          localFlipped: l.flippedFrom2024,
          localStatusBadge: activeDefectionByUnit.ilce[ilceId],
        },
      };
    }

    const iRes = projection.ilceResults[ilceId];
    const baseIRes = official2023Projection.ilceResults[ilceId];
    if (!iRes) return null;
    const provName = projection.provinceResults[iRes.ilId]?.name || iRes.ilId;
    const sorted = [...parties]
      .filter((p) => !p.isOther && (iRes.partyVotes[p.id] || 0) > 0)
      .sort((a, b) => (iRes.partyVotes[b.id] || 0) - (iRes.partyVotes[a.id] || 0));
    const barEntries = sorted.map((p) => ({
      id: p.id,
      shortName: p.shortName,
      color: p.color,
      share: iRes.partyShares[p.id] || 0,
      votes: iRes.partyVotes[p.id] || 0,
      deltaShare: baseIRes
        ? (iRes.partyShares[p.id] || 0) - (baseIRes.partyShares[p.id] || 0)
        : undefined,
    }));
    const topEntries = barEntries.slice(0, 6);
    const isLocked = Boolean(ilceOverrides[ilceId]?.isLocked);
    const runner = sorted[1];
    return {
      name: iRes.name,
      fill: getFillColor(
        iRes.leadingPartyId,
        iRes.partyShares,
        baseIRes?.partyShares || {},
        iRes.marginPct,
        iRes.turnout
      ),
      isLocked,
      telemetry: {
        id: ilceId,
        mode: 'parliamentary',
        title: iRes.name,
        subtitle: `${provName} · ${lang === 'tr' ? 'Bölge' : 'Dist'} ${iRes.districtId}`,
        unitBadge: lang === 'tr' ? 'İlçe' : 'Sub-district',
        registeredVoters: iRes.registeredVoters,
        turnout: iRes.turnout,
        validVotes: iRes.validVotes,
        isLocked,
        leader: partyMap[iRes.leadingPartyId]
          ? {
              shortName: partyMap[iRes.leadingPartyId].shortName,
              color: partyMap[iRes.leadingPartyId].color,
              share: iRes.partyShares[iRes.leadingPartyId] || 0,
            }
          : undefined,
        runnerUp: runner
          ? {
              shortName: runner.shortName,
              color: runner.color,
              share: iRes.partyShares[runner.id] || 0,
            }
          : undefined,
        marginPct: iRes.marginPct,
        marginVotes: Math.max(
          0,
          (iRes.partyVotes[iRes.leadingPartyId] || 0) - (runner ? iRes.partyVotes[runner.id] || 0 : 0)
        ),
        topEntries,
        barEntries,
      },
    };
  };

  const resolveDistrictMapData = (
    dId: string
  ): { fill: string; isLocked: boolean; telemetry: HoverTelemetryData } | null => {
    const dRes = projection.districtResults[dId];
    const baseDRes = official2023Projection.districtResults[dId];
    if (!dRes) return null;
    const isLocked = Boolean(districtOverrides[dId]?.isLocked);
    const sorted = [...parties]
      .filter((p) => !p.isOther && (dRes.totalPartyVotes[p.id] || 0) > 0)
      .sort((a, b) => (dRes.totalPartyVotes[b.id] || 0) - (dRes.totalPartyVotes[a.id] || 0));
    const barEntries = sorted.map((p) => ({
      id: p.id,
      shortName: p.shortName,
      color: p.color,
      share: dRes.partyShares[p.id] || 0,
      votes: dRes.totalPartyVotes[p.id] || 0,
      seats: dRes.partySeats[p.id] || 0,
      deltaShare: baseDRes
        ? (dRes.partyShares[p.id] || 0) - (baseDRes.partyShares[p.id] || 0)
        : undefined,
    }));
    const topEntries = barEntries.slice(0, 6);
    const challenger = dRes.closestChallengerPartyId
      ? partyMap[dRes.closestChallengerPartyId]
      : undefined;
    const runner = sorted[1];
    return {
      fill: getFillColor(
        dRes.leadingPartyId,
        dRes.partyShares,
        baseDRes?.partyShares || {},
        dRes.marginPct,
        dRes.turnout
      ),
      isLocked,
      telemetry: {
        id: dId,
        mode: 'parliamentary',
        title: `${dId} · ${dRes.name}`,
        subtitle:
          lang === 'tr'
            ? `${dRes.mpCount} milletvekili · Çift tıkla: ilçeler`
            : `${dRes.mpCount} MPs · Double-click: districts`,
        unitBadge: lang === 'tr' ? 'Seçim Çevresi' : 'District',
        registeredVoters: dRes.registeredVoters,
        turnout: dRes.turnout,
        validVotes: dRes.totalValidVotes,
        isLocked,
        leader: partyMap[dRes.leadingPartyId]
          ? {
              shortName: partyMap[dRes.leadingPartyId].shortName,
              color: partyMap[dRes.leadingPartyId].color,
              share: dRes.partyShares[dRes.leadingPartyId] || 0,
            }
          : undefined,
        runnerUp: runner
          ? {
              shortName: runner.shortName,
              color: runner.color,
              share: dRes.partyShares[runner.id] || 0,
            }
          : undefined,
        marginPct: dRes.marginPct,
        marginVotes: Math.max(
          0,
          (dRes.totalPartyVotes[dRes.leadingPartyId] || 0) -
            (runner ? dRes.totalPartyVotes[runner.id] || 0 : 0)
        ),
        topEntries,
        barEntries,
        mpCount: dRes.mpCount,
        closestChallengerShort: challenger?.shortName,
        closestChallengerColor: challenger?.color,
        votesToFlipLastSeat: challenger ? dRes.votesToFlipLastSeat : undefined,
      },
    };
  };

  const resolveProvinceMapData = (
    ilId: string
  ): { fill: string; isLocked: boolean; telemetry: HoverTelemetryData } | null => {
    if (electionMode === 'presidential') {
      const u = activePresRound.provinceResults[ilId];
      if (!u) return null;
      const leaderColor = candMap[u.leadingCandidateId]?.color || '#64748b';
      const sorted = presCandidates
        .filter((c) => !c.isOther && (u.candidateVotes[c.id] || 0) > 0)
        .sort((a, b) => (u.candidateVotes[b.id] || 0) - (u.candidateVotes[a.id] || 0));
      const barEntries = sorted.map((c) => ({
        id: c.id,
        shortName: c.shortName,
        color: c.color,
        share: u.candidateShares[c.id] || 0,
        votes: u.candidateVotes[c.id] || 0,
      }));
      const topEntries = barEntries.slice(0, 6);
      const isLocked = Boolean(presProvinceOverrides[ilId]?.isLocked);
      return {
        fill: getCustomEntityFill(leaderColor, u.marginPct, u.turnout, undefined, {
          shares: u.candidateShares,
          runnerUpColor: focusColorById[u.runnerUpCandidateId],
        }),
        isLocked,
        telemetry: {
          id: ilId,
          mode: 'presidential',
          title: `${u.id} · ${u.name}`,
          subtitle: `${presRoundView === 'round2' ? '2. Tur' : '1. Tur'} · ${
            lang === 'tr' ? 'Çift tıkla: ilçeler' : 'Double-click: districts'
          }`,
          unitBadge: lang === 'tr' ? 'İl' : 'Province',
          registeredVoters: u.registeredVoters,
          turnout: u.turnout,
          validVotes: u.validVotes,
          isLocked,
          leader: sorted[0]
            ? {
                shortName: sorted[0].shortName,
                color: sorted[0].color,
                share: u.candidateShares[sorted[0].id] || 0,
              }
            : undefined,
          runnerUp: sorted[1]
            ? {
                shortName: sorted[1].shortName,
                color: sorted[1].color,
                share: u.candidateShares[sorted[1].id] || 0,
              }
            : undefined,
          marginPct: u.marginPct,
          marginVotes: u.marginVotes,
          topEntries,
          barEntries,
          presRound: presRoundView,
        },
      };
    }

    if (electionMode === 'local') {
      const p = localProjection.provinceResults[ilId];
      if (!p) return null;
      const winP = partyMap[p.winnerPartyId];
      const oldP = partyMap[p.winner2024PartyId];
      const sorted = parties
        .filter((pt) => !pt.isOther && (p.partyVotes[pt.id] || 0) > 0)
        .sort((a, b) => (p.partyVotes[b.id] || 0) - (p.partyVotes[a.id] || 0));
      const barEntries = sorted.map((pt) => ({
        id: pt.id,
        shortName: pt.shortName,
        color: pt.color,
        share: p.partyShares[pt.id] || 0,
        votes: p.partyVotes[pt.id] || 0,
      }));
      const topEntries = barEntries.slice(0, 6);
      const prefix = p.isBuyuksehir
        ? lang === 'tr'
          ? 'Büyükşehir'
          : 'Metro'
        : p.countingBasis === 'merkez_ilce'
        ? lang === 'tr'
          ? 'İl Merkezi'
          : 'Prov Center'
        : lang === 'tr'
        ? 'İl Geneli'
        : 'Prov Wide';
      const isLocked = Boolean(localProvinceOverrides[ilId]?.isLocked);
      return {
        fill: getCustomEntityFill(
          winP?.color || '#64748b',
          p.marginPct,
          p.turnout,
          p.flippedFrom2024,
          {
            shares: p.partyShares,
            runnerUpColor: partyMap[p.runnerUpPartyId]?.color,
          }
        ),
        isLocked,
        telemetry: {
          id: ilId,
          mode: 'local',
          title: `${p.id} · ${p.name}`,
          subtitle: lang === 'tr' ? 'Çift tıkla: ilçe haritası' : 'Double-click: districts',
          unitBadge: prefix,
          registeredVoters: p.registeredVoters,
          turnout: p.turnout,
          validVotes: p.validVotes,
          isLocked,
          leader: winP
            ? {
                shortName: winP.shortName,
                color: winP.color,
                share: p.partyShares[winP.id] || 0,
              }
            : undefined,
          runnerUp: partyMap[p.runnerUpPartyId]
            ? {
                shortName: partyMap[p.runnerUpPartyId].shortName,
                color: partyMap[p.runnerUpPartyId].color,
                share: p.partyShares[p.runnerUpPartyId] || 0,
              }
            : undefined,
          marginPct: p.marginPct,
          marginVotes: p.marginVotes,
          topEntries,
          barEntries,
          localRefLabel:
            localProjection.referenceBaseline === 'current'
              ? lang === 'tr'
                ? 'Mevcut'
                : 'Current'
              : '2024',
          localPrevWinnerShort: oldP?.shortName || p.winner2024PartyId,
          localPrevWinnerColor: oldP?.color || '#94a3b8',
          localWinnerShort: winP?.shortName || p.winnerPartyId,
          localWinnerColor: winP?.color || '#94a3b8',
          localFlipped: p.flippedFrom2024,
          localStatusBadge: activeDefectionByUnit.prov[ilId],
        },
      };
    }

    const pRes = projection.provinceResults[ilId];
    const basePRes = official2023Projection.provinceResults[ilId];
    if (!pRes) return null;
    const sorted = [...parties]
      .filter((p) => !p.isOther && (pRes.partyVotes[p.id] || 0) > 0)
      .sort((a, b) => (pRes.partyVotes[b.id] || 0) - (pRes.partyVotes[a.id] || 0));
    const barEntries = sorted.map((p) => ({
      id: p.id,
      shortName: p.shortName,
      color: p.color,
      share: pRes.partyShares[p.id] || 0,
      votes: pRes.partyVotes[p.id] || 0,
      seats: pRes.partySeats[p.id] || 0,
      deltaShare: basePRes
        ? (pRes.partyShares[p.id] || 0) - (basePRes.partyShares[p.id] || 0)
        : undefined,
    }));
    const topEntries = barEntries.slice(0, 6);
    const isLocked = Boolean(provinceOverrides[ilId]?.isLocked);
    const runner = sorted[1];
    // For single-district provinces (77 of 81), include district closest challenger info
    const singleDistrict =
      pRes.districtIds.length === 1 ? projection.districtResults[pRes.districtIds[0]] : undefined;
    const challenger = singleDistrict?.closestChallengerPartyId
      ? partyMap[singleDistrict.closestChallengerPartyId]
      : undefined;
    return {
      fill: getFillColor(
        pRes.leadingPartyId,
        pRes.partyShares,
        basePRes?.partyShares || {},
        pRes.marginPct,
        pRes.turnout
      ),
      isLocked,
      telemetry: {
        id: ilId,
        mode: 'parliamentary',
        title: `${pRes.id} · ${pRes.name}`,
        subtitle:
          lang === 'tr'
            ? `${pRes.mpCount} milletvekili · Çift tıkla: ilçeler`
            : `${pRes.mpCount} MPs · Double-click: districts`,
        unitBadge: lang === 'tr' ? 'İl' : 'Province',
        registeredVoters: pRes.registeredVoters,
        turnout: pRes.turnout,
        validVotes: pRes.totalValidVotes,
        isLocked,
        leader: partyMap[pRes.leadingPartyId]
          ? {
              shortName: partyMap[pRes.leadingPartyId].shortName,
              color: partyMap[pRes.leadingPartyId].color,
              share: pRes.partyShares[pRes.leadingPartyId] || 0,
            }
          : undefined,
        runnerUp: runner
          ? {
              shortName: runner.shortName,
              color: runner.color,
              share: pRes.partyShares[runner.id] || 0,
            }
          : undefined,
        marginPct: pRes.marginPct,
        marginVotes: Math.max(
          0,
          (pRes.partyVotes[pRes.leadingPartyId] || 0) - (runner ? pRes.partyVotes[runner.id] || 0 : 0)
        ),
        topEntries,
        barEntries,
        mpCount: pRes.mpCount,
        closestChallengerShort: challenger?.shortName,
        closestChallengerColor: challenger?.color,
        votesToFlipLastSeat: challenger ? singleDistrict?.votesToFlipLastSeat : undefined,
      },
    };
  };

  const resolveAbroadCountryMapData = (
    countryId: string
  ): { fill: string; isLocked: boolean; telemetry: HoverTelemetryData } | null => {
    const baseC = ABROAD_COUNTRY_BY_ID[countryId];
    if (!baseC) return null;

    if (electionMode === 'presidential') {
      const u = activePresRound.abroadCountryResults[countryId];
      if (!u) return null;
      const leaderColor = candMap[u.leadingCandidateId]?.color || '#64748b';
      const sorted = presCandidates
        .filter((c) => !c.isOther && (u.candidateVotes[c.id] || 0) > 0)
        .sort((a, b) => (u.candidateVotes[b.id] || 0) - (u.candidateVotes[a.id] || 0));
      const barEntries = sorted.map((c) => ({
        id: c.id,
        shortName: c.shortName,
        color: c.color,
        share: u.candidateShares[c.id] || 0,
        votes: u.candidateVotes[c.id] || 0,
      }));
      const topEntries = barEntries.slice(0, 6);
      const isLocked = Boolean(presAbroadCountryOverrides[countryId]?.isLocked);
      return {
        fill: getCustomEntityFill(leaderColor, u.marginPct, u.turnout, undefined, {
          shares: u.candidateShares,
          runnerUpColor: focusColorById[u.runnerUpCandidateId],
        }),
        isLocked,
        telemetry: {
          id: countryId,
          mode: 'presidential',
          title: lang === 'tr' ? baseC.nameTr : baseC.nameEn,
          subtitle: `${presRoundView === 'round2' ? '2. Tur' : '1. Tur'} · ${baseC.region}`,
          unitBadge: lang === 'tr' ? 'Yurt Dışı' : 'Abroad',
          registeredVoters: u.registeredVoters,
          turnout: u.turnout,
          validVotes: u.validVotes,
          isLocked,
          leader: sorted[0]
            ? {
                shortName: sorted[0].shortName,
                color: sorted[0].color,
                share: u.candidateShares[sorted[0].id] || 0,
              }
            : undefined,
          runnerUp: sorted[1]
            ? {
                shortName: sorted[1].shortName,
                color: sorted[1].color,
                share: u.candidateShares[sorted[1].id] || 0,
              }
            : undefined,
          marginPct: u.marginPct,
          marginVotes: u.marginVotes,
          topEntries,
          barEntries,
          presRound: presRoundView,
        },
      };
    }

    const cRes = projection.abroadCountryResults[countryId];
    if (!cRes) return null;
    const sorted = [...parties]
      .filter((p) => !p.isOther && (cRes.partyVotes[p.id] || 0) > 0)
      .sort((a, b) => (cRes.partyVotes[b.id] || 0) - (cRes.partyVotes[a.id] || 0));
    const barEntries = sorted.map((p) => ({
      id: p.id,
      shortName: p.shortName,
      color: p.color,
      share: cRes.partyShares[p.id] || 0,
      votes: cRes.partyVotes[p.id] || 0,
      deltaShare: (cRes.partyShares[p.id] || 0) - (baseC.partyShares[p.id] || 0),
    }));
    const topEntries = barEntries.slice(0, 6);
    const isLocked = Boolean(abroadCountryOverrides[countryId]?.isLocked);
    const runner = sorted[1];
    return {
      fill: getFillColor(
        cRes.leadingPartyId,
        cRes.partyShares,
        baseC.partyShares,
        cRes.marginPct,
        cRes.turnout
      ),
      isLocked,
      telemetry: {
        id: countryId,
        mode: 'parliamentary',
        title: lang === 'tr' ? cRes.nameTr : cRes.nameEn,
        subtitle: cRes.isCustoms
          ? lang === 'tr'
            ? '46 Gümrük Kapısı'
            : '46 Customs Ports'
          : `${lang === 'tr' ? 'Yurt Dışı' : 'Abroad'} · ${cRes.region}`,
        unitBadge: lang === 'tr' ? 'Ülke' : 'Country',
        registeredVoters: cRes.registeredVoters,
        turnout: cRes.turnout,
        validVotes: cRes.validVotes,
        isLocked,
        leader: partyMap[cRes.leadingPartyId]
          ? {
              shortName: partyMap[cRes.leadingPartyId].shortName,
              color: partyMap[cRes.leadingPartyId].color,
              share: cRes.partyShares[cRes.leadingPartyId] || 0,
            }
          : undefined,
        runnerUp: runner
          ? {
              shortName: runner.shortName,
              color: runner.color,
              share: cRes.partyShares[runner.id] || 0,
            }
          : undefined,
        marginPct: cRes.marginPct,
        marginVotes: cRes.marginVotes,
        topEntries,
        barEntries,
      },
    };
  };

  const zoomedProvResult = zoomedProvinceId
    ? projection.provinceResults[zoomedProvinceId]
    : null;
  const selectedIlceResult =
    activeScope.type === 'ilce' ? projection.ilceResults[activeScope.ilceId] : null;
  const selectedProvResult =
    activeScope.type === 'province'
      ? projection.provinceResults[activeScope.ilId]
      : activeScope.type === 'district'
      ? projection.provinceResults[
          projection.districtResults[activeScope.districtId]?.ilId || ''
        ]
      : selectedIlceResult
      ? projection.provinceResults[selectedIlceResult.ilId]
      : zoomedProvResult;

  const partyColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of parties) m[p.id] = p.color;
    return m;
  }, [parties]);

  const renderSeatCircleCluster = (
    feat: GeoFeature,
    partySeats: Record<string, number>,
    partyVotes: Record<string, number>,
    offsetMap: Record<string, [number, number]>,
    isIstanbul: boolean
  ) => {
    const rawCentroid = pathGenerator.centroid(feat as any);
    const layout = computeSeatClusterLayout(
      feat.properties.id,
      rawCentroid,
      partySeats,
      partyVotes,
      partyColorMap,
      offsetMap,
      isIstanbul,
      1
    );
    if (!layout) return null;

    return (
      <g key={`seats-${feat.properties.id}`}>
        {layout.leaderLine && (
          <line
            x1={layout.leaderLine.x1}
            y1={layout.leaderLine.y1}
            x2={layout.leaderLine.x2}
            y2={layout.leaderLine.y2}
            stroke="#090a0f"
            strokeWidth={0.75}
            strokeOpacity={0.65}
          />
        )}
        {layout.dots.map((dot, idx) => (
          <circle
            key={`${feat.properties.id}-s-${idx}`}
            cx={dot.x}
            cy={dot.y}
            r={dot.r}
            fill={dot.color}
            stroke="#090a0f"
            strokeWidth={0.7}
          />
        ))}
      </g>
    );
  };

  const handleHoverEnterOrMove = (
    telemetry: HoverTelemetryData,
    clientX: number,
    clientY: number
  ) => {
    if (lastInputTouchRef.current) return;
    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      setHoverCursor({ x: clientX - rect.left, y: clientY - rect.top });
      setHoverContainerSize({ width: rect.width, height: rect.height });
    }
    setHovered((prev) => (prev?.id === telemetry.id && prev === telemetry ? prev : telemetry));
  };

  const selectMapEntity = (
    scope: typeof activeScope,
    telemetry: HoverTelemetryData,
    zoomProvId?: string
  ) => {
    setActiveScope(scope);
    if (lastInputTouchRef.current || (typeof window !== 'undefined' && window.innerWidth < 1024)) {
      setTouchTelemetry({ data: telemetry, zoomProvinceId: zoomProvId });
    }
  };

  const handleExportPng = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('viewBox', '0 0 980 470');
    const rootGroup = clone.querySelector('g');
    if (rootGroup) {
      rootGroup.setAttribute('transform', 'translate(0, 0) scale(1)');
    }

    const slug = zoomedProvinceId
      ? `${(zoomedProvResult?.name || zoomedProvinceId).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-ilce-haritasi`
      : mapLayer === 'abroad_world'
      ? 'yurt-disi-dunya-haritasi'
      : mapLayer === '87_district'
      ? '87-secim-cevresi-haritasi'
      : mapLayer === '81_il'
      ? '81-il-haritasi'
      : '973-ilce-haritasi';

    void renderSvgElementToPngBlob(clone, 2, '#ffffff').then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `kalkulus-${slug}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="studio-panel flex flex-col overflow-hidden">
      {/* Top Map Header: Architectural Breadcrumb + Layer & Color Controls */}
      <div className="px-3 sm:px-4 py-2.5 border-b-[1.5px] border-[#090A0F] flex flex-wrap items-center justify-between gap-2.5 bg-white">
        {/* Interactive Breadcrumb Trail */}
        <div className="flex flex-wrap items-center gap-1.5 text-body font-medium">
          <button
            onClick={() => {
              setZoomedProvinceId(null);
              if (mapLayer === 'abroad_world') {
                setMapLayer(electionMode === 'parliamentary' ? '87_district' : '81_il');
              }
              setActiveScope({ type: 'national' });
            }}
            className={`px-2 py-1 border transition-colors ${
              !zoomedProvinceId && !isWorldView && activeScope.type === 'national'
                ? 'bg-[#090A0F] text-white border-[#090A0F]'
                : 'border-transparent text-slate-600 hover:border-[#090A0F] hover:text-[#090A0F]'
            }`}
          >
            {lang === 'tr' ? 'Türkiye' : 'Turkey'}
          </button>

          {isWorldView && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                onClick={() => setActiveScope({ type: 'abroad' })}
                className={`px-2 py-1 border transition-colors ${
                  activeScope.type !== 'abroadCountry'
                    ? 'bg-[#090A0F] text-white border-[#090A0F]'
                    : 'border-transparent text-slate-700 hover:border-[#090A0F]'
                }`}
              >
                {lang === 'tr' ? 'Yurt Dışı' : 'Abroad'}
              </button>
              {activeScope.type === 'abroadCountry' && ABROAD_COUNTRY_BY_ID[activeScope.countryId] && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-1 bg-[#090A0F] text-white">
                    {lang === 'tr'
                      ? ABROAD_COUNTRY_BY_ID[activeScope.countryId].nameTr
                      : ABROAD_COUNTRY_BY_ID[activeScope.countryId].nameEn}
                  </span>
                </>
              )}
            </>
          )}

          {selectedProvResult && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                onClick={() => {
                  setActiveScope({ type: 'province', ilId: selectedProvResult.id });
                }}
                className={`px-2 py-1 border transition-colors ${
                  (activeScope.type === 'province' ||
                    (activeScope.type === 'district' &&
                      !['34', '06', '35', '16'].includes(selectedProvResult.id))) &&
                  !selectedIlceResult
                    ? 'bg-[#090A0F] text-white border-[#090A0F]'
                    : 'border-transparent text-slate-700 hover:border-[#090A0F]'
                }`}
              >
                <span className="font-mono">{selectedProvResult.id}</span> · {selectedProvResult.name}
                {electionMode === 'parliamentary' ? ` (${selectedProvResult.mpCount} MV)` : ''}
              </button>
            </>
          )}

          {electionMode === 'parliamentary' &&
            activeScope.type === 'district' &&
            selectedProvResult &&
            ['34', '06', '35', '16'].includes(selectedProvResult.id) && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="px-2 py-1 bg-[#090A0F] text-white">
                  {projection.districtResults[activeScope.districtId]?.name}
                </span>
              </>
            )}

          {selectedIlceResult && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2 py-1 bg-[#090A0F] text-white">
                {selectedIlceResult.name}
              </span>
            </>
          )}

          {selectedProvResult && !zoomedProvinceId && (
            <button
              onClick={() => setZoomedProvinceId(selectedProvResult.id)}
              className="ml-2 studio-btn px-2.5 py-1 text-micro"
            >
              <ZoomIn className="w-3 h-3" />
              <span>{lang === 'tr' ? 'İlçe sınırlarına yakınlaş' : 'Zoom to districts'}</span>
            </button>
          )}

          {zoomedProvinceId && (
            <button
              onClick={() => setZoomedProvinceId(null)}
              className="ml-2 studio-btn px-2.5 py-1 text-micro"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{lang === 'tr' ? 'Tüm Türkiye haritası' : 'All Turkey map'}</span>
            </button>
          )}
        </div>

        {/* Right Toolbar: Layer Toggle + Round Switch + Color Mode */}
        <div className="flex flex-wrap items-center gap-2 text-body">
          {electionMode === 'presidential' && (
            <div className="inline-flex border-[1.5px] border-[#090A0F] bg-white text-micro font-bold">
              {(['round1', 'round2'] as const).map((rv, idx) => (
                <button
                  key={rv}
                  onClick={() => setPresRoundView(rv)}
                  className={`px-2.5 py-1 transition-colors ${
                    idx > 0 ? 'border-l border-[#090A0F]' : ''
                  } ${
                    presRoundView === rv
                      ? 'bg-[#090A0F] text-white'
                      : 'text-[#090A0F] hover:bg-slate-100'
                  }`}
                >
                  {rv === 'round1' ? (lang === 'tr' ? '1. Tur' : 'Round 1') : lang === 'tr' ? '2. Tur' : 'Round 2'}
                </button>
              ))}
            </div>
          )}

          {isWorldView ? (
            <div className="inline-flex items-center gap-2 border-[1.5px] border-[#090A0F] bg-[#090A0F] text-white px-2.5 py-1 text-micro font-bold">
              <Globe2 className="w-3.5 h-3.5" />
              <span>{lang === 'tr' ? 'Yurt Dışı & Gümrük' : 'Abroad & Customs'}</span>
              <button
                type="button"
                onClick={() => {
                  setActiveScope({ type: 'national' });
                  setMapLayer(electionMode === 'parliamentary' ? '87_district' : '81_il');
                }}
                className="ml-1 px-1.5 py-0.5 bg-white text-[#090A0F] hover:bg-slate-200 transition-colors"
              >
                {lang === 'tr' ? 'Türkiye Haritası' : 'Turkey Map'}
              </button>
            </div>
          ) : (
            <div className="inline-flex flex-wrap border-[1.5px] border-[#090A0F] bg-white text-micro font-medium">
              {(
                (electionMode === 'parliamentary'
                  ? [
                      ['87_district', lang === 'tr' ? '87 bölge' : '87 dist'],
                      ['81_il', lang === 'tr' ? '81 il' : '81 prov'],
                      ['973_ilce', lang === 'tr' ? '973 ilçe' : '973 sub'],
                    ]
                  : [
                      ['81_il', lang === 'tr' ? '81 il' : '81 prov'],
                      ['973_ilce', lang === 'tr' ? '973 ilçe' : '973 sub'],
                    ]) as [MapLayerMode, string][]
              ).map(([lKey, label], idx) => (
                <button
                  key={lKey}
                  onClick={() => {
                    setMapLayer(lKey);
                    if (lKey !== '973_ilce') setZoomedProvinceId(null);
                  }}
                  className={`px-2 sm:px-2.5 py-1.5 sm:py-1 transition-colors flex items-center gap-1 ${
                    idx > 0 ? 'border-l border-[#090A0F]' : ''
                  } ${
                    mapLayer === lKey && !zoomedProvinceId
                      ? 'bg-[#090A0F] text-white'
                      : 'text-[#090A0F] hover:bg-slate-100'
                  }`}
                >
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}

          <select
            value={mapColorMode}
            onChange={(e) => setMapColorMode(e.target.value as MapColorMode)}
            className="studio-input border-[#090A0F] px-2.5 py-1 text-micro font-medium text-[#090A0F] cursor-pointer"
          >
            <option value="leader">
              {electionMode === 'presidential'
                ? lang === 'tr'
                  ? 'Kazanan aday'
                  : 'Leading candidate'
                : t.colorLeader}
            </option>
            <option value="runner_up">
              {electionMode === 'presidential'
                ? lang === 'tr'
                  ? 'İkinci aday'
                  : 'Runner-up candidate'
                : lang === 'tr'
                ? 'İkinci parti'
                : 'Runner-up party'}
            </option>
            {electionMode === 'parliamentary' && <option value="alliance">{t.colorAlliance}</option>}
            {electionMode === 'local' && (
              <option value="flips">
                {localProjection.referenceBaseline === 'current'
                  ? lang === 'tr'
                    ? 'Mevcut yönetimden el değiştirenler'
                    : 'Flipped from current control'
                  : lang === 'tr'
                  ? "2024'ten el değiştirenler"
                  : 'Flipped from 2024'}
              </option>
            )}
            <option value="margin">{lang === 'tr' ? 'Başa baş / Fark' : 'Battleground margin'}</option>
            <option value="party_share">
              {electionMode === 'presidential'
                ? lang === 'tr'
                  ? 'Aday yoğunluğu'
                  : 'Candidate heatmap'
                : lang === 'tr'
                ? 'Parti yoğunluğu'
                : 'Party heatmap'}
            </option>
            {electionMode === 'parliamentary' && (
              <option value="swing">{lang === 'tr' ? 'Salınım (±pp)' : 'Swing (±pp)'}</option>
            )}
            <option value="turnout">{t.colorTurnout}</option>
          </select>

          {(mapColorMode === 'party_share' || (mapColorMode === 'swing' && electionMode === 'parliamentary')) && (
            <select
              value={mapColorMode === 'party_share' ? effectiveFocusId : mapFocusEntityId || ''}
              onChange={(e) => setMapFocusEntityId(e.target.value || null)}
              className="studio-input border-[#090A0F] px-2 py-1 text-micro font-bold text-[#090A0F] cursor-pointer"
              title={lang === 'tr' ? 'Haritada odaklanılacak parti/aday' : 'Focus party/candidate'}
            >
              {mapColorMode === 'swing' && (
                <option value="">{lang === 'tr' ? 'En büyük artış' : 'Top positive swing'}</option>
              )}
              {focusEntityList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.shortName}
                </option>
              ))}
            </select>
          )}

          {electionMode === 'parliamentary' &&
            !zoomedProvinceId &&
            !isWorldView &&
            (mapLayer === '87_district' || mapLayer === '81_il') && (
              <button
                onClick={() => setShowSeatCircles((s) => !s)}
                className={`px-2.5 py-1 border-[1.5px] border-[#090A0F] text-micro font-medium flex items-center gap-1.5 transition-colors ${
                  showSeatCircles
                    ? 'bg-[#090A0F] text-white'
                    : 'bg-white text-[#090A0F] hover:bg-slate-100'
                }`}
                title={lang === 'tr' ? 'Harita üzerinde MV dairelerini göster/gizle' : 'Toggle seat circles'}
              >
                <CircleDot className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? 'MV daireleri' : 'Seat circles'}</span>
              </button>
            )}

          <button
            onClick={() => setHoverDockedCorner((d) => !d)}
            className={`px-2.5 py-1 border-[1.5px] border-[#090A0F] text-micro font-medium flex items-center gap-1.5 transition-colors ${
              hoverDockedCorner
                ? 'bg-[#090A0F] text-white'
                : 'bg-white text-[#090A0F] hover:bg-slate-100'
            }`}
            title={
              lang === 'tr'
                ? 'Sonuç penceresi konumu: imleci takip et / köşeye sabitle'
                : 'Hover panel mode: follow cursor / dock corner'
            }
          >
            {hoverDockedCorner ? <Pin className="w-3.5 h-3.5" /> : <MousePointer2 className="w-3.5 h-3.5" />}
            <span>{hoverDockedCorner ? (lang === 'tr' ? 'Köşe' : 'Docked') : (lang === 'tr' ? 'İmleçte' : 'Cursor')}</span>
          </button>

          <button
            onClick={handleExportPng}
            disabled={!isMapReady}
            className="studio-btn px-2.5 py-1 text-micro font-medium disabled:opacity-40"
            title={lang === 'tr' ? 'Haritayı PNG olarak indir' : 'Export map as PNG'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'tr' ? 'PNG indir' : 'Export PNG'}</span>
          </button>
        </div>
      </div>

      {/* Main Vector Map Canvas (No cluttered text labels on provinces/districts!) */}
      <div
        ref={viewportRef}
        style={{ touchAction: zoom > 1 ? 'none' : 'pan-y' }}
        className="relative w-full studio-map-grid overflow-hidden select-none"
        onPointerLeave={() => {
          setHovered(null);
          setIsDragging(false);
        }}
        onPointerDown={(e) => {
          lastInputTouchRef.current = e.pointerType === 'touch';
          if (e.pointerType !== 'touch' && e.button !== 0) return;
          activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (activePointersRef.current.size === 2) {
            const pts = Array.from(activePointersRef.current.values());
            const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            pinchStartRef.current = { dist: Math.max(1, dist), zoom };
            panAnchorRef.current = null;
            setIsDragging(false);
            return;
          }
          if (e.pointerType !== 'touch' || zoom > 1) {
            panAnchorRef.current = {
              x: e.clientX,
              y: e.clientY,
              startPanX: pan.x,
              startPanY: pan.y,
              moved: false,
            };
          }
        }}
        onPointerMove={(e) => {
          if (activePointersRef.current.has(e.pointerId)) {
            activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          }
          if (activePointersRef.current.size === 2 && pinchStartRef.current) {
            const pts = Array.from(activePointersRef.current.values());
            const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            const nextZoom = Math.min(
              6,
              Math.max(1, Number((pinchStartRef.current.zoom * (dist / pinchStartRef.current.dist)).toFixed(2)))
            );
            setZoom(nextZoom);
            if (nextZoom <= 1.02) setPan({ x: 0, y: 0 });
            return;
          }
          const anchor = panAnchorRef.current;
          if (anchor && activePointersRef.current.size === 1) {
            const dx = e.clientX - anchor.x;
            const dy = e.clientY - anchor.y;
            if (!anchor.moved && Math.hypot(dx, dy) > 5) {
              anchor.moved = true;
              setIsDragging(true);
            }
            if (anchor.moved) {
              setPan({ x: anchor.startPanX + dx, y: anchor.startPanY + dy });
            }
          }
        }}
        onPointerUp={(e) => {
          activePointersRef.current.delete(e.pointerId);
          if (activePointersRef.current.size < 2) pinchStartRef.current = null;
          if (activePointersRef.current.size === 0) {
            panAnchorRef.current = null;
            setTimeout(() => setIsDragging(false), 0);
          }
        }}
        onPointerCancel={(e) => {
          activePointersRef.current.delete(e.pointerId);
          pinchStartRef.current = null;
          panAnchorRef.current = null;
          setIsDragging(false);
        }}
      >
        {!isMapReady ? (
          <div className="h-[300px] sm:h-[460px] flex items-center justify-center text-body text-slate-500">
            {lang === 'tr' ? 'Harita vektörleri yükleniyor...' : 'Loading map vectors...'}
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox="0 0 980 470"
            className={`w-full h-auto block ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onMouseLeave={() => setHovered(null)}
            onMouseMove={(e) => {
              if (lastInputTouchRef.current || isDragging) {
                if (hovered) setHovered(null);
                return;
              }
              const tag = (e.target as SVGElement).tagName;
              if (tag !== 'path' && tag !== 'rect') {
                if (hovered) setHovered(null);
              }
            }}
          >
            <g
              transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
              style={{ transformOrigin: 'center center' }}
            >
              {/* CASE 0: Abroad World Map + KKTC & Gümrük Kapıları Insets */}
              {isWorldView && worldGeo ? (
                <g>
                  {worldGeo.features.map((feat, idx) => {
                    const id = feat.properties.id;
                    const pathD = worldPathGenerator(feat as any) || '';
                    if (!pathD) return null;

                    if (feat.properties.isTurkey) {
                      return (
                        <path
                          key={`world-tr-${idx}`}
                          d={pathD}
                          fill="#cbd5e1"
                          fillRule="evenodd"
                          stroke="#090a0f"
                          strokeWidth={0.9}
                          className="pointer-events-none"
                        />
                      );
                    }

                    if (!feat.properties.isBallotCountry) {
                      return (
                        <path
                          key={`world-bg-${id}-${idx}`}
                          d={pathD}
                          fill="#f1f5f9"
                          fillRule="evenodd"
                          stroke="#cbd5e1"
                          strokeWidth={0.4}
                          className="pointer-events-none"
                        />
                      );
                    }

                    const view = resolveAbroadCountryMapData(id);
                    if (!view) return null;
                    const isSelected =
                      activeScope.type === 'abroadCountry' && activeScope.countryId === id;

                    return (
                      <path
                        key={`world-${id}-${idx}`}
                        d={pathD}
                        fill={view.fill}
                        fillRule="evenodd"
                        stroke={isSelected ? '#090a0f' : view.isLocked ? '#f59e0b' : '#090a0f'}
                        strokeWidth={isSelected ? 2.0 : view.isLocked ? 1.5 : 0.6}
                        className="cursor-pointer transition-opacity hover:opacity-85"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDragging) return;
                          selectMapEntity({ type: 'abroadCountry', countryId: id }, view.telemetry);
                        }}
                        onMouseMove={(e) => {
                          if (isDragging) return;
                          handleHoverEnterOrMove(view.telemetry, e.clientX, e.clientY);
                        }}
                      />
                    );
                  })}

                  {/* Dedicated Corner Insets: KKTC & 46 Gümrük Kapıları */}
                  {(
                    [
                      { id: 'KKTC', y: 348, title: 'KKTC', subTr: '81 bin oy', subEn: '81k votes' },
                      {
                        id: 'CUSTOMS',
                        y: 404,
                        title: lang === 'tr' ? 'Gümrük Kapıları' : 'Customs Gates',
                        subTr: '46 kapı · 145 bin oy',
                        subEn: '46 ports · 145k votes',
                      },
                    ] as const
                  ).map((inset) => {
                    const view = resolveAbroadCountryMapData(inset.id);
                    if (!view) return null;
                    const isSelected =
                      activeScope.type === 'abroadCountry' && activeScope.countryId === inset.id;
                    return (
                      <g
                        key={`inset-${inset.id}`}
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDragging) return;
                          selectMapEntity(
                            { type: 'abroadCountry', countryId: inset.id },
                            view.telemetry
                          );
                        }}
                        onMouseMove={(e) => {
                          if (isDragging) return;
                          handleHoverEnterOrMove(view.telemetry, e.clientX, e.clientY);
                        }}
                      >
                        <rect
                          x={16}
                          y={inset.y}
                          width={168}
                          height={46}
                          fill="#ffffff"
                          stroke={isSelected ? '#090a0f' : view.isLocked ? '#f59e0b' : '#090a0f'}
                          strokeWidth={isSelected ? 2.2 : 1.3}
                        />
                        <rect
                          x={22}
                          y={inset.y + 7}
                          width={14}
                          height={32}
                          fill={view.fill}
                          stroke="#090a0f"
                          strokeWidth={0.8}
                        />
                        <text
                          x={44}
                          y={inset.y + 21}
                          fontSize={11.5}
                          fontWeight={700}
                          fill="#090a0f"
                        >
                          {inset.title}
                        </text>
                        <text x={44} y={inset.y + 36} fontSize={9.5} fill="#475569">
                          {lang === 'tr' ? inset.subTr : inset.subEn}
                        </text>
                      </g>
                    );
                  })}
                </g>
              ) : zoomedProvinceId && ilcelerGeo ? (
                <g>
                  {(provincesGeo?.features || [])
                    .filter((f) => f.properties.id !== zoomedProvinceId)
                    .map((f) => (
                      <path
                        key={`ctx-${f.properties.id}`}
                        d={pathGenerator(f as any) || ''}
                        fill="#dfe3ea"
                        fillRule="evenodd"
                        stroke="#cbd5e1"
                        strokeWidth={0.7}
                        className="pointer-events-none"
                      />
                    ))}

                  {ilcelerGeo.features
                    .filter((f) => f.properties.ilId === zoomedProvinceId)
                    .map((feat, idx) => {
                      const ilceId = feat.properties.id;
                      const view = resolveIlceMapData(ilceId);
                      if (!view) return null;

                      const isSelected =
                        activeScope.type === 'ilce' && activeScope.ilceId === ilceId;

                      return (
                        <path
                          key={`${ilceId}-${idx}`}
                          d={ilcePathMap.get(ilceId) || pathGenerator(feat as any) || ''}
                          fill={view.fill}
                          fillRule="evenodd"
                          stroke={isSelected ? '#090a0f' : view.isLocked ? '#f59e0b' : '#090a0f'}
                          strokeWidth={isSelected ? 2.8 : view.isLocked ? 2.4 : 1.75}
                          strokeLinejoin="round"
                          className="cursor-pointer transition-opacity hover:opacity-85"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isDragging) return;
                            selectMapEntity({ type: 'ilce', ilceId }, view.telemetry);
                          }}
                          onMouseMove={(e) => {
                            if (isDragging) return;
                            handleHoverEnterOrMove(view.telemetry, e.clientX, e.clientY);
                          }}
                        />
                      );
                    })}
                </g>
              ) : mapLayer === '973_ilce' && ilcelerGeo ? (
                /* CASE 2: Full Turkey 973 İlçe Polygons Map */
                <g>
                  {ilcelerGeo.features.map((feat, idx) => {
                    const ilceId = feat.properties.id;
                    const view = resolveIlceMapData(ilceId);
                    if (!view) return null;

                    const isSelected =
                      activeScope.type === 'ilce' && activeScope.ilceId === ilceId;

                    return (
                      <path
                        key={`${ilceId}-${idx}`}
                        d={ilcePathMap.get(ilceId) || ''}
                        fill={view.fill}
                        fillRule="evenodd"
                        stroke={isSelected ? '#090a0f' : view.isLocked ? '#f59e0b' : '#ffffff'}
                        strokeWidth={isSelected ? 1.5 : 0.3}
                        className="cursor-pointer hover:opacity-85"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDragging) return;
                          selectMapEntity({ type: 'ilce', ilceId }, view.telemetry);
                        }}
                        onMouseMove={(e) => {
                          if (isDragging) return;
                          handleHoverEnterOrMove(view.telemetry, e.clientX, e.clientY);
                        }}
                      />
                    );
                  })}
                  {/* Crisp Region Borders Overlay */}
                  {((electionMode === 'parliamentary' && districts87Geo ? districts87Geo : provincesGeo)?.features || []).map((bFeat) => (
                    <path
                      key={`dborder-${bFeat.properties.id}`}
                      d={pathGenerator(bFeat as any) || ''}
                      fill="none"
                      stroke="#090a0f"
                      strokeWidth={0.75}
                      pointerEvents="none"
                    />
                  ))}
                </g>
              ) : electionMode === 'parliamentary' && mapLayer === '87_district' && districts87Geo ? (
                /* CASE 3 (Default): Unified 87 Electoral Regions (Dissolved from İlçeler, Zero Clutter, No Labels) */
                <g>
                  {districts87Geo.features.map((feat) => {
                    const dId = feat.properties.id;
                    const view = resolveDistrictMapData(dId);
                    if (!view) return null;

                    const isSelected =
                      activeScope.type === 'district' && activeScope.districtId === dId;

                    return (
                      <path
                        key={dId}
                        d={pathGenerator(feat as any) || ''}
                        fill={view.fill}
                        fillRule="evenodd"
                        stroke={isSelected ? '#090a0f' : view.isLocked ? '#f59e0b' : '#090a0f'}
                        strokeWidth={isSelected ? 2.2 : view.isLocked ? 1.8 : 0.65}
                        className="cursor-pointer transition-opacity hover:opacity-85"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDragging) return;
                          selectMapEntity(
                            { type: 'district', districtId: dId },
                            view.telemetry,
                            projection.districtResults[dId]?.ilId
                          );
                        }}
                        onDoubleClick={() => {
                          const ilId = projection.districtResults[dId]?.ilId;
                          if (ilId) setZoomedProvinceId(ilId);
                        }}
                        onMouseMove={(e) => {
                          if (isDragging) return;
                          handleHoverEnterOrMove(view.telemetry, e.clientX, e.clientY);
                        }}
                      />
                    );
                  })}

                  {showSeatCircles && (
                    <g className="pointer-events-none">
                      {districts87Geo.features.map((feat) => {
                        const dId = feat.properties.id;
                        const dRes = projection.districtResults[dId];
                        if (!dRes) return null;
                        return renderSeatCircleCluster(
                          feat,
                          dRes.partySeats,
                          dRes.totalPartyVotes,
                          SEAT_OFFSETS_87,
                          dRes.ilId === '34'
                        );
                      })}
                    </g>
                  )}
                </g>
              ) : provincesGeo ? (
                /* CASE 4: 81 Provinces Vector Map (No Text Labels) */
                <g>
                  {provincesGeo.features.map((feat) => {
                    const ilId = feat.properties.id;
                    const view = resolveProvinceMapData(ilId);
                    if (!view) return null;

                    const isSelected =
                      activeScope.type === 'province' && activeScope.ilId === ilId;

                    return (
                      <path
                        key={ilId}
                        d={pathGenerator(feat as any) || ''}
                        fill={view.fill}
                        fillRule="evenodd"
                        stroke={isSelected ? '#090a0f' : view.isLocked ? '#f59e0b' : '#090a0f'}
                        strokeWidth={isSelected ? 2.2 : view.isLocked ? 1.8 : 0.65}
                        className="cursor-pointer transition-opacity hover:opacity-85"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDragging) return;
                          selectMapEntity({ type: 'province', ilId }, view.telemetry, ilId);
                        }}
                        onDoubleClick={() => setZoomedProvinceId(ilId)}
                        onMouseMove={(e) => {
                          if (isDragging) return;
                          handleHoverEnterOrMove(view.telemetry, e.clientX, e.clientY);
                        }}
                      />
                    );
                  })}

                  {electionMode === 'parliamentary' && showSeatCircles && (
                    <g className="pointer-events-none">
                      {provincesGeo.features.map((feat) => {
                        const ilId = feat.properties.id;
                        const pRes = projection.provinceResults[ilId];
                        if (!pRes) return null;
                        return renderSeatCircleCluster(
                          feat,
                          pRes.partySeats,
                          pRes.partyVotes,
                          SEAT_OFFSETS_81,
                          ilId === '34'
                        );
                      })}
                    </g>
                  )}
                </g>
              ) : null}
            </g>
          </svg>
        )}

        {/* Map Zoom Controls Overlay (Top Right) */}
        <div className="absolute top-2.5 right-2.5 flex items-center bg-white border-[1.5px] border-[#090A0F] shadow-[2px_2px_0px_rgba(9,10,15,0.12)] z-10">
          <button
            onClick={() => setZoom((z) => Math.min(6, Number((z * 1.35).toFixed(2))))}
            className="p-2.5 sm:p-1.5 border-r border-[#090A0F] hover:bg-[#090A0F] hover:text-white text-[#090A0F] transition-colors"
            title="Yakınlaş"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(1, Number((z / 1.35).toFixed(2))))}
            className="p-2.5 sm:p-1.5 border-r border-[#090A0F] hover:bg-[#090A0F] hover:text-white text-[#090A0F] transition-colors"
            title="Uzaklaş"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-2.5 sm:p-1.5 hover:bg-[#090A0F] hover:text-white text-[#090A0F] transition-colors"
            title="Görünümü Sıfırla"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* High-Contrast Monochrome Telemetry Hover Card (Desktop Hover) */}
        {hovered && !lastInputTouchRef.current && (
          <MapHoverCard
            data={hovered}
            lang={lang}
            cursorPos={hoverCursor}
            containerSize={hoverContainerSize}
            dockedCorner={hoverDockedCorner}
          />
        )}
      </div>

      {/* Docked Mobile/Touch Tap Telemetry Sheet */}
      {touchTelemetry && (
        <MapHoverCard
          data={touchTelemetry.data}
          lang={lang}
          cursorPos={null}
          containerSize={hoverContainerSize}
          dockedCorner={true}
          dockedMobileSheet={true}
          onCloseSheet={() => setTouchTelemetry(null)}
          onEditUnit={onEditUnitMobile}
          onZoomProvince={
            touchTelemetry.zoomProvinceId && !zoomedProvinceId
              ? () => {
                  setZoomedProvinceId(touchTelemetry.zoomProvinceId!);
                  setTouchTelemetry(null);
                }
              : undefined
          }
        />
      )}

      {/* Sharp Monochrome Signal Legend Bar */}
      <div className="px-3 sm:px-4 py-2.5 bg-white border-t-[1.5px] border-[#090A0F] flex flex-wrap items-center justify-between gap-2 text-body">
        {mapColorMode === 'margin' ? (
          <div className="flex flex-wrap items-center gap-3 text-micro font-mono">
            <span className="font-bold text-[#090A0F] uppercase">
              {lang === 'tr' ? 'Fark Ölçeği:' : 'Margin Scale:'}
            </span>
            {[
              ['#DC2626', '<%2 Başa baş'],
              ['#F59E0B', '%2–5 Kritik'],
              ['#FDE047', '%5–10 Eğilimli'],
              ['#64748B', '%10–20 Güçlü'],
              ['#1E293B', '>%20 Kale'],
            ].map(([c, lbl]) => (
              <span key={lbl} className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 border border-[#090A0F]" style={{ backgroundColor: c }} />
                <span className="font-semibold text-[#090A0F]">{lbl}</span>
              </span>
            ))}
          </div>
        ) : mapColorMode === 'party_share' && effectiveFocusId ? (
          <div className="flex flex-wrap items-center gap-2.5 text-micro font-mono">
            <span className="font-bold text-[#090A0F]">
              {focusEntityList.find((e) => e.id === effectiveFocusId)?.shortName || effectiveFocusId}:
            </span>
            <span className="text-slate-500">%0</span>
            <div
              className="w-32 h-3 border border-[#090A0F]"
              style={{
                background: `linear-gradient(90deg, #F1F5F9 0%, ${
                  focusColorById[effectiveFocusId] || '#090A0F'
                } 100%)`,
              }}
            />
            <span className="text-slate-800 font-bold">%45+</span>
          </div>
        ) : mapColorMode === 'swing' && mapFocusEntityId ? (
          <div className="flex flex-wrap items-center gap-2.5 text-micro font-mono">
            <span className="font-bold text-[#090A0F]">
              {focusEntityList.find((e) => e.id === mapFocusEntityId)?.shortName || mapFocusEntityId}:
            </span>
            <span className="text-rose-700 font-bold">-10pp</span>
            <div
              className="w-36 h-3 border border-[#090A0F]"
              style={{
                background: 'linear-gradient(90deg, #DC2626 0%, #F1F5F9 50%, #059669 100%)',
              }}
            />
            <span className="text-emerald-700 font-bold">+10pp</span>
          </div>
        ) : mapColorMode === 'turnout' ? (
          <div className="flex flex-wrap items-center gap-2.5 text-micro font-mono">
            <span className="font-bold text-[#090A0F]">
              {lang === 'tr' ? 'Katılım:' : 'Turnout:'}
            </span>
            <span className="text-slate-500">%72</span>
            <div
              className="w-32 h-3 border border-[#090A0F]"
              style={{ background: 'linear-gradient(90deg, #CBD5E1 0%, #090A0F 100%)' }}
            />
            <span className="text-[#090A0F] font-bold">%90+</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {mapColorMode === 'runner_up' && (
              <span className="text-micro font-bold uppercase tracking-wider text-slate-500 mr-1">
                {lang === 'tr' ? '2. Parti/Aday:' : 'Runner-up:'}
              </span>
            )}
            {electionMode === 'presidential'
              ? presCandidates
                  .filter((c) => !c.isOther)
                  .map((c) => (
                    <div key={c.id} className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 border border-[#090A0F]"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="font-bold text-[#090A0F] text-micro">{c.shortName}</span>
                    </div>
                  ))
              : parties
                  .filter((p) => !p.isOther)
                  .map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 border border-[#090A0F]"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-bold text-[#090A0F] text-micro">{p.shortName}</span>
                    </div>
                  ))}
          </div>
        )}
        <span className="text-micro text-slate-500 hidden sm:inline">
          {mapLayer === 'abroad_world'
            ? lang === 'tr'
              ? 'Tıkla: ülke seç ve düzenle'
              : 'Click: select & edit country'
            : lang === 'tr'
            ? 'Tıkla: seç ve düzenle · Çift tıkla: ilçe haritası'
            : 'Click: select & edit · Double-click: district map'}
        </span>
      </div>
    </div>
  );
};
