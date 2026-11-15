import React, { useState } from 'react';
import { AllianceAndRulesModal } from './components/AllianceAndRulesModal';
import { DistrictAndClosestRacesTable } from './components/DistrictAndClosestRacesTable';
import { HeaderBar, WorkspaceTab } from './components/HeaderBar';
import { InputEditorPanel } from './components/InputEditorPanel';
import { MapPanel } from './components/MapPanel';
import { NationalResultsTable, ParliamentHemicycle } from './components/ParliamentHemicycle';
import { ScenarioModal } from './components/ScenarioModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('studio');
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);

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
      <main className="flex-1 max-w-[1680px] w-full mx-auto px-4 sm:px-6 py-5">
        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Sidebar (4 cols): Vote Input + Parliament Diagram */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              <InputEditorPanel />
              <ParliamentHemicycle />
            </div>

            {/* Right Main Stage (8 cols): Real GeoJSON Map + National Vote Share Table */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              <MapPanel />
              <NationalResultsTable />
            </div>
          </div>
        )}

        {activeTab === 'tables' && (
          <DistrictAndClosestRacesTable
            onSelectAndGoToMap={() => setActiveTab('studio')}
          />
        )}
      </main>

      {/* Modals */}
      <AllianceAndRulesModal
        isOpen={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
      />
      <ScenarioModal
        isOpen={scenarioModalOpen}
        onClose={() => setScenarioModalOpen(false)}
      />
    </div>
  );
};

export default App;
