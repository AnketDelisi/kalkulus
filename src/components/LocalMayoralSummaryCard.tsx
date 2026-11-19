import React from 'react';
import { Building2, MapPin } from 'lucide-react';
import { useElectionStore } from '../store/useElectionStore';

export const LocalMayoralSummaryCard: React.FC = () => {
  const { lang, parties, localProjection, localProvinceMode, localDefections } =
    useElectionStore();
  const refYear = localProjection.referenceYear ?? 2024;

  const orderedParties = parties
    .filter((p) => !p.isOther)
    .map((p) => ({
      party: p,
      summary: localProjection.partySummaries[p.id],
    }))
    .filter((x) => x.summary && (x.summary.totalProvinceWins > 0 || x.summary.ilceWins > 0))
    .sort((a, b) => {
      if (b.summary.totalProvinceWins !== a.summary.totalProvinceWins) {
        return b.summary.totalProvinceWins - a.summary.totalProvinceWins;
      }
      return b.summary.ilceWins - a.summary.ilceWins;
    });

  return (
    <div className="bg-white border-[1.5px] border-[#090A0F] overflow-hidden">
      <div className="px-4 py-3 border-b-[1.5px] border-[#090A0F] flex items-center justify-between gap-2">
        <div>
          <h3 className="text-heading font-semibold text-[#090A0F] tracking-tight">
            {lang === 'tr' ? 'Belediye başkanlıkları özeti' : 'Mayoral summary'}
          </h3>
          <p className="text-micro text-slate-600">
            {localProvinceMode === 'merkez_ilce'
              ? lang === 'tr'
                ? '30 Büyükşehir (İl) + 51 İl (Merkez İlçe) + 973 İlçe'
                : '30 Metropolitan + 51 Merkez + 973 Districts'
              : lang === 'tr'
              ? '81 İl (İl Geneli) + 973 İlçe'
              : '81 Provinces (Wide) + 973 Districts'}
            {' · '}
            <span className="font-semibold text-[#090A0F]">
              {localDefections.referenceBaseline === 'current'
                ? lang === 'tr'
                  ? `Baz: Mevcut Yönetim${localDefections.includeKayyim ? ' (+Kayyım)' : ''}`
                  : `Ref: Current Control${localDefections.includeKayyim ? ' (+Trustees)' : ''}`
                : lang === 'tr'
                ? `Baz: 31 Mart ${refYear}`
                : `Ref: March ${refYear}`}
            </span>
          </p>
        </div>

        <span className="px-2 py-1 text-micro font-mono font-bold bg-[#090A0F] text-white shrink-0">
          81 İL / 973 İLÇE
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* 81 İl Bar (30 BB + 51 İl) */}
        <div>
          <div className="flex items-center justify-between text-micro mb-1">
            <span className="font-semibold text-[#090A0F] flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              {lang === 'tr' ? '81 İl Belediyesi (30 BB + 51 İl)' : '81 Provincial Mayoralties'}
            </span>
            <span className="font-mono text-slate-500 tabular-nums">
              {localProjection.flippedProvinceIds.length}{' '}
              {lang === 'tr' ? 'el değiştirme' : 'flips'}
            </span>
          </div>

          <div className="h-5 border border-[#090A0F] flex overflow-hidden bg-slate-100">
            {orderedParties.map(({ party, summary }) => {
              if (summary.totalProvinceWins <= 0) return null;
              return (
                <div
                  key={party.id}
                  style={{
                    width: `${(summary.totalProvinceWins / 81) * 100}%`,
                    backgroundColor: party.color,
                  }}
                  title={`${party.shortName}: ${summary.totalProvinceWins} il (${summary.buyuksehirWins} BB + ${summary.ilMerkezWins} İl)`}
                />
              );
            })}
          </div>
        </div>

        {/* 973 İlçe Bar */}
        <div>
          <div className="flex items-center justify-between text-micro mb-1">
            <span className="font-semibold text-[#090A0F] flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {lang === 'tr' ? '973 İlçe Belediyesi' : '973 District Mayoralties'}
            </span>
            <span className="font-mono text-slate-500 tabular-nums">
              {localProjection.flippedIlceIds.length} {lang === 'tr' ? 'el değiştirme' : 'flips'}
            </span>
          </div>

          <div className="h-4 border border-[#090A0F] flex overflow-hidden bg-slate-100">
            {orderedParties.map(({ party, summary }) => {
              if (summary.ilceWins <= 0) return null;
              return (
                <div
                  key={party.id}
                  style={{
                    width: `${(summary.ilceWins / 973) * 100}%`,
                    backgroundColor: party.color,
                  }}
                  title={`${party.shortName}: ${summary.ilceWins} ilçe`}
                />
              );
            })}
          </div>
        </div>

        {/* Compact Scorecard per winning party */}
        <div className="divide-y divide-slate-200 border-t border-slate-200 pt-1">
          {orderedParties.map(({ party, summary }) => {
            const deltaProv = summary.deltaProvinceFrom2024;
            return (
              <div
                key={party.id}
                className="py-1.5 flex items-center justify-between text-body tabular-nums"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 shrink-0 border border-[#090A0F]"
                    style={{ backgroundColor: party.color }}
                  />
                  <span className="font-semibold text-[#090A0F]">{party.shortName}</span>
                  <span className="text-micro font-mono text-slate-500">
                    ({summary.buyuksehirWins} BB + {summary.ilMerkezWins} İl)
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-micro">
                  <span className="font-bold text-[#090A0F] text-body">
                    {summary.totalProvinceWins} {lang === 'tr' ? 'İl' : 'Prov'}
                  </span>
                  <span
                    className={`w-8 text-right font-semibold ${
                      deltaProv > 0
                        ? 'text-emerald-700'
                        : deltaProv < 0
                        ? 'text-rose-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {deltaProv > 0 ? `+${deltaProv}` : deltaProv === 0 ? '0' : deltaProv}
                  </span>
                  <span className="text-slate-600 w-16 text-right">
                    {summary.ilceWins} {lang === 'tr' ? 'ilçe' : 'dist'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
