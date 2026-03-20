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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_50%_0%,rgba(238,47,36,0.06)_0%,transparent_60%)]">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 text-center">
          <div className="font-mono text-[20px] text-accent tracking-[0.12em] uppercase mb-1 font-bold">WFS · AVSEC</div>
        </div>

        <div className="card shadow-2xl shadow-black/10">
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

            <button type="submit" className="btn btn-primary w-full justify-center mt-2 border border-[#f6f6f6]">
              Entrar
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
