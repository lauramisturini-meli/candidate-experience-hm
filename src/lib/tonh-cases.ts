import type { TonhCase } from '../types';
import { canonicalizeTa, TEAM_TAS } from './ta-team';

const PERSON_NAME_ALIASES: Record<string, string> = {
  // Same employee in the tracking sheet and Exit Discussion PDF.
  'raul sant anna de oliveira': 'raul santana de oliveira',
};

function personKey(name: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  return PERSON_NAME_ALIASES[normalized] ?? normalized;
}

function caseOrigin(item: TonhCase): 'base' | 'exit-discussion' {
  if (item.origem) return item.origem;
  return item.dataSaida?.trim() ? 'base' : 'exit-discussion';
}

function prefer(value: string | undefined, fallback: string | undefined): string {
  return value?.trim() ? value : (fallback ?? '');
}

function mergePair(first: TonhCase, second: TonhCase): TonhCase {
  const firstOrigin = caseOrigin(first);
  const secondOrigin = caseOrigin(second);

  if (firstOrigin === secondOrigin) {
    return {
      ...first,
      ...second,
      nome: prefer(first.nome, second.nome),
      ta: prefer(first.ta, second.ta) || undefined,
      dataSaida: prefer(first.dataSaida, second.dataSaida) || undefined,
      anoSaida: first.anoSaida ?? second.anoSaida,
    };
  }

  const base = firstOrigin === 'base' ? first : second;
  const discussion = firstOrigin === 'exit-discussion' ? first : second;

  return {
    ...discussion,
    ...base,
    nome: prefer(base.nome, discussion.nome),
    rol: prefer(base.rol, discussion.rol),
    area: prefer(base.area, discussion.area),
    hiringManager: prefer(base.hiringManager, discussion.hiringManager),
    motivoSalida: prefer(base.motivoSalida, discussion.motivoSalida),
    principaisMotivos: prefer(base.principaisMotivos, discussion.principaisMotivos),
    tiempoEnRol: prefer(base.tiempoEnRol, discussion.tiempoEnRol),
    tiempoEnRolMeses: base.tiempoEnRolMeses ?? discussion.tiempoEnRolMeses,
    ta: prefer(base.ta, discussion.ta) || undefined,
    dataSaida: prefer(base.dataSaida, discussion.dataSaida) || undefined,
    anoSaida: base.anoSaida ?? discussion.anoSaida,
    panelEntrevistador: prefer(discussion.panelEntrevistador, base.panelEntrevistador),
    flags: prefer(discussion.flags, base.flags),
    comentarios: prefer(discussion.comentarios, base.comentarios),
    conclusoes: prefer(discussion.conclusoes, base.conclusoes),
    acuerdos: prefer(discussion.acuerdos, base.acuerdos),
    fileName: base.fileName,
    origem: 'base',
  };
}

export function mergeTonhCases(cases: TonhCase[]): TonhCase[] {
  const merged = new Map<string, TonhCase>();

  for (const item of cases) {
    const key = personKey(item.nome);
    if (!key) continue;
    const existing = merged.get(key);
    merged.set(key, existing ? mergePair(existing, item) : item);
  }

  return [...merged.values()];
}

export function consolidateCurrentTeamTonhCases(cases: TonhCase[]): TonhCase[] {
  return mergeTonhCases(cases).filter(item => {
    const ta = canonicalizeTa(item.ta ?? '');
    return TEAM_TAS.includes(ta);
  });
}
