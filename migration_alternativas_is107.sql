-- ============================================================
-- MIGRAÇÃO: Alternativas IS107 por Canal
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- Tabela: alternativa ativa por canal em cada turno
CREATE TABLE IF NOT EXISTS seguranca.turno_alternativa (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  turno_id    uuid NOT NULL REFERENCES seguranca.turnos(id) ON DELETE CASCADE,
  canal       text NOT NULL,
  alternativa integer NOT NULL,
  definido_em timestamptz DEFAULT now() NOT NULL,
  UNIQUE (turno_id, canal)
);

-- Tabela: histórico de todas as mudanças de alternativa durante um turno
CREATE TABLE IF NOT EXISTS seguranca.alternativa_historico (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  turno_id             uuid NOT NULL REFERENCES seguranca.turnos(id) ON DELETE CASCADE,
  canal                text NOT NULL,
  alternativa_anterior integer,
  alternativa_nova     integer NOT NULL,
  alterado_em          timestamptz DEFAULT now() NOT NULL
);

-- Índices para buscas rápidas por turno
CREATE INDEX IF NOT EXISTS idx_turno_alternativa_turno_id   ON seguranca.turno_alternativa (turno_id);
CREATE INDEX IF NOT EXISTS idx_alternativa_historico_turno_id ON seguranca.alternativa_historico (turno_id);

-- Permissões (necessário para o cliente anônimo do Supabase acessar)
GRANT ALL ON seguranca.turno_alternativa    TO anon, authenticated;
GRANT ALL ON seguranca.alternativa_historico TO anon, authenticated;

-- RLS (Row Level Security) — libera leitura e escrita para anon/authenticated
ALTER TABLE seguranca.turno_alternativa    ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguranca.alternativa_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo para anon e authenticated" ON seguranca.turno_alternativa
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir tudo para anon e authenticated" ON seguranca.alternativa_historico
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
