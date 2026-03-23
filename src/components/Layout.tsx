import React, { useState } from 'react';
import { Canal, TURNOS, CANAL_CONFIG } from '../constants';
import { cn } from '../lib/utils';
import { LogOut, Clock } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: Canal | null;
  onLogout: () => void;
  turno: string;
}

export default function Layout({ children, user, onLogout, turno }: LayoutProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return <>{children}</>;

  const config = CANAL_CONFIG[user];
  const turnoInfo = TURNOS[turno];
  const generatedLogo = localStorage.getItem('avsec_logo');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-[52px] bg-surface border-b border-border px-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg border border-border overflow-hidden shadow-sm">
            <img 
              src={generatedLogo || "/logo.png"} 
              alt="Logo" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/airport-security-3d/100/100';
              }}
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] text-accent tracking-widest font-bold">AVSEC</span>
            <span className="text-border text-lg leading-none">·</span>
            <span className="text-[13px] font-medium text-text">{config.name}</span>
            <span className={cn("text-[10px] font-mono font-medium px-2 py-0.5 rounded uppercase tracking-wider", config.badge)}>
              {config.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted font-mono text-xs">
            <Clock size={14} />
            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <button onClick={onLogout} className="btn btn-ghost py-1 px-3 text-xs flex items-center gap-1.5">
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5 md:p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>

      <footer className="h-8 bg-surface-2 border-t border-border-2 px-5 flex items-center gap-4 text-[11px] text-hint font-mono shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
          Online
        </div>
        <span>Turno {turno} · {turnoInfo.inicio}–{turnoInfo.fim}</span>
      </footer>
    </div>
  );
}
