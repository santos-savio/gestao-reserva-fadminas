-- Garantir que o trigger on_auth_user_created funcione para criar perfis automaticamente ao cadastrar

-- 1) Remover trigger e função antigos (se existirem)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2) Criar função para criar perfil em public.perfis quando um novo usuário é criado no auth
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir perfil usando dados do auth.users
  INSERT INTO public.perfis (id, nome, tipo_usuario, telefone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'tipo_usuario', 'usuario'),
    NEW.raw_user_meta_data->>'telefone'
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    tipo_usuario = EXCLUDED.tipo_usuario,
    telefone = EXCLUDED.telefone;
    
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Logar erro mas não impedir criação do usuário
    RAISE WARNING 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Criar trigger para chamar a função quando um novo usuário é criado
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Garantir que a tabela perfis tenha RLS habilitado
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- 5) Opcional: criar um perfil para usuários existentes que não têm perfil
-- Isso pode ajudar se houver usuários criados antes do trigger
INSERT INTO public.perfis (id, nome, tipo_usuario, telefone)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'nome', email) as nome,
  COALESCE(raw_user_meta_data->>'tipo_usuario', 'usuario') as tipo_usuario,
  raw_user_meta_data->>'telefone' as telefone
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.perfis)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  tipo_usuario = EXCLUDED.tipo_usuario,
  telefone = EXCLUDED.telefone;
