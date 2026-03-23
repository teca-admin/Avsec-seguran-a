import React, { useState, useEffect, useCallback } from 'react';
import { Canal, CANAL_CONFIG, TURNOS } from '../constants';
import { cn } from '../lib/utils';
import { Users, ClipboardList, Activity, FileText, Send, Loader2, HardDrive, Plane } from 'lucide-react';
import PdfReport from './PdfReport';
import { Ocorrencia, PaxFlow, EquipamentoDefeito, VooInternacional } from '../types';
import { supabase } from '../lib/supabase';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface SupervisorProps {
  turno: string;
  onTurnoChange: (letra: string) => void;
}

export default function Supervisor({ turno: initialTurno, onTurnoChange }: SupervisorProps) {
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipamentoDefeito[]>([]);
  const [paxFlow, setPaxFlow] = useState<PaxFlow | undefined>(undefined);
  const [voos, setVoos] = useState<VooInternacional[]>([]);
  const [allAgentes, setAllAgentes] = useState<any[]>([]);
  const [presence, setPresence] = useState<Record<Canal, Record<string, { presente: boolean, jornada?: string }>>>({
    alfa: {}, bravo: {}, charlie: {}, fox: {}, supervisor: {}
  });
  const [activeTurno, setActiveTurno] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [supervisorName, setSupervisorName] = useState("");
  const [recebeuDe, setRecebeuDe] = useState("");

  const fetchAgentes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .schema('seguranca')
        .from('agentes')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      if (data) setAllAgentes(data);
    } catch (err) {
      console.error('Erro ao buscar agentes:', err);
    }
  }, []);

  const buscarEfetivo = useCallback(async (turnoId: string) => {
    try {
      const { data, error } = await supabase
        .schema('seguranca')
        .from('efetivo_turno')
        .select('agente_id, presente, canal, jornada')
        .eq('turno_id', turnoId);

      if (error) {
        if (error.code === '42501') setError('Erro de Permissão: O schema "seguranca" não está exposto na API do Supabase ou as permissões de GRANT estão faltando.');
        throw error;
      }
      if (data) {
        const newPresence: Record<Canal, Record<string, { presente: boolean, jornada?: string }>> = {
          alfa: {}, bravo: {}, charlie: {}, fox: {}, supervisor: {}
        };
        
        data.forEach((p: any) => {
          const c = p.canal as Canal;
          if (newPresence[c]) {
            newPresence[c][p.agente_id] = { presente: p.presente, jornada: p.jornada };
          }
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

      if (error) {
        if (error.code === '42501') setError('Erro de Permissão: O schema "seguranca" não está exposto na API do Supabase ou as permissões de GRANT estão faltando.');
        throw error;
      }
      if (data) {
        setOcorrencias(data.map((o: any) => ({
          id: o.id,
          canal: o.canal,
          turnoId: o.turno_id,
          tipo: o.tipo,
          hora: o.hora,
          desc: o.descricao,
          agente: o.agente,
          ts: o.ts,
          imagem_url: o.imagem_url,
          apacs: o.apacs
        })));
      }
    } catch (err) {
      console.error('Erro ao buscar ocorrências:', err);
    }
  }, []);

  const buscarDadosAdicionais = useCallback(async (turnoId: string) => {
    try {
      // Buscar Equipamentos
      const { data: equipData } = await supabase
        .schema('seguranca')
        .from('equipamentos')
        .select('*')
        .eq('turno_id', turnoId);
      
      if (equipData) {
        setEquipamentos(equipData.map((e: any) => ({
          tipo: e.tipo,
          data: e.data_defeito,
          descricao: e.descricao,
          local: e.local,
          os: e.os,
          prazo: e.prazo
        })));
      }

      // Buscar Fluxo de Passageiros
      const { data: paxData } = await supabase
        .schema('seguranca')
        .from('fluxo_passageiros')
        .select('*')
        .eq('turno_id', turnoId)
        .maybeSingle();
      
      if (paxData) {
        setPaxFlow({
          total: paxData.total,
          pico: paxData.pico,
          horaPico: paxData.hora_pico,
          obs: paxData.obs
        });
      }

      // Buscar Voos Internacionais
      const { data: voosData } = await supabase
        .schema('seguranca')
        .from('voos_internacionais')
        .select('*')
        .eq('turno_id', turnoId);
      
      if (voosData) {
        setVoos(voosData.map((v: any) => ({
          numero: v.numero,
          horario: v.horario,
          modulo: v.modulo,
          apf: v.apf,
          pax: v.pax
        })));
      }
    } catch (err) {
      console.error('Erro ao buscar dados adicionais:', err);
    }
  }, []);

  const fetchActiveTurno = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .schema('seguranca')
        .from('turnos')
        .select('*')
        .eq('canal', 'geral')
        .is('fechado_em', null)
        .order('data', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (error.code === '42501') setError('Erro de Permissão: O schema "seguranca" não está exposto na API do Supabase ou as permissões de GRANT estão faltando.');
        throw error;
      }
      
      const now = new Date();
      const hour = now.getHours();
      let currentShiftLetra = 'A';
      if (hour >= 6 && hour < 12) currentShiftLetra = 'B';
      else if (hour >= 12 && hour < 18) currentShiftLetra = 'C';
      else if (hour >= 18) currentShiftLetra = 'D';

      if (data) {
        // Se a letra do turno for diferente da sugerida para agora, encerramos e criamos um novo
        if (data.letra !== currentShiftLetra) {
          await supabase
            .schema('seguranca')
            .from('turnos')
            .update({ fechado_em: now.toISOString() })
            .eq('id', data.id);
          
          return fetchActiveTurno();
        }

        setActiveTurno(data);
        onTurnoChange(data.letra);
        return data.id;
      } else {
        // Se não houver turno ativo, criar um novo para o dia de hoje
        const { data: newTurno, error: createError } = await supabase
          .schema('seguranca')
          .from('turnos')
          .insert({
            letra: currentShiftLetra,
            data: now.toISOString().split('T')[0],
            aberto_em: now.toISOString(),
            canal: 'geral'
          })
          .select()
          .single();
          
        if (createError) throw createError;
        if (newTurno) {
          setActiveTurno(newTurno);
          onTurnoChange(newTurno.letra);
          return newTurno.id;
        }
      }
    } catch (err) {
      console.error('Erro ao buscar/criar turno ativo:', err);
    }
    return null;
  }, [onTurnoChange]);

  const encerrarTurno = async () => {
    if (!activeTurno) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .schema('seguranca')
        .from('turnos')
        .update({ fechado_em: new Date().toISOString() })
        .eq('id', activeTurno.id);
        
      if (error) throw error;
      
      // Recarregar para buscar o próximo turno ou mostrar que não há ativo
      window.location.reload();
    } catch (err: any) {
      console.error('Erro ao encerrar turno:', err);
      setError('Erro ao encerrar turno: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let channel: any;
    let pollInterval: any;

    const init = async () => {
      setLoading(true);
      try {
        await fetchAgentes();
        const turnoId = await fetchActiveTurno();
        if (turnoId) {
          await Promise.all([
            buscarEfetivo(turnoId),
            buscarOcorrencias(turnoId),
            buscarDadosAdicionais(turnoId)
          ]);

          // Subscribe to Realtime - Canal Único de Alta Prioridade
          console.log('🚀 [Supervisor] Ativando Sincronização Instantânea...');
          channel = supabase
            .channel('supervisor-realtime')
            .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'ocorrencias' }, () => buscarOcorrencias(turnoId))
            .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'efetivo_turno' }, () => buscarEfetivo(turnoId))
            .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'equipamentos' }, () => buscarDadosAdicionais(turnoId))
            .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'fluxo_passageiros' }, () => buscarDadosAdicionais(turnoId))
            .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'voos_internacionais' }, () => buscarDadosAdicionais(turnoId))
            .subscribe((status) => {
              console.log('📡 [Supervisor] Status:', status);
              if (status === 'CHANNEL_ERROR') {
                console.error('❌ Erro de Conexão: Verifique se o esquema "seguranca" está em "Exposed Schemas" nas configurações de API do Supabase.');
              }
            });

          // Fallback: Sincronização de Segurança (Polling) a cada 15s
          pollInterval = setInterval(() => {
            console.log('🔄 [Supervisor] Sincronização de Segurança...');
            buscarEfetivo(turnoId);
            buscarOcorrencias(turnoId);
            buscarDadosAdicionais(turnoId);
          }, 15000);
        }
      } catch (err) {
        console.error('Erro na inicialização do Supervisor:', err);
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchActiveTurno, buscarEfetivo, buscarOcorrencias, buscarDadosAdicionais]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendWebhook = async () => {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || (process.env as any).VITE_N8N_WEBHOOK_URL;
    if (!webhookUrl || webhookUrl === 'SUA_URL_DO_N8N_AQUI') {
      alert('URL do Webhook n8n não configurada nos Secrets do AI Studio');
      return;
    }

    const element = document.getElementById('pdf-report-content');
    if (!element) {
      alert('Erro: Conteúdo do relatório não encontrado para gerar o PDF.');
      return;
    }

    setSending(true);
    try {
      // Configurações do PDF idênticas ao que o usuário vê
      const opt = {
        margin: 0,
        filename: `Relatorio_AVSEC_${activeTurno?.letra || 'Turno'}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true,
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Gerar PDF como base64
      const pdfBase64 = await html2pdf().from(element).set(opt).outputPdf('datauristring');
      
      if (!pdfBase64 || pdfBase64.length < 100) {
        throw new Error('Falha ao gerar o conteúdo do PDF. O arquivo gerado está vazio.');
      }

      console.log('📄 PDF gerado com sucesso, tamanho:', pdfBase64.length);

      const now = new Date();
      const hour = now.getHours();
      let greeting = 'Bom dia';
      if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
      else if (hour >= 18 || hour < 6) greeting = 'Boa noite';

      const payload = {
        message: `${greeting} a todos,\n\nSegue em anexo o Relatório de Passagem de turno oficial gerado pelo sistema.`,
        turno: activeTurno?.letra || initialTurno,
        data: new Date().toLocaleDateString('pt-BR'),
        supervisor: supervisorName,
        recebeuDe: recebeuDe,
        pdf_base64: pdfBase64, // O PDF REAL AQUI
        filename: opt.filename,
        timestamp: new Date().toISOString()
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
      
      alert('Relatório PDF enviado com sucesso para o e-mail via Webhook!');
      
      // Quando clicar em enviar o relatorio o turno deve ser zerado (encerrado)
      await encerrarTurno();
    } catch (error: any) {
      console.error('Erro ao gerar/enviar PDF:', error);
      alert(`Erro ao enviar relatório: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const currentTurno = activeTurno?.letra || initialTurno;
  const turnoInfo = TURNOS[currentTurno];

  if (error) {
    return (
      <div className="card p-8 border-amber-500/50 bg-amber-500/5 text-center space-y-4">
        <div className="text-3xl">⚠️</div>
        <h3 className="text-lg font-medium text-amber-500">Problema de Conexão</h3>
        <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
          {error}
        </p>
        <div className="pt-4 space-y-2">
          <p className="text-[10px] font-mono text-muted uppercase">Como resolver no Supabase SQL Editor:</p>
          <pre className="bg-surface-2 p-3 rounded text-[10px] text-left overflow-x-auto font-mono border border-border">
            {`GRANT USAGE ON SCHEMA seguranca TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA seguranca TO anon, authenticated;`}
          </pre>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="btn btn-primary btn-sm"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

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
          <div className="text-2xl font-semibold font-mono text-text">
            {Object.values(presence).reduce((acc: number, curr: Record<string, boolean>) => acc + Object.values(curr).filter(Boolean).length, 0)}
          </div>
          <div className="text-[11px] text-muted mt-0.5">confirmados presentes</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5">Ocorrências registradas</div>
          <div className="text-2xl font-semibold font-mono text-text">{ocorrencias.length}</div>
          <div className="text-[11px] text-muted mt-0.5">neste turno</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5">Canais ativos</div>
          <div className="text-2xl font-semibold font-mono text-text">4</div>
          <div className="text-[11px] text-muted mt-0.5">com efetivo confirmado</div>
        </div>
        <div className="card p-4 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5">Turno atual</div>
            <div className="text-xl font-semibold font-mono text-text">{currentTurno} · {turnoInfo.inicio}–{turnoInfo.fim}</div>
            <div className="text-[11px] text-muted mt-0.5">{supervisorName || "Não informado"}</div>
          </div>
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
              <div className="text-2xl font-semibold font-mono mb-0.5 text-text">{count}</div>
              <div className="text-[11px] text-muted">agentes presentes</div>
              <div className="text-[11px] text-muted mt-2 pt-2 border-t border-border-2">
                {channelOcorrencias} ocorrências
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] font-mono text-muted uppercase tracking-widest mb-3 pb-2 border-b border-border-2">
        Equipamentos e Fluxo de Passageiros
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Equipamentos */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={16} className="text-amber-500" />
            <span className="text-xs font-mono uppercase tracking-wider text-text">Equipamentos com Defeito</span>
          </div>
          {equipamentos.length === 0 ? (
            <p className="text-[11px] text-hint italic">Nenhum equipamento com defeito registrado.</p>
          ) : (
            <div className="space-y-2">
              {equipamentos.map((e, i) => (
                <div key={i} className="text-[12px] p-2 bg-surface-2 rounded border border-border-2">
                  <div className="font-medium text-text">{e.tipo} - {e.local}</div>
                  <div className="text-muted mt-1">{e.descricao}</div>
                  {e.os && <div className="text-[10px] text-accent mt-1">OS: {e.os}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fluxo de Passageiros */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Plane size={16} className="text-blue-500" />
            <span className="text-xs font-mono uppercase tracking-wider text-text">Fluxo de Passageiros / Voos</span>
          </div>
          {!paxFlow && voos.length === 0 ? (
            <p className="text-[11px] text-hint italic">Nenhum dado de fluxo ou voos registrado.</p>
          ) : (
            <div className="space-y-4">
              {paxFlow && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-surface-2 rounded border border-border-2">
                    <div className="text-[9px] text-muted uppercase">Total Pax</div>
                    <div className="text-sm font-mono">{paxFlow.total || '0'}</div>
                  </div>
                  <div className="p-2 bg-surface-2 rounded border border-border-2">
                    <div className="text-[9px] text-muted uppercase">Pico</div>
                    <div className="text-sm font-mono">{paxFlow.pico || '0'} ({paxFlow.horaPico || '--:--'})</div>
                  </div>
                </div>
              )}
              {voos.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-muted uppercase font-mono">Voos Internacionais</div>
                  {voos.map((v, i) => (
                    <div key={i} className="text-[11px] flex justify-between p-1 border-b border-border-2 last:border-0">
                      <span>{v.numero} ({v.horario})</span>
                      <span className="text-muted">Pax: {v.pax}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
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
                  {o.agente && (
                    <div className="text-[11px] text-hint mt-1 font-mono">
                      {o.agente}
                    </div>
                  )}
                  {o.imagem_url && (
                    <div className="mt-2">
                      <img 
                        src={o.imagem_url} 
                        alt="Evidência" 
                        className="rounded border border-border-2 max-h-40 w-auto object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dados do Supervisor para o Relatório */}
      <div className="card p-6 space-y-4">
        <div className="text-[10px] font-mono text-muted uppercase tracking-widest border-b border-border-2 pb-2">
          Dados do supervisor para o relatório
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-muted uppercase tracking-wider">Nome do Supervisor</label>
            <input 
              type="text" 
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all"
              placeholder="Nome do supervisor..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-muted uppercase tracking-wider">Recebeu de (Supervisor Turno Anterior)</label>
            <input 
              type="text" 
              value={recebeuDe}
              onChange={(e) => setRecebeuDe(e.target.value)}
              className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all"
              placeholder="Nome do supervisor anterior..."
            />
          </div>
        </div>
      </div>

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
                  supervisor={supervisorName}
                  recebeuDe={recebeuDe}
                  ocorrencias={ocorrencias}
                  presence={presence}
                  allAgentes={allAgentes}
                  equipamentos={equipamentos}
                  paxFlow={paxFlow}
                  voos={voos}
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
