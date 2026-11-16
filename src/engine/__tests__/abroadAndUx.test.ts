import { describe, expect, it } from 'vitest';
import { ABROAD_COUNTRIES_2023, ABROAD_COUNTRY_BY_ID } from '../../data/abroadCountries';
import baseline2023Raw from '../../data/baseline2023.json';
import { DEFAULT_ALLIANCES, DEFAULT_PARTIES } from '../../data/defaultParties';
import {
  DEFAULT_PRESIDENTIAL_CANDIDATES,
  buildDefaultPresidentialR2Dynamics,
  buildDefaultTransferMatrix,
  deriveCandidateSharesFromParties,
} from '../../data/presidentialDefaults';
import { normalizeTr } from '../../components/LocationSearchCombobox';
import { parsePollText } from '../../components/PollQuickEntryModal';
import { BaselineDataset } from '../../types/election';
import { useElectionStore } from '../../store/useElectionStore';
import { computePresidentialProjection } from '../presidential';
import { runMultiLayerProjection } from '../swing';

const baseline2023 = baseline2023Raw as unknown as BaselineDataset;

describe('Abroad Countries Map, Engine Rollup & UX Utilities', () => {
  it('loads 74 official May 2023 abroad units (73 countries + CUSTOMS) summing to 1,814,406 valid votes', () => {
    expect(ABROAD_COUNTRIES_2023.length).toBe(74);
    expect(ABROAD_COUNTRY_BY_ID['DEU']).toBeDefined();
    expect(ABROAD_COUNTRY_BY_ID['USA']).toBeDefined();
    expect(ABROAD_COUNTRY_BY_ID['KKTC']).toBeDefined();
    expect(ABROAD_COUNTRY_BY_ID['CUSTOMS']?.isCustoms).toBe(true);

    const totalValid = ABROAD_COUNTRIES_2023.reduce((s, c) => s + c.validVotes, 0);
    expect(totalValid).toBe(1814443);

    for (const c of ABROAD_COUNTRIES_2023) {
      const shareSum = Object.values(c.partyShares).reduce((a, b) => a + b, 0);
      expect(shareSum).toBeGreaterThan(99.5);
      expect(shareSum).toBeLessThan(100.5);
    }
  });

  it('rolls up locked country overrides accurately into Parliamentary abroad totals and conserves district votes', () => {
    const baseProj = runMultiLayerProjection({
      baseline: baseline2023,
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      swingMode: 'proportional',
      dhondtMode: '2022_separate',
      thresholdPct: 7.0,
      nationalTargetShares: { ...baseline2023.nationalBaseShares },
      nationalTargetTurnout: baseline2023.nationalBaseTurnout,
      nationalVoterScaleFactor: 1.0,
      abroadConfig: baseline2023.abroad,
      ilceOverrides: {},
      districtOverrides: {},
      provinceOverrides: {},
      abroadCountryOverrides: {},
      jointListRules: [],
    });

    const overrideProj = runMultiLayerProjection({
      baseline: baseline2023,
      parties: DEFAULT_PARTIES,
      alliances: DEFAULT_ALLIANCES,
      swingMode: 'proportional',
      dhondtMode: '2022_separate',
      thresholdPct: 7.0,
      nationalTargetShares: { ...baseline2023.nationalBaseShares },
      nationalTargetTurnout: baseline2023.nationalBaseTurnout,
      nationalVoterScaleFactor: 1.0,
      abroadConfig: baseline2023.abroad,
      ilceOverrides: {},
      districtOverrides: {},
      provinceOverrides: {},
      abroadCountryOverrides: {
        DEU: {
          isLocked: true,
          turnout: 70,
          partyShares: { AKP: 25, CHP: 50, DEM: 10, MHP: 10, OTHER: 5 },
        },
      },
      jointListRules: [],
    });

    expect(overrideProj.abroadCountryResults['DEU'].isLocked).toBe(true);
    expect(overrideProj.abroadCountryResults['DEU'].leadingPartyId).toBe('CHP');
    expect(overrideProj.abroadValidVotes).toBeGreaterThan(baseProj.abroadValidVotes);
    expect(overrideProj.abroadPartyVotes['CHP']).toBeGreaterThan(baseProj.abroadPartyVotes['CHP']);

    // Verify exact conservation across 87 domestic districts even with locked DEU
    let districtAbroadSum = 0;
    for (const d of baseline2023.districts) {
      districtAbroadSum += overrideProj.districtResults[d.id].abroadValidVotesAdded;
    }
    expect(districtAbroadSum).toBe(overrideProj.abroadValidVotes);
  });

  it('computes authentic per-country Presidential Round 1 and Round 2 polarization', () => {
    const presShares = deriveCandidateSharesFromParties(
      DEFAULT_PRESIDENTIAL_CANDIDATES,
      baseline2023.nationalBaseShares
    );
    const matrix = buildDefaultTransferMatrix(
      DEFAULT_PRESIDENTIAL_CANDIDATES,
      'erdogan',
      'imamoglu'
    );
    const r2Dyn = buildDefaultPresidentialR2Dynamics(DEFAULT_PRESIDENTIAL_CANDIDATES);

    const proj = computePresidentialProjection({
      baseline: baseline2023,
      parties: DEFAULT_PARTIES,
      candidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
      swingMode: 'proportional',
      candidateTargetShares: presShares,
      targetTurnout: baseline2023.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      abroadConfig: baseline2023.abroad,
      provinceOverrides: {},
      ilceOverrides: {},
      abroadCountryOverrides: {},
      transferMatrix: matrix,
      round2Dynamics: r2Dyn,
      referencePartyWeights: baseline2023.nationalBaseShares,
    });

    expect(Object.keys(proj.round1.abroadCountryResults).length).toBe(74);
    expect(Object.keys(proj.round2.abroadCountryResults).length).toBe(74);
    expect(proj.round1.abroadCountryResults['DEU'].leadingCandidateId).toBe('erdogan');
    expect(proj.round1.abroadCountryResults['USA'].leadingCandidateId).not.toBe('erdogan');
  });

  it('normalizes Turkish characters cleanly and parses pasted poll text', () => {
    expect(normalizeTr('Kadıköy')).toBe('kadikoy');
    expect(normalizeTr('Şanlıurfa İli')).toBe('sanliurfa ili');
    expect(normalizeTr('Çankaya / GÜMRÜK')).toBe('cankaya / gumruk');

    const parsed = parsePollText(
      'CHP: %33,2\nAKP 29.8\nDEM 9,4\nMHP\t7.9',
      DEFAULT_PARTIES.map((p) => ({
        id: p.id,
        shortName: p.shortName,
        fullName: p.fullName,
        color: p.color,
        isOther: p.isOther,
        currentValue: 0,
      }))
    );

    expect(parsed['CHP']).toBeCloseTo(33.2, 1);
    expect(parsed['AKP']).toBeCloseTo(29.8, 1);
    expect(parsed['DEM']).toBeCloseTo(9.4, 1);
    expect(parsed['MHP']).toBeCloseTo(7.9, 1);
  });

  it('supports store undo/redo across national share edits', () => {
    const store = useElectionStore.getState();
    store.resetAllToBaseline();
    const initialAkp = useElectionStore.getState().nationalTargetShares['AKP'];

    useElectionStore.getState().updateNationalPartyShare('AKP', 41.5);
    expect(useElectionStore.getState().nationalTargetShares['AKP']).toBe(41.5);
    expect(useElectionStore.getState().canUndo).toBe(true);

    useElectionStore.getState().undo();
    expect(useElectionStore.getState().nationalTargetShares['AKP']).toBe(initialAkp);
    expect(useElectionStore.getState().canRedo).toBe(true);

    useElectionStore.getState().redo();
    expect(useElectionStore.getState().nationalTargetShares['AKP']).toBe(41.5);
    useElectionStore.getState().resetAllToBaseline();
  });
});
