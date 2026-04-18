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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F2F2F2] relative">

      {/* Logo WFS canto superior esquerdo */}
      <div className="absolute top-6 left-6">
        <img
          src="https://lh3.googleusercontent.com/d/1sNzDKhdh2zH8d8DoyqIjx8l5LzBEXN5g"
          alt="WFS Logo"
          className="h-[70px] w-auto object-contain"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Card único com título + formulário */}
      <div className="w-full max-w-[400px] bg-white border border-gray-200 rounded-lg shadow-sm p-8">

        {/* Título dentro do card */}
        <div className="text-center mb-7">
          <h1 className="text-[44px] font-bold tracking-widest text-gray-900 leading-none">
            L.E.O
          </h1>
          <div className="w-48 h-px bg-gray-900 mt-1.5 mb-3 mx-auto" />
          <p className="text-[12px] text-gray-500 tracking-[0.2em]">
            Livro Eletrônico de Ocorrência
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] text-gray-500 font-semibold uppercase tracking-widest mb-2">
              Usuário (Canal)
            </label>
            <select
              value={user}
              onChange={(e) => setUser(e.target.value as Canal)}
              className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-gray-900 transition-colors"
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
            <label className="block text-[10px] text-gray-500 font-semibold uppercase tracking-widest mb-2">
              Senha
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••"
              maxLength={64}
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold tracking-widest uppercase py-3 rounded transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Entrar'}
          </button>
        </form>
      </div>

    </div>
  );
}
