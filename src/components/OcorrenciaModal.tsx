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
  initialTipo?: OcorrenciaTipo;
}

export default function OcorrenciaModal({ isOpen, onClose, onSave, canal, initialTipo }: OcorrenciaModalProps) {
  const [tipo, setTipo] = useState<OcorrenciaTipo>(initialTipo || 'avsec');
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5));
  const [desc, setDesc] = useState('');
  const [agente, setAgente] = useState('');
  const [searchAgente, setSearchAgente] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [imagem, setImagem] = useState<string | null>(null);
  
  // TECA specific
  const [tecaTipo, setTecaTipo] = useState('Exportação raio-x SMITHS');
  const [apacs, setApacs] = useState([{ agente: '', ini: '', fim: '', detalhe: '' }]);
  const [searchTerms, setSearchTerms] = useState<string[]>(['']);

  useEffect(() => {
    if (isOpen) {
      setHora(new Date().toTimeString().slice(0, 5));
      
      if (initialTipo) {
        setTipo(initialTipo);
      } else {
        // Set default type based on channel
        if (canal === 'fox') {
          setTipo('teca');
        } else {
          setTipo('passageiros');
        }
      }
    }
  }, [isOpen, canal, initialTipo]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagem(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
      imagem_url: imagem,
      ts: new Date().toISOString(),
      apacs: apacs.filter(a => a.agente).map(a => `${a.agente}${a.ini ? ' (' + a.ini + '-' + a.fim + ')' : ''}`)
    });
    
    // Reset
    setDesc('');
    setAgente('');
    setSearchAgente('');
    setImagem(null);
    setApacs([{ agente: '', ini: '', fim: '', detalhe: '' }]);
    setSearchTerms(['']);
    onClose();
  };

  const addApacRow = () => {
    let initialDetail = '';
    if (tecaTipo === 'Exportação raio-x SMITHS') initialDetail = 'Palete: ';
    if (tecaTipo === 'Internação raio-x') initialDetail = 'Volume: ';
    
    setApacs([...apacs, { agente: '', ini: '', fim: '', detalhe: initialDetail }]);
    setSearchTerms([...searchTerms, '']);
  };

  const updateApac = (index: number, field: string, value: string) => {
    const newApacs = [...apacs];
    (newApacs[index] as any)[field] = value;
    setApacs(newApacs);
  };

  const agentesCanal = [...(EFETIVO_BASE[canal]?.['6h'] || []), ...(EFETIVO_BASE[canal]?.['4h'] || [])];

  const getTiposDisponiveis = () => {
    if (canal === 'fox') {
      return [
        { value: 'teca', label: 'Escaneamento TECA / APAC' },
        { value: 'avsec', label: 'AVSEC (segurança)' }
      ];
    }
    if (canal === 'alfa' || canal === 'bravo') {
      return [
        { value: 'passageiros', label: 'Fluxo de passageiros' },
        { value: 'varredura', label: 'Varredura' },
        { value: 'avsec', label: 'AVSEC (segurança)' },
        { value: 'receita', label: 'Atendimento Receita / PF' }
      ];
    }
    return [
      { value: 'passageiros', label: 'Fluxo de passageiros' },
      { value: 'avsec', label: 'AVSEC (segurança)' },
      { value: 'receita', label: 'Atendimento Receita / PF' }
    ];
  };

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
                {getTiposDisponiveis().map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setTecaTipo(val);
                    // Update existing apacs details if they are empty or just have the prefix
                    setApacs(prev => prev.map(a => {
                      if (val === 'Exportação raio-x SMITHS') return { ...a, detalhe: 'Palete: ' };
                      if (val === 'Internação raio-x') return { ...a, detalhe: 'Volume: ' };
                      if (val === 'Varredura Tango 03') return { ...a, detalhe: '' };
                      return a;
                    }));
                  }}
                  className="form-input text-sm"
                >
                  <option value="Exportação raio-x SMITHS">Exportação raio-x SMITHS</option>
                  <option value="Internação raio-x">Internação raio-x</option>
                  <option value="Varredura Tango 03">Varredura Tango 03</option>
                </select>
              </div>

              {tecaTipo === 'Varredura Tango 03' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">Descrição da Varredura</label>
                    <textarea 
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      rows={3}
                      placeholder="Descreva a varredura..."
                      className="form-input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">Foto da Varredura</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                      className="form-input text-xs"
                    />
                    {imagem && (
                      <div className="mt-2 relative w-24 h-24 border border-border rounded overflow-hidden">
                        <img src={imagem} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setImagem(null)}
                          className="absolute top-0 right-0 bg-black/50 text-white p-0.5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-surface-2 border border-border-2 rounded p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono text-muted uppercase tracking-wider">Registros APAC</span>
                  <button onClick={addApacRow} className="btn btn-secondary py-1 px-2 text-[10px] uppercase tracking-wider">
                    + APAC
                  </button>
                </div>
                <div className="space-y-2">
                  {apacs.map((apac, i) => {
                    const filteredAgentes = agentesCanal.filter(a => 
                      a.nome.toLowerCase().includes((searchTerms[i] || '').toLowerCase()) ||
                      a.mat.toLowerCase().includes((searchTerms[i] || '').toLowerCase())
                    );

                    return (
                      <div key={i} className={cn(
                        "grid gap-2 items-center relative",
                        tecaTipo === 'Varredura Tango 03' ? "grid-cols-[1fr_80px_80px]" : "grid-cols-1 sm:grid-cols-[1fr_80px_80px_1fr]"
                      )}>
                        <div className="relative">
                          <input
                            type="text"
                            value={searchTerms[i] || apac.agente}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newTerms = [...searchTerms];
                              newTerms[i] = val;
                              setSearchTerms(newTerms);
                              if (!val) updateApac(i, 'agente', '');
                            }}
                            placeholder="Buscar agente..."
                            className="form-input py-1.5 px-2 text-xs"
                          />
                          {searchTerms[i] && !apac.agente && (
                            <div className="absolute z-[300] left-0 right-0 top-full mt-1 bg-surface border border-border rounded shadow-xl max-h-32 overflow-y-auto">
                              {filteredAgentes.length > 0 ? (
                                filteredAgentes.map(a => (
                                  <button
                                    key={a.mat}
                                    onClick={() => {
                                      updateApac(i, 'agente', a.nome);
                                      const newTerms = [...searchTerms];
                                      newTerms[i] = a.nome;
                                      setSearchTerms(newTerms);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent/10 transition-colors border-b border-border last:border-0"
                                  >
                                    {a.nome} ({a.mat})
                                  </button>
                                ))
                              ) : (
                                <div className="px-3 py-1.5 text-[10px] text-hint">Nenhum agente encontrado</div>
                              )}
                            </div>
                          )}
                        </div>
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
                        {tecaTipo !== 'Varredura Tango 03' && (
                          <input 
                            type="text" 
                            value={apac.detalhe}
                            onChange={(e) => updateApac(i, 'detalhe', e.target.value)}
                            className="form-input py-1.5 px-2 text-xs"
                            placeholder={tecaTipo === 'Internação raio-x' ? "Volume" : "Palete/Qtd"}
                          />
                        )}
                      </div>
                    );
                  })}
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

              {(tipo === 'passageiros' || tipo === 'varredura') && (
                <div>
                  <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">
                    {tipo === 'passageiros' ? 'Foto do Fluxo' : 'Foto da Varredura'}
                  </label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageChange}
                    className="form-input text-xs"
                  />
                  {imagem && (
                    <div className="mt-2 relative w-24 h-24 border border-border rounded overflow-hidden">
                      <img src={imagem} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setImagem(null)}
                        className="absolute top-0 right-0 bg-black/50 text-white p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">Agente(s) envolvido(s)</label>
                  <input 
                    type="text" 
                    value={searchAgente || agente}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchAgente(val);
                      if (!val) setAgente('');
                    }}
                    placeholder="Buscar agente..."
                    className="form-input text-sm"
                  />
                  {searchAgente && !agente && (
                    <div className="absolute z-[300] left-0 right-0 top-full mt-1 bg-surface border border-border rounded shadow-xl max-h-32 overflow-y-auto">
                      {agentesCanal
                        .filter(a => 
                          a.nome.toLowerCase().includes(searchAgente.toLowerCase()) ||
                          a.mat.toLowerCase().includes(searchAgente.toLowerCase())
                        )
                        .map(a => (
                          <button
                            key={a.mat}
                            onClick={() => {
                              setAgente(a.nome);
                              setSearchAgente(a.nome);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent/10 transition-colors border-b border-border last:border-0"
                          >
                            {a.nome} ({a.mat})
                          </button>
                        ))
                      }
                    </div>
                  )}
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
