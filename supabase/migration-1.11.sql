-- היומן שלנו 1.11 – רכבים (טסט, ק"מ, טיפולים, ביטוח, אגרה). Safe to run more than once.
create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  plate text check (plate is null or char_length(plate) <= 12),
  owner_id uuid references public.members(user_id) on delete set null,  -- null = shared
  km int check (km is null or km between 0 and 2000000),                -- current odometer
  km_date date,                                                         -- when km was last updated
  test_date date,                                                       -- next annual test (טסט)
  license_date date,                                                    -- license fee (אגרת רישוי) valid until
  ins_date date,                                                        -- insurance valid until
  ins_name text check (ins_name is null or char_length(ins_name) <= 40),
  svc_km int check (svc_km is null or svc_km between 1 and 200000),     -- service every N km
  svc_months int check (svc_months is null or svc_months between 1 and 60), -- or every N months
  km_remind boolean not null default true,                              -- monthly "what's the km?" reminder
  notes text check (notes is null or char_length(notes) <= 500),
  ev_ids jsonb not null default '{}'::jsonb,                            -- calendar events kept in sync: {test,lic,ins,svc,km} -> event id
  services jsonb not null default '[]'::jsonb,                          -- [{id,date,km,title,cost}]
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cars_household_idx on public.cars(household_id, sort);
alter table public.cars enable row level security;
drop policy if exists cars_all on public.cars;
create policy cars_all on public.cars for all to authenticated using (household_id = public.my_household()) with check (household_id = public.my_household());
grant select, insert, update, delete on public.cars to authenticated;
revoke all on public.cars from anon;
do $$ begin
  begin alter publication supabase_realtime add table public.cars; exception when duplicate_object then null; end;
end $$;
