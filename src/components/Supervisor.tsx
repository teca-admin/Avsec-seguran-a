import React, { useState } from 'react';
import { Canal, CANAL_CONFIG, TURNOS } from '../constants';
import { cn } from '../lib/utils';
import { Users, ClipboardList, Activity, FileText, Send } from 'lucide-react';
import PdfReport from './PdfReport';
import { Ocorrencia } from '../types';

interface SupervisorProps {
  turno: string;
}

export default function Supervisor({ turno }: SupervisorProps) {
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [presence, setPresence] = useState<Record<Canal, Record<string, boolean>>>({
    alfa: {}, bravo: {}, charlie: {}, fox: {}, supervisor: {}
  });
  const [sending, setSending] = useState(false);

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const turnoInfo = TURNOS[turno];

  const handlePrint = () => {
    const printContent = document.getElementById('pdf-report-content');
    if (!printContent) return;
    
    const win = window.open('', '_blank');
    if (!win) return;
    
    win.document.write(`
      <html>
        <head>
          <title>Relatório AVSEC - Turno ${turno}</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = () => {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleSendWebhook = async () => {
    setSending(true);
    try {
      // Mock webhook call
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Relatório enviado com sucesso via Webhook!');
    } catch (error) {
      alert('Erro ao enviar relatório.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-text">Visão geral do turno</h2>
          <button 
            onClick={() => setIsPdfModalOpen(true)}
            className="btn btn-primary btn-sm gap-2"
          >
            <FileText size={14} />
            Gerar Relatório PDF
          </button>
        </div>
        <p className="text-xs text-muted">{dateStr} · Turno {turno}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5">Agentes em serviço</div>
          <div className="text-2xl font-semibold font-mono text-teal-500">
            {Object.values(presence).reduce((acc, curr) => acc + Object.values(curr).filter(Boolean).length, 0)}
          </div>
          <div className="text-[11px] text-muted mt-0.5">confirmados presentes</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5">Ocorrências registradas</div>
          <div className="text-2xl font-semibold font-mono text-amber-500">{ocorrencias.length}</div>
          <div className="text-[11px] text-muted mt-0.5">neste turno</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5">Canais ativos</div>
          <div className="text-2xl font-semibold font-mono text-blue-500">4</div>
          <div className="text-[11px] text-muted mt-0.5">com efetivo confirmado</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5">Turno atual</div>
          <div className="text-xl font-semibold font-mono text-accent">{turno} · {turnoInfo.inicio}–{turnoInfo.fim}</div>
          <div className="text-[11px] text-muted mt-0.5">Elijane S. Nascimento</div>
        </div>
      </div>

      <div className="text-[11px] font-mono text-muted uppercase tracking-widest mb-3 pb-2 border-b border-border-2">
        Status por canal
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(['alfa', 'bravo', 'charlie', 'fox'] as Canal[]).map((c) => {
          const config = CANAL_CONFIG[c];
          const count = Object.values(presence[c] || {}).filter(Boolean).length;
          const channelOcorrencias = ocorrencias.filter(o => o.canal === c).length;
          
          return (
            <div key={c} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-mono text-[10px] text-muted tracking-widest uppercase mb-1">{config.label}</div>
                  <div className="text-[13px] font-medium">{config.name}</div>
                </div>
                <div className={cn(
                  "w-2 h-2 rounded-full shadow-[0_0_8px_rgba(26,158,117,0.4)]",
                  count > 0 ? "bg-teal-500" : "bg-muted"
                )} />
              </div>
              <div className="text-2xl font-semibold font-mono mb-0.5">{count}</div>
              <div className="text-[11px] text-muted">agentes presentes</div>
              <div className="text-[11px] text-muted mt-2 pt-2 border-t border-border-2">
                {channelOcorrencias} ocorrências
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] font-mono text-muted uppercase tracking-widest mb-3 pb-2 border-b border-border-2">
        Feed de ocorrências – todos os canais
      </div>
      
      {ocorrencias.length === 0 ? (
        <div className="text-center py-8 px-5 text-hint text-[13px] bg-surface border border-border rounded-lg">
          <div className="text-3xl mb-2 opacity-50">📡</div>
          Nenhuma ocorrência registrada pelos postos ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {ocorrencias.map((o) => {
            const config = CANAL_CONFIG[o.canal];
            return (
              <div key={o.id} className="flex gap-3 p-3 bg-surface border border-border-2 rounded-lg">
                <div className="w-16 shrink-0 pt-1">
                  <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border border-border", config.badge)}>
                    {config.label}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                      {o.tipo}
                    </span>
                    <span className="font-mono text-[11px] text-hint">{o.hora}</span>
                  </div>
                  <div className="text-[13px] text-text leading-relaxed">
                    {o.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isPdfModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 px-5 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium">Relatório de Passagem de Serviço</span>
              <button onClick={() => setIsPdfModalOpen(false)} className="text-muted hover:text-text">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-surface-3">
              <div className="bg-white shadow-lg mx-auto">
                <PdfReport 
                  turno={turno}
                  data={new Date().toLocaleDateString('pt-BR')}
                  supervisor="Elijane S. Nascimento"
                  recebeuDe=""
                  ocorrencias={ocorrencias}
                  presence={presence}
                />
              </div>
            </div>
            <div className="p-4 px-5 border-t border-border flex justify-end gap-3">
              <button onClick={() => setIsPdfModalOpen(false)} className="btn btn-secondary">Fechar</button>
              <button 
                onClick={handleSendWebhook} 
                disabled={sending}
                className="btn btn-secondary gap-2"
              >
                <Send size={14} />
                {sending ? 'Enviando...' : 'Enviar relatório'}
              </button>
              <button onClick={handlePrint} className="btn btn-primary gap-2">
                <FileText size={14} />
                Imprimir / Salvar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
