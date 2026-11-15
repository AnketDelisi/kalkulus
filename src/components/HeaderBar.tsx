import React from 'react';
import {
  Calculator,
  Database,
  Download,
  Globe,
  Lock,
  RotateCcw,
  Settings,
  Sliders,
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { BaselineId, DHondtMode, SwingMode } from '../types/election';

interface HeaderBarProps {
  onOpenRulesModal: () => void;
  onOpenScenarioModal: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onOpenRulesModal,
  onOpenScenarioModal,
}) => {
  const {
    lang,
    baselineId,
    swingMode,
    dhondtMode,
    thresholdPct,
    provinceOverrides,
    districtOverrides,
    ilceOverrides,
    setLanguage,
    setBaselineId,
    setSwingMode,
    setDHondtMode,
    setThresholdPct,
    resetAllLocks,
    resetAllToBaseline,
  } = useElectionStore();

  const t = translations[lang];

  const lockedProvincesCount = Object.values(provinceOverrides).filter((o) => o.isLocked).length;
  const lockedDistrictsCount = Object.values(districtOverrides).filter((o) => o.isLocked).length;
  const lockedIlcesCount = Object.values(ilceOverrides).filter((o) => o.isLocked).length;
  const totalLocks = lockedProvincesCount + lockedDistrictsCount + lockedIlcesCount;

  return (
    <header className="pixel-box border-b-2 border-retro-border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
      {/* Brand Title & 8-Bit Icon */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-500 border-2 border-amber-200 shadow-[2px_2px_0px_#000] flex items-center justify-center text-slate-950">
          <Calculator className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-pixel text-xl tracking-wider text-amber-400 drop-shadow-[2px_2px_0px_#000]">
              {t.appTitle}
            </h1>
            <span className="px-1.5 py-0.5 text-[10px] font-pixel bg-cyan-950 text-cyan-300 border border-cyan-600">
              v1.0 • 8-BIT EDITION
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">
            {t.appSubtitle}
          </p>
        </div>
      </div>

      {/* Electoral Controls Bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Baseline Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border-2 border-slate-700 px-2.5 py-1">
          <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <select
            value={baselineId}
            onChange={(e) => setBaselineId(e.target.value as BaselineId)}
            className="bg-transparent text-slate-100 font-medium focus:outline-none cursor-pointer"
            aria-label="Baseline Selector"
          >
            <option value="2023_general" className="bg-slate-900">
              {t.baseline2023}
            </option>
            <option value="2024_local" className="bg-slate-900">
              {t.baseline2024}
            </option>
            <option value="custom" className="bg-slate-900">
              {t.baselineCustom}
            </option>
          </select>
        </div>

        {/* Swing Mode Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border-2 border-slate-700 px-2.5 py-1">
          <Sliders className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <select
            value={swingMode}
            onChange={(e) => setSwingMode(e.target.value as SwingMode)}
            className="bg-transparent text-slate-100 font-medium focus:outline-none cursor-pointer"
            aria-label="Swing Mode"
          >
            <option value="proportional" className="bg-slate-900">
              {t.swingProportional}
            </option>
            <option value="uniform" className="bg-slate-900">
              {t.swingUniform}
            </option>
          </select>
        </div>

        {/* D'Hondt System Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border-2 border-slate-700 px-2.5 py-1">
          <select
            value={dhondtMode}
            onChange={(e) => setDHondtMode(e.target.value as DHondtMode)}
            className="bg-transparent text-slate-100 font-medium focus:outline-none cursor-pointer"
            aria-label="D'Hondt System"
          >
            <option value="2022_separate" className="bg-slate-900">
              {t.dhondt2022}
            </option>
            <option value="2018_alliance" className="bg-slate-900">
              {t.dhondt2018}
            </option>
          </select>
        </div>

        {/* Threshold (Baraj) Input */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border-2 border-slate-700 px-2.5 py-1">
          <span className="text-slate-400 font-medium">{t.thresholdLabel}:</span>
          <input
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={thresholdPct}
            onChange={(e) => setThresholdPct( parseFloat(e.target.value) || 0 )}
            className="w-12 bg-slate-950 border border-slate-700 px-1 py-0.5 text-center font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-400"
          />
          <span className="text-slate-400 font-mono">%</span>
        </div>

        {/* Locked Units Badge */}
        {totalLocks > 0 && (
          <button
            onClick={resetAllLocks}
            title={t.resetAllLocks}
            className="pixel-btn px-2.5 py-1 border-amber-500/80 bg-amber-950/60 text-amber-300 text-xs"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-bold">{totalLocks}</span>
            <span>{t.lockedCountLabel} (×)</span>
          </button>
        )}

        {/* Alliances, Parties & MP Seat Rules Modal Button */}
        <button
          onClick={onOpenRulesModal}
          className="pixel-btn pixel-btn-cyan px-2.5 py-1.5 text-xs"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{t.rulesAndAlliancesBtn}</span>
        </button>

        {/* Save / Load Scenario Modal Button */}
        <button
          onClick={onOpenScenarioModal}
          className="pixel-btn px-2.5 py-1.5 text-xs"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t.exportImportBtn}</span>
        </button>

        {/* Reset to Baseline */}
        <button
          onClick={resetAllToBaseline}
          className="pixel-btn px-2.5 py-1.5 text-xs text-rose-300 hover:border-rose-500"
          title={t.resetToBaseline}
        >
          <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden xl:inline">{t.resetToBaseline}</span>
        </button>

        {/* Language Toggle */}
        <button
          onClick={() => setLanguage(lang === 'tr' ? 'en' : 'tr')}
          className="pixel-btn px-2 py-1.5 text-xs font-pixel text-amber-300"
          title="Dil / Language"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang.toUpperCase()}</span>
        </button>
      </div>
    </header>
  );
};
