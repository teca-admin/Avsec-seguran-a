import React, { useState, useEffect } from 'react';
import { Canal, EFETIVO_BASE } from '../constants';
import { OcorrenciaTipo } from '../types';
import { cn } from '../lib/utils';
import { X } from 'lucide-react';

interface OcorrenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  canal: Canal;
}

export default function OcorrenciaModal({ isOpen, onClose, onSave, canal }: OcorrenciaModalProps) {
  const [tipo, setTipo] = useState<OcorrenciaTipo>('teca');
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5));
  const [desc, setDesc] = useState('');
  const [agente, setAgente] = useState('');
  const [horaFim, setHoraFim] = useState('');
  
  // TECA specific
  const [tecaTipo, setTecaTipo] = useState('Exportação raio-x SMITHS');
  const [apacs, setApacs] = useState([{ agente: '', ini: '', fim: '', detalhe: '' }]);

  useEffect(() => {
    if (isOpen) {
      setHora(new Date().toTimeString().slice(0, 5));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    let finalDesc = desc;
    let finalAgente = agente;

    if (tipo === 'teca') {
      const apacTexts = apacs
        .filter(a => a.agente)
        .map(a => `APAC: ${a.agente}${a.ini ? ' das ' + a.ini : ''}${a.fim ? ' às ' + a.fim : ''} – ${a.detalhe || ''}`);
      finalDesc = `${tecaTipo}\n${apacTexts.join('\n')}`;
      finalAgente = apacTexts.length > 0 ? 'Múltiplos agentes' : '';
    }

    if (!finalDesc.trim() && tipo !== 'teca') {
      alert('Preencha a descrição da ocorrência.');
      return;
    }

    onSave({
      tipo,
      hora,
      desc: finalDesc,
      agente: finalAgente,
      horaFim,
      ts: Date.now()
    });
    
    // Reset
    setDesc('');
    setAgente('');
    setApacs([{ agente: '', ini: '', fim: '', detalhe: '' }]);
    onClose();
  };

  const addApacRow = () => {
    setApacs([...apacs, { agente: '', ini: '', fim: '', detalhe: '' }]);
  };

  const updateApac = (index: number, field: string, value: string) => {
    const newApacs = [...apacs];
    (newApacs[index] as any)[field] = value;
    setApacs(newApacs);
  };

  const agentesCanal = [...(EFETIVO_BASE[canal]?.['6h'] || []), ...(EFETIVO_BASE[canal]?.['4h'] || [])];

  return (
    <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-lg w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-4 px-5 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium">Registrar Ocorrência</span>
          <button onClick={onClose} className="text-muted hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">Tipo de ocorrência</label>
              <select 
                value={tipo} 
                onChange={(e) => setTipo(e.target.value as OcorrenciaTipo)}
                className="form-input text-sm"
              >
                <option value="teca">Escaneamento TECA / APAC</option>
                <option value="avsec">AVSEC (segurança)</option>
                <option value="equipamento">Equipamento</option>
                <option value="receita">Atendimento Receita / PF</option>
                <option value="treinamento">Treinamento em serviço</option>
                <option value="passageiros">Fluxo de passageiros</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">Horário</label>
              <input 
                type="time" 
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="form-input text-sm"
              />
            </div>
          </div>

          {tipo === 'teca' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">Tipo de operação</label>
                <select 
                  value={tecaTipo}
                  onChange={(e) => setTecaTipo(e.target.value)}
                  className="form-input text-sm"
                >
                  <option value="Exportação raio-x SMITHS">Exportação raio-x SMITHS</option>
                  <option value="Internação raio-x">Internação raio-x</option>
                  <option value="Varredura Tango 03">Varredura Tango 03</option>
                </select>
              </div>
              <div className="bg-surface-2 border border-border-2 rounded p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono text-muted uppercase tracking-wider">Registros APAC</span>
                  <button onClick={addApacRow} className="btn btn-secondary py-1 px-2 text-[10px] uppercase tracking-wider">
                    + APAC
                  </button>
                </div>
                <div className="space-y-2">
                  {apacs.map((apac, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_80px_1fr] gap-2 items-center">
                      <select 
                        value={apac.agente}
                        onChange={(e) => updateApac(i, 'agente', e.target.value)}
                        className="form-input py-1.5 px-2 text-xs"
                      >
                        <option value="">Agente...</option>
                        {agentesCanal.map(a => <option key={a.mat} value={a.nome}>{a.nome}</option>)}
                      </select>
                      <input 
                        type="time" 
                        value={apac.ini}
                        onChange={(e) => updateApac(i, 'ini', e.target.value)}
                        className="form-input py-1.5 px-2 text-xs"
                        placeholder="Início"
                      />
                      <input 
                        type="time" 
                        value={apac.fim}
                        onChange={(e) => updateApac(i, 'fim', e.target.value)}
                        className="form-input py-1.5 px-2 text-xs"
                        placeholder="Fim"
                      />
                      <input 
                        type="text" 
                        value={apac.detalhe}
                        onChange={(e) => updateApac(i, 'detalhe', e.target.value)}
                        className="form-input py-1.5 px-2 text-xs"
                        placeholder="Volume/Palete/Qtd"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">Descrição</label>
                <textarea 
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={4}
                  placeholder="Descreva a ocorrência com detalhes..."
                  className="form-input text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">Agente(s) envolvido(s)</label>
                  <input 
                    type="text" 
                    value={agente}
                    onChange={(e) => setAgente(e.target.value)}
                    placeholder="Nome(s)..."
                    className="form-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">Horário de término</label>
                  <input 
                    type="time" 
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className="form-input text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 px-5 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
          <button onClick={handleSave} className="btn btn-primary">Salvar ocorrência</button>
        </div>
      </div>
    </div>
  );
}
