-- Suporte a avatar animado (GIF), além da imagem estática já existente.

alter table public.profiles
  add column if not exists avatar_type text not null default 'image'
    check (avatar_type in ('image', 'gif')),
  add column if not exists avatar_gif_id text,
  add column if not exists avatar_gif_url text,
  add column if not exists avatar_gif_preview_url text;

-- GIFs favoritados pelo usuário (aparecem primeiro na aba Favoritos).
create table if not exists public.gif_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gif_id text not null,
  gif_url text not null,
  preview_url text not null,
  title text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, gif_id)
);

alter table public.gif_favorites enable row level security;

create policy "gif_favorites_own_select" on public.gif_favorites
  for select using (auth.uid() = user_id);
create policy "gif_favorites_own_insert" on public.gif_favorites
  for insert with check (auth.uid() = user_id);
create policy "gif_favorites_own_delete" on public.gif_favorites
  for delete using (auth.uid() = user_id);

-- GIFs usados recentemente (últimos utilizados como avatar).
create table if not exists public.gif_recents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gif_id text not null,
  gif_url text not null,
  preview_url text not null,
  title text not null default '',
  used_at timestamptz not null default now(),
  unique (user_id, gif_id)
);

alter table public.gif_recents enable row level security;

create policy "gif_recents_own_select" on public.gif_recents
  for select using (auth.uid() = user_id);
create policy "gif_recents_own_insert" on public.gif_recents
  for insert with check (auth.uid() = user_id);
create policy "gif_recents_own_update" on public.gif_recents
  for update using (auth.uid() = user_id);
create policy "gif_recents_own_delete" on public.gif_recents
  for delete using (auth.uid() = user_id);

-- Registra um GIF como usado recentemente, e mantém só os 30 mais recentes
-- por usuário para não acumular indefinidamente.
create or replace function public.record_gif_recent(
  p_gif_id text,
  p_gif_url text,
  p_preview_url text,
  p_title text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.gif_recents (user_id, gif_id, gif_url, preview_url, title, used_at)
  values (auth.uid(), p_gif_id, p_gif_url, p_preview_url, coalesce(p_title, ''), now())
  on conflict (user_id, gif_id)
  do update set used_at = now(), gif_url = excluded.gif_url, preview_url = excluded.preview_url;

  delete from public.gif_recents
  where user_id = auth.uid()
    and id not in (
      select id from public.gif_recents
      where user_id = auth.uid()
      order by used_at desc
      limit 30
    );
end;
$$;

grant execute on function public.record_gif_recent(text, text, text, text) to authenticated;
