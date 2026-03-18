import React from 'react';
import { Canal, CANAL_CONFIG, TURNOS, EFETIVO_BASE } from '../constants';
import { Ocorrencia, PaxFlow, EquipamentoDefeito, VooInternacional } from '../types';

interface PdfReportProps {
  turno: string;
  data: string;
  supervisor: string;
  recebeuDe: string;
  ocorrencias: Ocorrencia[];
  presence: Record<Canal, Record<string, boolean>>;
  paxFlow?: PaxFlow;
  equipamentos?: EquipamentoDefeito[];
  voos?: VooInternacional[];
}

export default function PdfReport({ 
  turno, data, supervisor, recebeuDe, ocorrencias, presence, paxFlow, equipamentos, voos 
}: PdfReportProps) {
  const t = TURNOS[turno];

  return (
    <div id="pdf-report-content" className="bg-white text-black p-8 font-sans text-[12px] leading-relaxed max-w-[780px] mx-auto hidden print:block">
      <div className="text-center border-b-2 border-[#1a5276] pb-4 mb-5">
        <div className="text-[10px] text-[#666] mb-1 uppercase tracking-widest">WFS · Proteção Aeroportuária</div>
        <h1 className="text-base font-bold text-[#1a5276] mb-0.5">PASSAGEM DE SERVIÇO DOS POSTOS DE PROTEÇÃO</h1>
        <div className="text-xs text-[#333]">Aeroporto Internacional de Manaus "Eduardo Gomes"</div>
        <div className="flex justify-center gap-6 mt-2.5 text-[11px] text-[#555]">
          <span><b>Data:</b> {data}</span>
          <span><b>Turno:</b> {t.letra} – {t.inicio} às {t.fim}</span>
          <span><b>Supervisor AVSEC:</b> {supervisor}</span>
        </div>
      </div>

      <div className="mb-5">
        <div className="bg-[#1a5276] text-white text-[11px] font-semibold px-3 py-1.5 uppercase tracking-widest rounded-t">1. Recebimento de Serviço</div>
        <div className="border border-[#ddd] border-t-0 p-3 rounded-b">
          <p>Eu, <b>{supervisor}</b>, recebi o serviço de <b>{recebeuDe || '—'}</b>, com todas as normas e procedimentos em vigor.</p>
        </div>
      </div>

      <div className="mb-5">
        <div className="bg-[#1a5276] text-white text-[11px] font-semibold px-3 py-1.5 uppercase tracking-widest rounded-t">2. Efetivo em Serviço</div>
        <div className="border border-[#ddd] border-t-0 p-3 rounded-b space-y-4">
          {(['alfa', 'bravo', 'charlie', 'fox'] as Canal[]).map(c => {
            const config = CANAL_CONFIG[c];
            const data = EFETIVO_BASE[c];
            const presentes6 = (data['6h'] || []).filter(a => presence[c]?.[a.mat]);
            const presentes4 = (data['4h'] || []).filter(a => presence[c]?.[a.mat]);
            
            if (presentes6.length === 0 && presentes4.length === 0) return null;

            return (
              <div key={c}>
                <div className="bg-[#e8f4f8] border-l-4 border-[#1a9e75] px-2.5 py-1.5 text-[11px] font-bold text-[#0d5c42] mb-2 uppercase">{config.name}</div>
                
                {presentes6.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-1.5 mt-2">Agentes de Proteção – 06h (180 mês)</div>
                    <table className="w-full border-collapse text-[11px] mb-2">
                      <thead>
                        <tr className="bg-[#f5f5f5]">
                          <th className="p-1.5 px-2 border border-[#ddd] font-semibold text-left">Matrícula</th>
                          <th className="p-1.5 px-2 border border-[#ddd] font-semibold text-left">Nome</th>
                          <th className="p-1.5 px-2 border border-[#ddd] font-semibold text-left">Horário</th>
                        </tr>
                      </thead>
                      <tbody>
                        {presentes6.map(a => (
                          <tr key={a.mat}>
                            <td className="p-1.5 px-2 border border-[#ddd]">{a.mat}</td>
                            <td className="p-1.5 px-2 border border-[#ddd]">{a.nome}</td>
                            <td className="p-1.5 px-2 border border-[#ddd]">{a.turno}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {presentes4.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-1.5 mt-2">Agentes de Proteção – 04h (120 mês)</div>
                    <table className="w-full border-collapse text-[11px] mb-2">
                      <thead>
                        <tr className="bg-[#f5f5f5]">
                          <th className="p-1.5 px-2 border border-[#ddd] font-semibold text-left">Matrícula</th>
                          <th className="p-1.5 px-2 border border-[#ddd] font-semibold text-left">Nome</th>
                          <th className="p-1.5 px-2 border border-[#ddd] font-semibold text-left">Horário</th>
                        </tr>
                      </thead>
                      <tbody>
                        {presentes4.map(a => (
                          <tr key={a.mat}>
                            <td className="p-1.5 px-2 border border-[#ddd]">{a.mat}</td>
                            <td className="p-1.5 px-2 border border-[#ddd]">{a.nome}</td>
                            <td className="p-1.5 px-2 border border-[#ddd]">{a.turno}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {ocorrencias.length > 0 && (
        <div className="mb-5">
          <div className="bg-[#1a5276] text-white text-[11px] font-semibold px-3 py-1.5 uppercase tracking-widest rounded-t">3. Registro de Ocorrências</div>
          <div className="border border-[#ddd] border-t-0 p-3 rounded-b space-y-3">
            {ocorrencias.map((o, i) => (
              <div key={i} className="mb-2.5 p-2 px-2.5 border-l-4 border-[#1a9e75] bg-[#f9f9f9]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#1a5276] text-white">{o.tipo}</span>
                  <span className="text-[10px] text-[#888] font-mono">{o.hora}</span>
                </div>
                <div className="text-[11px] text-[#333] whitespace-pre-wrap">{o.desc}</div>
                {o.agente && <div className="text-[9px] text-[#666] mt-1 font-mono">{o.agente}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 pt-3 border-t border-[#ddd] flex justify-between text-[11px] text-[#666]">
        <div>Manaus, {data}.</div>
        <div className="text-center">
          <div className="border-t border-[#333] w-[180px] mx-auto mt-6 mb-1"></div>
          <div className="text-[11px] font-bold">{supervisor}</div>
          <div className="text-[10px] text-[#888]">Supervisor AVSEC</div>
        </div>
      </div>
    </div>
  );
}
