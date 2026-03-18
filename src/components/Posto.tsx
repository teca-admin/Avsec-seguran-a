import React, { useState } from 'react';
import { Canal, TURNOS, EFETIVO_BASE, CANAL_CONFIG } from '../constants';
import { cn } from '../lib/utils';
import { Plus, ClipboardList, Users, HardDrive, Plane } from 'lucide-react';
import OcorrenciaModal from './OcorrenciaModal';
import { Ocorrencia } from '../types';

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

  const togglePresence = (mat: string) => {
    setPresence(prev => ({ ...prev, [mat]: !prev[mat] }));
  };

  const handleSaveOcorrencia = (data: any) => {
    const newOcorrencia: Ocorrencia = {
      id: Math.random().toString(36).substr(2, 9),
      canal,
      turnoId: turno,
      ...data
    };
    setOcorrencias(prev => [...prev, newOcorrencia]);
  };

  const efetivo = EFETIVO_BASE[canal];
  const presenceCount = Object.values(presence).filter(Boolean).length;

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
              onClick={() => onTurnoChange(t.letra)}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-mono border transition-all",
                turno === t.letra 
                  ? "border-accent text-accent bg-accent/10" 
                  : "border-border bg-surface-2 text-muted"
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

      {activeTab === 'equipamentos' && (
        <div className="card overflow-x-auto">
          <div className="text-[11px] font-mono text-muted uppercase tracking-widest mb-3 pb-2 border-b border-border-2">
            Registro de equipamentos com defeito
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-2">
                <th className="text-[11px] font-mono text-muted text-left p-2 px-2.5 border-b border-border uppercase tracking-wider">Tipo</th>
                <th className="text-[11px] font-mono text-muted text-left p-2 px-2.5 border-b border-border uppercase tracking-wider">Data</th>
                <th className="text-[11px] font-mono text-muted text-left p-2 px-2.5 border-b border-border uppercase tracking-wider">Descrição</th>
                <th className="text-[11px] font-mono text-muted text-left p-2 px-2.5 border-b border-border uppercase tracking-wider">Local</th>
                <th className="text-[11px] font-mono text-muted text-left p-2 px-2.5 border-b border-border uppercase tracking-wider">OS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border-b border-border-2">
                  <select className="bg-background border border-border rounded p-1 text-xs outline-none">
                    <option>RX</option>
                    <option>ETD</option>
                    <option>PDM</option>
                  </select>
                </td>
                <td className="p-2 border-b border-border-2"><input type="date" className="bg-transparent border-none text-xs outline-none w-full" /></td>
                <td className="p-2 border-b border-border-2"><input type="text" placeholder="Defeito..." className="bg-transparent border-none text-xs outline-none w-full" /></td>
                <td className="p-2 border-b border-border-2"><input type="text" placeholder="Local..." className="bg-transparent border-none text-xs outline-none w-full" /></td>
                <td className="p-2 border-b border-border-2"><input type="text" placeholder="Nº OS..." className="bg-transparent border-none text-xs outline-none w-full" /></td>
              </tr>
            </tbody>
          </table>
          <button className="btn btn-secondary btn-sm mt-3">
            <Plus size={14} />
            Adicionar linha
          </button>
        </div>
      )}

      {activeTab === 'passageiros' && (
        <div className="space-y-4">
          <div className="card">
            <div className="text-[11px] font-mono text-muted uppercase tracking-widest mb-3 pb-2 border-b border-border-2">
              Fluxo de passageiros – embarque doméstico
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-surface-2 border border-border-2 rounded p-2.5">
                <label className="block text-[10px] font-mono text-muted uppercase mb-1.5">Total geral</label>
                <input type="number" placeholder="0" className="w-full bg-background border border-border rounded p-1.5 font-mono text-lg font-medium text-center outline-none focus:border-accent" />
              </div>
              <div className="bg-surface-2 border border-border-2 rounded p-2.5">
                <label className="block text-[10px] font-mono text-muted uppercase mb-1.5">Pico máx/hora</label>
                <input type="number" placeholder="0" className="w-full bg-background border border-border rounded p-1.5 font-mono text-lg font-medium text-center outline-none focus:border-accent" />
              </div>
              <div className="bg-surface-2 border border-border-2 rounded p-2.5">
                <label className="block text-[10px] font-mono text-muted uppercase mb-1.5">Hora do pico</label>
                <input type="time" className="w-full bg-background border border-border rounded p-1.5 font-mono text-lg font-medium text-center outline-none focus:border-accent" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">Observação sobre fluxo</label>
              <textarea rows={2} placeholder="Ex: Não foi registrado fluxo intenso..." className="form-input text-sm"></textarea>
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
