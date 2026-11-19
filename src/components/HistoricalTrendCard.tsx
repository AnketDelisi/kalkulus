import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  ARCHIVE_ELECTIONS,
  ArchiveElectionConfig,
} from '../data/archiveRegistry';
import { CANDIDATE_COLORS, PARTY_COLORS } from '../data/partyColors';
import { getCachedRawBaseline, loadRawBaseline, RawBaselineKey } from '../data/baselineCache';
import { useElectionStore } from '../store/useElectionStore';
import { ArchiveCategory, ArchiveElectionId, BaselineDataset } from '../types/election';
import { getContrastTextColor } from '../utils/color';

const GENERAL_TRACK_IDS: ArchiveElectionId[] = [
  '1987_general',
  '1991_general',
  '1995_general',
  '1999_general',
  '2002_general',
  '2007_general',
  '2011_general',
  '2015_june',
  '2015_nov',
  '2018_general',
  '2023_general',
];

const PRES_TRACK_IDS: ArchiveElectionId[] = [
  '2014_pres',
  '2018_pres',
  '2023_pres_r1',
  '2023_pres_r2',
];

const REF_TRACK_IDS: ArchiveElectionId[] = ['2010_ref', '2017_ref'];
const LOCAL_TRACK_IDS: ArchiveElectionId[] = ['2009_local', '2014_local', '2019_local', '2024_local'];

const TRACK_META: Array<{
  cat: ArchiveCategory;
  ids: ArchiveElectionId[];
  tr: string;
  en: string;
}> = [
  { cat: 'general', ids: GENERAL_TRACK_IDS, tr: 'Genel (1987–2023)', en: 'General (1987–2023)' },
  { cat: 'presidential', ids: PRES_TRACK_IDS, tr: 'CB (2014–2023)', en: 'Pres. (2014–2023)' },
  { cat: 'referendum', ids: REF_TRACK_IDS, tr: 'Ref. (2010–2017)', en: 'Ref. (2010–2017)' },
  { cat: 'local', ids: LOCAL_TRACK_IDS, tr: 'Yerel (2009–2024)', en: 'Local (2009–2024)' },
];

const SERIES_COLORS: Record<string, { labelTr: string; labelEn: string; color: string }> = {
  AKP: { labelTr: 'AK Parti', labelEn: 'AKP', color: PARTY_COLORS.AKP },
  CHP: { labelTr: 'CHP', labelEn: 'CHP', color: PARTY_COLORS.CHP },
  MHP: { labelTr: 'MHP', labelEn: 'MHP', color: PARTY_COLORS.MHP },
  DEM: { labelTr: 'HADEP/BDP/HDP/DEM', labelEn: 'HADEP/BDP/HDP/DEM', color: PARTY_COLORS.DEM },
  IYI: { labelTr: 'İYİ', labelEn: 'İYİ', color: PARTY_COLORS.IYI },
  SAADET: { labelTr: 'RP/FP/SP', labelEn: 'RP/FP/SP', color: PARTY_COLORS.SAADET },
  DP: { labelTr: 'DYP/DP', labelEn: 'DYP/DP', color: PARTY_COLORS.DP },
  ANAP: { labelTr: 'ANAP', labelEn: 'ANAP', color: PARTY_COLORS.ANAP },
  DSP: { labelTr: 'DSP', labelEn: 'DSP', color: PARTY_COLORS.DSP },
  YRP: { labelTr: 'YRP', labelEn: 'YRP', color: PARTY_COLORS.YRP },
  GP: { labelTr: 'GP', labelEn: 'GP', color: PARTY_COLORS.GP },
  ERDOGAN: { labelTr: 'Erdoğan', labelEn: 'Erdoğan', color: CANDIDATE_COLORS.ERDOGAN },
  KILICDAROGLU: { labelTr: 'Kılıçdaroğlu', labelEn: 'Kılıçdaroğlu', color: CANDIDATE_COLORS.KILICDAROGLU },
  INCE: { labelTr: 'İnce', labelEn: 'İnce', color: CANDIDATE_COLORS.INCE_MP },
  IHSANOGLU: { labelTr: 'İhsanoğlu', labelEn: 'İhsanoğlu', color: CANDIDATE_COLORS.IHSANOGLU },
  DEMIRTAS: { labelTr: 'Demirtaş', labelEn: 'Demirtaş', color: CANDIDATE_COLORS.DEMIRTAS },
  AKSENER: { labelTr: 'Akşener', labelEn: 'Akşener', color: CANDIDATE_COLORS.AKSENER },
  OGAN: { labelTr: 'Oğan', labelEn: 'Oğan', color: CANDIDATE_COLORS.OGAN },
  EVET: { labelTr: 'Evet', labelEn: 'Yes', color: CANDIDATE_COLORS.EVET },
  HAYIR: { labelTr: 'Hayır', labelEn: 'No', color: CANDIDATE_COLORS.HAYIR },
};

function computeWeightedShares(
  ilceler: BaselineDataset['ilceler'],
  useMayoral = false
): Record<string, number> {
  let totValid = 0;
  const partyVotes: Record<string, number> = {};
  for (const ilce of ilceler) {
    const valid =
      ilce.registeredVoters * (ilce.turnout / 100) * (ilce.validVoteRatio / 100);
    if (valid <= 0) continue;
    totValid += valid;
    const srcShares = useMayoral && ilce.mayorPartyShares ? ilce.mayorPartyShares : ilce.partyShares;
    for (const [pid, pct] of Object.entries(srcShares)) {
      partyVotes[pid] = (partyVotes[pid] || 0) + valid * ((pct || 0) / 100);
    }
  }
  const shares: Record<string, number> = {};
  if (totValid > 0) {
    for (const [pid, v] of Object.entries(partyVotes)) {
      shares[pid] = (v / totValid) * 100;
    }
  }
  return shares;
}

function getEntityMeta(
  cfg: ArchiveElectionConfig,
  pid: string
): { shortName: string; color: string } {
  const found = cfg.parties.find((p) => p.id === pid);
  if (found) return { shortName: found.shortName, color: found.color };
  const s = SERIES_COLORS[pid];
  if (s) return { shortName: s.labelTr, color: s.color };
  return { shortName: pid, color: '#64748b' };
}

export const HistoricalTrendCard: React.FC = () => {
  const {
    lang,
    activeArchiveId,
    activeScope,
    projection,
    presidentialProjection,
    localProjection,
    enterArchiveElection,
  } = useElectionStore();

  const activeCfg = activeArchiveId ? ARCHIVE_ELECTIONS[activeArchiveId] : undefined;
  const [trackCat, setTrackCat] = useState<ArchiveCategory>('general');
  const [loadTick, setLoadTick] = useState(0);
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  useEffect(() => {
    if (activeCfg) {
      setTrackCat(activeCfg.category);
    }
  }, [activeCfg?.id]);

  const activeTrack = useMemo(
    () => TRACK_META.find((t) => t.cat === trackCat) || TRACK_META[0],
    [trackCat]
  );

  // Lazy-load raw baselines for the active track in background
  useEffect(() => {
    if (!activeArchiveId) return;
    const missingKeys: RawBaselineKey[] = [];
    for (const id of activeTrack.ids) {
      const k = ARCHIVE_ELECTIONS[id].baselineKey;
      if (!getCachedRawBaseline(k)) missingKeys.push(k);
    }
    if (missingKeys.length === 0) return;

    let cancelled = false;
    Promise.all(missingKeys.map((k) => loadRawBaseline(k)))
      .then(() => {
        if (!cancelled) setLoadTick((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeArchiveId, activeTrack]);

  // Human-readable label for currently inspected scope
  const scopeLabel = useMemo(() => {
    if (activeScope.type === 'province') {
      const pName =
        projection.provinceResults[activeScope.ilId]?.name ||
        presidentialProjection.round1.provinceResults[activeScope.ilId]?.name ||
        localProjection.provinceResults[activeScope.ilId]?.name ||
        activeScope.ilId;
      return `${activeScope.ilId} · ${pName}`;
    }
    if (activeScope.type === 'district') {
      return projection.districtResults[activeScope.districtId]?.name || activeScope.districtId;
    }
    if (activeScope.type === 'ilce') {
      return (
        projection.ilceResults[activeScope.ilceId]?.name ||
        presidentialProjection.round1.ilceResults[activeScope.ilceId]?.name ||
        localProjection.ilceResults[activeScope.ilceId]?.name ||
        activeScope.ilceId
      );
    }
    if (activeScope.type === 'abroad' || activeScope.type === 'abroadCountry') {
      return lang === 'tr' ? 'Yurt Dışı & Gümrükler' : 'Abroad & Customs';
    }
    return lang === 'tr' ? 'Türkiye Geneli' : 'National Total';
  }, [activeScope, projection, presidentialProjection, localProjection, lang]);

  const points = useMemo(() => {
    // Recompute whenever baselines load or active scope changes
    void loadTick;
    return activeTrack.ids.map((id) => {
      const cfg = ARCHIVE_ELECTIONS[id];
      const raw = getCachedRawBaseline(cfg.baselineKey);
      if (!raw) {
        return {
          id,
          cfg,
          loaded: false,
          shares: {} as Record<string, number>,
          winnerId: '',
          winnerShort: '...',
          winnerColor: '#CBD5E1',
          winnerShare: 0,
          usedParentFallback: false,
        };
      }

      const useMayoral = cfg.defaultMode === 'local';
      let shares: Record<string, number> = {};
      let usedParentFallback = false;

      if (activeScope.type === 'abroad' || activeScope.type === 'abroadCountry') {
        shares = cfg.abroadEnabled ? { ...raw.abroad.partyShares } : {};
      } else if (activeScope.type === 'province') {
        const mappedProv = cfg.provinceMergeMap?.[activeScope.ilId];
        const effIlId = mappedProv || activeScope.ilId;
        if (mappedProv) usedParentFallback = true;
        const unitIlces = raw.ilceler.filter((i) => i.ilId === effIlId);
        shares = computeWeightedShares(unitIlces, useMayoral);
      } else if (activeScope.type === 'district') {
        let unitIlces = raw.ilceler.filter((i) => i.districtId === activeScope.districtId);
        if (unitIlces.length === 0) {
          const rawIl = activeScope.districtId.split('-')[0];
          const effIl = cfg.provinceMergeMap?.[rawIl] || rawIl;
          unitIlces = raw.ilceler.filter((i) => i.ilId === effIl);
          usedParentFallback = true;
        }
        shares = computeWeightedShares(unitIlces, useMayoral);
      } else if (activeScope.type === 'ilce') {
        const direct = raw.ilceler.find((i) => i.id === activeScope.ilceId);
        if (direct) {
          shares =
            useMayoral && direct.mayorPartyShares ? { ...direct.mayorPartyShares } : { ...direct.partyShares };
        } else {
          const parentIlceId = cfg.ilceMergeMap?.[activeScope.ilceId];
          const parentIlce = parentIlceId
            ? raw.ilceler.find((i) => i.id === parentIlceId)
            : undefined;
          if (parentIlce) {
            shares =
              useMayoral && parentIlce.mayorPartyShares
                ? { ...parentIlce.mayorPartyShares }
                : { ...parentIlce.partyShares };
            usedParentFallback = true;
          } else {
            const rawIl = activeScope.ilceId.split('-')[0];
            const effIl = cfg.ilceProvinceOverrides?.[activeScope.ilceId] || cfg.provinceMergeMap?.[rawIl] || rawIl;
            shares = computeWeightedShares(
              raw.ilceler.filter((i) => i.ilId === effIl),
              useMayoral
            );
            usedParentFallback = true;
          }
        }
      } else {
        shares =
          useMayoral && raw.mayorNationalBaseShares
            ? { ...raw.mayorNationalBaseShares }
            : { ...raw.nationalBaseShares };
      }

      const ranked = Object.entries(shares)
        .filter(([pid, v]) => pid !== 'OTHER' && v > 0)
        .sort((a, b) => b[1] - a[1]);
      const top = ranked[0];
      const meta = top ? getEntityMeta(cfg, top[0]) : { shortName: '—', color: '#94a3b8' };

      return {
        id,
        cfg,
        loaded: true,
        shares,
        winnerId: top?.[0] || '',
        winnerShort: meta.shortName,
        winnerColor: meta.color,
        winnerShare: top?.[1] || 0,
        usedParentFallback,
      };
    });
  }, [activeTrack, activeScope, loadTick]);

  const seriesKeys = useMemo(() => {
    const peakByKey: Record<string, number> = {};
    for (const pt of points) {
      if (!pt.loaded) continue;
      for (const [k, v] of Object.entries(pt.shares)) {
        if (k === 'OTHER' || k === 'IND') continue;
        peakByKey[k] = Math.max(peakByKey[k] || 0, v || 0);
      }
    }
    return Object.entries(peakByKey)
      .sort((a, b) => b[1] - a[1])
      .slice(0, trackCat === 'referendum' ? 2 : 5)
      .map(([k]) => k);
  }, [points, trackCat]);

  const loadedCount = points.filter((p) => p.loaded).length;

  if (!activeArchiveId) return null;

  // SVG Geometry
  const W = 680;
  const H = 178;
  const padL = 34;
  const padR = 22;
  const padT = 16;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxVal = useMemo(() => {
    let mx = 50;
    for (const pt of points) {
      for (const k of seriesKeys) {
        mx = Math.max(mx, pt.shares[k] || 0);
      }
    }
    return Math.min(100, Math.ceil(mx / 10) * 10);
  }, [points, seriesKeys]);

  const xAt = (idx: number) =>
    points.length <= 1 ? padL + plotW / 2 : padL + (idx / (points.length - 1)) * plotW;
  const yAt = (val: number) => padT + plotH - (Math.min(maxVal, Math.max(0, val)) / maxVal) * plotH;

  const hoverIdx = hoveredPointIdx !== null && points[hoveredPointIdx] ? hoveredPointIdx : null;

  return (
    <div className="studio-panel p-4 flex flex-col gap-3">
      {/* Header + Track Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-[1.5px] border-[#090A0F] pb-2.5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#090A0F]" />
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
              {lang === 'tr' ? 'Tarihsel Trend' : 'Historical Trend'}
            </div>
            <h3 className="text-title font-bold text-[#090A0F] leading-tight">{scopeLabel}</h3>
          </div>
        </div>

        <div className="inline-flex border border-[#090A0F] bg-white text-[11px] font-bold">
          {TRACK_META.map((tm, idx) => {
            const active = tm.cat === trackCat;
            return (
              <button
                key={tm.cat}
                type="button"
                onClick={() => {
                  setTrackCat(tm.cat);
                  setHoveredPointIdx(null);
                }}
                className={`px-2 py-1 transition-colors ${
                  idx > 0 ? 'border-l border-[#090A0F]' : ''
                } ${active ? 'bg-[#090A0F] text-white' : 'text-[#090A0F] hover:bg-slate-100'}`}
              >
                {lang === 'tr' ? tm.tr : tm.en}
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Share Evolution Chart */}
      <div className="relative bg-[#F8FAFC] border border-[#090A0F]/20 p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible select-none">
          {/* Y-axis horizontal gridlines */}
          {[0, 20, 40, 60, 80, 100]
            .filter((v) => v <= maxVal)
            .map((tick) => {
              const y = yAt(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padL}
                    x2={W - padR}
                    y1={y}
                    y2={y}
                    stroke="#CBD5E1"
                    strokeDasharray="3 3"
                    strokeWidth={0.8}
                  />
                  <text
                    x={padL - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-500 text-[9px] font-mono"
                  >
                    %{tick}
                  </text>
                </g>
              );
            })}

          {/* Highlight active archive election vertical marker */}
          {points.map((pt, idx) =>
            pt.id === activeArchiveId ? (
              <line
                key={`act-${pt.id}`}
                x1={xAt(idx)}
                x2={xAt(idx)}
                y1={padT}
                y2={H - padB}
                stroke="#090A0F"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
            ) : null
          )}

          {/* Polylines & Dots per series */}
          {seriesKeys.map((key) => {
            const meta = SERIES_COLORS[key] || { labelTr: key, labelEn: key, color: '#475569' };
            // Build contiguous segments where the party/candidate ran (> 0)
            const coords = points.map((pt, idx) => {
              const v = pt.loaded ? pt.shares[key] : undefined;
              return v !== undefined && v > 0 ? { x: xAt(idx), y: yAt(v), v, idx } : null;
            });

            const segments: Array<Array<{ x: number; y: number; v: number; idx: number }>> = [];
            let cur: Array<{ x: number; y: number; v: number; idx: number }> = [];
            for (const c of coords) {
              if (c) cur.push(c);
              else {
                if (cur.length > 0) segments.push(cur);
                cur = [];
              }
            }
            if (cur.length > 0) segments.push(cur);

            return (
              <g key={key}>
                {segments.map((seg, sIdx) =>
                  seg.length >= 2 ? (
                    <polyline
                      key={sIdx}
                      fill="none"
                      stroke={meta.color}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={seg.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                    />
                  ) : null
                )}
                {coords.map((c) =>
                  c ? (
                    <circle
                      key={`${key}-${c.idx}`}
                      cx={c.x}
                      cy={c.y}
                      r={
                        hoverIdx === c.idx || points[c.idx].id === activeArchiveId ? 4.5 : 3
                      }
                      fill={meta.color}
                      stroke="#FFFFFF"
                      strokeWidth={1.2}
                    />
                  ) : null
                )}
              </g>
            );
          })}

          {/* X-axis labels & invisible hover targets */}
          {points.map((pt, idx) => {
            const x = xAt(idx);
            const active = pt.id === activeArchiveId;
            return (
              <g
                key={pt.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPointIdx(idx)}
                onMouseLeave={() => setHoveredPointIdx(null)}
                onClick={() => void enterArchiveElection(pt.id, false)}
              >
                <rect
                  x={x - 24}
                  y={padT}
                  width={48}
                  height={H - padT}
                  fill="transparent"
                />
                <text
                  x={x}
                  y={H - 7}
                  textAnchor="middle"
                  className={`text-[9.5px] font-mono ${
                    active ? 'fill-[#090A0F] font-bold' : 'fill-slate-600'
                  }`}
                >
                  {pt.cfg.deltaLabelTr}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend & Hovered Snapshot Strip */}
        <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
          <div className="flex flex-wrap items-center gap-2.5">
            {seriesKeys.map((key) => {
              const m = SERIES_COLORS[key] || { labelTr: key, labelEn: key, color: '#475569' };
              const val = hoverIdx !== null ? points[hoverIdx].shares[key] : undefined;
              return (
                <span key={key} className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 inline-block" style={{ backgroundColor: m.color }} />
                  <span className="font-bold text-[#090A0F]">
                    {lang === 'tr' ? m.labelTr : m.labelEn}
                  </span>
                  {val !== undefined && val > 0 && (
                    <span className="text-slate-600">%{val.toFixed(1)}</span>
                  )}
                </span>
              );
            })}
          </div>
          {loadedCount < points.length && (
            <span className="text-slate-400">
              {lang === 'tr' ? 'Veriler yükleniyor...' : 'Loading years...'}
            </span>
          )}
        </div>
      </div>

      {/* Clickable Chronological Winner Badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        {points.map((pt) => {
          const active = pt.id === activeArchiveId;
          const fg = pt.loaded ? getContrastTextColor(pt.winnerColor) : '#334155';
          return (
            <button
              key={pt.id}
              type="button"
              onClick={() => void enterArchiveElection(pt.id, false)}
              title={
                pt.usedParentFallback
                  ? lang === 'tr'
                    ? `${pt.cfg.dateLabelTr} seçimine git (${scopeLabel} · tarihsel bağlı birim verisi)`
                    : `Jump to ${pt.cfg.dateLabelEn} (${scopeLabel} · historical parent unit)`
                  : lang === 'tr'
                  ? `${pt.cfg.dateLabelTr} seçimine git (${scopeLabel} odaklı)`
                  : `Jump to ${pt.cfg.dateLabelEn} (locked on ${scopeLabel})`
              }
              className={`px-2 py-1 text-[11px] font-mono border transition-transform ${
                active
                  ? 'border-[#090A0F] ring-2 ring-[#090A0F] ring-offset-1 font-bold'
                  : 'border-[#090A0F]/40 hover:border-[#090A0F]'
              }`}
              style={{
                backgroundColor: pt.loaded ? pt.winnerColor : '#F1F5F9',
                color: fg,
              }}
            >
              <span className="opacity-85 mr-1">{pt.cfg.deltaLabelTr}:</span>
              <span className="font-bold">{pt.winnerShort}</span>
              {pt.loaded && pt.winnerShare > 0 && (
                <span className="ml-1 opacity-90">%{pt.winnerShare.toFixed(0)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
