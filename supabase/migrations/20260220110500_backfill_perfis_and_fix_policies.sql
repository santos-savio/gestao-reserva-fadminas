-- Backfill de perfis para usuários já existentes (ex.: criados antes do trigger handle_new_user)
INSERT INTO public.perfis (id, nome, tipo_usuario, telefone)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'nome', 'Usuário'),
  COALESCE(u.raw_user_meta_data->>'tipo_usuario', 'usuario'),
  u.raw_user_meta_data->>'telefone'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.perfis p
  WHERE p.id = u.id
);

-- Evitar escalonamento de privilégio: usuário comum só pode criar o próprio perfil como "usuario"
DROP POLICY IF EXISTS "usuários podem criar seu próprio perfil" ON public.perfis;
CREATE POLICY "usuários podem criar seu próprio perfil" ON public.perfis
FOR INSERT
WITH CHECK (id = auth.uid() AND tipo_usuario = 'usuario');
