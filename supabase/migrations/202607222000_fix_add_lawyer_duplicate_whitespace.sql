-- Corrige public.add_lawyer_to_all_tribunais: a comparação usava apenas
-- trim() (remove espaços só nas pontas) e lower(), então dois nomes com
-- espaços duplicados no meio (ex.: "MARIA  SILVA" com dois espaços vs.
-- "MARIA SILVA" com um) eram tratados como diferentes — fazendo a função
-- "não encontrar" o advogado já existente em alguns tribunais e inserir
-- duplicado. Nomes digitados manualmente têm bastante chance de ter esse
-- tipo de espaçamento inconsistente.
--
-- A correção normaliza espaços internos (colapsa múltiplos espaços em um
-- só) tanto na comparação quanto no valor efetivamente salvo, para que
-- comparações futuras continuem corretas também.
create or replace function public.add_lawyer_to_all_tribunais(p_nome text)
returns table (
  tribunais_afetados integer,
  tribunais_ja_tinha integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_nome text := regexp_replace(trim(p_nome), '\s+', ' ', 'g');
  v_afetados integer := 0;
  v_ja_tinha integer := 0;
begin
  if char_length(v_nome) < 1 or char_length(v_nome) > 160 then
    raise exception 'Nome de advogado inválido';
  end if;

  select count(*) into v_ja_tinha
  from public.tabelas_tribunais t
  where exists (
    select 1 from public.tabelas_advogados a
    where a.tribunal_id = t.id
      and lower(regexp_replace(trim(a.nome), '\s+', ' ', 'g')) = lower(v_nome)
  );

  with inseridos as (
    insert into public.tabelas_advogados (tribunal_id, nome, status)
    select t.id, v_nome, 'Não enviado'
    from public.tabelas_tribunais t
    where not exists (
      select 1 from public.tabelas_advogados a
      where a.tribunal_id = t.id
        and lower(regexp_replace(trim(a.nome), '\s+', ' ', 'g')) = lower(v_nome)
    )
    returning 1
  )
  select count(*) into v_afetados from inseridos;

  return query select v_afetados, v_ja_tinha;
end;
$$;

-- Limpeza única das duplicatas que o bug acima já pode ter criado: mesmo
-- tribunal + mesmo nome (ignorando espaços/maiúsculas), mantém apenas a
-- linha mais antiga (o cadastro original, com o status real de progresso
-- que já existia) e remove as cópias inseridas indevidamente pela função
-- com bug.
with duplicatas as (
  select
    id,
    row_number() over (
      partition by tribunal_id, lower(regexp_replace(trim(nome), '\s+', ' ', 'g'))
      order by created_at asc, id asc
    ) as posicao
  from public.tabelas_advogados
)
delete from public.tabelas_advogados a
using duplicatas d
where a.id = d.id and d.posicao > 1;
