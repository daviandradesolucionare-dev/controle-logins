-- RPC que lista os usuários que já entraram no sistema (usuários com acesso
-- aprovado) junto com seus cargos, para a tela de Permissões poder oferecer
-- "Tornar admin" / "Remover admin". Restrito a administradores.

create or replace function public.list_users_with_roles()
returns table (
  user_id uuid,
  email text,
  full_name text,
  is_admin boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Sem permissão';
  end if;

  return query
  select
    au.id as user_id,
    au.email::text as email,
    coalesce(p.display_name, au.raw_user_meta_data ->> 'full_name', '') as full_name,
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = au.id and ur.role = 'admin'
    ) as is_admin,
    au.created_at
  from auth.users au
  left join public.profiles p on p.id = au.id
  -- Apenas usuários que de fato têm uma solicitação de acesso aprovada
  -- (ou seja, já entraram no sistema por essa via) aparecem aqui.
  where exists (
    select 1 from public.access_requests ar
    where lower(ar.email) = lower(au.email) and ar.status = 'approved'
  )
  order by au.created_at asc;
end;
$$;

revoke all on function public.list_users_with_roles() from public;
grant execute on function public.list_users_with_roles() to authenticated;
