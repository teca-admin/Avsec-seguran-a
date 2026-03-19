import React, { useState, useEffect, useCallback } from 'react';
import { Canal, TURNOS, EFETIVO_BASE, CANAL_CONFIG } from '../constants';
import { cn } from '../lib/utils';
import { Plus, ClipboardList, Users, HardDrive, Plane, Loader2 } from 'lucide-react';
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
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTurnoId, setActiveTurnoId] = useState<string | null>(null);

  const fetchActiveTurno = useCallback(async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .schema('seguranca')
        .from('turnos')
        .select('*')
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
        // Se não houver turno ativo, criar um novo para o dia de hoje
        // Baseado na hora atual para sugerir a letra do turno
        const now = new Date();
        const hour = now.getHours();
        let suggestedLetra = 'A';
        if (hour >= 6 && hour < 14) suggestedLetra = 'B';
        else if (hour >= 14 && hour < 22) suggestedLetra = 'C';
        
        const { data: newTurno, error: createError } = await supabase
          .schema('seguranca')
          .from('turnos')
          .insert({
            letra: suggestedLetra,
            data: now.toISOString().split('T')[0],
            aberto_em: now.toISOString()
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
    } catch (err) {
      console.error('Erro ao buscar/criar turno ativo:', err);
    }
    return null;
  }, [onTurnoChange]);

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

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const turnoId = await fetchActiveTurno();
      if (turnoId) {
        await Promise.all([
          fetchPresence(turnoId),
          fetchOcorrencias(turnoId)
        ]);
      }
      setLoading(false);
    };
    init();
  }, [fetchActiveTurno, fetchPresence, fetchOcorrencias]);

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
          registrado_em: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      if (inserted) {
        // Map database fields back to UI type if necessary
        const mapped: Ocorrencia = {
          id: inserted.id,
          canal: inserted.canal,
          turnoId: inserted.turno_id,
          tipo: inserted.tipo,
          hora: inserted.hora,
          desc: inserted.descricao,
          agente: inserted.agente,
          ts: inserted.ts
        };
        setOcorrencias(prev => [mapped, ...prev]);
      }
    } catch (err) {
      console.error('Erro ao salvar ocorrência:', err);
      alert('Erro ao salvar ocorrência no banco de dados.');
    }
  };

  const efetivo = EFETIVO_BASE[canal];

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
        <div className="bg-accent/10 border border-accent/20 rounded p-3.5">
          <p className="text-[13px] text-accent italic">
            Turno {turno} – {TURNOS[turno].inicio} às {TURNOS[turno].fim} em andamento.
          </p>
        </div>
      </div>

      <div className="flex gap-0.5 bg-surface-2 rounded p-1">
        {[
          { id: 'efetivo', label: 'Efetivo', icon: Users },
          { id: 'ocorrencias', label: 'Ocorrências', icon: ClipboardList },
          { id: 'equipamentos', label: 'Equipamentos', icon: HardDrive },
          { id: 'passageiros', label: 'Passageiros/Voos', icon: Plane },
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
          {efetivo && Object.entries(efetivo).map(([tipo, agentes]) => (
            agentes.length > 0 && (
              <div key={tipo} className="card">
                <div className="text-[11px] font-mono text-accent uppercase tracking-widest mb-3 font-medium">
                  Agentes de Proteção – {tipo} ({tipo === '6h' ? '180' : '120'} mês)
                </div>
                <div className="flex flex-col gap-2">
                  {agentes.map((a) => (
                    <div
                      key={a.mat}
                      onClick={() => togglePresence(a.mat)}
                      className={cn(
                        "flex items-center gap-3 p-2.5 px-3.5 bg-surface-2 border border-border-2 rounded transition-all cursor-pointer select-none hover:border-border",
                        presence[a.mat] && "bg-teal-500/15 border-teal-500/40"
                      )}
                    >
                      <div className={cn(
                        "w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all text-[11px]",
                        presence[a.mat] ? "bg-teal-500 border-teal-500 text-white" : "border-border"
                      )}>
                        {presence[a.mat] && "✓"}
                      </div>
                      <div className="font-mono text-[11px] text-muted w-11 shrink-0">{a.mat}</div>
                      <div className="flex-1 text-[13px] font-medium">{a.nome}</div>
                      <div className="font-mono text-[11px] text-muted">{a.turno}</div>
                      <div className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0",
                        tipo === '6h' ? "bg-teal-500/15 text-teal-400" : "bg-blue-500/15 text-blue-400"
                      )}>
                        {tipo}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
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

      {/* Outras abas permanecem como protótipo por enquanto */}
      {activeTab === 'equipamentos' && (
        <div className="card overflow-x-auto">
          <div className="text-[11px] font-mono text-muted uppercase tracking-widest mb-3 pb-2 border-b border-border-2">
            Registro de equipamentos com defeito
          </div>
          <p className="text-xs text-hint py-4">Funcionalidade em desenvolvimento.</p>
        </div>
      )}

      {activeTab === 'passageiros' && (
        <div className="card">
          <div className="text-[11px] font-mono text-muted uppercase tracking-widest mb-3 pb-2 border-b border-border-2">
            Fluxo de passageiros
          </div>
          <p className="text-xs text-hint py-4">Funcionalidade em desenvolvimento.</p>
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
