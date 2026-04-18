import React, { useState, useRef } from 'react';
import { Canal } from '../constants';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

interface LoginProps {
  onLogin: (user: Canal) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [user, setUser] = useState<Canal | ''>('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const attemptsRef = useRef(0);
  const lockoutUntilRef = useRef(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('Selecione um canal.');
      return;
    }

    const now = Date.now();
    if (now < lockoutUntilRef.current) {
      const remaining = Math.ceil((lockoutUntilRef.current - now) / 1000 / 60);
      setError(`Muitas tentativas. Aguarde ${remaining} minuto(s) e tente novamente.`);
      return;
    }

    if (!pass || pass.length < 3 || pass.length > 64) {
      setError('Senha inválida.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: dbError } = await supabase
        .schema('seguranca')
        .from('senhas_canais')
        .select('senha')
        .eq('canal', user)
        .single();

      if (dbError || !data) {
        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          lockoutUntilRef.current = Date.now() + LOCKOUT_DURATION_MS;
          attemptsRef.current = 0;
          setError('Muitas tentativas incorretas. Acesso bloqueado por 5 minutos.');
        } else {
          setError('Credenciais inválidas.');
        }
        setPass('');
        return;
      }

      if (data.senha !== pass) {
        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          lockoutUntilRef.current = Date.now() + LOCKOUT_DURATION_MS;
          attemptsRef.current = 0;
          setError('Muitas tentativas incorretas. Acesso bloqueado por 5 minutos.');
        } else {
          setError('Credenciais inválidas.');
        }
        setPass('');
        return;
      }

      attemptsRef.current = 0;
      onLogin(user as Canal);
    } catch {
      setError('Erro ao conectar. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F9FAFB] relative">
      <div className="absolute top-6 left-6">
        <img 
          src="https://lh3.googleusercontent.com/d/1sNzDKhdh2zH8d8DoyqIjx8l5LzBEXN5g" 
          alt="WFS Logo" 
          className="h-28 w-auto object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="w-full max-w-[380px]">
        <div className="mb-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              {/* Background stylized aviation paths */}
              <svg viewBox="0 0 100 100" className="absolute -inset-10 w-40 h-40 text-accent/10 fill-none stroke-current stroke-[0.5] pointer-events-none">
                <path d="M20,50 Q50,20 80,50" />
                <path d="M20,60 Q50,30 80,60" />
                <circle cx="50" cy="50" r="40" strokeDasharray="2 4" />
              </svg>
              
              <div className="relative w-20 h-20 bg-accent rounded-2xl flex items-center justify-center shadow-2xl shadow-accent/30">
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-white fill-current">
                  {/* Elegant Shield */}
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                  {/* Airplane Silhouette (Negative Space) */}
                  <path 
                    d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l8 2.5z" 
                    className="text-accent fill-current"
                    transform="scale(0.55) translate(10, 10)"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="font-mono text-[22px] text-accent tracking-[0.15em] uppercase mb-1 font-bold">WFS · AVSEC</div>
          <div className="text-[10px] text-hint font-mono uppercase tracking-[0.3em] opacity-70">Sistema de Gerenciamento de Segurança</div>
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
                maxLength={64}
                autoComplete="current-password"
                className="form-input"
              />
            </div>

            {error && (
              <div className="p-2.5 bg-red-500/15 border border-red-500/30 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary w-full justify-center mt-2 border border-[#f6f6f6] gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Entrar'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
