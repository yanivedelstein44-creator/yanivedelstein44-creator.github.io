-- היומן שלנו 1.1: quick templates (kind + icon), flexible tasks, task_delete op, orphan-guest cleanup
-- Safe to run more than once.

-- ---------- templates ----------
alter table public.shift_types add column if not exists kind text not null default 'shift' check (kind in ('shift','event'));
alter table public.shift_types add column if not exists icon text;
update public.shift_types set icon = case name when 'בוקר' then '☀️' when 'ערב' then '🌆' when 'לילה' then '🌙' end
 where icon is null and name in ('בוקר','ערב','לילה');
insert into public.shift_types(household_id, name, start_time, end_time, color, sort, kind, icon)
select h.id, x.name, x.st::time, x.et::time, '#cbd5e1', x.sort, x.kind, x.icon
  from public.households h
 cross join (values ('תורנות','08:00','08:00',4,'shift','🚨'), ('אימון','19:00','20:00',5,'event','🏋️')) as x(name, st, et, sort, kind, icon)
 where not exists (select 1 from public.shift_types s where s.household_id = h.id and s.name = x.name);

-- ---------- tasks (couple errands without a fixed time) ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  owner_id uuid references public.members(user_id) on delete set null,
  done boolean not null default false,
  done_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_household_idx on public.tasks(household_id, created_at);
alter table public.tasks enable row level security;
drop policy if exists tk_all on public.tasks;
create policy tk_all on public.tasks for all to authenticated using (household_id = public.my_household()) with check (household_id = public.my_household());
grant select, insert, update, delete on public.tasks to authenticated;
revoke all on public.tasks from anon;

create or replace function public.tasks_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.done and not old.done then new.done_at := coalesce(new.done_at, now());
  elsif not new.done then new.done_at := null; end if;
  return new;
end $$;
drop trigger if exists trg_tasks_touch on public.tasks;
create trigger trg_tasks_touch before update on public.tasks for each row execute function public.tasks_touch();

create or replace function public.tasks_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare v public.tasks; v_act text;
begin
  if coalesce(current_setting('app.silent', true), '') = 'on' then return null; end if;
  if tg_op = 'DELETE' then
    if old.done then return null; end if;            -- clearing finished tasks is silent
    v := old; v_act := 'delete';
  elsif tg_op = 'INSERT' then v := new; v_act := 'insert';
  else
    v := new;
    if new.done and not old.done then v_act := 'done';
    elsif new.title is distinct from old.title or new.owner_id is distinct from old.owner_id or (old.done and not new.done) then v_act := 'update';
    else return null; end if;
  end if;
  if not exists (select 1 from households where id = v.household_id) then return null; end if;
  insert into activity(household_id, actor_id, action, kind, title, event_id, owner_id)
  values (v.household_id, auth.uid(), v_act, 'task', v.title, v.id, v.owner_id);
  return null;
end $$;
drop trigger if exists trg_tasks_activity on public.tasks;
create trigger trg_tasks_activity after insert or update or delete on public.tasks for each row execute function public.tasks_activity();

-- ---------- RPCs ----------
create or replace function public.create_household(p_display_name text, p_gender text, p_color text, p_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_hh uuid; v_code text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select household_id into v_hh from members where user_id = v_uid;
  if v_hh is not null then return v_hh; end if;
  loop v_code := gen_code(); exit when not exists (select 1 from households where invite_code = v_code); end loop;
  insert into households(name, invite_code, created_by) values (coalesce(nullif(trim(p_name), ''), 'היומן שלנו'), v_code, v_uid) returning id into v_hh;
  insert into members(user_id, household_id, display_name, gender, color)
    values (v_uid, v_hh, left(trim(p_display_name), 40), case when p_gender = 'f' then 'f' else 'm' end, coalesce(p_color, '#4a78e0'));
  insert into shift_types(household_id, name, start_time, end_time, color, sort, kind, icon) values
    (v_hh, 'בוקר', '07:00', '15:00', '#cbd5e1', 1, 'shift', '☀️'),
    (v_hh, 'ערב', '15:00', '23:00', '#cbd5e1', 2, 'shift', '🌆'),
    (v_hh, 'לילה', '23:00', '07:00', '#cbd5e1', 3, 'shift', '🌙'),
    (v_hh, 'תורנות', '08:00', '08:00', '#cbd5e1', 4, 'shift', '🚨'),
    (v_hh, 'אימון', '19:00', '20:00', '#cbd5e1', 5, 'event', '🏋️');
  return v_hh;
end $$;

create or replace function public.join_household(p_code text, p_display_name text, p_gender text, p_color text, p_replace uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_hh uuid; v_old uuid; v_color text := p_color;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select id into v_hh from households where invite_code = upper(trim(p_code));
  if v_hh is null then raise exception 'קוד ההזמנה לא נמצא'; end if;
  select household_id into v_old from members where user_id = v_uid;
  if v_old = v_hh then return v_hh; end if;
  perform set_config('app.silent', 'on', true);
  if v_old is not null then
    delete from push_subs where user_id = v_uid;
    delete from members where user_id = v_uid;
    if not exists (select 1 from members where household_id = v_old) then delete from households where id = v_old; end if;
  end if;
  if (select count(*) from members where household_id = v_hh) >= 8 then raise exception 'ביומן הזה כבר יש 8 משתתפים'; end if;
  if p_replace is not null then
    select color into v_color from members where user_id = p_replace and household_id = v_hh;
    if v_color is null then v_color := p_color; end if;
  end if;
  insert into members(user_id, household_id, display_name, gender, color)
    values (v_uid, v_hh, left(trim(p_display_name), 40), case when p_gender = 'f' then 'f' else 'm' end, coalesce(v_color, '#d9607e'));
  if p_replace is not null and exists (select 1 from members where user_id = p_replace and household_id = v_hh) then
    update events set owner_id = v_uid where owner_id = p_replace and household_id = v_hh;
    update events set created_by = v_uid where created_by = p_replace and household_id = v_hh;
    update events set updated_by = v_uid where updated_by = p_replace and household_id = v_hh;
    update tasks set owner_id = v_uid where owner_id = p_replace and household_id = v_hh;
    update tasks set created_by = v_uid where created_by = p_replace and household_id = v_hh;
    update activity set actor_id = v_uid where actor_id = p_replace and household_id = v_hh;
    update members m set notify_changes = o.notify_changes, notify_reminders = o.notify_reminders, notify_daily = o.notify_daily,
      notify_weekly = o.notify_weekly, daily_hour = o.daily_hour, joined_at = o.joined_at
      from members o where o.user_id = p_replace and m.user_id = v_uid;
    delete from push_subs where user_id = p_replace;
    delete from members where user_id = p_replace;
  end if;
  return v_hh;
end $$;

-- Several changes in one call = one transaction = one notification to the partner.
-- task_delete: a task that was just placed in the calendar (silent, the new event is the news).
create or replace function public.apply_ops(p_ops jsonb) returns setof public.events
language plpgsql security invoker set search_path = public as $$
declare o jsonb; v_hh uuid := my_household(); r public.events;
  defaults constant jsonb := '{"kind":"event","all_day":false,"exdates":[],"reminders":[],"recur_interval":1}';
begin
  if v_hh is null then raise exception 'no household'; end if;
  for o in select * from jsonb_array_elements(p_ops) loop
    r := null;
    if o->>'op' = 'delete' then
      delete from events where id = (o->>'id')::uuid and household_id = v_hh;
    elsif o->>'op' = 'task_delete' then
      perform set_config('app.silent', 'on', true);
      delete from tasks where id = (o->>'id')::uuid and household_id = v_hh;
      perform set_config('app.silent', '', true);
    elsif o->>'op' = 'insert' then
      insert into events select * from jsonb_populate_record(null::public.events,
        defaults || (o->'row') || jsonb_build_object('id', gen_random_uuid(), 'household_id', v_hh,
          'created_by', auth.uid(), 'updated_by', auth.uid(), 'created_at', now(), 'updated_at', now()))
      returning * into r;
      return next r;
    elsif o->>'op' = 'update' then
      update events e set (kind, title, category, owner_id, all_day, start_date, start_time, end_date, end_time, location, notes,
          shift_type_id, recur, recur_interval, recur_until, exdates, reminders) =
        (select x.kind, x.title, x.category, x.owner_id, x.all_day, x.start_date, x.start_time, x.end_date, x.end_time, x.location, x.notes,
          x.shift_type_id, x.recur, x.recur_interval, x.recur_until, x.exdates, x.reminders
           from jsonb_populate_record(e, o->'row') x)
      where e.id = (o->>'id')::uuid and e.household_id = v_hh
      returning e.* into r;
      if r.id is not null then return next r; end if;
    end if;
  end loop;
end $$;

-- ---------- realtime ----------
do $$ begin
  begin alter publication supabase_realtime add table public.tasks; exception when duplicate_object then null; end;
end $$;

-- ---------- housekeeping: guests who opened the app but never created/joined a calendar ----------
select cron.schedule('hayoman-guest-cleanup', '23 3 * * *',
  $$delete from auth.users u where u.is_anonymous and u.created_at < now() - interval '3 days'
      and not exists (select 1 from public.members m where m.user_id = u.id)$$);
