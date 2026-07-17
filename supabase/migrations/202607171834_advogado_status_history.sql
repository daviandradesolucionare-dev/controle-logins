create table if not exists public.advogado_status_history (
  id uuid primary key default gen_random_uuid(),
  advogado_id uuid not null references public.tabelas_advogados(id) on delete cascade,
  previous_status text,
  next_status text not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create index if not exists advogado_status_history_advogado_idx
  on public.advogado_status_history (advogado_id, changed_at desc);

alter table public.advogado_status_history enable row level security;
drop policy if exists "advogado_history_read" on public.advogado_status_history;
create policy "advogado_history_read" on public.advogado_status_history for select to authenticated
  using (true);

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
