# Configuração de Confirmação de Email

## Como verificar se a confirmação de email está ativa

1) No Supabase Dashboard, vá para **Authentication > Settings**
2) Procure pela opção **"Enable email confirmations"**
3) Se estiver marcada (ON), usuários precisarão confirmar o email antes de fazer login

## Como desativar a confirmação de email (para testes)

1) No Supabase Dashboard: **Authentication > Settings**
2) Desmarque **"Enable email confirmations"**
3) Clique em **Save**

## Como confirmar manualmente um usuário (se necessário)

SQL para confirmar um usuário específico:
```sql
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE id = 'UUID_DO_USUARIO';
```

Para listar usuários não confirmados:
```sql
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
WHERE email_confirmed_at IS NULL;
```

## Como a confirmação de email afeta o login

- **Com confirmação ativada**: `signInWithPassword` retorna erro se `email_confirmed_at` for NULL
- **Com confirmação desativada**: Login funciona independentemente de confirmação

## Recomendação para desenvolvimento

Desative a confirmação de email durante o desenvolvimento. Para produção, você pode:
- Manter ativa e configurar templates de email
- Ou usar um fluxo de confirmação manual via admin

## Erros comuns relacionados

- `{"error":"Email not confirmed"}`: indica que a confirmação está ativa e o usuário não confirmou
- `{"error":"Invalid login credentials"}`: pode ocorrer se o usuário não existe ou senha incorreta

## Como testar após desativar

1) Crie uma nova conta em `/signup`
2) Tente fazer login imediatamente
3) Deve funcionar sem erro de confirmação
