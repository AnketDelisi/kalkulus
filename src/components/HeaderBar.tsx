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
    provinceOverrides,
    districtOverrides,
    ilceOverrides,
    setLanguage,
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
        {/* Left: Kalkülüs Logo */}
        <div className="flex items-center shrink-0">
          <img
            src={`${import.meta.env.BASE_URL}kalkulus-logo.png`}
            alt="Kalkülüs"
            className="h-8 w-auto object-contain select-none"
          />
        </div>

        {/* Center: Sharp Architectural Workspace Tabs */}
        <nav className="flex items-center border-[1.5px] border-[#090A0F] bg-white text-xs font-display font-semibold overflow-x-auto">
          <button
            onClick={() => onChangeTab('studio')}
            className={`flex items-center gap-2 px-3.5 py-2 border-r border-[#090A0F] whitespace-nowrap transition-colors ${
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
            className={`flex items-center gap-2 px-3.5 py-2 border-r border-[#090A0F] whitespace-nowrap transition-colors ${
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
            className={`flex items-center gap-2 px-3.5 py-2 whitespace-nowrap transition-colors ${
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

        {/* Right: Compact Action Controls */}
        <div className="flex items-center gap-2 text-xs shrink-0">
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
            <span className="hidden lg:inline">{lang === 'tr' ? 'SIFIRLA' : 'RESET'}</span>
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
