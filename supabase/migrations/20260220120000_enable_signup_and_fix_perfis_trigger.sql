-- Permitir que novos usuários se cadastrem e criem seu próprio perfil
-- Garantir que o trigger on_auth_user_created funcione corretamente

-- 1) Habilitar signup no Supabase Auth (isso é feito no Dashboard, mas vamos garantir)
-- Não é necessário SQL aqui, mas o usuário deve habilitar "Allow new users to sign up" no Dashboard > Authentication > Settings

-- 2) Garantir que a trigger on_auth_user_created funcione para criar perfis automaticamente
-- Se já existir, vamos recriar para garantir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar perfil em public.perfis usando dados do auth.users
  INSERT INTO public.perfis (id, nome, tipo_usuario, telefone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'tipo_usuario', 'usuario'),
    NEW.raw_user_meta_data->>'telefone'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Se o perfil já existe, apenas ignora
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para chamar a função quando um novo usuário é criado
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Ajustar policies para permitir que usuários vejam e editem seu próprio perfil
DROP POLICY IF EXISTS "usuários podem ver seu próprio perfil" ON public.perfis;
DROP POLICY IF EXISTS "usuários podem criar seu próprio perfil" ON public.perfis;

CREATE POLICY "usuários podem ver seu próprio perfil" ON public.perfis
FOR SELECT USING (id = auth.uid());

CREATE POLICY "usuários podem atualizar seu próprio perfil" ON public.perfis
FOR UPDATE USING (id = auth.uid());

-- 4) Garantir que super_admin possa gerenciar perfis (já existe na migration anterior, mas vamos garantir)
DROP POLICY IF EXISTS "super_admin pode ver todos os perfis" ON public.perfis;
DROP POLICY IF EXISTS "super_admin pode criar novos usuários" ON public.perfis;
DROP POLICY IF EXISTS "super_admin pode atualizar perfis" ON public.perfis;

CREATE POLICY "super_admin pode ver todos os perfis" ON public.perfis
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.perfis 
    WHERE id = auth.uid() AND tipo_usuario = 'super_admin'
  )
);

CREATE POLICY "super_admin pode criar novos perfis" ON public.perfis
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.perfis 
    WHERE id = auth.uid() AND tipo_usuario = 'super_admin'
  )
);

CREATE POLICY "super_admin pode atualizar perfis" ON public.perfis
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.perfis 
    WHERE id = auth.uid() AND tipo_usuario = 'super_admin'
  )
);

-- 5) Permitir que admin_equipamento veja todos os perfis (útil para gestão)
CREATE POLICY "admin_equipamento pode ver todos os perfis" ON public.perfis
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.perfis 
    WHERE id = auth.uid() AND tipo_usuario = 'admin_equipamento'
  )
);

-- 6) Garantir que a tabela perfis tenha RLS habilitado
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
