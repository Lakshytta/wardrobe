-- Celebrations: a multi-day family event (e.g. "Lakshu wedding") grouping sub-events
-- (Haldi, Mehendi, Sangeet, Shaadi…), each with several outfit options (outfit + bag + jewellery).
create table if not exists public.celebrations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists celebrations_profile_idx on public.celebrations(profile_id);

alter table public.events add column if not exists celebration_id uuid references public.celebrations(id) on delete cascade;
alter table public.events add column if not exists sort int not null default 0;
-- options: [{id, item_ids[], bag_id, jewellery_ids[], bag_note, jewellery_note, note, chosen}]
alter table public.events add column if not exists options jsonb not null default '[]'::jsonb;
alter table public.events alter column date drop not null; -- sub-events (e.g. filler suits) may not have a date yet
create index if not exists events_celebration_idx on public.events(celebration_id);

alter table public.celebrations enable row level security;
alter table public.celebrations replica identity full;
drop policy if exists "open read" on public.celebrations;
drop policy if exists "open insert" on public.celebrations;
drop policy if exists "open update" on public.celebrations;
drop policy if exists "open delete" on public.celebrations;
create policy "open read" on public.celebrations for select to anon, authenticated using (true);
create policy "open insert" on public.celebrations for insert to anon, authenticated with check (true);
create policy "open update" on public.celebrations for update to anon, authenticated using (true) with check (true);
create policy "open delete" on public.celebrations for delete to anon, authenticated using (true);
grant select, insert, update, delete on table public.celebrations to anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'celebrations') then
    alter publication supabase_realtime add table public.celebrations;
  end if;
end $$;
