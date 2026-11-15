import React, { useEffect, useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import {
  ChevronRight,
  Lock,
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { MapColorMode, MapLayerMode } from '../types/election';

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

// Blend a hex color with white for subtle margin/choropleth shading
function blendHexWithWhite(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c * alpha + 255 * (1 - alpha));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
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

  const [provincesGeo, setProvincesGeo] = useState<GeoCollection | null>(null);
  const [ilcelerGeo, setIlcelerGeo] = useState<GeoCollection | null>(null);
  const [hovered, setHovered] = useState<HoverTooltip | null>(null);

  // Pan & Zoom state for smooth interactive inspection
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

    fetch(`${import.meta.env.BASE_URL}tr-ilceler.geojson`)
      .then((r) => r.json())
      .then((data) => setIlcelerGeo(data))
      .catch(() => {});
  }, []);

  // Reset pan/zoom when switching zoomedProvinceId
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

  // Compute D3 GeoPath generator fitted either to all of Turkey or to the zoomed province
  const { pathGenerator, activeZoomedProvinceFeature } = useMemo(() => {
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
        return {
          pathGenerator: geoPath().projection(proj),
          activeZoomedProvinceFeature: pFeat,
        };
      }
    }

    if (provincesGeo) {
      proj.fitExtent(
        [
          [24, 20],
          [width - 24, height - 20],
        ],
        provincesGeo as any
      );
    } else {
      proj.center([35.3, 39.0]).scale(2500).translate([width / 2, height / 2]);
    }

    return {
      pathGenerator: geoPath().projection(proj),
      activeZoomedProvinceFeature: null,
    };
  }, [provincesGeo, zoomedProvinceId]);

  const getFillColor = (
    leadingPartyId: string,
    partyShares: Record<string, number>,
    basePartyShares: Record<string, number>,
    marginPct: number,
    turnout: number
  ): string => {
    const leader = partyMap[leadingPartyId];
    const baseHex = leader?.color || '#94a3b8';

    if (mapColorMode === 'leader') {
      const intensity = Math.min(0.95, Math.max(0.55, 0.52 + marginPct / 45));
      return blendHexWithWhite(baseHex, intensity);
    }
    if (mapColorMode === 'alliance') {
      const aHex =
        leader?.allianceId && allianceMap[leader.allianceId]
          ? allianceMap[leader.allianceId].color
          : baseHex;
      return blendHexWithWhite(aHex, 0.82);
    }
    if (mapColorMode === 'margin') {
      const intensity = Math.min(0.98, Math.max(0.22, marginPct / 30));
      return blendHexWithWhite(baseHex, intensity);
    }
    if (mapColorMode === 'turnout') {
      if (turnout >= 90) return '#0f766e';
      if (turnout >= 87) return '#14b8a6';
      if (turnout >= 84) return '#5eead4';
      if (turnout >= 80) return '#bae6fd';
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
    if (Math.abs(maxSwing) < 0.15) return '#f1f5f9';
    const swHex = partyMap[bestSwingPartyId]?.color || '#64748b';
    const swAlpha = Math.min(0.95, Math.max(0.35, Math.abs(maxSwing) / 12));
    return blendHexWithWhite(swHex, swAlpha);
  };

  // Breadcrumb state
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

  const multiDistrictProvIds = new Set(['06', '16', '34', '35']);

  return (
    <div className="editorial-card flex flex-col overflow-hidden">
      {/* Top Map Header: Breadcrumb Navigation + Layer & Color Controls */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
        {/* Interactive Breadcrumb Trail */}
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <button
            onClick={() => {
              setZoomedProvinceId(null);
              setActiveScope({ type: 'national' });
            }}
            className={`px-2 py-1 rounded-md transition-colors ${
              !zoomedProvinceId && activeScope.type === 'national'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Türkiye
          </button>

          {selectedProvResult && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                onClick={() => {
                  setActiveScope({ type: 'province', ilId: selectedProvResult.id });
                }}
                className={`px-2 py-1 rounded-md transition-colors ${
                  activeScope.type === 'province' && !selectedIlceResult
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {selectedProvResult.name} ({selectedProvResult.mpCount} MV)
              </button>
            </>
          )}

          {activeScope.type === 'district' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2 py-1 rounded-md bg-slate-900 text-white font-semibold">
                {projection.districtResults[activeScope.districtId]?.name}
              </span>
            </>
          )}

          {selectedIlceResult && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2 py-1 rounded-md bg-slate-900 text-white font-semibold">
                {selectedIlceResult.name}
              </span>
            </>
          )}

          {/* Action button to drill-down into İlçeler or return to Turkey map */}
          {selectedProvResult && !zoomedProvinceId && (
            <button
              onClick={() => setZoomedProvinceId(selectedProvResult.id)}
              className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
              <span>{selectedProvResult.name} İlçelerine Yakınlaş</span>
            </button>
          )}

          {zoomedProvinceId && (
            <button
              onClick={() => setZoomedProvinceId(null)}
              className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-slate-600" />
              <span>Tüm Türkiye Haritası</span>
            </button>
          )}
        </div>

        {/* Right Toolbar: Layer Toggle + Color Mode */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Layer Segmented Control */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {(
              [
                ['81_il', '81 İl'],
                ['87_district', '87 Bölge'],
                ['973_ilce', '973 İlçe'],
              ] as [MapLayerMode, string][]
            ).map(([lKey, label]) => (
              <button
                key={lKey}
                onClick={() => {
                  setMapLayer(lKey);
                  if (lKey !== '973_ilce') setZoomedProvinceId(null);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  mapLayer === lKey && !zoomedProvinceId
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Color Mode Selector */}
          <select
            value={mapColorMode}
            onChange={(e) => setMapColorMode(e.target.value as MapColorMode)}
            className="editorial-input px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 cursor-pointer"
          >
            <option value="leader">{t.colorLeader}</option>
            <option value="alliance">{t.colorAlliance}</option>
            <option value="margin">{t.colorMargin}</option>
            <option value="turnout">{t.colorTurnout}</option>
            <option value="swing">{t.colorSwing}</option>
          </select>
        </div>
      </div>

      {/* Main Vector Map Canvas */}
      <div
        className="relative w-full bg-[#f1f5f9] overflow-hidden select-none"
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
        {/* Loading indicator if GeoJSON is still fetching */}
        {!provincesGeo ? (
          <div className="h-[460px] flex items-center justify-center text-sm text-slate-500 font-medium">
            Harita verileri yükleniyor...
          </div>
        ) : (
          <svg
            viewBox="0 0 980 470"
            className={`w-full h-auto block ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <g
              transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
              style={{ transformOrigin: 'center center' }}
            >
              {/* CASE 1: Zoomed into a Single Province's Real İlçe Polygons */}
              {zoomedProvinceId && ilcelerGeo ? (
                <g>
                  {/* Neighboring provinces as subtle context */}
                  {provincesGeo.features
                    .filter((f) => f.properties.id !== zoomedProvinceId)
                    .map((f) => (
                      <path
                        key={`ctx-${f.properties.id}`}
                        d={pathGenerator(f as any) || ''}
                        fill="#e2e8f0"
                        stroke="#cbd5e1"
                        strokeWidth={0.8}
                      />
                    ))}

                  {/* Target Province's Real İlçe Polygons */}
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
                      const centroid = pathGenerator.centroid(feat as any);

                      return (
                        <g key={`${ilceId}-${idx}`}>
                          <path
                            d={pathGenerator(feat as any) || ''}
                            fill={fill}
                            stroke={isSelected ? '#0f172a' : isLocked ? '#d97706' : '#ffffff'}
                            strokeWidth={isSelected ? 2.2 : isLocked ? 1.8 : 0.9}
                            className="cursor-pointer transition-opacity hover:opacity-90"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveScope({ type: 'ilce', ilceId });
                            }}
                            onMouseMove={(e) => {
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
                                subtitle: `${zoomedProvResult?.name || ''} • Bölge: ${iRes.districtId}`,
                                turnout: iRes.turnout,
                                validVotes: iRes.validVotes,
                                isLocked,
                                topParties: top,
                                clientX: e.clientX,
                                clientY: e.clientY,
                              });
                            }}
                          />
                          {!isNaN(centroid[0]) && !isNaN(centroid[1]) && (
                            <text
                              x={centroid[0]}
                              y={centroid[1]}
                              textAnchor="middle"
                              className="fill-slate-900 font-sans font-semibold text-[9px] pointer-events-none"
                              style={{
                                paintOrder: 'stroke',
                                stroke: '#ffffff',
                                strokeWidth: '2.5px',
                                strokeLinecap: 'round',
                                strokeLinejoin: 'round',
                              }}
                            >
                              {iRes.name}
                            </text>
                          )}
                        </g>
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
                        stroke={isSelected ? '#0f172a' : isLocked ? '#d97706' : '#ffffff'}
                        strokeWidth={isSelected ? 1.5 : 0.35}
                        className="cursor-pointer hover:opacity-85"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveScope({ type: 'ilce', ilceId });
                        }}
                        onMouseMove={(e) => {
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
                            subtitle: `Seçim Çevresi: ${iRes.districtId}`,
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
                  {/* Crisp Province Borders Overlay */}
                  {provincesGeo.features.map((pFeat) => (
                    <path
                      key={`pborder-${pFeat.properties.id}`}
                      d={pathGenerator(pFeat as any) || ''}
                      fill="none"
                      stroke="#334155"
                      strokeWidth={0.75}
                      pointerEvents="none"
                    />
                  ))}
                </g>
              ) : mapLayer === '87_district' && ilcelerGeo ? (
                /* CASE 3: 87 Electoral Districts Map (Single-district provinces + multi-district ilçe groupings for 06, 16, 34, 35) */
                <g>
                  {/* 77 Single-District Provinces */}
                  {provincesGeo.features
                    .filter((f) => !multiDistrictProvIds.has(f.properties.id))
                    .map((feat) => {
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
                          stroke={isSelected ? '#0f172a' : isLocked ? '#d97706' : '#ffffff'}
                          strokeWidth={isSelected ? 2.2 : 0.85}
                          className="cursor-pointer transition-opacity hover:opacity-90"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveScope({ type: 'district', districtId: dId });
                          }}
                          onDoubleClick={() => setZoomedProvinceId(feat.properties.id)}
                          onMouseMove={(e) => {
                            const top = [...parties]
                              .filter((p) => !p.isOther)
                              .sort(
                                (a, b) =>
                                  (dRes.totalPartyVotes[b.id] || 0) -
                                  (dRes.totalPartyVotes[a.id] || 0)
                              )
                              .slice(0, 4)
                              .map((p) => ({
                                shortName: p.shortName,
                                color: p.color,
                                share: dRes.partyShares[p.id] || 0,
                                votes: dRes.totalPartyVotes[p.id] || 0,
                                seats: dRes.partySeats[p.id] || 0,
                              }));
                            setHovered({
                              id: dId,
                              title: dRes.name,
                              subtitle: `${dRes.mpCount} Milletvekili`,
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

                  {/* Multi-District Provinces (İstanbul 1-2-3, Ankara 1-2-3, İzmir 1-2, Bursa 1-2) rendered via their real electoral district assignments */}
                  {ilcelerGeo.features
                    .filter((f) => multiDistrictProvIds.has(f.properties.ilId || ''))
                    .map((feat, idx) => {
                      const dId = feat.properties.districtId || feat.properties.ilId || '';
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

                      return (
                        <path
                          key={`md-${feat.properties.id}-${idx}`}
                          d={pathGenerator(feat as any) || ''}
                          fill={fill}
                          stroke={isSelected ? '#0f172a' : '#ffffff'}
                          strokeWidth={isSelected ? 1.4 : 0.4}
                          className="cursor-pointer hover:opacity-90"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveScope({ type: 'district', districtId: dId });
                          }}
                          onDoubleClick={() =>
                            setZoomedProvinceId(feat.properties.ilId || null)
                          }
                          onMouseMove={(e) => {
                            const top = [...parties]
                              .filter((p) => !p.isOther)
                              .sort(
                                (a, b) =>
                                  (dRes.totalPartyVotes[b.id] || 0) -
                                  (dRes.totalPartyVotes[a.id] || 0)
                              )
                              .slice(0, 4)
                              .map((p) => ({
                                shortName: p.shortName,
                                color: p.color,
                                share: dRes.partyShares[p.id] || 0,
                                votes: dRes.totalPartyVotes[p.id] || 0,
                                seats: dRes.partySeats[p.id] || 0,
                              }));
                            setHovered({
                              id: dId,
                              title: dRes.name,
                              subtitle: `${dRes.mpCount} Milletvekili (${feat.properties.name})`,
                              turnout: dRes.turnout,
                              validVotes: dRes.totalValidVotes,
                              isLocked: Boolean(districtOverrides[dId]?.isLocked),
                              topParties: top,
                              clientX: e.clientX,
                              clientY: e.clientY,
                            });
                          }}
                        />
                      );
                    })}
                </g>
              ) : (
                /* CASE 4 (Default): Real 81 Provinces Vector Map */
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
                    const centroid = pathGenerator.centroid(feat as any);

                    return (
                      <g key={ilId}>
                        <path
                          d={pathGenerator(feat as any) || ''}
                          fill={fill}
                          stroke={isSelected ? '#0f172a' : isLocked ? '#d97706' : '#ffffff'}
                          strokeWidth={isSelected ? 2.2 : isLocked ? 1.8 : 0.85}
                          className="cursor-pointer transition-opacity hover:opacity-90"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveScope({ type: 'province', ilId });
                          }}
                          onDoubleClick={() => setZoomedProvinceId(ilId)}
                          onMouseMove={(e) => {
                            const top = [...parties]
                              .filter((p) => !p.isOther)
                              .sort(
                                (a, b) =>
                                  (pRes.partyVotes[b.id] || 0) - (pRes.partyVotes[a.id] || 0)
                              )
                              .slice(0, 4)
                              .map((p) => ({
                                shortName: p.shortName,
                                color: p.color,
                                share: pRes.partyShares[p.id] || 0,
                                votes: pRes.partyVotes[p.id] || 0,
                                seats: pRes.partySeats[p.id] || 0,
                              }));
                            setHovered({
                              id: ilId,
                              title: `${pRes.plateCode} • ${pRes.name}`,
                              subtitle: `${pRes.mpCount} Milletvekili • Çift Tıkla: İlçeler`,
                              turnout: pRes.turnout,
                              validVotes: pRes.totalValidVotes,
                              isLocked,
                              topParties: top,
                              clientX: e.clientX,
                              clientY: e.clientY,
                            });
                          }}
                        />
                        {!isNaN(centroid[0]) && !isNaN(centroid[1]) && (
                          <text
                            x={centroid[0]}
                            y={centroid[1] + 2}
                            textAnchor="middle"
                            className="fill-slate-800 font-sans font-semibold text-[8px] pointer-events-none"
                            style={{
                              paintOrder: 'stroke',
                              stroke: 'rgba(255,255,255,0.85)',
                              strokeWidth: '2px',
                            }}
                          >
                            {pRes.name}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          </svg>
        )}

        {/* Map Zoom Controls Overlay (Bottom Right) */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur border border-slate-200 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setZoom((z) => Math.min(6, Number((z * 1.35).toFixed(2))))}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
            title="Yakınlaş"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(1, Number((z / 1.35).toFixed(2))))}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
            title="Uzaklaş"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
            title="Görünümü Sıfırla"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Editorial Hover Card */}
        {hovered && (
          <div
            style={{
              left: hovered.clientX > window.innerWidth / 2 ? '16px' : 'auto',
              right: hovered.clientX <= window.innerWidth / 2 ? '16px' : 'auto',
              top: '16px',
            }}
            className="absolute z-20 w-64 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-lg p-3 pointer-events-none text-xs"
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span>{hovered.title}</span>
                  {hovered.isLocked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                </div>
                <div className="text-[11px] text-slate-500">{hovered.subtitle}</div>
              </div>
            </div>

            <div className="flex justify-between text-[11px] text-slate-500 mb-2 bg-slate-50 rounded-md px-2 py-1">
              <span>
                Katılım: <strong className="text-slate-800">%{hovered.turnout.toFixed(1)}</strong>
              </span>
              <span>
                Geçerli:{' '}
                <strong className="text-slate-800">
                  {hovered.validVotes.toLocaleString('tr-TR')}
                </strong>
              </span>
            </div>

            <div className="space-y-1.5">
              {hovered.topParties.map((tp) => (
                <div key={tp.shortName} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: tp.color }}
                    />
                    <span className="font-semibold text-slate-800">{tp.shortName}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-700 font-medium">%{tp.share.toFixed(1)}</span>
                    {tp.seats !== undefined && tp.seats > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-semibold text-[10px]">
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

      {/* Clean Footer Party Legend */}
      <div className="px-4 py-2.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {parties
            .filter((p) => !p.isOther)
            .map((p) => (
              <div key={p.id} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="font-semibold text-slate-700">{p.shortName}</span>
              </div>
            ))}
        </div>
        <span className="text-[11px] text-slate-400">
          Haritada bir ile tıklayarak düzenleyin, çift tıklayarak ilçelerine yakınlaşın
        </span>
      </div>
    </div>
  );
};
