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
      color: seatColors[idx]?.color || '#D4D6DC',
      partyName: seatColors[idx]?.partyName || '',
    }));

    return { seatDots: dots, orderedParties: activeParties };
  }, [parties, projection]);

  const totalSeats = projection.totalSeatsAllocated || 600;

  // COMPACT MODE: Sleek 600-MP Majority Bar + Top Party Seat Cards under the map
  if (compact) {
    return (
      <div className="studio-panel studio-crosshair p-4 flex flex-col gap-3.5">
        <div className="flex items-center justify-between border-b border-[#090A0F]/15 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#090A0F]" />
            <h3 className="font-display text-xs font-bold uppercase tracking-widest text-[#090A0F]">
              {t.tbmmTitle}
            </h3>
          </div>
          {onInspectFullParliament && (
            <button
              onClick={onInspectFullParliament}
              className="studio-btn px-2.5 py-1 text-[11px] uppercase tracking-wider"
            >
              <span>MECLİS HEMICYCLE & İTTİFAKLAR</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Stacked 600-MP Bar with 301 / 360 / 400 Markers */}
        <div className="space-y-1.5">
          <div className="relative h-7 w-full bg-[#ECEEF2] overflow-hidden flex border-[1.5px] border-[#090A0F]">
            {orderedParties.map((p) => {
              const seats = projection.partyTotalSeats[p.id] || 0;
              const pct = (seats / totalSeats) * 100;
              if (pct <= 0) return null;
              return (
                <div
                  key={p.id}
                  style={{ width: `${pct}%`, backgroundColor: p.color }}
                  className="h-full border-r border-[#090A0F]/40 transition-all duration-200"
                  title={`${p.shortName}: ${seats} MV (%${pct.toFixed(1)})`}
                />
              );
            })}
            <div
              style={{ left: `${(301 / totalSeats) * 100}%` }}
              className="absolute top-0 bottom-0 w-[2px] bg-[#090A0F] z-10"
              title={t.simpleMajority}
            />
            <div
              style={{ left: `${(360 / totalSeats) * 100}%` }}
              className="absolute top-0 bottom-0 w-[1.5px] bg-[#090A0F]/70 z-10"
              title={t.referendumMajority}
            />
            <div
              style={{ left: `${(400 / totalSeats) * 100}%` }}
              className="absolute top-0 bottom-0 w-[1.5px] bg-[#090A0F]/70 z-10"
              title={t.constitutionalMajority}
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-slate-600 px-0.5">
            <span>0 MV</span>
            <span className="font-bold text-[#090A0F]">▲ 301 SALT ÇOĞUNLUK</span>
            <span>▲ 360 REFERANDUM</span>
            <span>▲ 400 ANAYASA</span>
            <span className="font-bold text-[#090A0F]">{totalSeats} MV</span>
          </div>
        </div>

        {/* Party Seat Blocks Row */}
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
                  className="bg-[#F9FAFB] border-[1.5px] border-[#090A0F] px-2.5 py-2 flex flex-col justify-between"
                  style={{ borderTopWidth: '4px', borderTopColor: p.color }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display font-bold text-xs text-[#090A0F]">
                      {p.shortName}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      %{share.toFixed(1)}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span
                      className={`font-mono text-base font-bold ${
                        passed ? 'text-[#090A0F]' : 'text-slate-400'
                      }`}
                    >
                      {seats} <span className="text-[10px] font-normal text-slate-500">MV</span>
                    </span>
                    {diff !== 0 && (
                      <span
                        className={`font-mono text-[10px] font-bold px-1 py-0.5 ${
                          diff > 0
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'bg-rose-950 text-rose-300'
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left 6 cols: Large 600-Seat Hemicycle & Alliance Cards */}
      <div className="lg:col-span-6 studio-panel studio-crosshair p-5 flex flex-col justify-between gap-6">
        <div className="flex items-center justify-between border-b-[1.5px] border-[#090A0F] pb-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              PARLAMENTO SİMÜLASYONU // D&apos;HONDT
            </div>
            <h2 className="font-display text-base font-bold uppercase tracking-tight text-[#090A0F]">
              {t.tbmmTitle}
            </h2>
          </div>
          <span className="px-3 py-1 bg-[#090A0F] text-white font-mono text-xs font-bold uppercase tracking-wider">
            {totalSeats} MV
          </span>
        </div>

        <div className="flex flex-col items-center py-2 studio-map-grid border border-[#090A0F]/15 p-4">
          <svg viewBox="0 0 420 215" className="w-full max-w-[460px] h-auto overflow-visible">
            <line
              x1="210"
              y1="10"
              x2="210"
              y2="138"
              stroke="#090A0F"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <text
              x="210"
              y="6"
              textAnchor="middle"
              className="fill-[#090A0F] font-mono font-bold text-[9px]"
            >
              301 SALT ÇOĞUNLUK
            </text>

            {seatDots.map((dot, idx) => (
              <rect
                key={idx}
                x={dot.x - 3.2}
                y={dot.y - 3.2}
                width={6.4}
                height={6.4}
                fill={dot.color}
                stroke="#090A0F"
                strokeWidth="0.4"
                className="transition-colors duration-150"
              >
                <title>{dot.partyName}</title>
              </rect>
            ))}

            <text
              x="210"
              y="172"
              textAnchor="middle"
              className="fill-[#090A0F] font-mono text-2xl font-bold"
            >
              {totalSeats}
            </text>
            <text
              x="210"
              y="188"
              textAnchor="middle"
              className="fill-slate-600 font-mono text-[10px] font-bold tracking-widest"
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
                className="bg-[#F9FAFB] border-[1.5px] border-[#090A0F] p-3 flex flex-col justify-between"
                style={{ borderTopColor: a.color, borderTopWidth: '4px' }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-display font-bold text-xs text-[#090A0F] uppercase truncate">
                    {a.shortName}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 font-mono font-bold ${
                      passed
                        ? 'bg-[#090A0F] text-emerald-300'
                        : 'bg-rose-950 text-rose-300'
                    }`}
                  >
                    %{voteShare.toFixed(1)}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-mono text-lg font-bold text-[#090A0F]">
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
      <div className="lg:col-span-6 studio-panel studio-crosshair p-5 flex flex-col gap-4">
        <div className="border-b-[1.5px] border-[#090A0F] pb-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            ULUSAL TELEMETRİ MATRİSİ
          </div>
          <h2 className="font-display text-base font-bold uppercase tracking-tight text-[#090A0F]">
            Ulusal Oy Dağılımı & Milletvekili Tablosu
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-[1.5px] border-[#090A0F] bg-[#F4F5F7] text-[#090A0F] font-mono uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-2 text-left">{t.partyCol}</th>
                <th className="py-2.5 px-2 text-center">BARAJ</th>
                <th className="py-2.5 px-2 text-right">{t.voteShareCol}</th>
                <th className="py-2.5 px-2 text-right">{t.votesCol}</th>
                <th className="py-2.5 px-2 text-right">{t.seatsCol}</th>
                <th className="py-2.5 px-2 text-right">MECLİS %</th>
                <th className="py-2.5 px-2 text-right">±BAZ MV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#090A0F]/15 font-mono">
              {parties.map((p) => {
                const share = projection.nationalPartyShares[p.id] || 0;
                const votes = projection.nationalPartyVotes[p.id] || 0;
                const seats = projection.partyTotalSeats[p.id] || 0;
                const baseSeats = baselineProjection.partyTotalSeats[p.id] || 0;
                const seatDiff = seats - baseSeats;
                const passed = projection.partyPassedThreshold[p.id];

                return (
                  <tr key={p.id} className="hover:bg-[#F4F5F7] transition-colors">
                    <td className="py-2.5 px-2 flex items-center gap-2 font-sans">
                      <span
                        className="w-3 h-3 border border-[#090A0F] shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-display font-bold text-[#090A0F]">{p.shortName}</span>
                      <span className="text-slate-500 text-[11px] truncate max-w-[140px] hidden sm:inline">
                        {p.fullName}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {!p.isOther && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 font-mono font-bold uppercase ${
                            passed
                              ? 'bg-[#090A0F] text-emerald-300'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {passed ? 'GEÇTİ' : 'ALTI'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#090A0F]">
                      %{share.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-600">
                      {votes.toLocaleString('tr-TR')}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#090A0F] text-sm">
                      {seats}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-500">
                      %{((seats / totalSeats) * 100).toFixed(1)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold">
                      {seatDiff > 0 ? (
                        <span className="text-emerald-700">+{seatDiff}</span>
                      ) : seatDiff < 0 ? (
                        <span className="text-rose-700">{seatDiff}</span>
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
