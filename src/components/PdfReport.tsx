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
    <div id="pdf-report-content" className="bg-white text-black p-8 font-sans text-[12px] leading-relaxed max-w-[780px] mx-auto print:m-0 print:p-8 print:max-w-none print:w-full">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            margin: 1.5cm;
            size: auto;
          }
          body * {
            visibility: hidden !important;
          }
          #pdf-report-content, #pdf-report-content * {
            visibility: visible !important;
          }
          #pdf-report-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .section-container {
            page-break-inside: avoid;
            margin-bottom: 20px;
          }
        }
        .section-container {
          margin-bottom: 20px;
        }
      `}} />
      <div className="text-center border-b-2 border-[#1a5276] pb-4 mb-6">
        <div className="text-[10px] text-[#666] mb-1 uppercase tracking-widest font-bold">WFS · Proteção Aeroportuária</div>
        <h1 className="text-lg font-bold text-[#1a5276] mb-0.5">RELATÓRIO DE PASSAGEM DE SERVIÇO</h1>
        <div className="text-xs text-[#333] font-medium">Aeroporto Internacional de Manaus "Eduardo Gomes"</div>
        <div className="flex justify-center gap-8 mt-3 text-[11px] text-[#444]">
          <span><b>DATA:</b> {data}</span>
          <span><b>TURNO:</b> {t.letra} ({t.inicio} – {t.fim})</span>
          <span><b>SUPERVISOR:</b> {supervisor}</span>
        </div>
      </div>

      <div className="section-container">
        <div className="bg-[#1a5276] text-white text-[11px] font-bold px-3 py-1.5 uppercase tracking-widest rounded-t flex justify-between">
          <span>1. Recebimento de Serviço</span>
        </div>
        <div className="border border-[#ddd] border-t-0 p-4 rounded-b bg-[#fcfcfc]">
          <p className="text-[12px]">Eu, <b>{supervisor}</b>, assumi o posto de Supervisor AVSEC, tendo recebido o serviço de <b>{recebeuDe || '—'}</b>, ciente de todas as normas, procedimentos e diretrizes em vigor para o referido turno.</p>
        </div>
      </div>

      <div className="section-container">
        <div className="bg-[#1a5276] text-white text-[11px] font-bold px-3 py-1.5 uppercase tracking-widest rounded-t">2. Efetivo em Serviço</div>
        <div className="border border-[#ddd] border-t-0 p-4 rounded-b space-y-5 bg-[#fcfcfc]">
          {(['alfa', 'bravo', 'charlie', 'fox'] as Canal[]).map(c => {
            const config = CANAL_CONFIG[c];
            const data = EFETIVO_BASE[c];
            const presentes6 = (data['6h'] || []).filter(a => presence[c]?.[a.mat]);
            const presentes4 = (data['4h'] || []).filter(a => presence[c]?.[a.mat]);
            
            if (presentes6.length === 0 && presentes4.length === 0) return null;

            return (
              <div key={c} className="border border-[#eee] rounded overflow-hidden">
                <div className="bg-[#f0f7fa] border-b border-[#eee] px-3 py-1.5 text-[11px] font-bold text-[#1a5276] uppercase flex justify-between items-center">
                  <span>{config.name}</span>
                  <span className="text-[9px] font-normal text-[#666]">Total: {presentes6.length + presentes4.length} agentes</span>
                </div>
                
                <div className="p-2 space-y-4">
                  {presentes6.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold text-[#888] uppercase tracking-wider mb-1 px-1">Agentes de Proteção – 06h</div>
                      <table className="w-full border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-[#f8f8f8]">
                            <th className="p-1.5 px-2 border border-[#eee] font-bold text-left w-20">Matrícula</th>
                            <th className="p-1.5 px-2 border border-[#eee] font-bold text-left">Nome Completo</th>
                            <th className="p-1.5 px-2 border border-[#eee] font-bold text-left w-24">Horário</th>
                          </tr>
                        </thead>
                        <tbody>
                          {presentes6.map(a => (
                            <tr key={a.mat} className="hover:bg-[#fafafa]">
                              <td className="p-1.5 px-2 border border-[#eee] font-mono">{a.mat}</td>
                              <td className="p-1.5 px-2 border border-[#eee]">{a.nome}</td>
                              <td className="p-1.5 px-2 border border-[#eee]">{a.turno}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {presentes4.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold text-[#888] uppercase tracking-wider mb-1 px-1">Agentes de Proteção – 04h</div>
                      <table className="w-full border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-[#f8f8f8]">
                            <th className="p-1.5 px-2 border border-[#eee] font-bold text-left w-20">Matrícula</th>
                            <th className="p-1.5 px-2 border border-[#eee] font-bold text-left">Nome Completo</th>
                            <th className="p-1.5 px-2 border border-[#eee] font-bold text-left w-24">Horário</th>
                          </tr>
                        </thead>
                        <tbody>
                          {presentes4.map(a => (
                            <tr key={a.mat} className="hover:bg-[#fafafa]">
                              <td className="p-1.5 px-2 border border-[#eee] font-mono">{a.mat}</td>
                              <td className="p-1.5 px-2 border border-[#eee]">{a.nome}</td>
                              <td className="p-1.5 px-2 border border-[#eee]">{a.turno}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {ocorrencias.length > 0 && (
        <div className="section-container">
          <div className="bg-[#1a5276] text-white text-[11px] font-bold px-3 py-1.5 uppercase tracking-widest rounded-t">3. Registro de Ocorrências</div>
          <div className="border border-[#ddd] border-t-0 p-4 rounded-b space-y-3 bg-[#fcfcfc]">
            {ocorrencias.map((o, i) => (
              <div key={i} className="mb-3 p-3 border border-[#eee] border-l-4 border-[#1a5276] bg-white rounded-r">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-[#f0f7fa] text-[#1a5276] border border-[#d0e7f0]">{o.tipo}</span>
                  <span className="text-[10px] text-[#666] font-bold">{o.hora}</span>
                </div>
                <div className="text-[12px] text-[#333] whitespace-pre-wrap leading-relaxed">{o.desc}</div>
                {o.agente && (
                  <div className="text-[9px] text-[#888] mt-2 pt-2 border-t border-[#f5f5f5] italic">
                    <b>Envolvido(s):</b> {o.agente}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {equipamentos && equipamentos.length > 0 && (
        <div className="section-container">
          <div className="bg-[#1a5276] text-white text-[11px] font-bold px-3 py-1.5 uppercase tracking-widest rounded-t">4. Equipamentos com Defeito</div>
          <div className="border border-[#ddd] border-t-0 p-4 rounded-b bg-[#fcfcfc]">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#f8f8f8]">
                  <th className="p-2 border border-[#eee] font-bold text-left">Equipamento</th>
                  <th className="p-2 border border-[#eee] font-bold text-left">Local</th>
                  <th className="p-2 border border-[#eee] font-bold text-left">Descrição do Defeito</th>
                  <th className="p-2 border border-[#eee] font-bold text-left w-24">OS</th>
                  <th className="p-2 border border-[#eee] font-bold text-left w-24">Prazo</th>
                </tr>
              </thead>
              <tbody>
                {equipamentos.map((e, i) => (
                  <tr key={i} className="hover:bg-[#fafafa]">
                    <td className="p-2 border border-[#eee] font-medium">{e.tipo}</td>
                    <td className="p-2 border border-[#eee]">{e.local}</td>
                    <td className="p-2 border border-[#eee] text-[10px] leading-tight">{e.descricao}</td>
                    <td className="p-2 border border-[#eee] font-mono text-[10px]">{e.os || '—'}</td>
                    <td className="p-2 border border-[#eee] text-[10px]">{e.prazo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {paxFlow && (paxFlow.total || paxFlow.pico || paxFlow.obs) && (
        <div className="section-container">
          <div className="bg-[#1a5276] text-white text-[11px] font-bold px-3 py-1.5 uppercase tracking-widest rounded-t">5. Fluxo de Passageiros</div>
          <div className="border border-[#ddd] border-t-0 p-4 rounded-b bg-[#fcfcfc]">
            <div className="grid grid-cols-3 gap-6 mb-4">
              <div className="p-3 bg-white border border-[#eee] rounded shadow-sm text-center">
                <div className="text-[9px] text-[#888] uppercase font-bold mb-1">Total de Passageiros</div>
                <div className="text-lg font-bold text-[#1a5276]">{paxFlow.total || '0'}</div>
              </div>
              <div className="p-3 bg-white border border-[#eee] rounded shadow-sm text-center">
                <div className="text-[9px] text-[#888] uppercase font-bold mb-1">Pico de Passageiros</div>
                <div className="text-lg font-bold text-[#1a5276]">{paxFlow.pico || '0'}</div>
              </div>
              <div className="p-3 bg-white border border-[#eee] rounded shadow-sm text-center">
                <div className="text-[9px] text-[#888] uppercase font-bold mb-1">Horário de Pico</div>
                <div className="text-lg font-bold text-[#1a5276]">{paxFlow.horaPico || '—'}</div>
              </div>
            </div>
            {paxFlow.obs && (
              <div className="text-[12px] text-[#333] p-3 bg-white border border-[#eee] rounded">
                <b className="text-[#1a5276] uppercase text-[10px] block mb-1">Observações:</b>
                {paxFlow.obs}
              </div>
            )}
          </div>
        </div>
      )}

      {voos && voos.length > 0 && (
        <div className="section-container">
          <div className="bg-[#1a5276] text-white text-[11px] font-bold px-3 py-1.5 uppercase tracking-widest rounded-t">6. Voos Internacionais</div>
          <div className="border border-[#ddd] border-t-0 p-4 rounded-b bg-[#fcfcfc]">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#f8f8f8]">
                  <th className="p-2 border border-[#eee] font-bold text-left">Voo</th>
                  <th className="p-2 border border-[#eee] font-bold text-left">Horário</th>
                  <th className="p-2 border border-[#eee] font-bold text-left">Módulo</th>
                  <th className="p-2 border border-[#eee] font-bold text-left">APF</th>
                  <th className="p-2 border border-[#eee] font-bold text-left">Pax</th>
                </tr>
              </thead>
              <tbody>
                {voos.map((v, i) => (
                  <tr key={i} className="hover:bg-[#fafafa]">
                    <td className="p-2 border border-[#eee] font-bold text-[#1a5276]">{v.numero}</td>
                    <td className="p-2 border border-[#eee]">{v.horario}</td>
                    <td className="p-2 border border-[#eee]">{v.modulo}</td>
                    <td className="p-2 border border-[#eee]">{v.apf}</td>
                    <td className="p-2 border border-[#eee] font-bold">{v.pax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-10 pt-4 border-t-2 border-[#1a5276] flex justify-between text-[11px] text-[#444]">
        <div>
          <p><b>Local:</b> Manaus, AM</p>
          <p><b>Data de Emissão:</b> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR').slice(0, 5)}</p>
        </div>
        <div className="text-center min-w-[250px]">
          <div className="border-t border-[#333] w-full mt-8 mb-1"></div>
          <div className="text-[12px] font-bold text-[#1a5276] uppercase">{supervisor}</div>
          <div className="text-[10px] text-[#666] font-medium tracking-widest">SUPERVISOR AVSEC · WFS</div>
        </div>
      </div>
    </div>
  );
}
