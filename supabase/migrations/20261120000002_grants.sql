-- This project does not grant table privileges to anon/authenticated by default, so RLS
-- policies alone are not enough. Grant exactly the commands the open access model uses.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table
  public.profiles, public.categories, public.items, public.looks, public.events, public.wears, public.trips
  to anon, authenticated;
