import React, { useState } from 'react';
import { AllianceAndRulesModal } from './components/AllianceAndRulesModal';
import { DistrictAndClosestRacesTable } from './components/DistrictAndClosestRacesTable';
import { HeaderBar } from './components/HeaderBar';
import { InputEditorPanel } from './components/InputEditorPanel';
import { MapPanel } from './components/MapPanel';
import { ParliamentHemicycle } from './components/ParliamentHemicycle';
import { ScenarioModal } from './components/ScenarioModal';
import { useElectionStore } from './store/useElectionStore';

export const App: React.FC = () => {
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);

  const { projection, parties } = useElectionStore();

  return (
    <div className="min-h-screen flex flex-col bg-retro-bg text-retro-text">
      {/* Top 8-Bit Header & Control Bar */}
      <HeaderBar
        onOpenRulesModal={() => setRulesModalOpen(true)}
        onOpenScenarioModal={() => setScenarioModalOpen(true)}
      />

      {/* Quick National Summary Ribbon */}
      <div className="bg-slate-950 border-b-2 border-slate-800 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-amber-400 font-pixel text-[10px]">CANLI ÖZET:</span>
          {parties
            .filter((p) => !p.isOther)
            .slice(0, 7)
            .map((p) => {
              const share = projection.nationalPartyShares[p.id] || 0;
              const seats = projection.partyTotalSeats[p.id] || 0;
              return (
                <div key={p.id} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 border border-black"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="font-bold text-slate-200">{p.shortName}</span>
                  <span className="text-slate-400">%{share.toFixed(1)}</span>
                  <span className="text-amber-300 font-bold">({seats})</span>
                </div>
              );
            })}
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>
            Toplam Seçmen:{' '}
            <strong className="text-slate-200">
              {projection.totalRegisteredVoters.toLocaleString('tr-TR')}
            </strong>
          </span>
          <span>
            Geçerli Oy:{' '}
            <strong className="text-emerald-400">
              {projection.totalValidVotes.toLocaleString('tr-TR')}
            </strong>
          </span>
          <span>
            Genel Katılım:{' '}
            <strong className="text-amber-300">%{projection.totalTurnout.toFixed(1)}</strong>
          </span>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <main className="flex-1 p-3 max-w-[1920px] w-full mx-auto flex flex-col gap-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          {/* Left Column (4 cols): Multi-Layer Input & Turnout Editor */}
          <div className="lg:col-span-4">
            <InputEditorPanel />
          </div>

          {/* Center/Right Column (8 cols): Interactive Map + TBMM 600-Seat Hemicycle */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            <MapPanel />
            <ParliamentHemicycle />
          </div>
        </div>

        {/* Bottom Analytical Table: 87 Districts, Closest Seat Flip Analyzer & 973 İlçeler */}
        <DistrictAndClosestRacesTable />
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
