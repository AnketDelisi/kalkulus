import React, { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Users } from 'lucide-react';
import type { Language } from '../types/election';

export interface MobilizationEntityItem {
  id: string;
  shortName: string;
  label: string;
  color: string;
}

interface TurnoutMobilizationDrawerProps {
  lang: Language;
  titleTr?: string;
  titleEn?: string;
  scopeLabel?: string | null;
  items: MobilizationEntityItem[];
  multipliers: Record<string, number>;
  fallbackMultipliers?: Record<string, number>;
  onChange: (id: string, factor: number) => void;
  onReset: () => void;
}

export const TurnoutMobilizationDrawer: React.FC<TurnoutMobilizationDrawerProps> = ({
  lang,
  titleTr = 'Parti bazlı katılım (Mobilizasyon)',
  titleEn = 'Party base turnout (Mobilization)',
  scopeLabel,
  items,
  multipliers,
  fallbackMultipliers,
  onChange,
  onReset,
}) => {
  const [open, setOpen] = useState(false);

  const modifiedCount = items.filter((it) => {
    const val = multipliers[it.id];
    const base = fallbackMultipliers?.[it.id] ?? 1.0;
    return val !== undefined && Math.abs(val - (scopeLabel ? base : 1.0)) > 0.001;
  }).length;

  return (
    <div className="border border-[#090A0F] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-micro font-bold text-[#090A0F] min-w-0">
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {scopeLabel ? `${scopeLabel} · ` : ''}
            {lang === 'tr' ? titleTr : titleEn}
          </span>
          {modifiedCount > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-400 text-[#090A0F] font-mono text-[10px] shrink-0">
              {modifiedCount}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-600 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-600 shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-[#090A0F]/20 p-2.5 bg-slate-50 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              {lang === 'tr'
                ? 'Katılım çarpanı (0.50 – 1.50, baz = 1.00)'
                : 'Turnout multiplier (0.50 – 1.50, base = 1.00)'}
            </span>
            {modifiedCount > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold border border-[#090A0F] bg-white hover:bg-[#090A0F] hover:text-white transition-colors shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>
                  {scopeLabel
                    ? lang === 'tr'
                      ? 'İl Sıfırla'
                      : 'Reset Prov'
                    : lang === 'tr'
                    ? '1.00× Sıfırla'
                    : 'Reset 1.00×'}
                </span>
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {items.map((item) => {
              const fallback = fallbackMultipliers?.[item.id] ?? 1.0;
              const rawVal = multipliers[item.id] ?? fallback;
              const val = Number(rawVal.toFixed(2));
              const isModified = Math.abs(val - (scopeLabel ? fallback : 1.0)) > 0.001;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 bg-white border border-slate-200 px-2 py-1"
                >
                  <span
                    className="w-2.5 h-2.5 shrink-0 border border-[#090A0F]/40"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-micro font-bold text-[#090A0F] w-14 truncate">
                    {item.shortName}
                  </span>
                  <input
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.01}
                    value={val}
                    onChange={(e) => onChange(item.id, Number(e.target.value))}
                    className="flex-1 h-1.5 accent-[#090A0F] cursor-pointer"
                    aria-label={`${item.label} turnout multiplier`}
                  />
                  <input
                    type="number"
                    min={0.5}
                    max={1.5}
                    step={0.01}
                    value={val}
                    onChange={(e) => onChange(item.id, Number(e.target.value))}
                    className={`w-14 text-right font-mono text-micro font-bold border px-1 py-0.5 ${
                      isModified
                        ? 'border-amber-500 bg-amber-50 text-[#090A0F]'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  />
                  <span className="text-[11px] font-mono text-slate-500">×</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
