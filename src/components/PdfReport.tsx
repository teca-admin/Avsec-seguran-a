import React from 'react';
import { Canal, CANAL_CONFIG, TURNOS, ALTERNATIVAS_CONFIG } from '../constants';
import { Ocorrencia, PaxFlow, EquipamentoDefeito, VooInternacional, AlternativaHistorico } from '../types';

interface PdfReportProps {
  turno: string;
  data: string;
  supervisor: string;
  recebeuDe: string;
  ocorrencias: Ocorrencia[];
  presence: Record<Canal, Record<string, { presente: boolean, jornada?: string }>>;
  allAgentes: any[];
  paxFlow?: PaxFlow;
  equipamentos?: EquipamentoDefeito[];
  voos?: VooInternacional[];
  canalResponsaveis?: Record<Canal, string | null>;
  movimentacoes?: any[];
  alternativas?: Record<string, number>;
  alternativasHistorico?: AlternativaHistorico[];
}

export default function PdfReport({
  turno, data, supervisor, recebeuDe, ocorrencias, presence, allAgentes, paxFlow, equipamentos, voos, canalResponsaveis, movimentacoes = [], alternativas = {}, alternativasHistorico = []
}: PdfReportProps) {
  const t = TURNOS[turno];

  return (
    <div id="pdf-report-content" className="pdf-report-container">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        .pdf-report-container {
          font-family: 'Inter', sans-serif !important;
          color: #000 !important;
          background-color: #fff !important;
          font-size: 12px;
          line-height: 1.5;
          width: 100%;
          max-width: 21cm;
          margin: 0 auto;
          /* Reset modern CSS variables that confuse html2canvas */
          --tw-shadow: 0 0 #0000;
          --tw-shadow-colored: 0 0 #0000;
          --tw-ring-offset-shadow: 0 0 #0000;
          --tw-ring-shadow: 0 0 #0000;
          --tw-ring-color: rgba(0,0,0,0);
          /* Garante que o container flua naturalmente */
          height: auto !important;
          overflow: visible !important;
          position: relative !important;
        }

        @media screen {
          .pdf-report-container {
            padding: 1.5cm;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            margin: 20px auto;
            border: 1px solid #eee;
            min-height: 29.7cm;
          }
        }

        @media print {
          body {
            visibility: hidden !important;
            background: white !important;
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
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }

          /* Garante que os pais não cortem o conteúdo */
          html, body, #root, .fixed, .overflow-y-auto, [class*="inset-0"] {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
          }

          @page {
            size: A4;
          }
        }

        .pdf-report-container * {
          box-sizing: border-box;
        }

        .report-header-band {
          background-color: #fff !important;
          color: #000 !important;
          padding: 10px 0 25px 0;
          text-align: center;
          width: 100%;
          margin-bottom: 30px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid #eee;
          /* Ajuda o html2pdf a não quebrar o cabeçalho */
          page-break-inside: avoid;
        }
        
        .report-logo {
          height: 120px;
          width: auto;
          margin-right: 20px;
        }

        .report-header-text {
          flex: 1;
          text-align: center;
        }
        
        .report-header-band h1 {
          font-size: 18px;
          font-weight: bold;
          margin: 0;
          color: #000 !important;
          text-transform: uppercase;
        }

        .header-info-line {
          font-size: 11px;
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid #eee;
          font-weight: 500;
          display: flex;
          justify-content: center;
          gap: 20px;
          color: #000 !important;
        }

        .section-container {
          margin-bottom: 25px;
          width: 100%;
        }

        .section-title {
          background-color: #ee2f24 !important;
          color: white !important;
          font-size: 11px;
          font-weight: bold;
          padding: 8px 15px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 0;
        }

        .section-content {
          border: 1px solid #ee2f24;
          padding: 15px;
          background-color: #FFFFFF;
          margin-bottom: 20px;
        }

        .channel-header {
          background-color: #fef2f2 !important;
          border-left: 5px solid #ee2f24;
          color: #ee2f24;
          font-weight: bold;
          padding: 8px 12px;
          margin-bottom: 10px;
          text-transform: uppercase;
          font-size: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .efetivo-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }

        .efetivo-table th {
          background-color: #F8F9F9 !important;
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

        .ocorrencia-card {
          padding: 15px;
          border: 1px solid #e5e7eb;
          border-left: 4px solid #ee2f24;
          background-color: #fff;
          margin-bottom: 15px;
          border-radius: 0 4px 4px 0;
        }

        .ocorrencia-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .ocorrencia-tipo {
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 4px;
          background-color: #fef2f2;
          color: #ee2f24;
        }

        .ocorrencia-hora {
          font-size: 11px;
          color: #4b5563;
          font-weight: bold;
        }

        .ocorrencia-desc {
          font-size: 12px;
          color: #1f2937;
          white-space: pre-wrap;
          line-height: 1.6;
        }

        .img-container {
          margin-top: 15px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #f3f4f6;
          max-width: 400px;
        }

        .img-evidencia {
          width: 100%;
          height: auto;
          display: block;
          max-height: 300px;
          object-fit: contain;
        }

        .pax-grid {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
        }

        .pax-item {
          flex: 1;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          text-align: center;
          background-color: #f9fafb;
        }

        .pax-label {
          font-size: 9px;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .pax-value {
          font-size: 18px;
          font-weight: bold;
          color: #000;
        }

        .footer-line {
          border-top: 2px solid #ee2f24;
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
        <img 
          src="https://lh3.googleusercontent.com/d/1sNzDKhdh2zH8d8DoyqIjx8l5LzBEXN5g" 
          alt="Logo" 
          className="report-logo"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <div className="report-header-text">
          <h1>PASSAGEM DE SERVIÇO DOS POSTOS DE PROTEÇÃO</h1>
          <div style={{ fontSize: '15px', marginTop: '4px', fontWeight: '600', color: '#000' }}>Aeroporto Internacional de Manaus "Eduardo Gomes"</div>
          <div className="header-info-line">
            <span><b>DATA:</b> {data}</span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span><b>TURNO:</b> {t.letra} ({t.inicio} – {t.fim})</span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span><b>SUPERVISOR:</b> {supervisor}</span>
          </div>
        </div>
      </div>

      {/* 1. Recebimento */}
      <div className="section-container">
        <div className="section-title">1. Recebimento de Serviço</div>
        <div className="section-content">
          <p>Eu, <b>{supervisor}</b>, assumi o posto de Supervisor AVSEC, tendo recebido o serviço de <b>{recebeuDe || '—'}</b>, ciente de todas as normas, procedimentos e diretrizes em vigor para o referido turno.</p>
        </div>
      </div>

      {/* 2. Efetivo */}
      <div className="section-container">
        <div className="section-title">2. Efetivo em Serviço</div>
        <div className="section-content">
          {(['alfa', 'bravo', 'charlie', 'fox'] as Canal[]).map(c => {
            const config = CANAL_CONFIG[c];
            const altCfg = ALTERNATIVAS_CONFIG[c];
            const altAtual = alternativas[c] ?? altCfg.padrao;
            const altLabel = altCfg.label[altAtual] || `Alternativa ${altAtual}`;
            const altDescricao = altCfg.descricao[altAtual] || '';
            const presentes = allAgentes.filter(a => presence[c]?.[a.matricula]?.presente);
            const hasIntermediario = presentes.some(a => presence[c]?.[a.matricula]?.jornada === 'intermediário');
            const responsavelId = canalResponsaveis?.[c];
            const responsavelNome = responsavelId ? (allAgentes.find(a => a.matricula === responsavelId)?.nome || responsavelId) : null;

            if (presentes.length === 0) return null;

            return (
              <div key={c} style={{ marginBottom: '20px' }}>
                <div className="channel-header">
                  <div>
                    <div>{config.name}</div>
                    <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#b91c1c', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      {altLabel} – IS107
                    </div>
                    <div style={{ fontSize: '8px', fontWeight: 'normal', color: '#7f1d1d', marginTop: '1px' }}>{altDescricao}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'normal' }}>Total: {presentes.length} agentes</span>
                    {responsavelNome && (
                      <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#ee2f24' }}>Responsável: {responsavelNome}</span>
                    )}
                  </div>
                </div>
                
                <table className="efetivo-table">
                  <thead>
                    <tr>
                      <th style={{ width: '100px' }}>Matrícula</th>
                      <th>Nome Completo</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Jornada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presentes.map(a => {
                      const jornada = presence[c]?.[a.matricula]?.jornada;
                      const isInter = jornada === 'intermediário';
                      return (
                        <tr key={a.matricula} style={isInter ? { backgroundColor: '#fffbeb' } : {}}>
                          <td style={{ fontFamily: 'monospace' }}>{a.matricula}</td>
                          <td>{a.nome}</td>
                          <td style={{ fontFamily: 'monospace', textAlign: 'center', color: isInter ? '#d97706' : undefined, fontWeight: isInter ? 'bold' : undefined }}>
                            {isInter ? 'Intermediário *' : (jornada || '—')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {hasIntermediario && (
                  <div style={{ fontSize: '9px', color: '#92400e', fontStyle: 'italic', marginTop: '4px', padding: '4px 8px', backgroundColor: '#fffbeb', borderRadius: '4px', border: '1px solid #fcd34d' }}>
                    * <b>Agente Intermediário</b>: profissional em regime de duplo turno que permanece em serviço durante a transição entre turnos consecutivos.
                  </div>
                )}
              </div>
            );
          })}
          {alternativasHistorico.length > 0 && (
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#9a3412', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                Histórico de Alterações de Alternativas
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px 8px', backgroundColor: '#ffedd5', border: '1px solid #fed7aa', color: '#7c2d12' }}>Horário</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px', backgroundColor: '#ffedd5', border: '1px solid #fed7aa', color: '#7c2d12' }}>Canal</th>
                    <th style={{ textAlign: 'center', padding: '4px 8px', backgroundColor: '#ffedd5', border: '1px solid #fed7aa', color: '#7c2d12' }}>De</th>
                    <th style={{ textAlign: 'center', padding: '4px 8px', backgroundColor: '#ffedd5', border: '1px solid #fed7aa', color: '#7c2d12' }}>Para</th>
                  </tr>
                </thead>
                <tbody>
                  {alternativasHistorico.map((h, i) => (
                    <tr key={i}>
                      <td style={{ padding: '4px 8px', border: '1px solid #fed7aa', fontFamily: 'monospace' }}>
                        {new Date(h.alterado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '4px 8px', border: '1px solid #fed7aa' }}>{CANAL_CONFIG[h.canal as Canal]?.name || h.canal}</td>
                      <td style={{ padding: '4px 8px', border: '1px solid #fed7aa', textAlign: 'center', color: '#6b7280' }}>
                        {h.alternativa_anterior != null ? `Alt. ${h.alternativa_anterior}` : '—'}
                      </td>
                      <td style={{ padding: '4px 8px', border: '1px solid #fed7aa', textAlign: 'center', fontWeight: 'bold', color: '#9a3412' }}>
                        Alt. {h.alternativa_nova}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 3. Ocorrências */}
      {ocorrencias.length > 0 && (
        <div className="section-container">
          <div className="section-title">3. Registro de Ocorrências</div>
          <div className="section-content">
            {ocorrencias.map((o, i) => (
              <div key={i} className="ocorrencia-card">
                <div className="ocorrencia-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className="ocorrencia-tipo">
                      {o.tipo === 'gpa' ? 'Registro de passageiro armado' : 
                       o.tipo === 'gdaf' ? 'Registro de despacho de arma de fogo' : 
                       o.tipo}
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', letterSpacing: '0.5px' }}>
                      {CANAL_CONFIG[o.canal]?.label || o.canal}
                    </span>
                  </div>
                  <span className="ocorrencia-hora">
                    {o.hora}
                    {o.tipo !== 'teca' && (o.hora_inicio || o.hora_fim) && (
                      <span style={{ marginLeft: '8px', fontWeight: 'normal', fontSize: '10px', color: '#6b7280' }}>
                        ({o.hora_inicio || '--:--'} às {o.hora_fim || '--:--'})
                      </span>
                    )}
                  </span>
                </div>
                <div className="ocorrencia-desc">{o.desc}</div>
                
                {(o.passageiro_nome || o.passageiro_cpf || o.voo) && (
                  <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #e5e7eb', fontSize: '11px' }}>
                    {o.passageiro_nome && <div><b>Passageiro:</b> {o.passageiro_nome}</div>}
                    {o.passageiro_cpf && <div><b>CPF:</b> {o.passageiro_cpf}</div>}
                    {o.voo && <div><b>Voo:</b> {o.voo}</div>}
                  </div>
                )}
                {o.imagem_url && (
                  <div className="img-container">
                    <img 
                      src={o.imagem_url} 
                      alt="Evidência" 
                      className="img-evidencia"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                {o.agente && (
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f3f4f6', fontStyle: 'italic' }}>
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
                  <th>Defeito</th>
                  <th style={{ width: '80px' }}>O.S.</th>
                  <th style={{ width: '100px' }}>Prazo</th>
                </tr>
              </thead>
              <tbody>
                {equipamentos.map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 'bold', color: '#ee2f24' }}>{e.tipo}</td>
                    <td>{e.local}</td>
                    <td style={{ fontSize: '11px' }}>{e.descricao}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{e.os || '—'}</td>
                    <td style={{ fontSize: '11px' }}>{e.prazo || '—'}</td>
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
            <div className="pax-grid">
              <div className="pax-item">
                <div className="pax-label">Total Passageiros</div>
                <div className="pax-value">{paxFlow.total || '0'}</div>
              </div>
              <div className="pax-item">
                <div className="pax-label">Pico de Fluxo</div>
                <div className="pax-value">{paxFlow.pico || '0'}</div>
              </div>
              <div className="pax-item">
                <div className="pax-label">Horário de Pico</div>
                <div className="pax-value">{paxFlow.horaPico || '—'}</div>
              </div>
            </div>

            {paxFlow.texto && (
              <div style={{ marginBottom: '15px', fontSize: '11px', color: '#374151', padding: '12px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <b style={{ color: '#ee2f24', textTransform: 'uppercase', fontSize: '9px', display: 'block', marginBottom: '5px' }}>Informações Adicionais:</b>
                <div style={{ whiteSpace: 'pre-wrap' }}>{paxFlow.texto}</div>
              </div>
            )}

            {(paxFlow.img1 || paxFlow.img2) && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                {paxFlow.img1 && (
                  <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                    <img src={paxFlow.img1} alt="Fluxo 1" style={{ width: '100%', height: '150px', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                  </div>
                )}
                {paxFlow.img2 && (
                  <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                    <img src={paxFlow.img2} alt="Fluxo 2" style={{ width: '100%', height: '150px', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
            )}

            {paxFlow.obs && (
              <div style={{ fontSize: '11px', color: '#374151', padding: '12px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <b style={{ color: '#ee2f24', textTransform: 'uppercase', fontSize: '9px', display: 'block', marginBottom: '5px' }}>Observações:</b>
                <div style={{ whiteSpace: 'pre-wrap' }}>{paxFlow.obs}</div>
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
                  <th>Início/Fim</th>
                  <th>Módulo</th>
                  <th>APF</th>
                  <th>Pax</th>
                </tr>
              </thead>
              <tbody>
                {voos.map((v, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 'bold', color: '#ee2f24' }}>{v.numero}</td>
                    <td>{v.horario}</td>
                    <td style={{ fontSize: '10px' }}>
                      {v.hora_inicio || '--:--'} às {v.hora_fim || '--:--'}
                    </td>
                    <td>{v.modulo}</td>
                    <td>{v.apf}</td>
                    <td style={{ fontWeight: 'bold' }}>{v.pax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Movimentação de Intermediários */}
      {movimentacoes.length > 0 && (
        <div className="section-container">
          <div className="section-title">7. Movimentação de Agentes Intermediários</div>
          <div className="section-content">
            <table className="efetivo-table">
              <thead>
                <tr>
                  <th>Matrícula</th>
                  <th>Nome</th>
                  <th>Canal</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Entrada</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Saída</th>
                  <th>Período</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map((mov: any, i: number) => {
                  const agente = allAgentes.find((a: any) => a.matricula === mov.agente_id);
                  const canalLabel = CANAL_CONFIG[mov.canal as Canal]?.name || mov.canal;
                  return (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontSize: '10px' }}>{mov.agente_id}</td>
                      <td style={{ fontWeight: 'bold' }}>{agente?.nome || mov.agente_id}</td>
                      <td>{canalLabel}</td>
                      <td style={{ fontFamily: 'monospace', textAlign: 'center', color: '#16a34a' }}>{mov.hora_entrada || '--:--'}</td>
                      <td style={{ fontFamily: 'monospace', textAlign: 'center', color: mov.hora_saida ? '#dc2626' : '#6b7280' }}>{mov.hora_saida || 'Em serviço'}</td>
                      <td style={{ fontSize: '11px', color: '#374151' }}>
                        {canalLabel}, das {mov.hora_entrada || '--:--'} às {mov.hora_saida || '--:--'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ fontSize: '9px', color: '#6b7280', fontStyle: 'italic', marginTop: '6px' }}>
              * Agentes em regime intermediário permanecem em serviço durante a transição entre turnos consecutivos.
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="footer-line" style={{ justifyContent: 'center', textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '24px' }}>
        <div>
          <p style={{ margin: 0 }}><b>Localidade:</b> Manaus, AM</p>
          <p style={{ margin: '2px 0 0 0' }}><b>Gerado em:</b> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR').slice(0, 5)}</p>
        </div>
      </div>
    </div>
  );
}
