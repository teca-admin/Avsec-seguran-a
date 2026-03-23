import React, { useState } from 'react';
import { Canal, CANAL_CONFIG } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { Sparkles } from 'lucide-react';

interface LoginProps {
  onLogin: (user: Canal) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [user, setUser] = useState<Canal | ''>('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [generatedLogo, setGeneratedLogo] = useState<string | null>(localStorage.getItem('avsec_logo'));
  const [isGenerating, setIsGenerating] = useState(false);

  const CREDENTIALS: Record<string, string> = {
    alfa: 'alfa123',
    bravo: 'bravo123',
    charlie: 'charlie123',
    fox: 'fox123',
    supervisor: 'super123',
  };

  const generateLogo = async () => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `A professional 3D app icon for an aviation security (AVSEC) management system, representing an 'Inspection Channel' (Canal de Inspeção). 
      Style: Modern iOS-style icon with rounded corners and a sleek silver metallic frame on a black background. 
      Composition: 
      - Background left: A baggage X-ray machine with a neon blue screen showing silhouettes of prohibited items (handgun, knife). 
      - Center: A security officer (APAC) in a light blue uniform with a gold badge and officer cap. 
      - Background right: A walk-through metal detector gate with a passenger silhouette passing through and a yellow spark effect. 
      - Foreground: A magnifying glass (manual inspection) and a security ID badge with a green checkmark. 
      Colors: Royal blue, gold, metallic silver, emerald green, and black. 
      Mood: Professional, high-tech, 3D cartoon/vector illustration style with bold shapes.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Data = `data:image/png;base64,${part.inlineData.data}`;
          setGeneratedLogo(base64Data);
          localStorage.setItem('avsec_logo', base64Data);
          break;
        }
      }
    } catch (error) {
      console.error("Erro ao gerar logo:", error);
    } finally {
      setIsGenerating(false);
    }
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
          <div className="flex justify-center mb-5 relative group">
            <div className="w-36 h-36 bg-black rounded-[22%] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-[4px] border-[#E5E7EB] overflow-hidden relative transition-transform hover:scale-105 duration-500">
              {/* Moldura interna metálica */}
              <div className="absolute inset-0 border-[1px] border-white/20 rounded-[20%] pointer-events-none z-10"></div>
              
              <img 
                src={generatedLogo || "/logo.png"} 
                alt="AVSEC Security Logo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/airport-security-3d/400/400';
                }}
                referrerPolicy="no-referrer"
              />
              
              {/* Brilho reflexivo estilo iOS */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none"></div>

              {isGenerating && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <button 
              onClick={generateLogo}
              disabled={isGenerating}
              className="absolute -right-4 -bottom-2 bg-accent text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform z-30 flex items-center justify-center"
              title="Gerar Logo Ideal (IA)"
            >
              <Sparkles size={16} className={isGenerating ? "animate-pulse" : ""} />
            </button>
          </div>
          <div className="font-mono text-[22px] text-accent tracking-[0.15em] uppercase mb-1 font-black">WFS · AVSEC</div>
          <div className="text-[10px] text-muted font-mono uppercase tracking-[0.2em] opacity-60">Security Management System</div>
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
