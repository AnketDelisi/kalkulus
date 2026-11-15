import React from 'react';
import {
  BarChart3,
  Download,
  Globe,
  Landmark,
  Lock,
  Map,
  RotateCcw,
  Settings2,
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { BaselineId, DHondtMode, SwingMode } from '../types/election';

export type WorkspaceTab = 'studio' | 'parliament' | 'tables';

interface HeaderBarProps {
  activeTab: WorkspaceTab;
  onChangeTab: (tab: WorkspaceTab) => void;
  onOpenRulesModal: () => void;
  onOpenScenarioModal: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeTab,
  onChangeTab,
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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & View Switcher */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight">
              K
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 leading-none">
                {t.appTitle}
              </h1>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 hidden sm:block">
                Seçim Simülatörü
              </p>
            </div>
          </div>

          {/* Primary Workspace Navigation Pills */}
          <nav className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs font-semibold">
            <button
              onClick={() => onChangeTab('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'studio'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>{lang === 'tr' ? 'Harita & Projeksiyon' : 'Map & Projection'}</span>
            </button>

            <button
              onClick={() => onChangeTab('parliament')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'parliament'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>{lang === 'tr' ? 'TBMM Meclis & İttifaklar' : 'TBMM Parliament'}</span>
            </button>

            <button
              onClick={() => onChangeTab('tables')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'tables'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{lang === 'tr' ? 'Detaylı Tablolar & Kritik MV' : 'Tables & Closest Races'}</span>
            </button>
          </nav>
        </div>

        {/* Right: Clean Compact Parameters & Actions */}
        <div className="flex items-center gap-2 text-xs">
          {/* Baseline Selector */}
          <select
            value={baselineId}
            onChange={(e) => setBaselineId(e.target.value as BaselineId)}
            className="editorial-input px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50/70 hidden md:block cursor-pointer"
            title="Baz Seçim Verisi"
          >
            <option value="2023_general">{t.baseline2023}</option>
            <option value="2024_local">{t.baseline2024}</option>
            <option value="custom">{t.baselineCustom}</option>
          </select>

          {/* Swing Mode Selector */}
          <select
            value={swingMode}
            onChange={(e) => setSwingMode(e.target.value as SwingMode)}
            className="editorial-input px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50/70 hidden xl:block cursor-pointer"
            title="Swing Modeli"
          >
            <option value="proportional">{t.swingProportional}</option>
            <option value="uniform">{t.swingUniform}</option>
          </select>

          {/* D'Hondt Selector */}
          <select
            value={dhondtMode}
            onChange={(e) => setDHondtMode(e.target.value as DHondtMode)}
            className="editorial-input px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50/70 hidden 2xl:block cursor-pointer"
            title="D'Hondt Sistemi"
          >
            <option value="2022_separate">{t.dhondt2022}</option>
            <option value="2018_alliance">{t.dhondt2018}</option>
          </select>

          {/* Threshold Pill */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <span className="text-slate-500 font-medium">{t.thresholdLabel}:</span>
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={thresholdPct}
              onChange={(e) => setThresholdPct(parseFloat(e.target.value) || 0)}
              className="w-11 text-right font-mono font-semibold text-slate-900 bg-transparent focus:outline-none"
            />
            <span className="text-slate-500 font-mono">%</span>
          </div>

          {/* Locked Units Counter */}
          {totalLocks > 0 && (
            <button
              onClick={resetAllLocks}
              title={t.resetAllLocks}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-medium hover:bg-amber-100 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-mono font-semibold">{totalLocks}</span>
              <span className="hidden sm:inline">{t.lockedCountLabel}</span>
              <span className="text-amber-500">×</span>
            </button>
          )}

          {/* Settings / Alliances & Rules */}
          <button
            onClick={onOpenRulesModal}
            className="editorial-btn px-2.5 py-1.5 text-xs"
            title={t.rulesAndAlliancesBtn}
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">{lang === 'tr' ? 'Ayarlar & İttifak' : 'Rules & Alliances'}</span>
          </button>

          {/* Save / Load */}
          <button
            onClick={onOpenScenarioModal}
            className="editorial-btn px-2.5 py-1.5 text-xs"
            title={t.exportImportBtn}
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">{lang === 'tr' ? 'Kaydet / Yükle' : 'Save / Load'}</span>
          </button>

          {/* Reset */}
          <button
            onClick={resetAllToBaseline}
            className="editorial-btn px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 hover:border-rose-200"
            title={t.resetToBaseline}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{t.resetToBaseline}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(lang === 'tr' ? 'en' : 'tr')}
            className="editorial-btn px-2 py-1.5 text-xs font-mono font-semibold text-slate-700"
            title="Dil / Language"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{lang.toUpperCase()}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
