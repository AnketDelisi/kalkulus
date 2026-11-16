import { ElectionMode, LocalBuffRule } from '../types/election';

/**
 * Returns enabled buff rules matching a specific unit in cascade order:
 * province -> district -> ilce.
 */
export function resolveMatchingBuffs(
  buffs: LocalBuffRule[] | undefined,
  mode: ElectionMode,
  ilId: string,
  districtId: string | undefined,
  ilceId: string
): LocalBuffRule[] {
  if (!buffs || buffs.length === 0) return [];
  const provMatches: LocalBuffRule[] = [];
  const distMatches: LocalBuffRule[] = [];
  const ilceMatches: LocalBuffRule[] = [];

  for (const b of buffs) {
    if (!b.enabled || b.mode !== mode || Math.abs(b.bonusPp) < 0.01) continue;
    if (b.unitType === 'province' && b.unitId === ilId) provMatches.push(b);
    else if (b.unitType === 'district' && districtId && b.unitId === districtId) distMatches.push(b);
    else if (b.unitType === 'ilce' && b.unitId === ilceId) ilceMatches.push(b);
  }

  return [...provMatches, ...distMatches, ...ilceMatches];
}

/**
 * Applies additive (+pp / -pp) local strength buffs onto a normalized share vector
 * while keeping all shares in [0, 100] and summing strictly to 100.
 */
export function applyLocalBuffsToShares(
  baseShares: Record<string, number>,
  buffs: LocalBuffRule[],
  entityIds: string[]
): Record<string, number> {
  if (buffs.length === 0 || entityIds.length === 0) return baseShares;

  const shares: Record<string, number> = {};
  let initSum = 0;
  for (const id of entityIds) {
    const v = Math.max(0, Number(baseShares[id] ?? 0));
    shares[id] = v;
    initSum += v;
  }
  if (initSum <= 0) return baseShares;
  for (const id of entityIds) {
    shares[id] = (shares[id] / initSum) * 100;
  }

  for (const buff of buffs) {
    if (!buff.enabled || Math.abs(buff.bonusPp) < 0.01) continue;
    if (shares[buff.targetId] === undefined) continue;

    const currentTarget = shares[buff.targetId];
    const requested = Number(buff.bonusPp) || 0;

    if (buff.sourceId && buff.sourceId !== buff.targetId && shares[buff.sourceId] !== undefined) {
      const currentSource = shares[buff.sourceId];
      const actualShift =
        requested > 0
          ? Math.min(requested, currentSource, 100 - currentTarget)
          : -Math.min(Math.abs(requested), currentTarget, 100 - currentSource);
      shares[buff.targetId] = Math.max(0, Math.min(100, currentTarget + actualShift));
      shares[buff.sourceId] = Math.max(0, Math.min(100, currentSource - actualShift));
      continue;
    }

    const nextTarget = Math.max(0, Math.min(99.5, currentTarget + requested));
    const othersSum = 100 - currentTarget;
    if (othersSum <= 0.001) continue;

    const scaleOthers = (100 - nextTarget) / othersSum;
    shares[buff.targetId] = nextTarget;
    for (const id of entityIds) {
      if (id === buff.targetId) continue;
      shares[id] = Math.max(0, shares[id] * scaleOthers);
    }
  }

  const finalSum = entityIds.reduce((s, id) => s + shares[id], 0);
  if (finalSum > 0 && Math.abs(finalSum - 100) > 1e-6) {
    for (const id of entityIds) {
      shares[id] = (shares[id] / finalSum) * 100;
    }
  }
  return shares;
}
