import { describe, expect, it } from 'vitest';
import { BASELINES } from '../../data/baselines';
import { DEFAULT_PARTIES } from '../../data/defaultParties';
import {
  DEFAULT_PRESIDENTIAL_CANDIDATES,
  buildDefaultPresidentialR2Dynamics,
  buildDefaultTransferMatrix,
  deriveCandidateSharesFromParties,
} from '../../data/presidentialDefaults';
import { computePresidentialProjection } from '../presidential';

const DEFAULT_PARTY_SHARES: Record<string, number> = {
  AKP: 28.68,
  CHP: 2.96,
  MHP: 7.25,
  IYI: 4.96,
  DEM: 8.41,
  YRP: 4.09,
  ZP: 2.51,
  TIP: 1.62,
  A: 4.04,
  YENI: 32.61,
  SAADET: 1.02,
  BBP: 1.03,
  OTHER: 0.82,
};

describe('Presidential Election Engine', () => {
  const baseline = BASELINES['blended_90_10'];
  const defaultShares = deriveCandidateSharesFromParties(
    DEFAULT_PRESIDENTIAL_CANDIDATES,
    DEFAULT_PARTY_SHARES
  );
  const defaultTransfers = buildDefaultTransferMatrix(
    DEFAULT_PRESIDENTIAL_CANDIDATES,
    'imamoglu',
    'erdogan'
  );

  it('derives default candidate shares summing to 100% and triggers Round 2 when no candidate reaches 50%+1', () => {
    const sum = Object.values(defaultShares).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 1);

    const proj = computePresidentialProjection({
      baseline,
      parties: DEFAULT_PARTIES,
      candidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
      swingMode: 'proportional',
      candidateTargetShares: defaultShares,
      targetTurnout: baseline.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      abroadConfig: baseline.abroad,
      provinceOverrides: {},
      ilceOverrides: {},
      transferMatrix: defaultTransfers,
      referencePartyWeights: DEFAULT_PARTY_SHARES,
    });

    expect(proj.decidedInRound).toBe(2);
    expect(proj.round1.hasAbsoluteMajority).toBe(false);
    expect(Object.keys(proj.round1.provinceResults).length).toBe(81);
    expect(Object.keys(proj.round1.ilceResults).length).toBe(973);
    expect(proj.round1.abroadValidVotes).toBeGreaterThan(0);

    // National Round 1 shares closely reflect user targets
    const erdoganR1 = proj.round1.candidateSummaries.find((s) => s.candidateId === 'erdogan')!;
    const imamogluR1 = proj.round1.candidateSummaries.find((s) => s.candidateId === 'imamoglu')!;
    expect(erdoganR1.share).toBeCloseTo(defaultShares.erdogan, 1);
    expect(imamogluR1.share).toBeCloseTo(defaultShares.imamoglu, 1);

    // Round 2 has exactly the top 2 candidates summing to 100%, with reduced turnout due to abstain
    expect(proj.round2.candidateSummaries.length).toBe(2);
    const r2Sum = proj.round2.candidateSummaries.reduce((s, c) => s + c.share, 0);
    expect(r2Sum).toBeCloseTo(100, 2);
    expect(proj.round2.totalValidVotes).toBeLessThan(proj.round1.totalValidVotes);
    expect(proj.round2.turnout).toBeLessThan(proj.round1.turnout);
  });

  it('decides the election in Round 1 when top candidate exceeds 50%+1', () => {
    const landslideShares = {
      imamoglu: 31.0,
      erdogan: 52.5,
      dervisoglu: 6.0,
      erbakan: 4.5,
      agiralioglu: 3.5,
      kilicdaroglu: 2.0,
      other: 0.5,
    };

    const proj = computePresidentialProjection({
      baseline,
      parties: DEFAULT_PARTIES,
      candidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
      swingMode: 'proportional',
      candidateTargetShares: landslideShares,
      targetTurnout: baseline.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      abroadConfig: baseline.abroad,
      provinceOverrides: {},
      ilceOverrides: {},
      transferMatrix: defaultTransfers,
      referencePartyWeights: DEFAULT_PARTY_SHARES,
    });

    expect(proj.decidedInRound).toBe(1);
    expect(proj.round1.hasAbsoluteMajority).toBe(true);
    expect(proj.winnerCandidateId).toBe('erdogan');
    expect(proj.round1.candidateSummaries[0].share).toBeGreaterThan(50);
  });

  it('responds accurately to 2nd-round transfer matrix shifts across eliminated candidates', () => {
    const proErdoganTransfers = {
      dervisoglu: { toFirstPct: 5, toSecondPct: 90, abstainPct: 5 },
      erbakan: { toFirstPct: 5, toSecondPct: 90, abstainPct: 5 },
      agiralioglu: { toFirstPct: 5, toSecondPct: 90, abstainPct: 5 },
      kilicdaroglu: { toFirstPct: 10, toSecondPct: 80, abstainPct: 10 },
      other: { toFirstPct: 10, toSecondPct: 80, abstainPct: 10 },
    };

    const proj = computePresidentialProjection({
      baseline,
      parties: DEFAULT_PARTIES,
      candidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
      swingMode: 'proportional',
      candidateTargetShares: defaultShares,
      targetTurnout: baseline.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      abroadConfig: baseline.abroad,
      provinceOverrides: {},
      ilceOverrides: {},
      transferMatrix: proErdoganTransfers,
      referencePartyWeights: DEFAULT_PARTY_SHARES,
    });

    expect(proj.winnerCandidateId).toBe('erdogan');
    const erdoganR2 = proj.round2.candidateSummaries.find((c) => c.candidateId === 'erdogan')!;
    expect(erdoganR2.share).toBeGreaterThan(52);
  });

  it('respects ilçe locks and preserves abroad toggle off', () => {
    const proj = computePresidentialProjection({
      baseline,
      parties: DEFAULT_PARTIES,
      candidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
      swingMode: 'uniform',
      candidateTargetShares: defaultShares,
      targetTurnout: baseline.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      abroadConfig: { ...baseline.abroad, enabled: false },
      provinceOverrides: {},
      ilceOverrides: {
        '34-kadikoy': {
          isLocked: true,
          partyShares: {
            imamoglu: 75,
            erdogan: 15,
            dervisoglu: 4,
            erbakan: 2,
            agiralioglu: 2,
            kilicdaroglu: 1,
            other: 1,
          },
        },
      },
      transferMatrix: defaultTransfers,
      referencePartyWeights: DEFAULT_PARTY_SHARES,
    });

    expect(proj.round1.abroadValidVotes).toBe(0);
    expect(proj.round1.ilceResults['34-kadikoy'].isLocked).toBe(true);
    expect(proj.round1.ilceResults['34-kadikoy'].candidateShares.imamoglu).toBeCloseTo(75, 1);
  });

  it('keeps Round 1 invariant while applying Round 2 finalist retention, mobilization, geographic tilt, and abroad multiplier', () => {
    const neutralDyn = buildDefaultPresidentialR2Dynamics(DEFAULT_PRESIDENTIAL_CANDIDATES, true);
    const neutralProj = computePresidentialProjection({
      baseline,
      parties: DEFAULT_PARTIES,
      candidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
      swingMode: 'proportional',
      candidateTargetShares: defaultShares,
      targetTurnout: baseline.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      abroadConfig: baseline.abroad,
      provinceOverrides: {},
      ilceOverrides: {},
      transferMatrix: defaultTransfers,
      round2Dynamics: neutralDyn,
      referencePartyWeights: DEFAULT_PARTY_SHARES,
    });

    // Test 1: R2 mobilization + R2 abroad multiplier leave Round 1 completely identical
    const mobProj = computePresidentialProjection({
      baseline,
      parties: DEFAULT_PARTIES,
      candidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
      swingMode: 'proportional',
      candidateTargetShares: defaultShares,
      targetTurnout: baseline.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      abroadConfig: baseline.abroad,
      provinceOverrides: {},
      ilceOverrides: {},
      transferMatrix: defaultTransfers,
      round2Dynamics: {
        ...neutralDyn,
        finalistDynamics: {
          ...neutralDyn.finalistDynamics,
          erdogan: { retentionPct: 92, mobilizationPct: 0 },
          imamoglu: { retentionPct: 100, mobilizationPct: 8 },
        },
        abroadRound2TurnoutMultiplier: 1.25,
      },
      referencePartyWeights: DEFAULT_PARTY_SHARES,
    });

    expect(mobProj.round1.totalValidVotes).toBe(neutralProj.round1.totalValidVotes);
    expect(mobProj.round1.candidateSummaries).toEqual(neutralProj.round1.candidateSummaries);
    expect(mobProj.round1.abroadValidVotes).toBe(neutralProj.round1.abroadValidVotes);

    const erdMob = mobProj.round2.candidateSummaries.find((c) => c.candidateId === 'erdogan')!;
    const erdNeutral = neutralProj.round2.candidateSummaries.find((c) => c.candidateId === 'erdogan')!;
    const imaMob = mobProj.round2.candidateSummaries.find((c) => c.candidateId === 'imamoglu')!;
    const imaNeutral = neutralProj.round2.candidateSummaries.find((c) => c.candidateId === 'imamoglu')!;

    expect(erdMob.domesticVotes).toBeLessThan(erdNeutral.domesticVotes);
    expect(imaMob.domesticVotes).toBeGreaterThan(imaNeutral.domesticVotes);
    expect(mobProj.round2.turnout).toBeLessThanOrEqual(98);

    // Abroad R2 scales independently
    expect(mobProj.round2.abroadValidVotes).toBeGreaterThan(neutralProj.round2.abroadValidVotes);

    // Test 2: Geographic Transfer Tilt skews locally while preserving national totals
    const tiltedProj = computePresidentialProjection({
      baseline,
      parties: DEFAULT_PARTIES,
      candidates: DEFAULT_PRESIDENTIAL_CANDIDATES,
      swingMode: 'proportional',
      candidateTargetShares: defaultShares,
      targetTurnout: baseline.nationalBaseTurnout,
      voterScaleFactor: 1.0,
      abroadConfig: baseline.abroad,
      provinceOverrides: {},
      ilceOverrides: {},
      transferMatrix: defaultTransfers,
      round2Dynamics: {
        ...neutralDyn,
        geographicTransferTilt: 80,
      },
      referencePartyWeights: DEFAULT_PARTY_SHARES,
    });

    const tiltIma = tiltedProj.round2.candidateSummaries.find((c) => c.candidateId === 'imamoglu')!;
    expect(Math.abs(tiltIma.share - imaNeutral.share)).toBeLessThan(0.15);

    const r1Ilces = Object.values(neutralProj.round1.ilceResults).filter(
      (u) => (u.candidateVotes.dervisoglu || 0) + (u.candidateVotes.erbakan || 0) > 2000
    );
    const strongImaIlce = [...r1Ilces].sort(
      (a, b) => (b.candidateShares.imamoglu || 0) - (a.candidateShares.imamoglu || 0)
    )[0];
    const strongErdIlce = [...r1Ilces].sort(
      (a, b) => (b.candidateShares.erdogan || 0) - (a.candidateShares.erdogan || 0)
    )[0];

    expect(
      tiltedProj.round2.ilceResults[strongImaIlce.id].candidateShares.imamoglu
    ).toBeGreaterThan(neutralProj.round2.ilceResults[strongImaIlce.id].candidateShares.imamoglu);
    expect(
      tiltedProj.round2.ilceResults[strongErdIlce.id].candidateShares.erdogan
    ).toBeGreaterThan(neutralProj.round2.ilceResults[strongErdIlce.id].candidateShares.erdogan);
  });
});
