import { describe, it, expect } from 'vitest';
import { SLA_THRESHOLD_DAYS, isClosedStage, isOutOfSla } from '../src/lib/outsla-sla';

describe('outsla-sla', () => {
  it('threshold is 75 days, exclusive', () => {
    expect(SLA_THRESHOLD_DAYS).toBe(75);
    expect(isOutOfSla(75)).toBe(false);
    expect(isOutOfSla(76)).toBe(true);
  });

  it('treats offer accepted/extended/rejected stages as closed', () => {
    expect(isClosedStage('Offer accepted')).toBe(true);
    expect(isClosedStage('Offer extended')).toBe(true);
    expect(isClosedStage('Offer rejected')).toBe(true);
    expect(isClosedStage('offer accepted')).toBe(true); // case-insensitive
    expect(isClosedStage('  Offer accepted  ')).toBe(true); // trims whitespace
  });

  it('treats any active pipeline stage as open, even if the status column disagrees', () => {
    // Real case from a compiled analysis sheet: status column said "done" but the stage
    // column still read "Sourcing" — a data-entry mistake the stage column catches.
    expect(isClosedStage('Sourcing')).toBe(false);
    expect(isClosedStage('Entrevista HM')).toBe(false);
    expect(isClosedStage('Role Profiling')).toBe(false);
  });
});
