import React, { useEffect } from 'react';
import {
  BarChart3,
  Download,
  Globe,
  History,
  Image as ImageIcon,
  Lock,
  Map,
  Redo2,
  RotateCcw,
  Settings2,
  Undo2,
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { ElectionMode } from '../types/election';

export type WorkspaceTab = 'studio' | 'tables' | 'infographic';

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
    electionMode,
    provinceOverrides,
    districtOverrides,
    ilceOverrides,
    abroadCountryOverrides,
    presProvinceOverrides,
    presIlceOverrides,
    presAbroadCountryOverrides,
    localProvinceOverrides,
    localIlceOverrides,
    canUndo,
    canRedo,
    activeArchiveId,
    undo,
    redo,
    setLanguage,
    setElectionMode,
    enterArchiveElection,
    exitArchiveMode,
    resetAllLocks,
    resetAllToBaseline,
  } = useElectionStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isInput) return;

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (useElectionStore.getState().canUndo) {
          e.preventDefault();
          useElectionStore.getState().undo();
        }
      } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
        if (useElectionStore.getState().canRedo) {
          e.preventDefault();
          useElectionStore.getState().redo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const t = translations[lang];

  const totalLocks =
    electionMode === 'presidential'
      ? Object.values(presProvinceOverrides).filter((o) => o.isLocked).length +
        Object.values(presIlceOverrides).filter((o) => o.isLocked).length +
        Object.values(presAbroadCountryOverrides).filter((o) => o.isLocked).length
      : electionMode === 'local'
      ? Object.values(localProvinceOverrides).filter((o) => o.isLocked).length +
        Object.values(localIlceOverrides).filter((o) => o.isLocked).length
      : Object.values(provinceOverrides).filter((o) => o.isLocked).length +
        Object.values(districtOverrides).filter((o) => o.isLocked).length +
        Object.values(ilceOverrides).filter((o) => o.isLocked).length +
        Object.values(abroadCountryOverrides).filter((o) => o.isLocked).length;

  const modeOptions: { id: ElectionMode; labelTr: string; shortTr: string; labelEn: string; shortEn: string }[] = [
    { id: 'parliamentary', labelTr: 'Genel', shortTr: 'Genel', labelEn: 'Parliament', shortEn: 'Parl' },
    { id: 'presidential', labelTr: 'Cumhurbaşkanı', shortTr: 'CB', labelEn: 'Presidential', shortEn: 'Pres' },
    { id: 'local', labelTr: 'Yerel', shortTr: 'Yerel', labelEn: 'Local', shortEn: 'Local' },
  ];

  const tablesTabLabel = lang === 'tr' ? 'Tablolar' : 'Tables';

  return (
    <header className="bg-white border-b-[1.5px] border-[#090A0F] sticky top-0 z-30">
      <div className="max-w-[1720px] mx-auto px-2.5 sm:px-5 py-1.5 flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 md:gap-2">
        {/* Top Row (Mobile: Row 1; Desktop: Left + Right combined cleanly) */}
        <div className="flex items-center justify-between gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}kalkulus-logo.png`}
              alt="Kalkülüs"
              className="h-6 sm:h-7 w-auto object-contain select-none shrink-0"
            />

            <div
              className="flex items-center border-[1.5px] border-[#090A0F] bg-white text-micro font-semibold"
              role="tablist"
              aria-label={lang === 'tr' ? 'Seçim türü' : 'Election mode'}
            >
              {modeOptions.map((opt, idx) => (
                <button
                  key={opt.id}
                  onClick={() => setElectionMode(opt.id)}
                  className={`px-2 py-1 whitespace-nowrap transition-colors min-h-[30px] sm:min-h-0 ${
                    idx < modeOptions.length - 1 ? 'border-r border-[#090A0F]' : ''
                  } ${
                    electionMode === opt.id
                      ? 'bg-[#090A0F] text-white'
                      : 'text-[#090A0F] hover:bg-slate-100'
                  }`}
                >
                  <span className="sm:hidden">{lang === 'tr' ? opt.shortTr : opt.shortEn}</span>
                  <span className="hidden sm:inline">{lang === 'tr' ? opt.labelTr : opt.labelEn}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile compact action icons on Row 1 right */}
          <div className="flex md:hidden items-center gap-1 shrink-0">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="studio-btn p-1.5 disabled:opacity-35"
              title={lang === 'tr' ? 'Geri al (Ctrl+Z)' : 'Undo'}
              aria-label="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="studio-btn p-1.5 disabled:opacity-35"
              title={lang === 'tr' ? 'Yinele (Ctrl+Y)' : 'Redo'}
              aria-label="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            {electionMode !== 'presidential' && (
              <button
                onClick={onOpenRulesModal}
                className="studio-btn p-1.5"
                title={t.rulesAndAlliancesBtn}
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onOpenScenarioModal}
              className="studio-btn p-1.5"
              title={t.exportImportBtn}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetAllToBaseline}
              className="studio-btn p-1.5 hover:bg-rose-600 hover:border-rose-600 hover:text-white"
              title={t.resetToBaseline}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLanguage(lang === 'tr' ? 'en' : 'tr')}
              className="studio-btn px-1.5 py-1 text-[11px] font-mono font-bold"
              title="Dil / Language"
            >
              {lang.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Center / Mobile Row 2: Workspace Tabs */}
        <nav className="grid grid-cols-4 md:flex items-center border-[1.5px] border-[#090A0F] bg-white text-micro sm:text-body font-medium w-full md:w-auto shrink-0">
          <button
            onClick={() => {
              if (activeArchiveId) exitArchiveMode();
              onChangeTab('studio');
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 md:py-1 border-r border-[#090A0F] whitespace-nowrap transition-colors ${
              activeTab === 'studio' && !activeArchiveId
                ? 'bg-[#090A0F] text-white'
                : 'text-[#090A0F] hover:bg-slate-100'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>{lang === 'tr' ? 'Harita' : 'Map'}</span>
          </button>

          <button
            onClick={() => onChangeTab('tables')}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 md:py-1 border-r border-[#090A0F] whitespace-nowrap transition-colors ${
              activeTab === 'tables'
                ? 'bg-[#090A0F] text-white'
                : 'text-[#090A0F] hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{tablesTabLabel}</span>
          </button>

          <button
            onClick={() => onChangeTab('infographic')}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 md:py-1 border-r border-[#090A0F] whitespace-nowrap transition-colors ${
              activeTab === 'infographic'
                ? 'bg-[#090A0F] text-white'
                : 'text-[#090A0F] hover:bg-slate-100'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{lang === 'tr' ? 'İnfografik' : 'Infographic'}</span>
          </button>

          <button
            onClick={() => {
              onChangeTab('studio');
              if (!activeArchiveId) {
                void enterArchiveElection('2023_general');
              }
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 md:py-1 whitespace-nowrap transition-colors ${
              activeArchiveId && activeTab === 'studio'
                ? 'bg-[#090A0F] text-white font-semibold'
                : activeArchiveId
                ? 'bg-slate-100 text-[#090A0F] font-bold'
                : 'text-[#090A0F] hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{lang === 'tr' ? 'Arşiv' : 'Archive'}</span>
            {activeArchiveId && activeTab !== 'studio' && (
              <span className="w-1.5 h-1.5 bg-[#090A0F] inline-block" />
            )}
          </button>
        </nav>

        {/* Desktop Right: Undo/Redo + Action Controls */}
        <div className="hidden md:flex items-center gap-1.5 text-micro sm:text-body shrink-0">
          <div className="inline-flex border-[1.5px] border-[#090A0F] bg-white">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="px-2 py-1 border-r border-[#090A0F] hover:bg-[#090A0F] hover:text-white text-[#090A0F] transition-colors disabled:opacity-35 disabled:pointer-events-none"
              title={lang === 'tr' ? 'Geri al (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
              aria-label="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="px-2 py-1 hover:bg-[#090A0F] hover:text-white text-[#090A0F] transition-colors disabled:opacity-35 disabled:pointer-events-none"
              title={lang === 'tr' ? 'Yinele (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
              aria-label="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {totalLocks > 0 && (
            <button
              onClick={resetAllLocks}
              title={t.resetAllLocks}
              className="studio-btn px-2 py-1 bg-amber-400 text-[#090A0F] text-micro font-bold whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="font-mono">{totalLocks}</span>
              <span className="hidden lg:inline">{lang === 'tr' ? 'kilit ×' : 'locks ×'}</span>
            </button>
          )}

          {electionMode !== 'presidential' && (
            <button
              onClick={onOpenRulesModal}
              className="studio-btn px-2 py-1 text-micro sm:text-body whitespace-nowrap"
              title={t.rulesAndAlliancesBtn}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">
                {electionMode === 'local'
                  ? lang === 'tr'
                    ? 'İttifak'
                    : 'Alliances'
                  : lang === 'tr'
                  ? 'Kurallar'
                  : 'Rules'}
              </span>
            </button>
          )}

          <button
            onClick={onOpenScenarioModal}
            className="studio-btn px-2 py-1 text-micro sm:text-body whitespace-nowrap"
            title={t.exportImportBtn}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{lang === 'tr' ? 'Senaryo' : 'Scenario'}</span>
          </button>

          <button
            onClick={resetAllToBaseline}
            className="studio-btn px-2 py-1 text-micro sm:text-body hover:bg-rose-600 hover:border-rose-600 hover:text-white whitespace-nowrap"
            title={t.resetToBaseline}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{lang === 'tr' ? 'Sıfırla' : 'Reset'}</span>
          </button>

          <button
            onClick={() => setLanguage(lang === 'tr' ? 'en' : 'tr')}
            className="studio-btn px-2 py-1 text-micro font-mono font-bold whitespace-nowrap"
            title="Dil / Language"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {/* Mobile Lock Clear Banner when locks exist */}
      {totalLocks > 0 && (
        <div className="md:hidden px-2.5 py-1 bg-amber-300 border-t border-[#090A0F] flex items-center justify-between text-micro font-bold text-[#090A0F]">
          <span className="flex items-center gap-1 font-mono">
            <Lock className="w-3 h-3" />
            {totalLocks} {lang === 'tr' ? 'kilitli birim aktif' : 'locked units'}
          </span>
          <button onClick={resetAllLocks} className="underline">
            {t.resetAllLocks}
          </button>
        </div>
      )}
    </header>
  );
};
