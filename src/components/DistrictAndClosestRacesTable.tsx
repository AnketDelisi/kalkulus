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
    <div className="studio-panel studio-crosshair p-5 flex flex-col gap-4">
      {/* Top Bar: Tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-[#090A0F] pb-3">
        <div className="inline-flex border-[1.5px] border-[#090A0F] bg-[#F4F5F7] text-xs font-display font-bold uppercase tracking-wider">
          <button
            onClick={() => setTab('districts')}
            className={`flex items-center gap-1.5 px-3.5 py-2 border-r-[1.5px] border-[#090A0F] transition-colors ${
              tab === 'districts'
                ? 'bg-[#090A0F] text-white'
                : 'text-[#090A0F] hover:bg-white'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>{t.tabDistricts}</span>
          </button>

          <button
            onClick={() => setTab('closest')}
            className={`flex items-center gap-1.5 px-3.5 py-2 border-r-[1.5px] border-[#090A0F] transition-colors ${
              tab === 'closest'
                ? 'bg-[#090A0F] text-white'
                : 'text-[#090A0F] hover:bg-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t.tabClosestRaces}</span>
          </button>

          <button
            onClick={() => setTab('ilceler')}
            className={`flex items-center gap-1.5 px-3.5 py-2 transition-colors ${
              tab === 'ilceler'
                ? 'bg-[#090A0F] text-white'
                : 'text-[#090A0F] hover:bg-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{t.tabAllIlceler}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#090A0F] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full studio-input pl-9 pr-3 py-1.5 text-xs font-mono"
          />
        </div>
      </div>

      {/* TAB 1: 87 Electoral Districts Breakdown */}
      {tab === 'districts' && (
        <div className="overflow-x-auto max-h-[580px] border-[1.5px] border-[#090A0F]">
          <table className="w-full text-xs border-collapse font-mono">
            <thead className="sticky top-0 bg-[#090A0F] text-white z-10 font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3 text-left">SEÇİM ÇEVRESİ</th>
                <th className="py-2.5 px-3 text-right">MV</th>
                <th className="py-2.5 px-3 text-right">KATILIM</th>
                <th className="py-2.5 px-3 text-right">GEÇERLİ OY</th>
                {nonOtherParties.slice(0, 8).map((p) => (
                  <th key={p.id} className="py-2.5 px-3 text-right">
                    <span
                      className="inline-block w-2 h-2 mr-1 border border-white/40"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.shortName}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-center">HARİTA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#090A0F]/15">
              {filteredDistricts.map((d) => {
                const isLocked = Boolean(districtOverrides[d.id]?.isLocked);
                return (
                  <tr
                    key={d.id}
                    onClick={() => {
                      setActiveScope({ type: 'district', districtId: d.id });
                      onSelectAndGoToMap?.();
                    }}
                    className="hover:bg-[#F4F5F7] cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3 font-display font-bold text-[#090A0F] flex items-center gap-2">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[#090A0F] text-white font-bold">
                        {d.id}
                      </span>
                      <span>{d.name}</span>
                      {isLocked && <Lock className="w-3.5 h-3.5 text-amber-600" />}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-[#090A0F]">
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
                          <span className="text-slate-700">{share.toFixed(1)}%</span>
                          {seats > 0 && (
                            <span
                              className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold text-white border border-[#090A0F]"
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
                        className="studio-btn px-2 py-0.5 text-[10px] uppercase"
                      >
                        <ZoomIn className="w-3 h-3" />
                        <span>İLÇELER</span>
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
        <div className="overflow-x-auto max-h-[580px] border-[1.5px] border-[#090A0F]">
          <table className="w-full text-xs border-collapse font-mono">
            <thead className="sticky top-0 bg-[#090A0F] text-white z-10 font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3 text-left">SIRA</th>
                <th className="py-2.5 px-3 text-left">SEÇİM ÇEVRESİ</th>
                <th className="py-2.5 px-3 text-right">TOPLAM MV</th>
                <th className="py-2.5 px-3 text-left">{t.lastWinnerCol}</th>
                <th className="py-2.5 px-3 text-left">{t.closestChallengerCol}</th>
                <th className="py-2.5 px-3 text-right">{t.votesToFlipCol}</th>
                <th className="py-2.5 px-3 text-right">{t.pctToFlipCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#090A0F]/15">
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
                    className="hover:bg-[#F4F5F7] cursor-pointer"
                  >
                    <td className="py-2 px-3 text-slate-500 font-bold">#{idx + 1}</td>
                    <td className="py-2 px-3 font-display font-bold text-[#090A0F]">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[#090A0F] text-white mr-2">
                        {d.id}
                      </span>
                      {d.name}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700 font-bold">{d.mpCount} MV</td>
                    <td className="py-2 px-3 font-sans">
                      {winner && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#F4F5F7] border border-[#090A0F]">
                          <span
                            className="w-2.5 h-2.5 border border-[#090A0F]"
                            style={{ backgroundColor: winner.color }}
                          />
                          <span className="font-display font-bold text-[#090A0F]">{winner.shortName}</span>
                          <span className="font-mono text-slate-500 text-[10px]">
                            ({d.partySeats[winner.id] || 0}. MV)
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-sans">
                      {challenger && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#F4F5F7] border border-[#090A0F]">
                          <span
                            className="w-2.5 h-2.5 border border-[#090A0F]"
                            style={{ backgroundColor: challenger.color }}
                          />
                          <span className="font-display font-bold text-[#090A0F]">{challenger.shortName}</span>
                          <span className="font-mono text-slate-500 text-[10px]">
                            ({(d.partySeats[challenger.id] || 0) + 1}. MV ADAYI)
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-[#090A0F]">
                      +{d.votesToFlipLastSeat.toLocaleString('tr-TR')} OY
                    </td>
                    <td className="py-2 px-3 text-right text-rose-700 font-bold">
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
        <div className="overflow-x-auto max-h-[580px] border-[1.5px] border-[#090A0F]">
          <table className="w-full text-xs border-collapse font-mono">
            <thead className="sticky top-0 bg-[#090A0F] text-white z-10 font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3 text-left">İLÇE & İL</th>
                <th className="py-2.5 px-3 text-left">BÖLGE</th>
                <th className="py-2.5 px-3 text-right">SEÇMEN</th>
                <th className="py-2.5 px-3 text-right">KATILIM</th>
                <th className="py-2.5 px-3 text-right">GEÇERLİ OY</th>
                <th className="py-2.5 px-3 text-left">1. PARTİ</th>
                {nonOtherParties.slice(0, 6).map((p) => (
                  <th key={p.id} className="py-2.5 px-3 text-right">
                    {p.shortName} %
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#090A0F]/15">
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
                    className="hover:bg-[#F4F5F7] cursor-pointer"
                  >
                    <td className="py-2 px-3 font-display font-bold text-[#090A0F] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#090A0F] shrink-0" />
                      <span>{i.name}</span>
                      <span className="font-mono text-slate-500 text-[10px]">({provName})</span>
                      {isLocked && <Lock className="w-3.5 h-3.5 text-amber-600" />}
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-bold">{i.districtId}</td>
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
                          className="px-2 py-0.5 text-[10px] font-mono font-bold text-white border border-[#090A0F]"
                          style={{ backgroundColor: leader.color }}
                        >
                          {leader.shortName} %{i.partyShares[leader.id]?.toFixed(1)}
                        </span>
                      )}
                    </td>
                    {nonOtherParties.slice(0, 6).map((p) => (
                      <td key={p.id} className="py-2 px-3 text-right text-slate-700">
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
