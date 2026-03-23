import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Canal, TURNOS, CANAL_CONFIG } from '../constants';
import { cn } from '../lib/utils';
import { Plus, ClipboardList, Users, HardDrive, Plane, Loader2, Search, X } from 'lucide-react';
import OcorrenciaModal from './OcorrenciaModal';
import { Ocorrencia, Turno, OcorrenciaTipo } from '../types';
import { supabase } from '../lib/supabase';

interface PostoProps {
  canal: Canal;
  turno: string;
  onTurnoChange: (letra: string) => void;
}

export default function Posto({ canal, turno, onTurnoChange }: PostoProps) {
  const [activeTab, setActiveTab] = useState('efetivo');
  const [allAgentes, setAllAgentes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [presence, setPresence] = useState<Record<string, { presente: boolean, jornada?: string }>>({});
  const [selectedAgentForJornada, setSelectedAgentForJornada] = useState<any | null>(null);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialTipo, setModalInitialTipo] = useState<OcorrenciaTipo | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTurnoId, setActiveTurnoId] = useState<string | null>(null);

  // Estados para Equipamentos
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [novoEquipamento, setNovoEquipamento] = useState({
    tipo: '',
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    local: CANAL_CONFIG[canal]?.name || '',
    os: '',
    prazo: ''
  });

  useEffect(() => {
    setNovoEquipamento(prev => ({
      ...prev,
      local: CANAL_CONFIG[canal]?.name || ''
    }));
  }, [canal]);

  // Estados para Fluxo de Passageiros
  const [paxFlow, setPaxFlow] = useState({
    total: '',
    pico: '',
    horaPico: '',
    obs: ''
  });
  const [isSavingPax, setIsSavingPax] = useState(false);

  // Estados para Voos Internacionais
  const [voos, setVoos] = useState<any[]>([]);
  const [novoVoo, setNovoVoo] = useState({
    numero: '',
    horario: '',
    modulo: '',
    apf: '',
    pax: ''
  });
  const [isSavingVoo, setIsSavingVoo] = useState(false);

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

  const fetchActiveTurno = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .schema('seguranca')
        .from('turnos')
        .select('*')
        .eq('canal', 'geral')
        .is('fechado_em', null)
        .order('data', { ascending: false })
        .limit(1);

      if (error) {
        if (error.code === '42501') {
          setError('Erro de Permissão: O schema "seguranca" não está exposto na API do Supabase ou as permissões de GRANT estão faltando.');
        }
        throw error;
      }
      
      if (data && data.length > 0) {
        const active = data[0];
        setActiveTurnoId(active.id);
        onTurnoChange(active.letra);
        return active.id;
      } else {
        setActiveTurnoId(null);
      }
    } catch (err: any) {
      console.error('Erro ao buscar turno ativo:', err);
      if (err.code === '42501') {
        setError('Erro de Permissão (42501): O banco de dados recusou o acesso ao schema "seguranca". Verifique os GRANTS no SQL Editor.');
      } else {
        setError('Erro ao sincronizar turno: ' + (err.message || 'Verifique sua conexão.'));
      }
    } finally {
      setLoading(false);
    }
    return null;
  }, [onTurnoChange]);

  const fetchPresence = useCallback(async (turnoId: string) => {
    try {
      const { data, error } = await supabase
        .schema('seguranca')
        .from('efetivo_turno')
        .select('agente_id, presente, jornada')
        .eq('turno_id', turnoId)
        .eq('canal', canal);

      if (error) throw error;
      if (data) {
        const presenceMap: Record<string, { presente: boolean, jornada?: string }> = {};
        data.forEach((p: any) => {
          presenceMap[p.agente_id] = { presente: p.presente, jornada: p.jornada };
        });
        setPresence(presenceMap);
      }
    } catch (err) {
      console.error('Erro ao buscar efetivo:', err);
    }
  }, []);

  const fetchOcorrencias = useCallback(async (turnoId: string) => {
    try {
      const { data, error } = await supabase
        .schema('seguranca')
        .from('ocorrencias')
        .select('*')
        .eq('turno_id', turnoId)
        .eq('canal', canal)
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
          ts: o.ts,
          imagem_url: o.imagem_url,
          apacs: o.apacs
        })));
      }
    } catch (err) {
      console.error('Erro ao buscar ocorrências:', err);
    }
  }, [canal]);

  const fetchEquipamentos = useCallback(async (turnoId: string) => {
    try {
      const { data, error } = await supabase
        .schema('seguranca')
        .from('equipamentos')
        .select('*')
        .eq('turno_id', turnoId);

      if (error) throw error;
      if (data) setEquipamentos(data);
    } catch (err) {
      console.error('Erro ao buscar equipamentos:', err);
    }
  }, []);

  const fetchPaxFlow = useCallback(async (turnoId: string) => {
    try {
      const { data, error } = await supabase
        .schema('seguranca')
        .from('fluxo_passageiros')
        .select('*')
        .eq('turno_id', turnoId)
        .maybeSingle();

      if (error) throw error;
      if (data) setPaxFlow(data);
    } catch (err) {
      console.error('Erro ao buscar fluxo de passageiros:', err);
    }
  }, []);

  const fetchVoos = useCallback(async (turnoId: string) => {
    try {
      const { data, error } = await supabase
        .schema('seguranca')
        .from('voos_internacionais')
        .select('*')
        .eq('turno_id', turnoId);

      if (error) throw error;
      if (data) setVoos(data);
    } catch (err) {
      console.error('Erro ao buscar voos:', err);
    }
  }, []);

  // 1. Monitorar turnos (Abertura/Fechamento pelo Supervisor)
  useEffect(() => {
    fetchActiveTurno();
    fetchAgentes();
    
    const turnoChannel = supabase
      .channel('posto-turno-monitor')
      .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'turnos' }, () => {
        console.log('🔔 [Posto] Mudança detectada na tabela de turnos. Atualizando...');
        fetchActiveTurno();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(turnoChannel);
    };
  }, [fetchActiveTurno]);

  // 2. Sincronizar dados quando houver turno ativo
  useEffect(() => {
    if (!activeTurnoId) return;

    let channel: any;
    let pollInterval: any;

    const loadData = async () => {
      await Promise.all([
        fetchPresence(activeTurnoId),
        fetchOcorrencias(activeTurnoId),
        fetchEquipamentos(activeTurnoId),
        fetchPaxFlow(activeTurnoId),
        fetchVoos(activeTurnoId)
      ]);

      console.log(`🚀 [Posto ${canal}] Ativando Sincronização Instantânea...`);
      channel = supabase
        .channel(`posto-realtime-${canal}`)
        .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'ocorrencias' }, () => fetchOcorrencias(activeTurnoId))
        .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'efetivo_turno' }, () => fetchPresence(activeTurnoId))
        .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'equipamentos' }, () => fetchEquipamentos(activeTurnoId))
        .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'fluxo_passageiros' }, () => fetchPaxFlow(activeTurnoId))
        .on('postgres_changes', { event: '*', schema: 'seguranca', table: 'voos_internacionais' }, () => fetchVoos(activeTurnoId))
        .subscribe((status) => {
          console.log(`📡 [Posto ${canal}] Status:`, status);
        });

      pollInterval = setInterval(() => {
        console.log('🔄 [Posto] Sincronização de Segurança...');
        fetchPresence(activeTurnoId);
        fetchOcorrencias(activeTurnoId);
      }, 15000);
    };

    loadData();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeTurnoId, canal, fetchPresence, fetchOcorrencias, fetchEquipamentos, fetchPaxFlow, fetchVoos]);

  const filteredAgentes = useMemo(() => {
    if (!searchTerm) return allAgentes;
    return allAgentes.filter(a => 
      a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.matricula.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allAgentes, searchTerm]);

  const togglePresence = async (mat: string, jornadaValue?: string) => {
    console.log('Toggling presence for:', mat, 'Active Turno ID:', activeTurnoId, 'Jornada:', jornadaValue);
    if (!activeTurnoId) {
      alert('Nenhum turno ativo encontrado. Por favor, recarregue a página ou aguarde a sincronização.');
      return;
    }
    
    const isCurrentlyPresent = presence[mat]?.presente;
    const newState = !isCurrentlyPresent;
    
    console.log('New presence state:', newState);
    setPresence(prev => ({ 
      ...prev, 
      [mat]: { presente: newState, jornada: jornadaValue || prev[mat]?.jornada } 
    }));

    try {
      const { error } = await supabase
        .schema('seguranca')
        .from('efetivo_turno')
        .upsert({
          turno_id: activeTurnoId,
          agente_id: mat,
          presente: newState,
          jornada: jornadaValue || (isCurrentlyPresent ? presence[mat]?.jornada : undefined),
          canal: canal,
          registrado_em: new Date().toISOString()
        }, { onConflict: 'turno_id,agente_id' });

      if (error) {
        console.error('Supabase error updating presence:', error);
        throw error;
      }
      console.log('Presence updated successfully in Supabase');
    } catch (err: any) {
      console.error('Erro ao atualizar presença:', err);
      alert('Erro ao salvar presença no banco de dados: ' + (err.message || 'Erro desconhecido'));
      // Rollback UI state on error
      setPresence(prev => ({ 
        ...prev, 
        [mat]: { presente: !newState, jornada: isCurrentlyPresent ? presence[mat]?.jornada : undefined } 
      }));
    }
  };

  const handleSaveOcorrencia = async (data: any) => {
    if (!activeTurnoId) return;

    try {
      const { data: inserted, error } = await supabase
        .schema('seguranca')
        .from('ocorrencias')
        .insert({
          turno_id: activeTurnoId,
          canal,
          tipo: data.tipo,
          hora: data.hora,
          descricao: data.desc,
          agente: data.agente,
          ts: data.ts,
          imagem_url: data.imagem_url,
          apacs: data.apacs
        })
        .select()
        .single();

      if (error) throw error;
      if (inserted) {
        const mapped: Ocorrencia = {
          id: inserted.id,
          canal: inserted.canal,
          turnoId: inserted.turno_id,
          tipo: inserted.tipo,
          hora: inserted.hora,
          desc: inserted.descricao,
          agente: inserted.agente,
          ts: inserted.ts,
          imagem_url: inserted.imagem_url,
          apacs: inserted.apacs
        };
        setOcorrencias(prev => [mapped, ...prev]);
        setIsModalOpen(false);
      }
    } catch (err: any) {
      console.error('Erro ao salvar ocorrência:', err);
      alert('Erro ao salvar ocorrência no banco de dados: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleSaveEquipamento = async () => {
    if (!activeTurnoId || !novoEquipamento.tipo || !novoEquipamento.descricao) {
      alert('Por favor, preencha o tipo e a descrição do defeito.');
      return;
    }

    try {
      const { data: inserted, error } = await supabase
        .schema('seguranca')
        .from('equipamentos')
        .insert({
          turno_id: activeTurnoId,
          tipo: novoEquipamento.tipo,
          data_defeito: novoEquipamento.data,
          descricao: novoEquipamento.descricao,
          local: novoEquipamento.local,
          os: novoEquipamento.os,
          prazo: novoEquipamento.prazo
        })
        .select()
        .single();

      if (error) throw error;
      if (inserted) {
        setEquipamentos(prev => [inserted, ...prev]);
        setNovoEquipamento({
          tipo: '',
          data: new Date().toISOString().split('T')[0],
          descricao: '',
          local: CANAL_CONFIG[canal]?.name || '',
          os: '',
          prazo: ''
        });
        alert('Equipamento registrado com sucesso!');
      }
    } catch (err: any) {
      console.error('Erro ao salvar equipamento:', err);
      alert('Erro ao salvar equipamento no banco de dados: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleSavePaxFlow = async () => {
    if (!activeTurnoId) return;
    setIsSavingPax(true);

    try {
      const { error } = await supabase
        .schema('seguranca')
        .from('fluxo_passageiros')
        .upsert({
          turno_id: activeTurnoId,
          total: paxFlow.total,
          pico: paxFlow.pico,
          hora_pico: paxFlow.horaPico,
          obs: paxFlow.obs
        }, { onConflict: 'turno_id' });

      if (error) throw error;
      alert('Fluxo de passageiros salvo com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar fluxo de passageiros:', err);
      alert('Erro ao salvar fluxo de passageiros no banco de dados: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSavingPax(false);
    }
  };

  const handleSaveVoo = async () => {
    if (!activeTurnoId || !novoVoo.numero || !novoVoo.horario) {
      alert('Por favor, preencha o número do voo e o horário.');
      return;
    }
    setIsSavingVoo(true);

    try {
      const { data: inserted, error } = await supabase
        .schema('seguranca')
        .from('voos_internacionais')
        .insert({
          turno_id: activeTurnoId,
          numero: novoVoo.numero,
          horario: novoVoo.horario,
          modulo: novoVoo.modulo,
          apf: novoVoo.apf,
          pax: novoVoo.pax
        })
        .select()
        .single();

      if (error) throw error;
      if (inserted) {
        setVoos(prev => [inserted, ...prev]);
        setNovoVoo({
          numero: '',
          horario: '',
          modulo: '',
          apf: '',
          pax: ''
        });
        alert('Voo registrado com sucesso!');
      }
    } catch (err: any) {
      console.error('Erro ao salvar voo:', err);
      alert('Erro ao salvar voo no banco de dados: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSavingVoo(false);
    }
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted">
        <Loader2 className="animate-spin" size={32} />
        <p className="font-mono text-xs uppercase tracking-widest">Sincronizando com Supabase...</p>
      </div>
    );
  }

  if (!activeTurnoId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-2 animate-pulse">
          <ClipboardList className="text-muted" size={32} />
        </div>
        <h3 className="text-lg font-medium text-text">Aguardando Abertura de Turno</h3>
        <p className="text-sm text-muted max-w-xs mx-auto">
          O Supervisor ainda não abriu o turno de hoje. 
          Esta página será atualizada automaticamente assim que o turno for iniciado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-medium text-text">Formulário do Turno</h2>
        <p className="text-xs text-muted">Registre o efetivo e ocorrências do seu turno</p>
      </div>

      <div className="card p-4">
        <div className="text-[11px] font-mono text-muted uppercase tracking-widest mb-3 pb-2 border-b border-border-2">
          Turno em serviço
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          {Object.values(TURNOS).map((t) => (
            <button
              key={t.letra}
              disabled
              className={cn(
                "px-3 py-1.5 rounded text-xs font-mono border transition-all cursor-default",
                turno === t.letra 
                  ? "border-accent text-accent bg-accent/10" 
                  : "border-border bg-surface-2 text-muted opacity-50"
              )}
            >
              {t.letra} · {t.inicio}–{t.fim}
            </button>
          ))}
        </div>
        <div className="bg-white/5 border border-white/10 rounded p-3.5 flex justify-between items-center">
          <p className="text-[13px] text-muted italic">
            Turno {turno} – {TURNOS[turno].inicio} às {TURNOS[turno].fim} em andamento.
          </p>
        </div>
      </div>

      <div className="flex gap-0.5 bg-surface-2 rounded p-1">
        {[
          { id: 'efetivo', label: 'Efetivo', icon: Users },
          { id: 'ocorrencias', label: 'Ocorrências', icon: ClipboardList },
          { id: 'equipamentos', label: 'Equipamentos', icon: HardDrive },
          ...(canal !== 'fox' ? [{ id: 'passageiros', label: 'Passageiros/Voos', icon: Plane }] : []),
          ...((canal === 'alfa' || canal === 'bravo') ? [{ id: 'varredura', label: 'Varredura', icon: Search }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded transition-all",
              activeTab === tab.id ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'efetivo' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Adicionar agente ao turno (nome ou matrícula)..."
              className="w-full pl-10 pr-4 py-2 bg-surface-2 border border-border-2 rounded text-sm focus:outline-none focus:border-accent transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <div className="absolute z-[100] left-0 right-0 top-full mt-1 bg-surface border border-border rounded shadow-xl max-h-60 overflow-y-auto">
                {allAgentes
                  .filter(a => {
                    const term = searchTerm.toLowerCase();
                    const nome = a.nome.toLowerCase();
                    const mat = a.matricula.toLowerCase();
                    
                    const nomeWords = nome.split(' ');
                    const matchesNome = nomeWords.some(word => word.startsWith(term));
                    const matchesMat = mat.startsWith(term);
                    
                    return (matchesNome || matchesMat) && !presence[a.matricula]?.presente;
                  })
                  .sort((a, b) => {
                    const term = searchTerm.toLowerCase();
                    const nomeA = a.nome.toLowerCase();
                    const nomeB = b.nome.toLowerCase();
                    const matA = a.matricula.toLowerCase();
                    const matB = b.matricula.toLowerCase();

                    // Prioridade 1: Nome começa exatamente com o termo
                    const startsWithA = nomeA.startsWith(term);
                    const startsWithB = nomeB.startsWith(term);
                    if (startsWithA && !startsWithB) return -1;
                    if (!startsWithA && startsWithB) return 1;

                    // Prioridade 2: Matrícula começa com o termo
                    const matStartsWithA = matA.startsWith(term);
                    const matStartsWithB = matB.startsWith(term);
                    if (matStartsWithA && !matStartsWithB) return -1;
                    if (!matStartsWithA && matStartsWithB) return 1;

                    // Prioridade 3: Ordem alfabética normal
                    return a.nome.localeCompare(b.nome);
                  })
                  .map(a => (
                    <div key={a.matricula} className="border-b border-border last:border-0">
                      <div className="flex items-center justify-between px-4 py-2 hover:bg-accent/5 transition-colors">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{a.nome}</div>
                          <div className="text-[10px] text-muted font-mono">{a.matricula}</div>
                        </div>
                        <div className="flex gap-1.5 shrink-0 ml-4">
                          <button
                            onClick={() => {
                              togglePresence(a.matricula, '04:00');
                              setSearchTerm('');
                            }}
                            className="px-2 py-1 text-[10px] font-bold bg-surface-3 border border-border rounded hover:bg-accent hover:text-white transition-all"
                          >
                            04:00
                          </button>
                          <button
                            onClick={() => {
                              togglePresence(a.matricula, '06:00');
                              setSearchTerm('');
                            }}
                            className="px-2 py-1 text-[10px] font-bold bg-surface-3 border border-border rounded hover:bg-accent hover:text-white transition-all"
                          >
                            06:00
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-mono text-muted uppercase tracking-widest">Agentes Presentes</h3>
            <div className="grid gap-2">
              {allAgentes
                .filter(a => presence[a.matricula]?.presente)
                .map(a => (
                  <div
                    key={a.matricula}
                    className="flex items-center gap-3 p-2.5 px-3.5 bg-teal-500/10 border border-teal-500/30 rounded transition-all"
                  >
                    <div className="w-4.5 h-4.5 rounded bg-teal-500 flex items-center justify-center text-white text-[10px]">
                      ✓
                    </div>
                    <div className="font-mono text-[11px] text-muted w-11 shrink-0">{a.matricula}</div>
                    <div className="flex-1 text-[13px] font-medium">{a.nome}</div>
                    <div className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-600 border border-teal-500/20">
                      {presence[a.matricula]?.jornada || '—'}
                    </div>
                    <button 
                      onClick={() => togglePresence(a.matricula)}
                      className="text-muted hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              }
              {Object.values(presence).filter((p: any) => p.presente).length === 0 && (
                <div className="text-center py-8 border border-dashed border-border rounded text-hint text-xs">
                  Nenhum agente adicionado ao turno ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ocorrencias' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button 
              onClick={() => {
                setModalInitialTipo(undefined);
                setIsModalOpen(true);
              }}
              className="btn btn-primary btn-sm gap-1.5"
            >
              <Plus size={14} />
              Registrar ocorrência
            </button>
          </div>
          
          {ocorrencias.length === 0 ? (
            <div className="text-center py-8 px-5 text-hint text-[13px]">
              <div className="text-3xl mb-2 opacity-50">📋</div>
              Nenhuma ocorrência registrada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {ocorrencias.map((o) => (
                <div key={o.id} className="bg-surface-2 border border-border-2 rounded p-3 px-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                      {o.tipo}
                    </span>
                    <span className="font-mono text-[11px] text-muted">{o.hora}</span>
                  </div>
                  <div className="text-[13px] text-text whitespace-pre-wrap leading-relaxed">
                    {o.desc}
                  </div>
                  {o.imagem_url && (
                    <div className="mt-2">
                      <img 
                        src={o.imagem_url} 
                        alt="Evidência" 
                        className="rounded border border-border-2 max-h-48 w-auto object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  {o.agente && (
                    <div className="text-[11px] text-hint mt-2 font-mono">
                      {o.agente}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'equipamentos' && (
        <div className="space-y-6">
          <div className="card rounded-md border-border-2">
            <div className="p-4 border-b border-border-2 flex items-center justify-between bg-surface-2">
              <div className="flex items-center gap-2">
                <HardDrive size={16} className="text-muted" />
                <span className="text-xs font-mono uppercase tracking-widest font-bold text-text">
                  Registrar Equipamento com Defeito
                </span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Tipo/Equipamento</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all" 
                    value={novoEquipamento.tipo}
                    onChange={e => setNovoEquipamento({...novoEquipamento, tipo: e.target.value})}
                    placeholder="Ex: Raio-X, Pórtico..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Local</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-3 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none text-muted cursor-not-allowed transition-all" 
                    value={novoEquipamento.local}
                    readOnly
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Descrição do Defeito</label>
                  <textarea 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all min-h-[80px] resize-none" 
                    value={novoEquipamento.descricao}
                    onChange={e => setNovoEquipamento({...novoEquipamento, descricao: e.target.value})}
                    placeholder="Descreva detalhadamente o problema..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Nº Ordem de Serviço (OS)</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all" 
                    value={novoEquipamento.os}
                    onChange={e => setNovoEquipamento({...novoEquipamento, os: e.target.value})}
                    placeholder="Ex: 12345/2024"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Prazo de Reparo</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all" 
                    value={novoEquipamento.prazo}
                    onChange={e => setNovoEquipamento({...novoEquipamento, prazo: e.target.value})}
                    placeholder="Ex: 24 horas, Imediato..."
                  />
                </div>
              </div>
              <button 
                onClick={handleSaveEquipamento}
                className="w-full py-2.5 bg-accent hover:opacity-90 text-white rounded font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
              >
                <HardDrive size={16} />
                Enviar Registro de Equipamento
              </button>
            </div>
          </div>

          {equipamentos.length > 0 && (
            <div className="space-y-3">
              <div className="text-[11px] font-mono text-muted uppercase tracking-widest pb-2 border-b border-border-2 flex items-center gap-2">
                <ClipboardList size={14} />
                Equipamentos Registrados no Turno
              </div>
              <div className="grid grid-cols-1 gap-3">
                {equipamentos.map((eq, i) => (
                  <div key={i} className="card rounded-md p-4 border-border-2 bg-surface-2">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-sm text-text">{eq.tipo}</div>
                      <div className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-3 text-text border border-border">
                        OS: {eq.os || 'N/A'}
                      </div>
                    </div>
                    <div className="text-xs text-muted mb-3 leading-relaxed">
                      {eq.descricao}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border-2 text-[10px] font-mono text-hint">
                      <div className="flex items-center gap-1">
                        <span className="uppercase">Local:</span>
                        <span className="text-text">{eq.local}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="uppercase">Prazo:</span>
                        <span className="text-text">{eq.prazo || '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'passageiros' && (
        <div className="space-y-6">
          <div className="card rounded-md border-border-2">
            <div className="p-4 border-b border-border-2 flex items-center justify-between bg-surface-2">
              <div className="flex items-center gap-2">
                <Plane size={16} className="text-muted" />
                <span className="text-xs font-mono uppercase tracking-widest font-bold text-text">
                  Fluxo de Passageiros e Voos
                </span>
              </div>
            </div>
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Total de Passageiros</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all" 
                    value={paxFlow.total}
                    onChange={e => setPaxFlow({...paxFlow, total: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Pico de Passageiros</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all" 
                    value={paxFlow.pico}
                    onChange={e => setPaxFlow({...paxFlow, pico: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Horário do Pico</label>
                  <input 
                    type="time" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all" 
                    value={paxFlow.horaPico}
                    onChange={e => setPaxFlow({...paxFlow, horaPico: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-[10px] uppercase font-mono text-muted font-bold tracking-wider">Observações Gerais</label>
                  <textarea 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all min-h-[80px] resize-none" 
                    value={paxFlow.obs}
                    onChange={e => setPaxFlow({...paxFlow, obs: e.target.value})}
                    placeholder="Descreva o fluxo do turno ou observações relevantes..."
                  />
                </div>
              </div>
              
              <div className="pt-6 border-t border-border-2">
                <div className="flex items-center gap-2 mb-4">
                  <Plane size={16} className="text-muted" />
                  <span className="text-xs font-mono uppercase tracking-widest font-bold text-text">
                    Registro de Voos Internacionais
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-hint">Voo</label>
                    <input 
                      type="text" 
                      className="w-full bg-surface-2 border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent" 
                      value={novoVoo.numero}
                      onChange={e => setNovoVoo({...novoVoo, numero: e.target.value})}
                      placeholder="Ex: AD8765"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-hint">Horário</label>
                    <input 
                      type="time" 
                      className="w-full bg-surface-2 border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent" 
                      value={novoVoo.horario}
                      onChange={e => setNovoVoo({...novoVoo, horario: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-hint">Módulo</label>
                    <input 
                      type="text" 
                      className="w-full bg-surface-2 border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent" 
                      value={novoVoo.modulo}
                      onChange={e => setNovoVoo({...novoVoo, modulo: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-hint">APF</label>
                    <input 
                      type="text" 
                      className="w-full bg-surface-2 border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent" 
                      value={novoVoo.apf}
                      onChange={e => setNovoVoo({...novoVoo, apf: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-hint">Pax</label>
                    <input 
                      type="text" 
                      className="w-full bg-surface-2 border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent" 
                      value={novoVoo.pax}
                      onChange={e => setNovoVoo({...novoVoo, pax: e.target.value})}
                    />
                  </div>
                </div>
                
                <button 
                  type="button"
                  onClick={handleSaveVoo}
                  disabled={isSavingVoo}
                  className="w-full py-2 border border-border-2 bg-surface-2 hover:bg-surface-3 text-text rounded text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all mb-6"
                >
                  {isSavingVoo ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                  Registrar Voo Internacional
                </button>

                {voos.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Voos Registrados</div>
                    <div className="grid grid-cols-1 gap-2">
                      {voos.map((v, i) => (
                        <div key={i} className="flex items-center justify-between p-2 px-3 bg-surface-2 border border-border-2 rounded text-[11px]">
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-blue-500">{v.numero}</span>
                            <span className="text-muted">{v.horario}</span>
                            <span className="text-muted">Módulo: {v.modulo || '—'}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-muted">APF: {v.apf || '—'}</span>
                            <span className="font-mono bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">Pax: {v.pax || '0'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border-2">
                <button 
                  onClick={handleSavePaxFlow}
                  disabled={isSavingPax}
                  className="w-full py-2.5 bg-accent hover:opacity-90 text-white rounded font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {isSavingPax ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Plane size={16} />
                  )}
                  Salvar Resumo do Fluxo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'varredura' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-mono text-muted uppercase tracking-widest">Registros de Varredura</h3>
            <button 
              onClick={() => {
                setModalInitialTipo('varredura');
                setIsModalOpen(true);
              }}
              className="btn btn-primary btn-sm gap-1.5"
            >
              <Plus size={14} />
              Nova Varredura
            </button>
          </div>
          
          {ocorrencias.filter(o => o.tipo === 'varredura').length === 0 ? (
            <div className="text-center py-8 px-5 text-hint text-[13px]">
              <div className="text-3xl mb-2 opacity-50">🔍</div>
              Nenhuma varredura registrada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {ocorrencias.filter(o => o.tipo === 'varredura').map((o) => (
                <div key={o.id} className="bg-surface-2 border border-border-2 rounded p-3 px-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                      Varredura
                    </span>
                    <span className="font-mono text-[11px] text-muted">{o.hora}</span>
                  </div>
                  <div className="text-[13px] text-text whitespace-pre-wrap leading-relaxed">
                    {o.desc}
                  </div>
                  {o.imagem_url && (
                    <div className="mt-2">
                      <img 
                        src={o.imagem_url} 
                        alt="Varredura" 
                        className="rounded border border-border-2 max-h-48 w-auto object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  {o.agente && (
                    <div className="text-[11px] text-hint mt-2 font-mono">
                      {o.agente}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <OcorrenciaModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setModalInitialTipo(undefined);
        }} 
        onSave={handleSaveOcorrencia}
        canal={canal}
        allAgentes={allAgentes}
        initialTipo={modalInitialTipo}
      />
    </div>
  );
}
