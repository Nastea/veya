create extension if not exists "pgcrypto";

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  import_source text default 'manual',
  title text not null,
  content_type text not null check (content_type in ('Post', 'Reel', 'Carousel')),
  instagram_profile_id text not null,
  status text not null check (status in ('Idea', 'Planned', 'Filmed', 'Done')) default 'Idea',
  planned_date date,
  caption text default '',
  script text default '',
  description text default '',
  notes text default '',
  filming_date date,
  asset_source text default 'manual',
  asset_folder_url text default '',
  drive_link text default '',
  cover_image_url text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_items_profile_date
  on public.content_items (instagram_profile_id, planned_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_content_items_updated_at on public.content_items;
create trigger trg_content_items_updated_at
before update on public.content_items
for each row
execute function public.set_updated_at();

alter table public.content_items enable row level security;

drop policy if exists "content_items_select_anon" on public.content_items;
create policy "content_items_select_anon"
on public.content_items
for select
to anon
using (true);

drop policy if exists "content_items_insert_anon" on public.content_items;
create policy "content_items_insert_anon"
on public.content_items
for insert
to anon
with check (true);
