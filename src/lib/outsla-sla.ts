// "Out SLA" = took longer than the SLA target to fill, regardless of whether the vaga is still
// open or already closed — a vaga that took 90 days and got its offer accepted is still a case
// worth analyzing for root cause, it's just no longer urgent.
export const SLA_THRESHOLD_DAYS = 75;

export interface SenioritySlaTarget {
  label: string;
  officialDays: number;
  challengeDays: number;
}

// Management targets used to intervene before a vacancy reaches the formal SLA.
export const SENIORITY_SLA_TARGETS: SenioritySlaTarget[] = [
  { label: 'Team Leaders', officialDays: 75, challengeDays: 55 },
  { label: 'Analistas', officialDays: 75, challengeDays: 50 },
  { label: 'Especialistas', officialDays: 75, challengeDays: 40 },
  { label: 'Supervisores', officialDays: 75, challengeDays: 50 },
  { label: 'Managers', officialDays: 100, challengeDays: 65 },
];

export function getSenioritySlaTarget(seniority: string): SenioritySlaTarget | null {
  const normalized = seniority.trim().toLowerCase();
  if (/team\s*leader/.test(normalized)) return SENIORITY_SLA_TARGETS[0];
  if (/analista|analyst/.test(normalized)) return SENIORITY_SLA_TARGETS[1];
  if (/especialista|specialist/.test(normalized)) return SENIORITY_SLA_TARGETS[2];
  if (/supervisor/.test(normalized)) return SENIORITY_SLA_TARGETS[3];
  if (/manager|gerente/.test(normalized)) return SENIORITY_SLA_TARGETS[4];
  return null;
}

export function getOfficialSlaDays(seniority: string): number {
  return getSenioritySlaTarget(seniority)?.officialDays ?? SLA_THRESHOLD_DAYS;
}

// Whether a vaga is still active. The `status` column is free-typed by whoever compiles the
// sheet and can be wrong (e.g. marked "done" while the stage column still reads "Sourcing") —
// the `stage` (on_going) column is the reliable signal: only an actual offer outcome closes a vaga.
const CLOSED_STAGE_RE = /^offer\s+(accepted|extended|rejected)$/i;

export function isClosedStage(stage: string): boolean {
  return CLOSED_STAGE_RE.test(stage.trim());
}

/** The source status is authoritative when it is filled; the stage is process context. */
export function isClosedOutSlaRow(row: { stage: string; status?: string }): boolean {
  const status = row.status?.trim().toLowerCase();
  if (status === 'done') return true;
  if (/^(on going|stand by|pending)$/.test(status ?? '')) return false;
  return isClosedStage(row.stage);
}

export function isOutOfSla(timeToOffer: number, threshold: number = SLA_THRESHOLD_DAYS): boolean {
  return timeToOffer > threshold;
}
