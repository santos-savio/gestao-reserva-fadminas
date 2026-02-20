-- Corrigir RLS/policies da tabela public.perfis (sem recursão)
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas (se existirem)
DROP POLICY IF EXISTS "ler perfil próprio" ON public.perfis;
DROP POLICY IF EXISTS "inserir perfil próprio" ON public.perfis;
DROP POLICY IF EXISTS "usuários podem ver seu próprio perfil" ON public.perfis;
DROP POLICY IF EXISTS "super_admin pode ver todos os perfis" ON public.perfis;
DROP POLICY IF EXISTS "usuários podem criar seu próprio perfil" ON public.perfis;
DROP POLICY IF EXISTS "super_admin pode criar novos usuários" ON public.perfis;
DROP POLICY IF EXISTS "super_admin pode atualizar perfis" ON public.perfis;

-- SELECT: usuário pode ler o próprio perfil
CREATE POLICY "usuários podem ver seu próprio perfil" ON public.perfis
FOR SELECT
USING (id = auth.uid());

-- SELECT: super_admin pode ver todos (usa JWT para evitar recursão)
CREATE POLICY "super_admin pode ver todos os perfis" ON public.perfis
FOR SELECT
USING (
  (auth.jwt() -> 'user_metadata' ->> 'tipo_usuario') = 'super_admin'
);

-- INSERT: usuário comum só pode criar o próprio perfil como 'usuario' (evita escalonamento)
CREATE POLICY "usuários podem criar seu próprio perfil" ON public.perfis
FOR INSERT
WITH CHECK (id = auth.uid() AND tipo_usuario = 'usuario');

-- INSERT: super_admin pode criar perfis (para gerenciar usuários)
CREATE POLICY "super_admin pode criar novos usuários" ON public.perfis
FOR INSERT
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'tipo_usuario') = 'super_admin'
);

-- UPDATE: super_admin pode atualizar perfis
CREATE POLICY "super_admin pode atualizar perfis" ON public.perfis
FOR UPDATE
USING (
  (auth.jwt() -> 'user_metadata' ->> 'tipo_usuario') = 'super_admin'
);
