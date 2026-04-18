-- =============================================================================
-- POLÍTICAS DE SEGURANÇA (RLS) - SISTEMA AVSEC
-- Execute este script no SQL Editor do seu Supabase
-- =============================================================================
-- PASSO 1: Garantir acesso ao schema
-- =============================================================================

GRANT USAGE ON SCHEMA seguranca TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA seguranca TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA seguranca TO anon, authenticated;

-- =============================================================================
-- PASSO 2: Habilitar RLS em todas as tabelas
-- =============================================================================

ALTER TABLE seguranca.turnos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguranca.ocorrencias     ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguranca.efetivo_turno   ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguranca.agentes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguranca.equipamentos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguranca.fluxo_passageiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguranca.voos_internacionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguranca.senhas_canais   ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PASSO 3: Políticas para a tabela senhas_canais
-- CRÍTICO: Esta tabela NÃO deve ser lida diretamente pelo navegador.
-- A senha deve ser verificada por uma Edge Function (ver comentário abaixo).
-- Por ora, bloqueamos leitura direta e permitimos apenas via service_role.
-- =============================================================================

-- Bloqueio total de leitura pública da tabela de senhas
DROP POLICY IF EXISTS "senhas_canais_deny_public_read" ON seguranca.senhas_canais;
CREATE POLICY "senhas_canais_deny_public_read"
  ON seguranca.senhas_canais
  FOR SELECT
  TO anon, authenticated
  USING (false);

-- ATENÇÃO: Ao ativar a política acima, o login atual vai parar de funcionar.
-- Você precisará criar uma Edge Function no Supabase para verificar a senha.
-- Veja as instruções no final deste arquivo.

-- =============================================================================
-- PASSO 4: Políticas para turnos
-- =============================================================================

DROP POLICY IF EXISTS "turnos_read_all" ON seguranca.turnos;
CREATE POLICY "turnos_read_all"
  ON seguranca.turnos
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "turnos_insert_authenticated" ON seguranca.turnos;
CREATE POLICY "turnos_insert_authenticated"
  ON seguranca.turnos
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "turnos_update_authenticated" ON seguranca.turnos;
CREATE POLICY "turnos_update_authenticated"
  ON seguranca.turnos
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- PASSO 5: Políticas para ocorrencias
-- =============================================================================

DROP POLICY IF EXISTS "ocorrencias_read_all" ON seguranca.ocorrencias;
CREATE POLICY "ocorrencias_read_all"
  ON seguranca.ocorrencias
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "ocorrencias_insert" ON seguranca.ocorrencias;
CREATE POLICY "ocorrencias_insert"
  ON seguranca.ocorrencias
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "ocorrencias_update" ON seguranca.ocorrencias;
CREATE POLICY "ocorrencias_update"
  ON seguranca.ocorrencias
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- PASSO 6: Políticas para efetivo_turno
-- =============================================================================

DROP POLICY IF EXISTS "efetivo_turno_read" ON seguranca.efetivo_turno;
CREATE POLICY "efetivo_turno_read"
  ON seguranca.efetivo_turno
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "efetivo_turno_upsert" ON seguranca.efetivo_turno;
CREATE POLICY "efetivo_turno_upsert"
  ON seguranca.efetivo_turno
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "efetivo_turno_update" ON seguranca.efetivo_turno;
CREATE POLICY "efetivo_turno_update"
  ON seguranca.efetivo_turno
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- PASSO 7: Políticas para agentes
-- =============================================================================

DROP POLICY IF EXISTS "agentes_read_all" ON seguranca.agentes;
CREATE POLICY "agentes_read_all"
  ON seguranca.agentes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Somente service_role pode inserir/alterar agentes
DROP POLICY IF EXISTS "agentes_no_public_write" ON seguranca.agentes;
CREATE POLICY "agentes_no_public_write"
  ON seguranca.agentes
  FOR INSERT
  TO anon
  WITH CHECK (false);

-- =============================================================================
-- PASSO 8: Políticas para equipamentos
-- =============================================================================

DROP POLICY IF EXISTS "equipamentos_read" ON seguranca.equipamentos;
CREATE POLICY "equipamentos_read"
  ON seguranca.equipamentos
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "equipamentos_insert" ON seguranca.equipamentos;
CREATE POLICY "equipamentos_insert"
  ON seguranca.equipamentos
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "equipamentos_update" ON seguranca.equipamentos;
CREATE POLICY "equipamentos_update"
  ON seguranca.equipamentos
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- PASSO 9: Políticas para fluxo_passageiros
-- =============================================================================

DROP POLICY IF EXISTS "fluxo_passageiros_read" ON seguranca.fluxo_passageiros;
CREATE POLICY "fluxo_passageiros_read"
  ON seguranca.fluxo_passageiros
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "fluxo_passageiros_upsert" ON seguranca.fluxo_passageiros;
CREATE POLICY "fluxo_passageiros_upsert"
  ON seguranca.fluxo_passageiros
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "fluxo_passageiros_update" ON seguranca.fluxo_passageiros;
CREATE POLICY "fluxo_passageiros_update"
  ON seguranca.fluxo_passageiros
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- PASSO 10: Políticas para voos_internacionais
-- =============================================================================

DROP POLICY IF EXISTS "voos_internacionais_read" ON seguranca.voos_internacionais;
CREATE POLICY "voos_internacionais_read"
  ON seguranca.voos_internacionais
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "voos_internacionais_insert" ON seguranca.voos_internacionais;
CREATE POLICY "voos_internacionais_insert"
  ON seguranca.voos_internacionais
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "voos_internacionais_update" ON seguranca.voos_internacionais;
CREATE POLICY "voos_internacionais_update"
  ON seguranca.voos_internacionais
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- INSTRUÇÕES PARA PROTEGER AS SENHAS (PRÓXIMO PASSO IMPORTANTE)
-- =============================================================================
--
-- O sistema atual verifica senhas no navegador do usuário.
-- Para máxima segurança, crie uma Edge Function no Supabase:
--
-- 1. No painel do Supabase, vá em "Edge Functions" > "New Function"
-- 2. Nomeie como "verify-canal-password"
-- 3. Use este código (Deno/TypeScript):
--
--   import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
--   import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
--
--   serve(async (req) => {
--     const { canal, senha } = await req.json()
--     if (!canal || !senha) {
--       return new Response(JSON.stringify({ ok: false }), { status: 400 })
--     }
--     const supabase = createClient(
--       Deno.env.get("SUPABASE_URL")!,
--       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
--     )
--     const { data } = await supabase
--       .schema("seguranca")
--       .from("senhas_canais")
--       .select("senha")
--       .eq("canal", canal)
--       .single()
--     const ok = data?.senha === senha
--     return new Response(JSON.stringify({ ok }), {
--       headers: { "Content-Type": "application/json" }
--     })
--   })
--
-- 4. Depois, no Login.tsx, troque a chamada ao banco pela Edge Function:
--    const res = await supabase.functions.invoke('verify-canal-password', {
--      body: { canal: user, senha: pass }
--    })
--    if (res.data?.ok) onLogin(user as Canal)
--    else setError('Credenciais inválidas.')
--
-- Isso garante que as senhas NUNCA apareçam no navegador.
-- =============================================================================
