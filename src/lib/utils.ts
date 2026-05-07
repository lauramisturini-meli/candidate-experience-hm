export function escapeHtml(str: unknown): string {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, c => (
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c] ?? c
  ));
}

export function pctToNum(v: string): number | null {
  const n = parseInt(v.replace('%', ''), 10);
  return isNaN(n) ? null : n;
}

export function numToPct(n: number): string {
  return `${n}%`;
}
