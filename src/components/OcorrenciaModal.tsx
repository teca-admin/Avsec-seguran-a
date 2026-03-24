import React, { useState, useEffect } from 'react';
import { Canal } from '../constants';
import { OcorrenciaTipo } from '../types';
import { cn } from '../lib/utils';
import { X } from 'lucide-react';

interface OcorrenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  canal: Canal;
  allAgentes: any[];
  initialTipo?: OcorrenciaTipo;
  initialData?: any;
}

export default function OcorrenciaModal({ isOpen, onClose, onSave, canal, allAgentes, initialTipo, initialData }: OcorrenciaModalProps) {
  const [tipo, setTipo] = useState<OcorrenciaTipo>(initialTipo || 'avsec');
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5));
  const [horaFim, setHoraFim] = useState('');
  const [desc, setDesc] = useState('');
  const [agentesEnvolvidos, setAgentesEnvolvidos] = useState<string[]>([]);
  const [searchAgente, setSearchAgente] = useState('');
  const [imagem, setImagem] = useState<string | null>(null);

  // GPA/GDAF specific
  const [passageiroNome, setPassageiroNome] = useState('');
  const [passageiroCpf, setPassageiroCpf] = useState('');
  const [voo, setVoo] = useState('');
  
  // TECA specific
  const [tecaTipo, setTecaTipo] = useState('Exportação raio-x SMITHS');
  const [apacs, setApacs] = useState([{ agente: '', ini: '', fim: '', detalhe: '' }]);
  const [searchTerms, setSearchTerms] = useState<string[]>(['']);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTipo(initialData.tipo || 'avsec');
        setHora(initialData.hora || initialData.hora_inicio || new Date().toTimeString().slice(0, 5));
        setHoraFim(initialData.hora_fim || '');
        setDesc(initialData.desc || '');
        setAgentesEnvolvidos(initialData.agente ? initialData.agente.split(', ') : []);
        setImagem(initialData.imagem_url || null);
        setPassageiroNome(initialData.passageiro_nome || '');
        setPassageiroCpf(initialData.passageiro_cpf || '');
        setVoo(initialData.voo || '');
        
        if (initialData.tipo === 'teca') {
          // Try to parse tecaTipo from desc
          const lines = initialData.desc.split('\n');
          if (lines.length > 0) {
            setTecaTipo(lines[0]);
          }
          // Note: apacs parsing from string is complex, might need better data structure in DB
        }
      } else {
        setHora(new Date().toTimeString().slice(0, 5));
        setHoraFim('');
        setDesc('');
        setAgentesEnvolvidos([]);
        setImagem(null);
        setPassageiroNome('');
        setPassageiroCpf('');
        setVoo('');
        
        if (initialTipo) {
          setTipo(initialTipo);
        } else {
          if (canal === 'fox') {
            setTipo('teca');
          } else {
            setTipo('passageiros');
          }
        }
      }
    }
  }, [isOpen, canal, initialTipo, initialData]);

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
    let finalAgente = agentesEnvolvidos.join(', ');

    if (tipo === 'teca') {
      const apacTexts = apacs
        .filter(a => a.agente)
        .map(a => `APAC: ${a.agente}${a.ini ? ' das ' + a.ini : ''}${a.fim ? ' às ' + a.fim : ''} – ${a.detalhe || ''}`);
      finalDesc = `${tecaTipo}\n${apacTexts.join('\n')}`;
      
      const uniqueAgentes = Array.from(new Set(apacs.filter(a => a.agente).map(a => a.agente)));
      finalAgente = uniqueAgentes.join(', ');
    }

    if (!finalDesc.trim() && tipo !== 'teca') {
      alert('Preencha a descrição da ocorrência.');
      return;
    }

    onSave({
      tipo,
      hora: tipo === 'teca' ? '' : hora,
      hora_inicio: tipo === 'teca' ? '' : hora,
      hora_fim: tipo === 'teca' ? '' : horaFim,
      desc: finalDesc,
      agente: finalAgente,
      imagem_url: imagem,
      ts: new Date().toISOString(),
      apacs: apacs.filter(a => a.agente).map(a => `${a.agente}${a.ini ? ' (' + a.ini + '-' + a.fim + ')' : ''}`),
      passageiro_nome: passageiroNome,
      passageiro_cpf: passageiroCpf,
      voo: voo
    });
    
    // Reset
    setDesc('');
    setAgentesEnvolvidos([]);
    setSearchAgente('');
    setImagem(null);
    setApacs([{ agente: '', ini: '', fim: '', detalhe: '' }]);
    setSearchTerms(['']);
    setPassageiroNome('');
    setPassageiroCpf('');
    setVoo('');
    setHoraFim('');
    onClose();
  };

  const addApacRow = () => {
    let initialDetail = '';
    if (tecaTipo === 'Exportação raio-x SMITHS') initialDetail = 'Paletes: ';
    if (tecaTipo === 'Internação raio-x') initialDetail = 'Volumes: ';
    
    setApacs([...apacs, { agente: '', ini: '', fim: '', detalhe: initialDetail }]);
    setSearchTerms([...searchTerms, '']);
  };

  const updateApac = (index: number, field: string, value: string) => {
    const newApacs = [...apacs];
    (newApacs[index] as any)[field] = value;
    setApacs(newApacs);
  };

  const getTiposDisponiveis = () => {
    if (canal === 'fox') {
      return [
        { value: 'teca', label: 'Escaneamento TECA / APAC' },
        { value: 'varredura', label: 'Varredura Tango 03' },
        { value: 'avsec', label: 'AVSEC (segurança)' }
      ];
    }
    if (canal === 'alfa') {
      return [
        { value: 'passageiros', label: 'Fluxo de passageiros' },
        { value: 'varredura', label: 'Varredura Canal Alfa' },
        { value: 'avsec', label: 'AVSEC (segurança)' },
        { value: 'receita', label: 'Atendimento Receita / PF' }
      ];
    }
    if (canal === 'bravo') {
      return [
        { value: 'passageiros', label: 'Fluxo de passageiros' },
        { value: 'avsec', label: 'AVSEC (segurança)' },
        { value: 'receita', label: 'Atendimento Receita / PF' },
        { value: 'gpa', label: 'GPA (Passageiro Armado)' }
      ];
    }
    if (canal === 'charlie') {
      return [
        { value: 'passageiros', label: 'Fluxo de passageiros' },
        { value: 'avsec', label: 'AVSEC (segurança)' },
        { value: 'receita', label: 'Atendimento Receita / PF' },
        { value: 'gpa', label: 'GPA (Passageiro Armado)' },
        { value: 'gdaf', label: 'GDAF (Despacho de Arma)' }
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
          <div className={cn("grid gap-3", tipo === 'teca' ? "grid-cols-1" : "grid-cols-2")}>
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
            {tipo !== 'teca' && (
              <>
                <div>
                  <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">Horário Início</label>
                  <input 
                    type="time" 
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="form-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">Horário Fim</label>
                  <input 
                    type="time" 
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className="form-input text-sm"
                  />
                </div>
              </>
            )}
          </div>

          {(tipo === 'gpa' || tipo === 'gdaf') && (
            <div className="space-y-3 p-3 bg-surface-2 border border-border rounded">
              <div className="text-[10px] font-mono text-muted uppercase tracking-wider mb-1">Dados do Passageiro</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-muted uppercase mb-1">Nome do Passageiro</label>
                  <input 
                    type="text"
                    value={passageiroNome}
                    onChange={(e) => setPassageiroNome(e.target.value)}
                    className="form-input text-sm"
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted uppercase mb-1">CPF</label>
                  <input 
                    type="text"
                    value={passageiroCpf}
                    onChange={(e) => setPassageiroCpf(e.target.value)}
                    className="form-input text-sm"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted uppercase mb-1">Voo</label>
                  <input 
                    type="text"
                    value={voo}
                    onChange={(e) => setVoo(e.target.value)}
                    className="form-input text-sm"
                    placeholder="Ex: AD1234"
                  />
                </div>
              </div>
            </div>
          )}

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
                      if (val === 'Exportação raio-x SMITHS') return { ...a, detalhe: 'Paletes: ' };
                      if (val === 'Internação raio-x') return { ...a, detalhe: 'Volumes: ' };
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
                    const term = (searchTerms[i] || '').toLowerCase();
                    const filteredAgentes = allAgentes
                      .filter(a => 
                        a.nome.toLowerCase().includes(term) ||
                        a.matricula.toLowerCase().includes(term)
                      )
                      .sort((a, b) => a.nome.localeCompare(b.nome));

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
                                    key={a.matricula}
                                    onClick={() => {
                                      updateApac(i, 'agente', a.nome);
                                      const newTerms = [...searchTerms];
                                      newTerms[i] = a.nome;
                                      setSearchTerms(newTerms);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent/10 transition-colors border-b border-border last:border-0"
                                  >
                                    {a.nome} ({a.matricula})
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
                          <div className="relative flex items-center">
                            <span className="absolute left-2 text-[9px] font-bold text-muted uppercase pointer-events-none bg-surface-3 px-1 rounded border border-border-2">
                              {tecaTipo === 'Internação raio-x' ? "Vol" : "Pal"}
                            </span>
                            <input 
                              type="text" 
                              value={apac.detalhe.replace(/^(Paletes: |Volumes: |Palete: |Volume: )/, '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                const prefix = tecaTipo === 'Internação raio-x' ? "Volumes: " : "Paletes: ";
                                updateApac(i, 'detalhe', prefix + val);
                              }}
                              className="form-input py-1.5 pl-10 pr-2 text-xs"
                              placeholder="Qtd"
                            />
                          </div>
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
                    {tipo === 'passageiros' ? 'Foto do Fluxo' : 
                     tipo === 'varredura' ? 'Foto da Varredura' : 
                     'Foto da Ocorrência'}
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

              <div className="space-y-3">
                <div className="relative">
                  <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">Agente(s) envolvido(s)</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {agentesEnvolvidos.map((a, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-mono rounded border border-accent/20">
                        {a}
                        <button 
                          onClick={() => setAgentesEnvolvidos(prev => prev.filter((_, i) => i !== idx))}
                          className="hover:text-red-500"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input 
                    type="text" 
                    value={searchAgente}
                    onChange={(e) => setSearchAgente(e.target.value)}
                    placeholder="Adicionar agente..."
                    className="form-input text-sm"
                  />
                  {searchAgente && (
                    <div className="absolute z-[300] left-0 right-0 top-full mt-1 bg-surface border border-border rounded shadow-xl max-h-32 overflow-y-auto">
                      {allAgentes
                        .filter(a => {
                          const term = searchAgente.toLowerCase();
                          const nome = a.nome.toLowerCase();
                          const mat = a.matricula.toLowerCase();
                          return (nome.includes(term) || mat.includes(term)) && !agentesEnvolvidos.includes(a.nome);
                        })
                        .sort((a, b) => a.nome.localeCompare(b.nome))
                        .map(a => (
                          <button
                            key={a.matricula}
                            onClick={() => {
                              setAgentesEnvolvidos(prev => [...prev, a.nome]);
                              setSearchAgente('');
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent/10 transition-colors border-b border-border last:border-0"
                          >
                            {a.nome} ({a.matricula})
                          </button>
                        ))
                      }
                    </div>
                  )}
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
