/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Login from './components/Login';
import Layout from './components/Layout';
import Posto from './components/Posto';
import Supervisor from './components/Supervisor';
import { Canal } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || (process.env as any).VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || (process.env as any).VITE_SUPABASE_ANON_KEY;
const hasValidConfig = Boolean(SUPABASE_URL) && Boolean(SUPABASE_KEY);

export default function App() {
  const [user, setUser] = useState<Canal | null>(null);
  const [turno, setTurno] = useState('A');

  if (!hasValidConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface-1">
        <div className="w-full max-w-[520px] text-center">
          <div className="card p-8 border-accent/20">
            <h2 className="text-xl font-medium text-text mb-4">Configuração Necessária</h2>
            <p className="text-sm text-muted mb-6">
              Para o funcionamento do sistema, é necessário configurar as chaves do Supabase.
            </p>
            
            <div className="text-left space-y-4 mb-8">
              <div className="p-4 bg-surface-2 rounded border border-border-2">
                <p className="text-xs font-mono text-accent uppercase tracking-wider mb-2">Passo 1</p>
                <p className="text-sm text-text">Acesse seu projeto no Supabase e vá em <b>Project Settings &gt; API</b>.</p>
              </div>
              
              <div className="p-4 bg-surface-2 rounded border border-border-2">
                <p className="text-xs font-mono text-accent uppercase tracking-wider mb-2">Passo 2</p>
                <p className="text-sm text-text">Adicione as seguintes chaves nos <b>Secrets</b> do AI Studio:</p>
                <ul className="mt-2 space-y-1.5 text-[13px] text-muted list-disc list-inside">
                  <li><code>VITE_SUPABASE_URL</code></li>
                  <li><code>VITE_SUPABASE_ANON_KEY</code></li>
                  <li><code>VITE_N8N_WEBHOOK_URL</code> (Opcional)</li>
                </ul>
              </div>
            </div>

            <p className="text-xs text-hint italic">
              O aplicativo será reiniciado automaticamente após a adição dos segredos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleLogin = (canal: Canal) => {
    setUser(canal);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout user={user} onLogout={handleLogout} turno={turno}>
      {user === 'supervisor' ? (
        <Supervisor turno={turno} onTurnoChange={setTurno} />
      ) : (
        <Posto 
          canal={user} 
          turno={turno} 
          onTurnoChange={setTurno} 
        />
      )}
    </Layout>
  );
}
