do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'access_requests'
      and constraint_type = 'CHECK'
      and constraint_name = 'access_requests_status_check'
  ) then
    alter table public.access_requests drop constraint access_requests_status_check;
  end if;
end $$;

alter table public.access_requests
  add constraint access_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'revoked'));
