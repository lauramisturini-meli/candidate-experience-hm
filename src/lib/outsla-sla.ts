// "Out SLA" = took longer than the SLA target to fill, regardless of whether the vaga is still
// open or already closed — a vaga that took 90 days and got its offer accepted is still a case
// worth analyzing for root cause, it's just no longer urgent.
export const SLA_THRESHOLD_DAYS = 75;

// Whether a vaga is still active. The `status` column is free-typed by whoever compiles the
// sheet and can be wrong (e.g. marked "done" while the stage column still reads "Sourcing") —
// the `stage` (on_going) column is the reliable signal: only an actual offer outcome closes a vaga.
const CLOSED_STAGE_RE = /^offer\s+(accepted|extended|rejected)$/i;

export function isClosedStage(stage: string): boolean {
  return CLOSED_STAGE_RE.test(stage.trim());
}

export function isOutOfSla(timeToOffer: number, threshold: number = SLA_THRESHOLD_DAYS): boolean {
  return timeToOffer > threshold;
}
