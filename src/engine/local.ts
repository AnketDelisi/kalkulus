import {
  PROVINCE_MUNICIPAL_META,
  WINNERS_2024_ILCELER,
  WINNERS_2024_PROVINCES,
} from '../data/local2024Winners';
import {
  BaselineDataset,
  ComputedLocalIlceResult,
  ComputedLocalProjection,
  ComputedLocalProvinceResult,
  LocalAllianceRule,
  LocalBuffRule,
  LocalDefectionConfig,
  LocalDefectionEntry,
  LocalIncumbencyConfig,
  LocalPartySeatSummary,
  LocalProvinceMode,
  LocalReferenceBaseline,
  PartyConfig,
  SwingMode,
} from '../types/election';
import {
  IlceOverride,
  ProvinceOverride,
  applyTurnoutMultipliers,
  normalizeSharesTo100,
  runMultiLayerProjection,
  swingShareVector,
} from './swing';
import { applyLocalBuffsToShares, resolveMatchingBuffs } from './buffs';

export interface LocalEngineInput {
  baseline: BaselineDataset;
  parties: PartyConfig[];
  swingMode: SwingMode;
  localProvinceMode: LocalProvinceMode;
  targetShares: Record<string, number>;
  targetTurnout: number;
  voterScaleFactor: number;
  provinceOverrides: Record<string, ProvinceOverride>;
  ilceOverrides: Record<string, IlceOverride>;
  localAllianceRules?: LocalAllianceRule[];
  /** Layer 1: Incumbency / strong-candidate bonuses calibrated per province */
  localIncumbency?: LocalIncumbencyConfig;
  /** Post-2024 defections, current holder baseline, and optional kayyım trustees */
  localDefections?: LocalDefectionConfig;
  /** Custom per-province or per-ilçe additive strength buffs (+pp / -pp) */
  localBuffs?: LocalBuffRule[];
  /** Differential voter mobilization multiplier per party (0.5..1.5, default 1.0) */
  partyTurnoutMultipliers?: Record<string, number>;
  provinceTurnoutMultipliers?: Record<string, Record<string, number>>;
  /** Optional historical reference year and winners for Archive Mode comparisons */
  referenceYear?: 2009 | 2014 | 2019 | 2024;
  referenceProvinceWinners?: Record<string, string>;
  referenceIlceWinners?: Record<string, string>;
  /** Optional set of province IDs treated as Büyükşehir (e.g. 16 metros in 2009 vs 30 post-2014) */
  buyuksehirIds?: Set<string>;
}

function applyProvincePointShift(
  partyVotes: Record<string, number>,
  parties: PartyConfig[],
  targetPid: string,
  shiftPp: number
): number {
  const validVotes = parties.reduce((sum, p) => sum + (partyVotes[p.id] || 0), 0);
  if (validVotes <= 0 || partyVotes[targetPid] === undefined || Math.abs(shiftPp) <= 0.01) {
    return validVotes;
  }
  const curPct = ((partyVotes[targetPid] || 0) / validVotes) * 100;
  const newTargetPct = Math.min(92, Math.max(0.2, curPct + shiftPp));
  const scaleOthers = (100 - newTargetPct) / Math.max(0.01, 100 - curPct);

  partyVotes[targetPid] = Math.round(validVotes * (newTargetPct / 100));
  for (const p of parties) {
    if (p.id === targetPid) continue;
    partyVotes[p.id] = Math.round((partyVotes[p.id] || 0) * scaleOthers);
  }
  return Math.max(
    1,
    parties.reduce((sum, p) => sum + (partyVotes[p.id] || 0), 0)
  );
}

function findTopTwoLocal(
  votes: Record<string, number>,
  totalValid: number,
  parties: PartyConfig[],
  allowOther = true,
  otherMaxRatio = 1
): {
  winnerPartyId: string;
  runnerUpPartyId: string;
  marginVotes: number;
  marginPct: number;
} {
  const pool = allowOther ? parties : parties.filter((p) => !p.isOther);
  const clampedRatio = Math.max(0, Math.min(1, otherMaxRatio));
  const ranked = pool
    .map((p) => {
      const rawVotes = votes[p.id] ?? 0;
      return {
        id: p.id,
        v: p.isOther ? Math.round(rawVotes * clampedRatio) : rawVotes,
      };
    })
    .sort((a, b) => b.v - a.v);

  const first = ranked[0] || { id: '', v: 0 };
  const second = ranked[1] || { id: '', v: 0 };
  const marginVotes = Math.max(0, first.v - second.v);
  const marginPct = totalValid > 0 ? (marginVotes / totalValid) * 100 : 0;
  return {
    winnerPartyId: first.id,
    runnerUpPartyId: second.id,
    marginVotes,
    marginPct,
  };
}

export function computeLocalProjection(input: LocalEngineInput): ComputedLocalProjection {
  const {
    baseline,
    parties,
    swingMode,
    localProvinceMode,
    targetShares,
    targetTurnout,
    voterScaleFactor,
    provinceOverrides,
    ilceOverrides,
    localAllianceRules = [],
  } = input;

  // Reuse the battle-tested multi-layer swing engine with abroad disabled
  const baseProj = runMultiLayerProjection({
    baseline,
    parties,
    alliances: [],
    swingMode,
    dhondtMode: '2022_separate',
    thresholdPct: 0,
    nationalTargetShares: targetShares,
    nationalTargetTurnout: targetTurnout,
    nationalVoterScaleFactor: voterScaleFactor,
    abroadConfig: {
      ...baseline.abroad,
      enabled: false,
    },
    ilceOverrides,
    districtOverrides: {},
    provinceOverrides,
    localBuffs: (input.localBuffs || [])
      .filter((b) => b.mode === 'local')
      .map((b) => ({ ...b, mode: 'parliamentary' as const })),
    partyTurnoutMultipliers: input.partyTurnoutMultipliers,
    provinceTurnoutMultipliers: input.provinceTurnoutMultipliers,
    jointListRules: [],
  });

  // Resolve active reference holders ('current' applies post-2024 defections & optional kayyım)
  const defConfig = input.localDefections;
  const referenceBaseline: LocalReferenceBaseline = defConfig?.referenceBaseline ?? '2024';
  const includeKayyim = Boolean(defConfig?.includeKayyim);

  const activeProvDefections: Record<string, LocalDefectionEntry> = {};
  const activeIlceDefections: Record<string, LocalDefectionEntry> = {};
  if (defConfig) {
    for (const entry of defConfig.entries) {
      if (!entry.enabled) continue;
      if (entry.kind === 'kayyim' && !includeKayyim) continue;
      if (entry.unitType === 'province') {
        // kayyım overrides any prior party defection on the same unit if toggled on
        if (!activeProvDefections[entry.unitId] || entry.kind === 'kayyim') {
          activeProvDefections[entry.unitId] = entry;
        }
      } else {
        if (!activeIlceDefections[entry.unitId] || entry.kind === 'kayyim') {
          activeIlceDefections[entry.unitId] = entry;
        }
      }
    }
  }

  const refProvinceHolders: Record<string, string> = {
    ...(input.referenceProvinceWinners ?? WINNERS_2024_PROVINCES),
  };
  const refIlceHolders: Record<string, string> = {
    ...(input.referenceIlceWinners ?? WINNERS_2024_ILCELER),
  };
  if (referenceBaseline === 'current') {
    for (const [id, entry] of Object.entries(activeProvDefections)) {
      refProvinceHolders[id] = entry.toPartyId;
    }
    for (const [id, entry] of Object.entries(activeIlceDefections)) {
      refIlceHolders[id] = entry.toPartyId;
    }
  }

  // Count reference totals per party for exact zero-sum ± deltas
  const base2024ProvCounts: Record<string, number> = {};
  for (const w of Object.values(refProvinceHolders)) {
    base2024ProvCounts[w] = (base2024ProvCounts[w] || 0) + 1;
  }
  const base2024IlceCounts: Record<string, number> = {};
  for (const w of Object.values(refIlceHolders)) {
    base2024IlceCounts[w] = (base2024IlceCounts[w] || 0) + 1;
  }

  const ilceById = new Map(baseline.ilceler.map((i) => [i.id, i]));
  const normalizedTargetShares = normalizeSharesTo100(targetShares, parties);
  const localOnlyBuffs = (input.localBuffs || [])
    .filter((b) => b.mode === 'local')
    .map((b) => ({ ...b, mode: 'parliamentary' as const }));

  // 1. Build 973 İlçe Mayoral Results
  const ilceResults: Record<string, ComputedLocalIlceResult> = {};
  const flippedIlceIds: string[] = [];
  const ilceWinsByParty: Record<string, number> = {};
  for (const p of parties) ilceWinsByParty[p.id] = 0;

  for (const baseIlce of Object.values(baseProj.ilceResults)) {
    const meta = PROVINCE_MUNICIPAL_META[baseIlce.ilId];
    const isMerkez = Boolean(meta?.merkezIlceId && meta.merkezIlceId === baseIlce.id);
    const isLocked = Boolean(ilceOverrides[baseIlce.id]?.isLocked);

    let validVotes = baseIlce.validVotes;
    let turnout = baseIlce.turnout;
    const regVoters = baseIlce.registeredVoters;
    const partyVotes = { ...baseIlce.partyVotes };

    if (!isLocked && validVotes > 0) {
      // Layer 1: İlçe-level defection personal carryover
      const ilceDefection = activeIlceDefections[baseIlce.id];
      if (ilceDefection && ilceDefection.kind !== 'kayyim') {
        const isSameCampRealign =
          ilceDefection.fromPartyId === 'CHP' && ilceDefection.toPartyId === 'YENI';
        const basePersonalPp = 3.0;
        const carryoverFrac =
          Math.min(100, Math.max(0, ilceDefection.personalCarryoverPct ?? defConfig?.carryoverPct ?? 50)) / 100;
        const defaultBacklash = ilceDefection.toPartyId === 'OTHER' ? 0 : defConfig?.backlashPp ?? 0;
        const backlash = Math.max(0, ilceDefection.backlashPp ?? defaultBacklash);
        const incIntensity = Math.min(1.5, Math.max(0, (input.localIncumbency?.intensityPct ?? 0) / 100));
        const netShiftPp = isSameCampRealign
          ? 3.0 * incIntensity
          : (basePersonalPp * carryoverFrac - backlash) * incIntensity;
        if (Math.abs(netShiftPp) > 0.01) {
          validVotes = applyProvincePointShift(partyVotes, parties, ilceDefection.toPartyId, netShiftPp);
        }
      }

      // Layer 2A: Hard withdrawal / joint candidate rules
      for (const rule of localAllianceRules) {
        if (!rule.enabled) continue;
        if ((rule.mode ?? 'withdrawal') !== 'withdrawal') continue;
        if (
          !rule.applyNationwide &&
          rule.provinceIds.length > 0 &&
          !rule.provinceIds.includes(baseIlce.ilId)
        ) {
          continue;
        }

        const srcVotes = partyVotes[rule.sourcePartyId] || 0;
        if (srcVotes <= 0) continue;

        const effPct = Math.min(100, Math.max(0, rule.transferEfficiency));
        const absPct = Math.min(100 - effPct, Math.max(0, rule.abstainPct ?? 0));
        const transferred = Math.round(srcVotes * (effPct / 100));
        const abstained = Math.round(srcVotes * (absPct / 100));
        const leaked = Math.max(0, srcVotes - transferred - abstained);

        partyVotes[rule.sourcePartyId] = 0;
        partyVotes[rule.targetPartyId] = (partyVotes[rule.targetPartyId] || 0) + transferred;
        if (leaked > 0 && partyVotes.OTHER !== undefined) {
          partyVotes.OTHER += leaked;
        }
        if (abstained > 0) {
          validVotes = Math.max(1, validVotes - abstained);
        }
      }

      // Layer 2B: Tactical soft shift in competitive district races
      const prelimTop = findTopTwoLocal(partyVotes, validVotes, parties, false);
      const prelimGap = prelimTop.marginPct;
      const leaderShare =
        validVotes > 0 ? ((partyVotes[prelimTop.winnerPartyId] || 0) / validVotes) * 100 : 0;

      let tacticalAbstainedTotal = 0;
      const tacticalSnapshotVotes = { ...partyVotes };

      for (const rule of localAllianceRules) {
        if (!rule.enabled) continue;
        if (rule.mode !== 'tactical_soft') continue;
        if (
          !rule.applyNationwide &&
          rule.provinceIds.length > 0 &&
          !rule.provinceIds.includes(baseIlce.ilId)
        ) {
          continue;
        }
        if (rule.sourcePartyId === rule.targetPartyId) continue;
        if (rule.sourcePartyId === prelimTop.winnerPartyId) continue;

        const targetShare =
          validVotes > 0 ? ((tacticalSnapshotVotes[rule.targetPartyId] || 0) / validVotes) * 100 : 0;
        const maxMargin = Math.max(4.5, rule.maxMarginTriggerPct ?? 12);
        if (leaderShare - targetShare > maxMargin + 4) continue;

        const compFactor =
          prelimGap >= maxMargin ? 0 : prelimGap <= 4 ? 1 : (maxMargin - prelimGap) / (maxMargin - 4);
        if (compFactor <= 0) continue;

        const srcBaseVotes = tacticalSnapshotVotes[rule.sourcePartyId] || 0;
        if (srcBaseVotes <= 0) continue;

        const retainFloorFrac = Math.min(0.95, Math.max(0, (rule.retainFloorPct ?? 30) / 100));
        const maxShiftFrac = Math.max(0, 1 - retainFloorFrac);
        let shiftToTargetFrac = (Math.min(100, Math.max(0, rule.transferEfficiency)) / 100) * compFactor;
        let shiftAbstainFrac = (Math.min(100, Math.max(0, rule.abstainPct ?? 0)) / 100) * compFactor;

        const totalWant = shiftToTargetFrac + shiftAbstainFrac;
        if (totalWant > maxShiftFrac && totalWant > 0) {
          const scale = maxShiftFrac / totalWant;
          shiftToTargetFrac *= scale;
          shiftAbstainFrac *= scale;
        }

        const transferred = Math.round(srcBaseVotes * shiftToTargetFrac);
        const abstained = Math.round(srcBaseVotes * shiftAbstainFrac);

        partyVotes[rule.sourcePartyId] = Math.max(
          0,
          (partyVotes[rule.sourcePartyId] || 0) - transferred - abstained
        );
        partyVotes[rule.targetPartyId] = (partyVotes[rule.targetPartyId] || 0) + transferred;
        tacticalAbstainedTotal += abstained;
      }

      if (tacticalAbstainedTotal > 0) {
        validVotes = Math.max(1, validVotes - tacticalAbstainedTotal);
        if (regVoters > 0) {
          turnout = Math.min(100, Math.max(0, turnout * (validVotes / (validVotes + tacticalAbstainedTotal))));
        }
      }
    }

    const partyShares: Record<string, number> = {};
    for (const p of parties) {
      partyShares[p.id] = validVotes > 0 ? ((partyVotes[p.id] || 0) / validVotes) * 100 : 0;
    }

    const ilceOtherMaxRatio = ilceById.get(baseIlce.id)?.otherMaxCandidateRatio ?? 1;
    const { winnerPartyId, runnerUpPartyId, marginVotes, marginPct } = findTopTwoLocal(
      partyVotes,
      validVotes,
      parties,
      true,
      ilceOtherMaxRatio
    );

    const baseline2024WinnerPartyId = refIlceHolders[baseIlce.id] || winnerPartyId;
    const flippedFrom2024 = winnerPartyId !== baseline2024WinnerPartyId;
    if (flippedFrom2024) flippedIlceIds.push(baseIlce.id);
    if (winnerPartyId) {
      ilceWinsByParty[winnerPartyId] = (ilceWinsByParty[winnerPartyId] || 0) + 1;
    }

    ilceResults[baseIlce.id] = {
      id: baseIlce.id,
      name: baseIlce.name,
      ilId: baseIlce.ilId,
      isMerkez,
      registeredVoters: regVoters,
      turnout,
      validVotes,
      partyVotes,
      partyShares,
      winnerPartyId,
      runnerUpPartyId,
      marginVotes,
      marginPct,
      baseline2024WinnerPartyId,
      flippedFrom2024,
      isLocked: baseIlce.isLocked,
    };
  }

  // 2. Build 81 Province Mayoral Results (30 Büyükşehir province-wide + 51 İl Merkez/Province-wide)
  const provinceResults: Record<string, ComputedLocalProvinceResult> = {};
  const flippedProvinceIds: string[] = [];
  const buyuksehirWinsByParty: Record<string, number> = {};
  const ilMerkezWinsByParty: Record<string, number> = {};
  for (const p of parties) {
    buyuksehirWinsByParty[p.id] = 0;
    ilMerkezWinsByParty[p.id] = 0;
  }

  for (const prov of baseline.provinces) {
    const meta = PROVINCE_MUNICIPAL_META[prov.id];
    const isBuyuksehir = input.buyuksehirIds
      ? input.buyuksehirIds.has(prov.id)
      : meta?.isBuyuksehir ?? false;
    const merkezIlceId = meta?.merkezIlceId ?? null;
    const countingBasis: LocalProvinceMode =
      !isBuyuksehir && localProvinceMode === 'merkez_ilce' && merkezIlceId
        ? 'merkez_ilce'
        : 'province_wide';

    let regVoters = 0;
    let turnout = 0;
    let validVotes = 0;
    let partyVotes: Record<string, number> = {};

    const isProvLocked = Boolean(provinceOverrides[prov.id]?.isLocked);

    if (countingBasis === 'merkez_ilce' && merkezIlceId && ilceResults[merkezIlceId]) {
      const mRes = ilceResults[merkezIlceId];
      regVoters = mRes.registeredVoters;
      turnout = mRes.turnout;
      validVotes = mRes.validVotes;
      partyVotes = { ...mRes.partyVotes };
    } else if (countingBasis === 'province_wide' && prov.mayorPartyShares && !isProvLocked) {
      const baseProv = baseProj.provinceResults[prov.id];
      regVoters = baseProv.registeredVoters;
      turnout = baseProv.turnout;
      validVotes = baseProv.totalValidVotes;
      let effShares = swingShareVector(
        prov.mayorPartyShares,
        baseline.nationalBaseShares,
        normalizedTargetShares,
        swingMode,
        parties
      );
      if (localOnlyBuffs.length > 0) {
        const provBuffs = resolveMatchingBuffs(localOnlyBuffs, 'parliamentary', prov.id, undefined, '');
        if (provBuffs.length > 0) {
          effShares = applyLocalBuffsToShares(effShares, provBuffs, parties.map((p) => p.id));
        }
      }
      const provMults = input.provinceTurnoutMultipliers?.[prov.id];
      if (input.partyTurnoutMultipliers || provMults) {
        const mergedMults = provMults
          ? { ...(input.partyTurnoutMultipliers || {}), ...provMults }
          : input.partyTurnoutMultipliers;
        const adjusted = applyTurnoutMultipliers(
          effShares,
          turnout,
          mergedMults,
          parties.map((p) => p.id)
        );
        effShares = adjusted.shares;
        turnout = adjusted.turnout;
      }
      for (const p of parties) {
        partyVotes[p.id] = Math.round(validVotes * ((effShares[p.id] ?? 0) / 100));
      }
    } else {
      const baseProv = baseProj.provinceResults[prov.id];
      regVoters = baseProv.registeredVoters;
      turnout = baseProv.turnout;
      validVotes = baseProv.totalValidVotes;
      partyVotes = { ...baseProv.partyVotes };
    }

    // Layer 1: Incumbency / strong-candidate bonus adjusted by defections & kayyım
    const incIntensity = Math.min(
      1.5,
      Math.max(0, (input.localIncumbency?.intensityPct ?? 0) / 100)
    );
    const provBonus = input.localIncumbency?.provinceBonuses?.[prov.id];
    const provDefection = activeProvDefections[prov.id];
    const isMerkezLocked =
      countingBasis === 'merkez_ilce' && merkezIlceId
        ? Boolean(ilceOverrides[merkezIlceId]?.isLocked)
        : false;
    const isLocked = isProvLocked || isMerkezLocked;

    if (!isLocked && incIntensity > 0 && validVotes > 0) {
      if (provDefection?.kind === 'kayyim') {
        // Trustee appointment removes elected mayor incumbency advantage
      } else if (provDefection) {
        const isSameCampRealign =
          provDefection.fromPartyId === 'CHP' && provDefection.toPartyId === 'YENI';
        if (isSameCampRealign) {
          if (provBonus && Math.abs(provBonus.bonusPp) > 0.01) {
            validVotes = applyProvincePointShift(
              partyVotes,
              parties,
              provBonus.partyId,
              provBonus.bonusPp * incIntensity
            );
          }
        } else {
          // Cross-bloc defection: old party loses incumbency bonus; destination gets discounted personal carryover minus backlash
          const basePersonalPp = provBonus ? Math.max(0, provBonus.bonusPp) : 3.0;
          const carryoverFrac =
            Math.min(100, Math.max(0, provDefection.personalCarryoverPct ?? defConfig?.carryoverPct ?? 50)) / 100;
          const defaultBacklash = provDefection.toPartyId === 'OTHER' ? 0 : defConfig?.backlashPp ?? 0;
          const backlash = Math.max(0, provDefection.backlashPp ?? defaultBacklash);
          const netShiftPp = (basePersonalPp * carryoverFrac - backlash) * incIntensity;
          validVotes = applyProvincePointShift(partyVotes, parties, provDefection.toPartyId, netShiftPp);
        }
      } else if (provBonus && Math.abs(provBonus.bonusPp) > 0.01) {
        validVotes = applyProvincePointShift(
          partyVotes,
          parties,
          provBonus.partyId,
          provBonus.bonusPp * incIntensity
        );
      }
    }

    // Layer 2A & 2B: Run for province-wide elections (Büyükşehir or province-wide toggle)
    if (countingBasis === 'province_wide') {
      // Layer 2A: Hard withdrawal / joint candidate rules
      for (const rule of localAllianceRules) {
        if (!rule.enabled) continue;
        if ((rule.mode ?? 'withdrawal') !== 'withdrawal') continue;
        if (
          !rule.applyNationwide &&
          rule.provinceIds.length > 0 &&
          !rule.provinceIds.includes(prov.id)
        ) {
          continue;
        }

        const srcVotes = partyVotes[rule.sourcePartyId] || 0;
        if (srcVotes <= 0) continue;

        const effPct = Math.min(100, Math.max(0, rule.transferEfficiency));
        const absPct = Math.min(100 - effPct, Math.max(0, rule.abstainPct ?? 0));
        const transferred = Math.round(srcVotes * (effPct / 100));
        const abstained = Math.round(srcVotes * (absPct / 100));
        const leaked = Math.max(0, srcVotes - transferred - abstained);

        partyVotes[rule.sourcePartyId] = 0;
        partyVotes[rule.targetPartyId] = (partyVotes[rule.targetPartyId] || 0) + transferred;
        if (leaked > 0 && partyVotes.OTHER !== undefined) {
          partyVotes.OTHER += leaked;
        }
        if (abstained > 0) {
          validVotes = Math.max(1, validVotes - abstained);
        }
      }

      // Layer 2B: Margin-aware soft tactical consolidation (e.g. Kent Uzlaşısı)
      // Snapshot post-withdrawal standings so multiple rules evaluate consistently against current race gap
      const prelimTop = findTopTwoLocal(partyVotes, validVotes, parties, false);
      const prelimGap = prelimTop.marginPct;
      const leaderShare =
        validVotes > 0 ? ((partyVotes[prelimTop.winnerPartyId] || 0) / validVotes) * 100 : 0;

      let tacticalAbstainedTotal = 0;
      const tacticalSnapshotVotes = { ...partyVotes };

      for (const rule of localAllianceRules) {
        if (!rule.enabled) continue;
        if (rule.mode !== 'tactical_soft') continue;
        if (
          !rule.applyNationwide &&
          rule.provinceIds.length > 0 &&
          !rule.provinceIds.includes(prov.id)
        ) {
          continue;
        }
        if (rule.sourcePartyId === rule.targetPartyId) continue;

        // Only shift away from non-leading party toward a viable contender
        if (rule.sourcePartyId === prelimTop.winnerPartyId) continue;
        const targetShare =
          validVotes > 0 ? ((tacticalSnapshotVotes[rule.targetPartyId] || 0) / validVotes) * 100 : 0;
        const maxMargin = Math.max(4.5, rule.maxMarginTriggerPct ?? 12);
        if (leaderShare - targetShare > maxMargin + 4) continue;

        const compFactor =
          prelimGap >= maxMargin ? 0 : prelimGap <= 4 ? 1 : (maxMargin - prelimGap) / (maxMargin - 4);
        if (compFactor <= 0) continue;

        const srcBaseVotes = tacticalSnapshotVotes[rule.sourcePartyId] || 0;
        if (srcBaseVotes <= 0) continue;

        const retainFloorFrac = Math.min(0.95, Math.max(0, (rule.retainFloorPct ?? 30) / 100));
        const maxShiftFrac = Math.max(0, 1 - retainFloorFrac);
        let shiftToTargetFrac = (Math.min(100, Math.max(0, rule.transferEfficiency)) / 100) * compFactor;
        let shiftAbstainFrac = (Math.min(100, Math.max(0, rule.abstainPct ?? 0)) / 100) * compFactor;

        const totalWant = shiftToTargetFrac + shiftAbstainFrac;
        if (totalWant > maxShiftFrac && totalWant > 0) {
          const scale = maxShiftFrac / totalWant;
          shiftToTargetFrac *= scale;
          shiftAbstainFrac *= scale;
        }

        const transferred = Math.round(srcBaseVotes * shiftToTargetFrac);
        const abstained = Math.round(srcBaseVotes * shiftAbstainFrac);

        partyVotes[rule.sourcePartyId] = Math.max(
          0,
          (partyVotes[rule.sourcePartyId] || 0) - transferred - abstained
        );
        partyVotes[rule.targetPartyId] = (partyVotes[rule.targetPartyId] || 0) + transferred;
        tacticalAbstainedTotal += abstained;
      }

      if (tacticalAbstainedTotal > 0) {
        validVotes = Math.max(1, validVotes - tacticalAbstainedTotal);
        if (regVoters > 0) {
          turnout = Math.min(100, Math.max(0, turnout * (validVotes / (validVotes + tacticalAbstainedTotal))));
        }
      }
    }

    const partyShares: Record<string, number> = {};
    for (const p of parties) {
      partyShares[p.id] = validVotes > 0 ? ((partyVotes[p.id] || 0) / validVotes) * 100 : 0;
    }

    const provOtherMaxRatio =
      countingBasis === 'merkez_ilce' && merkezIlceId
        ? ilceById.get(merkezIlceId)?.otherMaxCandidateRatio ?? 1
        : prov.mayorOtherMaxCandidateRatio ?? 1;
    const { winnerPartyId, runnerUpPartyId, marginVotes, marginPct } = findTopTwoLocal(
      partyVotes,
      validVotes,
      parties,
      true,
      provOtherMaxRatio
    );

    const winner2024PartyId = refProvinceHolders[prov.id] || winnerPartyId;
    const flippedFrom2024 = winnerPartyId !== winner2024PartyId;
    if (flippedFrom2024) flippedProvinceIds.push(prov.id);

    if (winnerPartyId) {
      if (isBuyuksehir) {
        buyuksehirWinsByParty[winnerPartyId] = (buyuksehirWinsByParty[winnerPartyId] || 0) + 1;
      } else {
        ilMerkezWinsByParty[winnerPartyId] = (ilMerkezWinsByParty[winnerPartyId] || 0) + 1;
      }
    }

    provinceResults[prov.id] = {
      id: prov.id,
      plateCode: prov.plateCode,
      name: prov.name,
      isBuyuksehir,
      merkezIlceId,
      countingBasis,
      registeredVoters: regVoters,
      turnout,
      validVotes,
      partyVotes,
      partyShares,
      winnerPartyId,
      runnerUpPartyId,
      marginVotes,
      marginPct,
      winner2024PartyId,
      flippedFrom2024,
    };
  }

  // 3. Build Party Summaries
  const partySummaries: Record<string, LocalPartySeatSummary> = {};
  for (const p of parties) {
    const bb = buyuksehirWinsByParty[p.id] || 0;
    const il = ilMerkezWinsByParty[p.id] || 0;
    const totalProv = bb + il;
    const ilceW = ilceWinsByParty[p.id] || 0;

    partySummaries[p.id] = {
      partyId: p.id,
      nationalVotes: baseProj.domesticPartyVotes[p.id] || 0,
      nationalShare: baseProj.domesticPartyShares[p.id] || 0,
      buyuksehirWins: bb,
      ilMerkezWins: il,
      totalProvinceWins: totalProv,
      ilceWins: ilceW,
      deltaProvinceFrom2024: totalProv - (base2024ProvCounts[p.id] || 0),
      deltaIlceFrom2024: ilceW - (base2024IlceCounts[p.id] || 0),
    };
  }

  return {
    referenceBaseline,
    referenceYear: input.referenceYear,
    totalRegisteredVoters: baseProj.domesticRegisteredVoters,
    totalVotesCast: baseProj.domesticVotesCast,
    totalValidVotes: baseProj.domesticValidVotes,
    turnout: baseProj.domesticTurnout,
    nationalPartyVotes: baseProj.domesticPartyVotes,
    nationalPartyShares: baseProj.domesticPartyShares,
    partySummaries,
    provinceResults,
    ilceResults,
    flippedProvinceIds,
    flippedIlceIds,
    closestProvinces: Object.values(provinceResults)
      .sort((a, b) => a.marginPct - b.marginPct)
      .slice(0, 20),
    closestIlces: Object.values(ilceResults)
      .sort((a, b) => a.marginPct - b.marginPct)
      .slice(0, 25),
  };
}
