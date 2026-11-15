import React, { useMemo } from 'react';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';

export const ParliamentHemicycle: React.FC = () => {
  const {
    lang,
    parties,
    alliances,
    projection,
    baselineProjection,
  } = useElectionStore();

  const t = translations[lang];

  // Generate 600 seat dots arranged in semi-circular parliament rows
  const { seatDots, orderedParties } = useMemo(() => {
    const activeParties = parties
      .filter((p) => (projection.partyTotalSeats[p.id] || 0) > 0)
      .sort((a, b) => (projection.partyTotalSeats[b.id] || 0) - (projection.partyTotalSeats[a.id] || 0));

    const totalSeats = Math.max(1, projection.totalSeatsAllocated || 600);

    // Create 10 concentric semi-circular arcs holding exactly totalSeats dots
    const rows = 10;
    const rawCoords: { x: number; y: number; angle: number }[] = [];
    const rMin = 68;
    const rMax = 175;

    // Calculate row capacities proportional to arc length
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
        const x = 200 + r * Math.cos(theta);
        const y = 190 - r * Math.sin(theta);
        rawCoords.push({ x, y, angle: theta });
      }
    });

    // Sort seats from left to right (angle PI down to 0) so each party's bloc sits together cleanly
    rawCoords.sort((a, b) => b.angle - a.angle);

    // Expand party seat list
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
      color: seatColors[idx]?.color || '#334155',
      partyName: seatColors[idx]?.partyName || '',
    }));

    return { seatDots: dots, orderedParties: activeParties };
  }, [parties, projection]);

  const totalSeats = projection.totalSeatsAllocated || 600;

  return (
    <div className="pixel-box p-3 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
        <h2 className="font-pixel text-xs tracking-wider text-amber-400">
          {t.tbmmTitle}
        </h2>
        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-200">
          {totalSeats} MV
        </span>
      </div>

      {/* SVG 600-Seat Pixel Hemicycle */}
      <div className="relative flex flex-col items-center bg-slate-950/80 border-2 border-slate-800 p-2">
        <svg viewBox="0 0 400 205" className="w-full max-w-[380px] h-auto overflow-visible">
          {/* Majority guide line at 50% (300/301 MPs) */}
          <line
            x1="200"
            y1="8"
            x2="200"
            y2="132"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <text
            x="200"
            y="6"
            textAnchor="middle"
            className="fill-amber-400 font-pixel text-[8px]"
          >
            301 SALT ÇOĞUNLUK
          </text>

          {/* 600 Pixel Square Seats */}
          {seatDots.map((dot, idx) => (
            <rect
              key={idx}
              x={dot.x - 3.2}
              y={dot.y - 3.2}
              width={6.4}
              height={6.4}
              fill={dot.color}
              stroke="#090d16"
              strokeWidth="0.8"
            >
              <title>{dot.partyName}</title>
            </rect>
          ))}

          {/* Center Podium Total */}
          <text
            x="200"
            y="168"
            textAnchor="middle"
            className="fill-slate-100 font-pixel text-lg font-bold"
          >
            {totalSeats}
          </text>
          <text
            x="200"
            y="184"
            textAnchor="middle"
            className="fill-slate-400 font-mono text-[10px]"
          >
            TBMM GENEL KURULU
          </text>
        </svg>

        {/* Stacked Majority Bar with 301 / 360 / 400 Markers */}
        <div className="w-full mt-2 space-y-1">
          <div className="relative h-5 w-full bg-slate-900 border-2 border-slate-700 flex overflow-hidden">
            {orderedParties.map((p) => {
              const seats = projection.partyTotalSeats[p.id] || 0;
              const pct = (seats / totalSeats) * 100;
              if (pct <= 0) return null;
              return (
                <div
                  key={p.id}
                  style={{ width: `${pct}%`, backgroundColor: p.color }}
                  className="h-full border-r border-slate-950 transition-all duration-150"
                  title={`${p.shortName}: ${seats} MV`}
                />
              );
            })}
            {/* Threshold tick lines on the 600-seat bar */}
            <div
              style={{ left: `${(301 / totalSeats) * 100}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-amber-300 z-10"
              title={t.simpleMajority}
            />
            <div
              style={{ left: `${(360 / totalSeats) * 100}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-300 z-10"
              title={t.referendumMajority}
            />
            <div
              style={{ left: `${(400 / totalSeats) * 100}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-emerald-300 z-10"
              title={t.constitutionalMajority}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400 px-0.5">
            <span>0</span>
            <span className="text-amber-400 font-semibold">▲301 Salt</span>
            <span className="text-cyan-400 font-semibold">▲360 Ref.</span>
            <span className="text-emerald-400 font-semibold">▲400 Anayasa</span>
            <span>{totalSeats}</span>
          </div>
        </div>
      </div>

      {/* Alliance Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {alliances.map((a) => {
          const seats = projection.allianceTotalSeats[a.id] || 0;
          const voteShare = projection.allianceShares[a.id] || 0;
          const passed = projection.alliancePassedThreshold[a.id];
          if (voteShare < 0.05 && seats === 0) return null;
          return (
            <div
              key={a.id}
              className="bg-slate-900/90 border-2 border-slate-800 px-2 py-1.5 flex flex-col justify-between"
              style={{ borderLeftColor: a.color, borderLeftWidth: '4px' }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-pixel text-[10px] text-slate-200 truncate">
                  {a.shortName}
                </span>
                <span
                  className={`text-[9px] px-1 font-mono font-bold ${
                    passed ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                  }`}
                >
                  {voteShare.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono text-sm font-bold text-white">{seats} MV</span>
                <span className="text-[10px] font-mono text-slate-400">
                  {((seats / totalSeats) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact Party Seat & Vote Share Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-800 text-slate-400 font-mono text-[11px]">
              <th className="py-1.5 text-left">{t.partyCol}</th>
              <th className="py-1.5 text-right">{t.voteShareCol}</th>
              <th className="py-1.5 text-right">{t.votesCol}</th>
              <th className="py-1.5 text-right">{t.seatsCol}</th>
              <th className="py-1.5 text-right">±Baz</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 font-mono">
            {parties.map((p) => {
              const share = projection.nationalPartyShares[p.id] || 0;
              const votes = projection.nationalPartyVotes[p.id] || 0;
              const seats = projection.partyTotalSeats[p.id] || 0;
              const baseSeats = baselineProjection.partyTotalSeats[p.id] || 0;
              const seatDiff = seats - baseSeats;
              const passed = projection.partyPassedThreshold[p.id];

              return (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="py-1.5 flex items-center gap-2">
                    <span
                      className="w-3 h-3 shrink-0 border border-slate-950"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-sans font-bold text-slate-100">{p.shortName}</span>
                    {!p.isOther && (
                      <span
                        className={`text-[9px] px-1 py-0.2 border ${
                          passed
                            ? 'border-emerald-700/70 bg-emerald-950/60 text-emerald-300'
                            : 'border-rose-800/70 bg-rose-950/60 text-rose-400'
                        }`}
                      >
                        {passed ? '✓' : '✕'}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-right font-semibold text-slate-200">
                    %{share.toFixed(2)}
                  </td>
                  <td className="py-1.5 text-right text-slate-400">
                    {votes.toLocaleString('tr-TR')}
                  </td>
                  <td className="py-1.5 text-right font-bold text-amber-400 text-sm">
                    {seats}
                  </td>
                  <td className="py-1.5 text-right">
                    {seatDiff > 0 ? (
                      <span className="text-emerald-400 font-bold">+{seatDiff}</span>
                    ) : seatDiff < 0 ? (
                      <span className="text-rose-400 font-bold">{seatDiff}</span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
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
