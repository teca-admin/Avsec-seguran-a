import React, { useState } from 'react';
import { Canal, CANAL_CONFIG } from '../constants';

interface LoginProps {
  onLogin: (user: Canal) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [user, setUser] = useState<Canal | ''>('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const CREDENTIALS: Record<string, string> = {
    alfa: 'alfa123',
    bravo: 'bravo123',
    charlie: 'charlie123',
    fox: 'fox123',
    supervisor: 'super123',
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Selecione um canal.');
      return;
    }
    if (CREDENTIALS[user] !== pass) {
      setError('Senha incorreta.');
      return;
    }
    onLogin(user as Canal);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_50%_0%,rgba(240,165,0,0.06)_0%,transparent_60%)]">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 text-center">
          <div className="font-mono text-[13px] text-accent tracking-[0.12em] uppercase mb-1">WFS · AVSEC</div>
          <h1 className="text-xl font-medium text-text tracking-tight">Passagem de Serviço</h1>
          <p className="text-xs text-muted mt-0.5">Aeroporto Internacional de Manaus "Eduardo Gomes"</p>
        </div>

        <div className="card shadow-2xl shadow-black/40">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">Usuário (canal)</label>
              <select 
                value={user} 
                onChange={(e) => setUser(e.target.value as Canal)}
                className="form-input"
              >
                <option value="">Selecione o canal...</option>
                <option value="alfa">CANAL ALFA – Internacional</option>
                <option value="bravo">CANAL BRAVO – Doméstico TPS</option>
                <option value="charlie">CANAL CHARLIE – Funcionários/Tripulantes TPS</option>
                <option value="fox">CANAL FOX – TECA</option>
                <option value="supervisor">SUPERVISOR AVSEC</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-muted font-mono uppercase tracking-wider mb-1.5">Senha</label>
              <input 
                type="password" 
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••"
                className="form-input"
              />
            </div>

            {error && (
              <div className="p-2.5 bg-red-500/15 border border-red-500/30 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full justify-center mt-2">
              Entrar
            </button>
          </form>
        </div>

        <div className="mt-5 p-4 bg-surface-2 rounded border border-border-2">
          <p className="text-[12px] text-muted font-mono mb-2">// credenciais de demonstração</p>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="text-[11px] text-hint font-mono"><b className="text-muted">alfa</b> → alfa123</div>
            <div className="text-[11px] text-hint font-mono"><b className="text-muted">bravo</b> → bravo123</div>
            <div className="text-[11px] text-hint font-mono"><b className="text-muted">charlie</b> → charlie123</div>
            <div className="text-[11px] text-hint font-mono"><b className="text-muted">fox</b> → fox123</div>
            <div className="text-[11px] text-hint font-mono col-span-2"><b className="text-muted">supervisor</b> → super123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
