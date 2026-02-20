-- Fix RLS for public.perfis without recursion
-- Goal:
--  - default users: can SELECT/UPDATE only their own perfil
--  - only super_admin: can SELECT all perfis and UPDATE any perfil
-- Also:
--  - backfill missing perfis from auth.users
--  - normalize nome when empty

-- Helper function to avoid recursion by bypassing RLS inside the function
CREATE OR REPLACE FUNCTION public.is_super_admin(_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tipo text;
BEGIN
  -- Bypass RLS to avoid infinite recursion in policies
  PERFORM set_config('row_security', 'off', true);

  SELECT tipo_usuario
    INTO _tipo
  FROM public.perfis
  WHERE id = _uid;

  RETURN _tipo = 'super_admin';
END;
$$;

-- Ensure RLS enabled
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting/old policies
DROP POLICY IF EXISTS "usuários podem ver seu próprio perfil" ON public.perfis;
DROP POLICY IF EXISTS "usuários autenticados podem ver seu próprio perfil" ON public.perfis;
DROP POLICY IF EXISTS "super_admin pode ver todos os perfis" ON public.perfis;
DROP POLICY IF EXISTS "admin_equipamento pode ver todos os perfis" ON public.perfis;

DROP POLICY IF EXISTS "usuários podem atualizar seu próprio perfil" ON public.perfis;
DROP POLICY IF EXISTS "usuários autenticados podem atualizar seu próprio perfil" ON public.perfis;
DROP POLICY IF EXISTS "super_admin pode atualizar perfis" ON public.perfis;

DROP POLICY IF EXISTS "super_admin pode criar perfis" ON public.perfis;
DROP POLICY IF EXISTS "super_admin pode criar novos perfis" ON public.perfis;

-- SELECT: own perfil
CREATE POLICY "perfis_select_own" ON public.perfis
FOR SELECT
USING (id = auth.uid());

-- SELECT: super_admin can see all
CREATE POLICY "perfis_select_super_admin" ON public.perfis
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- UPDATE: own perfil
CREATE POLICY "perfis_update_own" ON public.perfis
FOR UPDATE
USING (id = auth.uid());

-- UPDATE: super_admin can update all
CREATE POLICY "perfis_update_super_admin" ON public.perfis
FOR UPDATE
USING (public.is_super_admin(auth.uid()));

-- INSERT: allow user to create own perfil (useful if trigger fails)
-- Keep it strict: id must be auth.uid()
DROP POLICY IF EXISTS "usuários podem criar seu próprio perfil" ON public.perfis;
CREATE POLICY "perfis_insert_own" ON public.perfis
FOR INSERT
WITH CHECK (id = auth.uid());

-- Backfill missing perfis for existing auth.users
-- NOTE: this runs with migration privileges; should be safe.
INSERT INTO public.perfis (id, nome, tipo_usuario)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'nome',''), u.email, 'Usuário') AS nome,
  COALESCE(NULLIF(u.raw_user_meta_data->>'tipo_usuario',''), 'usuario') AS tipo_usuario
FROM auth.users u
LEFT JOIN public.perfis p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Normalize empty/null names
UPDATE public.perfis p
SET nome = COALESCE(NULLIF(p.nome,''), u.raw_user_meta_data->>'nome', u.email, 'Usuário')
FROM auth.users u
WHERE u.id = p.id
  AND (p.nome IS NULL OR p.nome = '');
