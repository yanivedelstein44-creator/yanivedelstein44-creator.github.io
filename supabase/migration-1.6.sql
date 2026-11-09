-- היומן שלנו 1.8 – תזכורת למשימה: שעה, נמען וסוג התראה. Safe to run more than once.

alter table public.tasks add column if not exists remind_at timestamptz;
alter table public.tasks add column if not exists remind_to uuid references public.members(user_id) on delete set null;  -- null = both of you
alter table public.tasks add column if not exists remind_style text not null default 'strong';
do $$ begin
  alter table public.tasks add constraint tasks_remind_style_chk check (remind_style in ('strong','normal','quiet'));
exception when duplicate_object then null; end $$;
create index if not exists tasks_remind_idx on public.tasks (remind_at) where remind_at is not null;

-- one row per task reminder already sent (so a retried minute never notifies twice)
create table if not exists public.task_reminder_log (
  task_id uuid not null references public.tasks(id) on delete cascade,
  remind_at timestamptz not null,
  sent_at timestamptz not null default now(),
  primary key (task_id, remind_at)
);
alter table public.task_reminder_log enable row level security;  -- no policies: only the Edge Function (service role)
revoke all on public.task_reminder_log from anon, authenticated;

-- which members of my household have at least one device that can receive notifications (ids only)
create or replace function public.household_push_users() returns setof uuid
language sql stable security definer set search_path = public as $$
  select distinct user_id from push_subs where household_id = my_household()
$$;
revoke all on function public.household_push_users() from public, anon;
grant execute on function public.household_push_users() to authenticated;
