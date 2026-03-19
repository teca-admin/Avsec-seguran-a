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
    <div id="pdf-report-content" className="bg-white text-black font-sans text-[12px] leading-relaxed w-full max-w-[21cm] mx-auto print:m-0 print:p-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        #pdf-report-content {
          font-family: 'Inter', sans-serif !important;
          color: #000 !important;
        }

        @media screen {
          #pdf-report-content {
            padding: 1.5cm;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            margin: 20px auto;
            border: 1px solid #eee;
            min-height: 29.7cm;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide everything by default */
          body * {
            visibility: hidden;
          }
          
          /* Show only the report content and its ancestors */
          #pdf-report-content, 
          #pdf-report-content * {
            visibility: visible;
          }
          
          #pdf-report-content {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            display: block !important;
          }

          /* Reset ancestors to ensure they don't interfere with layout or create extra pages */
          #root, main, .fixed, [role="dialog"], .bg-surface-3, .bg-white.shadow-lg {
            position: static !important;
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }

          /* Force page breaks and avoid breaking inside small elements */
          .section-container {
            page-break-inside: auto !important;
            break-inside: auto !important;
            margin-bottom: 25px !important;
            display: block !important;
            width: 100% !important;
          }

          .break-inside-avoid, tr, .channel-header, .section-title, .signature-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Hide UI elements that shouldn't be printed */
          header, footer, .btn, .no-print, [role="dialog"] button {
            display: none !important;
          }
        }

        .report-header-band {
          background-color: #1A5276 !important;
          -webkit-print-color-adjust: exact;
          color: white !important;
          padding: 25px 20px;
          text-align: center;
          width: 100%;
          margin-bottom: 30px;
        }
        
        .section-title {
          background-color: #1A5276 !important;
          -webkit-print-color-adjust: exact;
          color: white !important;
          font-size: 11px;
          font-weight: bold;
          padding: 8px 15px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 0;
        }

        .section-content {
          border: 1px solid #1A5276;
          padding: 15px;
          background-color: #FFFFFF;
          margin-bottom: 20px;
        }

        .channel-header {
          background-color: #EBF5FB !important;
          -webkit-print-color-adjust: exact;
          border-left: 5px solid #1A5276;
          color: #1A5276;
          font-weight: bold;
          padding: 8px 12px;
          margin-bottom: 10px;
          text-transform: uppercase;
          font-size: 10px;
        }

        .efetivo-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }

        .efetivo-table th {
          background-color: #F8F9F9 !important;
          -webkit-print-color-adjust: exact;
          border: 1px solid #D5DBDB;
          padding: 6px 10px;
          text-align: left;
          font-weight: bold;
          font-size: 10px;
          color: #2C3E50;
        }

        .efetivo-table td {
          border: 1px solid #D5DBDB;
          padding: 6px 10px;
          font-size: 11px;
          color: #2C3E50;
        }

        .efetivo-table tr:nth-child(even) {
          background-color: #FBFCFC !important;
          -webkit-print-color-adjust: exact;
        }

        .footer-line {
          border-top: 2px solid #1A5276;
          margin-top: 50px;
          padding-top: 15px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #2C3E50;
        }

        .signature-block {
          text-align: center;
          min-width: 250px;
        }

        .signature-line {
          border-top: 1px solid #2C3E50;
          margin-top: 40px;
          margin-bottom: 8px;
        }
      `}} />

      {/* Header Band */}
      <div className="report-header-band">
        <h1 className="text-xl font-bold m-0 tracking-wide">PASSAGEM DE SERVIÇO DOS POSTOS DE PROTEÇÃO</h1>
        <div className="text-base mt-1 font-semibold opacity-90">Aeroporto Internacional de Manaus "Eduardo Gomes"</div>
        <div className="text-[12px] mt-4 pt-3 border-t border-white/20 font-medium flex justify-center gap-6">
          <span><b>DATA:</b> {data}</span>
          <span>/</span>
          <span><b>TURNO:</b> {t.letra} ({t.inicio} – {t.fim})</span>
          <span>/</span>
          <span><b>SUPERVISOR:</b> {supervisor}</span>
        </div>
      </div>

      {/* 1. Recebimento */}
      <div className="section-container">
        <div className="section-title">1. Recebimento de Serviço</div>
        <div className="section-content">
          <p className="text-[12px]">Eu, <b>{supervisor}</b>, assumi o posto de Supervisor AVSEC, tendo recebido o serviço de <b>{recebeuDe || '—'}</b>, ciente de todas as normas, procedimentos e diretrizes em vigor para o referido turno.</p>
        </div>
      </div>

      {/* 2. Efetivo */}
      <div className="section-container">
        <div className="section-title">2. Efetivo em Serviço</div>
        <div className="section-content space-y-8">
          {(['alfa', 'bravo', 'charlie', 'fox'] as Canal[]).map(c => {
            const config = CANAL_CONFIG[c];
            const data = EFETIVO_BASE[c];
            const presentes6 = (data['6h'] || []).filter(a => presence[c]?.[a.mat]);
            const presentes4 = (data['4h'] || []).filter(a => presence[c]?.[a.mat]);
            
            if (presentes6.length === 0 && presentes4.length === 0) return null;

            return (
              <div key={c} className="break-inside-avoid">
                <div className="channel-header flex justify-between items-center">
                  <span>{config.name}</span>
                  <span className="text-[9px] font-normal">Total: {presentes6.length + presentes4.length} agentes</span>
                </div>
                
                {presentes6.length > 0 && (
                  <div className="mb-6">
                    <div className="text-[10px] font-bold text-[#1A5276] uppercase mb-2 px-1">Agentes de Proteção – Jornada 06h</div>
                    <table className="efetivo-table">
                      <thead>
                        <tr>
                          <th className="w-24">Matrícula</th>
                          <th>Nome Completo</th>
                          <th className="w-32">Horário de Trabalho</th>
                        </tr>
                      </thead>
                      <tbody>
                        {presentes6.map(a => (
                          <tr key={a.mat}>
                            <td className="font-mono font-medium">{a.mat}</td>
                            <td>{a.nome}</td>
                            <td>{a.turno}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {presentes4.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-[#1A5276] uppercase mb-2 px-1">Agentes de Proteção – Jornada 04h</div>
                    <table className="efetivo-table">
                      <thead>
                        <tr>
                          <th className="w-24">Matrícula</th>
                          <th>Nome Completo</th>
                          <th className="w-32">Horário de Trabalho</th>
                        </tr>
                      </thead>
                      <tbody>
                        {presentes4.map(a => (
                          <tr key={a.mat}>
                            <td className="font-mono font-medium">{a.mat}</td>
                            <td>{a.nome}</td>
                            <td>{a.turno}</td>
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

      {/* 3. Ocorrências */}
      {ocorrencias.length > 0 && (
        <div className="section-container">
          <div className="section-title">3. Registro de Ocorrências</div>
          <div className="section-content space-y-5">
            {ocorrencias.map((o, i) => (
              <div key={i} className="p-4 border border-gray-200 border-l-4 border-[#1A5276] bg-white rounded-r break-inside-avoid shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold uppercase px-3 py-1 rounded bg-[#EBF5FB] text-[#1A5276]">{o.tipo}</span>
                  <span className="text-[11px] text-gray-600 font-bold">{o.hora}</span>
                </div>
                <div className="text-[12px] text-gray-800 whitespace-pre-wrap leading-relaxed">{o.desc}</div>
                {o.agente && (
                  <div className="text-[10px] text-gray-500 mt-3 pt-3 border-t border-gray-100 italic">
                    <b>Envolvido(s):</b> {o.agente}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Equipamentos */}
      {equipamentos && equipamentos.length > 0 && (
        <div className="section-container">
          <div className="section-title">4. Equipamentos com Defeito</div>
          <div className="section-content">
            <table className="efetivo-table">
              <thead>
                <tr>
                  <th>Equipamento</th>
                  <th>Localização</th>
                  <th>Descrição do Defeito</th>
                  <th className="w-24">Nº O.S.</th>
                  <th className="w-24">Prazo Previsto</th>
                </tr>
              </thead>
              <tbody>
                {equipamentos.map((e, i) => (
                  <tr key={i}>
                    <td className="font-bold text-[#1A5276]">{e.tipo}</td>
                    <td>{e.local}</td>
                    <td className="text-[11px] leading-snug">{e.descricao}</td>
                    <td className="font-mono text-[11px]">{e.os || '—'}</td>
                    <td className="text-[11px]">{e.prazo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Fluxo */}
      {paxFlow && (paxFlow.total || paxFlow.pico || paxFlow.obs) && (
        <div className="section-container">
          <div className="section-title">5. Fluxo de Passageiros</div>
          <div className="section-content">
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="p-3 border border-gray-200 rounded-lg text-center bg-gray-50">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Total Passageiros</div>
                <div className="text-xl font-bold text-black">{paxFlow.total || '0'}</div>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg text-center bg-gray-50">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Pico de Fluxo</div>
                <div className="text-xl font-bold text-black">{paxFlow.pico || '0'}</div>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg text-center bg-gray-50">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Horário de Pico</div>
                <div className="text-xl font-bold text-black">{paxFlow.horaPico || '—'}</div>
              </div>
            </div>
            {paxFlow.obs && (
              <div className="text-[12px] text-gray-700 p-4 bg-white border border-gray-200 rounded-lg">
                <b className="text-[#1A5276] uppercase text-[10px] block mb-2 border-b border-gray-100 pb-1">Observações Adicionais:</b>
                <div className="whitespace-pre-wrap">{paxFlow.obs}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Voos */}
      {voos && voos.length > 0 && (
        <div className="section-container">
          <div className="section-title">6. Voos Internacionais</div>
          <div className="section-content">
            <table className="efetivo-table">
              <thead>
                <tr>
                  <th>Nº Voo</th>
                  <th>Horário</th>
                  <th>Módulo</th>
                  <th>APF Responsável</th>
                  <th>Total Pax</th>
                </tr>
              </thead>
              <tbody>
                {voos.map((v, i) => (
                  <tr key={i}>
                    <td className="font-bold text-[#1A5276]">{v.numero}</td>
                    <td>{v.horario}</td>
                    <td>{v.modulo}</td>
                    <td>{v.apf}</td>
                    <td className="font-bold">{v.pax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="footer-line">
        <div>
          <p><b>Localidade:</b> Manaus, AM</p>
          <p><b>Relatório gerado em:</b> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR').slice(0, 5)}</p>
        </div>
        <div className="signature-block">
          <div className="signature-line"></div>
          <div className="text-[13px] font-bold text-[#1A5276] uppercase">{supervisor}</div>
          <div className="text-[11px] text-gray-600 font-semibold">Supervisor AVSEC · WFS</div>
        </div>
      </div>
    </div>
  );
}
