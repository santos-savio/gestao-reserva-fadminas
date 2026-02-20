-- Permitir login mesmo sem confirmação de email
-- Ajustar policies para não bloquear usuários não confirmados

-- 1) Verificar se há policies que bloqueiam usuários não confirmados
-- Vamos garantir que as policies de perfis não dependam de email_confirmado

-- 2) Remover policies que possam bloquear por email não confirmado (se existirem)
DROP POLICY IF EXISTS "apenas usuários confirmados podem ver perfil" ON public.perfis;
DROP POLICY IF EXISTS "apenas usuários confirmados podem atualizar perfil" ON public.perfis;

-- 3) Garantir que as policies atuais não dependam de email_confirmado
-- As policies já existentes devem permitir acesso baseado apenas em auth.uid() e user_metadata

-- 4) Criar uma policy explícita para permitir que usuários autenticados (mesmo não confirmados) vejam seu perfil
CREATE POLICY "usuários autenticados podem ver seu próprio perfil" ON public.perfis
FOR SELECT USING (id = auth.uid());

-- 5) Permitir que usuários autenticados atualizem seu próprio perfil
CREATE POLICY "usuários autenticados podem atualizar seu próprio perfil" ON public.perfis
FOR UPDATE USING (id = auth.uid());

-- 6) Verificar se há restrições em outras tabelas que possam bloquear login
-- Por exemplo, se a tabela eventos tiver uma policy que exija email_confirmado

-- 7) Garantir que a tabela eventos não bloqueie usuários não confirmados
DROP POLICY IF EXISTS "apenas usuários confirmados podem criar eventos" ON public.eventos;

-- 8) Permitir que usuários autenticados criem eventos (independentemente de confirmação de email)
CREATE POLICY "usuários autenticados podem criar eventos" ON public.eventos
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
      AND id IS NOT NULL
  ) AND criado_por = auth.uid()
);

-- 9) Permitir que usuários autenticados vejam eventos
CREATE POLICY "usuários autenticados podem ver eventos" ON public.eventos
FOR SELECT USING (true);

-- 10) Permitir que usuários autenticados atualizem seus próprios eventos
CREATE POLICY "usuários autenticados podem atualizar seus eventos" ON public.eventos
FOR UPDATE USING (
  criado_por = auth.uid()
);

-- 11) Garantir que não há policies bloqueando acesso a locais/equipamentos para usuários não confirmados
-- As policies existentes já devem permitir acesso baseado em disponibilidade, não em confirmação de email

-- 12) Se houver alguma policy que exija email_confirmado, vamos remover aqui
DROP POLICY IF EXISTS "apenas usuários confirmados podem ver locais" ON public.locais;
DROP POLICY IF EXISTS "apenas usuários confirmados podem ver equipamentos" ON public.equipamentos;

-- 13) Garantir que as policies de locais e equipamentos continuem funcionando
-- (já existentes, mas vamos garantir que não dependem de confirmação de email)

-- 14) Opcional: se quiser desativar a exigência de confirmação de email no nível do Auth
-- Isso deve ser feito no Dashboard: Authentication > Settings > "Enable email confirmations" = OFF
-- Esta migration não pode alterar essa configuração diretamente

-- 15: Adicionar uma nota sobre como verificar se a confirmação de email está ativa
-- Para verificar: SELECT * FROM auth.users WHERE email_confirmed_at IS NULL;
-- Para confirmar manualmente um usuário: UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = 'user_uuid';
