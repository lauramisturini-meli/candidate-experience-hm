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

/** Repairs text that was UTF-8 encoded but decoded once as Windows-1252/Latin-1. */
export function repairMojibake(value: unknown): string {
  const text = String(value ?? '');
  if (!/[ÃÂâ]/.test(text)) return text;

  try {
    const bytes = Uint8Array.from(text, character => character.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return text;
  }
}

