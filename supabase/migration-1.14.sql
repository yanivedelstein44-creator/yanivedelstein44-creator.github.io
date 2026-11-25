-- 1.16 – חיות מחמד, צמחים, מטלות הבית, והפאנל העליון של כל אחד. Safe to run more than once.

-- each animal / aquarium / plant. Kind-specific details live in info (chip, vet, volume, fish, light, soil, pot, fertilizer…)
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  kind text not null check (kind in ('dog','cat','parrot','fish','rabbit','hamster','snake','plant')),
  name text not null check (char_length(name) between 1 and 40),
  breed text check (breed is null or char_length(breed) <= 60),          -- breed / species ("לברדור", "מונסטרה")
  birthday date,                                                         -- birthday, or the day a plant came home
  avatar text check (avatar is null or char_length(avatar) <= 8),        -- drawn avatar variant (d1, c2, g3…)
  photo_path text check (photo_path is null or char_length(photo_path) <= 200),
  info jsonb not null default '{}'::jsonb,
  supplies jsonb not null default '[]'::jsonb,                           -- [{id, name, note}] → "נגמר" adds to the shopping list
  notes text check (notes is null or char_length(notes) <= 1000),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pets_household_idx on public.pets(household_id, sort);

-- household chores, and the care tasks of pets and plants (pet_id set).
-- every = repeat every N days (null = one-off); every_w = winter interval (plants); next_date = when it is due.
create table if not exists public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  room text check (room is null or char_length(room) <= 20),
  pet_id uuid references public.pets(id) on delete cascade,
  key text check (key is null or char_length(key) <= 20),               -- preset key (walk, feed, water, filter, rabies…)
  every int check (every is null or every between 1 and 1100),
  every_w int check (every_w is null or every_w between 1 and 1100),
  slot text check (slot is null or slot in ('am','pm')),
  time text check (time is null or time ~ '^[0-2][0-9]:[0-5][0-9]$'),     -- reminder time (else: all-day, a day before)
  next_date date,
  assignee uuid references public.members(user_id) on delete set null,  -- null = whoever
  rot boolean not null default false,                                    -- take turns
  rot_last uuid,                                                         -- who did it last (for turns)
  amount numeric check (amount is null or (amount >= 0 and amount <= 1000000)),
  unit text check (unit is null or char_length(unit) <= 10),
  cal boolean not null default false,                                    -- keep a calendar event with reminders
  ev_id uuid,
  active boolean not null default true,
  done_at timestamptz,
  done_by uuid,
  note text check (note is null or char_length(note) <= 300),
  sort int not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chores_household_idx on public.chores(household_id, next_date);
create index if not exists chores_pet_idx on public.chores(pet_id);

-- what was done and measured: done, skip, weight, water tests, temperature / humidity, shed, feeding…
create table if not exists public.care_log (
  id bigint generated always as identity primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  chore_id uuid references public.chores(id) on delete set null,
  pet_id uuid references public.pets(id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 20),
  value numeric,
  data jsonb not null default '{}'::jsonb,
  at timestamptz not null default now(),
  by uuid default auth.uid()
);
create index if not exists care_log_household_idx on public.care_log(household_id, at desc);
create index if not exists care_log_pet_idx on public.care_log(pet_id, at desc);

-- each person's top panel: which shortcuts to show (the rest stay in "עוד")
alter table public.members add column if not exists panel text[];
do $$ begin
  alter table public.members add constraint members_panel_len check (panel is null or cardinality(panel) <= 6);
exception when duplicate_object then null; end $$;

do $$
declare t text;
begin
  foreach t in array array['pets','chores','care_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_all', t);
    execute format('create policy %I on public.%I for all to authenticated using (household_id = public.my_household()) with check (household_id = public.my_household())', t || '_all', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
    begin execute format('alter publication supabase_realtime add table public.%I', t); exception when duplicate_object then null; end;
  end loop;
end $$;
