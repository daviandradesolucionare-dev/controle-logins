-- RPC para adicionar um advogado em todos os tribunais de uma vez,
-- pulando os tribunais que já possuem um advogado com o mesmo nome
-- (comparação case-insensitive, ignorando espaços nas pontas).
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
  v_nome text := trim(p_nome);
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
    where a.tribunal_id = t.id and lower(trim(a.nome)) = lower(v_nome)
  );

  with inseridos as (
    insert into public.tabelas_advogados (tribunal_id, nome, status)
    select t.id, v_nome, 'Não enviado'
    from public.tabelas_tribunais t
    where not exists (
      select 1 from public.tabelas_advogados a
      where a.tribunal_id = t.id and lower(trim(a.nome)) = lower(v_nome)
    )
    returning 1
  )
  select count(*) into v_afetados from inseridos;

  return query select v_afetados, v_ja_tinha;
end;
$$;

grant execute on function public.add_lawyer_to_all_tribunais(text) to authenticated;
