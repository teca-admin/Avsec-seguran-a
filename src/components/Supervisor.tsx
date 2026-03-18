import React, { useState, useEffect, useCallback } from 'react';
import { Canal, CANAL_CONFIG, TURNOS } from '../constants';
import { cn } from '../lib/utils';
import { Users, ClipboardList, Activity, FileText, Send, Loader2 } from 'lucide-react';
import PdfReport from './PdfReport';
import { Ocorrencia } from '../types';
import { supabase } from '../lib/supabase';

interface SupervisorProps {
  turno: string;
}

export default function Supervisor({ turno: initialTurno }: SupervisorProps) {
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [presence, setPresence] = useState<Record<Canal, Record<string, boolean>>>({
    alfa: {}, bravo: {}, charlie: {}, fox: {}, supervisor: {}
  });
  const [activeTurno, setActiveTurno] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const buscarEfetivo = useCallback(async (turnoId: string) => {
    try {
      const { data, error } = await supabase
        .schema('seguranca')
        .from('efetivo_turno')
        .select('agente_id, presente, turnos(canal)')
        .eq('turno_id', turnoId);

      if (error) throw error;
      if (data) {
        const newPresence: Record<Canal, Record<string, boolean>> = {
          alfa: {}, bravo: {}, charlie: {}, fox: {}, supervisor: {}
        };
        
        data.forEach((p: any) => {
          // We need to know which channel the agent belongs to. 
          // For simplicity in this MVP, we'll check all channels in EFETIVO_BASE
          // but ideally the database schema should provide this.
          // For now, let's just map them based on where they appear.
          (['alfa', 'bravo', 'charlie', 'fox'] as Canal[]).forEach(c => {
            newPresence[c][p.agente_id] = p.presente;
          });
        });
        setPresence(newPresence);
      }
    } catch (err) {
      console.error('Erro ao buscar efetivo:', err);
    }
  }, []);

  const buscarOcorrencias = useCallback(async (turnoId: string) => {
    try {
      const { data, error } = await supabase
        .schema('seguranca')
        .from('ocorrencias')
        .select('*')
        .eq('turno_id', turnoId)
        .order('ts', { ascending: false });

      if (error) throw error;
      if (data) {
        setOcorrencias(data.map((o: any) => ({
          id: o.id,
          canal: o.canal,
          turnoId: o.turno_id,
          tipo: o.tipo,
          hora: o.hora,
          desc: o.descricao,
          agente: o.agente,
          ts: o.ts
        })));
      }
    } catch (err) {
      console.error('Erro ao buscar ocorrências:', err);
    }
  }, []);

  const fetchActiveTurno = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .schema('seguranca')
        .from('turnos')
        .select('*')
        .is('fechado_em', null)
        .order('data', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        setActiveTurno(data);
        return data.id;
      }
    } catch (err) {
      console.error('Erro ao buscar turno ativo:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    let channel: any;

    const init = async () => {
      setLoading(true);
      const turnoId = await fetchActiveTurno();
      if (turnoId) {
        await Promise.all([
          buscarEfetivo(turnoId),
          buscarOcorrencias(turnoId)
        ]);

        // Subscribe to Realtime
        channel = supabase
          .channel('dashboard')
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'seguranca', 
            table: 'ocorrencias',
            filter: `turno_id=eq.${turnoId}`
          }, () => {
            buscarOcorrencias(turnoId);
          })
          .on('postgres_changes', { 
            event: '*', 
            schema: 'seguranca', 
            table: 'efetivo_turno',
            filter: `turno_id=eq.${turnoId}`
          }, () => {
            buscarEfetivo(turnoId);
          })
          .subscribe();
      }
      setLoading(false);
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchActiveTurno, buscarEfetivo, buscarOcorrencias]);

  const handlePrint = () => {
    const printContent = document.getElementById('pdf-report-content');
    if (!printContent) return;
    
    const win = window.open('', '_blank');
    if (!win) return;
    
    win.document.write(`
      <html>
        <head>
          <title>Relatório AVSEC - Turno ${activeTurno?.letra || initialTurno}</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-white">
          ${printContent.innerHTML}
          <script>
            window.onload = () => {
              window.print();
              // window.close(); // Optional: close after print
            }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleSendWebhook = async () => {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
    if (!webhookUrl || webhookUrl === 'SUA_URL_DO_N8N_AQUI') {
      alert('URL do Webhook n8n não configurada no .env.local');
      return;
    }

    setSending(true);
    try {
      const payload = {
        turno: activeTurno?.letra || initialTurno,
        data: new Date().toLocaleDateString('pt-BR'),
        supervisor: "Elijane S. Nascimento",
        ocorrencias: ocorrencias,
        total_agentes: Object.values(presence).reduce((acc: number, curr: Record<string, boolean>) => acc + Object.values(curr).filter(Boolean).length, 0),
        timestamp: new Date().toISOString()
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
      
      alert('Relatório enviado com sucesso via Webhook!');
    } catch (error: any) {
      console.error('Erro ao enviar webhook:', error);
      alert(`Erro ao enviar relatório: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const currentTurno = activeTurno?.letra || initialTurno;
  const turnoInfo = TURNOS[currentTurno];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted">
        <Loader2 className="animate-spin" size={32} />
        <p className="font-mono text-xs uppercase tracking-widest">Carregando Dashboard...</p>
      </div>
    );
  }

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
        <p className="text-xs text-muted">{dateStr} · Turno {currentTurno}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5">Agentes em serviço</div>
          <div className="text-2xl font-semibold font-mono text-teal-500">
            {Object.values(presence).reduce((acc: number, curr: Record<string, boolean>) => acc + Object.values(curr).filter(Boolean).length, 0)}
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
          <div className="text-xl font-semibold font-mono text-accent">{currentTurno} · {turnoInfo.inicio}–{turnoInfo.fim}</div>
          <div className="text-[11px] text-muted mt-0.5">Elijane S. Nascimento</div>
        </div>
      </div>

      <div className="text-[11px] font-mono text-muted uppercase tracking-widest mb-3 pb-2 border-b border-border-2">
        Status por canal
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(['alfa', 'bravo', 'charlie', 'fox'] as Canal[]).map((c) => {
          const config = CANAL_CONFIG[c];
          // Filter presence based on EFETIVO_BASE for this canal
          const channelAgents = Object.keys(presence[c] || {});
          const count = channelAgents.filter(id => presence[c][id]).length;
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
                  turno={currentTurno}
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
