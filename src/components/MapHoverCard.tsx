import React from 'react';
import { Lock, SlidersHorizontal, X, ZoomIn } from 'lucide-react';
import { ElectionMode, Language } from '../types/election';
import { getContrastTextColor } from '../utils/color';
import { formatInt, formatPct } from '../utils/format';

export interface HoverEntry {
  id: string;
  shortName: string;
  color: string;
  share: number;
  votes: number;
  seats?: number;
  deltaShare?: number;
}

export interface HoverTelemetryData {
  id: string;
  mode: ElectionMode;
  title: string;
  subtitle: string;
  unitBadge: string;
  registeredVoters?: number;
  turnout: number;
  validVotes: number;
  isLocked: boolean;
  leader?: {
    shortName: string;
    color: string;
    share: number;
  };
  runnerUp?: {
    shortName: string;
    color: string;
    share: number;
  };
  marginPct: number;
  marginVotes: number;
  topEntries: HoverEntry[];
  barEntries?: HoverEntry[];
  mpCount?: number;
  closestChallengerShort?: string;
  closestChallengerColor?: string;
  votesToFlipLastSeat?: number;
  presRound?: 'round1' | 'round2';
  localRefLabel?: string;
  localPrevWinnerShort?: string;
  localPrevWinnerColor?: string;
  localWinnerShort?: string;
  localWinnerColor?: string;
  localFlipped?: boolean;
  localStatusBadge?: {
    kind: 'kayyim' | 'defection';
    label: string;
  };
}

export interface ClampedCardCoords {
  left: number;
  top: number;
}

/**
 * Anchors the hover card near the cursor while keeping it strictly inside viewport bounds.
 */
export function clampHoverPosition(
  cursorX: number,
  cursorY: number,
  containerWidth: number,
  containerHeight: number,
  cardWidth = 324,
  cardHeight = 205,
  offset = 18,
  pad = 10
): ClampedCardCoords {
  const maxW = Math.max(pad, containerWidth - cardWidth - pad);
  const maxH = Math.max(pad, containerHeight - cardHeight - pad);

  const preferRight = cursorX + offset + cardWidth <= containerWidth - pad;
  const rawLeft = preferRight ? cursorX + offset : cursorX - cardWidth - offset;
  const left = Math.min(maxW, Math.max(pad, rawLeft));

  const preferBelow = cursorY + offset + cardHeight <= containerHeight - pad;
  const rawTop = preferBelow ? cursorY + offset : cursorY - cardHeight - offset;
  const top = Math.min(maxH, Math.max(pad, rawTop));

  return { left, top };
}

interface MapHoverCardProps {
  data: HoverTelemetryData;
  lang: Language;
  cursorPos: { x: number; y: number } | null;
  containerSize: { width: number; height: number };
  dockedCorner: boolean;
  dockedMobileSheet?: boolean;
  onCloseSheet?: () => void;
  onEditUnit?: () => void;
  onZoomProvince?: () => void;
}

export const MapHoverCard: React.FC<MapHoverCardProps> = ({
  data,
  lang,
  cursorPos,
  containerSize,
  dockedCorner,
  dockedMobileSheet = false,
  onCloseSheet,
  onEditUnit,
  onZoomProvince,
}) => {
  const topFour = data.topEntries.slice(0, 4);
  const barItems =
    data.barEntries && data.barEntries.length > 0 ? data.barEntries : data.topEntries;
  const shownShareSum = barItems.reduce((s, e) => s + e.share, 0);
  const otherPct = Math.max(0, 100 - shownShareSum);

  const posStyle: React.CSSProperties = dockedMobileSheet
    ? {}
    : !dockedCorner && cursorPos && containerSize.width > 0
      ? (() => {
          const estimatedHeight = 96 + topFour.length * 25;
          const { left, top } = clampHoverPosition(
            cursorPos.x,
            cursorPos.y,
            containerSize.width,
            containerSize.height,
            324,
            estimatedHeight
          );
          return { left: `${left}px`, top: `${top}px` };
        })()
      : {
          left:
            cursorPos && containerSize.width > 0 && cursorPos.x > containerSize.width / 2
              ? '14px'
              : 'auto',
          right:
            !cursorPos || containerSize.width === 0 || cursorPos.x <= containerSize.width / 2
              ? '14px'
              : 'auto',
          bottom: '14px',
        };

  return (
    <div
      style={posStyle}
      className={
        dockedMobileSheet
          ? 'w-full bg-[#090A0F] text-white border-t-[1.5px] border-[#090A0F] p-3 text-body'
          : 'absolute z-20 w-[324px] bg-[#090A0F] text-white border-[1.5px] border-[#090A0F] shadow-[4px_4px_0px_rgba(9,10,15,0.24)] p-3 pointer-events-none text-body'
      }
    >
      {/* Clean Non-Truncating Header + Turnout & Total Valid Votes */}
      <div className="pb-2 border-b border-slate-800 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="font-bold text-white text-title leading-snug flex items-center gap-1.5">
            <span>{data.title}</span>
            {data.isLocked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[11px] text-slate-300 pt-0.5 whitespace-nowrap">
              {lang === 'tr' ? 'Katılım' : 'Turnout'}{' '}
              <strong className="text-white">{formatPct(data.turnout, lang, 1)}</strong>
            </span>
            {dockedMobileSheet && onCloseSheet && (
              <button
                type="button"
                onClick={onCloseSheet}
                className="p-1 border border-slate-700 text-slate-300 hover:bg-white hover:text-[#090A0F]"
                aria-label={lang === 'tr' ? 'Kapat' : 'Close'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
          <span>{data.subtitle}</span>
          <span className="font-mono text-slate-400 shrink-0 whitespace-nowrap">
            {formatInt(data.validVotes, lang)} {lang === 'tr' ? 'oy' : 'votes'}
          </span>
        </div>
        {data.localFlipped && data.localPrevWinnerShort && data.localWinnerShort && (
          <div className="pt-1 flex items-center gap-1.5 text-[10px] font-mono">
            <span className="px-1.5 py-0.5 bg-amber-400 text-[#090A0F] font-bold uppercase">
              {lang === 'tr' ? 'El Değiştirdi' : 'Flipped'}
            </span>
            {data.localRefLabel && (
              <span className="text-slate-400">({data.localRefLabel}):</span>
            )}
            <span className="inline-flex items-center gap-1 font-bold text-slate-200">
              <span
                className="w-2 h-2 inline-block"
                style={{ backgroundColor: data.localPrevWinnerColor || '#94a3b8' }}
              />
              {data.localPrevWinnerShort}
            </span>
            <span className="text-slate-500">→</span>
            <span className="inline-flex items-center gap-1 font-bold text-white">
              <span
                className="w-2 h-2 inline-block"
                style={{ backgroundColor: data.localWinnerColor || '#ffffff' }}
              />
              {data.localWinnerShort}
            </span>
          </div>
        )}
      </div>

      {/* Stacked Horizontal Proportion Bar (All Parties) */}
      <div className="my-2 w-full h-2.5 flex overflow-hidden bg-slate-800">
        {barItems.map((entry) => (
          <div
            key={entry.id}
            style={{
              width: `${Math.max(0.4, entry.share)}%`,
              backgroundColor: entry.color,
            }}
            className="h-full border-r border-[#090A0F]/60 last:border-r-0"
          />
        ))}
        {otherPct > 0.2 && <div style={{ width: `${otherPct}%` }} className="h-full bg-slate-600" />}
      </div>

      {/* Uncluttered Top 4 Tabular Rows with Fixed Aligned Columns */}
      <div className="space-y-1.5">
        {(() => {
          const showSeatsCol = topFour.some((e) => (e.seats ?? 0) > 0);
          const showDeltaCol = topFour.some(
            (e) => e.deltaShare !== undefined && Math.abs(e.deltaShare) >= 0.05
          );
          const gridColsClass =
            showDeltaCol && showSeatsCol
              ? 'grid-cols-[1fr_auto_50px_46px_38px]'
              : showDeltaCol
              ? 'grid-cols-[1fr_auto_50px_46px]'
              : showSeatsCol
              ? 'grid-cols-[1fr_auto_50px_38px]'
              : 'grid-cols-[1fr_auto_50px]';

          return topFour.map((entry) => {
            const hasDelta = entry.deltaShare !== undefined && Math.abs(entry.deltaShare) >= 0.05;
            return (
              <div
                key={entry.id}
                className={`grid ${gridColsClass} items-center gap-1.5 text-[12px]`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="font-bold text-white whitespace-nowrap">{entry.shortName}</span>
                </div>

                <span className="font-mono text-[11px] text-slate-400 text-right tabular-nums whitespace-nowrap">
                  {formatInt(entry.votes, lang)}
                </span>

                <span className="font-mono text-white font-semibold text-right tabular-nums whitespace-nowrap">
                  {formatPct(entry.share, lang, 1)}
                </span>

                {showDeltaCol && (
                  hasDelta ? (
                    <span
                      className={`font-mono text-[10px] text-right tabular-nums whitespace-nowrap ${
                        entry.deltaShare! > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {entry.deltaShare! > 0 ? '+' : ''}
                      {entry.deltaShare!.toFixed(1)}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-slate-600 text-right tabular-nums whitespace-nowrap">
                      0.0
                    </span>
                  )
                )}

                {showSeatsCol && (
                  entry.seats !== undefined && entry.seats > 0 ? (
                    <span
                      className="px-1.5 py-0.5 font-bold text-[10px] w-[38px] text-center font-mono"
                      style={{
                        backgroundColor: entry.color,
                        color: getContrastTextColor(entry.color),
                      }}
                    >
                      {entry.seats} MV
                    </span>
                  ) : (
                    <span className="w-[38px]" />
                  )
                )}
              </div>
            );
          });
        })()}
      </div>

      {dockedMobileSheet && (onEditUnit || onZoomProvince) && (
        <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center gap-2">
          {onEditUnit && (
            <button
              type="button"
              onClick={onEditUnit}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-[#090A0F] text-micro font-bold hover:bg-slate-200"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{lang === 'tr' ? 'Veriyi Düzenle' : 'Edit Unit'}</span>
            </button>
          )}
          {onZoomProvince && (
            <button
              type="button"
              onClick={onZoomProvince}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-white/40 text-white text-micro font-bold hover:bg-white hover:text-[#090A0F]"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>{lang === 'tr' ? 'İlçelere Yakınlaş' : 'Zoom Districts'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
