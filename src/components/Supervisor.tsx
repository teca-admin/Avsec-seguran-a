import React, { useState, useEffect, useCallback } from 'react';
import { Canal, CANAL_CONFIG, TURNOS } from '../constants';
import { cn } from '../lib/utils';
import { Users, ClipboardList, Activity, FileText, Send, Loader2, HardDrive, Plane, Clock, Plus, History, Search, ChevronDown } from 'lucide-react';
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
  const [isLoadingTurno, setIsLoadingTurno] = useState(true);
  const [isOpeningTurno, setIsOpeningTurno] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [supervisorName, setSupervisorName] = useState("");
  const [recebeuDe, setRecebeuDe] = useState("");
  const [editingOcorrencia, setEditingOcorrencia] = useState<Ocorrencia | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState<any | null>(null);
  const [isEditEquipModalOpen, setIsEditEquipModalOpen] = useState(false);
  const [editingVoo, setEditingVoo] = useState<any | null>(null);
  const [isEditVooModalOpen, setIsEditVooModalOpen] = useState(false);
  const [isEditPaxModalOpen, setIsEditPaxModalOpen] = useState(false);
  const [editingPaxFlow, setEditingPaxFlow] = useState<any | null>(null);
  const [canalResponsaveis, setCanalResponsaveis] = useState<Record<Canal, string | null>>({
    alfa: null, bravo: null, charlie: null, fox: null, supervisor: null
  });
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [pendingClose, setPendingClose] = useState(false);

  // Intermediário closure check
  const [closureCheckOpen, setClosureCheckOpen] = useState(false);
  const [intermediariosToCheck, setIntermediariosToCheck] = useState<any[]>([]);
  const [intermediarioDecisions, setIntermediarioDecisions] = useState<Record<string, { present: boolean; hora_saida: string }>>({});
  const [movimentacoesAll, setMovimentacoesAll] = useState<any[]>([]);

  // Historical reports
  const [isHistoricoOpen, setIsHistoricoOpen] = useState(false);
  const [historicoFiltros, setHistoricoFiltros] = useState({ turno: '', canal: '', tipo: '' });
  const [historicoResultados, setHistoricoResultados] = useState<any[]>([]);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false);
  // Calendar range picker state
  const [histRangeStart, setHistRangeStart] = useState('');
  const [histRangeEnd, setHistRangeEnd] = useState('');
  const [calViewDate, setCalViewDate] = useState(() => new Date());
  const [calHoverDay, setCalHoverDay] = useState('');
  // Detalhe do turno (PDF histórico)
  const [historicoDetalhe, setHistoricoDetalhe] = useState<any | null>(null);
  const [isLoadingDetalhe, setIsLoadingDetalhe] = useState(false);

  const fetchMovimentacoesAll = useCallback(async (turnoId: string) => {
    try {
      const { data } = await supabase.schema('seguranca').from('agente_movimentacoes').select('*').eq('turno_id', turnoId);
      if (data) setMovimentacoesAll(data);
    } catch (err) {
      console.error('Erro ao buscar movimentações:', err);
    }
  }, []);

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

  const buscarResponsaveis = useCallback(async (turnoId: string) => {
    try {
      const { data } = await supabase
        .schema('seguranca')
        .from('canal_responsavel')
        .select('canal, agente_id')
        .eq('turno_id', turnoId);
      if (data) {
        const map: Record<Canal, string | null> = { alfa: null, bravo: null, charlie: null, fox: null, supervisor: null };
        data.forEach((r: any) => { if (r.canal in map) map[r.canal as Canal] = r.agente_id; });
        setCanalResponsaveis(map);
      }
    } catch (err) {
      console.error('Erro ao buscar responsáveis:', err);
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
          hora_inicio: o.hora_inicio,
          hora_fim: o.hora_fim,
          desc: o.descricao,
          agente: o.agente,
          ts: o.ts,
          imagem_url: o.imagem_url,
          apacs: o.apacs,
          passageiro_nome: o.passageiro_nome,
          passageiro_cpf: o.passageiro_cpf,
          voo: o.voo
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
          id: e.id,
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
          obs: paxData.obs,
          img1: paxData.img1,
          img2: paxData.img2,
          texto: paxData.texto
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
          id: v.id,
          numero: v.numero,
          horario: v.horario,
          hora_inicio: v.hora_inicio,
          hora_fim: v.hora_fim,
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
      setIsLoadingTurno(true);
      // Buscar QUALQUER turno aberto
      const { data, error } = await supabase
        .schema('seguranca')
        .from('turnos')
        .select('*')
        .eq('canal', 'geral')
        .is('fechado_em', null)
        .order('data', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setActiveTurno(data);
        onTurnoChange(data.letra);
        return data.id;
      } else {
        setActiveTurno(null);
      }
    } catch (err) {
      console.error('Erro ao buscar turno ativo:', err);
    } finally {
      setIsLoadingTurno(false);
    }
    return null;
  }, [onTurnoChange]);

  const handleAbrirTurno = async () => {
    try {
      setIsOpeningTurno(true);
      const now = new Date();
      const hour = now.getHours();
      
      // Determinar a letra do turno baseada no horário atual
      let currentShiftLetra = 'A';
      if (hour >= 6 && hour < 12) currentShiftLetra = 'B';
      else if (hour >= 12 && hour < 18) currentShiftLetra = 'C';
      else if (hour >= 18) currentShiftLetra = 'D';

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
        // Atualiza a tela silenciosamente sem reload
        await fetchActiveTurno();
      }
    } catch (error) {
      console.error('Erro ao abrir novo turno:', error);
    } finally {
      setIsOpeningTurno(false);
    }
  };

  const checkIntermediarios = useCallback(async () => {
    if (!activeTurno?.id) return [];
    try {
      const { data: efetivo } = await supabase.schema('seguranca').from('efetivo_turno').select('agente_id, canal').eq('turno_id', activeTurno.id).eq('jornada', 'intermediário').eq('presente', true);
      if (!efetivo || efetivo.length === 0) return [];

      const { data: movs } = await supabase.schema('seguranca').from('agente_movimentacoes').select('*').eq('turno_id', activeTurno.id).is('hora_saida', null);
      const semSaida = new Set((movs || []).map((m: any) => m.agente_id));

      return efetivo
        .filter((e: any) => semSaida.has(e.agente_id))
        .map((e: any) => {
          const agente = allAgentes.find((a: any) => a.matricula === e.agente_id);
          const mov = (movs || []).find((m: any) => m.agente_id === e.agente_id);
          return { agente_id: e.agente_id, canal: e.canal, nome: agente?.nome || e.agente_id, movId: mov?.id, hora_entrada: mov?.hora_entrada, canalLabel: CANAL_CONFIG[e.canal as Canal]?.name || e.canal };
        });
    } catch (err) {
      console.error('Erro ao verificar intermediários:', err);
      return [];
    }
  }, [activeTurno?.id, allAgentes]);

  const buscarDetalhesTurno = async (turnoData: any) => {
    setIsLoadingDetalhe(true);
    try {
      if (allAgentes.length === 0) await fetchAgentes();
      const turnoId = turnoData.id;

      const [efetivoDados, ocorrenciasDados, equipDados, paxDados, voosDados, responsaveisDados, movDados] = await Promise.all([
        supabase.schema('seguranca').from('efetivo_turno').select('agente_id, canal, presente, jornada').eq('turno_id', turnoId).eq('presente', true),
        supabase.schema('seguranca').from('ocorrencias').select('*').eq('turno_id', turnoId).order('ts', { ascending: false }),
        supabase.schema('seguranca').from('equipamentos').select('*').eq('turno_id', turnoId),
        supabase.schema('seguranca').from('fluxo_passageiros').select('*').eq('turno_id', turnoId).maybeSingle(),
        supabase.schema('seguranca').from('voos_internacionais').select('*').eq('turno_id', turnoId),
        supabase.schema('seguranca').from('canal_responsavel').select('canal, agente_id').eq('turno_id', turnoId),
        supabase.schema('seguranca').from('agente_movimentacoes').select('*').eq('turno_id', turnoId)
      ]);

      const presence: Record<Canal, Record<string, { presente: boolean; jornada?: string }>> = {
        alfa: {}, bravo: {}, charlie: {}, fox: {}, supervisor: {}
      };
      (efetivoDados.data || []).forEach((e: any) => {
        const c = e.canal as Canal;
        if (presence[c]) presence[c][e.agente_id] = { presente: true, jornada: e.jornada };
      });

      const canalResponsaveis: Record<Canal, string | null> = { alfa: null, bravo: null, charlie: null, fox: null, supervisor: null };
      (responsaveisDados.data || []).forEach((r: any) => { if (r.canal in canalResponsaveis) canalResponsaveis[r.canal as Canal] = r.agente_id; });

      const ocorrencias = (ocorrenciasDados.data || []).map((o: any) => ({
        id: o.id, canal: o.canal, turnoId: o.turno_id, tipo: o.tipo, hora: o.hora,
        hora_inicio: o.hora_inicio, hora_fim: o.hora_fim, desc: o.descricao, agente: o.agente,
        ts: o.ts, imagem_url: o.imagem_url, apacs: o.apacs,
        passageiro_nome: o.passageiro_nome, passageiro_cpf: o.passageiro_cpf, voo: o.voo
      }));

      const equipamentos = (equipDados.data || []).map((e: any) => ({
        tipo: e.tipo, data: e.data_defeito, descricao: e.descricao, local: e.local, os: e.os, prazo: e.prazo
      }));

      const paxFlow = paxDados.data ? {
        total: paxDados.data.total, pico: paxDados.data.pico, horaPico: paxDados.data.hora_pico,
        obs: paxDados.data.obs, img1: paxDados.data.img1, img2: paxDados.data.img2, texto: paxDados.data.texto
      } : undefined;

      const voos = (voosDados.data || []).map((v: any) => ({
        id: v.id, numero: v.numero, horario: v.horario, modulo: v.modulo,
        apf: v.apf, pax: v.pax, hora_inicio: v.hora_inicio, hora_fim: v.hora_fim
      }));

      setHistoricoDetalhe({ turnoData, presence, ocorrencias, equipamentos, paxFlow, voos, canalResponsaveis, movimentacoes: movDados.data || [] });
    } catch (err) {
      console.error('Erro ao buscar detalhes do turno:', err);
    } finally {
      setIsLoadingDetalhe(false);
    }
  };

  const buscarHistorico = async () => {
    if (!histRangeStart) { alert('Selecione pelo menos um dia no calendário.'); return; }
    setIsLoadingHistorico(true);
    try {
      const dataFim = histRangeEnd || histRangeStart;

      // 1. Buscar turnos fechados no período
      let turnoQuery = supabase.schema('seguranca').from('turnos')
        .select('*')
        .not('fechado_em', 'is', null)
        .gte('data', histRangeStart)
        .lte('data', dataFim)
        .order('data', { ascending: false })
        .order('aberto_em', { ascending: false })
        .limit(30);
      if (historicoFiltros.turno) turnoQuery = turnoQuery.eq('letra', historicoFiltros.turno);

      const { data: turnos } = await turnoQuery;
      if (!turnos || turnos.length === 0) { setHistoricoResultados([]); return; }

      const turnoIds = turnos.map((t: any) => t.id);

      // 2. Buscar dados relacionados em paralelo
      const [efetivoDados, ocorrenciasDados, responsaveisDados] = await Promise.all([
        supabase.schema('seguranca').from('efetivo_turno').select('turno_id, agente_id, canal, presente, jornada').in('turno_id', turnoIds).eq('presente', true),
        supabase.schema('seguranca').from('ocorrencias').select('turno_id, canal, tipo, hora, descricao, agente').in('turno_id', turnoIds).order('ts', { ascending: false }),
        supabase.schema('seguranca').from('canal_responsavel').select('turno_id, canal, agente_id').in('turno_id', turnoIds)
      ]);

      // 3. Consolidar
      const resultados = turnos.map((t: any) => ({
        ...t,
        efetivo: (efetivoDados.data || []).filter((e: any) => e.turno_id === t.id),
        ocorrencias: (ocorrenciasDados.data || []).filter((o: any) => {
          if (o.turno_id !== t.id) return false;
          if (historicoFiltros.canal && o.canal !== historicoFiltros.canal) return false;
          if (historicoFiltros.tipo && o.tipo !== historicoFiltros.tipo) return false;
          return true;
        }),
        responsaveis: (responsaveisDados.data || []).filter((r: any) => r.turno_id === t.id)
      }));

      // Filtrar por canal no efetivo se necessário
      const filtrados = historicoFiltros.canal
        ? resultados.filter((t: any) => t.efetivo.some((e: any) => e.canal === historicoFiltros.canal) || t.ocorrencias.length > 0)
        : resultados;

      setHistoricoResultados(filtrados);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    } finally {
      setIsLoadingHistorico(false);
    }
  };

  const encerrarTurno = async () => {
    if (!activeTurno) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .schema('seguranca')
        .from('turnos')
        .update({
          fechado_em: new Date().toISOString(),
          supervisor_nome: supervisorName || null,
          recebeu_de: recebeuDe || null
        })
        .eq('id', activeTurno.id);
        
      if (error) throw error;
      // Buscar o status mais atualizado sem recarregar e dar refresh no listener local
      await fetchActiveTurno();
    } catch (err: any) {
      console.error('Erro ao encerrar turno:', err);
      setError('Erro ao encerrar turno: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveTurno();
  }, [fetchActiveTurno]);

  useEffect(() => {
    if (!activeTurno?.id) return;
    
    let channel: any;
    let pollInterval: any;

    const init = async () => {
      setLoading(true);
      try {
        const turnoId = activeTurno.id;
        await Promise.all([
          buscarEfetivo(turnoId),
          buscarOcorrencias(turnoId),
          buscarDadosAdicionais(turnoId),
          buscarResponsaveis(turnoId),
          fetchMovimentacoesAll(turnoId)
        ]);

        channel = supabase
          .channel('supervisor-realtime')
          .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'ocorrencias' }, () => buscarOcorrencias(turnoId))
          .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'efetivo_turno' }, () => buscarEfetivo(turnoId))
          .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'equipamentos' }, () => buscarDadosAdicionais(turnoId))
          .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'fluxo_passageiros' }, () => buscarDadosAdicionais(turnoId))
          .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'voos_internacionais' }, () => buscarDadosAdicionais(turnoId))
          .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'canal_responsavel' }, () => buscarResponsaveis(turnoId))
          .subscribe();

        pollInterval = setInterval(() => {
          buscarEfetivo(turnoId);
          buscarOcorrencias(turnoId);
          buscarDadosAdicionais(turnoId);
          buscarResponsaveis(turnoId);
          fetchMovimentacoesAll(turnoId);
        }, 10000);
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
  }, [activeTurno?.id, buscarEfetivo, buscarOcorrencias, buscarDadosAdicionais, buscarResponsaveis, fetchMovimentacoesAll]);

  const handlePrint = () => {
    window.print();
  };

  const handleEditOcorrencia = (o: Ocorrencia) => {
    setEditingOcorrencia({ ...o });
    setIsEditModalOpen(true);
  };

  const handleUpdateOcorrencia = async () => {
    if (!editingOcorrencia) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .schema('seguranca')
        .from('ocorrencias')
        .update({
          descricao: editingOcorrencia.desc,
          agente: editingOcorrencia.agente,
          hora_inicio: editingOcorrencia.hora_inicio,
          hora_fim: editingOcorrencia.hora_fim,
          passageiro_nome: editingOcorrencia.passageiro_nome,
          passageiro_cpf: editingOcorrencia.passageiro_cpf,
          voo: editingOcorrencia.voo,
          apacs: editingOcorrencia.apacs
        })
        .eq('id', editingOcorrencia.id);

      if (error) throw error;
      
      setIsEditModalOpen(false);
      setEditingOcorrencia(null);
      if (activeTurno) buscarOcorrencias(activeTurno.id);
    } catch (err: any) {
      console.error('Erro ao atualizar ocorrência:', err);
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEquipamento = (eq: any) => {
    setEditingEquipamento({ ...eq });
    setIsEditEquipModalOpen(true);
  };

  const handleUpdateEquipamento = async () => {
    if (!editingEquipamento) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .schema('seguranca')
        .from('equipamentos')
        .update({
          tipo: editingEquipamento.tipo,
          descricao: editingEquipamento.descricao,
          local: editingEquipamento.local,
          os: editingEquipamento.os,
          prazo: editingEquipamento.prazo
        })
        .eq('id', editingEquipamento.id);

      if (error) throw error;
      setIsEditEquipModalOpen(false);
      setEditingEquipamento(null);
      if (activeTurno) buscarDadosAdicionais(activeTurno.id);
    } catch (err: any) {
      console.error('Erro ao atualizar equipamento:', err);
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditVoo = (v: any) => {
    setEditingVoo({ ...v });
    setIsEditVooModalOpen(true);
  };

  const handleUpdateVoo = async () => {
    if (!editingVoo) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .schema('seguranca')
        .from('voos_internacionais')
        .update({
          numero: editingVoo.numero,
          horario: editingVoo.horario,
          modulo: editingVoo.modulo,
          apf: editingVoo.apf,
          pax: editingVoo.pax,
          hora_inicio: editingVoo.hora_inicio,
          hora_fim: editingVoo.hora_fim
        })
        .eq('id', editingVoo.id);

      if (error) throw error;
      setIsEditVooModalOpen(false);
      setEditingVoo(null);
      if (activeTurno) buscarDadosAdicionais(activeTurno.id);
    } catch (err: any) {
      console.error('Erro ao atualizar voo:', err);
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPaxFlow = () => {
    if (!paxFlow) return;
    setEditingPaxFlow({ ...paxFlow });
    setIsEditPaxModalOpen(true);
  };

  const handleUpdatePaxFlow = async () => {
    if (!editingPaxFlow || !activeTurno) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .schema('seguranca')
        .from('fluxo_passageiros')
        .upsert({
          turno_id: activeTurno.id,
          total: editingPaxFlow.total,
          pico: editingPaxFlow.pico,
          hora_pico: editingPaxFlow.horaPico,
          obs: editingPaxFlow.obs,
          img1: editingPaxFlow.img1,
          img2: editingPaxFlow.img2,
          texto: editingPaxFlow.texto
        });

      if (error) throw error;
      setIsEditPaxModalOpen(false);
      setEditingPaxFlow(null);
      buscarDadosAdicionais(activeTurno.id);
    } catch (err: any) {
      console.error('Erro ao atualizar fluxo:', err);
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const doSendWebhook = async () => {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || (process.env as any).VITE_N8N_WEBHOOK_URL;
    if (!webhookUrl || webhookUrl === 'SUA_URL_DO_N8N_AQUI') {
      alert('URL do Webhook n8n não configurada. Verifique a variável VITE_N8N_WEBHOOK_URL nas configurações do projeto.');
      return;
    }

    const element = document.getElementById('pdf-report-content');
    if (!element) {
      alert('Erro: Conteúdo do relatório não encontrado para gerar o PDF.');
      return;
    }

    setSending(true);
    try {
      const opt = {
        margin: 10,
        filename: `Relatorio_AVSEC_${activeTurno?.letra || 'Turno'}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4' as const, orientation: 'portrait' as const }
      };

      const pdfBase64 = await html2pdf().from(element).set(opt).outputPdf('datauristring');
      if (!pdfBase64 || pdfBase64.length < 100) throw new Error('Falha ao gerar o conteúdo do PDF. O arquivo gerado está vazio.');

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
        pdf_base64: pdfBase64,
        filename: opt.filename,
        timestamp: new Date().toISOString()
      };

      const res = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

      // Salva o nome do supervisor imediatamente após o envio bem-sucedido
      if (activeTurno?.id) {
        await supabase
          .schema('seguranca')
          .from('turnos')
          .update({ supervisor_nome: supervisorName || null, recebeu_de: recebeuDe || null })
          .eq('id', activeTurno.id);
      }

      setPendingClose(true);
      setModalFeedback({ type: 'success', message: 'Relatório enviado com sucesso! Clique em "Confirmar e Fechar Turno" para encerrar o turno e liberar a abertura do próximo.' });
    } catch (error: any) {
      console.error('Erro ao gerar/enviar PDF:', error);
      setModalFeedback({ type: 'error', message: `Erro ao enviar relatório: ${error.message}` });
    } finally {
      setSending(false);
    }
  };

  const handleSendButtonClick = async () => {
    if (!supervisorName.trim() || !recebeuDe.trim()) {
      setModalFeedback({ type: 'error', message: 'Os campos "Nome do Supervisor" e "Recebeu de" são obrigatórios para o envio do relatório.' });
      return;
    }

    const toCheck = await checkIntermediarios();
    if (toCheck.length > 0) {
      const initial: Record<string, { present: boolean; hora_saida: string }> = {};
      toCheck.forEach((item: any) => { initial[item.agente_id] = { present: true, hora_saida: new Date().toTimeString().slice(0, 5) }; });
      setIntermediarioDecisions(initial);
      setIntermediariosToCheck(toCheck);
      setClosureCheckOpen(true);
      return;
    }

    await doSendWebhook();
  };

  const handleClosureCheckConfirm = async () => {
    if (!activeTurno?.id) return;
    try {
      for (const [agenteId, decision] of Object.entries(intermediarioDecisions) as [string, { present: boolean; hora_saida: string }][]) {
        if (decision.present) {
          await supabase.schema('seguranca').from('efetivo_turno').update({ continua_proximo_turno: true }).eq('turno_id', activeTurno.id).eq('agente_id', agenteId);
        } else {
          const item = intermediariosToCheck.find((i: any) => i.agente_id === agenteId);
          if (item?.movId) {
            await supabase.schema('seguranca').from('agente_movimentacoes').update({ hora_saida: decision.hora_saida }).eq('id', item.movId);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao salvar decisões de intermediários:', err);
    }
    setClosureCheckOpen(false);
    await doSendWebhook();
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const currentTurno = activeTurno?.letra || initialTurno;
  const turnoInfo = TURNOS[currentTurno];

  const openPdfModal = () => {
    fetchAgentes();
    if (activeTurno?.id) fetchMovimentacoesAll(activeTurno.id);
    setIsPdfModalOpen(true);
  };

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

  if (isLoadingTurno) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <Loader2 className="animate-spin text-accent mb-4" size={32} />
        <h2 className="text-lg font-medium text-text mb-1">Carregando Turno</h2>
        <p className="text-sm text-hint">Sincronizando dados com o servidor...</p>
      </div>
    );
  }

  if (!activeTurno) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mb-6 border border-border-2">
          <Clock className="text-muted" size={32} />
        </div>
        <h2 className="text-xl font-medium text-text mb-2">Nenhum Turno Ativo</h2>
        <p className="text-sm text-hint max-w-xs mb-8">
          O turno anterior foi encerrado. Clique no botão abaixo para iniciar o novo turno e liberar o acesso para os postos.
        </p>
        <button 
          onClick={handleAbrirTurno}
          disabled={isOpeningTurno}
          className="btn btn-primary px-8 py-3 gap-2 text-sm shadow-lg shadow-accent/20"
        >
          {isOpeningTurno ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Plus size={18} />
          )}
          {isOpeningTurno ? 'Iniciando...' : 'Iniciar Novo Turno'}
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

  const [agentesCount] = [Object.values(presence).reduce((acc: number, curr: Record<string, any>) =>
    acc + Object.values(curr).filter((v: any) => v.presente).length, 0)];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-text">Visão geral do turno</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsHistoricoOpen(true)}
              className="btn btn-secondary btn-sm gap-2"
            >
              <History size={14} />
              Histórico
            </button>
            <button
              onClick={openPdfModal}
              className="btn btn-primary btn-sm gap-2"
            >
              <FileText size={14} />
              Gerar Relatório PDF
            </button>
          </div>
        </div>
        <p className="text-xs text-muted">{dateStr} · Turno {currentTurno}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5">Agentes em serviço</div>
          <div className="text-2xl font-semibold font-mono text-text">
            {agentesCount}
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
          const channelAgentPresence = presence[c] || {};
          const presentAgentIds = Object.keys(channelAgentPresence).filter(id => channelAgentPresence[id]?.presente);
          const count = presentAgentIds.length;
          const intermediarios = presentAgentIds.filter(id => channelAgentPresence[id]?.jornada === 'intermediário');
          const channelOcorrencias = ocorrencias.filter(o => o.canal === c).length;
          const responsavelId = canalResponsaveis[c];
          const responsavelAgente = responsavelId ? allAgentes.find(a => a.matricula === responsavelId) : null;
          
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
              {intermediarios.length > 0 && (
                <div className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                  <span>⇄</span>
                  <span>{intermediarios.length} intermediário{intermediarios.length > 1 ? 's' : ''} (2 turnos)</span>
                </div>
              )}
              {responsavelAgente && (
                <div className="mt-2 pt-2 border-t border-border-2 flex items-center gap-1.5">
                  <Users size={10} className="text-muted shrink-0" />
                  <span className="text-[10px] text-muted">Resp:</span>
                  <span className="text-[10px] font-medium truncate">{responsavelAgente.nome}</span>
                </div>
              )}
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
                <div key={i} className="text-[12px] p-2 bg-surface-2 rounded border border-border-2 group relative">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-text">{e.tipo} - {e.local}</div>
                    <button 
                      onClick={() => handleEditEquipamento(e)}
                      className="opacity-0 group-hover:opacity-100 btn btn-secondary btn-xs py-0 px-2 text-[10px] transition-opacity"
                    >
                      Editar
                    </button>
                  </div>
                  <div className="text-muted mt-1">{e.descricao}</div>
                  {e.os && <div className="text-[10px] text-accent mt-1">OS: {e.os}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fluxo de Passageiros */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Plane size={16} className="text-blue-500" />
              <span className="text-xs font-mono uppercase tracking-wider text-text">Fluxo de Passageiros / Voos</span>
            </div>
            {(paxFlow || voos.length > 0) && (
              <button 
                onClick={handleEditPaxFlow}
                className="btn btn-secondary btn-xs py-0 px-2 text-[10px]"
              >
                Editar Fluxo
              </button>
            )}
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
                    <div key={i} className="text-[11px] flex justify-between p-1 border-b border-border-2 last:border-0 group relative">
                      <span>{v.numero} ({v.horario})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted">Pax: {v.pax}</span>
                        <button 
                          onClick={() => handleEditVoo(v)}
                          className="opacity-0 group-hover:opacity-100 btn btn-secondary btn-xs py-0 px-2 text-[10px] transition-opacity"
                        >
                          Editar
                        </button>
                      </div>
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
            const isGPA = o.tipo === 'gpa';
            const isGDAF = o.tipo === 'gdaf';
            
            return (
              <div key={o.id} className="flex gap-3 p-3 bg-surface border border-border-2 rounded-lg group relative">
                <div className="w-16 shrink-0 pt-1">
                  <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border border-border", config.badge)}>
                    {config.label}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                        {isGPA ? 'Registro de passageiro armado' : 
                         isGDAF ? 'Registro de despacho de arma de fogo' : 
                         o.tipo}
                      </span>
                      {o.tipo !== 'teca' && (
                        <span className="font-mono text-[11px] text-hint">
                          {o.hora}
                          {(o.hora_inicio || o.hora_fim) && (
                            <span className="ml-2 opacity-60">
                              ({o.hora_inicio || '--:--'} às {o.hora_fim || '--:--'})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => handleEditOcorrencia(o)}
                      className="opacity-0 group-hover:opacity-100 btn btn-secondary btn-xs py-0 px-2 text-[10px] transition-opacity"
                    >
                      Editar
                    </button>
                  </div>
                  <div className="text-[13px] text-text leading-relaxed">
                    {o.desc}
                  </div>
                  
                  {(o.passageiro_nome || o.passageiro_cpf || o.voo) && (
                    <div className="mt-2 p-2 bg-surface-2 rounded border border-border-2 text-[11px] grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {o.passageiro_nome && <div><span className="text-muted uppercase text-[9px] block">Passageiro</span>{o.passageiro_nome}</div>}
                      {o.passageiro_cpf && <div><span className="text-muted uppercase text-[9px] block">CPF</span>{o.passageiro_cpf}</div>}
                      {o.voo && <div><span className="text-muted uppercase text-[9px] block">Voo</span>{o.voo}</div>}
                    </div>
                  )}

                  {o.agente && (
                    <div className="text-[11px] text-hint mt-1 font-mono">
                      <b>Envolvidos:</b> {o.agente}
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
                  canalResponsaveis={canalResponsaveis}
                  movimentacoes={movimentacoesAll}
                />
              </div>
            </div>
            <div className="p-4 px-5 border-t border-border flex justify-end gap-3">
              <button onClick={() => setIsPdfModalOpen(false)} className="btn btn-secondary">Fechar</button>
              <button
                onClick={handleSendButtonClick}
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

      {isEditModalOpen && editingOcorrencia && (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg w-full max-w-lg shadow-2xl">
            <div className="p-4 px-5 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium">Editar Ocorrência</span>
              <button onClick={() => setIsEditModalOpen(false)} className="text-muted hover:text-text">
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              {editingOcorrencia.tipo !== 'teca' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-muted uppercase">Hora Início</label>
                    <input 
                      type="time" 
                      value={editingOcorrencia.hora_inicio || ''}
                      onChange={(e) => setEditingOcorrencia({...editingOcorrencia, hora_inicio: e.target.value})}
                      className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-muted uppercase">Hora Fim</label>
                    <input 
                      type="time" 
                      value={editingOcorrencia.hora_fim || ''}
                      onChange={(e) => setEditingOcorrencia({...editingOcorrencia, hora_fim: e.target.value})}
                      className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {(editingOcorrencia.tipo === 'gpa' || editingOcorrencia.tipo === 'gdaf') && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-muted uppercase">Nome do Passageiro</label>
                    <input 
                      type="text" 
                      value={editingOcorrencia.passageiro_nome || ''}
                      onChange={(e) => setEditingOcorrencia({...editingOcorrencia, passageiro_nome: e.target.value})}
                      className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-muted uppercase">CPF</label>
                      <input 
                        type="text" 
                        value={editingOcorrencia.passageiro_cpf || ''}
                        onChange={(e) => setEditingOcorrencia({...editingOcorrencia, passageiro_cpf: e.target.value})}
                        className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-muted uppercase">Voo</label>
                      <input 
                        type="text" 
                        value={editingOcorrencia.voo || ''}
                        onChange={(e) => setEditingOcorrencia({...editingOcorrencia, voo: e.target.value})}
                        className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted uppercase">Descrição</label>
                <textarea 
                  value={editingOcorrencia.desc}
                  onChange={(e) => setEditingOcorrencia({...editingOcorrencia, desc: e.target.value})}
                  className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm min-h-[100px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted uppercase">Envolvidos</label>
                <input 
                  type="text" 
                  value={editingOcorrencia.agente || ''}
                  onChange={(e) => setEditingOcorrencia({...editingOcorrencia, agente: e.target.value})}
                  className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted uppercase">APACs</label>
                <input 
                  type="text" 
                  value={editingOcorrencia.apacs || ''}
                  onChange={(e) => setEditingOcorrencia({...editingOcorrencia, apacs: e.target.value})}
                  className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="p-4 px-5 border-t border-border flex justify-end gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleUpdateOcorrencia} className="btn btn-primary">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Equipamento */}
      {isEditEquipModalOpen && editingEquipamento && (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg w-full max-w-lg shadow-2xl">
            <div className="p-4 px-5 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium">Editar Equipamento</span>
              <button onClick={() => setIsEditEquipModalOpen(false)} className="text-muted hover:text-text">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Tipo/Equipamento</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" 
                    value={editingEquipamento.tipo}
                    onChange={e => setEditingEquipamento({...editingEquipamento, tipo: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Local</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" 
                    value={editingEquipamento.local}
                    onChange={e => setEditingEquipamento({...editingEquipamento, local: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Descrição do Defeito</label>
                  <textarea 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-[80px] resize-none" 
                    value={editingEquipamento.descricao}
                    onChange={e => setEditingEquipamento({...editingEquipamento, descricao: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Nº OS</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" 
                    value={editingEquipamento.os}
                    onChange={e => setEditingEquipamento({...editingEquipamento, os: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Prazo</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" 
                    value={editingEquipamento.prazo}
                    onChange={e => setEditingEquipamento({...editingEquipamento, prazo: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="p-4 px-5 border-t border-border flex justify-end gap-3">
              <button onClick={() => setIsEditEquipModalOpen(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleUpdateEquipamento} className="btn btn-primary">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Voo */}
      {isEditVooModalOpen && editingVoo && (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg w-full max-w-lg shadow-2xl">
            <div className="p-4 px-5 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium">Editar Voo Internacional</span>
              <button onClick={() => setIsEditVooModalOpen(false)} className="text-muted hover:text-text">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-hint">Voo</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent" 
                    value={editingVoo.numero}
                    onChange={e => setEditingVoo({...editingVoo, numero: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-hint">Horário</label>
                  <input 
                    type="time" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent" 
                    value={editingVoo.horario}
                    onChange={e => setEditingVoo({...editingVoo, horario: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-hint">Módulo</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent" 
                    value={editingVoo.modulo}
                    onChange={e => setEditingVoo({...editingVoo, modulo: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-hint">APF</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent" 
                    value={editingVoo.apf}
                    onChange={e => setEditingVoo({...editingVoo, apf: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-hint">Pax</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent" 
                    value={editingVoo.pax}
                    onChange={e => setEditingVoo({...editingVoo, pax: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-hint">Início</label>
                  <input 
                    type="time" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent" 
                    value={editingVoo.hora_inicio}
                    onChange={e => setEditingVoo({...editingVoo, hora_inicio: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-hint">Fim</label>
                  <input 
                    type="time" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent" 
                    value={editingVoo.hora_fim}
                    onChange={e => setEditingVoo({...editingVoo, hora_fim: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="p-4 px-5 border-t border-border flex justify-end gap-3">
              <button onClick={() => setIsEditVooModalOpen(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleUpdateVoo} className="btn btn-primary">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Fluxo de Passageiros */}
      {isEditPaxModalOpen && editingPaxFlow && (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg w-full max-w-lg shadow-2xl">
            <div className="p-4 px-5 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium">Editar Fluxo de Passageiros</span>
              <button onClick={() => setIsEditPaxModalOpen(false)} className="text-muted hover:text-text">✕</button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Total Pax</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" 
                    value={editingPaxFlow.total || ''}
                    onChange={e => setEditingPaxFlow({...editingPaxFlow, total: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Pico Pax</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" 
                    value={editingPaxFlow.pico || ''}
                    onChange={e => setEditingPaxFlow({...editingPaxFlow, pico: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Hora do Pico</label>
                  <input 
                    type="time" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" 
                    value={editingPaxFlow.horaPico || ''}
                    onChange={e => setEditingPaxFlow({...editingPaxFlow, horaPico: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Observações</label>
                <textarea 
                  className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-[80px] resize-none" 
                  value={editingPaxFlow.obs || ''}
                  onChange={e => setEditingPaxFlow({...editingPaxFlow, obs: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Texto Adicional</label>
                <textarea 
                  className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-[80px] resize-none" 
                  value={editingPaxFlow.texto || ''}
                  onChange={e => setEditingPaxFlow({...editingPaxFlow, texto: e.target.value})}
                />
              </div>
            </div>
            <div className="p-4 px-5 border-t border-border flex justify-end gap-3">
              <button onClick={() => setIsEditPaxModalOpen(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleUpdatePaxFlow} className="btn btn-primary">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Feedback (Sucesso/Erro) */}
      {modalFeedback && (
        <div className="fixed inset-0 bg-black/80 z-[600] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
            <div className="flex justify-center mb-2">
              {modalFeedback.type === 'success' ? (
                <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center border border-teal-500/30">
                  <div className="text-3xl">✅</div>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30">
                  <div className="text-3xl">⚠️</div>
                </div>
              )}
            </div>
            
            <h3 className="text-lg font-medium text-text">
              {modalFeedback.type === 'success' ? 'Sucesso!' : 'Atenção'}
            </h3>
            
            <p className="text-sm text-muted leading-relaxed">
              {modalFeedback.message}
            </p>
            
            <div className="pt-4">
              <button
                onClick={async () => {
                  setModalFeedback(null);
                  if (pendingClose) {
                    setPendingClose(false);
                    setIsPdfModalOpen(false);
                    await encerrarTurno();
                  }
                }}
                className={cn("w-full py-2.5 rounded text-sm font-medium transition-all shadow-sm", modalFeedback.type === 'success' ? "bg-teal-600 hover:bg-teal-500 text-white" : "bg-red-600 hover:bg-red-500 text-white")}
              >
                {pendingClose && modalFeedback.type === 'success' ? 'Confirmar e Fechar Turno' : 'Okay, entendi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Verificação de Intermediários antes de fechar turno */}
      {closureCheckOpen && (
        <div className="fixed inset-0 bg-black/80 z-[700] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg w-full max-w-lg shadow-2xl">
            <div className="p-4 px-5 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center">
                <span className="text-lg">⇄</span>
              </div>
              <div>
                <div className="text-sm font-medium">Verificação de Agentes Intermediários</div>
                <div className="text-[11px] text-muted">Confirme a situação de cada agente antes de fechar o turno</div>
              </div>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {intermediariosToCheck.map((item: any) => {
                const dec = intermediarioDecisions[item.agente_id];
                return (
                  <div key={item.agente_id} className="p-3 bg-surface-2 border border-border-2 rounded space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium">{item.nome}</div>
                        <div className="text-[11px] text-muted font-mono">{item.canalLabel} {item.hora_entrada ? `· entrada: ${item.hora_entrada}` : ''}</div>
                      </div>
                    </div>
                    <div className="text-[11px] font-mono text-muted uppercase tracking-wider">Agente ainda está neste canal?</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIntermediarioDecisions(prev => ({ ...prev, [item.agente_id]: { ...prev[item.agente_id], present: true } }))}
                        className={cn("flex-1 py-1.5 text-xs rounded border font-medium transition-all", dec?.present ? "bg-teal-500 text-white border-teal-500" : "border-border-2 text-muted hover:border-teal-500")}
                      >
                        Sim — continua no turno
                      </button>
                      <button
                        onClick={() => setIntermediarioDecisions(prev => ({ ...prev, [item.agente_id]: { ...prev[item.agente_id], present: false } }))}
                        className={cn("flex-1 py-1.5 text-xs rounded border font-medium transition-all", dec?.present === false ? "bg-red-500 text-white border-red-500" : "border-border-2 text-muted hover:border-red-500")}
                      >
                        Não — já saiu
                      </button>
                    </div>
                    {dec?.present === false && (
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-muted uppercase font-mono shrink-0">Horário de saída:</label>
                        <input
                          type="time"
                          value={dec.hora_saida}
                          onChange={(e) => setIntermediarioDecisions(prev => ({ ...prev, [item.agente_id]: { ...prev[item.agente_id], hora_saida: e.target.value } }))}
                          className="flex-1 bg-surface-3 border border-border-2 rounded px-2 py-1 text-xs focus:outline-none focus:border-red-400"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 px-5 border-t border-border flex justify-end gap-3">
              <button onClick={() => setClosureCheckOpen(false)} className="btn btn-secondary btn-sm">Cancelar</button>
              <button
                onClick={handleClosureCheckConfirm}
                disabled={intermediariosToCheck.some((item: any) => intermediarioDecisions[item.agente_id]?.present === undefined)}
                className="btn btn-primary btn-sm gap-2"
              >
                <Send size={13} />
                Confirmar e Enviar Relatório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Histórico de Relatórios */}
      {isHistoricoOpen && (() => {
        // Calendar helpers (inline)
        const daysInMonth = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 0).getDate();
        const firstDow = new Date(calViewDate.getFullYear(), calViewDate.getMonth(), 1).getDay();
        const monthLabel = calViewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const toStr = (d: Date) => d.toISOString().split('T')[0];
        const rangeLabel = histRangeStart
          ? histRangeEnd && histRangeEnd !== histRangeStart
            ? `${new Date(histRangeStart + 'T12:00').toLocaleDateString('pt-BR')} → ${new Date(histRangeEnd + 'T12:00').toLocaleDateString('pt-BR')}`
            : new Date(histRangeStart + 'T12:00').toLocaleDateString('pt-BR')
          : 'Selecione um período';

        return (
          <div className="fixed inset-0 bg-black/80 z-[500] flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-lg w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-4 px-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-accent" />
                  <span className="text-sm font-medium">Histórico de Relatórios e Ocorrências</span>
                </div>
                <button onClick={() => setIsHistoricoOpen(false)} className="text-muted hover:text-text">✕</button>
              </div>

              {/* Filtros + Calendário */}
              <div className="border-b border-border bg-surface-2 flex flex-col md:flex-row gap-0">
                {/* Calendário range picker — compacto */}
                <div className="p-3 w-full md:w-[230px] shrink-0 border-b md:border-b-0 md:border-r border-border-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[9px] font-mono text-muted uppercase tracking-wider">Período</div>
                    <div className="text-[10px] font-medium text-accent font-mono truncate max-w-[140px]">{rangeLabel}</div>
                  </div>

                  {/* Month nav */}
                  <div className="flex items-center justify-between mb-1">
                    <button
                      onClick={() => setCalViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-3 text-muted hover:text-text transition-colors text-xs"
                    >‹</button>
                    <span className="text-[10px] font-medium capitalize">{monthLabel}</span>
                    <button
                      onClick={() => setCalViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-3 text-muted hover:text-text transition-colors text-xs"
                    >›</button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7">
                    {['D','S','T','Q','Q','S','S'].map((d, i) => (
                      <div key={i} className="text-center text-[8px] text-muted py-0.5">{d}</div>
                    ))}
                  </div>

                  {/* Days */}
                  <div className="grid grid-cols-7 gap-px">
                    {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = toStr(new Date(calViewDate.getFullYear(), calViewDate.getMonth(), day));
                      const isStart = dateStr === histRangeStart;
                      const isEnd = dateStr === histRangeEnd;
                      const effectiveEnd = histRangeEnd || (calHoverDay && histRangeStart && !histRangeEnd ? calHoverDay : '');
                      const inRange = histRangeStart && effectiveEnd && dateStr > histRangeStart && dateStr < effectiveEnd;
                      return (
                        <button
                          key={day}
                          className={cn(
                            "h-5 text-[10px] rounded transition-colors w-full leading-none",
                            (isStart || isEnd) ? "bg-accent text-white font-bold" :
                            inRange ? "bg-accent/20 text-accent rounded-none" :
                            "hover:bg-surface-3 text-text"
                          )}
                          onClick={() => {
                            if (!histRangeStart || (histRangeStart && histRangeEnd)) {
                              setHistRangeStart(dateStr);
                              setHistRangeEnd('');
                            } else if (dateStr === histRangeStart) {
                              setHistRangeEnd(dateStr);
                            } else if (dateStr < histRangeStart) {
                              setHistRangeStart(dateStr);
                            } else {
                              setHistRangeEnd(dateStr);
                            }
                          }}
                          onMouseEnter={() => setCalHoverDay(dateStr)}
                          onMouseLeave={() => setCalHoverDay('')}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-[9px] text-muted leading-relaxed">
                    Clique 1x para início · Clique 2x no mesmo dia para dia único · Clique em outro dia para o fim do período
                  </div>
                </div>

                {/* Filtros adicionais */}
                <div className="p-4 flex-1 space-y-3">
                  <div className="text-[9px] font-mono text-muted uppercase tracking-wider mb-1">Filtros adicionais</div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-muted uppercase tracking-wider">Turno</label>
                      <select value={historicoFiltros.turno} onChange={e => setHistoricoFiltros(p => ({ ...p, turno: e.target.value }))} className="w-full bg-surface border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent">
                        <option value="">Todos os turnos</option>
                        {['A','B','C','D'].map(l => <option key={l} value={l}>Turno {l} · {TURNOS[l].inicio}–{TURNOS[l].fim}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-muted uppercase tracking-wider">Canal</label>
                      <select value={historicoFiltros.canal} onChange={e => setHistoricoFiltros(p => ({ ...p, canal: e.target.value }))} className="w-full bg-surface border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent">
                        <option value="">Todos os canais</option>
                        {(['alfa','bravo','charlie','fox'] as Canal[]).map(c => <option key={c} value={c}>{CANAL_CONFIG[c].label} – {CANAL_CONFIG[c].name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-muted uppercase tracking-wider">Tipo de ocorrência</label>
                      <select value={historicoFiltros.tipo} onChange={e => setHistoricoFiltros(p => ({ ...p, tipo: e.target.value }))} className="w-full bg-surface border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent">
                        <option value="">Todos os tipos</option>
                        {['teca','avsec','equipamento','receita','treinamento','passageiros','varredura','gpa','gdaf'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={buscarHistorico}
                    disabled={isLoadingHistorico || !histRangeStart}
                    className="w-full btn btn-primary btn-sm gap-2 mt-2"
                  >
                    {isLoadingHistorico ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                    {isLoadingHistorico ? 'Buscando...' : 'Buscar relatórios'}
                  </button>
                </div>
              </div>

              {/* Resultados — visão completa por turno */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingHistorico ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-muted">
                    <Loader2 size={20} className="animate-spin" /><span className="text-sm">Buscando...</span>
                  </div>
                ) : historicoResultados.length === 0 ? (
                  <div className="text-center py-12 text-hint text-sm">
                    <div className="text-3xl mb-2 opacity-40">🗂</div>
                    {histRangeStart ? 'Nenhum turno encontrado para os filtros aplicados.' : 'Selecione um período no calendário e clique em Buscar.'}
                  </div>
                ) : (
                  <>
                    <div className="text-[10px] font-mono text-muted uppercase tracking-widest pb-2 border-b border-border-2">
                      {historicoResultados.length} turno(s) encontrado(s)
                    </div>
                    {historicoResultados.map((t: any, i: number) => {
                      const dataFormatada = t.data
                        ? new Date(t.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
                        : '—';
                      const turnoInfo = TURNOS[t.letra];
                      const totalOcorr = (t.ocorrencias || []).length;

                      return (
                        <div key={i} className="flex items-center justify-between gap-3 p-3 bg-surface-2 border border-border-2 rounded-lg hover:border-border transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-sm font-bold text-accent">Turno {t.letra}</span>
                              <span className="text-muted text-xs">·</span>
                              <span className="text-[13px] capitalize truncate">{dataFormatada}</span>
                              <span className="text-[9px] font-mono text-muted">{turnoInfo?.inicio}–{turnoInfo?.fim}</span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] text-muted">
                              {t.supervisor_nome
                                ? <span><b className="text-text">{t.supervisor_nome}</b> · Recebeu de: {t.recebeu_de || '—'}</span>
                                : <span className="italic">Supervisor não registrado</span>
                              }
                              <span className="opacity-30">|</span>
                              <span>{totalOcorr} ocorrência{totalOcorr !== 1 ? 's' : ''}</span>
                              {t.fechado_em && (
                                <><span className="opacity-30">|</span>
                                <span>fechado às {new Date(t.fechado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => buscarDetalhesTurno(t)}
                            disabled={isLoadingDetalhe}
                            className="btn btn-primary btn-sm gap-1.5 shrink-0"
                          >
                            {isLoadingDetalhe ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                            Ver Relatório PDF
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: PDF do turno histórico */}
      {historicoDetalhe && (
        <div className="fixed inset-0 bg-black/90 z-[600] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 px-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setHistoricoDetalhe(null)}
                  className="text-muted hover:text-text transition-colors flex items-center gap-1.5 text-sm"
                >
                  ← Voltar
                </button>
                <span className="text-muted opacity-30">|</span>
                <span className="text-sm font-medium">
                  Relatório — Turno {historicoDetalhe.turnoData.letra}
                  {historicoDetalhe.turnoData.data && (
                    <span className="text-muted font-normal ml-1.5">
                      · {new Date(historicoDetalhe.turnoData.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={() => window.print()}
                className="btn btn-primary btn-sm gap-2"
              >
                <FileText size={14} />
                Imprimir / Salvar PDF
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-surface-3">
              <div className="bg-white shadow-lg mx-auto">
                <PdfReport
                  turno={historicoDetalhe.turnoData.letra}
                  data={historicoDetalhe.turnoData.data
                    ? new Date(historicoDetalhe.turnoData.data + 'T12:00:00').toLocaleDateString('pt-BR')
                    : new Date().toLocaleDateString('pt-BR')}
                  supervisor={historicoDetalhe.turnoData.supervisor_nome || '—'}
                  recebeuDe={historicoDetalhe.turnoData.recebeu_de || '—'}
                  ocorrencias={historicoDetalhe.ocorrencias}
                  presence={historicoDetalhe.presence}
                  allAgentes={allAgentes}
                  equipamentos={historicoDetalhe.equipamentos}
                  paxFlow={historicoDetalhe.paxFlow}
                  voos={historicoDetalhe.voos}
                  canalResponsaveis={historicoDetalhe.canalResponsaveis}
                  movimentacoes={historicoDetalhe.movimentacoes}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
