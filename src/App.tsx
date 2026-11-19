import React, { Suspense, lazy, useEffect, useState } from 'react';
import { HeaderBar, WorkspaceTab } from './components/HeaderBar';
import { ArchiveBanner } from './components/ArchiveBanner';
import { InputEditorPanel } from './components/InputEditorPanel';
import { MapPanel } from './components/MapPanel';
import { NationalResultsTable, ParliamentHemicycle } from './components/ParliamentHemicycle';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useElectionStore } from './store/useElectionStore';
import { stepPlateCode } from './utils/plateNavigation';

const AllianceAndRulesModal = lazy(() =>
  import('./components/AllianceAndRulesModal').then((m) => ({ default: m.AllianceAndRulesModal }))
);
const ScenarioModal = lazy(() =>
  import('./components/ScenarioModal').then((m) => ({ default: m.ScenarioModal }))
);
const DistrictAndClosestRacesTable = lazy(() =>
  import('./components/DistrictAndClosestRacesTable').then((m) => ({
    default: m.DistrictAndClosestRacesTable,
  }))
);
const PresidentialProvinceRacesTable = lazy(() =>
  import('./components/PresidentialProvinceRacesTable').then((m) => ({
    default: m.PresidentialProvinceRacesTable,
  }))
);
const LocalRacesTable = lazy(() =>
  import('./components/LocalRacesTable').then((m) => ({ default: m.LocalRacesTable }))
);
const PresidentialInputPanel = lazy(() =>
  import('./components/PresidentialInputPanel').then((m) => ({
    default: m.PresidentialInputPanel,
  }))
);
const PresidentialRunoffCard = lazy(() =>
  import('./components/PresidentialRunoffCard').then((m) => ({
    default: m.PresidentialRunoffCard,
  }))
);
const PresidentialResultsTable = lazy(() =>
  import('./components/PresidentialResultsTable').then((m) => ({
    default: m.PresidentialResultsTable,
  }))
);
const LocalMayoralSummaryCard = lazy(() =>
  import('./components/LocalMayoralSummaryCard').then((m) => ({
    default: m.LocalMayoralSummaryCard,
  }))
);
const LocalResultsTable = lazy(() =>
  import('./components/LocalResultsTable').then((m) => ({ default: m.LocalResultsTable }))
);
const InfographicStudio = lazy(() =>
  import('./components/infographic/InfographicStudio').then((m) => ({
    default: m.InfographicStudio,
  }))
);
const HistoricalTrendCard = lazy(() =>
  import('./components/HistoricalTrendCard').then((m) => ({
    default: m.HistoricalTrendCard,
  }))
);

const PanelFallback: React.FC = () => (
  <div className="bg-white border border-[#090A0F] p-6 text-center font-mono text-xs text-slate-500 uppercase tracking-wider">
    Yükleniyor...
  </div>
);

export const App: React.FC = () => {
  const electionMode = useElectionStore((s) => s.electionMode);
  const activeArchiveId = useElectionStore((s) => s.activeArchiveId);
  const baselinesReady = useElectionStore((s) => s.baselinesReady);
  const lang = useElectionStore((s) => s.lang);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('studio');
  const [mobileStudioView, setMobileStudioView] = useState<'map' | 'inputs' | 'summary'>('map');
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);

  useEffect(() => {
    const onFocusMap = () => {
      setActiveTab('studio');
      setMobileStudioView('map');
      requestAnimationFrame(() => {
        const el = document.getElementById('studio-map-panel');
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    };
    window.addEventListener('kalkulus:focus-map', onFocusMap);

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditing =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        Boolean(target?.isContentEditable);

      if (e.key === 'Escape') {
        if (rulesModalOpen) {
          setRulesModalOpen(false);
          return;
        }
        if (scenarioModalOpen) {
          setScenarioModalOpen(false);
          return;
        }
        if (!isEditing) {
          const st = useElectionStore.getState();
          st.setActiveScope({ type: 'national' });
          st.setZoomedProvinceId(null);
        }
        return;
      }

      if (isEditing) return;

      if (e.key === '/') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('kalkulus:open-jump-search'));
        return;
      }

      if ((e.key === '[' || e.key === ']') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const st = useElectionStore.getState();
        if (st.activeArchiveId) {
          e.preventDefault();
          void st.stepArchiveElection(e.key === ']' ? 1 : -1);
          return;
        }
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        const st = useElectionStore.getState();
        if (st.zoomedProvinceId) {
          e.preventDefault();
          const delta: 1 | -1 = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
          const maxPlate = Object.keys(st.projection.provinceResults).length || 81;
          const nextIlId = stepPlateCode(st.zoomedProvinceId, delta, maxPlate);
          st.setZoomedProvinceId(nextIlId);
          st.setActiveScope({ type: 'province', ilId: nextIlId });
        }
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('kalkulus:open-jump-search'));
      } else if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useElectionStore.getState().undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        useElectionStore.getState().redo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('kalkulus:focus-map', onFocusMap);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [rulesModalOpen, scenarioModalOpen]);

  useEffect(() => {
    document.documentElement.lang = lang;
    const modeTitle =
      lang === 'tr'
        ? electionMode === 'presidential'
          ? 'Cumhurbaşkanlığı Seçim Simülatörü'
          : electionMode === 'local'
          ? 'Yerel Seçim Simülatörü'
          : 'Genel Seçim & D’Hondt Simülatörü'
        : electionMode === 'presidential'
        ? 'Presidential Election Simulator'
        : electionMode === 'local'
        ? 'Local Election Simulator'
        : 'Parliamentary & D’Hondt Simulator';

    const suffix = activeTab === 'infographic' ? (lang === 'tr' ? ' · İnfografik' : ' · Infographic') : '';
    document.title = `KALKÜLÜS — ${modeTitle}${suffix}`;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        lang === 'tr'
          ? "Türkiye için interaktif seçim simülatörü: 81 il, 87 seçim çevresi, 973 ilçe ve yurt dışı oylarıyla D'Hondt milletvekili dağılımı, Cumhurbaşkanlığı 2. tur ve yerel seçim projeksiyonu."
          : "Interactive Turkey election simulator: 81 provinces, 87 electoral districts, 973 ilçeler and abroad votes with D'Hondt seat allocation, Presidential runoff and local election projections."
      );
    }
  }, [lang, electionMode, activeTab]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F5F7] text-[#090A0F]">
      {/* High-Contrast Monochrome & Neon Signal Studio Header */}
      <HeaderBar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenRulesModal={() => setRulesModalOpen(true)}
        onOpenScenarioModal={() => setScenarioModalOpen(true)}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto px-2.5 sm:px-6 py-3 sm:py-5">
        <ErrorBoundary>
          {!baselinesReady ? (
            <div className="bg-white border-2 border-[#090A0F] p-12 text-center font-mono text-xs uppercase tracking-widest text-slate-600">
              {lang === 'tr'
                ? '973 ilçe seçim verisi hazırlanıyor...'
                : 'Loading 973-district election baselines...'}
            </div>
          ) : (
            <>
              <ArchiveBanner />
              {activeTab === 'studio' && (
                <>
                  {/* Mobile (< lg) Above-the-Fold Quick Switcher: Map first! */}
                  <div className="lg:hidden mb-3 grid grid-cols-3 border-[1.5px] border-[#090A0F] bg-white text-micro font-bold sticky top-[88px] z-20 shadow-[2px_2px_0px_rgba(9,10,15,0.12)]">
                    {(
                      [
                        ['map', lang === 'tr' ? 'Harita' : 'Map'],
                        ['inputs', lang === 'tr' ? 'Veri Girişi' : 'Inputs'],
                        [
                          'summary',
                          electionMode === 'parliamentary'
                            ? lang === 'tr'
                              ? 'Meclis & Tablo'
                              : 'Parliament'
                            : lang === 'tr'
                            ? 'Özet & Tablo'
                            : 'Summary',
                        ],
                      ] as const
                    ).map(([k, lbl], idx) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setMobileStudioView(k)}
                        className={`py-2 px-2 text-center transition-colors ${
                          idx > 0 ? 'border-l border-[#090A0F]' : ''
                        } ${
                          mobileStudioView === k
                            ? 'bg-[#090A0F] text-white'
                            : 'text-[#090A0F] hover:bg-slate-100'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
                    {/* Left Sidebar (4 cols on desktop): Mode Input + Mode Summary Card */}
                    <div
                      className={`lg:col-span-4 flex flex-col gap-5 ${
                        mobileStudioView === 'map' ? 'hidden lg:flex' : 'flex'
                      }`}
                    >
                      <div className={mobileStudioView === 'inputs' ? 'block' : 'hidden lg:block'}>
                        {electionMode === 'presidential' ? (
                          <Suspense fallback={<PanelFallback />}>
                            <PresidentialInputPanel />
                          </Suspense>
                        ) : (
                          <InputEditorPanel />
                        )}
                      </div>
                      <div className={mobileStudioView === 'summary' ? 'block' : 'hidden lg:block'}>
                        {electionMode === 'presidential' ? (
                          <Suspense fallback={<PanelFallback />}>
                            <PresidentialRunoffCard />
                          </Suspense>
                        ) : electionMode === 'local' ? (
                          <Suspense fallback={<PanelFallback />}>
                            <LocalMayoralSummaryCard />
                          </Suspense>
                        ) : (
                          <ParliamentHemicycle />
                        )}
                      </div>
                    </div>

                    {/* Right Main Stage (8 cols on desktop): Map + Mode Results Table */}
                    <div
                      className={`lg:col-span-8 flex flex-col gap-5 ${
                        mobileStudioView === 'inputs' ? 'hidden lg:flex' : 'flex'
                      }`}
                    >
                      <div id="studio-map-panel" className={mobileStudioView === 'map' ? 'block' : 'hidden lg:block'}>
                        <MapPanel onEditUnitMobile={() => setMobileStudioView('inputs')} />
                      </div>
                      <div className={mobileStudioView === 'summary' ? 'block' : 'hidden lg:block'}>
                        {electionMode === 'presidential' ? (
                          <Suspense fallback={<PanelFallback />}>
                            <PresidentialResultsTable />
                          </Suspense>
                        ) : electionMode === 'local' ? (
                          <Suspense fallback={<PanelFallback />}>
                            <LocalResultsTable />
                          </Suspense>
                        ) : (
                          <NationalResultsTable />
                        )}
                      </div>
                      {activeArchiveId && (
                        <div className={mobileStudioView === 'summary' ? 'block' : 'hidden lg:block'}>
                          <Suspense fallback={<PanelFallback />}>
                            <HistoricalTrendCard />
                          </Suspense>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'tables' && (
                <Suspense fallback={<PanelFallback />}>
                  {electionMode === 'presidential' ? (
                    <PresidentialProvinceRacesTable onSelectAndGoToMap={() => setActiveTab('studio')} />
                  ) : electionMode === 'local' ? (
                    <LocalRacesTable onSelectAndGoToMap={() => setActiveTab('studio')} />
                  ) : (
                    <DistrictAndClosestRacesTable onSelectAndGoToMap={() => setActiveTab('studio')} />
                  )}
                </Suspense>
              )}

              {activeTab === 'infographic' && (
                <Suspense fallback={<PanelFallback />}>
                  <InfographicStudio />
                </Suspense>
              )}
            </>
          )}
        </ErrorBoundary>
      </main>

      {/* Modals */}
      {rulesModalOpen && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <AllianceAndRulesModal
              isOpen={rulesModalOpen}
              onClose={() => setRulesModalOpen(false)}
            />
          </Suspense>
        </ErrorBoundary>
      )}
      {scenarioModalOpen && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <ScenarioModal
              isOpen={scenarioModalOpen}
              onClose={() => setScenarioModalOpen(false)}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
};

export default App;
