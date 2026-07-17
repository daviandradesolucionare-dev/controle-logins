alter table public.access_requests add column if not exists revoked_at timestamptz;

drop policy if exists "access_requests_admin_delete" on public.access_requests;
create policy "access_requests_admin_delete" on public.access_requests for delete to authenticated
  using (public.is_admin());
