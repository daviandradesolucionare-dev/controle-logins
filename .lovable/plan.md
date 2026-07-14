# Plano — Paginação/filtros no servidor (Frente 3)

Hoje `tribunais.tsx` puxa **todos** os tribunais e **todos** os 290 advogados de uma vez e filtra/pagina no cliente. Vou migrar isso para consultas server-side com `.range()`, filtros SQL e um agregado de status feito no Postgres.

## Frente 1 — SQL para você rodar no Supabase

Precisamos de uma **view** com status agregado + índices. Script único para colar no SQL Editor:

```sql
-- Índices para busca/ordenação/relacionamento
CREATE INDEX IF NOT EXISTS idx_tribunais_nome         ON public.tabelas_tribunais (nome);
CREATE INDEX IF NOT EXISTS idx_tribunais_created_at   ON public.tabelas_tribunais (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tribunais_nome_trgm    ON public.tabelas_tribunais USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tribunais_sigla_trgm   ON public.tabelas_tribunais USING gin (sigla gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_advogados_tribunal_id  ON public.tabelas_advogados (tribunal_id);
CREATE INDEX IF NOT EXISTS idx_advogados_nome_trgm    ON public.tabelas_advogados USING gin (nome gin_trgm_ops);

-- Extensão pg_trgm (para ILIKE performático)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- View com status agregado
CREATE OR REPLACE VIEW public.tribunais_com_status AS
SELECT
  t.id, t.nome, t.sigla, t.created_at,
  COALESCE(a.total, 0)                        AS total_advogados,
  COALESCE(a.ok_count, 0)                     AS ok_count,
  CASE
    WHEN COALESCE(a.total, 0) = 0            THEN 'Vazio'
    WHEN a.ok_count = a.total                 THEN 'Concluído'
    ELSE 'Pendente'
  END                                         AS status
FROM public.tabelas_tribunais t
LEFT JOIN (
  SELECT tribunal_id,
         COUNT(*)                                     AS total,
         COUNT(*) FILTER (WHERE status = 'Ok')        AS ok_count
  FROM public.tabelas_advogados
  GROUP BY tribunal_id
) a ON a.tribunal_id = t.id;

GRANT SELECT ON public.tribunais_com_status TO authenticated;
```

A view herda RLS das tabelas base, então continua restrita a `authenticated`.

## Frente 2 — Código

### `src/features/tribunais/api.ts`
- Nova função `fetchTribunaisPage({ q, status, ordem, offset, limit })`:
  - SELECT em `tribunais_com_status` com `.or('nome.ilike.%q%,sigla.ilike.%q%')`
  - `.eq('status', ...)` quando `status !== 'todos'`
  - `.order()` por `nome` ou `created_at` conforme `ordem`
  - `.range(offset, offset+limit-1)` e `{ count: 'exact' }` para total.
- Nova `fetchAdvogadosByTribunais(ids: string[])`: só carrega advogados da página visível (`.in('tribunal_id', ids)`).
- Filtro por nome de advogado (server-side): função auxiliar que primeiro busca `tribunal_id`s distintos em `tabelas_advogados` com `.ilike` + limita, depois filtra a página.

### `src/features/tribunais/hooks.ts`
- Substituo `useTribunaisData` por `useTribunaisPage(params)` — react-query com `queryKey: ['tribunais', params]`, `keepPreviousData: true` (paginação sem flicker), `staleTime: 30s`.
- Query separada `useAdvogadosDaPagina(ids)` só executa quando há ids.
- Mutações continuam invalidando as chaves.

### `src/routes/tribunais.tsx`
- Estado local de filtros/página migra para **URL search params** via `validateSearch` + `Route.useSearch()` + `useNavigate()` (offset, limit=12, q, adv, status, ordem). Refresh e link compartilhável preservam contexto.
- Remove `filtrarTribunais`/`ordenarTribunais` do cliente — apenas exibe o que veio.
- `total` vem do `count` do Supabase; `totalPages` calculado a partir dele.
- Debounce (300ms) na digitação de busca antes de atualizar a URL, evitando request por letra.

### `src/features/tribunais/utils.ts`
- Mantém `computeTribunalStatus` só para exibição (não mais para filtrar).
- Remove funções de filtro/ordenação (agora no servidor).

## Ganhos esperados
- Payload inicial cai de ~290 advogados + N tribunais → 12 tribunais + só seus advogados.
- Filtro/ordenação executam no Postgres com índices `btree` + `gin_trgm`.
- URL passa a refletir estado (compartilhável, botão voltar funciona).

## Fora deste ciclo
- Contagem em tempo real via `channel` (realtime).
- Server-side pagination para `advogados-padrao.tsx` (mesmo padrão, próxima frente).

## Checklist
1. Você roda o SQL acima no SQL Editor.
2. Implemento api/hooks/route.
3. Verifico no preview: busca, filtro status, ordem, paginação, edição/exclusão continuam funcionando.

**Confirma que posso executar assim? (rodar o SQL e implementar)**
