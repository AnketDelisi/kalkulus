import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  Layers,
  Lock,
  Map as MapIcon,
  Palette,
  ZoomIn,
} from 'lucide-react';
import baseline2023Raw from '../data/baseline2023.json';
import baseline2024Raw from '../data/baseline2024.json';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { BaselineDataset, MapColorMode, MapLayerMode } from '../types/election';

const BASELINES: Record<string, BaselineDataset> = {
  '2023_general': baseline2023Raw as unknown as BaselineDataset,
  '2024_local': baseline2024Raw as unknown as BaselineDataset,
};

interface HoverCardData {
  id: string;
  title: string;
  subtitle: string;
  mpCount?: number;
  turnout: number;
  validVotes: number;
  isLocked: boolean;
  topParties: { shortName: string; color: string; share: number; votes: number; seats?: number }[];
  x: number;
  y: number;
}

/**
 * Computes Voronoi-clipped polygon cells for a set of seed points [x, y]
 * inside a bounding box or radial distance so that all 81 provinces, 87 districts,
 * or 973 ilçeler form a crisp, interactive, pixel-snapped map of Turkey.
 */
function computeClippedVoronoiPolygons(
  points: { id: string; x: number; y: number }[],
  maxRadius: number,
  gridSnap = 4
): Record<string, string> {
  const result: Record<string, string> = {};
  const angles = 24;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    // Start with a 24-gon circle around p of radius maxRadius
    let poly: [number, number][] = [];
    for (let a = 0; a < angles; a++) {
      const theta = (a / angles) * Math.PI * 2;
      poly.push([p.x + Math.cos(theta) * maxRadius, p.y + Math.sin(theta) * maxRadius]);
    }

    // Clip against perpendicular bisectors of nearby points
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const q = points[j];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > (maxRadius * 2.2) ** 2) continue;

      const mx = (p.x + q.x) / 2;
      const my = (p.y + q.y) / 2;

      // Sutherland-Hodgman half-plane clip: keep points where (pt - m) . (q - p) <= 0
      const nextPoly: [number, number][] = [];
      for (let k = 0; k < poly.length; k++) {
        const cur = poly[k];
        const prev = poly[(k + poly.length - 1) % poly.length];
        const curVal = (cur[0] - mx) * dx + (cur[1] - my) * dy;
        const prevVal = (prev[0] - mx) * dx + (prev[1] - my) * dy;

        if (curVal <= 0) {
          if (prevVal > 0) {
            const t = prevVal / (prevVal - curVal);
            nextPoly.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]);
          }
          nextPoly.push(cur);
        } else if (prevVal <= 0) {
          const t = prevVal / (prevVal - curVal);
          nextPoly.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]);
        }
      }
      poly = nextPoly;
      if (poly.length === 0) break;
    }

    if (poly.length >= 3) {
      const ptsStr = poly
        .map(([px, py]) => `${Math.round(px / gridSnap) * gridSnap},${Math.round(py / gridSnap) * gridSnap}`)
        .join(' ');
      result[p.id] = ptsStr;
    }
  }

  return result;
}

// Convert geographic (lat, lng) of Turkey (lat 35.8..42.2, lng 26.0..44.8) to SVG [0..1000, 0..460]
function projectTurkeyLatLng(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - 25.8) / (44.9 - 25.8)) * 940 + 30;
  const y = ((42.3 - lat) / (42.3 - 35.7)) * 400 + 30;
  return { x, y };
}

export const MapPanel: React.FC = () => {
  const {
    lang,
    baselineId,
    customBaseline,
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

  const [hoveredUnit, setHoveredUnit] = useState<HoverCardData | null>(null);
  const t = translations[lang];

  const activeDataset =
    baselineId === 'custom' && customBaseline
      ? customBaseline
      : BASELINES[baselineId] || BASELINES['2023_general'];

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

  // Precompute Voronoi polygons for 81 Provinces and 87 Electoral Districts
  const provincePolygons = useMemo(() => {
    const pts = activeDataset.provinces.map((p) => {
      const { x, y } = projectTurkeyLatLng(p.lat, p.lng);
      return { id: p.id, x, y };
    });
    return computeClippedVoronoiPolygons(pts, 56, 3);
  }, [activeDataset.provinces]);

  const districtSeedsAndPolygons = useMemo(() => {
    const provLookup: Record<string, { lat: number; lng: number }> = {};
    for (const p of activeDataset.provinces) provLookup[p.id] = { lat: p.lat, lng: p.lng };

    const pts = activeDataset.districts.map((d) => {
      const baseP = provLookup[d.ilId] || { lat: 39, lng: 35 };
      let lat = baseP.lat;
      let lng = baseP.lng;
      if (d.id.endsWith('-1')) {
        lat -= 0.12;
        lng += 0.18;
      } else if (d.id.endsWith('-2')) {
        lat += 0.14;
        lng += 0.02;
      } else if (d.id.endsWith('-3')) {
        lat += 0.02;
        lng -= 0.22;
      }
      const { x, y } = projectTurkeyLatLng(lat, lng);
      return { id: d.id, ilId: d.ilId, name: d.name, x, y };
    });

    return {
      seeds: pts,
      polygons: computeClippedVoronoiPolygons(pts, 54, 3),
    };
  }, [activeDataset.provinces, activeDataset.districts]);

  // Precompute Single-Province Zoomed İlçe Polygons when zoomedProvinceId is set
  const zoomedProvinceIlceCells = useMemo(() => {
    if (!zoomedProvinceId) return null;
    const ilceler = activeDataset.ilceler.filter((i) => i.ilId === zoomedProvinceId);
    if (ilceler.length === 0) return null;

    const minLat = Math.min(...ilceler.map((i) => i.lat)) - 0.08;
    const maxLat = Math.max(...ilceler.map((i) => i.lat)) + 0.08;
    const minLng = Math.min(...ilceler.map((i) => i.lng)) - 0.1;
    const maxLng = Math.max(...ilceler.map((i) => i.lng)) + 0.1;

    const pts = ilceler.map((i) => {
      const x = ((i.lng - minLng) / Math.max(0.05, maxLng - minLng)) * 780 + 110;
      const y = ((maxLat - i.lat) / Math.max(0.05, maxLat - minLat)) * 340 + 60;
      return { id: i.id, name: i.name, districtId: i.districtId, x, y };
    });

    const polygons = computeClippedVoronoiPolygons(pts, 95, 3);
    return { pts, polygons };
  }, [zoomedProvinceId, activeDataset.ilceler]);

  // Helper to compute fill color of any geographic unit based on MapColorMode
  const getUnitFillColor = (
    leadingPartyId: string,
    partyShares: Record<string, number>,
    basePartyShares: Record<string, number>,
    marginPct: number,
    turnout: number
  ): string => {
    const leader = partyMap[leadingPartyId];
    if (mapColorMode === 'leader') {
      return leader?.color || '#475569';
    }
    if (mapColorMode === 'alliance') {
      if (leader?.allianceId && allianceMap[leader.allianceId]) {
        return allianceMap[leader.allianceId].color;
      }
      return leader?.color || '#475569';
    }
    if (mapColorMode === 'margin') {
      // Margin intensity: brighter/deeper color for landslide (>25%), muted for close race (<5%)
      const baseColor = leader?.color || '#64748b';
      if (marginPct < 3) return '#94a3b8';
      return baseColor;
    }
    if (mapColorMode === 'turnout') {
      if (turnout >= 90) return '#059669';
      if (turnout >= 87) return '#10b981';
      if (turnout >= 83) return '#06b6d4';
      if (turnout >= 78) return '#f59e0b';
      return '#ef4444';
    }
    // mapColorMode === 'swing' -> Party with largest positive swing in this unit
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
    if (Math.abs(maxSwing) < 0.15) return '#334155';
    return partyMap[bestSwingPartyId]?.color || '#475569';
  };

  const zoomedProv = zoomedProvinceId ? projection.provinceResults[zoomedProvinceId] : null;

  return (
    <div className="pixel-box p-3 flex flex-col gap-2.5 relative">
      {/* Top Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-800 pb-2">
        {/* Layer Switcher (81 İl / 87 Seçim Çevresi / 973 İlçe) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Layers className="w-4 h-4 text-amber-400 mr-1" />
          {(
            [
              ['81_il', t.layer81Il],
              ['87_district', t.layer87District],
              ['973_ilce', t.layer973Ilce],
            ] as [MapLayerMode, string][]
          ).map(([layerKey, label]) => (
            <button
              key={layerKey}
              onClick={() => {
                setMapLayer(layerKey);
                if (layerKey !== '973_ilce') setZoomedProvinceId(null);
              }}
              className={`pixel-btn px-2.5 py-1 text-xs ${
                mapLayer === layerKey && !zoomedProvinceId
                  ? 'pixel-btn-amber'
                  : 'bg-slate-900 text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}

          {zoomedProvinceId && (
            <button
              onClick={() => setZoomedProvinceId(null)}
              className="pixel-btn pixel-btn-cyan px-2.5 py-1 text-xs ml-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>
                {t.backToTurkeyMap} ({zoomedProv?.name})
              </span>
            </button>
          )}
        </div>

        {/* Color Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1">
          <Palette className="w-3.5 h-3.5 text-cyan-400 mr-1" />
          {(
            [
              ['leader', t.colorLeader],
              ['alliance', t.colorAlliance],
              ['margin', t.colorMargin],
              ['turnout', t.colorTurnout],
              ['swing', t.colorSwing],
            ] as [MapColorMode, string][]
          ).map(([cMode, label]) => (
            <button
              key={cMode}
              onClick={() => setMapColorMode(cMode)}
              className={`px-2 py-1 text-[11px] font-mono border transition-colors ${
                mapColorMode === cMode
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-200 font-bold'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive SVG Map Viewport */}
      <div
        className="relative w-full bg-[#090c12] bg-pixel-grid border-2 border-slate-800 overflow-hidden select-none"
        onMouseLeave={() => setHoveredUnit(null)}
      >
        <svg viewBox="0 0 1000 460" className="w-full h-auto block">
          {/* Sea / Frame Labels */}
          <text x="480" y="22" textAnchor="middle" className="fill-slate-700 font-pixel text-[10px]">
            KARADENİZ (BLACK SEA)
          </text>
          <text x="40" y="245" className="fill-slate-700 font-pixel text-[9px]" transform="rotate(-90 40 245)">
            EGE DENİZİ
          </text>
          <text x="340" y="448" textAnchor="middle" className="fill-slate-700 font-pixel text-[10px]">
            AKDENİZ (MEDITERRANEAN SEA)
          </text>

          {/* MODE A: Single-Province Zoomed İlçe Drill-Down View */}
          {zoomedProvinceId && zoomedProvinceIlceCells ? (
            <g>
              {zoomedProvinceIlceCells.pts.map((pt) => {
                const iRes = projection.ilceResults[pt.id];
                const baseIRes = baselineProjection.ilceResults[pt.id];
                if (!iRes) return null;
                const fill = getUnitFillColor(
                  iRes.leadingPartyId,
                  iRes.partyShares,
                  baseIRes?.partyShares || {},
                  iRes.marginPct,
                  iRes.turnout
                );
                const isSelected =
                  activeScope.type === 'ilce' && activeScope.ilceId === pt.id;
                const isLocked = Boolean(ilceOverrides[pt.id]?.isLocked);
                const polyPoints = zoomedProvinceIlceCells.polygons[pt.id];

                return (
                  <g
                    key={pt.id}
                    className="cursor-pointer group"
                    onClick={() => setActiveScope({ type: 'ilce', ilceId: pt.id })}
                    onMouseEnter={(e) => {
                      const top = [...parties]
                        .filter((p) => !p.isOther)
                        .sort((a, b) => (iRes.partyVotes[b.id] || 0) - (iRes.partyVotes[a.id] || 0))
                        .slice(0, 4)
                        .map((p) => ({
                          shortName: p.shortName,
                          color: p.color,
                          share: iRes.partyShares[p.id] || 0,
                          votes: iRes.partyVotes[p.id] || 0,
                        }));
                      setHoveredUnit({
                        id: pt.id,
                        title: `${iRes.name} (${zoomedProv?.name || ''})`,
                        subtitle: `Seçim Çevresi: ${iRes.districtId}`,
                        turnout: iRes.turnout,
                        validVotes: iRes.validVotes,
                        isLocked,
                        topParties: top,
                        x: pt.x,
                        y: pt.y,
                      });
                    }}
                  >
                    {polyPoints && (
                      <polygon
                        points={polyPoints}
                        fill={fill}
                        fillOpacity={isSelected ? 0.95 : 0.78}
                        stroke={isSelected ? '#fde047' : isLocked ? '#f59e0b' : '#0f172a'}
                        strokeWidth={isSelected ? 3 : isLocked ? 2.2 : 1.5}
                        className="transition-opacity group-hover:fill-opacity-100"
                      />
                    )}
                    <rect
                      x={pt.x - 4}
                      y={pt.y - 4}
                      width={8}
                      height={8}
                      fill="#090d16"
                      stroke="#f8fafc"
                      strokeWidth={1}
                    />
                    <text
                      x={pt.x}
                      y={pt.y + 14}
                      textAnchor="middle"
                      className="fill-white font-sans font-bold text-[10px] drop-shadow-[1px_1px_0px_#000] pointer-events-none"
                    >
                      {pt.name}
                    </text>
                    {isLocked && (
                      <text
                        x={pt.x}
                        y={pt.y - 8}
                        textAnchor="middle"
                        className="fill-amber-300 font-pixel text-[9px]"
                      >
                        🔒
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ) : mapLayer === '973_ilce' ? (
            /* MODE B: All 973 İlçeler Nationwide Pixel Map */
            <g>
              {/* Subtle Province Outlines Underneath */}
              {activeDataset.provinces.map((prov) => {
                const poly = provincePolygons[prov.id];
                if (!poly) return null;
                return (
                  <polygon
                    key={`bg-${prov.id}`}
                    points={poly}
                    fill="#111827"
                    stroke="#1e293b"
                    strokeWidth={1.2}
                  />
                );
              })}

              {/* All 973 İlçeler as Pixel Cells */}
              {activeDataset.ilceler.map((ilce) => {
                const iRes = projection.ilceResults[ilce.id];
                const baseIRes = baselineProjection.ilceResults[ilce.id];
                if (!iRes) return null;
                const { x, y } = projectTurkeyLatLng(ilce.lat, ilce.lng);
                const fill = getUnitFillColor(
                  iRes.leadingPartyId,
                  iRes.partyShares,
                  baseIRes?.partyShares || {},
                  iRes.marginPct,
                  iRes.turnout
                );
                const isSelected =
                  activeScope.type === 'ilce' && activeScope.ilceId === ilce.id;
                const isLocked = Boolean(ilceOverrides[ilce.id]?.isLocked);
                // Size proportional to log of voter count
                const size = Math.max(5.5, Math.min(13, Math.log10(Math.max(1000, iRes.registeredVoters)) * 2.1 - 3));

                return (
                  <rect
                    key={ilce.id}
                    x={x - size / 2}
                    y={y - size / 2}
                    width={size}
                    height={size}
                    fill={fill}
                    stroke={isSelected ? '#fef08a' : isLocked ? '#f59e0b' : '#090d16'}
                    strokeWidth={isSelected ? 2.2 : isLocked ? 1.6 : 0.7}
                    className="cursor-pointer hover:stroke-white hover:stroke-2"
                    onClick={() => setActiveScope({ type: 'ilce', ilceId: ilce.id })}
                    onMouseEnter={() => {
                      const provName = projection.provinceResults[ilce.ilId]?.name || ilce.ilId;
                      const top = [...parties]
                        .filter((p) => !p.isOther)
                        .sort((a, b) => (iRes.partyVotes[b.id] || 0) - (iRes.partyVotes[a.id] || 0))
                        .slice(0, 4)
                        .map((p) => ({
                          shortName: p.shortName,
                          color: p.color,
                          share: iRes.partyShares[p.id] || 0,
                          votes: iRes.partyVotes[p.id] || 0,
                        }));
                      setHoveredUnit({
                        id: ilce.id,
                        title: `${ilce.name} (${provName})`,
                        subtitle: `Bölge: ${ilce.districtId} • ${iRes.registeredVoters.toLocaleString('tr-TR')} Seçmen`,
                        turnout: iRes.turnout,
                        validVotes: iRes.validVotes,
                        isLocked,
                        topParties: top,
                        x,
                        y,
                      });
                    }}
                  />
                );
              })}
            </g>
          ) : mapLayer === '87_district' ? (
            /* MODE C: 87 Electoral Districts (Seçim Çevresi) View */
            <g>
              {districtSeedsAndPolygons.seeds.map((dSeed) => {
                const dRes = projection.districtResults[dSeed.id];
                const baseDRes = baselineProjection.districtResults[dSeed.id];
                if (!dRes) return null;
                const fill = getUnitFillColor(
                  dRes.leadingPartyId,
                  dRes.partyShares,
                  baseDRes?.partyShares || {},
                  dRes.marginPct,
                  dRes.turnout
                );
                const isSelected =
                  activeScope.type === 'district' && activeScope.districtId === dSeed.id;
                const isLocked = Boolean(districtOverrides[dSeed.id]?.isLocked);
                const polyPoints = districtSeedsAndPolygons.polygons[dSeed.id];

                return (
                  <g
                    key={dSeed.id}
                    className="cursor-pointer group"
                    onClick={() => setActiveScope({ type: 'district', districtId: dSeed.id })}
                    onDoubleClick={() => setZoomedProvinceId(dSeed.ilId)}
                    onMouseEnter={() => {
                      const top = [...parties]
                        .filter((p) => !p.isOther)
                        .sort(
                          (a, b) =>
                            (dRes.totalPartyVotes[b.id] || 0) - (dRes.totalPartyVotes[a.id] || 0)
                        )
                        .slice(0, 4)
                        .map((p) => ({
                          shortName: p.shortName,
                          color: p.color,
                          share: dRes.partyShares[p.id] || 0,
                          votes: dRes.totalPartyVotes[p.id] || 0,
                          seats: dRes.partySeats[p.id] || 0,
                        }));
                      setHoveredUnit({
                        id: dSeed.id,
                        title: `${dSeed.id} • ${dRes.name}`,
                        subtitle: `${dRes.mpCount} Milletvekili • Çift Tıkla: İlçeler`,
                        mpCount: dRes.mpCount,
                        turnout: dRes.turnout,
                        validVotes: dRes.totalValidVotes,
                        isLocked,
                        topParties: top,
                        x: dSeed.x,
                        y: dSeed.y,
                      });
                    }}
                  >
                    {polyPoints && (
                      <polygon
                        points={polyPoints}
                        fill={fill}
                        fillOpacity={isSelected ? 0.96 : 0.82}
                        stroke={isSelected ? '#fde047' : isLocked ? '#f59e0b' : '#090d16'}
                        strokeWidth={isSelected ? 3 : isLocked ? 2.2 : 1.4}
                        className="transition-opacity group-hover:fill-opacity-100"
                      />
                    )}
                    <text
                      x={dSeed.x}
                      y={dSeed.y + 3}
                      textAnchor="middle"
                      className="fill-white font-mono font-bold text-[9px] drop-shadow-[1px_1px_0px_#000] pointer-events-none"
                    >
                      {dSeed.id}
                    </text>
                  </g>
                );
              })}
            </g>
          ) : (
            /* MODE D (Default): 81 Provinces (İl) Map View */
            <g>
              {activeDataset.provinces.map((prov) => {
                const pRes = projection.provinceResults[prov.id];
                const basePRes = baselineProjection.provinceResults[prov.id];
                if (!pRes) return null;
                const { x, y } = projectTurkeyLatLng(prov.lat, prov.lng);
                const fill = getUnitFillColor(
                  pRes.leadingPartyId,
                  pRes.partyShares,
                  basePRes?.partyShares || {},
                  pRes.marginPct,
                  pRes.turnout
                );
                const isSelected =
                  activeScope.type === 'province' && activeScope.ilId === prov.id;
                const isLocked = Boolean(provinceOverrides[prov.id]?.isLocked);
                const polyPoints = provincePolygons[prov.id];

                return (
                  <g
                    key={prov.id}
                    className="cursor-pointer group"
                    onClick={() => setActiveScope({ type: 'province', ilId: prov.id })}
                    onDoubleClick={() => setZoomedProvinceId(prov.id)}
                    onMouseEnter={() => {
                      const top = [...parties]
                        .filter((p) => !p.isOther)
                        .sort((a, b) => (pRes.partyVotes[b.id] || 0) - (pRes.partyVotes[a.id] || 0))
                        .slice(0, 4)
                        .map((p) => ({
                          shortName: p.shortName,
                          color: p.color,
                          share: pRes.partyShares[p.id] || 0,
                          votes: pRes.partyVotes[p.id] || 0,
                          seats: pRes.partySeats[p.id] || 0,
                        }));
                      setHoveredUnit({
                        id: prov.id,
                        title: `${prov.id} - ${prov.name}`,
                        subtitle: `${pRes.mpCount} Milletvekili • Çift Tıkla: İlçeleri Aç`,
                        mpCount: pRes.mpCount,
                        turnout: pRes.turnout,
                        validVotes: pRes.totalValidVotes,
                        isLocked,
                        topParties: top,
                        x,
                        y,
                      });
                    }}
                  >
                    {polyPoints && (
                      <polygon
                        points={polyPoints}
                        fill={fill}
                        fillOpacity={isSelected ? 0.96 : 0.82}
                        stroke={isSelected ? '#fde047' : isLocked ? '#f59e0b' : '#090d16'}
                        strokeWidth={isSelected ? 3 : isLocked ? 2.2 : 1.4}
                        className="transition-opacity group-hover:fill-opacity-100"
                      />
                    )}
                    <text
                      x={x}
                      y={y - 2}
                      textAnchor="middle"
                      className="fill-white font-mono font-bold text-[9px] drop-shadow-[1px_1px_0px_#000] pointer-events-none"
                    >
                      {prov.id}
                    </text>
                    <text
                      x={x}
                      y={y + 8}
                      textAnchor="middle"
                      className="fill-slate-100 font-sans font-semibold text-[8px] drop-shadow-[1px_1px_0px_#000] pointer-events-none"
                    >
                      {prov.name.slice(0, 8)}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
        </svg>

        {/* Floating Hover Pixel Tooltip Card */}
        {hoveredUnit && (
          <div
            style={{
              left: hoveredUnit.x > 520 ? '16px' : 'auto',
              right: hoveredUnit.x <= 520 ? '16px' : 'auto',
              top: '16px',
            }}
            className="absolute z-20 w-64 pixel-box-bright p-2.5 pointer-events-none text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
              <div>
                <div className="font-pixel text-xs text-amber-300 flex items-center gap-1">
                  <span>{hoveredUnit.title}</span>
                  {hoveredUnit.isLocked && <Lock className="w-3 h-3 text-amber-400" />}
                </div>
                <div className="text-[10px] font-mono text-slate-400">{hoveredUnit.subtitle}</div>
              </div>
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-2 bg-slate-950/80 px-1.5 py-1 border border-slate-800">
              <span>Katılım: %{hoveredUnit.turnout.toFixed(1)}</span>
              <span>Geçerli: {hoveredUnit.validVotes.toLocaleString('tr-TR')}</span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              {hoveredUnit.topParties.map((tp) => (
                <div key={tp.shortName} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 border border-slate-950"
                      style={{ backgroundColor: tp.color }}
                    />
                    <span className="font-bold text-slate-100">{tp.shortName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300">%{tp.share.toFixed(1)}</span>
                    {tp.seats !== undefined && (
                      <span className="px-1 bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-[10px]">
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

      {/* Bottom Map Action Bar & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
        {/* Legend of Parties */}
        <div className="flex flex-wrap items-center gap-2">
          {parties
            .filter((p) => !p.isOther)
            .map((p) => (
              <div key={p.id} className="flex items-center gap-1 text-[11px] font-mono">
                <span
                  className="w-3 h-3 border border-slate-950"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-slate-300 font-semibold">{p.shortName}</span>
              </div>
            ))}
        </div>

        {/* Drill-down button when a province or district is selected */}
        <div className="flex items-center gap-2">
          {(activeScope.type === 'province' || activeScope.type === 'district') &&
            !zoomedProvinceId && (
              <button
                onClick={() => {
                  const ilId =
                    activeScope.type === 'province'
                      ? activeScope.ilId
                      : projection.districtResults[activeScope.districtId]?.ilId;
                  if (ilId) setZoomedProvinceId(ilId);
                }}
                className="pixel-btn pixel-btn-cyan px-2.5 py-1 text-xs"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>{t.drillDownIlceler}</span>
              </button>
            )}
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            <Eye className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
            Tıkla: Seç & Düzenle • Çift Tıkla: İlçelere Yakınlaş
          </span>
        </div>
      </div>
    </div>
  );
};
