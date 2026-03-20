import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Canal, TURNOS, EFETIVO_BASE, CANAL_CONFIG } from '../constants';
import { cn } from '../lib/utils';
import { Plus, ClipboardList, Users, HardDrive, Plane, Loader2, Search, X } from 'lucide-react';
import OcorrenciaModal from './OcorrenciaModal';
import { Ocorrencia, Turno } from '../types';
import { supabase } from '../lib/supabase';

interface PostoProps {
  canal: Canal;
  turno: string;
  onTurnoChange: (letra: string) => void;
}

export default function Posto({ canal, turno, onTurnoChange }: PostoProps) {
  const [activeTab, setActiveTab] = useState('efetivo');
  const [searchTerm, setSearchTerm] = useState('');
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTurnoId, setActiveTurnoId] = useState<string | null>(null);

  const efetivo = EFETIVO_BASE[canal];

  // Estados para Equipamentos
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [novoEquipamento, setNovoEquipamento] = useState({
    tipo: '',
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    local: '',
    os: '',
    prazo: ''
  });

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
      
      const now = new Date();
      const hour = now.getHours();
      let currentShiftLetra = 'A';
      if (hour >= 6 && hour < 12) currentShiftLetra = 'B';
      else if (hour >= 12 && hour < 18) currentShiftLetra = 'C';
      else if (hour >= 18) currentShiftLetra = 'D';

      if (data && data.length > 0) {
        const active = data[0];
        const shiftDate = new Date(active.data);
        const isDifferentDay = shiftDate.toISOString().split('T')[0] !== now.toISOString().split('T')[0];
        
        // Se for um dia diferente ou se a letra do turno for diferente da sugerida para agora,
        // encerramos o turno antigo e iniciamos o novo.
        if (isDifferentDay || active.letra !== currentShiftLetra) {
          await supabase
            .schema('seguranca')
            .from('turnos')
            .update({ fechado_em: now.toISOString() })
            .eq('id', active.id);
          
          // Recarregar para criar o novo turno
          return fetchActiveTurno();
        }

        setActiveTurnoId(active.id);
        onTurnoChange(active.letra);
        return active.id;
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
          setActiveTurnoId(newTurno.id);
          onTurnoChange(newTurno.letra);
          return newTurno.id;
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar/criar turno ativo:', err);
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

  const encerrarTurno = async () => {
    if (!activeTurnoId) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .schema('seguranca')
        .from('turnos')
        .update({ fechado_em: new Date().toISOString() })
        .eq('id', activeTurnoId);
        
      if (error) throw error;
      
      // Recarregar para criar o próximo turno
      await fetchActiveTurno();
    } catch (err: any) {
      console.error('Erro ao encerrar turno:', err);
      setError('Erro ao encerrar turno: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPresence = useCallback(async (turnoId: string) => {
    try {
      const { data, error } = await supabase
        .schema('seguranca')
        .from('efetivo_turno')
        .select('agente_id, presente')
        .eq('turno_id', turnoId);

      if (error) throw error;
      if (data) {
        const presenceMap: Record<string, boolean> = {};
        data.forEach((p: any) => {
          presenceMap[p.agente_id] = p.presente;
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
      if (data) setOcorrencias(data);
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

  useEffect(() => {
    let channel: any;

    const init = async () => {
      setLoading(true);
      const turnoId = await fetchActiveTurno();
      if (turnoId) {
        await Promise.all([
          fetchPresence(turnoId),
          fetchOcorrencias(turnoId),
          fetchEquipamentos(turnoId),
          fetchPaxFlow(turnoId),
          fetchVoos(turnoId)
        ]);

        // Subscribe to Realtime
        console.log(`Iniciando Realtime Posto ${canal} para turno:`, turnoId);
        channel = supabase
          .channel(`posto-${canal}-${Math.random().toString(36).slice(2)}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'seguranca', 
            table: 'ocorrencias',
            filter: `turno_id=eq.${turnoId}`
          }, (payload) => {
            console.log('Evento Ocorrência:', payload);
            fetchOcorrencias(turnoId);
          })
          .on('postgres_changes', { 
            event: '*', 
            schema: 'seguranca', 
            table: 'efetivo_turno',
            filter: `turno_id=eq.${turnoId}`
          }, (payload) => {
            console.log('Evento Efetivo:', payload);
            fetchPresence(turnoId);
          })
          .on('postgres_changes', { 
            event: '*', 
            schema: 'seguranca', 
            table: 'equipamentos',
            filter: `turno_id=eq.${turnoId}`
          }, (payload) => {
            console.log('Evento Equipamento:', payload);
            fetchEquipamentos(turnoId);
          })
          .on('postgres_changes', { 
            event: '*', 
            schema: 'seguranca', 
            table: 'fluxo_passageiros',
            filter: `turno_id=eq.${turnoId}`
          }, (payload) => {
            console.log('Evento Fluxo:', payload);
            fetchPaxFlow(turnoId);
          })
          .on('postgres_changes', { 
            event: '*', 
            schema: 'seguranca', 
            table: 'voos_internacionais',
            filter: `turno_id=eq.${turnoId}`
          }, (payload) => {
            console.log('Evento Voo:', payload);
            fetchVoos(turnoId);
          })
          .subscribe((status) => {
            console.log(`Status do Canal Posto ${canal}:`, status);
          });
      }
      setLoading(false);
    };
    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchActiveTurno, fetchPresence, fetchOcorrencias, fetchEquipamentos, fetchPaxFlow, fetchVoos, canal]);

  const togglePresence = async (mat: string) => {
    console.log('Toggling presence for:', mat, 'Active Turno ID:', activeTurnoId);
    if (!activeTurnoId) {
      alert('Nenhum turno ativo encontrado. Por favor, recarregue a página ou aguarde a sincronização.');
      return;
    }
    
    const newState = !presence[mat];
    console.log('New presence state:', newState);
    setPresence(prev => ({ ...prev, [mat]: newState }));

    try {
      const { error } = await supabase
        .schema('seguranca')
        .from('efetivo_turno')
        .upsert({
          turno_id: activeTurnoId,
          agente_id: mat,
          presente: newState,
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
      setPresence(prev => ({ ...prev, [mat]: !newState }));
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
        setOcorrencias(prev => [inserted, ...prev]);
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
          local: '',
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
          <p className="text-[13px] text-white/80 italic">
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
                {Object.values(efetivo || {}).flat()
                  .filter(a => 
                    (a.nome.toLowerCase().includes(searchTerm.toLowerCase()) || a.mat.toLowerCase().includes(searchTerm.toLowerCase())) &&
                    !presence[a.mat]
                  )
                  .map(a => (
                    <button
                      key={a.mat}
                      onClick={() => {
                        togglePresence(a.mat);
                        setSearchTerm('');
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent/10 transition-colors border-b border-border last:border-0"
                    >
                      <div className="font-medium">{a.nome}</div>
                      <div className="text-[10px] text-muted font-mono">{a.mat} · {a.turno}</div>
                    </button>
                  ))
                }
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-mono text-muted uppercase tracking-widest">Agentes Presentes</h3>
            <div className="grid gap-2">
              {Object.values(efetivo || {}).flat()
                .filter(a => presence[a.mat])
                .map(a => (
                  <div
                    key={a.mat}
                    className="flex items-center gap-3 p-2.5 px-3.5 bg-teal-500/10 border border-teal-500/30 rounded transition-all"
                  >
                    <div className="w-4.5 h-4.5 rounded bg-teal-500 flex items-center justify-center text-white text-[10px]">
                      ✓
                    </div>
                    <div className="font-mono text-[11px] text-muted w-11 shrink-0">{a.mat}</div>
                    <div className="flex-1 text-[13px] font-medium">{a.nome}</div>
                    <button 
                      onClick={() => togglePresence(a.mat)}
                      className="text-muted hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              }
              {Object.values(presence).filter(Boolean).length === 0 && (
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
              onClick={() => setIsModalOpen(true)}
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
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all" 
                    value={novoEquipamento.local}
                    onChange={e => setNovoEquipamento({...novoEquipamento, local: e.target.value})}
                    placeholder="Ex: Canal Alfa"
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
                className="w-full py-2.5 bg-accent hover:opacity-90 text-black rounded font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
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
                      <div className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-3 text-white border border-border">
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
                    type="text" 
                    className="w-full bg-surface-2 border border-border-2 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all" 
                    value={paxFlow.horaPico}
                    onChange={e => setPaxFlow({...paxFlow, horaPico: e.target.value})}
                    placeholder="00:00"
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
                      type="text" 
                      className="w-full bg-surface-2 border border-border-2 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent" 
                      value={novoVoo.horario}
                      onChange={e => setNovoVoo({...novoVoo, horario: e.target.value})}
                      placeholder="00:00"
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
                  className="w-full py-2.5 bg-accent hover:opacity-90 text-black rounded font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2"
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

      <OcorrenciaModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveOcorrencia}
        canal={canal}
      />
    </div>
  );
}
