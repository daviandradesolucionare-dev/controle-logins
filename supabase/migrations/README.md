# Migrations do banco (Supabase)

## ⚠️ Deploy manual obrigatório

Assim como as Edge Functions (ver `functions/approve-access-request/README.md`),
as migrations em `supabase/migrations/` **não são aplicadas automaticamente**
por nenhum CI deste projeto. Dar `git push` com uma nova migration não muda
nada no banco em produção.

Depois de adicionar ou alterar uma migration, aplique com:

```bash
supabase link --project-ref <PROJECT_REF>   # só na primeira vez
supabase db push
```

## Por que isso importa

Se uma migration que cria uma tabela ou função (`default_lawyers`,
`replace_default_lawyers`, `list_users_with_roles`, etc.) nunca foi aplicada,
o código vai falhar ao tentar usá-la — mesmo estando tudo correto no
repositório. Historicamente isso já causou dois problemas neste projeto:

- Erro "Dados inválidos" ao revogar acesso (Edge Function desatualizada).
- Advogados padrão "sumindo" ao atualizar a página, porque o código tinha
  um fallback silencioso para `localStorage` quando a tabela/RPC não
  existia no banco — esse fallback foi removido intencionalmente
  (ver `src/lib/default-lawyers.ts`) para que esse tipo de problema
  apareça como erro visível, e não como perda de dados silenciosa.

Depois de rodar `supabase db push`, confirme no Table Editor do painel
Supabase que a tabela/coluna/função esperada realmente existe.
