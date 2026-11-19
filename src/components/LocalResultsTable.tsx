import React, { useEffect, useMemo, useState } from 'react';
import { useElectionStore } from '../store/useElectionStore';
import { formatInt, formatPct } from '../utils/format';

export const LocalResultsTable: React.FC = () => {
  const { lang, parties, activeScope, localProjection, localProvinceMode } = useElectionStore();
  const [forceNational, setForceNational] = useState(false);
  const refYear = localProjection.referenceYear ?? 2024;

  useEffect(() => {
    setForceNational(false);
  }, [activeScope]);

  const effectiveType = forceNational ? 'national' : activeScope.type;

  const scopedUnit = useMemo(() => {
    if (effectiveType === 'province' && activeScope.type === 'province') {
      const pRes = localProjection.provinceResults[activeScope.ilId];
      if (pRes) {
        const childWins: Record<string, number> = {};
        for (const ilceRes of Object.values(localProjection.ilceResults)) {
          if (ilceRes.ilId === pRes.id && ilceRes.winnerPartyId) {
            childWins[ilceRes.winnerPartyId] = (childWins[ilceRes.winnerPartyId] || 0) + 1;
          }
        }
        return {
          isScoped: true,
          kind: 'province' as const,
          title: `${pRes.plateCode} · ${pRes.name}`,
          subtitle: pRes.isBuyuksehir
            ? lang === 'tr'
              ? 'Büyükşehir Belediye Başkanlığı sonuçları'
              : 'Metropolitan Mayoral results'
            : lang === 'tr'
            ? 'İl Belediye Başkanlığı sonuçları'
            : 'Provincial Mayoral results',
          shares: pRes.partyShares,
          votes: pRes.partyVotes,
          validVotes: pRes.validVotes,
          turnout: pRes.turnout,
          winnerPartyId: pRes.winnerPartyId,
          childWins,
        };
      }
    }
    if (effectiveType === 'ilce' && activeScope.type === 'ilce') {
      const iRes = localProjection.ilceResults[activeScope.ilceId];
      if (iRes) {
        return {
          isScoped: true,
          kind: 'ilce' as const,
          title: `${iRes.name}`,
          subtitle:
            lang === 'tr'
              ? 'İlçe Belediye Başkanlığı sonuçları'
              : 'District Mayoral results',
          shares: iRes.partyShares,
          votes: iRes.partyVotes,
          validVotes: iRes.validVotes,
          turnout: iRes.turnout,
          winnerPartyId: iRes.winnerPartyId,
          childWins: {} as Record<string, number>,
        };
      }
    }
    return null;
  }, [effectiveType, activeScope, localProjection, lang]);

  const sortedParties = [...parties].sort((a, b) => {
    if (a.isOther) return 1;
    if (b.isOther) return -1;
    if (scopedUnit) {
      return (scopedUnit.shares[b.id] || 0) - (scopedUnit.shares[a.id] || 0);
    }
    const sA = localProjection.partySummaries[a.id];
    const sB = localProjection.partySummaries[b.id];
    if ((sB?.totalProvinceWins || 0) !== (sA?.totalProvinceWins || 0)) {
      return (sB?.totalProvinceWins || 0) - (sA?.totalProvinceWins || 0);
    }
    if ((sB?.ilceWins || 0) !== (sA?.ilceWins || 0)) {
      return (sB?.ilceWins || 0) - (sA?.ilceWins || 0);
    }
    return (sB?.nationalShare || 0) - (sA?.nationalShare || 0);
  });

  return (
    <div className="bg-white border-[1.5px] border-[#090A0F] overflow-hidden">
      <div className="px-5 py-3.5 border-b-[1.5px] border-[#090A0F] flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-heading font-semibold text-[#090A0F] tracking-tight">
            {scopedUnit
              ? scopedUnit.title
              : lang === 'tr'
              ? 'Yerel seçim oy dağılımı ve belediye başkanlıkları'
              : 'Local election shares & mayoral counts'}
          </h3>
          <p className="text-micro text-slate-500">
            {scopedUnit
              ? scopedUnit.subtitle
              : localProvinceMode === 'merkez_ilce'
              ? lang === 'tr'
                ? '51 ilde Merkez İlçe oyları, 30 büyükşehirde il toplamı esas alınır'
                : 'Merkez ilçe used in 51 provinces, province-wide in 30 metropolitans'
              : lang === 'tr'
              ? 'Tüm 81 ilde il geneli oy toplamı esas alınır'
              : 'Province-wide totals used across all 81 provinces'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-micro font-mono text-slate-600 tabular-nums">
            {lang === 'tr' ? 'Geçerli oy:' : 'Valid votes:'}{' '}
            <strong className="text-[#090A0F]">
              {formatInt(scopedUnit ? scopedUnit.validVotes : localProjection.totalValidVotes, lang)}
            </strong>
            {' · '}
            {lang === 'tr' ? 'Katılım:' : 'Turnout:'}{' '}
            <strong className="text-[#090A0F]">
              {formatPct(scopedUnit ? scopedUnit.turnout : localProjection.turnout, lang, 1)}
            </strong>
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
            {scopedUnit ? (
              <tr className="border-b border-slate-300 bg-slate-50 text-micro text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-4 text-left">{lang === 'tr' ? 'Parti' : 'Party'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'tr' ? 'Oy %' : 'Share %'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'tr' ? 'Geçerli Oy' : 'Votes'}</th>
                {scopedUnit.kind === 'province' && (
                  <th className="py-2.5 px-3 text-right">{lang === 'tr' ? 'İlçe Bel.' : 'District Wins'}</th>
                )}
                <th className="py-2.5 px-4 text-right">{lang === 'tr' ? 'Durum' : 'Status'}</th>
              </tr>
            ) : (
              <tr className="border-b border-slate-300 bg-slate-50 text-micro text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-4 text-left">{lang === 'tr' ? 'Parti' : 'Party'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'tr' ? 'Yerel Oy %' : 'Share %'}</th>
                <th className="py-2.5 px-3 text-right hidden sm:table-cell">
                  {lang === 'tr' ? 'Büyükşehir (30)' : 'Metro (30)'}
                </th>
                <th className="py-2.5 px-3 text-right hidden sm:table-cell">
                  {lang === 'tr' ? 'İl Merkezi (51)' : 'Prov Center (51)'}
                </th>
                <th className="py-2.5 px-3 text-right">
                  {lang === 'tr' ? 'Toplam İl (81)' : 'Total Prov (81)'}
                </th>
                <th className="py-2.5 px-3 text-right">
                  {localProjection.referenceBaseline === 'current'
                    ? lang === 'tr'
                      ? '±Mevcut İl'
                      : '±Cur Prov'
                    : lang === 'tr'
                    ? `±${refYear} İl`
                    : `±${refYear} Prov`}
                </th>
                <th className="py-2.5 px-3 text-right">{lang === 'tr' ? 'İlçe (973)' : 'Dist (973)'}</th>
                <th className="py-2.5 px-4 text-right">
                  {localProjection.referenceBaseline === 'current'
                    ? lang === 'tr'
                      ? '±Mevcut İlçe'
                      : '±Cur Dist'
                    : lang === 'tr'
                    ? `±${refYear} İlçe`
                    : `±${refYear} Dist`}
                </th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedParties.map((p) => {
              if (scopedUnit) {
                const sh = scopedUnit.shares[p.id] || 0;
                const vt = scopedUnit.votes[p.id] || 0;
                const isWinner = scopedUnit.winnerPartyId === p.id;
                const ilceWinCnt = scopedUnit.childWins[p.id] || 0;
                return (
                  <tr key={p.id} className={isWinner ? 'bg-slate-50/80' : 'hover:bg-slate-50/70'}>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        {p.logoUrl ? (
                          <div
                            className="w-4 h-4 shrink-0"
                            style={{
                              backgroundColor: p.color,
                              WebkitMaskImage: `url(${import.meta.env.BASE_URL}${p.logoUrl})`,
                              maskImage: `url(${import.meta.env.BASE_URL}${p.logoUrl})`,
                              WebkitMaskSize: 'contain',
                              maskSize: 'contain',
                              WebkitMaskRepeat: 'no-repeat',
                              maskRepeat: 'no-repeat',
                              WebkitMaskPosition: 'center',
                              maskPosition: 'center',
                            }}
                          />
                        ) : (
                          <span
                            className="w-2.5 h-2.5 shrink-0 border border-[#090A0F]"
                            style={{ backgroundColor: p.color }}
                          />
                        )}
                        <span className="font-semibold text-[#090A0F]">{p.shortName}</span>
                        <span className="text-micro text-slate-500 hidden md:inline truncate max-w-[170px]">
                          {p.fullName}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums">
                      {formatPct(sh, lang, 2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                      {formatInt(vt, lang)}
                    </td>
                    {scopedUnit.kind === 'province' && (
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">
                        {ilceWinCnt}
                      </td>
                    )}
                    <td className="py-2 px-4 text-right">
                      {isWinner ? (
                        <span className="inline-block px-2 py-0.5 text-micro font-mono font-bold bg-emerald-400 text-[#090A0F] border border-[#090A0F]">
                          {lang === 'tr' ? 'KAZANDI' : 'WINNER'}
                        </span>
                      ) : (
                        <span className="text-micro text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              }
              const s = localProjection.partySummaries[p.id];
              if (!s) return null;
              return (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      {p.logoUrl ? (
                        <div
                          className="w-4 h-4 shrink-0"
                          style={{
                            backgroundColor: p.color,
                            WebkitMaskImage: `url(${import.meta.env.BASE_URL}${p.logoUrl})`,
                            maskImage: `url(${import.meta.env.BASE_URL}${p.logoUrl})`,
                            WebkitMaskSize: 'contain',
                            maskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat',
                            maskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center',
                            maskPosition: 'center',
                          }}
                        />
                      ) : (
                        <span
                          className="w-2.5 h-2.5 shrink-0 border border-[#090A0F]"
                          style={{ backgroundColor: p.color }}
                        />
                      )}
                      <span className="font-semibold text-[#090A0F]">{p.shortName}</span>
                      <span className="text-micro text-slate-500 hidden md:inline truncate max-w-[170px]">
                        {p.fullName}
                      </span>
                    </div>
                  </td>

                  <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums">
                    {formatPct(s.nationalShare, lang, 2)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums hidden sm:table-cell">
                    {s.buyuksehirWins}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums hidden sm:table-cell">
                    {s.ilMerkezWins}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-[#090A0F]">
                    {s.totalProvinceWins}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums">
                    <span
                      className={
                        s.deltaProvinceFrom2024 > 0
                          ? 'text-emerald-700'
                          : s.deltaProvinceFrom2024 < 0
                          ? 'text-rose-700'
                          : 'text-slate-400'
                      }
                    >
                      {s.deltaProvinceFrom2024 > 0
                        ? `+${s.deltaProvinceFrom2024}`
                        : s.deltaProvinceFrom2024 === 0
                        ? '0'
                        : s.deltaProvinceFrom2024}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">
                    {s.ilceWins}
                  </td>
                  <td className="py-2 px-4 text-right font-mono font-semibold tabular-nums">
                    <span
                      className={
                        s.deltaIlceFrom2024 > 0
                          ? 'text-emerald-700'
                          : s.deltaIlceFrom2024 < 0
                          ? 'text-rose-700'
                          : 'text-slate-400'
                      }
                    >
                      {s.deltaIlceFrom2024 > 0
                        ? `+${s.deltaIlceFrom2024}`
                        : s.deltaIlceFrom2024 === 0
                        ? '0'
                        : s.deltaIlceFrom2024}
                    </span>
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
