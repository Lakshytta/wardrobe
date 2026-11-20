-- Wardrobe schema. Access model is "open" (no login): every table has RLS enabled with
-- explicit anon/authenticated policies. Data is protected by soft-delete, trash and backups.

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  color text not null default '#0B6B62' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  avatar_emoji text not null default '🌸' check (char_length(avatar_emoji) <= 16),
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  name text not null check (char_length(name) between 1 and 60),
  slot text not null default 'accessory' check (slot in ('main','top','layer','accessory')),
  sort int not null default 0,
  builtin boolean not null default false
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 120),
  details text not null default '' check (char_length(details) <= 2000),
  category_id text not null default 'other' references public.categories(id) on update cascade,
  primary_color text not null default 'multi',
  accent_colors text[] not null default '{}',
  palette_hex text[] not null default '{}',
  fabric text not null default '',
  work text not null default '',
  occasions text[] not null default '{}',
  season text not null default 'All-season',
  tags text[] not null default '{}',
  image_url text not null default '',
  thumb_url text not null default '',
  phash text,
  price numeric(10,2) check (price is null or price >= 0),
  status text not null default 'active' check (status in ('active','review','trashed')),
  care_status text not null default 'in_wardrobe' check (care_status in ('in_wardrobe','tailor','dry_clean','lent','repair')),
  care_note text not null default '',
  care_due date,
  care_contact text not null default '',
  care_cost numeric(10,2) check (care_cost is null or care_cost >= 0),
  lent_to text not null default '',
  favorite boolean not null default false,
  auto_tagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists items_profile_idx on public.items(profile_id);
create index if not exists items_category_idx on public.items(category_id);

create table if not exists public.looks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 120),
  occasion text not null default '',
  notes text not null default '' check (char_length(notes) <= 2000),
  item_ids uuid[] not null default '{}',
  verdict jsonb,
  score int check (score is null or score between 0 and 10),
  board_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists looks_profile_idx on public.looks(profile_id);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  date date not null,
  occasion text not null default '',
  people text[] not null default '{}',
  look_id uuid references public.looks(id) on delete set null,
  notes text not null default '' check (char_length(notes) <= 2000),
  worn boolean not null default false
);
create index if not exists events_profile_idx on public.events(profile_id);
create index if not exists events_look_idx on public.events(look_id);

create table if not exists public.wears (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  item_ids uuid[] not null default '{}',
  look_id uuid references public.looks(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  note text not null default ''
);
create index if not exists wears_profile_idx on public.wears(profile_id);
create index if not exists wears_look_idx on public.wears(look_id);
create index if not exists wears_event_idx on public.wears(event_id);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  start_date date not null,
  end_date date not null,
  event_ids uuid[] not null default '{}',
  packing jsonb
);
create index if not exists trips_profile_idx on public.trips(profile_id);

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists items_touch on public.items;
create trigger items_touch before update on public.items for each row execute function public.touch_updated_at();
drop trigger if exists looks_touch on public.looks;
create trigger looks_touch before update on public.looks for each row execute function public.touch_updated_at();

-- RLS: open access model, stated explicitly per role and command
do $$
declare t text;
begin
  foreach t in array array['profiles','categories','items','looks','events','wears','trips'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "open read" on public.%I', t);
    execute format('drop policy if exists "open insert" on public.%I', t);
    execute format('drop policy if exists "open update" on public.%I', t);
    execute format('drop policy if exists "open delete" on public.%I', t);
    execute format('create policy "open read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "open insert" on public.%I for insert to anon, authenticated with check (true)', t);
    execute format('create policy "open update" on public.%I for update to anon, authenticated using (true) with check (true)', t);
    execute format('create policy "open delete" on public.%I for delete to anon, authenticated using (true)', t);
    execute format('alter table public.%I replica identity full', t);
  end loop;
end $$;

-- Realtime
do $$
declare t text;
begin
  foreach t in array array['profiles','categories','items','looks','events','wears','trips'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Storage: public-read bucket, images only, ≤ 8 MB, fixed path shape
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wardrobe', 'wardrobe', true, 8388608, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "wardrobe insert" on storage.objects;
drop policy if exists "wardrobe update" on storage.objects;
drop policy if exists "wardrobe delete" on storage.objects;
drop policy if exists "wardrobe select" on storage.objects;
create policy "wardrobe insert" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'wardrobe' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/(full|thumb|board)\.(webp|jpg|png)$');
create policy "wardrobe update" on storage.objects for update to anon, authenticated
  using (bucket_id = 'wardrobe') with check (bucket_id = 'wardrobe' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/(full|thumb|board)\.(webp|jpg|png)$');
-- select is needed so update/delete can find the object; it is scoped to this bucket only
create policy "wardrobe select" on storage.objects for select to anon, authenticated using (bucket_id = 'wardrobe');
create policy "wardrobe delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'wardrobe');
