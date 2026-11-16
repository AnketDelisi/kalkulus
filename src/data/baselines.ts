import baseline2019Raw from './baseline2019.json';
import baseline2023Raw from './baseline2023.json';
import baseline2024Raw from './baseline2024.json';
import {
  buildBlendedBaseline,
  buildLocal5050Blend,
  buildThreeWayLocalBlend,
  split2024ChpForYeni,
} from './baselineBuilders';
import { BaselineDataset, BaselineId, LocalBaselineId } from '../types/election';

const BASELINE_2019 = baseline2019Raw as unknown as BaselineDataset;
const BASELINE_2023 = baseline2023Raw as unknown as BaselineDataset;
const BASELINE_2024 = baseline2024Raw as unknown as BaselineDataset;

export const BASELINE_BLENDED_90_10 = buildBlendedBaseline(BASELINE_2023, BASELINE_2024, 0.9, 0.1);
export const BASELINE_2024_LOCAL: BaselineDataset = split2024ChpForYeni(BASELINE_2024);
export const BASELINE_LOCAL_50_50: BaselineDataset = buildLocal5050Blend(
  BASELINE_2023,
  BASELINE_2024_LOCAL
);
export const BASELINE_LOCAL_50_30_20: BaselineDataset = buildThreeWayLocalBlend(
  BASELINE_2024_LOCAL,
  BASELINE_2023,
  BASELINE_2019,
  0.5,
  0.3,
  0.2
);

export const BASELINES: Record<Exclude<BaselineId, 'custom'>, BaselineDataset> = {
  blended_90_10: BASELINE_BLENDED_90_10,
  '2023_general': BASELINE_2023,
};

export const LOCAL_BASELINES: Record<LocalBaselineId, BaselineDataset> = {
  '2024_local': BASELINE_2024_LOCAL,
  local_50_30_20: BASELINE_LOCAL_50_30_20,
  local_50_50: BASELINE_LOCAL_50_50,
};

export { BASELINE_2019, BASELINE_2023, BASELINE_2024 };
