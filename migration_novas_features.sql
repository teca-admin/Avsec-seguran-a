-- ============================================================
-- MIGRATION: Jornada Intermediária + Responsável por Canal
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela para responsável por canal no turno
CREATE TABLE IF NOT EXISTS seguranca.canal_responsavel (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  turno_id uuid NOT NULL REFERENCES seguranca.turnos(id) ON DELETE CASCADE,
  canal text NOT NULL,
  agente_id text NOT NULL,
  registrado_em timestamptz DEFAULT now()
);

-- 2. Constraint única: apenas 1 responsável por canal por turno
CREATE UNIQUE INDEX IF NOT EXISTS canal_responsavel_turno_canal_idx
  ON seguranca.canal_responsavel(turno_id, canal);

-- 3. Permissões
GRANT ALL ON seguranca.canal_responsavel TO anon, authenticated;

-- ============================================================
-- NOTAS:
-- • O campo "jornada" em efetivo_turno já é TEXT – sem mudança
-- • Jornada "intermediário" = agente cobre 2 turnos consecutivos
-- • A constraint única garante 1 responsável por canal/turno
-- ============================================================
