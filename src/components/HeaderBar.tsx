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
    <header className="bg-white border-b-[1.5px] border-[#090A0F] sticky top-0 z-30">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Uploaded Kalkülüs Logo + Architectural Navigation */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 pr-4 border-r border-slate-300">
            <img
              src={`${import.meta.env.BASE_URL}kalkulus-logo.png`}
              alt="Kalkülüs"
              className="h-8 w-auto object-contain select-none"
            />
            <span className="hidden xl:inline-block font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 bg-[#090A0F] text-white font-semibold">
              SEÇİM SİMÜLATÖRÜ
            </span>
          </div>

          {/* Sharp Architectural Tab Switcher */}
          <nav className="flex items-center border-[1.5px] border-[#090A0F] bg-white text-xs font-display font-semibold">
            <button
              onClick={() => onChangeTab('studio')}
              className={`flex items-center gap-2 px-3.5 py-2 border-r border-[#090A0F] transition-colors ${
                activeTab === 'studio'
                  ? 'bg-[#090A0F] text-white'
                  : 'text-[#090A0F] hover:bg-slate-100'
              }`}
            >
              <span className="font-mono text-[10px] opacity-60">01</span>
              <Map className="w-3.5 h-3.5" />
              <span>{lang === 'tr' ? 'HARİTA & PROJEKSİYON' : 'MAP & PROJECTION'}</span>
            </button>

            <button
              onClick={() => onChangeTab('parliament')}
              className={`flex items-center gap-2 px-3.5 py-2 border-r border-[#090A0F] transition-colors ${
                activeTab === 'parliament'
                  ? 'bg-[#090A0F] text-white'
                  : 'text-[#090A0F] hover:bg-slate-100'
              }`}
            >
              <span className="font-mono text-[10px] opacity-60">02</span>
              <Landmark className="w-3.5 h-3.5" />
              <span>{lang === 'tr' ? 'TBMM MECLİS' : 'PARLIAMENT'}</span>
            </button>

            <button
              onClick={() => onChangeTab('tables')}
              className={`flex items-center gap-2 px-3.5 py-2 transition-colors ${
                activeTab === 'tables'
                  ? 'bg-[#090A0F] text-white'
                  : 'text-[#090A0F] hover:bg-slate-100'
              }`}
            >
              <span className="font-mono text-[10px] opacity-60">03</span>
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{lang === 'tr' ? 'VERİ TABLOLARI & KRİTİK MV' : 'TABLES & CLOSEST'}</span>
            </button>
          </nav>
        </div>

        {/* Right: Technical Parameter Controls */}
        <div className="flex items-center gap-2 text-xs">
          {/* Baseline Selector */}
          <select
            value={baselineId}
            onChange={(e) => setBaselineId(e.target.value as BaselineId)}
            className="studio-input border-[#090A0F] px-2.5 py-1.5 text-xs font-mono font-semibold text-[#090A0F] hidden md:block cursor-pointer"
            title="Baz Seçim Verisi"
          >
            <option value="2023_general">BAZ: 14 MAYIS 2023</option>
            <option value="2024_local">BAZ: 31 MART 2024</option>
            <option value="custom">BAZ: ÖZEL VERİ</option>
          </select>

          {/* Swing Mode Selector */}
          <select
            value={swingMode}
            onChange={(e) => setSwingMode(e.target.value as SwingMode)}
            className="studio-input border-[#090A0F] px-2.5 py-1.5 text-xs font-mono font-semibold text-[#090A0F] hidden xl:block cursor-pointer"
            title="Swing Modeli"
          >
            <option value="proportional">ORANSAL SWING (PS)</option>
            <option value="uniform">TEKDÜZE SWING (UNS)</option>
          </select>

          {/* Threshold Box */}
          <div className="hidden lg:flex items-center gap-1 border-[1.5px] border-[#090A0F] bg-white px-2.5 py-1 font-mono">
            <span className="text-slate-500 text-[11px] font-semibold">BARAJ:</span>
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={thresholdPct}
              onChange={(e) => setThresholdPct(parseFloat(e.target.value) || 0)}
              className="w-10 text-right font-bold text-[#090A0F] bg-transparent focus:outline-none"
            />
            <span className="text-slate-500">%</span>
          </div>

          {/* Locked Units Counter */}
          {totalLocks > 0 && (
            <button
              onClick={resetAllLocks}
              title={t.resetAllLocks}
              className="studio-btn px-2.5 py-1.5 bg-amber-400 text-[#090A0F] font-mono text-xs font-bold"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{totalLocks} KİLİT ×</span>
            </button>
          )}

          {/* Rules & Alliances */}
          <button
            onClick={onOpenRulesModal}
            className="studio-btn px-2.5 py-1.5 text-xs"
            title={t.rulesAndAlliancesBtn}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'tr' ? 'KURALLAR & İTTİFAK' : 'RULES'}</span>
          </button>

          {/* Save / Load */}
          <button
            onClick={onOpenScenarioModal}
            className="studio-btn px-2.5 py-1.5 text-xs"
            title={t.exportImportBtn}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'tr' ? 'SENARYO' : 'SCENARIO'}</span>
          </button>

          {/* Reset */}
          <button
            onClick={resetAllToBaseline}
            className="studio-btn px-2.5 py-1.5 text-xs hover:bg-rose-600 hover:border-rose-600 hover:text-white"
            title={t.resetToBaseline}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(lang === 'tr' ? 'en' : 'tr')}
            className="studio-btn px-2 py-1.5 text-xs font-mono font-bold"
            title="Dil / Language"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang.toUpperCase()}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
