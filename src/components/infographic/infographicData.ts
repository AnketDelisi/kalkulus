import {
  OFFICIAL_2023_NATIONAL_SEATS,
  OFFICIAL_2023_PROVINCE_SEATS,
} from '../../data/official2023Seats';
import {
  AllianceConfig,
  ComputedElectionProjection,
  ComputedLocalProjection,
  ComputedPresidentialProjection,
  ElectionMode,
  Language,
  LocalDefectionConfig,
  PartyConfig,
  PresidentialCandidateConfig,
  PresidentialRoundView,
} from '../../types/election';
import { formatInt } from '../../utils/format';
import {
  InfographicConfig,
  InfographicDataModel,
  InfographicRow,
} from './infographicTypes';

function blendHex(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c * alpha + 255 * (1 - alpha));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export function buildDefaultInfographicTexts(
  mode: ElectionMode,
  presRound: PresidentialRoundView,
  localRef: 'current' | '2024',
  lang: Language
): { title: string; subtitle: string; footerNote: string } {
  if (mode === 'presidential') {
    return {
      title:
        lang === 'tr'
          ? presRound === 'round2'
            ? 'Cumhurbaşkanlığı Seçimi · 2. Tur Projeksiyonu'
            : 'Cumhurbaşkanlığı Seçimi · 1. Tur Projeksiyonu'
          : presRound === 'round2'
          ? 'Turkish Presidential Election · Round 2 Projection'
          : 'Turkish Presidential Election · Round 1 Projection',
      subtitle:
        lang === 'tr'
          ? '81 İl · 973 İlçe + Yurt Dışı Oyları'
          : '81 Provinces · 973 Districts + Abroad Model',
      footerNote: '',
    };
  }
  if (mode === 'local') {
    return {
      title:
        lang === 'tr'
          ? 'Yerel Seçim Projeksiyonu'
          : 'Local Elections Projection',
      subtitle:
        lang === 'tr'
          ? `30 Büyükşehir · 51 İl · 973 İlçe (${localRef === 'current' ? 'Mevcut bazı' : '2024 bazı'})`
          : `30 Metropolitan · 51 Provincial · 973 Districts`,
      footerNote: '',
    };
  }
  return {
    title:
      lang === 'tr'
        ? 'Genel Seçim Projeksiyonu'
        : 'Parliamentary Election Projection',
    subtitle:
      lang === 'tr'
        ? "87 Seçim Çevresi · D'Hondt Sistemi"
        : "87 Electoral Districts · D'Hondt Method",
    footerNote: '',
  };
}

export interface BuildInfographicInput {
  config: InfographicConfig;
  lang: Language;
  electionMode: ElectionMode;
  parties: PartyConfig[];
  alliances: AllianceConfig[];
  projection: ComputedElectionProjection;
  baselineProjection: ComputedElectionProjection;
  presCandidates: PresidentialCandidateConfig[];
  presRoundView: PresidentialRoundView;
  presidentialProjection: ComputedPresidentialProjection;
  localProjection: ComputedLocalProjection;
  localDefections: LocalDefectionConfig;
}

export function buildInfographicDataModel(input: BuildInfographicInput): InfographicDataModel {
  const {
    config,
    lang,
    electionMode,
    parties,
    alliances,
    projection,
    baselineProjection,
    presCandidates,
    presRoundView,
    presidentialProjection,
    localProjection,
  } = input;

  const partyById: Record<string, PartyConfig> = {};
  const partyColorMap: Record<string, string> = {};
  for (const p of parties) {
    partyById[p.id] = p;
    partyColorMap[p.id] = p.color;
  }
  const allianceById: Record<string, AllianceConfig> = {};
  for (const a of alliances) allianceById[a.id] = a;
  const candById: Record<string, PresidentialCandidateConfig> = {};
  for (const c of presCandidates) candById[c.id] = c;

  const provinceFillById: Record<string, string> = {};
  const districtFillById: Record<string, string> = {};
  const ilceFillById: Record<string, string> = {};
  const abroadCountryFillById: Record<string, string> = {};
  const provinceSeatMap: Record<string, { seats: Record<string, number>; votes: Record<string, number> }> = {};
  const districtSeatMap: Record<string, { seats: Record<string, number>; votes: Record<string, number> }> = {};
  const spotlightRows: InfographicRow[] = [];

  if (electionMode === 'presidential') {
    const activeRound =
      presRoundView === 'round2' ? presidentialProjection.round2 : presidentialProjection.round1;

    const rows: InfographicRow[] = activeRound.candidateSummaries
      .map((sum) => {
        const c = candById[sum.candidateId];
        if (!c) return null;
        return {
          id: c.id,
          shortName: c.shortName,
          fullName: c.name,
          color: c.color,
          votes: sum.votes,
          share: sum.share,
          primaryStat: sum.provincesWon,
          secondaryStat: sum.ilcelerWon,
          isWinner: activeRound.leadingCandidateId === c.id,
        } as InfographicRow;
      })
      .filter((r): r is InfographicRow => Boolean(r && (r.votes > 0 || r.share > 0)))
      .filter((r) => r.share >= config.minVoteCutoffPct || (r.primaryStat || 0) > 0);

    for (const u of Object.values(activeRound.ilceResults)) {
      const cColor = candById[u.leadingCandidateId]?.color || '#64748b';
      const alpha =
        config.mapColorMode === 'margin'
          ? Math.min(0.96, Math.max(0.24, u.marginPct / 28))
          : Math.min(0.95, Math.max(0.55, 0.52 + u.marginPct / 45));
      ilceFillById[u.id] = blendHex(cColor, alpha);
    }
    for (const u of Object.values(activeRound.provinceResults)) {
      const cColor = candById[u.leadingCandidateId]?.color || '#64748b';
      const alpha =
        config.mapColorMode === 'margin'
          ? Math.min(0.96, Math.max(0.24, u.marginPct / 28))
          : Math.min(0.95, Math.max(0.55, 0.52 + u.marginPct / 45));
      provinceFillById[u.id] = blendHex(cColor, alpha);
    }
    for (const u of Object.values(activeRound.abroadCountryResults || {})) {
      const cColor = candById[u.leadingCandidateId]?.color || '#64748b';
      const alpha =
        config.mapColorMode === 'margin'
          ? Math.min(0.96, Math.max(0.24, u.marginPct / 28))
          : Math.min(0.95, Math.max(0.55, 0.52 + u.marginPct / 45));
      abroadCountryFillById[u.id] = blendHex(cColor, alpha);
    }

    // Province Spotlight shows selected province's own candidate results
    const spotProv = activeRound.provinceResults[config.spotlightProvinceId];
    if (spotProv) {
      let otherV = 0;
      let otherS = 0;
      for (const c of presCandidates) {
        const votes = spotProv.candidateVotes[c.id] || 0;
        const share = spotProv.candidateShares[c.id] || 0;
        if (!c.isOther && (share >= config.minVoteCutoffPct || spotProv.leadingCandidateId === c.id) && votes > 0) {
          spotlightRows.push({
            id: c.id,
            shortName: c.shortName,
            fullName: c.name,
            color: c.color,
            votes,
            share,
            isWinner: spotProv.leadingCandidateId === c.id,
          });
        } else {
          otherV += votes;
          otherS += share;
        }
      }
      spotlightRows.sort((a, b) => b.votes - a.votes);
      if (otherS > 0.05) {
        spotlightRows.push({
          id: 'OTHER',
          shortName: lang === 'tr' ? 'Diğer' : 'Other',
          fullName: lang === 'tr' ? 'Diğer' : 'Other',
          color: '#94a3b8',
          votes: otherV,
          share: otherS,
        });
      }
    }

    const decidedLabel =
      presRoundView === 'round1'
        ? activeRound.hasAbsoluteMajority
          ? lang === 'tr'
            ? `1. Turda Kazandı (${candById[activeRound.leadingCandidateId]?.shortName || ''})`
            : `Won Round 1 (${candById[activeRound.leadingCandidateId]?.shortName || ''})`
          : lang === 'tr'
          ? `2. Tura Kalanlar: ${candById[presidentialProjection.topTwoCandidateIds[0]]?.shortName || ''} & ${candById[presidentialProjection.topTwoCandidateIds[1]]?.shortName || ''}`
          : `Runoff: ${candById[presidentialProjection.topTwoCandidateIds[0]]?.shortName || ''} vs ${candById[presidentialProjection.topTwoCandidateIds[1]]?.shortName || ''}`
        : lang === 'tr'
        ? `2. Tur Kazananı: ${candById[activeRound.leadingCandidateId]?.shortName || ''} (+${formatInt(activeRound.marginVotes, lang)} oy)`
        : `Round 2 Winner: ${candById[activeRound.leadingCandidateId]?.shortName || ''} (+${formatInt(activeRound.marginVotes, lang)})`;

    const spotLeadCand = spotProv ? candById[spotProv.leadingCandidateId] : undefined;

    return {
      mode: 'presidential',
      modeBadge:
        presRoundView === 'round2'
          ? lang === 'tr'
            ? 'CB 2. TUR'
            : 'PRES R2'
          : lang === 'tr'
          ? 'CB 1. TUR'
          : 'PRES R1',
      turnoutPct: activeRound.turnout,
      totalValidVotes: activeRound.totalValidVotes,
      majorityTarget: 50,
      decidedLabel,
      rows,
      totalPrimaryCount: 81,
      provinceFillById,
      districtFillById,
      ilceFillById,
      abroadCountryFillById,
      partyColorMap,
      provinceSeatMap,
      districtSeatMap,
      spotlightProvinceName: spotProv?.name,
      spotlightProvinceLeader: spotLeadCand
        ? {
            shortName: spotLeadCand.shortName,
            color: spotLeadCand.color,
            share: spotProv!.candidateShares[spotLeadCand.id] || 0,
          }
        : undefined,
      spotlightProvinceValidVotes: spotProv?.validVotes,
      spotlightProvinceTurnout: spotProv?.turnout,
      spotlightRows,
    };
  }

  if (electionMode === 'local') {
    const rawRows: InfographicRow[] = [];
    let otherVotes = 0;
    let otherShare = 0;
    let otherProvWins = 0;
    let otherIlceWins = 0;
    let otherDeltaProv = 0;

    for (const p of parties) {
      const s = localProjection.partySummaries[p.id];
      if (!s) continue;
      if (
        !p.isOther &&
        (s.nationalShare >= config.minVoteCutoffPct || s.totalProvinceWins > 0 || s.ilceWins > 0)
      ) {
        rawRows.push({
          id: p.id,
          shortName: p.shortName,
          fullName: p.fullName,
          color: p.color,
          logoUrl: p.logoUrl,
          votes: s.nationalVotes,
          share: s.nationalShare,
          primaryStat: s.totalProvinceWins,
          secondaryStat: s.ilceWins,
          deltaPrimary: s.deltaProvinceFrom2024,
        });
      } else {
        otherVotes += s.nationalVotes;
        otherShare += s.nationalShare;
        otherProvWins += s.totalProvinceWins;
        otherIlceWins += s.ilceWins;
        otherDeltaProv += s.deltaProvinceFrom2024;
      }
    }

    rawRows.sort(
      (a, b) =>
        (b.primaryStat || 0) - (a.primaryStat || 0) ||
        (b.secondaryStat || 0) - (a.secondaryStat || 0) ||
        b.share - a.share
    );
    if (otherShare > 0.05 || otherProvWins > 0 || otherIlceWins > 0) {
      rawRows.push({
        id: 'OTHER',
        shortName: lang === 'tr' ? 'Diğer' : 'Other',
        fullName: lang === 'tr' ? 'Diğer / Bağımsızlar' : 'Other / Independents',
        color: '#94a3b8',
        votes: otherVotes,
        share: otherShare,
        primaryStat: otherProvWins,
        secondaryStat: otherIlceWins,
        deltaPrimary: otherDeltaProv,
      });
    }
    if (rawRows[0]) rawRows[0].isWinner = true;

    for (const l of Object.values(localProjection.ilceResults)) {
      const winColor = partyById[l.winnerPartyId]?.color || '#64748b';
      ilceFillById[l.id] =
        config.mapColorMode === 'flips'
          ? l.flippedFrom2024
            ? blendHex(winColor, 0.96)
            : '#e2e8f0'
          : blendHex(
              winColor,
              config.mapColorMode === 'margin'
                ? Math.min(0.96, Math.max(0.24, l.marginPct / 28))
                : Math.min(0.95, Math.max(0.55, 0.52 + l.marginPct / 45))
            );
    }
    for (const p of Object.values(localProjection.provinceResults)) {
      const winColor = partyById[p.winnerPartyId]?.color || '#64748b';
      provinceFillById[p.id] =
        config.mapColorMode === 'flips'
          ? p.flippedFrom2024
            ? blendHex(winColor, 0.96)
            : '#e2e8f0'
          : blendHex(
              winColor,
              config.mapColorMode === 'margin'
                ? Math.min(0.96, Math.max(0.24, p.marginPct / 28))
                : Math.min(0.95, Math.max(0.55, 0.52 + p.marginPct / 45))
            );
    }

    // Province Spotlight: full selected İl result breakdown
    const spotProv = localProjection.provinceResults[config.spotlightProvinceId];
    if (spotProv) {
      let otherV = 0;
      let otherS = 0;
      for (const p of parties) {
        const votes = spotProv.partyVotes[p.id] || 0;
        const share = spotProv.partyShares[p.id] || 0;
        if (!p.isOther && (share >= config.minVoteCutoffPct || spotProv.winnerPartyId === p.id) && votes > 0) {
          spotlightRows.push({
            id: p.id,
            shortName: p.shortName,
            fullName: p.fullName,
            color: p.color,
            logoUrl: p.logoUrl,
            votes,
            share,
            isWinner: spotProv.winnerPartyId === p.id,
          });
        } else {
          otherV += votes;
          otherS += share;
        }
      }
      spotlightRows.sort((a, b) => b.votes - a.votes);
      if (otherS > 0.05) {
        spotlightRows.push({
          id: 'OTHER',
          shortName: lang === 'tr' ? 'Diğer' : 'Other',
          fullName: lang === 'tr' ? 'Diğer' : 'Other',
          color: '#94a3b8',
          votes: otherV,
          share: otherS,
        });
      }
    }

    const spotWinParty = spotProv ? partyById[spotProv.winnerPartyId] : undefined;

    return {
      mode: 'local',
      modeBadge: lang === 'tr' ? 'YEREL SEÇİM' : 'LOCAL',
      turnoutPct: localProjection.turnout,
      totalValidVotes: localProjection.totalValidVotes,
      decidedLabel:
        lang === 'tr'
          ? `${localProjection.flippedProvinceIds.length} İl · ${localProjection.flippedIlceIds.length} İlçe El Değiştirdi`
          : `${localProjection.flippedProvinceIds.length} Provinces · ${localProjection.flippedIlceIds.length} Districts Flipped`,
      rows: rawRows,
      totalPrimaryCount: 81,
      provinceFillById,
      districtFillById,
      ilceFillById,
      abroadCountryFillById,
      partyColorMap,
      provinceSeatMap,
      districtSeatMap,
      spotlightProvinceName: spotProv?.name,
      spotlightProvinceLeader: spotWinParty
        ? {
            shortName: spotWinParty.shortName,
            color: spotWinParty.color,
            share: spotProv!.partyShares[spotWinParty.id] || 0,
          }
        : undefined,
      spotlightProvinceValidVotes: spotProv?.validVotes,
      spotlightProvinceTurnout: spotProv?.turnout,
      spotlightRows,
    };
  }

  // Parliamentary Mode
  const rows: InfographicRow[] = [];
  if (config.grouping === 'alliance') {
    const grouped: Record<string, InfographicRow> = {};
    let otherVotes = 0;
    let otherShare = 0;
    let otherSeats = 0;
    let otherBaseShare = 0;
    let otherBaseSeats = 0;

    for (const p of parties) {
      const votes = projection.nationalPartyVotes[p.id] || 0;
      const share = projection.nationalPartyShares[p.id] || 0;
      const seats = projection.partyTotalSeats[p.id] || 0;
      const baseShare = baselineProjection.nationalPartyShares[p.id] || 0;
      const baseSeats =
        OFFICIAL_2023_NATIONAL_SEATS[p.id] ?? baselineProjection.partyTotalSeats[p.id] ?? 0;
      const alliance = p.allianceId ? allianceById[p.allianceId] : undefined;

      if (p.isOther || (!alliance && share < config.minVoteCutoffPct && seats === 0)) {
        otherVotes += votes;
        otherShare += share;
        otherSeats += seats;
        otherBaseShare += baseShare;
        otherBaseSeats += baseSeats;
        continue;
      }

      const key = alliance ? `alliance:${alliance.id}` : `party:${p.id}`;
      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          shortName: alliance ? alliance.name : p.shortName,
          fullName: alliance ? alliance.name : p.fullName,
          color: alliance ? alliance.color : p.color,
          logoUrl: alliance ? undefined : p.logoUrl,
          votes: 0,
          share: 0,
          primaryStat: 0,
          deltaShare: 0,
          deltaPrimary: 0,
        };
      }
      grouped[key].votes += votes;
      grouped[key].share += share;
      grouped[key].primaryStat = (grouped[key].primaryStat || 0) + seats;
      grouped[key].deltaShare = (grouped[key].deltaShare || 0) + (share - baseShare);
      grouped[key].deltaPrimary = (grouped[key].deltaPrimary || 0) + (seats - baseSeats);
    }

    rows.push(
      ...Object.values(grouped).sort(
        (a, b) => (b.primaryStat || 0) - (a.primaryStat || 0) || b.share - a.share
      )
    );
    if (otherShare > 0.05 || otherSeats > 0) {
      rows.push({
        id: 'OTHER',
        shortName: lang === 'tr' ? 'Diğer' : 'Other',
        fullName: lang === 'tr' ? 'Diğer Partiler' : 'Other Parties',
        color: '#94a3b8',
        votes: otherVotes,
        share: otherShare,
        primaryStat: otherSeats,
        deltaShare: otherShare - otherBaseShare,
        deltaPrimary: otherSeats - otherBaseSeats,
      });
    }
  } else {
    let otherVotes = 0;
    let otherShare = 0;
    let otherSeats = 0;
    let otherBaseShare = 0;
    let otherBaseSeats = 0;

    for (const p of parties) {
      const votes = projection.nationalPartyVotes[p.id] || 0;
      const share = projection.nationalPartyShares[p.id] || 0;
      const seats = projection.partyTotalSeats[p.id] || 0;
      const baseShare = baselineProjection.nationalPartyShares[p.id] || 0;
      const baseSeats =
        OFFICIAL_2023_NATIONAL_SEATS[p.id] ?? baselineProjection.partyTotalSeats[p.id] ?? 0;

      if (!p.isOther && (share >= config.minVoteCutoffPct || seats > 0)) {
        rows.push({
          id: p.id,
          shortName: p.shortName,
          fullName: p.fullName,
          color: p.color,
          logoUrl: p.logoUrl,
          votes,
          share,
          primaryStat: seats,
          deltaShare: share - baseShare,
          deltaPrimary: seats - baseSeats,
        });
      } else {
        otherVotes += votes;
        otherShare += share;
        otherSeats += seats;
        otherBaseShare += baseShare;
        otherBaseSeats += baseSeats;
      }
    }

    rows.sort((a, b) => (b.primaryStat || 0) - (a.primaryStat || 0) || b.share - a.share);
    if (otherShare > 0.05 || otherSeats > 0) {
      rows.push({
        id: 'OTHER',
        shortName: lang === 'tr' ? 'Diğer' : 'Other',
        fullName: lang === 'tr' ? 'Diğer Partiler' : 'Other Parties',
        color: '#94a3b8',
        votes: otherVotes,
        share: otherShare,
        primaryStat: otherSeats,
        deltaShare: otherShare - otherBaseShare,
        deltaPrimary: otherSeats - otherBaseSeats,
      });
    }
  }
  if (rows[0]) rows[0].isWinner = true;

  const resolveParlFill = (leadingId: string, marginPct: number): string => {
    const p = partyById[leadingId];
    const baseHex =
      config.mapColorMode === 'alliance' && p?.allianceId && allianceById[p.allianceId]
        ? allianceById[p.allianceId].color
        : p?.color || '#64748b';
    const alpha =
      config.mapColorMode === 'margin'
        ? Math.min(0.96, Math.max(0.24, marginPct / 28))
        : config.mapColorMode === 'alliance'
        ? 0.88
        : Math.min(0.95, Math.max(0.55, 0.52 + marginPct / 45));
    return blendHex(baseHex, alpha);
  };

  for (const d of Object.values(projection.districtResults)) {
    districtFillById[d.id] = resolveParlFill(d.leadingPartyId, d.marginPct);
    districtSeatMap[d.id] = { seats: d.partySeats, votes: d.totalPartyVotes };
  }
  for (const i of Object.values(projection.ilceResults)) {
    ilceFillById[i.id] = resolveParlFill(i.leadingPartyId, i.marginPct);
  }
  for (const p of Object.values(projection.provinceResults)) {
    provinceFillById[p.id] = resolveParlFill(p.leadingPartyId, p.marginPct);
    provinceSeatMap[p.id] = { seats: p.partySeats, votes: p.partyVotes };
  }
  for (const c of Object.values(projection.abroadCountryResults || {})) {
    abroadCountryFillById[c.id] = resolveParlFill(c.leadingPartyId, c.marginPct);
  }

  // Province Spotlight shows full selected İl party & MV seat results (using official 2023 YSK provincial seats for delta)
  const spotProv = projection.provinceResults[config.spotlightProvinceId];
  const baseSpotProv = baselineProjection.provinceResults[config.spotlightProvinceId];
  const officialSpotSeats = OFFICIAL_2023_PROVINCE_SEATS[config.spotlightProvinceId];
  if (spotProv) {
    let otherV = 0;
    let otherS = 0;
    let otherSeats = 0;
    let otherBaseSeats = 0;

    for (const p of parties) {
      const votes = spotProv.partyVotes[p.id] || 0;
      const share = spotProv.partyShares[p.id] || 0;
      const seats = spotProv.partySeats[p.id] || 0;
      const baseShare = baseSpotProv?.partyShares[p.id] || 0;
      const baseSeats =
        officialSpotSeats?.[p.id] ?? baseSpotProv?.partySeats[p.id] ?? 0;

      if (!p.isOther && (share >= config.minVoteCutoffPct || seats > 0)) {
        spotlightRows.push({
          id: p.id,
          shortName: p.shortName,
          fullName: p.fullName,
          color: p.color,
          logoUrl: p.logoUrl,
          votes,
          share,
          primaryStat: seats,
          deltaShare: baseSpotProv ? share - baseShare : undefined,
          deltaPrimary: seats - baseSeats,
        });
      } else {
        otherV += votes;
        otherS += share;
        otherSeats += seats;
        otherBaseSeats += baseSeats;
      }
    }

    spotlightRows.sort((a, b) => (b.primaryStat || 0) - (a.primaryStat || 0) || b.share - a.share);
    if (otherS > 0.05 || otherSeats > 0) {
      spotlightRows.push({
        id: 'OTHER',
        shortName: lang === 'tr' ? 'Diğer' : 'Other',
        fullName: lang === 'tr' ? 'Diğer Partiler' : 'Other Parties',
        color: '#94a3b8',
        votes: otherV,
        share: otherS,
        primaryStat: otherSeats,
        deltaPrimary: otherSeats - otherBaseSeats,
      });
    }
    if (spotlightRows[0]) spotlightRows[0].isWinner = true;
  }

  const spotLead = spotProv ? partyById[spotProv.leadingPartyId] : undefined;

  return {
    mode: 'parliamentary',
    modeBadge: lang === 'tr' ? 'TBMM GENEL SEÇİM' : 'PARLIAMENT',
    turnoutPct: projection.totalTurnout,
    totalValidVotes: projection.totalValidVotes,
    majorityTarget: Math.floor((projection.totalSeatsAllocated || 600) / 2) + 1,
    decidedLabel:
      lang === 'tr'
        ? `${projection.totalSeatsAllocated} Milletvekili · Çoğunluk ${Math.floor((projection.totalSeatsAllocated || 600) / 2) + 1}`
        : `${projection.totalSeatsAllocated} MPs · Majority ${Math.floor((projection.totalSeatsAllocated || 600) / 2) + 1}`,
    rows,
    totalPrimaryCount: projection.totalSeatsAllocated || 600,
    provinceFillById,
    districtFillById,
    ilceFillById,
    abroadCountryFillById,
    partyColorMap,
    provinceSeatMap,
    districtSeatMap,
    spotlightProvinceName: spotProv?.name,
    spotlightProvinceLeader: spotLead
      ? {
          shortName: spotLead.shortName,
          color: spotLead.color,
          share: spotProv!.partyShares[spotLead.id] || 0,
        }
      : undefined,
    spotlightProvinceValidVotes: spotProv?.totalValidVotes,
    spotlightProvinceTurnout: spotProv?.turnout,
    spotlightProvinceMpCount: spotProv?.mpCount,
    spotlightRows,
  };
}
