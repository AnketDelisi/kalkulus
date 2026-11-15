import React, { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import {
  ChevronRight,
  CircleDot,
  Download,
  Lock,
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { MapColorMode, MapLayerMode } from '../types/election';
import { formatInt, formatPct } from '../utils/format';

interface GeoFeature {
  type: 'Feature';
  properties: {
    id: string;
    plateCode?: number;
    name: string;
    region?: string;
    districtIds?: string[];
    ilId?: string;
    districtId?: string;
    mpCount?: number;
    lat: number;
    lng: number;
  };
  geometry: any;
}

interface GeoCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

interface HoverTooltip {
  id: string;
  title: string;
  subtitle: string;
  turnout: number;
  validVotes: number;
  isLocked: boolean;
  topParties: {
    shortName: string;
    color: string;
    share: number;
    votes: number;
    seats?: number;
  }[];
  clientX: number;
  clientY: number;
}

function blendHexWithWhite(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c * alpha + 255 * (1 - alpha));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

const SEAT_OFFSETS_87: Record<string, [number, number]> = {
  '34-3': [-4, -44],
  '34-2': [16, -48],
  '34-1': [40, -50],
  '16-1': [-6, 4],
  '16-2': [6, -3],
  '35-1': [-14, 10],
  '35-2': [-12, -10],
  '06-2': [4, -4],
  '06-3': [-6, 0],
};

const SEAT_OFFSETS_81: Record<string, [number, number]> = {
  '34': [16, -48],
  '35': [-14, 0],
};

function getSeatGridCols(totalSeats: number): number {
  if (totalSeats <= 3) return Math.max(1, totalSeats);
  if (totalSeats === 4) return 2;
  if (totalSeats <= 6) return 3;
  if (totalSeats <= 12) return 4;
  if (totalSeats <= 15) return 5;
  if (totalSeats <= 40) return 6;
  return 12;
}

function buildOrderedSeatColors(
  partySeats: Record<string, number>,
  partyVotes: Record<string, number>,
  partyMap: Record<string, { color: string }>
): string[] {
  const entries = Object.entries(partySeats)
    .filter(([, seats]) => seats > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return (partyVotes[b[0]] || 0) - (partyVotes[a[0]] || 0);
    });
  const colors: string[] = [];
  for (const [pid, seats] of entries) {
    const color = partyMap[pid]?.color || '#64748b';
    for (let i = 0; i < seats; i++) {
      colors.push(color);
    }
  }
  return colors;
}

export const MapPanel: React.FC = () => {
  const {
    lang,
    parties,
    alliances,
    mapLayer,
    mapColorMode,
    zoomedProvinceId,
    activeScope,
    provinceOverrides,
    districtOverrides,
    ilceOverrides,
    projection,
    baselineProjection,
    setMapLayer,
    setMapColorMode,
    setZoomedProvinceId,
    setActiveScope,
  } = useElectionStore();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [provincesGeo, setProvincesGeo] = useState<GeoCollection | null>(null);
  const [districts87Geo, setDistricts87Geo] = useState<GeoCollection | null>(null);
  const [ilcelerGeo, setIlcelerGeo] = useState<GeoCollection | null>(null);
  const [hovered, setHovered] = useState<HoverTooltip | null>(null);
  const [showSeatCircles, setShowSeatCircles] = useState(true);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const t = translations[lang];

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}tr-provinces.geojson`)
      .then((r) => r.json())
      .then((data) => setProvincesGeo(data))
      .catch(() => {});

    fetch(`${import.meta.env.BASE_URL}tr-districts-87.geojson`)
      .then((r) => r.json())
      .then((data) => setDistricts87Geo(data))
      .catch(() => {});

    fetch(`${import.meta.env.BASE_URL}tr-ilceler.geojson`)
      .then((r) => r.json())
      .then((data) => setIlcelerGeo(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [zoomedProvinceId, mapLayer]);

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
      const intensity = Math.min(0.95, Math.max(0.55, 0.52 + marginPct / 45));
      return blendHexWithWhite(baseHex, intensity);
    }
    if (mapColorMode === 'alliance') {
      const aHex =
        leader?.allianceId && allianceMap[leader.allianceId]
          ? allianceMap[leader.allianceId].color
          : baseHex;
      return blendHexWithWhite(aHex, 0.88);
    }
    if (mapColorMode === 'margin') {
      const intensity = Math.min(0.98, Math.max(0.24, marginPct / 28));
      return blendHexWithWhite(baseHex, intensity);
    }
    if (mapColorMode === 'turnout') {
      if (turnout >= 90) return '#090a0f';
      if (turnout >= 87) return '#334155';
      if (turnout >= 84) return '#64748b';
      if (turnout >= 80) return '#94a3b8';
      return '#cbd5e1';
    }
    // Swing mode
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
    if (Math.abs(maxSwing) < 0.15) return '#e2e8f0';
    const swHex = partyMap[bestSwingPartyId]?.color || '#64748b';
    const swAlpha = Math.min(0.96, Math.max(0.4, Math.abs(maxSwing) / 10));
    return blendHexWithWhite(swHex, swAlpha);
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

  const renderSeatCircleCluster = (
    feat: GeoFeature,
    partySeats: Record<string, number>,
    partyVotes: Record<string, number>,
    offsetMap: Record<string, [number, number]>,
    isIstanbul: boolean
  ) => {
    const rawCentroid = pathGenerator.centroid(feat as any);
    if (!rawCentroid || Number.isNaN(rawCentroid[0]) || Number.isNaN(rawCentroid[1])) {
      return null;
    }
    const colors = buildOrderedSeatColors(partySeats, partyVotes, partyMap);
    if (colors.length === 0) return null;

    const [offX, offY] = offsetMap[feat.properties.id] || [0, 0];
    const cx = rawCentroid[0] + offX;
    const cy = rawCentroid[1] + offY;
    const cols = getSeatGridCols(colors.length);
    const rows = Math.ceil(colors.length / cols);
    const step = 5.6;
    const startX = cx - ((cols - 1) * step) / 2;
    const startY = cy - ((rows - 1) * step) / 2;
    const clusterBottomY = cy + ((rows - 1) * step) / 2 + 4;

    return (
      <g key={`seats-${feat.properties.id}`}>
        {isIstanbul && (
          <line
            x1={rawCentroid[0]}
            y1={rawCentroid[1]}
            x2={cx}
            y2={clusterBottomY}
            stroke="#090a0f"
            strokeWidth={0.75}
            strokeOpacity={0.65}
          />
        )}
        {colors.map((color, idx) => {
          const r = Math.floor(idx / cols);
          const c = idx % cols;
          return (
            <circle
              key={`${feat.properties.id}-s-${idx}`}
              cx={startX + c * step}
              cy={startY + r * step}
              r={2.4}
              fill={color}
              stroke="#090a0f"
              strokeWidth={0.7}
            />
          );
        })}
      </g>
    );
  };

  const handleExportPng = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '1960');
    clone.setAttribute('height', '940');
    clone.setAttribute('viewBox', '0 0 980 470');

    const rootGroup = clone.querySelector('g');
    if (rootGroup) {
      rootGroup.setAttribute('transform', 'translate(0, 0) scale(1)');
    }

    const svgString = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1960;
      canvas.height = 940;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const slug = zoomedProvinceId
          ? `${(zoomedProvResult?.name || zoomedProvinceId).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-ilce-haritasi`
          : mapLayer === '87_district'
          ? '87-secim-cevresi-haritasi'
          : mapLayer === '81_il'
          ? '81-il-haritasi'
          : '973-ilce-haritasi';
        link.download = `kalkulus-${slug}.png`;
        link.href = pngUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="studio-panel flex flex-col overflow-hidden">
      {/* Top Map Header: Architectural Breadcrumb + Layer & Color Controls */}
      <div className="px-4 py-2.5 border-b-[1.5px] border-[#090A0F] flex flex-wrap items-center justify-between gap-3 bg-white">
        {/* Interactive Breadcrumb Trail */}
        <div className="flex items-center gap-1.5 text-body font-medium">
          <button
            onClick={() => {
              setZoomedProvinceId(null);
              setActiveScope({ type: 'national' });
            }}
            className={`px-2 py-1 border transition-colors ${
              !zoomedProvinceId && activeScope.type === 'national'
                ? 'bg-[#090A0F] text-white border-[#090A0F]'
                : 'border-transparent text-slate-600 hover:border-[#090A0F] hover:text-[#090A0F]'
            }`}
          >
            {lang === 'tr' ? 'Türkiye' : 'Turkey'}
          </button>

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
                <span className="font-mono">{selectedProvResult.id}</span> · {selectedProvResult.name} ({selectedProvResult.mpCount} MV)
              </button>
            </>
          )}

          {activeScope.type === 'district' &&
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

        {/* Right Toolbar: Layer Toggle + Color Mode */}
        <div className="flex flex-wrap items-center gap-2 text-body">
          <div className="inline-flex border-[1.5px] border-[#090A0F] bg-white text-micro font-medium">
            {(
              [
                ['87_district', lang === 'tr' ? '87 seçim çevresi' : '87 districts'],
                ['81_il', lang === 'tr' ? '81 il' : '81 provinces'],
                ['973_ilce', lang === 'tr' ? '973 ilçe' : '973 sub-districts'],
              ] as [MapLayerMode, string][]
            ).map(([lKey, label], idx) => (
              <button
                key={lKey}
                onClick={() => {
                  setMapLayer(lKey);
                  if (lKey !== '973_ilce') setZoomedProvinceId(null);
                }}
                className={`px-2.5 py-1 transition-colors ${
                  idx > 0 ? 'border-l border-[#090A0F]' : ''
                } ${
                  mapLayer === lKey && !zoomedProvinceId
                    ? 'bg-[#090A0F] text-white'
                    : 'text-[#090A0F] hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <select
            value={mapColorMode}
            onChange={(e) => setMapColorMode(e.target.value as MapColorMode)}
            className="studio-input border-[#090A0F] px-2.5 py-1 text-micro font-medium text-[#090A0F] cursor-pointer"
          >
            <option value="leader">{t.colorLeader}</option>
            <option value="alliance">{t.colorAlliance}</option>
            <option value="margin">{t.colorMargin}</option>
            <option value="turnout">{t.colorTurnout}</option>
            <option value="swing">{t.colorSwing}</option>
          </select>

          {!zoomedProvinceId && (mapLayer === '87_district' || mapLayer === '81_il') && (
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
            onClick={handleExportPng}
            disabled={!provincesGeo || !districts87Geo}
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
        className="relative w-full studio-map-grid overflow-hidden select-none"
        onMouseLeave={() => {
          setHovered(null);
          setIsDragging(false);
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          setIsDragging(true);
          setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }}
        onMouseMove={(e) => {
          if (isDragging && dragStart) {
            setPan({
              x: e.clientX - dragStart.x,
              y: e.clientY - dragStart.y,
            });
          }
        }}
        onMouseUp={() => setIsDragging(false)}
      >
        {/* Top-Left Layer Label */}
        <div className="absolute top-2.5 left-3 z-10 pointer-events-none flex items-center gap-2 text-micro font-medium text-slate-600">
          <span className="px-2 py-0.5 bg-white/90 border border-slate-300 text-[#090A0F]">
            {zoomedProvinceId
              ? `${zoomedProvResult?.name} ${lang === 'tr' ? 'ilçeleri' : 'districts'}`
              : mapLayer === '87_district'
              ? lang === 'tr'
                ? 'Harita katmanı: 87 seçim çevresi'
                : 'Map layer: 87 districts'
              : mapLayer === '81_il'
              ? lang === 'tr'
                ? 'Harita katmanı: 81 il'
                : 'Map layer: 81 provinces'
              : lang === 'tr'
              ? 'Harita katmanı: 973 ilçe'
              : 'Map layer: 973 sub-districts'}
          </span>
        </div>

        {!provincesGeo || !districts87Geo ? (
          <div className="h-[460px] flex items-center justify-center text-body text-slate-500">
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
              if (isDragging) {
                if (hovered) setHovered(null);
                return;
              }
              if ((e.target as SVGElement).tagName !== 'path') {
                if (hovered) setHovered(null);
              }
            }}
          >
            <g
              transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
              style={{ transformOrigin: 'center center' }}
            >
              {/* CASE 1: Zoomed into a Single Province's Real İlçe Polygons */}
              {zoomedProvinceId && ilcelerGeo ? (
                <g>
                  {provincesGeo.features
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
                      const iRes = projection.ilceResults[ilceId];
                      const baseIRes = baselineProjection.ilceResults[ilceId];
                      if (!iRes) return null;

                      const fill = getFillColor(
                        iRes.leadingPartyId,
                        iRes.partyShares,
                        baseIRes?.partyShares || {},
                        iRes.marginPct,
                        iRes.turnout
                      );
                      const isSelected =
                        activeScope.type === 'ilce' && activeScope.ilceId === ilceId;
                      const isLocked = Boolean(ilceOverrides[ilceId]?.isLocked);

                      return (
                        <path
                          key={`${ilceId}-${idx}`}
                          d={pathGenerator(feat as any) || ''}
                          fill={fill}
                          fillRule="evenodd"
                          stroke={isSelected ? '#090a0f' : isLocked ? '#f59e0b' : '#090a0f'}
                          strokeWidth={isSelected ? 2.8 : isLocked ? 2.4 : 1.75}
                          strokeLinejoin="round"
                          className="cursor-pointer transition-opacity hover:opacity-85"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveScope({ type: 'ilce', ilceId });
                          }}
                          onMouseMove={(e) => {
                            if (isDragging || hovered?.id === ilceId) return;
                            const top = [...parties]
                              .filter((p) => !p.isOther)
                              .sort(
                                (a, b) =>
                                  (iRes.partyVotes[b.id] || 0) - (iRes.partyVotes[a.id] || 0)
                              )
                              .slice(0, 4)
                              .map((p) => ({
                                shortName: p.shortName,
                                color: p.color,
                                share: iRes.partyShares[p.id] || 0,
                                votes: iRes.partyVotes[p.id] || 0,
                              }));
                            setHovered({
                              id: ilceId,
                              title: iRes.name,
                              subtitle: `${zoomedProvResult?.name || ''} · ${lang === 'tr' ? 'Seçim çevresi' : 'District'}: ${iRes.districtId}`,
                              turnout: iRes.turnout,
                              validVotes: iRes.validVotes,
                              isLocked,
                              topParties: top,
                              clientX: e.clientX,
                              clientY: e.clientY,
                            });
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
                    const iRes = projection.ilceResults[ilceId];
                    const baseIRes = baselineProjection.ilceResults[ilceId];
                    if (!iRes) return null;

                    const fill = getFillColor(
                      iRes.leadingPartyId,
                      iRes.partyShares,
                      baseIRes?.partyShares || {},
                      iRes.marginPct,
                      iRes.turnout
                    );
                    const isSelected =
                      activeScope.type === 'ilce' && activeScope.ilceId === ilceId;
                    const isLocked = Boolean(ilceOverrides[ilceId]?.isLocked);

                    return (
                      <path
                        key={`${ilceId}-${idx}`}
                        d={pathGenerator(feat as any) || ''}
                        fill={fill}
                        fillRule="evenodd"
                        stroke={isSelected ? '#090a0f' : isLocked ? '#f59e0b' : '#ffffff'}
                        strokeWidth={isSelected ? 1.5 : 0.3}
                        className="cursor-pointer hover:opacity-85"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveScope({ type: 'ilce', ilceId });
                        }}
                        onMouseMove={(e) => {
                          if (isDragging || hovered?.id === ilceId) return;
                          const provName =
                            projection.provinceResults[iRes.ilId]?.name || iRes.ilId;
                          const top = [...parties]
                            .filter((p) => !p.isOther)
                            .sort(
                              (a, b) =>
                                (iRes.partyVotes[b.id] || 0) - (iRes.partyVotes[a.id] || 0)
                            )
                            .slice(0, 4)
                            .map((p) => ({
                              shortName: p.shortName,
                              color: p.color,
                              share: iRes.partyShares[p.id] || 0,
                              votes: iRes.partyVotes[p.id] || 0,
                            }));
                          setHovered({
                            id: ilceId,
                            title: `${iRes.name} (${provName})`,
                            subtitle: `${lang === 'tr' ? 'Seçim çevresi' : 'District'}: ${iRes.districtId}`,
                            turnout: iRes.turnout,
                            validVotes: iRes.validVotes,
                            isLocked,
                            topParties: top,
                            clientX: e.clientX,
                            clientY: e.clientY,
                          });
                        }}
                      />
                    );
                  })}
                  {/* Crisp 87 Electoral District Borders Overlay */}
                  {districts87Geo.features.map((dFeat) => (
                    <path
                      key={`dborder-${dFeat.properties.id}`}
                      d={pathGenerator(dFeat as any) || ''}
                      fill="none"
                      stroke="#090a0f"
                      strokeWidth={0.75}
                      pointerEvents="none"
                    />
                  ))}
                </g>
              ) : mapLayer === '87_district' ? (
                /* CASE 3 (Default): Unified 87 Electoral Regions (Dissolved from İlçeler, Zero Clutter, No Labels) */
                <g>
                  {districts87Geo.features.map((feat) => {
                    const dId = feat.properties.id;
                    const dRes = projection.districtResults[dId];
                    const baseDRes = baselineProjection.districtResults[dId];
                    if (!dRes) return null;

                    const fill = getFillColor(
                      dRes.leadingPartyId,
                      dRes.partyShares,
                      baseDRes?.partyShares || {},
                      dRes.marginPct,
                      dRes.turnout
                    );
                    const isSelected =
                      activeScope.type === 'district' && activeScope.districtId === dId;
                    const isLocked = Boolean(districtOverrides[dId]?.isLocked);

                    return (
                      <path
                        key={dId}
                        d={pathGenerator(feat as any) || ''}
                        fill={fill}
                        fillRule="evenodd"
                        stroke={isSelected ? '#090a0f' : isLocked ? '#f59e0b' : '#090a0f'}
                        strokeWidth={isSelected ? 2.2 : isLocked ? 1.8 : 0.65}
                        className="cursor-pointer transition-opacity hover:opacity-85"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveScope({ type: 'district', districtId: dId });
                        }}
                        onDoubleClick={() => setZoomedProvinceId(dRes.ilId)}
                        onMouseMove={(e) => {
                          if (isDragging || hovered?.id === dId) return;
                          const top = [...parties]
                            .filter((p) => !p.isOther)
                            .sort(
                              (a, b) =>
                                (dRes.totalPartyVotes[b.id] || 0) -
                                (dRes.totalPartyVotes[a.id] || 0)
                            )
                            .slice(0, 5)
                            .map((p) => ({
                              shortName: p.shortName,
                              color: p.color,
                              share: dRes.partyShares[p.id] || 0,
                              votes: dRes.totalPartyVotes[p.id] || 0,
                              seats: dRes.partySeats[p.id] || 0,
                            }));
                          setHovered({
                            id: dId,
                            title: `${dId} · ${dRes.name}`,
                            subtitle:
                              lang === 'tr'
                                ? `${dRes.mpCount} milletvekili · Çift tıkla: ilçeler`
                                : `${dRes.mpCount} MPs · Double-click: districts`,
                            turnout: dRes.turnout,
                            validVotes: dRes.totalValidVotes,
                            isLocked,
                            topParties: top,
                            clientX: e.clientX,
                            clientY: e.clientY,
                          });
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
              ) : (
                /* CASE 4: 81 Provinces Vector Map (No Text Labels) */
                <g>
                  {provincesGeo.features.map((feat) => {
                    const ilId = feat.properties.id;
                    const pRes = projection.provinceResults[ilId];
                    const basePRes = baselineProjection.provinceResults[ilId];
                    if (!pRes) return null;

                    const fill = getFillColor(
                      pRes.leadingPartyId,
                      pRes.partyShares,
                      basePRes?.partyShares || {},
                      pRes.marginPct,
                      pRes.turnout
                    );
                    const isSelected =
                      activeScope.type === 'province' && activeScope.ilId === ilId;
                    const isLocked = Boolean(provinceOverrides[ilId]?.isLocked);

                    return (
                      <path
                        key={ilId}
                        d={pathGenerator(feat as any) || ''}
                        fill={fill}
                        fillRule="evenodd"
                        stroke={isSelected ? '#090a0f' : isLocked ? '#f59e0b' : '#090a0f'}
                        strokeWidth={isSelected ? 2.2 : isLocked ? 1.8 : 0.65}
                        className="cursor-pointer transition-opacity hover:opacity-85"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveScope({ type: 'province', ilId });
                        }}
                        onDoubleClick={() => setZoomedProvinceId(ilId)}
                        onMouseMove={(e) => {
                          if (isDragging || hovered?.id === ilId) return;
                          const top = [...parties]
                            .filter((p) => !p.isOther)
                            .sort(
                              (a, b) =>
                                (pRes.partyVotes[b.id] || 0) - (pRes.partyVotes[a.id] || 0)
                            )
                            .slice(0, 5)
                            .map((p) => ({
                              shortName: p.shortName,
                              color: p.color,
                              share: pRes.partyShares[p.id] || 0,
                              votes: pRes.partyVotes[p.id] || 0,
                              seats: pRes.partySeats[p.id] || 0,
                            }));
                          setHovered({
                            id: ilId,
                            title: `${pRes.id} · ${pRes.name}`,
                            subtitle:
                              lang === 'tr'
                                ? `${pRes.mpCount} milletvekili · Çift tıkla: ilçeler`
                                : `${pRes.mpCount} MPs · Double-click: districts`,
                            turnout: pRes.turnout,
                            validVotes: pRes.totalValidVotes,
                            isLocked,
                            topParties: top,
                            clientX: e.clientX,
                            clientY: e.clientY,
                          });
                        }}
                      />
                    );
                  })}

                  {showSeatCircles && (
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
              )}
            </g>
          </svg>
        )}

        {/* Map Zoom Controls Overlay (Top Right) */}
        <div className="absolute top-3 right-3 flex items-center bg-white border-[1.5px] border-[#090A0F] shadow-[2px_2px_0px_rgba(9,10,15,0.12)] z-10">
          <button
            onClick={() => setZoom((z) => Math.min(6, Number((z * 1.35).toFixed(2))))}
            className="p-1.5 border-r border-[#090A0F] hover:bg-[#090A0F] hover:text-white text-[#090A0F] transition-colors"
            title="Yakınlaş"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(1, Number((z / 1.35).toFixed(2))))}
            className="p-1.5 border-r border-[#090A0F] hover:bg-[#090A0F] hover:text-white text-[#090A0F] transition-colors"
            title="Uzaklaş"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 hover:bg-[#090A0F] hover:text-white text-[#090A0F] transition-colors"
            title="Görünümü Sıfırla"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* High-Contrast Monochrome & Neon Signal Telemetry Hover Card */}
        {hovered && (
          <div
            style={{
              left: hovered.clientX > window.innerWidth / 2 ? '14px' : 'auto',
              right: hovered.clientX <= window.innerWidth / 2 ? '14px' : 'auto',
              bottom: '14px',
            }}
            className="absolute z-20 w-72 bg-[#090A0F] text-white border-[1.5px] border-[#090A0F] shadow-[4px_4px_0px_rgba(9,10,15,0.25)] p-3 pointer-events-none text-body"
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
              <div>
                <div className="font-bold text-white text-title flex items-center gap-1.5">
                  <span>{hovered.title}</span>
                  {hovered.isLocked && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="text-micro text-slate-400 mt-0.5">
                  {hovered.subtitle}
                </div>
              </div>
            </div>

            <div className="flex justify-between text-micro text-slate-300 mb-2 bg-slate-900 border border-slate-800 px-2 py-1">
              <span>
                {lang === 'tr' ? 'Katılım' : 'Turnout'}:{' '}
                <strong className="text-white">{formatPct(hovered.turnout, lang)}</strong>
              </span>
              <span>
                {lang === 'tr' ? 'Geçerli oy' : 'Valid'}:{' '}
                <strong className="text-white">{formatInt(hovered.validVotes, lang)}</strong>
              </span>
            </div>

            <div className="space-y-1.5">
              {hovered.topParties.map((tp) => (
                <div key={tp.shortName} className="flex items-center justify-between text-body">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 shrink-0"
                      style={{ backgroundColor: tp.color }}
                    />
                    <span className="font-bold text-white">{tp.shortName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300">{formatPct(tp.share, lang)}</span>
                    {tp.seats !== undefined && tp.seats > 0 && (
                      <span
                        className="px-1.5 py-0.5 font-bold text-micro text-[#090A0F]"
                        style={{ backgroundColor: tp.color }}
                      >
                        {tp.seats} MV
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sharp Monochrome Signal Legend Bar */}
      <div className="px-4 py-2.5 bg-white border-t-[1.5px] border-[#090A0F] flex flex-wrap items-center justify-between gap-2 text-body">
        <div className="flex flex-wrap items-center gap-3">
          {parties
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
        <span className="text-micro text-slate-500">
          {lang === 'tr'
            ? 'Tıkla: seç ve düzenle · Çift tıkla: ilçe haritası'
            : 'Click: select & edit · Double-click: district map'}
        </span>
      </div>
    </div>
  );
};
