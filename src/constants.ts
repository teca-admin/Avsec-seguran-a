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

export const EFETIVO_BASE: Record<string, { '6h': Omit<Agente, 'id' | 'canal' | 'tipo'>[]; '4h': Omit<Agente, 'id' | 'canal' | 'tipo'>[] }> = {
  alfa: {
    '6h': [
      { mat: '24546', nome: 'Kennedy de Arruda Sena', turno: '22h–04h' },
      { mat: '18065', nome: 'Romana Melo da Costa', turno: '22h–04h' },
      { mat: '23298', nome: 'Fabiana da Silva Farias', turno: '22h–04h' },
    ],
    '4h': []
  },
  bravo: {
    '6h': [
      { mat: '18069', nome: 'Tiago Wilame Mota Navarro', turno: '06h–12h' },
      { mat: '23723', nome: 'Maria Rosalia Alves Picanço', turno: '06h–12h' },
      { mat: '20267', nome: 'Daniel da Silva e Silva', turno: '09h30–15h30' },
      { mat: '18068', nome: 'Tatiana Alves Uchoa', turno: '09h30–15h30' },
      { mat: '26212', nome: 'Raul Augusto de Souza Gemaque', turno: '09h30–15h30' },
      { mat: '13758', nome: 'Dalila Rodrigues de Souza', turno: '10h–16h' },
      { mat: '25101', nome: 'Franklin dos Santos Lima', turno: '12h–18h' },
      { mat: '18046', nome: 'Ketiane Pacheco de Souza', turno: '09h30–15h30' },
      { mat: '15046', nome: 'Milena Messias dos Santos', turno: '10h–16h' },
      { mat: '27878', nome: 'Mirianilce Ferreira da Cunha', turno: '18h–00h' },
      { mat: '93450', nome: 'Daniele Elias de Souza', turno: '18h–00h' },
      { mat: '29161', nome: 'Gustavo de Castro Rocha', turno: '18h–00h' },
    ],
    '4h': [
      { mat: '35216', nome: 'Luana Gomes de Lima', turno: '06h30–10h30' },
      { mat: '35506', nome: 'Maiza Oliveira Costa', turno: '06h30–10h30' },
      { mat: '35217', nome: 'Alexsander Batista Soares', turno: '08h–12h' },
      { mat: '27789', nome: 'Silvia Maia da Silva', turno: '09h30–15h30' },
      { mat: '31623', nome: 'Jaime Adrinack Vasconcelos Damasceno', turno: '10h–16h' },
      { mat: '27790', nome: 'Gabriela Helena da Silva Monteiro', turno: '14h–18h' },
      { mat: '29933', nome: 'Caio Pinto da Silva', turno: '14h–18h' },
      { mat: '30401', nome: 'Brenda Oliveira da Silva', turno: '14h–18h' },
      { mat: '27880', nome: 'Rosenilda Natividade Pereira de Matos', turno: '23h–03h' },
      { mat: '30056', nome: 'Paulo dos Reis Alves de Oliveira', turno: '23h–03h' },
      { mat: '31621', nome: 'Dirley de Souza Mar', turno: '23h–03h' },
    ]
  },
  charlie: {
    '6h': [
      { mat: '17890', nome: 'Leandro Alves Lima', turno: '06h–12h' },
      { mat: '18005', nome: 'Cirlene Bezerra Santiago', turno: '06h–12h' },
      { mat: '22005', nome: 'Davi da Silva e Silva', turno: '06h–12h' },
      { mat: '18073', nome: 'Wagner Diego Raposo da Costa', turno: '12h–18h' },
      { mat: '18071', nome: 'Vanessa Santos da Silva', turno: '12h–18h' },
      { mat: '23726', nome: 'Maria Nejila Maia de Oliveira', turno: '12h–18h' },
      { mat: '21524', nome: 'Elda Ferreira Santos', turno: '18h–00h' },
      { mat: '18022', nome: 'Francinete Aguiar de Araujo', turno: '18h–00h' },
      { mat: '24917', nome: 'Andrey Oliveira de Miranda', turno: '12h–18h' },
      { mat: '24706', nome: 'Karen Monik Castro Nunes', turno: '12h–18h' },
      { mat: '33249', nome: 'Aylecia Maria Moreira Leão Coelho', turno: '12h–14h' },
    ],
    '4h': []
  },
  fox: {
    '6h': [
      { mat: '20265', nome: 'Gabriela Santa Rita de Souza', turno: '06h–12h' },
      { mat: '18025', nome: 'Francisca Ocineide de Melo Pacheco', turno: '06h–12h' },
      { mat: '18004', nome: 'Cherdson Carvalho Amancio', turno: '06h–12h' },
      { mat: '18064', nome: 'Priscila Barbosa da Lima', turno: '06h–12h' },
      { mat: '21450', nome: 'Jessica Maria Santos de Moura', turno: '12h–18h' },
      { mat: '18021', nome: 'Francinalda Terezinha Pedroso de Souza', turno: '12h–18h' },
      { mat: '19351', nome: 'Daniel Bruno Fonseca das Neves', turno: '12h–18h' },
      { mat: '18037', nome: 'Jordana dos Santos Silva', turno: '12h–18h' },
      { mat: '16285', nome: 'Jair Siqueira da Silva Junior', turno: '18h–00h' },
      { mat: '17999', nome: 'Angela Costa Pereira', turno: '18h–00h' },
      { mat: '21750', nome: 'Ana Carlas Souza do Nascimento', turno: '18h–00h' },
    ],
    '4h': []
  }
};
