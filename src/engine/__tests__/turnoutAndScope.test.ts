import { describe, expect, it } from 'vitest';
import { applyTurnoutMultipliers } from '../swing';
import { useElectionStore } from '../../store/useElectionStore';
import { normalizeTurkishSearch, stepPlateCode } from '../../utils/plateNavigation';

describe('Differential Party Base Turnout & Plate Navigation', () => {
  it('scales effective turnout and shares via applyTurnoutMultipliers (0.5..1.5)', () => {
    const baseShares = { AKP: 50, CHP: 50 };
    const noChange = applyTurnoutMultipliers(baseShares, 80, { AKP: 1.0, CHP: 1.0 }, ['AKP', 'CHP']);
    expect(noChange.turnout).toBe(80);
    expect(noChange.shares.CHP).toBe(50);

    const lowerChp = applyTurnoutMultipliers(baseShares, 80, { AKP: 1.0, CHP: 0.8 }, ['AKP', 'CHP']);
    expect(lowerChp.turnout).toBeCloseTo(72, 4);
    expect(lowerChp.shares.CHP).toBeCloseTo((40 / 90) * 100, 4);
    expect(lowerChp.shares.AKP).toBeCloseTo((50 / 90) * 100, 4);
  });

  it('propagates national and province turnout multipliers in store with JSON round-trip', () => {
    const store = useElectionStore.getState();
    store.resetAllToBaseline();

    const baseTurnout = useElectionStore.getState().projection.totalTurnout;
    const baseChpShare = useElectionStore.getState().projection.nationalPartyShares.CHP;
    const baseAnkaraChp = useElectionStore.getState().projection.provinceResults['06'].partyShares.CHP;

    useElectionStore.getState().setPartyTurnoutMultiplier('CHP', 0.75);
    const afterParl = useElectionStore.getState();
    expect(afterParl.projection.totalTurnout).toBeLessThan(baseTurnout);
    expect(afterParl.projection.nationalPartyShares.CHP).toBeLessThan(baseChpShare);

    useElectionStore.getState().setProvinceTurnoutMultiplier('06', 'CHP', 1.35);
    expect(useElectionStore.getState().projection.provinceResults['06'].partyShares.CHP).toBeGreaterThan(
      baseAnkaraChp
    );

    useElectionStore.getState().setLocalPartyTurnoutMultiplier('AKP', 1.2);
    useElectionStore.getState().setLocalProvinceTurnoutMultiplier('34', 'CHP', 1.15);
    expect(useElectionStore.getState().localPartyTurnoutMultipliers.AKP).toBe(1.2);
    expect(useElectionStore.getState().localProvinceTurnoutMultipliers['34']?.CHP).toBe(1.15);

    useElectionStore.getState().setPresCandidateTurnoutMultiplier('imamoglu', 1.1);
    useElectionStore.getState().setPresProvinceTurnoutMultiplier('06', 'imamoglu', 1.25);
    expect(useElectionStore.getState().presCandidateTurnoutMultipliers.imamoglu).toBe(1.1);
    expect(useElectionStore.getState().presProvinceTurnoutMultipliers['06']?.imamoglu).toBe(1.25);

    const json = useElectionStore.getState().exportScenarioJson();
    useElectionStore.getState().resetPartyTurnoutMultipliers();
    useElectionStore.getState().resetProvinceTurnoutMultipliers('06');
    expect(useElectionStore.getState().partyTurnoutMultipliers).toEqual({});
    expect(useElectionStore.getState().provinceTurnoutMultipliers['06']).toBeUndefined();

    expect(useElectionStore.getState().importScenarioJson(json)).toBe(true);
    expect(useElectionStore.getState().partyTurnoutMultipliers.CHP).toBe(0.75);
    expect(useElectionStore.getState().provinceTurnoutMultipliers['06']?.CHP).toBe(1.35);
    expect(useElectionStore.getState().localPartyTurnoutMultipliers.AKP).toBe(1.2);
    expect(useElectionStore.getState().localProvinceTurnoutMultipliers['34']?.CHP).toBe(1.15);
    expect(useElectionStore.getState().presCandidateTurnoutMultipliers.imamoglu).toBe(1.1);
    expect(useElectionStore.getState().presProvinceTurnoutMultipliers['06']?.imamoglu).toBe(1.25);

    useElectionStore.getState().resetPartyTurnoutMultipliers();
    useElectionStore.getState().resetProvinceTurnoutMultipliers('06');
    useElectionStore.getState().resetLocalPartyTurnoutMultipliers();
    useElectionStore.getState().resetLocalProvinceTurnoutMultipliers('34');
    useElectionStore.getState().resetPresCandidateTurnoutMultipliers();
    useElectionStore.getState().resetPresProvinceTurnoutMultipliers('06');
  });

  it('steps Turkish license plate codes with 01<->81 wrapping and normalizes Turkish search', () => {
    expect(stepPlateCode('06', 1)).toBe('07');
    expect(stepPlateCode('06', -1)).toBe('05');
    expect(stepPlateCode('81', 1)).toBe('01');
    expect(stepPlateCode('01', -1)).toBe('81');
    expect(normalizeTurkishSearch('Şanlıurfa')).toBe('sanliurfa');
    expect(normalizeTurkishSearch('Kadıköy')).toBe('kadikoy');
  });
});
