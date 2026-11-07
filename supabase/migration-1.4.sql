-- היומן שלנו 1.5 – "מתמונה ליומן" (Gemini): how my name is written in work rosters + a log for the daily cap.
-- Safe to run more than once.

alter table public.members add column if not exists roster_name text;
do $$ begin
  alter table public.members add constraint members_roster_name_len check (roster_name is null or char_length(roster_name) between 1 and 40);
exception when duplicate_object then null; end $$;

create table if not exists public.scan_log (
  id bigint generated always as identity primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  items int not null default 0,
  ok boolean not null default false,
  error text
);
create index if not exists scan_log_household_time on public.scan_log (household_id, created_at desc);
alter table public.scan_log enable row level security;  -- no policies: only the Edge Function (service role) reads/writes it
revoke all on public.scan_log from anon, authenticated;

-- keep the log short
select cron.schedule('hayoman-scanlog-cleanup', '41 3 * * *',
  $$delete from public.scan_log where created_at < now() - interval '60 days'$$);
