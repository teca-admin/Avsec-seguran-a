export type Canal = 'alfa' | 'bravo' | 'charlie' | 'fox' | 'supervisor';

export interface Agente {
  id: string;
  mat: string;
  nome: string;
  turno: string;
  tipo: '6h' | '4h';
  canal: Canal;
}

export interface Turno {
  letra: 'A' | 'B' | 'C' | 'D';
  inicio: string;
  fim: string;
}

export type OcorrenciaTipo = 'teca' | 'avsec' | 'equipamento' | 'receita' | 'treinamento' | 'passageiros' | 'varredura' | 'gpa' | 'gdaf';

export interface Ocorrencia {
  id: string;
  canal: Canal;
  tipo: OcorrenciaTipo;
  hora: string;
  hora_inicio?: string;
  hora_fim?: string;
  desc: string;
  agente?: string;
  imagem_url?: string;
  apacs?: string[];
  ts: number;
  turnoId: string;
  passageiro_nome?: string;
  passageiro_cpf?: string;
  voo?: string;
}

export interface EquipamentoDefeito {
  tipo: string;
  data: string;
  descricao: string;
  local: string;
  os: string;
  prazo: string;
}

export interface VooInternacional {
  numero: string;
  horario: string;
  modulo: string;
  apf: string;
  pax: string;
  hora_inicio?: string;
  hora_fim?: string;
}

export interface PaxFlow {
  total: string;
  pico: string;
  horaPico: string;
  obs: string;
  img1?: string;
  img2?: string;
  texto?: string;
}
