# Plano: Segurança (Auth + RLS) e Refatoração de tribunais.tsx

O projeto hoje usa a chave `anon` publishable direto no cliente, sem autenticação, com o Supabase existente (`tcsltucypjnrwlsyjdpt`). Esse plano cobre as duas frentes que você escolheu.

Antes de começar, preciso confirmar 3 pontos operacionais que impactam diretamente a execução — respondo abaixo o que planejo assumir por padrão, mas me avise se quiser mudar:

1. **Escopo dos usuários:** app interno de uso próprio/equipe. Vou implementar login por **email/senha** apenas (sem Google/OAuth), auto-cadastro **desativado** (usuários criados por você no painel do Supabase). Se quiser signup aberto ou Google, me diga.
2. **Modelo de acesso:** todo dado (`tabelas_tribunais`, `tabelas_advogados`) fica **restrito a usuários autenticados** — sem diferenciação de dono/role por enquanto (todos os usuários logados veem/editam tudo). Simples e adequado para uso interno.
3. **Migração do Supabase:** o projeto atual **não tem Lovable Cloud ativado** (está conectado ao seu Supabase manualmente). Vou precisar que você **rode um SQL no SQL Editor do painel Supabase** — eu forneço o script exato. Não vou ativar Lovable Cloud (isso criaria um segundo projeto).

---

## Frente 1 — Autenticação + RLS

### 1.1 SQL para você rodar no Supabase (SQL Editor)

```sql
-- Habilita RLS e remove qualquer policy pública existente
ALTER TABLE public.tabelas_tribunais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabelas_advogados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read tribunais"   ON public.tabelas_tribunais;
DROP POLICY IF EXISTS "public write tribunais"  ON public.tabelas_tribunais;
DROP POLICY IF EXISTS "public read advogados"   ON public.tabelas_advogados;
DROP POLICY IF EXISTS "public write advogados"  ON public.tabelas_advogados;
-- (ajuste os DROPs conforme os nomes reais que aparecerem no painel)

-- Novas policies: apenas usuários autenticados
CREATE POLICY "auth read tribunais"
  ON public.tabelas_tribunais FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write tribunais"
  ON public.tabelas_tribunais FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read advogados"
  ON public.tabelas_advogados FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write advogados"
  ON public.tabelas_advogados FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Revoga acesso anônimo remanescente
REVOKE ALL ON public.tabelas_tribunais FROM anon;
REVOKE ALL ON public.tabelas_advogados FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tabelas_tribunais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tabelas_advogados TO authenticated;
```

E no painel: **Authentication → Providers → Email**: desativar "Enable email confirmations" (para você criar usuários direto) e desativar signup público em **Authentication → Settings**.

### 1.2 Mudanças no código

- **`src/lib/supabase.ts`**: ligar `persistSession: true` e `autoRefreshToken: true` (hoje estão desligados — necessário para manter usuário logado).
- **`src/lib/auth.tsx`** (novo): contexto `AuthProvider` que expõe `user`, `loading`, `signIn`, `signOut`, com `onAuthStateChange`.
- **`src/routes/login.tsx`** (novo): tela de login (email/senha) com validação `zod` + `react-hook-form`, mensagens em português, redireciona para `/` ao entrar.
- **`src/routes/__root.tsx`**: envolver com `AuthProvider`; a `<AppNav>` só renderiza quando `user` existe.
- **Gate de rotas**: como o app é 100% `ssr: false` (SPA), vou usar um gate simples no root — se `!user && rota !== "/login"`, renderiza `<Login />` no lugar do `<Outlet />`. Evita complicar com layout `_authenticated` (que exigiria mover todos os arquivos de rota).
- **`src/components/app-nav.tsx`**: adicionar avatar/email do usuário + botão "Sair" (chama `signOut`, limpa cache do react-query, navega para `/login`).
- **Badge de conexão**: passa a checar autenticado, não anon.

### 1.3 Fluxo de erro

- Erros 401/403 do Supabase → toast "Sessão expirada" + forçar signOut.
- Login inválido → mensagem inline no formulário.

---

## Frente 2 — Refatoração de `tribunais.tsx`

Hoje o arquivo tem ~700 linhas concentrando fetch, filtros, paginação, modais e CRUD. Vou dividir **sem mudar visual nem comportamento**:

### 2.1 Nova estrutura

```
src/features/tribunais/
├── api.ts                       # queries/mutations Supabase (fetchTribunais, updateTribunal, deleteTribunal, ...)
├── hooks/
│   ├── useTribunaisQuery.ts     # react-query: lista tribunais + advogados
│   └── useTribunalMutations.ts  # mutations com invalidate
├── components/
│   ├── TribunalListItem.tsx     # a linha/card com grid de 5 colunas
│   ├── TribunalFilters.tsx      # busca + filtro status + ordenação
│   ├── TribunalPagination.tsx   # anterior/próxima + contador
│   ├── EditTribunalDialog.tsx   # modal editar nome/sigla
│   └── DeleteTribunalDialog.tsx # confirmação de exclusão
└── utils.ts                     # cálculo de status (Concluído/Pendente), ordenação
```

- `src/routes/tribunais.tsx` fica com **~80 linhas**: só compõe `<TribunalFilters>`, `<TribunalListItem>`s e `<TribunalPagination>`.
- Introduz **react-query** (`@tanstack/react-query` já está no projeto pelo template) para cache de tribunais/advogados — resolve refetch desnecessário e substitui os `useState + useEffect` atuais.

### 2.2 Zod + react-hook-form no formulário de edição

O `EditTribunalDialog` passa a usar `zod` (`nome: min(1).max(120)`, `sigla: max(20).optional()`) — padrão que será estendido para `novo-cadastro` na próxima frente.

---

## O que **não** entra neste ciclo (fica para depois)

- Roles/permissões (admin vs comum).
- Paginação/filtros server-side (Frente 3 da sua lista).
- Testes automatizados + CI (Frente 4).
- Refatorar `novo-cadastro.tsx` e `advogados-padrao.tsx` (mesmo padrão da Frente 2, mas fora do escopo pedido).

---

## Checklist de execução

1. Confirmar suposições (email/senha, sem signup, tudo para `authenticated`).
2. Você roda o SQL no Supabase e desativa signup público.
3. Implemento Frente 1 (auth) — verifico login/logout no preview.
4. Implemento Frente 2 (refatoração) — verifico que listagem/filtros/edição continuam idênticos.
5. Rodo scan de segurança (`security--run_security_scan`) e reporto.

**Pode confirmar as 3 suposições (ou ajustar) para eu executar?**