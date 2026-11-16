import React from 'react';
import { Globe, RotateCcw, SlidersHorizontal, TrendingUp, Users, X } from 'lucide-react';
import { useElectionStore } from '../store/useElectionStore';

interface PresidentialR2DynamicsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PresidentialR2DynamicsModal: React.FC<PresidentialR2DynamicsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    lang,
    presCandidates,
    presR2Dynamics,
    presidentialProjection,
    setPresR2Dynamics,
    setPresFinalistR2Dynamic,
    resetPresR2Dynamics,
  } = useElectionStore();

  if (!isOpen) return null;

  const [firstId, secondId] = presidentialProjection.topTwoCandidateIds;
  const candById: Record<string, (typeof presCandidates)[0]> = {};
  for (const c of presCandidates) candById[c.id] = c;

  const finalists = [candById[firstId], candById[secondId]].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-[#090A0F]/70 flex items-center justify-center p-4">
      <div className="studio-panel w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#090A0F] text-white">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-4 h-4 text-[#00F5D4]" />
            <h2 className="text-title font-bold">
              {lang === 'tr' ? '2. Tur Dinamikleri ve Mobilizasyon' : 'Round 2 Dynamics & Mobilization'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-white/25 hover:bg-white hover:text-[#090A0F] transition-colors"
            title={lang === 'tr' ? 'Kapat' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-body bg-white">
          <p className="text-slate-600 text-micro leading-relaxed">
            {lang === 'tr'
              ? '1. Tur coğrafyası parti dağılımına sadık kalırken, 2. Tur sonuçlarını finalist seçmen sadakati, sandığa yeni seçmen çekme gücü, ilçe eğilim çarpanı ve yurt dışı katılımıyla modelleyin.'
              : 'Keep Round 1 geography purely party-derived while modeling Round 2 finalist voter retention, non-voter mobilization, local transfer tilt, and R2 abroad turnout.'}
          </p>

          {/* 1. Finalist Retention & Mobilization */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-[#090A0F]">
              <Users className="w-4 h-4 text-[#090A0F]" />
              <span>
                {lang === 'tr'
                  ? 'Finalist Katılım Koruması ve Yeni Seçmen Mobilizasyonu'
                  : 'Finalist Voter Retention & Non-Voter Mobilization'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {finalists.map((cand) => {
                const dyn = presR2Dynamics.finalistDynamics[cand.id] || {
                  retentionPct: 100,
                  mobilizationPct: 0,
                };
                return (
                  <div
                    key={cand.id}
                    className="p-3.5 bg-[#F4F5F7] border border-[#090A0F] space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 shrink-0 border border-[#090A0F]"
                        style={{ backgroundColor: cand.color }}
                      />
                      <span className="font-bold text-[#090A0F] truncate">{cand.shortName}</span>
                    </div>

                    {/* Retention slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-micro">
                        <span className="text-slate-600">
                          {lang === 'tr' ? '1. Tur seçmeni koruması' : 'R1 vote retention'}
                        </span>
                        <span className="font-mono font-bold text-[#090A0F] tabular-nums">
                          {lang === 'tr' ? `%${dyn.retentionPct}` : `${dyn.retentionPct}%`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={75}
                        max={105}
                        step={1}
                        value={dyn.retentionPct}
                        onChange={(e) =>
                          setPresFinalistR2Dynamic(cand.id, {
                            retentionPct: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-[#090A0F]"
                      />
                    </div>

                    {/* Non-voter mobilization slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-micro">
                        <span className="text-slate-600">
                          {lang === 'tr' ? '1. Turda gitmeyenlerden çekiş' : 'Non-voter mobilization'}
                        </span>
                        <span className="font-mono font-bold text-emerald-700 tabular-nums">
                          +{dyn.mobilizationPct.toFixed(1)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={15}
                        step={0.5}
                        value={dyn.mobilizationPct}
                        onChange={(e) =>
                          setPresFinalistR2Dynamic(cand.id, {
                            mobilizationPct: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-[#090A0F]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Geographic Transfer Tilt */}
          <div className="p-3.5 bg-[#F4F5F7] border border-[#090A0F] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-[#090A0F]">
                <TrendingUp className="w-4 h-4 text-[#090A0F]" />
                <span>
                  {lang === 'tr'
                    ? 'Yerel Eğilim Çarpanı (Coğrafi Geçiş Eğimi)'
                    : 'Geographic Transfer Tilt'}
                </span>
              </div>
              <span className="font-mono font-bold text-[#090A0F] tabular-nums">
                {lang === 'tr'
                  ? `%${presR2Dynamics.geographicTransferTilt}`
                  : `${presR2Dynamics.geographicTransferTilt}%`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={presR2Dynamics.geographicTransferTilt}
              onChange={(e) =>
                setPresR2Dynamics({ geographicTransferTilt: parseInt(e.target.value, 10) || 0 })
              }
              className="w-full accent-[#090A0F]"
            />
            <p className="text-micro text-slate-600">
              {lang === 'tr'
                ? 'Elenen adayların seçmeni ulusal geçiş oranları korunarak her ilçede yerel olarak daha güçlü olan finaliste doğru eğilir (%0 = ülke geneli tek tip).'
                : 'Tilts eliminated candidates’ R2 transfers locally toward the stronger finalist in each district while keeping national transfer shares exact (0% = uniform national split).'}
            </p>
          </div>

          {/* 3. Abroad Round 2 Turnout Multiplier */}
          <div className="p-3.5 bg-[#F4F5F7] border border-[#090A0F] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-[#090A0F]">
                <Globe className="w-4 h-4 text-[#090A0F]" />
                <span>
                  {lang === 'tr'
                    ? '2. Tur Yurt Dışı Katılım Çarpanı'
                    : 'Round 2 Abroad Turnout Multiplier'}
                </span>
              </div>
              <span className="font-mono font-bold text-[#090A0F] tabular-nums">
                {presR2Dynamics.abroadRound2TurnoutMultiplier.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.01}
              value={presR2Dynamics.abroadRound2TurnoutMultiplier}
              onChange={(e) =>
                setPresR2Dynamics({
                  abroadRound2TurnoutMultiplier: parseFloat(e.target.value) || 1.0,
                })
              }
              className="w-full accent-[#090A0F]"
            />
            <p className="text-micro text-slate-600">
              {lang === 'tr'
                ? 'Yurt dışı seçmeninin 1. Tura kıyasla 2. Turdaki katılım farkını bağımsız olarak ölçekler (2023’te yurt dışı katılımı 2. Turda yükselmişti).'
                : 'Independently scales diaspora voter turnout in Round 2 relative to Round 1.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#F4F5F7] border-t-[1.5px] border-[#090A0F] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => resetPresR2Dynamics(true)}
              className="studio-btn px-2.5 py-1.5 text-micro"
            >
              {lang === 'tr' ? 'Nötr Yap (%0 / 1.00x)' : 'Set Neutral (0% / 1.00x)'}
            </button>
            <button
              onClick={() => resetPresR2Dynamics(false)}
              className="studio-btn px-2.5 py-1.5 text-micro"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{lang === 'tr' ? 'Varsayılan' : 'Defaults'}</span>
            </button>
          </div>

          <button onClick={onClose} className="studio-btn studio-btn-primary px-4 py-1.5 text-micro">
            {lang === 'tr' ? 'Uygula ve Kapat' : 'Apply & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
