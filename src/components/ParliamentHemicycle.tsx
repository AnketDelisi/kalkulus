import React, { useMemo } from 'react';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { formatInt, formatPct } from '../utils/format';

const PARLIAMENT_ORDER = [
  'TIP',
  'DEM',
  'YENI',
  'CHP',
  'IYI',
  'SAADET',
  'ZP',
  'A',
  'AKP',
  'MHP',
  'YRP',
  'BBP',
];

export const ParliamentHemicycle: React.FC = () => {
  const { lang, parties, projection } = useElectionStore();

  const t = translations[lang];

  const { seatDots } = useMemo(() => {
    const activeParties = parties
      .filter((p) => (projection.partyTotalSeats[p.id] || 0) > 0)
      .sort((a, b) => {
        const idxA = PARLIAMENT_ORDER.indexOf(a.id);
        const idxB = PARLIAMENT_ORDER.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (projection.partyTotalSeats[b.id] || 0) - (projection.partyTotalSeats[a.id] || 0);
      });

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

    return { seatDots: dots };
  }, [parties, projection]);

  const totalSeats = projection.totalSeatsAllocated || 600;

  return (
    <div className="studio-panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b-[1.5px] border-[#090A0F] pb-3">
        <div>
          <div className="eyebrow">
            {lang === 'tr' ? 'Meclis' : 'Parliament'}
          </div>
          <h2 className="text-heading font-bold text-[#090A0F]">
            {t.tbmmTitle}
          </h2>
        </div>
        <span className="px-3 py-1 bg-[#090A0F] text-white text-body font-bold">
          {totalSeats} {lang === 'tr' ? 'MV' : 'MPs'}
        </span>
      </div>

      <div className="flex flex-col items-center py-2 studio-map-grid border border-[#090A0F]/15 p-4">
        <svg viewBox="0 0 420 205" className="w-full h-auto overflow-visible">
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
            className="fill-[#090A0F] font-medium text-micro"
          >
            {lang === 'tr' ? '301 salt çoğunluk' : '301 majority'}
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
            y="182"
            textAnchor="middle"
            className="fill-[#090A0F] text-hero font-bold"
          >
            {totalSeats}
          </text>
        </svg>
      </div>
    </div>
  );
};

export const NationalResultsTable: React.FC = () => {
  const { lang, parties, projection, baselineProjection } = useElectionStore();
  const t = translations[lang];
  const totalSeats = projection.totalSeatsAllocated || 600;

  return (
    <div className="studio-panel p-5 flex flex-col gap-4">
      <div className="border-b-[1.5px] border-[#090A0F] pb-3">
        <div className="eyebrow">
          {lang === 'tr' ? 'Ulusal sonuçlar' : 'National results'}
        </div>
        <h2 className="text-heading font-bold text-[#090A0F]">
          {lang === 'tr' ? 'Ulusal oy dağılımı ve milletvekili tablosu' : 'National vote share and seat table'}
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-body border-collapse">
          <thead>
            <tr className="border-b-[1.5px] border-[#090A0F] bg-[#F4F5F7] text-[#090A0F] text-micro font-bold">
              <th className="py-2.5 px-2 text-left">{t.partyCol}</th>
              <th className="py-2.5 px-2 text-right">{t.voteShareCol}</th>
              <th className="py-2.5 px-2 text-right">{t.votesCol}</th>
              <th className="py-2.5 px-2 text-right">{t.seatsCol}</th>
              <th className="py-2.5 px-2 text-right">{lang === 'tr' ? 'Meclis %' : 'Seat %'}</th>
              <th className="py-2.5 px-2 text-right">{lang === 'tr' ? '±Baz' : '±Base'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#090A0F]/15">
            {parties.map((p) => {
              const share = projection.nationalPartyShares[p.id] || 0;
              const votes = projection.nationalPartyVotes[p.id] || 0;
              const seats = projection.partyTotalSeats[p.id] || 0;
              const baseSeats = baselineProjection.partyTotalSeats[p.id] || 0;
              const seatDiff = seats - baseSeats;

              return (
                <tr key={p.id} className="hover:bg-[#F4F5F7] transition-colors">
                  <td className="py-2.5 px-2 flex items-center gap-2">
                    {p.logoUrl ? (
                      <img
                        src={p.logoUrl}
                        alt={p.shortName}
                        className="w-4 h-4 object-contain shrink-0"
                      />
                    ) : (
                      <span
                        className="w-3 h-3 border border-[#090A0F] shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                    )}
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-bold text-[#090A0F]">{p.shortName}</span>
                    <span className="text-slate-500 text-micro truncate max-w-[180px] hidden sm:inline">
                      {p.fullName}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-[#090A0F]">
                    {formatPct(share, lang, 2)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-600">
                    {formatInt(votes, lang)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-[#090A0F] text-title">
                    {seats}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-500">
                    {formatPct((seats / totalSeats) * 100, lang, 1)}
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
  );
};
