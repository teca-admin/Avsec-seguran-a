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
