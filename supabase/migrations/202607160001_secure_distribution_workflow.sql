-- Core security, shared configuration and workflow data for Controle de Distribuição.
-- Apply with: supabase db push

create extension if not exists pgcrypto;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.user_roles enable row level security;
drop policy if exists "user_roles_read_own_or_admin" on public.user_roles;
create policy "user_roles_read_own_or_admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "user_roles_admin_write" on public.user_roles;
create policy "user_roles_admin_write" on public.user_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "profiles_read_own_or_admin" on public.profiles;
create policy "profiles_read_own_or_admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];
drop policy if exists "avatar_read" on storage.objects;
create policy "avatar_read" on storage.objects for select to public using (bucket_id = 'avatars');
drop policy if exists "avatar_upload_own_folder" on storage.objects;
create policy "avatar_upload_own_folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.default_lawyers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 160),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name),
  unique (position)
);

alter table public.default_lawyers enable row level security;
drop policy if exists "default_lawyers_read" on public.default_lawyers;
create policy "default_lawyers_read" on public.default_lawyers for select to authenticated using (true);
drop policy if exists "default_lawyers_admin_write" on public.default_lawyers;
create policy "default_lawyers_admin_write" on public.default_lawyers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.default_lawyers (name, position)
values
  ('ADRIANA LOPES RIBEIRO', 0), ('ANA PAULA DE SOUZA SILVA', 1),
  ('ANECHELE DE MENEZES ALCANTARA', 2), ('CAMILA MORAIS MAURICIO', 3),
  ('CAROLINE H. MIRANDA S. FORTUNATO', 4), ('CAROLINE XAVIER SANGIORGI RICARDO', 5),
  ('DENISE FERREIRA SANTOS', 6), ('DIEGO ALLAN FERRAZ MERGULHÃO', 7),
  ('FERNANDO HENRIQUE PAIVA BERBEL', 8), ('GABRIELA CRISTINA DOS REIS', 9),
  ('GABRIELA FERNANDA GOMES DA SILVA', 10), ('GABRIELA GARCIAS LOPES', 11),
  ('HOUSTON MARCOS BARROS ALVES', 12), ('JACKSON CARDOSO ALVES SANTOS', 13),
  ('MARCOS HENRIQUE BARBOSA SILVA', 14), ('MARIA PAULA FERNANDES CASTILHO', 15),
  ('MARIANA ALVES PINTO', 16), ('MARIANA FERREIRA MARTINS DA SILVA', 17),
  ('MARINA DE SOUZA DA ROCHA E SILVA', 18), ('MEIRIELE PARECIDA MELO', 19),
  ('MONIK EVELLYN LINS', 20), ('PAULA CAMILA CORDEIRO SOARES', 21),
  ('PEDRO HENRIQUE RODRIGUES ALVES', 22), ('STEFANIE DA SILVA CARDOSO', 23),
  ('THAIS ALMEIDA BRAGA', 24), ('THAIS CRISTINA SANTOS CARDOSO', 25),
  ('VALMA MARIA VARSINHO', 26), ('JULIA SILVA DO CARMO', 27)
on conflict do nothing;

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
  delete from public.default_lawyers;
  insert into public.default_lawyers (name, position)
  select trim(name), ordinality - 1
  from unnest(p_names) with ordinality as item(name, ordinality);
end;
$$;

grant execute on function public.replace_default_lawyers(text[]) to authenticated;

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  email text not null,
  message text not null default '' check (char_length(message) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.access_requests add column if not exists reviewed_by uuid references auth.users(id);
alter table public.access_requests add column if not exists reviewed_at timestamptz;
alter table public.access_requests add column if not exists updated_at timestamptz not null default now();

alter table public.access_requests enable row level security;
drop policy if exists "access_requests_submit" on public.access_requests;
create policy "access_requests_submit" on public.access_requests for insert to anon, authenticated
  with check (status = 'pending' and reviewed_by is null and reviewed_at is null);
drop policy if exists "access_requests_admin_read" on public.access_requests;
create policy "access_requests_admin_read" on public.access_requests for select to authenticated
  using (public.is_admin());
drop policy if exists "access_requests_admin_update" on public.access_requests;
create policy "access_requests_admin_update" on public.access_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.advogado_status_history (
  id uuid primary key default gen_random_uuid(),
  advogado_id uuid not null references public.tabelas_advogados(id) on delete cascade,
  previous_status text,
  next_status text not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

alter table public.advogado_status_history enable row level security;
drop policy if exists "advogado_history_read" on public.advogado_status_history;
create policy "advogado_history_read" on public.advogado_status_history for select to authenticated using (true);

create or replace function public.record_advogado_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.advogado_status_history (advogado_id, previous_status, next_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists advogado_status_history_trigger on public.tabelas_advogados;
create trigger advogado_status_history_trigger
after update of status on public.tabelas_advogados
for each row execute function public.record_advogado_status_change();

-- The interface permits any authenticated collaborator to maintain records;
-- destructive actions stay restricted to admins.
alter table public.tabelas_tribunais enable row level security;
drop policy if exists "tribunais_read_authenticated" on public.tabelas_tribunais;
create policy "tribunais_read_authenticated" on public.tabelas_tribunais for select to authenticated using (true);
drop policy if exists "tribunais_insert_authenticated" on public.tabelas_tribunais;
create policy "tribunais_insert_authenticated" on public.tabelas_tribunais for insert to authenticated with check (true);
drop policy if exists "tribunais_update_authenticated" on public.tabelas_tribunais;
create policy "tribunais_update_authenticated" on public.tabelas_tribunais for update to authenticated using (true) with check (true);
drop policy if exists "tribunais_delete_admin" on public.tabelas_tribunais;
create policy "tribunais_delete_admin" on public.tabelas_tribunais for delete to authenticated using (public.is_admin());

alter table public.tabelas_advogados enable row level security;
drop policy if exists "advogados_read_authenticated" on public.tabelas_advogados;
create policy "advogados_read_authenticated" on public.tabelas_advogados for select to authenticated using (true);
drop policy if exists "advogados_insert_authenticated" on public.tabelas_advogados;
create policy "advogados_insert_authenticated" on public.tabelas_advogados for insert to authenticated with check (true);
drop policy if exists "advogados_update_authenticated" on public.tabelas_advogados;
create policy "advogados_update_authenticated" on public.tabelas_advogados for update to authenticated using (true) with check (true);
drop policy if exists "advogados_delete_admin" on public.tabelas_advogados;
create policy "advogados_delete_admin" on public.tabelas_advogados for delete to authenticated using (public.is_admin());

create or replace function public.create_tribunal_with_lawyers(
  p_nome text,
  p_sigla text,
  p_lawyer_names text[] default array[]::text[]
)
returns public.tabelas_tribunais
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_tribunal public.tabelas_tribunais;
begin
  if char_length(trim(p_nome)) = 0 or char_length(trim(p_nome)) > 120 then
    raise exception 'Nome do tribunal inválido';
  end if;

  insert into public.tabelas_tribunais (nome, sigla)
  values (trim(p_nome), nullif(trim(coalesce(p_sigla, '')), ''))
  returning * into created_tribunal;

  insert into public.tabelas_advogados (tribunal_id, nome, status)
  select created_tribunal.id, trim(name), 'Não enviado'
  from unnest(coalesce(p_lawyer_names, array[]::text[])) as name
  where char_length(trim(name)) between 1 and 160;

  return created_tribunal;
end;
$$;

grant execute on function public.create_tribunal_with_lawyers(text, text, text[]) to authenticated;

create or replace function public.dashboard_metrics()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with status_counts as (
    select
      count(*) filter (where status = 'Ok') as ok,
      count(*) filter (where status = 'Enviado - Aguardando Retorno') as aguardando,
      count(*) filter (where status = 'Não enviado' or status is null or status = '') as nao_enviados
    from public.tabelas_advogados
  ), tribunal_counts as (
    select count(*) as total from public.tabelas_tribunais
  )
  select jsonb_build_object(
    'tribunais', tribunal_counts.total,
    'ok', status_counts.ok,
    'aguardando', status_counts.aguardando,
    'naoEnviados', status_counts.nao_enviados
  )
  from status_counts cross join tribunal_counts;
$$;

grant execute on function public.dashboard_metrics() to authenticated;
