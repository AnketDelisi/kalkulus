import React, { useMemo, useState } from 'react';
import { OFFICIAL_2023_NATIONAL_SEATS } from '../data/official2023Seats';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { getContrastTextColor } from '../utils/color';
import { formatInt, formatPct } from '../utils/format';
import { computeHemicycleSeats } from '../utils/hemicycleGeometry';

export const ParliamentHemicycle: React.FC = () => {
  const { lang, parties, projection } = useElectionStore();
  const [coalitionIds, setCoalitionIds] = useState<string[]>([]);

  const t = translations[lang];

  const seatParties = useMemo(
    () =>
      parties
        .filter((p) => (projection.partyTotalSeats[p.id] || 0) > 0)
        .map((p) => ({
          id: p.id,
          shortName: p.shortName,
          color: p.color,
          seats: projection.partyTotalSeats[p.id] || 0,
          share: projection.nationalPartyShares[p.id] || 0,
        }))
        .sort((a, b) => b.seats - a.seats),
    [parties, projection]
  );

  const selectedParties = useMemo(
    () => seatParties.filter((p) => coalitionIds.includes(p.id)),
    [seatParties, coalitionIds]
  );

  const coalitionSeats = useMemo(
    () => selectedParties.reduce((acc, p) => acc + p.seats, 0),
    [selectedParties]
  );

  const coalitionVotePct = useMemo(
    () => selectedParties.reduce((acc, p) => acc + p.share, 0),
    [selectedParties]
  );

  const toggleCoalitionParty = (id: string) => {
    setCoalitionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const { seatDots } = useMemo(() => {
    const groups = parties
      .filter((p) => (projection.partyTotalSeats[p.id] || 0) > 0)
      .map((p) => ({
        id: p.id,
        label: p.shortName,
        color: p.color,
        seats: projection.partyTotalSeats[p.id] || 0,
      }));
    const totalSeats = Math.max(1, projection.totalSeatsAllocated || 600);
    return {
      seatDots: computeHemicycleSeats(groups, {
        cx: 210,
        cy: 196,
        rMin: 74,
        rMax: 186,
        rows: 14,
        totalSeats,
      }),
    };
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
        <svg viewBox="0 0 420 206" className="w-full h-auto overflow-visible">
          {seatDots.map((dot, idx) => (
            <circle
              key={idx}
              cx={dot.x}
              cy={dot.y}
              r={dot.r}
              fill={dot.color}
              className="transition-colors duration-150"
            >
              <title>{dot.label}</title>
            </circle>
          ))}

          <text
            x="210"
            y="188"
            textAnchor="middle"
            className="fill-[#090A0F] text-[34px] font-bold tracking-tight"
          >
            {totalSeats}
          </text>
        </svg>
      </div>

      {/* Interactive TBMM Coalition & Majority Builder (301 / 360 / 400) */}
      <div className="border border-[#090A0F]/25 bg-slate-50/70 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#090A0F]">
              {lang === 'tr' ? 'Koalisyon & Çoğunluk Hesaplayıcı' : 'Coalition & Majority Builder'}
            </div>
            <div className="text-[11px] text-slate-500">
              {lang === 'tr'
                ? 'Meclis çoğunluğunu test etmek için partilere tıklayın'
                : 'Click parties to test parliamentary majorities'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedParties.length > 0 && (
              <button
                type="button"
                onClick={() => setCoalitionIds([])}
                className="px-2 py-0.5 text-[11px] font-semibold border border-[#090A0F]/30 bg-white hover:bg-slate-100 text-[#090A0F]"
              >
                {lang === 'tr' ? 'Temizle' : 'Clear'}
              </button>
            )}
            <div className="px-2.5 py-1 bg-[#090A0F] text-white text-micro font-mono font-bold tabular-nums">
              {coalitionSeats} / {totalSeats} MV
              {selectedParties.length > 0 && (
                <span className="text-slate-300 font-normal ml-1.5">
                  ({formatPct(coalitionVotePct, lang, 1)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Party Toggle Pills */}
        <div className="flex flex-wrap gap-1.5">
          {seatParties.map((p) => {
            const active = coalitionIds.includes(p.id);
            const fg = active ? getContrastTextColor(p.color) : '#090A0F';
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleCoalitionParty(p.id)}
                className="inline-flex items-center gap-1.5 px-2 py-1 text-micro font-bold border transition-all"
                style={{
                  backgroundColor: active ? p.color : '#FFFFFF',
                  color: fg,
                  borderColor: active ? p.color : 'rgba(9,10,15,0.28)',
                }}
              >
                {!active && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                )}
                <span>{p.shortName}</span>
                <span className="font-mono opacity-85">{p.seats}</span>
              </button>
            );
          })}
        </div>

        {/* Stacked Progress Bar with 301 / 360 / 400 Threshold Markers */}
        <div className="space-y-1.5 pt-0.5">
          <div className="relative h-4 bg-white border border-[#090A0F]/30 flex overflow-hidden">
            {selectedParties.map((p) => (
              <div
                key={p.id}
                style={{
                  width: `${(p.seats / totalSeats) * 100}%`,
                  backgroundColor: p.color,
                }}
                title={`${p.shortName}: ${p.seats} MV`}
                className="h-full transition-all duration-200"
              />
            ))}
            {[301, 360, 400].map((mark) => (
              <div
                key={mark}
                style={{ left: `${(mark / totalSeats) * 100}%` }}
                className="absolute top-0 bottom-0 w-[1.5px] bg-[#090A0F]/75 pointer-events-none"
                title={`${mark} MV`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-2.5 text-slate-600">
              <span className={coalitionSeats >= 301 ? 'font-bold text-emerald-700' : ''}>
                301 {lang === 'tr' ? 'Salt' : 'Maj.'}
              </span>
              <span className={coalitionSeats >= 360 ? 'font-bold text-emerald-700' : ''}>
                360 {lang === 'tr' ? 'Ref.' : 'Ref.'}
              </span>
              <span className={coalitionSeats >= 400 ? 'font-bold text-emerald-700' : ''}>
                400 {lang === 'tr' ? 'Anayasa' : 'Const.'}
              </span>
            </div>

            <div className="font-bold">
              {coalitionSeats === 0 ? (
                <span className="text-slate-400">
                  {lang === 'tr' ? 'Parti seçilmedi' : 'No party selected'}
                </span>
              ) : coalitionSeats >= 400 ? (
                <span className="text-emerald-700">
                  {lang === 'tr'
                    ? `Anayasa Değişikliği (+${coalitionSeats - 400})`
                    : `Constitutional (+${coalitionSeats - 400})`}
                </span>
              ) : coalitionSeats >= 360 ? (
                <span className="text-emerald-700">
                  {lang === 'tr'
                    ? `Referandum (+${coalitionSeats - 360}) · 400'e ${400 - coalitionSeats}`
                    : `Referendum (+${coalitionSeats - 360})`}
                </span>
              ) : coalitionSeats >= 301 ? (
                <span className="text-emerald-700">
                  {lang === 'tr'
                    ? `Salt Çoğunluk (+${coalitionSeats - 301}) · 360'a ${360 - coalitionSeats}`
                    : `Majority (+${coalitionSeats - 301})`}
                </span>
              ) : (
                <span className="text-amber-700">
                  {lang === 'tr'
                    ? `301'e ${301 - coalitionSeats} MV kaldı`
                    : `${301 - coalitionSeats} short of 301`}
                </span>
              )}
            </div>
          </div>
        </div>
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
              <th className="py-2.5 px-2 text-right">±2023</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#090A0F]/15">
            {parties.map((p) => {
              const share = projection.nationalPartyShares[p.id] || 0;
              const votes = projection.nationalPartyVotes[p.id] || 0;
              const seats = projection.partyTotalSeats[p.id] || 0;
              const baseSeats = OFFICIAL_2023_NATIONAL_SEATS[p.id] ?? baselineProjection.partyTotalSeats[p.id] ?? 0;
              const seatDiff = seats - baseSeats;

              return (
                <tr key={p.id} className="hover:bg-[#F4F5F7] transition-colors">
                  <td className="py-2.5 px-2 flex items-center gap-2">
                    {p.logoUrl ? (
                      <span
                        role="img"
                        aria-label={p.shortName}
                        className="w-5 h-5 shrink-0 inline-block"
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
                        className="w-3 h-3 border border-[#090A0F] shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                    )}
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
