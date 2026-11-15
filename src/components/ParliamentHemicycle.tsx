import React, { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';

interface ParliamentHemicycleProps {
  compact?: boolean;
  onInspectFullParliament?: () => void;
}

export const ParliamentHemicycle: React.FC<ParliamentHemicycleProps> = ({
  compact = false,
  onInspectFullParliament,
}) => {
  const {
    lang,
    parties,
    alliances,
    projection,
    baselineProjection,
  } = useElectionStore();

  const t = translations[lang];

  const { seatDots, orderedParties } = useMemo(() => {
    const activeParties = parties
      .filter((p) => (projection.partyTotalSeats[p.id] || 0) > 0)
      .sort((a, b) => (projection.partyTotalSeats[b.id] || 0) - (projection.partyTotalSeats[a.id] || 0));

    const totalSeats = Math.max(1, projection.totalSeatsAllocated || 600);
    const rows = 10;
    const rawCoords: { x: number; y: number; angle: number }[] = [];
    const rMin = 72;
    const rMax = 180;

    const radii = Array.from({ length: rows }, (_, i) => rMin + ((rMax - rMin) * i) / (rows - 1));
    const sumRadii = radii.reduce((a, b) => a + b, 0);
    let allocatedInRows = 0;
    const rowCounts = radii.map((r, i) => {
      if (i === rows - 1) return totalSeats - allocatedInRows;
      const c = Math.round((r / sumRadii) * totalSeats);
      allocatedInRows += c;
      return c;
    });

    radii.forEach((r, rowIdx) => {
      const count = rowCounts[rowIdx];
      for (let j = 0; j < count; j++) {
        const theta = Math.PI - (j + 0.5) * (Math.PI / Math.max(1, count));
        const x = 210 + r * Math.cos(theta);
        const y = 195 - r * Math.sin(theta);
        rawCoords.push({ x, y, angle: theta });
      }
    });

    rawCoords.sort((a, b) => b.angle - a.angle);

    const seatColors: { color: string; partyName: string }[] = [];
    for (const p of activeParties) {
      const sCount = projection.partyTotalSeats[p.id] || 0;
      for (let i = 0; i < sCount; i++) {
        seatColors.push({ color: p.color, partyName: p.shortName });
      }
    }

    const dots = rawCoords.map((pt, idx) => ({
      x: pt.x,
      y: pt.y,
      color: seatColors[idx]?.color || '#cbd5e1',
      partyName: seatColors[idx]?.partyName || '',
    }));

    return { seatDots: dots, orderedParties: activeParties };
  }, [parties, projection]);

  const totalSeats = projection.totalSeatsAllocated || 600;

  // COMPACT MODE: Sleek 600-MP Majority Bar + Top Party Seat Cards under the map
  if (compact) {
    return (
      <div className="editorial-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t.tbmmTitle}
            </h3>
          </div>
          {onInspectFullParliament && (
            <button
              onClick={onInspectFullParliament}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              <span>Meclis Hemicycle & İttifak Detayı</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Stacked 600-MP Bar with 301 / 360 / 400 Markers */}
        <div className="space-y-1.5">
          <div className="relative h-6 w-full bg-slate-100 rounded-lg overflow-hidden flex border border-slate-200">
            {orderedParties.map((p) => {
              const seats = projection.partyTotalSeats[p.id] || 0;
              const pct = (seats / totalSeats) * 100;
              if (pct <= 0) return null;
              return (
                <div
                  key={p.id}
                  style={{ width: `${pct}%`, backgroundColor: p.color }}
                  className="h-full border-r border-white/60 transition-all duration-200"
                  title={`${p.shortName}: ${seats} MV (%${pct.toFixed(1)})`}
                />
              );
            })}
            <div
              style={{ left: `${(301 / totalSeats) * 100}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
              title={t.simpleMajority}
            />
            <div
              style={{ left: `${(360 / totalSeats) * 100}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-slate-700/70 z-10"
              title={t.referendumMajority}
            />
            <div
              style={{ left: `${(400 / totalSeats) * 100}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-slate-700/70 z-10"
              title={t.constitutionalMajority}
            />
          </div>

          <div className="flex justify-between text-[11px] font-mono text-slate-500 px-0.5">
            <span>0 MV</span>
            <span className="font-semibold text-slate-800">▲ 301 Salt Çoğunluk</span>
            <span>▲ 360 Referandum</span>
            <span>▲ 400 Anayasa</span>
            <span>{totalSeats} MV</span>
          </div>
        </div>

        {/* Party Seat Pills Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
          {parties
            .filter((p) => !p.isOther)
            .slice(0, 7)
            .map((p) => {
              const seats = projection.partyTotalSeats[p.id] || 0;
              const baseSeats = baselineProjection.partyTotalSeats[p.id] || 0;
              const diff = seats - baseSeats;
              const share = projection.nationalPartyShares[p.id] || 0;
              const passed = projection.partyPassedThreshold[p.id];

              return (
                <div
                  key={p.id}
                  className="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-2 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-bold text-xs text-slate-900">{p.shortName}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      %{share.toFixed(1)}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span
                      className={`font-mono text-base font-extrabold ${
                        passed ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {seats} <span className="text-[10px] font-semibold text-slate-500">MV</span>
                    </span>
                    {diff !== 0 && (
                      <span
                        className={`font-mono text-[11px] font-semibold ${
                          diff > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  // FULL PARLIAMENT VIEW: Large Hemicycle + Alliance Cards + Full National Table
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 6 cols: Large 600-Seat Hemicycle & Alliance Cards */}
      <div className="lg:col-span-6 editorial-card p-6 flex flex-col justify-between gap-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t.tbmmTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              D’Hondt sistemi ve baraj kurallarına göre 87 seçim çevresi toplamı
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-900 text-white font-mono text-xs font-bold">
            {totalSeats} Milletvekili
          </span>
        </div>

        <div className="flex flex-col items-center py-2">
          <svg viewBox="0 0 420 215" className="w-full max-w-[460px] h-auto overflow-visible">
            <line
              x1="210"
              y1="10"
              x2="210"
              y2="138"
              stroke="#0f172a"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x="210"
              y="6"
              textAnchor="middle"
              className="fill-slate-700 font-sans font-bold text-[9px]"
            >
              301 SALT ÇOĞUNLUK
            </text>

            {seatDots.map((dot, idx) => (
              <circle
                key={idx}
                cx={dot.x}
                cy={dot.y}
                r={3.5}
                fill={dot.color}
                className="transition-colors duration-150"
              >
                <title>{dot.partyName}</title>
              </circle>
            ))}

            <text
              x="210"
              y="172"
              textAnchor="middle"
              className="fill-slate-900 font-sans text-2xl font-extrabold"
            >
              {totalSeats}
            </text>
            <text
              x="210"
              y="188"
              textAnchor="middle"
              className="fill-slate-500 font-sans text-[10px] font-semibold tracking-wider"
            >
              TBMM GENEL KURULU
            </text>
          </svg>
        </div>

        {/* Alliance Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {alliances.map((a) => {
            const seats = projection.allianceTotalSeats[a.id] || 0;
            const voteShare = projection.allianceShares[a.id] || 0;
            const passed = projection.alliancePassedThreshold[a.id];
            if (voteShare < 0.05 && seats === 0) return null;
            return (
              <div
                key={a.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between"
                style={{ borderTopColor: a.color, borderTopWidth: '3px' }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs text-slate-900 truncate">{a.shortName}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${
                      passed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    %{voteShare.toFixed(1)}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-mono text-lg font-extrabold text-slate-900">
                    {seats} MV
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    %{((seats / totalSeats) * 100).toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right 6 cols: Detailed National Party Results Table */}
      <div className="lg:col-span-6 editorial-card p-6 flex flex-col gap-4">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            Ulusal Oy Dağılımı & Milletvekili Tablosu
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Yurt içi ve yurt dışı toplam geçerli oylar, baraj durumu ve baz seçime göre sandalye farkları
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2.5 text-left">{t.partyCol}</th>
                <th className="py-2.5 text-center">Baraj</th>
                <th className="py-2.5 text-right">{t.voteShareCol}</th>
                <th className="py-2.5 text-right">{t.votesCol}</th>
                <th className="py-2.5 text-right">{t.seatsCol}</th>
                <th className="py-2.5 text-right">Meclis %</th>
                <th className="py-2.5 text-right">±Baz MV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {parties.map((p) => {
                const share = projection.nationalPartyShares[p.id] || 0;
                const votes = projection.nationalPartyVotes[p.id] || 0;
                const seats = projection.partyTotalSeats[p.id] || 0;
                const baseSeats = baselineProjection.partyTotalSeats[p.id] || 0;
                const seatDiff = seats - baseSeats;
                const passed = projection.partyPassedThreshold[p.id];

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 flex items-center gap-2 font-sans">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-bold text-slate-900">{p.shortName}</span>
                      <span className="text-slate-400 text-[11px] truncate max-w-[140px] hidden sm:inline">
                        {p.fullName}
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-sans">
                      {!p.isOther && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            passed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {passed ? 'Geçti' : 'Altında'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">
                      %{share.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right text-slate-600">
                      {votes.toLocaleString('tr-TR')}
                    </td>
                    <td className="py-2.5 text-right font-extrabold text-slate-900 text-sm">
                      {seats}
                    </td>
                    <td className="py-2.5 text-right text-slate-500">
                      %{((seats / totalSeats) * 100).toFixed(1)}
                    </td>
                    <td className="py-2.5 text-right font-semibold">
                      {seatDiff > 0 ? (
                        <span className="text-emerald-600">+{seatDiff}</span>
                      ) : seatDiff < 0 ? (
                        <span className="text-rose-600">{seatDiff}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
