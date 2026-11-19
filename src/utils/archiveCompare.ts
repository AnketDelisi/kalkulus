import type { ArchiveElectionConfig } from '../data/archiveRegistry';
import type {
  BaselineDataset,
  ComputedDistrictResult,
  ComputedElectionProjection,
  ComputedPresidentialProjection,
  PresidentialRoundResult,
} from '../types/election';

/**
 * Applies archive spatial overrides (district MP counts, ilçe→district reassignments, merged ilçeler)
 * to a raw archive baseline so it matches the geography of that election.
 */
export function prepareArchiveRaw(cfg: ArchiveElectionConfig, rawBase: BaselineDataset): BaselineDataset {
  const applyDistrictOverrides = Boolean(cfg.districtOverrides && rawBase.districts.length === 87);
  const hasSpatialOverrides = Boolean(applyDistrictOverrides || cfg.districtMpOverrides || cfg.ilceMergeMap);
  if (!hasSpatialOverrides) return rawBase;
  return {
    ...rawBase,
    districts: cfg.districtMpOverrides
      ? rawBase.districts.map((d) =>
          cfg.districtMpOverrides?.[d.id] !== undefined ? { ...d, mpCount: cfg.districtMpOverrides[d.id] } : d
        )
      : rawBase.districts,
    ilceler: rawBase.ilceler
      .filter((ilce) => !cfg.ilceMergeMap?.[ilce.id])
      .map((ilce) =>
        applyDistrictOverrides && cfg.districtOverrides?.[ilce.id]
          ? { ...ilce, districtId: cfg.districtOverrides[ilce.id] }
          : ilce
      ),
  };
}

/** Political "camp" of a presidential/referendum leader, so flips are comparable across different candidate lists. */
export function presidentialCamp(candidateId: string): string {
  if (candidateId === 'erdogan' || candidateId === 'evet') return 'gov';
  if (
    candidateId === 'kilicdaroglu' ||
    candidateId === 'ince' ||
    candidateId === 'ihsanoglu' ||
    candidateId === 'hayir' ||
    candidateId === 'aksener'
  ) {
    return 'opp';
  }
  if (candidateId === 'demirtas') return 'dem';
  return candidateId;
}

function resolveComparisonProvinceId(
  activeIlId: string,
  compIds: Set<string>,
  compCfg: ArchiveElectionConfig
): string | null {
  if (compIds.has(activeIlId)) return activeIlId;
  const merged = compCfg.provinceMergeMap?.[activeIlId];
  if (merged && compIds.has(merged)) return merged;
  return null;
}

function resolveComparisonIlceId(
  activeIlceId: string,
  compIds: Set<string>,
  compCfg: ArchiveElectionConfig,
  activeCfg: ArchiveElectionConfig
): string | null {
  if (compIds.has(activeIlceId)) return activeIlceId;
  const viaComp = compCfg.ilceMergeMap?.[activeIlceId];
  if (viaComp && compIds.has(viaComp)) return viaComp;
  // Active election merged this ilçe away, but the comparison still has it under its parent (rare)
  const parent = activeCfg.ilceMergeMap?.[activeIlceId];
  if (parent && compIds.has(parent)) return parent;
  return null;
}

/**
 * Re-keys a comparison parliamentary projection onto the active archive's geography
 * (67/74/79/80/81 provinces, 83/84/85/87/104/107 districts, 919–973 ilçeler) so cross-era deltas/flips line up.
 */
export function alignParliamentaryComparison(
  comp: ComputedElectionProjection,
  compCfg: ArchiveElectionConfig,
  active: ComputedElectionProjection,
  activeCfg: ArchiveElectionConfig
): ComputedElectionProjection {
  const compProvIds = new Set(Object.keys(comp.provinceResults));
  const compDistIds = new Set(Object.keys(comp.districtResults));
  const compIlceIds = new Set(Object.keys(comp.ilceResults));

  const provinceResults: ComputedElectionProjection['provinceResults'] = {};
  for (const ilId of Object.keys(active.provinceResults)) {
    const src = resolveComparisonProvinceId(ilId, compProvIds, compCfg);
    if (src) provinceResults[ilId] = comp.provinceResults[src];
  }

  const hasCustomBoundaryEra = Boolean(
    activeCfg.customDistricts?.length || compCfg.customDistricts?.length
  );
  const activeIlcesByDist = new Map<string, string[]>();
  const compIlceSetsByDist = new Map<string, Set<string>>();
  if (hasCustomBoundaryEra) {
    for (const ilce of Object.values(active.ilceResults)) {
      if (!activeIlcesByDist.has(ilce.districtId)) activeIlcesByDist.set(ilce.districtId, []);
      activeIlcesByDist.get(ilce.districtId)!.push(ilce.id);
    }
    for (const ilce of Object.values(comp.ilceResults)) {
      if (!compIlceSetsByDist.has(ilce.districtId)) compIlceSetsByDist.set(ilce.districtId, new Set());
      compIlceSetsByDist.get(ilce.districtId)!.add(ilce.id);
    }
  }

  const isBoundaryCompatibleDistrict = (dId: string, dActive: ComputedDistrictResult): boolean => {
    if (!compDistIds.has(dId)) return false;
    if (!hasCustomBoundaryEra) return true;
    const activeIds = activeIlcesByDist.get(dId) || [];
    const compIds = compIlceSetsByDist.get(dId);
    if (!compIds || activeIds.length === 0) return false;
    if (compCfg.provinceMergeMap?.[dActive.ilId] || activeCfg.provinceMergeMap?.[dActive.ilId]) return false;
    const mappedCompSet = new Set<string>();
    for (const aId of activeIds) {
      const cId = resolveComparisonIlceId(aId, compIlceIds, compCfg, activeCfg);
      if (!cId || !compIds.has(cId)) return false;
      mappedCompSet.add(cId);
    }
    for (const cId of compIds) {
      const resolvedActive = active.ilceResults[cId]
        ? cId
        : Object.keys(activeCfg.ilceMergeMap || {}).find((k) => activeCfg.ilceMergeMap?.[k] === cId);
      if (!mappedCompSet.has(cId) && (!resolvedActive || !activeIds.includes(resolvedActive))) {
        return false;
      }
    }
    return true;
  };

  const districtResults: ComputedElectionProjection['districtResults'] = {};
  for (const [dId, dActive] of Object.entries(active.districtResults)) {
    if (isBoundaryCompatibleDistrict(dId, dActive)) {
      districtResults[dId] = comp.districtResults[dId];
      continue;
    }
    const mergedTo = !hasCustomBoundaryEra ? compCfg.districtMergeMap?.[dId] : undefined;
    if (mergedTo && compDistIds.has(mergedTo)) {
      districtResults[dId] = comp.districtResults[mergedTo];
      continue;
    }

    // Aggregate comparison ilçe results onto active district footprint when boundaries reshaped across eras
    const activeIlces = activeIlcesByDist.get(dId) || [];
    const matchedCompIlces = activeIlces
      .map((aId) => resolveComparisonIlceId(aId, compIlceIds, compCfg, activeCfg))
      .filter((cId): cId is string => Boolean(cId && comp.ilceResults[cId]))
      .map((cId) => comp.ilceResults[cId]);

    if (hasCustomBoundaryEra && matchedCompIlces.length > 0) {
      let totValid = 0;
      const partyVotes: Record<string, number> = {};
      for (const ci of matchedCompIlces) {
        const w = Math.max(1, ci.validVotes || 0);
        totValid += w;
        for (const [pid, share] of Object.entries(ci.partyShares)) {
          partyVotes[pid] = (partyVotes[pid] || 0) + (w * share) / 100;
        }
      }
      const partyShares: Record<string, number> = {};
      for (const [pid, v] of Object.entries(partyVotes)) {
        partyShares[pid] = totValid > 0 ? (v / totValid) * 100 : 0;
      }
      const ranked = Object.entries(partyShares)
        .filter(([pid]) => pid !== 'OTHER')
        .sort((a, b) => b[1] - a[1]);
      districtResults[dId] = {
        ...dActive,
        partyShares,
        leadingPartyId: ranked[0]?.[0] || dActive.leadingPartyId,
        runnerUpPartyId: ranked[1]?.[0] || dActive.runnerUpPartyId,
        partySeats: {},
      };
      continue;
    }

    const provSrc = resolveComparisonProvinceId(dActive.ilId, compProvIds, compCfg);
    const prov = provSrc ? comp.provinceResults[provSrc] : undefined;
    if (prov) {
      districtResults[dId] = {
        ...dActive,
        partyShares: prov.partyShares,
        leadingPartyId: prov.leadingPartyId,
        runnerUpPartyId: prov.runnerUpPartyId,
        partySeats: {},
      };
    }
  }

  const ilceResults: ComputedElectionProjection['ilceResults'] = {};
  for (const ilceId of Object.keys(active.ilceResults)) {
    const src = resolveComparisonIlceId(ilceId, compIlceIds, compCfg, activeCfg);
    if (src) ilceResults[ilceId] = comp.ilceResults[src];
  }

  return { ...comp, provinceResults, districtResults, ilceResults };
}

/**
 * Re-keys a comparison presidential/referendum projection onto the active archive's province and ilçe ids.
 */
export function alignPresidentialComparison(
  comp: ComputedPresidentialProjection,
  compCfg: ArchiveElectionConfig,
  active: ComputedPresidentialProjection,
  activeCfg: ArchiveElectionConfig
): ComputedPresidentialProjection {
  const alignRound = (compRound: PresidentialRoundResult, activeRound: PresidentialRoundResult): PresidentialRoundResult => {
    const compProvIds = new Set(Object.keys(compRound.provinceResults));
    const compIlceIds = new Set(Object.keys(compRound.ilceResults));
    const provinceResults: PresidentialRoundResult['provinceResults'] = {};
    for (const ilId of Object.keys(activeRound.provinceResults)) {
      const src = resolveComparisonProvinceId(ilId, compProvIds, compCfg);
      if (src) provinceResults[ilId] = compRound.provinceResults[src];
    }
    const ilceResults: PresidentialRoundResult['ilceResults'] = {};
    for (const ilceId of Object.keys(activeRound.ilceResults)) {
      const src = resolveComparisonIlceId(ilceId, compIlceIds, compCfg, activeCfg);
      if (src) ilceResults[ilceId] = compRound.ilceResults[src];
    }
    return { ...compRound, provinceResults, ilceResults };
  };
  return {
    ...comp,
    round1: alignRound(comp.round1, active.round1),
    round2: alignRound(comp.round2, active.round2),
  };
}

export type ArchiveFamily = 'parliamentary' | 'presidential' | 'local';

export function archiveFamily(cfg: ArchiveElectionConfig): ArchiveFamily {
  return cfg.defaultMode === 'presidential' ? 'presidential' : cfg.defaultMode === 'local' ? 'local' : 'parliamentary';
}
