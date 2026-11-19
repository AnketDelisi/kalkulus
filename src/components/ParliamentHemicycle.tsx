import React, { useEffect, useMemo, useState } from 'react';
import { ARCHIVE_ELECTIONS, getArchiveComparisonLabel } from '../data/archiveRegistry';
import { OFFICIAL_2023_NATIONAL_SEATS, OFFICIAL_2023_PROVINCE_SEATS } from '../data/official2023Seats';
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
  const majMark = Math.floor(totalSeats / 2) + 1;
  const refMark = Math.ceil((totalSeats * 3) / 5);
  const constMark = Math.ceil((totalSeats * 2) / 3);

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
            {[majMark, refMark, constMark].map((mark) => (
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
              <span className={coalitionSeats >= majMark ? 'font-bold text-emerald-700' : ''}>
                {majMark} {lang === 'tr' ? 'Salt' : 'Maj.'}
              </span>
              <span className={coalitionSeats >= refMark ? 'font-bold text-emerald-700' : ''}>
                {refMark} {lang === 'tr' ? 'Ref.' : 'Ref.'}
              </span>
              <span className={coalitionSeats >= constMark ? 'font-bold text-emerald-700' : ''}>
                {constMark} {lang === 'tr' ? 'Anayasa' : 'Const.'}
              </span>
            </div>

            <div className="font-bold">
              {coalitionSeats === 0 ? (
                <span className="text-slate-400">
                  {lang === 'tr' ? 'Parti seçilmedi' : 'No party selected'}
                </span>
              ) : coalitionSeats >= constMark ? (
                <span className="text-emerald-700">
                  {lang === 'tr'
                    ? `Anayasa Değişikliği (+${coalitionSeats - constMark})`
                    : `Constitutional (+${coalitionSeats - constMark})`}
                </span>
              ) : coalitionSeats >= refMark ? (
                <span className="text-emerald-700">
                  {lang === 'tr'
                    ? `Referandum (+${coalitionSeats - refMark}) · ${constMark}'e ${constMark - coalitionSeats}`
                    : `Referendum (+${coalitionSeats - refMark})`}
                </span>
              ) : coalitionSeats >= majMark ? (
                <span className="text-emerald-700">
                  {lang === 'tr'
                    ? `Salt Çoğunluk (+${coalitionSeats - majMark}) · ${refMark}'e ${refMark - coalitionSeats}`
                    : `Majority (+${coalitionSeats - majMark})`}
                </span>
              ) : (
                <span className="text-amber-700">
                  {lang === 'tr'
                    ? `${majMark}'e ${majMark - coalitionSeats} MV kaldı`
                    : `${majMark - coalitionSeats} short of ${majMark}`}
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
  const {
    lang,
    parties,
    activeScope,
    activeArchiveId,
    archiveComparisonId,
    projection,
    baselineProjection,
  } = useElectionStore();
  const [forceNational, setForceNational] = useState(false);
  const t = translations[lang];
  const activeArchiveCfg = activeArchiveId ? ARCHIVE_ELECTIONS[activeArchiveId] : undefined;
  const deltaYearLabel = activeArchiveCfg
    ? getArchiveComparisonLabel(
        archiveComparisonId,
        lang,
        lang === 'tr' ? activeArchiveCfg.deltaLabelTr : activeArchiveCfg.deltaLabelEn
      )
    : 2023;

  useEffect(() => {
    setForceNational(false);
  }, [activeScope]);

  const effectiveType = forceNational ? 'national' : activeScope.type;
  const partyById = useMemo(() => {
    const m: Record<string, (typeof parties)[0]> = {};
    for (const p of parties) m[p.id] = p;
    return m;
  }, [parties]);

  const scopeView = useMemo(() => {
    if (effectiveType === 'province' && activeScope.type === 'province') {
      const pRes = projection.provinceResults[activeScope.ilId];
      const basePRes = baselineProjection.provinceResults[activeScope.ilId];
      if (pRes) {
        const totalMps = pRes.mpCount || 1;
        const flipCallouts = pRes.districtIds
          .map((dId) => projection.districtResults[dId])
          .filter((d) => d && d.votesToFlipLastSeat > 0 && d.lastSeatWinnerPartyId && d.closestChallengerPartyId)
          .map((d) => ({
            districtName: d.name,
            winnerShort: partyById[d.lastSeatWinnerPartyId]?.shortName ?? d.lastSeatWinnerPartyId,
            challengerShort: partyById[d.closestChallengerPartyId]?.shortName ?? d.closestChallengerPartyId,
            votesToFlip: d.votesToFlipLastSeat,
          }));
        return {
          isScoped: true,
          title: `${pRes.plateCode} · ${pRes.name} (${pRes.mpCount} MV)`,
          shares: pRes.partyShares,
          votes: pRes.partyVotes,
          seats: pRes.partySeats,
          baseSeats: activeArchiveId
            ? basePRes?.partySeats ?? {}
            : OFFICIAL_2023_PROVINCE_SEATS[pRes.id] ?? basePRes?.partySeats ?? {},
          totalSeats: totalMps,
          hasSeats: true,
          turnout: pRes.turnout,
          validVotes: pRes.totalValidVotes,
          flipCallouts,
        };
      }
    }

    if (effectiveType === 'district' && activeScope.type === 'district') {
      const dRes = projection.districtResults[activeScope.districtId];
      const baseDRes = baselineProjection.districtResults[activeScope.districtId];
      if (dRes) {
        const flipCallouts =
          dRes.votesToFlipLastSeat > 0 && dRes.lastSeatWinnerPartyId && dRes.closestChallengerPartyId
            ? [
                {
                  districtName: dRes.name,
                  winnerShort: partyById[dRes.lastSeatWinnerPartyId]?.shortName ?? dRes.lastSeatWinnerPartyId,
                  challengerShort: partyById[dRes.closestChallengerPartyId]?.shortName ?? dRes.closestChallengerPartyId,
                  votesToFlip: dRes.votesToFlipLastSeat,
                },
              ]
            : [];
        return {
          isScoped: true,
          title: `${dRes.name} (${dRes.mpCount} MV)`,
          shares: dRes.partyShares,
          votes: dRes.totalPartyVotes,
          seats: dRes.partySeats,
          baseSeats: baseDRes?.partySeats ?? {},
          totalSeats: dRes.mpCount || 1,
          hasSeats: true,
          turnout: dRes.turnout,
          validVotes: dRes.totalValidVotes,
          flipCallouts,
        };
      }
    }

    if (effectiveType === 'ilce' && activeScope.type === 'ilce') {
      const iRes = projection.ilceResults[activeScope.ilceId];
      if (iRes) {
        return {
          isScoped: true,
          title: `${iRes.name}`,
          shares: iRes.partyShares,
          votes: iRes.partyVotes,
          seats: {} as Record<string, number>,
          baseSeats: {} as Record<string, number>,
          totalSeats: 1,
          hasSeats: false,
          turnout: iRes.turnout,
          validVotes: iRes.validVotes,
          flipCallouts: [],
        };
      }
    }

    if (effectiveType === 'abroad') {
      return {
        isScoped: true,
        title: lang === 'tr' ? 'Yurt Dışı & Gümrükler' : 'Abroad & Customs',
        shares: projection.abroadPartyShares,
        votes: projection.abroadPartyVotes,
        seats: {} as Record<string, number>,
        baseSeats: {} as Record<string, number>,
        totalSeats: 1,
        hasSeats: false,
        turnout: null as number | null,
        validVotes: projection.abroadValidVotes,
        flipCallouts: [],
      };
    }

    if (effectiveType === 'abroadCountry' && activeScope.type === 'abroadCountry') {
      const cRes = projection.abroadCountryResults[activeScope.countryId];
      if (cRes) {
        return {
          isScoped: true,
          title: lang === 'tr' ? cRes.fullNameTr : cRes.nameEn,
          shares: cRes.partyShares,
          votes: cRes.partyVotes,
          seats: {} as Record<string, number>,
          baseSeats: {} as Record<string, number>,
          totalSeats: 1,
          hasSeats: false,
          turnout: cRes.turnout,
          validVotes: cRes.validVotes,
          flipCallouts: [],
        };
      }
    }

    return {
      isScoped: false,
      title: lang === 'tr' ? 'Ulusal oy dağılımı ve milletvekili tablosu' : 'National vote share and seat table',
      shares: projection.nationalPartyShares,
      votes: projection.nationalPartyVotes,
      seats: projection.partyTotalSeats,
      baseSeats: activeArchiveId ? baselineProjection.partyTotalSeats : OFFICIAL_2023_NATIONAL_SEATS,
      totalSeats: projection.totalSeatsAllocated || 600,
      hasSeats: true,
      turnout: projection.totalTurnout,
      validVotes: projection.totalValidVotes,
      flipCallouts: [],
    };
  }, [effectiveType, activeScope, activeArchiveId, projection, baselineProjection, lang, partyById]);

  return (
    <div className="studio-panel p-5 flex flex-col gap-4">
      <div className="border-b-[1.5px] border-[#090A0F] pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-heading font-bold text-[#090A0F]">{scopeView.title}</h2>
          <p className="text-micro font-mono text-slate-500 tabular-nums">
            {lang === 'tr' ? 'Geçerli oy:' : 'Valid votes:'}{' '}
            <strong className="text-[#090A0F]">{formatInt(scopeView.validVotes, lang)}</strong>
            {scopeView.turnout !== null && (
              <>
                {' · '}
                {lang === 'tr' ? 'Katılım:' : 'Turnout:'}{' '}
                <strong className="text-[#090A0F]">{formatPct(scopeView.turnout, lang, 1)}</strong>
              </>
            )}
          </p>
        </div>

        {activeScope.type !== 'national' && (
          <div className="inline-flex border border-[#090A0F] text-micro font-bold bg-white">
            <button
              type="button"
              onClick={() => setForceNational(false)}
              className={`px-2.5 py-1 transition-colors ${
                !forceNational ? 'bg-[#090A0F] text-white' : 'text-[#090A0F] hover:bg-slate-100'
              }`}
            >
              {lang === 'tr' ? 'Seçili Birim' : 'Selected Unit'}
            </button>
            <button
              type="button"
              onClick={() => setForceNational(true)}
              className={`px-2.5 py-1 border-l border-[#090A0F] transition-colors ${
                forceNational ? 'bg-[#090A0F] text-white' : 'text-[#090A0F] hover:bg-slate-100'
              }`}
            >
              {lang === 'tr' ? 'Ulusal' : 'National'}
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-body border-collapse">
          <thead>
            <tr className="border-b-[1.5px] border-[#090A0F] bg-[#F4F5F7] text-[#090A0F] text-micro font-bold">
              <th className="py-2.5 px-2 text-left">{t.partyCol}</th>
              <th className="py-2.5 px-2 text-right">{t.voteShareCol}</th>
              <th className="py-2.5 px-2 text-right">{t.votesCol}</th>
              {scopeView.hasSeats && (
                <>
                  <th className="py-2.5 px-2 text-right">{t.seatsCol}</th>
                  <th className="py-2.5 px-2 text-right">{lang === 'tr' ? 'Meclis %' : 'Seat %'}</th>
                  <th className="py-2.5 px-2 text-right">±{deltaYearLabel}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#090A0F]/15">
            {parties.map((p) => {
              const share = scopeView.shares[p.id] || 0;
              const votes = scopeView.votes[p.id] || 0;
              const seats = scopeView.seats[p.id] || 0;
              const baseSeats = scopeView.isScoped
                ? scopeView.baseSeats[p.id] ?? 0
                : scopeView.baseSeats[p.id] ?? baselineProjection.partyTotalSeats[p.id] ?? 0;
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
                  {scopeView.hasSeats && (
                    <>
                      <td className="py-2.5 px-2 text-right font-bold text-[#090A0F] text-title">
                        {seats}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-500">
                        {formatPct((seats / scopeView.totalSeats) * 100, lang, 1)}
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
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {scopeView.flipCallouts.length > 0 && (
        <div className="border-t border-slate-200 pt-2.5 flex flex-wrap gap-2">
          {scopeView.flipCallouts.map((fc) => (
            <div
              key={fc.districtName}
              className="text-micro font-mono bg-amber-50 border border-amber-300 px-2.5 py-1 text-[#090A0F]"
            >
              <span className="font-bold">{fc.districtName}:</span>{' '}
              {lang === 'tr' ? 'Son sandalye' : 'Last seat'}{' '}
              <strong>{fc.winnerShort}</strong> → <strong>{fc.challengerShort}</strong>:{' '}
              <span className="font-bold text-amber-800">+{formatInt(fc.votesToFlip, lang)}</span>{' '}
              {lang === 'tr' ? 'oy' : 'votes'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
