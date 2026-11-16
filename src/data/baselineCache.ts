import {
  EMPTY_BASELINE_STUB,
  buildBlendedBaseline,
  buildLocal5050Blend,
  buildThreeWayLocalBlend,
  split2024ChpForYeni,
} from './baselineBuilders';
import { BaselineDataset, BaselineId, LocalBaselineId } from '../types/election';

type RawYear = 2019 | 2023 | 2024;
type ParlKey = Exclude<BaselineId, 'custom'>;

const rawPromiseCache: Partial<Record<RawYear, Promise<BaselineDataset>>> = {};
const rawValueCache: Partial<Record<RawYear, BaselineDataset>> = {};
const parlValueCache: Partial<Record<ParlKey, BaselineDataset>> = {};
const localValueCache: Partial<Record<LocalBaselineId, BaselineDataset>> = {};

let coreInitPromise: Promise<void> | null = null;

/**
 * Dynamically imports and caches a raw election baseline JSON chunk on demand.
 */
export function loadRawBaseline(year: RawYear): Promise<BaselineDataset> {
  const existing = rawPromiseCache[year];
  if (existing) return existing;

  const loader =
    year === 2023
      ? import('./baseline2023.json').then((m) => m.default as unknown as BaselineDataset)
      : year === 2024
      ? import('./baseline2024.json').then((m) => m.default as unknown as BaselineDataset)
      : year === 2019
      ? import('./baseline2019.json').then((m) => m.default as unknown as BaselineDataset)
      : Promise.reject(new Error(`Unknown baseline year: ${year}`));

  const wrapped = loader
    .then((ds) => {
      rawValueCache[year] = ds;
      return ds;
    })
    .catch((err) => {
      delete rawPromiseCache[year];
      throw err;
    });
  rawPromiseCache[year] = wrapped;
  return wrapped;
}

/**
 * Loads the initial 2023 + 2024 chunks in parallel and populates all derived
 * parliamentary and 2024-derived local baselines (deferring 2019 until needed).
 */
export function initCoreBaselines(): Promise<void> {
  if (coreInitPromise) return coreInitPromise;

  coreInitPromise = Promise.all([loadRawBaseline(2023), loadRawBaseline(2024)])
    .then(([b23, b24]) => {
      parlValueCache['2023_general'] = b23;
      parlValueCache['blended_90_10'] = buildBlendedBaseline(b23, b24, 0.9, 0.1);

      const loc24 = split2024ChpForYeni(b24);
      localValueCache['2024_local'] = loc24;
      localValueCache['local_50_50'] = buildLocal5050Blend(b23, loc24);
    })
    .catch((err) => {
      coreInitPromise = null;
      throw err;
    });
  return coreInitPromise;
}

/**
 * Purges memory caches for testing or dynamic cache reload workflows.
 */
export function clearBaselineCache(): void {
  for (const k of [2019, 2023, 2024] as const) {
    delete rawPromiseCache[k];
    delete rawValueCache[k];
  }
  delete parlValueCache['2023_general'];
  delete parlValueCache['blended_90_10'];
  delete localValueCache['2024_local'];
  delete localValueCache['local_50_50'];
  delete localValueCache['local_50_30_20'];
  coreInitPromise = null;
}

export async function loadParliamentaryBaseline(id: ParlKey): Promise<BaselineDataset> {
  if (parlValueCache[id]) return parlValueCache[id]!;
  await initCoreBaselines();
  return parlValueCache[id]!;
}

export async function loadLocalBaseline(id: LocalBaselineId): Promise<BaselineDataset> {
  if (localValueCache[id]) return localValueCache[id]!;
  await initCoreBaselines();
  if (localValueCache[id]) return localValueCache[id]!;

  if (id === 'local_50_30_20') {
    const [b23, b19] = await Promise.all([loadRawBaseline(2023), loadRawBaseline(2019)]);
    const loc24 = localValueCache['2024_local']!;
    const blend = buildThreeWayLocalBlend(loc24, b23, b19, 0.5, 0.3, 0.2);
    localValueCache['local_50_30_20'] = blend;
    return blend;
  }

  return localValueCache['2024_local']!;
}

export function hasCachedBaseline(
  id: BaselineId,
  custom: BaselineDataset | null
): boolean {
  if (id === 'custom' && custom) return true;
  if (id === '2023_general') return Boolean(parlValueCache['2023_general']);
  return Boolean(parlValueCache['blended_90_10']);
}

export function hasCachedLocalBaseline(id: LocalBaselineId): boolean {
  return Boolean(localValueCache[id]);
}

export function getCachedBaseline(
  id: BaselineId,
  custom: BaselineDataset | null
): BaselineDataset {
  if (id === 'custom' && custom) return custom;
  if (id === '2023_general') return parlValueCache['2023_general'] || EMPTY_BASELINE_STUB;
  return parlValueCache['blended_90_10'] || EMPTY_BASELINE_STUB;
}

export function getCachedLocalBaseline(id: LocalBaselineId): BaselineDataset {
  return (
    localValueCache[id] ||
    localValueCache['2024_local'] ||
    EMPTY_BASELINE_STUB
  );
}

export function getCachedRaw2023(): BaselineDataset {
  return rawValueCache[2023] || EMPTY_BASELINE_STUB;
}

export { EMPTY_BASELINE_STUB };
