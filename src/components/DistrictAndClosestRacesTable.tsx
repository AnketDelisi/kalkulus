import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Lock,
  MapPin,
  Search,
  Table2,
  ZoomIn,
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';

type ActiveTab = 'districts' | 'closest' | 'ilceler';

interface DistrictAndClosestRacesTableProps {
  onSelectAndGoToMap?: () => void;
}

export const DistrictAndClosestRacesTable: React.FC<DistrictAndClosestRacesTableProps> = ({
  onSelectAndGoToMap,
}) => {
  const {
    lang,
    parties,
    projection,
    ilceOverrides,
    districtOverrides,
    setActiveScope,
    setZoomedProvinceId,
  } = useElectionStore();

  const [tab, setTab] = useState<ActiveTab>('districts');
  const [search, setSearch] = useState('');

  const t = translations[lang];

  const nonOtherParties = useMemo(() => parties.filter((p) => !p.isOther), [parties]);
  const partyMap = useMemo(() => {
    const m: Record<string, (typeof parties)[0]> = {};
    for (const p of parties) m[p.id] = p;
    return m;
  }, [parties]);

  const filteredDistricts = useMemo(() => {
    const list = Object.values(projection.districtResults);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (d) => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)
    );
  }, [projection.districtResults, search]);

  const filteredClosest = useMemo(() => {
    const list = projection.closestDistrictRaces;
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        d.lastSeatWinnerPartyId.toLowerCase().includes(q) ||
        d.closestChallengerPartyId.toLowerCase().includes(q)
    );
  }, [projection.closestDistrictRaces, search]);

  const filteredIlceler = useMemo(() => {
    const list = Object.values(projection.ilceResults);
    if (!search.trim()) return list.slice(0, 150);
    const q = search.toLowerCase();
    return list
      .filter((i) => {
        const provName = projection.provinceResults[i.ilId]?.name.toLowerCase() || '';
        return (
          i.name.toLowerCase().includes(q) ||
          provName.includes(q) ||
          i.districtId.toLowerCase().includes(q)
        );
      })
      .slice(0, 200);
  }, [projection.ilceResults, projection.provinceResults, search]);

  return (
    <div className="editorial-card p-5 flex flex-col gap-4">
      {/* Top Bar: Tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setTab('districts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              tab === 'districts'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>{t.tabDistricts}</span>
          </button>

          <button
            onClick={() => setTab('closest')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              tab === 'closest'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t.tabClosestRaces}</span>
          </button>

          <button
            onClick={() => setTab('ilceler')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              tab === 'ilceler'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{t.tabAllIlceler}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full editorial-input pl-9 pr-3 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* TAB 1: 87 Electoral Districts Breakdown */}
      {tab === 'districts' && (
        <div className="overflow-x-auto max-h-[560px]">
          <table className="w-full text-xs border-collapse font-mono">
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 text-slate-500 font-sans font-semibold">
              <tr>
                <th className="py-2.5 px-3 text-left">Seçim Çevresi</th>
                <th className="py-2.5 px-3 text-right">MV</th>
                <th className="py-2.5 px-3 text-right">Katılım</th>
                <th className="py-2.5 px-3 text-right">Geçerli Oy</th>
                {nonOtherParties.slice(0, 8).map((p) => (
                  <th key={p.id} className="py-2.5 px-3 text-right">
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.shortName}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-center">Harita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDistricts.map((d) => {
                const isLocked = Boolean(districtOverrides[d.id]?.isLocked);
                return (
                  <tr
                    key={d.id}
                    onClick={() => {
                      setActiveScope({ type: 'district', districtId: d.id });
                      onSelectAndGoToMap?.();
                    }}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3 font-sans font-semibold text-slate-900 flex items-center gap-2">
                      <span className="font-mono text-slate-400 font-bold">{d.id}</span>
                      <span>{d.name}</span>
                      {isLocked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {d.mpCount}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      %{d.turnout.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      {d.totalValidVotes.toLocaleString('tr-TR')}
                    </td>
                    {nonOtherParties.slice(0, 8).map((p) => {
                      const share = d.partyShares[p.id] || 0;
                      const seats = d.partySeats[p.id] || 0;
                      return (
                        <td key={p.id} className="py-2 px-3 text-right">
                          <span className="text-slate-600">{share.toFixed(1)}%</span>
                          {seats > 0 && (
                            <span
                              className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                              style={{ backgroundColor: p.color }}
                            >
                              {seats}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-center font-sans">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoomedProvinceId(d.ilId);
                          onSelectAndGoToMap?.();
                        }}
                        className="editorial-btn px-2 py-1 text-[11px]"
                      >
                        <ZoomIn className="w-3 h-3 text-slate-500" />
                        <span>İlçeler</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: Closest Races (Last Seat Flip Analyzer across 87 Districts) */}
      {tab === 'closest' && (
        <div className="overflow-x-auto max-h-[560px]">
          <table className="w-full text-xs border-collapse font-mono">
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 text-slate-500 font-sans font-semibold">
              <tr>
                <th className="py-2.5 px-3 text-left">Sıra</th>
                <th className="py-2.5 px-3 text-left">Seçim Çevresi</th>
                <th className="py-2.5 px-3 text-right">Toplam MV</th>
                <th className="py-2.5 px-3 text-left">{t.lastWinnerCol}</th>
                <th className="py-2.5 px-3 text-left">{t.closestChallengerCol}</th>
                <th className="py-2.5 px-3 text-right">{t.votesToFlipCol}</th>
                <th className="py-2.5 px-3 text-right">{t.pctToFlipCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClosest.map((d, idx) => {
                const winner = partyMap[d.lastSeatWinnerPartyId];
                const challenger = partyMap[d.closestChallengerPartyId];
                return (
                  <tr
                    key={d.id}
                    onClick={() => {
                      setActiveScope({ type: 'district', districtId: d.id });
                      onSelectAndGoToMap?.();
                    }}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-2 px-3 text-slate-400 font-bold">#{idx + 1}</td>
                    <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                      <span className="font-mono text-slate-400 mr-1.5">{d.id}</span>
                      {d.name}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">{d.mpCount} MV</td>
                    <td className="py-2 px-3 font-sans">
                      {winner && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: winner.color }}
                          />
                          <span className="font-bold text-slate-900">{winner.shortName}</span>
                          <span className="text-slate-500 text-[10px]">
                            ({d.partySeats[winner.id] || 0}. MV)
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-sans">
                      {challenger && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: challenger.color }}
                          />
                          <span className="font-bold text-slate-900">{challenger.shortName}</span>
                          <span className="text-slate-500 text-[10px]">
                            ({(d.partySeats[challenger.id] || 0) + 1}. MV Adayı)
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      +{d.votesToFlipLastSeat.toLocaleString('tr-TR')} oy
                    </td>
                    <td className="py-2 px-3 text-right text-amber-700 font-semibold">
                      %{d.pctToFlipLastSeat.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: 973 İlçe Database */}
      {tab === 'ilceler' && (
        <div className="overflow-x-auto max-h-[560px]">
          <table className="w-full text-xs border-collapse font-mono">
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 text-slate-500 font-sans font-semibold">
              <tr>
                <th className="py-2.5 px-3 text-left">İlçe & İl</th>
                <th className="py-2.5 px-3 text-left">Bölge</th>
                <th className="py-2.5 px-3 text-right">Seçmen</th>
                <th className="py-2.5 px-3 text-right">Katılım</th>
                <th className="py-2.5 px-3 text-right">Geçerli Oy</th>
                <th className="py-2.5 px-3 text-left">1. Parti</th>
                {nonOtherParties.slice(0, 6).map((p) => (
                  <th key={p.id} className="py-2.5 px-3 text-right">
                    {p.shortName} %
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIlceler.map((i) => {
                const provName = projection.provinceResults[i.ilId]?.name || i.ilId;
                const leader = partyMap[i.leadingPartyId];
                const isLocked = Boolean(ilceOverrides[i.id]?.isLocked);
                return (
                  <tr
                    key={i.id}
                    onClick={() => {
                      setActiveScope({ type: 'ilce', ilceId: i.id });
                      setZoomedProvinceId(i.ilId);
                      onSelectAndGoToMap?.();
                    }}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-2 px-3 font-sans font-semibold text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{i.name}</span>
                      <span className="text-slate-400 text-[11px]">({provName})</span>
                      {isLocked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                    </td>
                    <td className="py-2 px-3 text-slate-500">{i.districtId}</td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {i.registeredVoters.toLocaleString('tr-TR')}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      %{i.turnout.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      {i.validVotes.toLocaleString('tr-TR')}
                    </td>
                    <td className="py-2 px-3 font-sans">
                      {leader && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                          style={{ backgroundColor: leader.color }}
                        >
                          {leader.shortName} %{i.partyShares[leader.id]?.toFixed(1)}
                        </span>
                      )}
                    </td>
                    {nonOtherParties.slice(0, 6).map((p) => (
                      <td key={p.id} className="py-2 px-3 text-right text-slate-600">
                        {(i.partyShares[p.id] || 0).toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
