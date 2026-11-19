import React, { useMemo, useState } from 'react';
import { Globe2, Lock } from 'lucide-react';
import { ABROAD_COUNTRY_BY_ID } from '../data/abroadCountries';
import { useElectionStore } from '../store/useElectionStore';
import { getContrastTextColor } from '../utils/color';
import { formatInt, formatPct } from '../utils/format';
import { normalizeTr } from './LocationSearchCombobox';

type SortKey = 'validVotes' | 'registeredVoters' | 'turnout' | 'marginPct';

interface AbroadRacesTableProps {
  mode: 'parliamentary' | 'presidential';
  searchQuery: string;
  onSelectAndGoToMap?: () => void;
}

export const AbroadRacesTable: React.FC<AbroadRacesTableProps> = ({
  mode,
  searchQuery,
  onSelectAndGoToMap,
}) => {
  const {
    lang,
    activeArchiveId,
    parties,
    projection,
    presCandidates,
    presRoundView: storedRoundView,
    presidentialProjection,
    setActiveScope,
    setMapLayer,
    setZoomedProvinceId,
  } = useElectionStore();
  const presRoundView =
    presidentialProjection.decidedInRound === 2 && !activeArchiveId?.endsWith('_ref')
      ? storedRoundView
      : 'round1';

  const [sortBy, setSortBy] = useState<SortKey>('validVotes');
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc((s) => !s);
    else {
      setSortBy(key);
      setSortAsc(false);
    }
  };

  const partyMap = useMemo(() => {
    const m: Record<string, (typeof parties)[0]> = {};
    for (const p of parties) m[p.id] = p;
    return m;
  }, [parties]);

  const candMap = useMemo(() => {
    const m: Record<string, (typeof presCandidates)[0]> = {};
    for (const c of presCandidates) m[c.id] = c;
    return m;
  }, [presCandidates]);

  const rows = useMemo(() => {
    const q = normalizeTr(searchQuery);
    const activePres =
      presRoundView === 'round2' ? presidentialProjection.round2 : presidentialProjection.round1;

    const list = Object.values(
      mode === 'parliamentary' ? projection.abroadCountryResults : activePres.abroadCountryResults
    );

    const filtered = !q
      ? list
      : list.filter((item) => {
          const meta = ABROAD_COUNTRY_BY_ID[item.id];
          const text = normalizeTr(
            `${meta?.nameTr || ''} ${meta?.fullNameTr || ''} ${meta?.nameEn || ''} ${
              meta?.region || ''
            } ${item.id}`
          );
          return text.includes(q);
        });

    return [...filtered].sort((a, b) => {
      const diff = (a[sortBy] as number) - (b[sortBy] as number);
      return sortAsc ? diff : -diff;
    });
  }, [
    mode,
    searchQuery,
    projection.abroadCountryResults,
    presidentialProjection,
    presRoundView,
    sortBy,
    sortAsc,
  ]);

  const jumpToCountry = (countryId: string) => {
    setZoomedProvinceId(null);
    setMapLayer('abroad_world');
    setActiveScope({ type: 'abroadCountry', countryId });
    onSelectAndGoToMap?.();
  };

  const parTopParties = parties.filter((p) => !p.isOther).slice(0, 6);
  const presTopCands =
    presRoundView === 'round2'
      ? presCandidates.filter((c) => presidentialProjection.topTwoCandidateIds.includes(c.id))
      : presCandidates.filter((c) => !c.isOther).slice(0, 5);

  return (
    <div className="overflow-x-auto max-h-[580px] border-[1.5px] border-[#090A0F]">
      <table className="w-full text-body border-collapse">
        <thead className="sticky top-0 bg-[#090A0F] text-white z-10 text-micro font-medium">
          <tr>
            <th className="py-2.5 px-3 text-left">
              {lang === 'tr' ? 'Ülke / Temsilcilik' : 'Country / Mission'}
            </th>
            <th
              className="py-2.5 px-3 text-right cursor-pointer hover:underline"
              onClick={() => toggleSort('registeredVoters')}
            >
              {lang === 'tr' ? 'Kayıtlı Seçmen' : 'Voters'} {sortBy === 'registeredVoters' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            <th
              className="py-2.5 px-3 text-right cursor-pointer hover:underline"
              onClick={() => toggleSort('turnout')}
            >
              {lang === 'tr' ? 'Katılım' : 'Turnout'} {sortBy === 'turnout' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            <th
              className="py-2.5 px-3 text-right cursor-pointer hover:underline"
              onClick={() => toggleSort('validVotes')}
            >
              {lang === 'tr' ? 'Geçerli Oy' : 'Valid'} {sortBy === 'validVotes' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            <th className="py-2.5 px-3 text-left">{lang === 'tr' ? '1. Sıra' : 'Leader'}</th>
            <th
              className="py-2.5 px-3 text-right cursor-pointer hover:underline"
              onClick={() => toggleSort('marginPct')}
            >
              {lang === 'tr' ? 'Fark' : 'Margin'} {sortBy === 'marginPct' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            {mode === 'parliamentary'
              ? parTopParties.map((p) => (
                  <th key={p.id} className="py-2.5 px-2.5 text-right font-mono">
                    {p.shortName}
                  </th>
                ))
              : presTopCands.map((c) => (
                  <th key={c.id} className="py-2.5 px-2.5 text-right font-mono">
                    {c.shortName}
                  </th>
                ))}
            <th className="py-2.5 px-3 text-right" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#090A0F]/15">
          {rows.map((r) => {
            const meta = ABROAD_COUNTRY_BY_ID[r.id];
            const leader =
              mode === 'parliamentary'
                ? partyMap[(r as typeof projection.abroadCountryResults[string]).leadingPartyId]
                : candMap[(r as typeof presidentialProjection.round1.abroadCountryResults[string]).leadingCandidateId];

            const shares =
              mode === 'parliamentary'
                ? (r as typeof projection.abroadCountryResults[string]).partyShares
                : (r as typeof presidentialProjection.round1.abroadCountryResults[string])
                    .candidateShares;

            const leaderShare = leader ? shares[leader.id] || 0 : 0;

            return (
              <tr
                key={r.id}
                onClick={() => jumpToCountry(r.id)}
                className="hover:bg-[#F4F5F7] transition-colors cursor-pointer"
              >
                <td className="py-2 px-3">
                  <div className="flex items-center gap-1.5 font-bold text-[#090A0F]">
                    <span>{lang === 'tr' ? meta?.nameTr || r.id : meta?.nameEn || r.id}</span>
                    {r.isLocked && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                  </div>
                  <div className="text-[11px] text-slate-500">{meta?.region || ''}</div>
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-600">
                  {r.registeredVoters > 0 ? formatInt(r.registeredVoters, lang) : '—'}
                </td>
                <td className="py-2 px-3 text-right font-mono">{formatPct(r.turnout, lang, 1)}</td>
                <td className="py-2 px-3 text-right font-mono font-semibold text-[#090A0F]">
                  {formatInt(r.validVotes, lang)}
                </td>
                <td className="py-2 px-3">
                  {leader && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-micro font-bold border border-[#090A0F]"
                      style={{
                        backgroundColor: leader.color,
                        color: getContrastTextColor(leader.color),
                      }}
                    >
                      {leader.shortName} {formatPct(leaderShare, lang, 1)}
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-700">
                  +{formatPct(r.marginPct, lang, 1)}
                </td>
                {mode === 'parliamentary'
                  ? parTopParties.map((p) => (
                      <td key={p.id} className="py-2 px-2.5 text-right font-mono text-slate-700">
                        {formatPct(shares[p.id] || 0, lang, 1)}
                      </td>
                    ))
                  : presTopCands.map((c) => (
                      <td key={c.id} className="py-2 px-2.5 text-right font-mono text-slate-700">
                        {formatPct(shares[c.id] || 0, lang, 1)}
                      </td>
                    ))}
                <td className="py-2 px-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      jumpToCountry(r.id);
                    }}
                    className="studio-btn px-2 py-1 text-micro whitespace-nowrap"
                  >
                    <Globe2 className="w-3 h-3" />
                    <span>{lang === 'tr' ? 'Harita' : 'Map'}</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
