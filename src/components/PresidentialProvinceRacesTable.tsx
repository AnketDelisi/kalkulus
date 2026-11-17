import React, { useMemo, useState } from 'react';
import { Globe2, MapPin, Search, Table2, ZoomIn } from 'lucide-react';
import { useElectionStore } from '../store/useElectionStore';
import { formatInt, formatPct } from '../utils/format';
import { AbroadRacesTable } from './AbroadRacesTable';

type Tab = 'provinces' | 'closest' | 'ilceler' | 'abroad';

interface PresidentialProvinceRacesTableProps {
  onSelectAndGoToMap?: () => void;
}

export const PresidentialProvinceRacesTable: React.FC<PresidentialProvinceRacesTableProps> = ({
  onSelectAndGoToMap,
}) => {
  const {
    lang,
    presCandidates,
    presRoundView,
    presidentialProjection,
    setActiveScope,
    setZoomedProvinceId,
  } = useElectionStore();

  const [tab, setTab] = useState<Tab>('provinces');
  const [search, setSearch] = useState('');

  const candById = useMemo(() => {
    const m: Record<string, (typeof presCandidates)[0]> = {};
    for (const c of presCandidates) m[c.id] = c;
    return m;
  }, [presCandidates]);

  const activeRound =
    presRoundView === 'round2' ? presidentialProjection.round2 : presidentialProjection.round1;

  const filteredProvinces = useMemo(() => {
    const list = Object.values(activeRound.provinceResults).sort(
      (a, b) => (a.plateCode || 0) - (b.plateCode || 0)
    );
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (p) => p.name.toLowerCase().includes(q) || String(p.plateCode || '').includes(q)
    );
  }, [activeRound.provinceResults, search]);

  const filteredIlceler = useMemo(() => {
    const list = Object.values(activeRound.ilceResults);
    if (!search.trim()) return list.slice(0, 120);
    const q = search.toLowerCase();
    return list.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 150);
  }, [activeRound.ilceResults, search]);

  const displayCands =
    presRoundView === 'round2'
      ? presCandidates.filter((c) => presidentialProjection.topTwoCandidateIds.includes(c.id))
      : presCandidates.filter((c) => !c.isOther);

  return (
    <div className="bg-white border-[1.5px] border-[#090A0F] overflow-hidden">
      <div className="px-5 py-3.5 border-b-[1.5px] border-[#090A0F] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setTab('provinces')}
            className={`px-3 py-1.5 text-body font-medium border border-[#090A0F] transition-colors ${
              tab === 'provinces' ? 'bg-[#090A0F] text-white' : 'bg-white hover:bg-slate-100'
            }`}
          >
            <Table2 className="w-3.5 h-3.5 inline mr-1.5" />
            {lang === 'tr' ? `81 İl (${presRoundView === 'round2' ? '2. Tur' : '1. Tur'})` : '81 Provinces'}
          </button>

          <button
            onClick={() => setTab('closest')}
            className={`px-3 py-1.5 text-body font-medium border border-[#090A0F] transition-colors ${
              tab === 'closest' ? 'bg-[#090A0F] text-white' : 'bg-white hover:bg-slate-100'
            }`}
          >
            {lang === 'tr' ? 'En başa baş iller' : 'Closest provinces'}
          </button>

          <button
            onClick={() => setTab('ilceler')}
            className={`px-3 py-1.5 text-body font-medium border border-[#090A0F] transition-colors ${
              tab === 'ilceler' ? 'bg-[#090A0F] text-white' : 'bg-white hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
            {lang === 'tr' ? '973 İlçe' : '973 Districts'}
          </button>

          <button
            onClick={() => setTab('abroad')}
            className={`px-3 py-1.5 text-body font-medium border border-[#090A0F] transition-colors ${
              tab === 'abroad' ? 'bg-[#090A0F] text-white' : 'bg-white hover:bg-slate-100'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5 inline mr-1.5" />
            {lang === 'tr' ? 'Yurt Dışı (74)' : 'Abroad (74)'}
          </button>
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'tr' ? 'İl veya ilçe ara...' : 'Search province or district...'}
            className="w-full pl-8 pr-3 py-1.5 text-body border border-[#090A0F] focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {tab === 'abroad' && (
          <AbroadRacesTable
            mode="presidential"
            searchQuery={search}
            onSelectAndGoToMap={onSelectAndGoToMap}
          />
        )}
        {tab === 'provinces' && (
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 text-micro text-slate-600 uppercase">
                <th className="py-2.5 px-4 text-left">{lang === 'tr' ? 'İl' : 'Province'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'tr' ? 'Geçerli Oy' : 'Valid'}</th>
                <th className="py-2.5 px-3 text-left">{lang === 'tr' ? '1. Aday' : 'Leader'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'tr' ? 'Fark (%)' : 'Margin'}</th>
                {displayCands.map((c) => (
                  <th key={c.id} className="py-2.5 px-2 text-right font-mono">
                    {c.shortName}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProvinces.map((p) => {
                const winCand = candById[p.leadingCandidateId];
                const r1Winner = presidentialProjection.round1.provinceResults[p.id]?.leadingCandidateId;
                const flippedInR2 =
                  presRoundView === 'round2' && r1Winner !== p.leadingCandidateId;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-semibold text-[#090A0F]">
                      <span className="font-mono text-micro text-slate-400 mr-1.5">
                        {String(p.plateCode || p.id).padStart(2, '0')}
                      </span>
                      {p.name}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                      {formatInt(p.validVotes, lang)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <span
                          className="w-2.5 h-2.5 border border-[#090A0F]"
                          style={{ backgroundColor: winCand?.color || '#64748b' }}
                        />
                        <span>{winCand?.shortName}</span>
                        {flippedInR2 && (
                          <span className="px-1 py-0.5 text-micro font-mono bg-amber-200 border border-[#090A0F]">
                            2.T FLİP
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      +{formatPct(p.marginPct, lang, 1)}
                    </td>
                    {displayCands.map((c) => (
                      <td key={c.id} className="py-2 px-2 text-right font-mono tabular-nums text-slate-700">
                        {formatPct(p.candidateShares[c.id] || 0, lang, 1)}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => {
                          setZoomedProvinceId(p.id);
                          setActiveScope({ type: 'province', ilId: p.id });
                          onSelectAndGoToMap?.();
                          window.dispatchEvent(new CustomEvent('kalkulus:focus-map'));
                        }}
                        className="p-1 border border-slate-300 hover:border-[#090A0F]"
                        title={lang === 'tr' ? 'Haritada aç' : 'Open on map'}
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {tab === 'closest' && (
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 text-micro text-slate-600 uppercase">
                <th className="py-2.5 px-4 text-left">{lang === 'tr' ? 'İl' : 'Province'}</th>
                <th className="py-2.5 px-3 text-left">{lang === 'tr' ? '1. Aday' : 'Leader'}</th>
                <th className="py-2.5 px-3 text-left">{lang === 'tr' ? '2. Aday' : 'Runner-up'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'tr' ? 'Oy Farkı' : 'Vote Margin'}</th>
                <th className="py-2.5 px-4 text-right">{lang === 'tr' ? 'Fark (%)' : 'Margin %'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activeRound.closestProvinces.map((p) => {
                const c1 = candById[p.leadingCandidateId];
                const c2 = candById[p.runnerUpCandidateId];
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-semibold">{p.name}</td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <span className="w-2 h-2" style={{ backgroundColor: c1?.color }} />
                        {c1?.shortName} ({formatPct(p.candidateShares[c1?.id] || 0, lang, 1)})
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2" style={{ backgroundColor: c2?.color }} />
                        {c2?.shortName} ({formatPct(p.candidateShares[c2?.id] || 0, lang, 1)})
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {formatInt(p.marginVotes, lang)}
                    </td>
                    <td className="py-2 px-4 text-right font-mono font-bold text-rose-700 tabular-nums">
                      +{formatPct(p.marginPct, lang, 1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {tab === 'ilceler' && (
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 text-micro text-slate-600 uppercase">
                <th className="py-2.5 px-4 text-left">{lang === 'tr' ? 'İlçe' : 'District'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'tr' ? 'Geçerli Oy' : 'Valid'}</th>
                <th className="py-2.5 px-3 text-left">{lang === 'tr' ? 'Kazanan' : 'Leader'}</th>
                <th className="py-2.5 px-4 text-right">{lang === 'tr' ? 'Fark (%)' : 'Margin %'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredIlceler.map((i) => {
                const winCand = candById[i.leadingCandidateId];
                return (
                  <tr
                    key={i.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      if (i.ilId) setZoomedProvinceId(i.ilId);
                      setActiveScope({ type: 'ilce', ilceId: i.id });
                      onSelectAndGoToMap?.();
                      window.dispatchEvent(new CustomEvent('kalkulus:focus-map'));
                    }}
                  >
                    <td className="py-2 px-4 font-medium">{i.name}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                      {formatInt(i.validVotes, lang)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <span className="w-2 h-2" style={{ backgroundColor: winCand?.color }} />
                        {winCand?.shortName} ({formatPct(i.candidateShares[winCand?.id] || 0, lang, 1)})
                      </span>
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums">
                      +{formatPct(i.marginPct, lang, 1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
