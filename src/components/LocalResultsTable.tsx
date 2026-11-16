import React from 'react';
import { useElectionStore } from '../store/useElectionStore';
import { formatInt, formatPct } from '../utils/format';

export const LocalResultsTable: React.FC = () => {
  const { lang, parties, localProjection, localProvinceMode } = useElectionStore();

  const sortedParties = [...parties].sort((a, b) => {
    if (a.isOther) return 1;
    if (b.isOther) return -1;
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
            {lang === 'tr'
              ? 'Yerel seçim oy dağılımı ve belediye başkanlıkları'
              : 'Local election shares & mayoral counts'}
          </h3>
          <p className="text-micro text-slate-500">
            {localProvinceMode === 'merkez_ilce'
              ? lang === 'tr'
                ? '51 ilde Merkez İlçe oyları, 30 büyükşehirde il toplamı esas alınır'
                : 'Merkez ilçe used in 51 provinces, province-wide in 30 metropolitans'
              : lang === 'tr'
              ? 'Tüm 81 ilde il geneli oy toplamı esas alınır'
              : 'Province-wide totals used across all 81 provinces'}
          </p>
        </div>

        <div className="text-micro font-mono text-slate-600 tabular-nums">
          {lang === 'tr' ? 'Geçerli oy:' : 'Valid votes:'}{' '}
          <strong className="text-[#090A0F]">{formatInt(localProjection.totalValidVotes, lang)}</strong>
          {' · '}
          {lang === 'tr' ? 'Katılım:' : 'Turnout:'}{' '}
          <strong className="text-[#090A0F]">{formatPct(localProjection.turnout, lang, 1)}</strong>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-body">
          <thead>
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
                  ? '±2024 İl'
                  : '±2024 Prov'}
              </th>
              <th className="py-2.5 px-3 text-right">{lang === 'tr' ? 'İlçe (973)' : 'Dist (973)'}</th>
              <th className="py-2.5 px-4 text-right">
                {localProjection.referenceBaseline === 'current'
                  ? lang === 'tr'
                    ? '±Mevcut İlçe'
                    : '±Cur Dist'
                  : lang === 'tr'
                  ? '±2024 İlçe'
                  : '±2024 Dist'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedParties.map((p) => {
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
