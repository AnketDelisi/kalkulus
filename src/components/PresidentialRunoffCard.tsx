import React, { useState } from 'react';
import { Award, RotateCcw, SlidersHorizontal, Split } from 'lucide-react';
import { getDefaultTransferForCandidate } from '../data/presidentialDefaults';
import { useElectionStore } from '../store/useElectionStore';
import { formatInt, formatPct } from '../utils/format';
import { PresidentialR2DynamicsModal } from './PresidentialR2DynamicsModal';

export const PresidentialRunoffCard: React.FC = () => {
  const {
    lang,
    presCandidates,
    presTransferMatrix,
    presR2Dynamics,
    presidentialProjection,
    updatePresTransfer,
    resetPresTransfersToDefault,
  } = useElectionStore();
  const [r2ModalOpen, setR2ModalOpen] = useState(false);

  const candById: Record<string, (typeof presCandidates)[0]> = {};
  for (const c of presCandidates) candById[c.id] = c;

  const { decidedInRound, round1, round2, topTwoCandidateIds, winnerCandidateId } =
    presidentialProjection;

  const [firstId, secondId] = topTwoCandidateIds;
  const firstCand = candById[firstId];
  const secondCand = candById[secondId];
  const winnerCand = candById[winnerCandidateId];

  const activeRound = decidedInRound === 1 ? round1 : round2;
  const firstR2 = round2.candidateSummaries.find((s) => s.candidateId === firstId);
  const secondR2 = round2.candidateSummaries.find((s) => s.candidateId === secondId);
  const r1Leader = round1.candidateSummaries[0];

  const eliminated = round1.candidateSummaries.filter(
    (s) => s.candidateId !== firstId && s.candidateId !== secondId && s.votes > 0
  );

  return (
    <div className="bg-white border-[1.5px] border-[#090A0F] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b-[1.5px] border-[#090A0F] flex items-center justify-between gap-2">
        <div>
          <h3 className="text-heading font-semibold text-[#090A0F] tracking-tight">
            {lang === 'tr' ? 'Cumhurbaşkanlığı 50%+1 ve 2. Tur' : 'Presidential 50%+1 & runoff'}
          </h3>
          <p className="text-micro text-slate-600">
            {decidedInRound === 1
              ? lang === 'tr'
                ? '1. Turda salt çoğunluk sağlandı'
                : 'Absolute majority reached in Round 1'
              : lang === 'tr'
              ? 'Hiçbir aday %50+1 alamadı · 2. Tur simülasyonu aktif'
              : 'No candidate reached 50%+1 · 2nd round simulation active'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setR2ModalOpen(true)}
            className="studio-btn px-2 py-1 text-micro"
            title={lang === 'tr' ? '2. Tur Mobilizasyon ve Yerel Eğilim Ayarları' : 'Round 2 Dynamics'}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{lang === 'tr' ? '2. Tur Dinamikleri' : 'R2 Dynamics'}</span>
            {presR2Dynamics.geographicTransferTilt > 0 && (
              <span className="font-mono text-[10px] px-1 bg-[#090A0F] text-[#00F5D4]">
                %{presR2Dynamics.geographicTransferTilt}
              </span>
            )}
          </button>

          <span
            className={`px-2 py-1 text-micro font-mono font-bold border border-[#090A0F] ${
              decidedInRound === 1 ? 'bg-emerald-400 text-[#090A0F]' : 'bg-amber-300 text-[#090A0F]'
            }`}
          >
            {decidedInRound === 1 ? '1. TUR BİTTİ' : '2. TUR'}
          </span>
        </div>
      </div>

      <PresidentialR2DynamicsModal
        isOpen={r2ModalOpen}
        onClose={() => setR2ModalOpen(false)}
      />

      {/* Winner Headline & 50%+1 Duel Bar */}
      <div className="p-4 space-y-4">
        <div className="p-3 bg-slate-50 border border-[#090A0F] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-3.5 h-8 shrink-0 border border-[#090A0F]"
              style={{ backgroundColor: winnerCand?.color || '#090A0F' }}
            />
            <div className="min-w-0">
              <div className="text-micro text-slate-500 flex items-center gap-1">
                <Award className="w-3 h-3 text-[#090A0F]" />
                <span>
                  {decidedInRound === 1
                    ? lang === 'tr'
                      ? '1. Tur Cumhurbaşkanı'
                      : '1st Round Winner'
                    : lang === 'tr'
                    ? '2. Tur Projeksiyon Kazananı'
                    : 'Projected 2nd Round Winner'}
                </span>
              </div>
              <div className="text-title font-bold text-[#090A0F] truncate">
                {winnerCand?.name || winnerCandidateId}
              </div>
            </div>
          </div>

          <div className="text-right font-mono tabular-nums shrink-0">
            <div className="text-heading font-bold text-[#090A0F]">
              {formatPct(activeRound.candidateSummaries[0]?.share || 0, lang, 2)}
            </div>
            <div className="text-micro text-slate-500">
              +{formatPct(activeRound.marginPct, lang, 2)} {lang === 'tr' ? 'fark' : 'margin'}
            </div>
          </div>
        </div>

        {/* Round 1 vs 50% indicator */}
        <div>
          <div className="flex items-center justify-between text-micro text-slate-600 mb-1">
            <span>{lang === 'tr' ? '1. Tur lideri (%50+1 hedefi)' : 'Round 1 leader (50%+1 goal)'}</span>
            <span className="font-mono font-semibold text-[#090A0F] tabular-nums">
              {candById[r1Leader.candidateId]?.shortName} · {formatPct(r1Leader.share, lang, 2)}
            </span>
          </div>
          <div className="relative h-3 bg-slate-100 border border-[#090A0F] overflow-hidden flex">
            {round1.candidateSummaries.map((s) => (
              <div
                key={s.candidateId}
                style={{
                  width: `${s.share}%`,
                  backgroundColor: candById[s.candidateId]?.color || '#64748b',
                }}
                title={`${candById[s.candidateId]?.shortName}: ${formatPct(s.share, lang, 2)}`}
              />
            ))}
            <div
              className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-[#090A0F]"
              title="50%+1"
            />
          </div>
        </div>

        {/* Round 2 Duel Bar */}
        {firstCand && secondCand && firstR2 && secondR2 && (
          <div>
            <div className="flex items-center justify-between text-micro mb-1 font-mono tabular-nums">
              <span className="font-bold" style={{ color: firstCand.color }}>
                {firstCand.shortName} {formatPct(firstR2.share, lang, 2)}
              </span>
              <span className="text-slate-500">
                {lang === 'tr' ? '2. Tur Düellosu' : '2nd Round Duel'}
              </span>
              <span className="font-bold" style={{ color: secondCand.color }}>
                {formatPct(secondR2.share, lang, 2)} {secondCand.shortName}
              </span>
            </div>
            <div className="relative h-5 border border-[#090A0F] flex overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${firstR2.share}%`, backgroundColor: firstCand.color }}
              />
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${secondR2.share}%`, backgroundColor: secondCand.color }}
              />
              <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-white mix-blend-difference" />
            </div>
            <div className="flex items-center justify-between text-micro text-slate-500 mt-1 font-mono tabular-nums">
              <span>{formatInt(firstR2.votes, lang)} {lang === 'tr' ? 'oy' : 'votes'}</span>
              <span>
                {lang === 'tr' ? '2. Tur katılımı:' : 'R2 turnout:'} {formatPct(round2.turnout, lang, 1)}
              </span>
              <span>{formatInt(secondR2.votes, lang)} {lang === 'tr' ? 'oy' : 'votes'}</span>
            </div>
          </div>
        )}

        {/* Eliminated Candidate Transfer Sliders */}
        {eliminated.length > 0 && firstCand && secondCand && (
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-body font-semibold text-[#090A0F]">
                <Split className="w-3.5 h-3.5" />
                <span>
                  {lang === 'tr' ? '2. Tur oy geçiş matrisi' : '2nd round vote transfer matrix'}
                </span>
              </div>
              <button
                onClick={resetPresTransfersToDefault}
                className="inline-flex items-center gap-1 text-micro text-slate-600 hover:text-[#090A0F] font-medium"
                title={lang === 'tr' ? 'Varsayılan geçiş oranlarına dön' : 'Reset transfers'}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{lang === 'tr' ? 'Varsayılan' : 'Defaults'}</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {eliminated.map((elim) => {
                const cand = candById[elim.candidateId];
                const split =
                  presTransferMatrix[elim.candidateId] ||
                  getDefaultTransferForCandidate(elim.candidateId, firstId, secondId);

                return (
                  <div
                    key={elim.candidateId}
                    className="p-2.5 bg-slate-50 border border-slate-300 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-micro">
                      <div className="flex items-center gap-1.5 font-semibold text-[#090A0F]">
                        <span
                          className="w-2 h-2 border border-[#090A0F]"
                          style={{ backgroundColor: cand?.color || '#64748b' }}
                        />
                        <span>{cand?.shortName || elim.candidateId}</span>
                      </div>
                      <span className="font-mono text-slate-600 tabular-nums">
                        1. Tur: {formatPct(elim.share, lang, 2)} ({formatInt(elim.votes, lang)})
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-micro">
                      <div>
                        <label className="block text-slate-600 truncate">
                          → {firstCand.shortName} (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={Math.round(split.toFirstPct)}
                          onChange={(e) =>
                            updatePresTransfer(elim.candidateId, {
                              toFirstPct: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-1.5 py-0.5 border border-slate-300 bg-white font-mono font-semibold text-right tabular-nums focus:border-[#090A0F] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 truncate">
                          → {secondCand.shortName} (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={Math.round(split.toSecondPct)}
                          onChange={(e) =>
                            updatePresTransfer(elim.candidateId, {
                              toSecondPct: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-1.5 py-0.5 border border-slate-300 bg-white font-mono font-semibold text-right tabular-nums focus:border-[#090A0F] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 truncate">
                          {lang === 'tr' ? 'Sandığa Gitmeyen' : 'Abstain (%)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={Math.round(split.abstainPct)}
                          onChange={(e) =>
                            updatePresTransfer(elim.candidateId, {
                              abstainPct: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-1.5 py-0.5 border border-slate-300 bg-white font-mono font-semibold text-right tabular-nums focus:border-[#090A0F] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Visual split bar */}
                    <div className="h-1.5 w-full flex overflow-hidden border border-slate-300">
                      <div
                        style={{
                          width: `${split.toFirstPct}%`,
                          backgroundColor: firstCand.color,
                        }}
                      />
                      <div
                        style={{
                          width: `${split.toSecondPct}%`,
                          backgroundColor: secondCand.color,
                        }}
                      />
                      <div className="bg-slate-300" style={{ width: `${split.abstainPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
