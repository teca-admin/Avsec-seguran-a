-- =============================================================================
-- CORREÇÃO DE SEGURANÇA CRÍTICA — LOGIN SEGURO
-- Execute este script INTEIRO no SQL Editor do seu Supabase
-- Painel Supabase → SQL Editor → New Query → Cole tudo → Run
-- =============================================================================

-- PASSO 1: Criar a função que verifica a senha DENTRO do servidor
-- A função recebe canal + senha e retorna apenas true/false.
-- A senha NUNCA é enviada ao navegador.

CREATE OR REPLACE FUNCTION seguranca.verify_canal_password(p_canal text, p_senha text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = seguranca
AS $$
BEGIN
  IF p_canal IS NULL OR p_senha IS NULL OR length(p_senha) < 3 THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM seguranca.senhas_canais
    WHERE canal = p_canal
      AND senha = p_senha
  );
END;
$$;

-- PASSO 2: Dar permissão para usuários anônimos EXECUTAREM a função
-- (eles só podem chamar, não ler a tabela diretamente)
GRANT EXECUTE ON FUNCTION seguranca.verify_canal_password(text, text) TO anon, authenticated;

-- PASSO 3: Habilitar RLS na tabela de senhas (se ainda não estiver habilitado)
ALTER TABLE seguranca.senhas_canais ENABLE ROW LEVEL SECURITY;

-- PASSO 4: Bloquear completamente a leitura direta da tabela de senhas
-- Nenhum usuário (anon ou authenticated) pode fazer SELECT direto nesta tabela.
-- Apenas a função acima (SECURITY DEFINER) consegue acessá-la.
DROP POLICY IF EXISTS "senhas_canais_deny_public_read" ON seguranca.senhas_canais;
CREATE POLICY "senhas_canais_deny_public_read"
  ON seguranca.senhas_canais
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- =============================================================================
-- VERIFICAÇÃO: rode este SELECT para confirmar que a função foi criada
-- SELECT seguranca.verify_canal_password('supervisor', 'suasenha');
-- Deve retornar "true" se a senha estiver correta, "false" se não.
-- =============================================================================
