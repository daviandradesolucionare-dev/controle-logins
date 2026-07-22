# approve-access-request

Edge Function que processa decisões sobre solicitações de acesso:
`approved`, `rejected` e `revoke`.

## ⚠️ Deploy manual obrigatório

O CI (`.github/workflows/ci.yml`) roda apenas typecheck, lint, testes e build —
**ele não implanta Edge Functions**. Alterar este arquivo e dar `git push` NÃO
atualiza a função em produção.

Depois de qualquer alteração aqui, é necessário implantar manualmente:

```bash
supabase functions deploy approve-access-request --project-ref <PROJECT_REF>
```

Se esquecer esse passo, o comportamento antigo continua no ar mesmo com o
código novo já no repositório — foi exatamente isso que causou o erro
"Dados inválidos" ao tentar revogar acesso: o front-end já enviava
`decision: "revoke"`, mas a função implantada ainda era uma versão anterior
que não reconhecia esse valor.
