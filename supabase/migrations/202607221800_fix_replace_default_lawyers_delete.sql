-- Corrige public.replace_default_lawyers: o Supabase bloqueia
-- "DELETE FROM tabela;" sem cláusula WHERE (proteção contra exclusão
-- acidental em massa), o que fazia a função falhar com o erro
-- "DELETE requires a WHERE clause" ao salvar a lista de advogados padrão.
--
-- A correção usa "where true" para manter exatamente o mesmo
-- comportamento (apagar todas as linhas antes de reinserir a lista
-- completa), mas de forma explícita o suficiente para passar pela
-- proteção do Supabase.
create or replace function public.replace_default_lawyers(p_names text[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  if exists (select 1 from unnest(p_names) as name where char_length(trim(name)) not between 1 and 160) then
    raise exception 'Nome de advogado inválido';
  end if;
  if (select count(*) from (select lower(trim(name)) from unnest(p_names) as name group by 1 having count(*) > 1) duplicates) > 0 then
    raise exception 'Há advogados duplicados';
  end if;
  delete from public.default_lawyers where true;
  insert into public.default_lawyers (name, position)
  select trim(name), ordinality - 1
  from unnest(p_names) with ordinality as item(name, ordinality);
end;
$$;
