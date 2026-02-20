-- Corrigir recursão infinita nas policies de perfis
-- A recursão acontece quando uma policy referencia a própria tabela protegida
-- Vamos usar auth.uid() diretamente em vez de consultar public.perfis dentro da policy

-- 1) Remover todas as policies antigas que causam recursão
DROP POLICY IF EXISTS "usuários podem ver seu próprio perfil" ON public.perfis;
DROP POLICY IF EXISTS "super_admin pode ver todos os perfis" ON public.perfis;
DROP POLICY IF EXISTS "super_admin pode criar novos perfis" ON public.perfis;
DROP POLICY IF EXISTS "super_admin pode atualizar perfis" ON public.perfis;
DROP POLICY IF EXISTS "admin_equipamento pode ver todos os perfis" ON public.perfis;
DROP POLICY IF EXISTS "usuários podem atualizar seu próprio perfil" ON public.perfis;
DROP POLICY IF EXISTS "usuários podem criar seu próprio perfil" ON public.perfis;

-- 2) Criar policies sem recursão, usando auth.uid() e user_metadata direto do auth.users

-- Policy para usuários verem seu próprio perfil
CREATE POLICY "usuários podem ver seu próprio perfil" ON public.perfis
FOR SELECT USING (id = auth.uid());

-- Policy para super_admin ver todos os perfis
-- Usamos user_metadata do auth.users para evitar consultar a própria tabela
CREATE POLICY "super_admin pode ver todos os perfis" ON public.perfis
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'authenticated' 
  AND auth.jwt() -> 'user_metadata' ->> 'tipo_usuario' = 'super_admin'
);

-- Policy para admin_equipamento ver todos os perfis
CREATE POLICY "admin_equipamento pode ver todos os perfis" ON public.perfis
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'authenticated' 
  AND auth.jwt() -> 'user_metadata' ->> 'tipo_usuario' = 'admin_equipamento'
);

-- Policy para usuários atualizarem seu próprio perfil
CREATE POLICY "usuários podem atualizar seu próprio perfil" ON public.perfis
FOR UPDATE USING (id = auth.uid());

-- Policy para super_admin atualizar qualquer perfil
CREATE POLICY "super_admin pode atualizar perfis" ON public.perfis
FOR UPDATE USING (
  auth.jwt() ->> 'role' = 'authenticated' 
  AND auth.jwt() -> 'user_metadata' ->> 'tipo_usuario' = 'super_admin'
);

-- Policy para super_admin criar perfis (não necessário para signup, mas mantido para admin)
CREATE POLICY "super_admin pode criar perfis" ON public.perfis
FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' = 'authenticated' 
  AND auth.jwt() -> 'user_metadata' ->> 'tipo_usuario' = 'super_admin'
);

-- 3) Garantir que RLS está habilitado
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- 4) Opcional: criar uma função auxiliar para buscar tipo_usuario do auth.users sem recursão
-- Esta função consulta auth.users diretamente, não public.perfis
CREATE OR REPLACE FUNCTION public.get_user_tipo_usuario()
RETURNS text AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'tipo_usuario',
    'usuario'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Exemplo de como usar a função em policies (alternativa)
-- Podemos usar essa função em vez de auth.jwt() direto se preferir
-- CREATE POLICY "exemplo usando função" ON public.perfis
-- FOR SELECT USING (public.get_user_tipo_usuario() = 'super_admin');
