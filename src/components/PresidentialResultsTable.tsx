import React, { useEffect, useMemo, useState } from 'react';
import { ARCHIVE_ELECTIONS, getArchiveComparisonLabel } from '../data/archiveRegistry';
import { useElectionStore } from '../store/useElectionStore';
import { formatInt, formatPct } from '../utils/format';

export const PresidentialResultsTable: React.FC = () => {
  const {
    lang,
    activeArchiveId,
    archiveComparisonId,
    archivePresSelfBaselineProjection,
    archivePresComparisonProjection,
    parties,
    presCandidates,
    presidentialProjection,
    activeScope,
  } = useElectionStore();
  const [forceNational, setForceNational] = useState(false);

  const activeArchiveCfg = activeArchiveId ? ARCHIVE_ELECTIONS[activeArchiveId] : undefined;
  const isReferendum = activeArchiveCfg?.category === 'referendum';
  const compareLabel = getArchiveComparisonLabel(
    archiveComparisonId,
    lang,
    activeArchiveCfg?.deltaLabelTr ?? 'Resmi'
  );
  const activePresBaseRef = activeArchiveId
    ? archivePresComparisonProjection ?? archivePresSelfBaselineProjection
    : null;

  useEffect(() => {
    setForceNational(false);
  }, [activeScope]);

  const effectiveType = forceNational ? 'national' : activeScope.type;

  const partyById: Record<string, (typeof parties)[0]> = {};
  for (const p of parties) partyById[p.id] = p;

  const candById: Record<string, (typeof presCandidates)[0]> = {};
  for (const c of presCandidates) candById[c.id] = c;

  const { decidedInRound, round1, round2, topTwoCandidateIds, winnerCandidateId } =
    presidentialProjection;
  const hasRunoff = !isReferendum && decidedInRound === 2;
  const singleRound = !hasRunoff;

  const r2Map: Record<string, (typeof round2.candidateSummaries)[0]> = {};
  for (const s of round2.candidateSummaries) r2Map[s.candidateId] = s;

  const scopedUnit = useMemo(() => {
    if (effectiveType === 'province' && activeScope.type === 'province') {
      const r1 = round1.provinceResults[activeScope.ilId];
      const r2 = round2.provinceResults[activeScope.ilId];
      if (r1) {
        return {
          title: `${r1.plateCode ? `${r1.plateCode} · ` : ''}${r1.name}`,
          r1Valid: r1.validVotes,
          r2Valid: r2?.validVotes ?? 0,
          r1Shares: r1.candidateShares,
          r1Votes: r1.candidateVotes,
          r2Shares: r2?.candidateShares ?? {},
          r2Votes: r2?.candidateVotes ?? {},
          r1Winner: r1.leadingCandidateId,
          r2Winner: r2?.leadingCandidateId,
        };
      }
    }
    if (effectiveType === 'ilce' && activeScope.type === 'ilce') {
      const r1 = round1.ilceResults[activeScope.ilceId];
      const r2 = round2.ilceResults[activeScope.ilceId];
      if (r1) {
        return {
          title: r1.name,
          r1Valid: r1.validVotes,
          r2Valid: r2?.validVotes ?? 0,
          r1Shares: r1.candidateShares,
          r1Votes: r1.candidateVotes,
          r2Shares: r2?.candidateShares ?? {},
          r2Votes: r2?.candidateVotes ?? {},
          r1Winner: r1.leadingCandidateId,
          r2Winner: r2?.leadingCandidateId,
        };
      }
    }
    if (effectiveType === 'abroad') {
      const r1Votes: Record<string, number> = {};
      const r1Shares: Record<string, number> = {};
      const r2Votes: Record<string, number> = {};
      const r2Shares: Record<string, number> = {};
      for (const s of round1.candidateSummaries) {
        r1Votes[s.candidateId] = s.abroadVotes;
        r1Shares[s.candidateId] = round1.abroadValidVotes > 0 ? (s.abroadVotes / round1.abroadValidVotes) * 100 : 0;
      }
      for (const s of round2.candidateSummaries) {
        r2Votes[s.candidateId] = s.abroadVotes;
        r2Shares[s.candidateId] = round2.abroadValidVotes > 0 ? (s.abroadVotes / round2.abroadValidVotes) * 100 : 0;
      }
      const r1W = Object.entries(r1Votes).sort((a, b) => b[1] - a[1])[0]?.[0];
      const r2W = Object.entries(r2Votes).sort((a, b) => b[1] - a[1])[0]?.[0];
      return {
        title: lang === 'tr' ? 'Yurt Dışı & Gümrükler' : 'Abroad & Customs',
        r1Valid: round1.abroadValidVotes,
        r2Valid: round2.abroadValidVotes,
        r1Shares,
        r1Votes,
        r2Shares,
        r2Votes,
        r1Winner: r1W,
        r2Winner: r2W,
      };
    }
    if (effectiveType === 'abroadCountry' && activeScope.type === 'abroadCountry') {
      const r1 = round1.abroadCountryResults[activeScope.countryId];
      const r2 = round2.abroadCountryResults[activeScope.countryId];
      if (r1) {
        return {
          title: r1.name,
          r1Valid: r1.validVotes,
          r2Valid: r2?.validVotes ?? 0,
          r1Shares: r1.candidateShares,
          r1Votes: r1.candidateVotes,
          r2Shares: r2?.candidateShares ?? {},
          r2Votes: r2?.candidateVotes ?? {},
          r1Winner: r1.leadingCandidateId,
          r2Winner: r2?.leadingCandidateId,
        };
      }
    }
    return null;
  }, [effectiveType, activeScope, round1, round2, lang]);

  return (
    <div className="bg-white border-[1.5px] border-[#090A0F] overflow-hidden">
      <div className="px-5 py-3.5 border-b-[1.5px] border-[#090A0F] flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-heading font-semibold text-[#090A0F] tracking-tight">
            {scopedUnit
              ? scopedUnit.title
              : isReferendum
              ? lang === 'tr'
                ? 'Referandum Evet / Hayır sonuç tablosu'
                : 'Referendum Yes / No results'
              : singleRound
              ? lang === 'tr'
                ? 'Cumhurbaşkanlığı sonuç tablosu'
                : 'Presidential results'
              : lang === 'tr'
              ? 'Cumhurbaşkanlığı 1. ve 2. Tur sonuç tablosu'
              : 'Presidential 1st & 2nd round results'}
          </h3>
          <p className="text-micro text-slate-500">
            {scopedUnit
              ? isReferendum
                ? lang === 'tr'
                  ? 'Seçili birim geçerli referandum oy dağılımı'
                  : 'Selected unit valid referendum vote breakdown'
                : singleRound
                ? lang === 'tr'
                  ? 'Seçili birim geçerli oy dağılımı'
                  : 'Selected unit valid vote breakdown'
                : lang === 'tr'
                ? 'Seçili birim 1. ve 2. tur geçerli oy dağılımı'
                : 'Selected unit 1st & 2nd round valid vote breakdown'
              : lang === 'tr'
              ? 'Yurt içi + yurt dışı geçerli oy toplamları'
              : 'Domestic + abroad valid vote totals'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-micro font-mono text-slate-600 tabular-nums">
            {lang === 'tr' ? (singleRound ? 'Geçerli:' : '1. Tur Geçerli:') : singleRound ? 'Valid:' : 'R1 Valid:'}{' '}
            <strong className="text-[#090A0F]">
              {formatInt(scopedUnit ? scopedUnit.r1Valid : round1.totalValidVotes, lang)}
            </strong>
            {decidedInRound === 2 && (
              <>
                {' · '}
                {lang === 'tr' ? '2. Tur Geçerli:' : 'R2 Valid:'}{' '}
                <strong className="text-[#090A0F]">
                  {formatInt(scopedUnit ? scopedUnit.r2Valid : round2.totalValidVotes, lang)}
                </strong>
              </>
            )}
          </div>

          {activeScope.type !== 'national' && (
            <div className="inline-flex border border-[#090A0F] text-micro font-bold bg-white">
              <button
                type="button"
                onClick={() => setForceNational(false)}
                className={`px-2 py-0.5 transition-colors ${
                  !forceNational ? 'bg-[#090A0F] text-white' : 'text-[#090A0F] hover:bg-slate-100'
                }`}
              >
                {lang === 'tr' ? 'Seçili Birim' : 'Selected Unit'}
              </button>
              <button
                type="button"
                onClick={() => setForceNational(true)}
                className={`px-2 py-0.5 border-l border-[#090A0F] transition-colors ${
                  forceNational ? 'bg-[#090A0F] text-white' : 'text-[#090A0F] hover:bg-slate-100'
                }`}
              >
                {lang === 'tr' ? 'Ulusal' : 'National'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-50 text-micro text-slate-600 uppercase tracking-wider">
              <th className="py-2.5 px-4 text-left">
                {isReferendum
                  ? lang === 'tr'
                    ? 'Tercih'
                    : 'Choice'
                  : lang === 'tr'
                  ? 'Aday'
                  : 'Candidate'}
              </th>
              <th className="py-2.5 px-3 text-left">{lang === 'tr' ? 'Blok partileri' : 'Parties'}</th>
              <th className="py-2.5 px-3 text-right">
                {singleRound ? (lang === 'tr' ? 'Oy %' : 'Share %') : lang === 'tr' ? '1. Tur %' : 'R1 %'}
              </th>
              {activePresBaseRef && (
                <th className="py-2.5 px-2 text-right font-mono">±{compareLabel}</th>
              )}
              <th className="py-2.5 px-3 text-right hidden sm:table-cell">
                {singleRound ? (lang === 'tr' ? 'Geçerli Oy' : 'Votes') : lang === 'tr' ? '1. Tur Oy' : 'R1 Votes'}
              </th>
              {!scopedUnit && (
                <th className="py-2.5 px-3 text-right">
                  {singleRound ? (lang === 'tr' ? 'Kazanılan İl' : 'Prov') : lang === 'tr' ? '1. Tur İl' : 'R1 Prov'}
                </th>
              )}
              {hasRunoff && (
                <th className="py-2.5 px-3 text-right">{lang === 'tr' ? '2. Tur %' : 'R2 %'}</th>
              )}
              {hasRunoff &&
                (scopedUnit ? (
                  <th className="py-2.5 px-3 text-right hidden sm:table-cell">
                    {lang === 'tr' ? '2. Tur Oy' : 'R2 Votes'}
                  </th>
                ) : (
                  <th className="py-2.5 px-3 text-right">{lang === 'tr' ? '2. Tur İl' : 'R2 Prov'}</th>
                ))}
              <th className="py-2.5 px-4 text-right">{lang === 'tr' ? 'Durum' : 'Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {round1.candidateSummaries.map((s) => {
              const cand = candById[s.candidateId];
              if (!cand) return null;
              const isFinalist = topTwoCandidateIds.includes(s.candidateId);
              const isWinner = scopedUnit
                ? (decidedInRound === 1 ? scopedUnit.r1Winner : scopedUnit.r2Winner) === s.candidateId
                : s.candidateId === winnerCandidateId;
              const r2Entry = r2Map[s.candidateId];
              const r1Share = scopedUnit ? scopedUnit.r1Shares[s.candidateId] ?? 0 : s.share;
              const r1Votes = scopedUnit ? scopedUnit.r1Votes[s.candidateId] ?? 0 : s.votes;
              const r2Share = scopedUnit
                ? isFinalist
                  ? scopedUnit.r2Shares[s.candidateId] ?? 0
                  : null
                : r2Entry
                ? r2Entry.share
                : null;
              const r2Votes = scopedUnit && isFinalist ? scopedUnit.r2Votes[s.candidateId] ?? 0 : null;
              const baseR1Round = activePresBaseRef?.round1;
              const baseR1Share = baseR1Round
                ? effectiveType === 'province' && activeScope.type === 'province'
                  ? baseR1Round.provinceResults[activeScope.ilId]?.candidateShares[s.candidateId]
                  : effectiveType === 'ilce' && activeScope.type === 'ilce'
                  ? baseR1Round.ilceResults[activeScope.ilceId]?.candidateShares[s.candidateId]
                  : !scopedUnit
                  ? baseR1Round.candidateSummaries.find((x) => x.candidateId === s.candidateId)?.share
                  : undefined
                : undefined;
              const deltaR1 =
                baseR1Share !== undefined ? r1Share - baseR1Share : null;

              return (
                <tr key={s.candidateId} className={isWinner ? 'bg-slate-50/80' : 'hover:bg-slate-50/50'}>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-4 shrink-0 border border-[#090A0F]"
                        style={{ backgroundColor: cand.color }}
                      />
                      {cand.logoUrl && (
                        <span
                          role="img"
                          aria-label={cand.shortName}
                          className="w-4 h-4 shrink-0"
                          style={{
                            backgroundColor: cand.color,
                            WebkitMaskImage: `url(${import.meta.env.BASE_URL}${cand.logoUrl})`,
                            maskImage: `url(${import.meta.env.BASE_URL}${cand.logoUrl})`,
                            WebkitMaskSize: 'contain',
                            maskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat',
                            maskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center',
                            maskPosition: 'center',
                          }}
                        />
                      )}
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
                    {formatPct(r1Share, lang, 2)}
                  </td>
                  {activePresBaseRef && (
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold">
                      {deltaR1 !== null ? (
                        <span
                          className={
                            deltaR1 > 0.05
                              ? 'text-emerald-700'
                              : deltaR1 < -0.05
                              ? 'text-rose-700'
                              : 'text-slate-400'
                          }
                        >
                          {deltaR1 > 0 ? '+' : ''}
                          {deltaR1.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 hidden sm:table-cell">
                    {formatInt(r1Votes, lang)}
                  </td>
                  {!scopedUnit && (
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {s.provincesWon}
                    </td>
                  )}

                  {hasRunoff && (
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                      {r2Share !== null ? formatPct(r2Share, lang, 2) : '—'}
                    </td>
                  )}
                  {hasRunoff &&
                    (scopedUnit ? (
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 hidden sm:table-cell">
                        {r2Votes !== null ? formatInt(r2Votes, lang) : '—'}
                      </td>
                    ) : (
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {r2Entry ? r2Entry.provincesWon : '—'}
                      </td>
                    ))}

                  <td className="py-2.5 px-4 text-right">
                    {isWinner ? (
                      <span className="inline-block px-2 py-0.5 text-micro font-mono font-bold bg-emerald-400 text-[#090A0F] border border-[#090A0F]">
                        {scopedUnit
                          ? lang === 'tr'
                            ? 'BİRİNCİ'
                            : '1ST'
                          : decidedInRound === 1
                          ? lang === 'tr'
                            ? '1. TUR KAZANDI'
                            : 'WON R1'
                          : lang === 'tr'
                          ? '2. TUR KAZANDI'
                          : 'WON R2'}
                      </span>
                    ) : isFinalist && hasRunoff ? (
                      <span className="inline-block px-2 py-0.5 text-micro font-mono font-semibold bg-amber-100 text-[#090A0F] border border-[#090A0F]">
                        {lang === 'tr' ? '2. TUR FİNALİST' : 'FINALIST'}
                      </span>
                    ) : (
                      <span className="text-micro font-mono text-slate-400">
                        {singleRound ? '—' : lang === 'tr' ? 'Elendi' : 'Eliminated'}
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
