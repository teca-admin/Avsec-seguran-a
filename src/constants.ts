import { Canal, Agente, Turno } from './types';

export type { Canal, Agente, Turno };

export const CANAL_CONFIG: Record<Canal, { name: string; badge: string; label: string }> = {
  alfa: { name: 'Canal Alfa – Internacional', badge: 'bg-transparent text-muted-foreground border border-border', label: 'ALFA' },
  bravo: { name: 'Canal Bravo – Doméstico TPS', badge: 'bg-transparent text-muted-foreground border border-border', label: 'BRAVO' },
  charlie: { name: 'Canal Charlie – Func./Tripulantes', badge: 'bg-transparent text-muted-foreground border border-border', label: 'CHARLIE' },
  fox: { name: 'Canal Fox – TECA', badge: 'bg-transparent text-muted-foreground border border-border', label: 'FOX' },
  supervisor: { name: 'Supervisor AVSEC', badge: 'bg-transparent text-amber-500 border border-amber-500/40', label: 'SUP' },
};

export const TURNOS: Record<string, Turno> = {
  A: { letra: 'A', inicio: '00:00', fim: '06:00' },
  B: { letra: 'B', inicio: '06:00', fim: '12:00' },
  C: { letra: 'C', inicio: '12:00', fim: '18:00' },
  D: { letra: 'D', inicio: '18:00', fim: '00:00' },
};

// EFETIVO_BASE removed - Agents now rotate and are fetched from DB

export const ALTERNATIVAS_CONFIG: Record<string, {
  alternativas: number[];
  automatico: boolean;
  padrao: number;
  label: Record<number, string>;
  descricao: Record<number, string>;
}> = {
  alfa: {
    alternativas: [2, 3],
    automatico: false,
    padrao: 2,
    label: { 2: 'Alternativa 2', 3: 'Alternativa 3' },
    descricao: { 2: 'Mín. 5 pessoas (4 APAC + 1 sup. função 6)', 3: 'Mín. 8 pessoas (7 APAC + 1 sup. função 6)' },
  },
  bravo: {
    alternativas: [5, 6],
    automatico: false,
    padrao: 5,
    label: { 5: 'Alternativa 5', 6: 'Alternativa 6' },
    descricao: { 5: 'Mín. 4 pessoas (3 APAC + 1 sup. função 6)', 6: 'Mín. 7 pessoas (6 APAC + 1 sup. função 6)' },
  },
  charlie: {
    alternativas: [8],
    automatico: true,
    padrao: 8,
    label: { 8: 'Alternativa 8' },
    descricao: { 8: 'Mín. 3 pessoas (2 APAC + 1 acumula sup. função 6)' },
  },
  fox: {
    alternativas: [8],
    automatico: true,
    padrao: 8,
    label: { 8: 'Alternativa 8' },
    descricao: { 8: 'Mín. 4 pessoas (2 APAC + 1 acumula sup. função 6 + 1 atend. inspeções)' },
  },
};
