-- Criar tabelas base do sistema (eventos, locais, equipamentos, etc.)
-- Essas tabelas estavam sendo referenciadas mas não existiam no remoto

-- Tabela de locais
CREATE TABLE IF NOT EXISTS public.locais (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  disponivel boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de equipamentos
CREATE TABLE IF NOT EXISTS public.equipamentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  disponivel boolean DEFAULT true,
  em_manutencao boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de eventos
CREATE TABLE IF NOT EXISTS public.eventos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  data timestamptz NOT NULL,
  descricao text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  local_id uuid REFERENCES public.locais(id) ON DELETE SET NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de relacionamento eventos_equipamentos
CREATE TABLE IF NOT EXISTS public.eventos_equipamentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id uuid REFERENCES public.eventos(id) ON DELETE CASCADE,
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(evento_id, equipamento_id)
);

-- Tabela de responsáveis por evento
CREATE TABLE IF NOT EXISTS public.eventos_responsaveis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id uuid REFERENCES public.eventos(id) ON DELETE CASCADE,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(evento_id, responsavel_id)
);

-- Tabela de feedbacks
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  evento_id uuid REFERENCES public.eventos(id) ON DELETE CASCADE,
  mensagem text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Policies para locais
CREATE POLICY "todos podem ver locais disponíveis" ON public.locais
FOR SELECT
USING (disponivel = true);

CREATE POLICY "admin_equipamento pode gerenciar locais" ON public.locais
FOR ALL
USING (
  (auth.jwt() -> 'user_metadata' ->> 'tipo_usuario') IN ('admin_equipamento', 'super_admin')
);

-- Policies para equipamentos
CREATE POLICY "todos podem ver equipamentos disponíveis" ON public.equipamentos
FOR SELECT
USING (disponivel = true AND em_manutencao = false);

CREATE POLICY "admin_equipamento pode gerenciar equipamentos" ON public.equipamentos
FOR ALL
USING (
  (auth.jwt() -> 'user_metadata' ->> 'tipo_usuario') IN ('admin_equipamento', 'super_admin')
);

-- Policies para eventos
CREATE POLICY "todos podem ver eventos" ON public.eventos
FOR SELECT
USING (true);

CREATE POLICY "usuários podem criar eventos" ON public.eventos
FOR INSERT
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'tipo_usuario') IN ('usuario', 'admin_equipamento', 'super_admin')
  AND criado_por = auth.uid()
);

CREATE POLICY "super_admin pode gerenciar todos os eventos" ON public.eventos
FOR ALL
USING (
  (auth.jwt() -> 'user_metadata' ->> 'tipo_usuario') = 'super_admin'
);

CREATE POLICY "usuários podem editar seus próprios eventos" ON public.eventos
FOR UPDATE
USING (
  criado_por = auth.uid()
  AND (auth.jwt() -> 'user_metadata' ->> 'tipo_usuario') IN ('usuario', 'admin_equipamento', 'super_admin')
);

-- Policies para eventos_equipamentos
CREATE POLICY "todos podem ver eventos_equipamentos" ON public.eventos_equipamentos
FOR SELECT
USING (true);

CREATE POLICY "usuários podem associar equipamentos aos seus eventos" ON public.eventos_equipamentos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = evento_id AND e.criado_por = auth.uid()
  )
);

CREATE POLICY "super_admin pode gerenciar eventos_equipamentos" ON public.eventos_equipamentos
FOR ALL
USING (
  (auth.jwt() -> 'user_metadata' ->> 'tipo_usuario') = 'super_admin'
);

-- Policies para eventos_responsaveis
CREATE POLICY "todos podem ver eventos_responsaveis" ON public.eventos_responsaveis
FOR SELECT
USING (true);

CREATE POLICY "usuários podem associar responsáveis aos seus eventos" ON public.eventos_responsaveis
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = evento_id AND e.criado_por = auth.uid()
  )
);

CREATE POLICY "super_admin pode gerenciar eventos_responsaveis" ON public.eventos_responsaveis
FOR ALL
USING (
  (auth.jwt() -> 'user_metadata' ->> 'tipo_usuario') = 'super_admin'
);

-- Policies para feedbacks
CREATE POLICY "todos podem ver feedbacks" ON public.feedbacks
FOR SELECT
USING (true);

CREATE POLICY "usuários podem criar feedbacks" ON public.feedbacks
FOR INSERT
WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "super_admin pode gerenciar feedbacks" ON public.feedbacks
FOR ALL
USING (
  (auth.jwt() -> 'user_metadata' ->> 'tipo_usuario') = 'super_admin'
);
