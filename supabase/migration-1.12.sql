-- 1.14 – רשימת קניות משותפת (shop_items) + שפה לכל משתמש (members.lang). Safe to run more than once.
create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  quantity numeric not null default 1 check (quantity > 0 and quantity <= 100000),
  unit text not null default 'יח׳' check (char_length(unit) <= 12),
  category text not null default 'other' check (char_length(category) <= 20),
  note text check (note is null or char_length(note) <= 300),
  bought boolean not null default false,
  bought_at timestamptz,
  bought_by uuid,
  added_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shop_items_household_idx on public.shop_items(household_id, bought, created_at);
alter table public.shop_items enable row level security;
drop policy if exists shop_all on public.shop_items;
create policy shop_all on public.shop_items for all to authenticated using (household_id = public.my_household()) with check (household_id = public.my_household());
grant select, insert, update, delete on public.shop_items to authenticated;
revoke all on public.shop_items from anon;

create or replace function public.shop_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if new.bought and not old.bought then
    new.bought_at := coalesce(new.bought_at, now());
    new.bought_by := coalesce(auth.uid(), new.bought_by);
  elsif not new.bought then
    new.bought_at := null; new.bought_by := null;
  end if;
  return new;
end $$;
drop trigger if exists trg_shop_touch on public.shop_items;
create trigger trg_shop_touch before update on public.shop_items for each row execute function public.shop_touch();

do $$ begin
  begin alter publication supabase_realtime add table public.shop_items; exception when duplicate_object then null; end;
end $$;

-- the language each person sees the app in (notifications and AI texts follow it)
alter table public.members add column if not exists lang text check (lang is null or lang in ('he', 'en'));
