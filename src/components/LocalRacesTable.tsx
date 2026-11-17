import React, { useMemo, useState } from 'react';
import { ArrowRight, Building2, MapPin, RefreshCw, Search, ZoomIn } from 'lucide-react';
import { useElectionStore } from '../store/useElectionStore';
import { formatInt, formatPct } from '../utils/format';

type LocalTableTab = 'buyuksehir' | 'il_merkez' | 'flips' | 'closest' | 'ilceler';

interface LocalRacesTableProps {
  onSelectAndGoToMap?: () => void;
}

export const LocalRacesTable: React.FC<LocalRacesTableProps> = ({ onSelectAndGoToMap }) => {
  const { lang, parties, localProjection, setActiveScope, setZoomedProvinceId } =
    useElectionStore();

  const [tab, setTab] = useState<LocalTableTab>('buyuksehir');
  const [search, setSearch] = useState('');

  const partyById = useMemo(() => {
    const m: Record<string, (typeof parties)[0]> = {};
    for (const p of parties) m[p.id] = p;
    return m;
  }, [parties]);

  const allProvinces = useMemo(
    () =>
      Object.values(localProjection.provinceResults).sort((a, b) => a.plateCode - b.plateCode),
    [localProjection.provinceResults]
  );

  const filteredProvinces = useMemo(() => {
    let base = allProvinces;
    if (tab === 'buyuksehir') base = base.filter((p) => p.isBuyuksehir);
    else if (tab === 'il_merkez') base = base.filter((p) => !p.isBuyuksehir);
    else if (tab === 'flips') base = base.filter((p) => p.flippedFrom2024);
    else if (tab === 'closest') base = localProjection.closestProvinces;

    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (p) => p.name.toLowerCase().includes(q) || String(p.plateCode).includes(q)
    );
  }, [allProvinces, localProjection.closestProvinces, tab, search]);

  const filteredIlceler = useMemo(() => {
    const list = Object.values(localProjection.ilceResults);
    if (!search.trim()) return list.slice(0, 120);
    const q = search.toLowerCase();
    return list.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 150);
  }, [localProjection.ilceResults, search]);

  return (
    <div className="bg-white border-[1.5px] border-[#090A0F] overflow-hidden">
      <div className="px-5 py-3.5 border-b-[1.5px] border-[#090A0F] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setTab('buyuksehir')}
            className={`px-3 py-1.5 text-body font-medium border border-[#090A0F] ${
              tab === 'buyuksehir' ? 'bg-[#090A0F] text-white' : 'bg-white hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 inline mr-1.5" />
            {lang === 'tr' ? '30 Büyükşehir' : '30 Metropolitans'}
          </button>

          <button
            onClick={() => setTab('il_merkez')}
            className={`px-3 py-1.5 text-body font-medium border border-[#090A0F] ${
              tab === 'il_merkez' ? 'bg-[#090A0F] text-white' : 'bg-white hover:bg-slate-100'
            }`}
          >
            {lang === 'tr' ? '51 İl Belediyesi' : '51 Provincial Cities'}
          </button>

          <button
            onClick={() => setTab('flips')}
            className={`px-3 py-1.5 text-body font-medium border border-[#090A0F] ${
              tab === 'flips' ? 'bg-[#090A0F] text-white' : 'bg-white hover:bg-slate-100'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" />
            {lang === 'tr'
              ? `El Değiştirenler (${localProjection.flippedProvinceIds.length})`
              : `Flips (${localProjection.flippedProvinceIds.length})`}
          </button>

          <button
            onClick={() => setTab('closest')}
            className={`px-3 py-1.5 text-body font-medium border border-[#090A0F] ${
              tab === 'closest' ? 'bg-[#090A0F] text-white' : 'bg-white hover:bg-slate-100'
            }`}
          >
            {lang === 'tr' ? 'En Yakın Yarışlar' : 'Closest Races'}
          </button>

          <button
            onClick={() => setTab('ilceler')}
            className={`px-3 py-1.5 text-body font-medium border border-[#090A0F] ${
              tab === 'ilceler' ? 'bg-[#090A0F] text-white' : 'bg-white hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
            {lang === 'tr' ? '973 İlçe' : '973 Districts'}
          </button>
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'tr' ? 'Belediye veya ilçe ara...' : 'Search municipality...'}
            className="w-full pl-8 pr-3 py-1.5 text-body border border-[#090A0F] focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {tab !== 'ilceler' ? (
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 text-micro text-slate-600 uppercase">
                <th className="py-2.5 px-4 text-left">{lang === 'tr' ? 'İl / Statü' : 'Province'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'tr' ? 'Geçerli Oy' : 'Valid Votes'}</th>
                <th className="py-2.5 px-3 text-left">
                  {localProjection.referenceBaseline === 'current'
                    ? lang === 'tr'
                      ? 'Mevcut → Projeksiyon'
                      : 'Current → Projected'
                    : lang === 'tr'
                    ? '2024 → Projeksiyon'
                    : '2024 → Projected'}
                </th>
                <th className="py-2.5 px-3 text-left">{lang === 'tr' ? '2. Parti' : 'Runner-up'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'tr' ? 'Fark (Oy / %)' : 'Margin'}</th>
                <th className="py-2.5 px-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProvinces.map((p) => {
                const winP = partyById[p.winnerPartyId];
                const runP = partyById[p.runnerUpPartyId];
                const oldP = partyById[p.winner2024PartyId];
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-micro text-slate-400">
                          {String(p.plateCode).padStart(2, '0')}
                        </span>
                        <span className="font-semibold text-[#090A0F]">{p.name}</span>
                        <span className="px-1.5 py-0.5 text-micro font-mono border border-slate-300 bg-slate-50 text-slate-600">
                          {p.isBuyuksehir
                            ? 'BB'
                            : p.countingBasis === 'merkez_ilce'
                            ? 'MERKEZ'
                            : 'İL'}
                        </span>
                      </div>
                    </td>

                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                      {formatInt(p.validVotes, lang)}
                    </td>

                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        {p.flippedFrom2024 && (
                          <>
                            <span className="text-micro font-mono text-slate-500">
                              {oldP?.shortName || p.winner2024PartyId}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                          </>
                        )}
                        <span
                          className="w-2.5 h-2.5 border border-[#090A0F]"
                          style={{ backgroundColor: winP?.color || '#64748b' }}
                        />
                        <span className="font-semibold text-[#090A0F]">
                          {winP?.shortName} ({formatPct(p.partyShares[p.winnerPartyId] || 0, lang, 1)})
                        </span>
                        {p.flippedFrom2024 && (
                          <span className="px-1 py-0.5 text-micro font-mono font-bold bg-amber-300 border border-[#090A0F]">
                            DEĞİŞTİ
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2 px-3 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="w-2 h-2"
                          style={{ backgroundColor: runP?.color || '#94a3b8' }}
                        />
                        {runP?.shortName} ({formatPct(p.partyShares[p.runnerUpPartyId] || 0, lang, 1)})
                      </span>
                    </td>

                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      <span className="font-semibold">{formatInt(p.marginVotes, lang)}</span>{' '}
                      <span className="text-slate-500">({formatPct(p.marginPct, lang, 1)})</span>
                    </td>

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
        ) : (
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 text-micro text-slate-600 uppercase">
                <th className="py-2.5 px-4 text-left">{lang === 'tr' ? 'İlçe' : 'District'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'tr' ? 'Geçerli Oy' : 'Valid'}</th>
                <th className="py-2.5 px-3 text-left">{lang === 'tr' ? 'Kazanan Parti' : 'Winner'}</th>
                <th className="py-2.5 px-4 text-right">{lang === 'tr' ? 'Fark (%)' : 'Margin %'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredIlceler.map((i) => {
                const winP = partyById[i.winnerPartyId];
                return (
                  <tr
                    key={i.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      setZoomedProvinceId(i.ilId);
                      setActiveScope({ type: 'ilce', ilceId: i.id });
                      onSelectAndGoToMap?.();
                      window.dispatchEvent(new CustomEvent('kalkulus:focus-map'));
                    }}
                  >
                    <td className="py-2 px-4 font-medium">
                      {i.name}
                      {i.isMerkez && (
                        <span className="ml-1.5 px-1 py-0.5 text-micro font-mono border border-slate-300 bg-slate-50">
                          MERKEZ
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                      {formatInt(i.validVotes, lang)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <span className="w-2 h-2" style={{ backgroundColor: winP?.color }} />
                        {winP?.shortName} ({formatPct(i.partyShares[i.winnerPartyId] || 0, lang, 1)})
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
