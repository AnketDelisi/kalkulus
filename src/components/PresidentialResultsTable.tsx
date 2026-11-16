import React from 'react';
import { useElectionStore } from '../store/useElectionStore';
import { formatInt, formatPct } from '../utils/format';

export const PresidentialResultsTable: React.FC = () => {
  const { lang, parties, presCandidates, presidentialProjection } = useElectionStore();

  const partyById: Record<string, (typeof parties)[0]> = {};
  for (const p of parties) partyById[p.id] = p;

  const candById: Record<string, (typeof presCandidates)[0]> = {};
  for (const c of presCandidates) candById[c.id] = c;

  const { decidedInRound, round1, round2, topTwoCandidateIds, winnerCandidateId } =
    presidentialProjection;

  const r2Map: Record<string, (typeof round2.candidateSummaries)[0]> = {};
  for (const s of round2.candidateSummaries) r2Map[s.candidateId] = s;

  return (
    <div className="bg-white border-[1.5px] border-[#090A0F] overflow-hidden">
      <div className="px-5 py-3.5 border-b-[1.5px] border-[#090A0F] flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-heading font-semibold text-[#090A0F] tracking-tight">
            {lang === 'tr'
              ? 'Cumhurbaşkanlığı 1. ve 2. Tur sonuç tablosu'
              : 'Presidential 1st & 2nd round results'}
          </h3>
          <p className="text-micro text-slate-500">
            {lang === 'tr'
              ? 'Yurt içi + yurt dışı geçerli oy toplamları'
              : 'Domestic + abroad valid vote totals'}
          </p>
        </div>

        <div className="text-micro font-mono text-slate-600 tabular-nums">
          {lang === 'tr' ? '1. Tur Geçerli:' : 'R1 Valid:'}{' '}
          <strong className="text-[#090A0F]">{formatInt(round1.totalValidVotes, lang)}</strong>
          {decidedInRound === 2 && (
            <>
              {' · '}
              {lang === 'tr' ? '2. Tur Geçerli:' : 'R2 Valid:'}{' '}
              <strong className="text-[#090A0F]">{formatInt(round2.totalValidVotes, lang)}</strong>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-50 text-micro text-slate-600 uppercase tracking-wider">
              <th className="py-2.5 px-4 text-left">{lang === 'tr' ? 'Aday' : 'Candidate'}</th>
              <th className="py-2.5 px-3 text-left">{lang === 'tr' ? 'Blok partileri' : 'Parties'}</th>
              <th className="py-2.5 px-3 text-right">{lang === 'tr' ? '1. Tur %' : 'R1 %'}</th>
              <th className="py-2.5 px-3 text-right hidden sm:table-cell">
                {lang === 'tr' ? '1. Tur Oy' : 'R1 Votes'}
              </th>
              <th className="py-2.5 px-3 text-right">{lang === 'tr' ? '1. Tur İl' : 'R1 Prov'}</th>
              <th className="py-2.5 px-3 text-right">{lang === 'tr' ? '2. Tur %' : 'R2 %'}</th>
              <th className="py-2.5 px-3 text-right">{lang === 'tr' ? '2. Tur İl' : 'R2 Prov'}</th>
              <th className="py-2.5 px-4 text-right">{lang === 'tr' ? 'Durum' : 'Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {round1.candidateSummaries.map((s) => {
              const cand = candById[s.candidateId];
              if (!cand) return null;
              const isFinalist = topTwoCandidateIds.includes(s.candidateId);
              const isWinner = s.candidateId === winnerCandidateId;
              const r2Entry = r2Map[s.candidateId];

              return (
                <tr key={s.candidateId} className={isWinner ? 'bg-slate-50/80' : 'hover:bg-slate-50/50'}>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-4 shrink-0 border border-[#090A0F]"
                        style={{ backgroundColor: cand.color }}
                      />
                      <div>
                        <div className="font-semibold text-[#090A0F]">{cand.shortName}</div>
                        <div className="text-micro text-slate-500">{cand.name}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {cand.backingPartyIds.map((pid) => {
                        const p = partyById[pid];
                        if (!p) return null;
                        return (
                          <span
                            key={pid}
                            className="px-1.5 py-0.5 text-micro font-mono font-semibold border border-slate-300 bg-white"
                          >
                            {p.shortName}
                          </span>
                        );
                      })}
                    </div>
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-[#090A0F]">
                    {formatPct(s.share, lang, 2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 hidden sm:table-cell">
                    {formatInt(s.votes, lang)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {s.provincesWon}
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                    {r2Entry ? formatPct(r2Entry.share, lang, 2) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {r2Entry ? r2Entry.provincesWon : '—'}
                  </td>

                  <td className="py-2.5 px-4 text-right">
                    {isWinner ? (
                      <span className="inline-block px-2 py-0.5 text-micro font-mono font-bold bg-emerald-400 text-[#090A0F] border border-[#090A0F]">
                        {decidedInRound === 1
                          ? lang === 'tr'
                            ? '1. TUR KAZANDI'
                            : 'WON R1'
                          : lang === 'tr'
                          ? '2. TUR KAZANDI'
                          : 'WON R2'}
                      </span>
                    ) : isFinalist ? (
                      <span className="inline-block px-2 py-0.5 text-micro font-mono font-semibold bg-amber-100 text-[#090A0F] border border-[#090A0F]">
                        {lang === 'tr' ? '2. TUR FİNALİST' : 'FINALIST'}
                      </span>
                    ) : (
                      <span className="text-micro font-mono text-slate-400">
                        {lang === 'tr' ? 'Elendi' : 'Eliminated'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
