-- היומן שלנו – Supabase schema 1.1 (run once in a fresh project; existing 1.0 projects: migration-1.1.sql)
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------- tables ----------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'היומן שלנו',
  invite_code text not null unique,
  tz text not null default 'Asia/Jerusalem',
  theme jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  gender text not null default 'm' check (gender in ('m','f')),
  color text not null default '#2563eb',
  notify_changes boolean not null default true,
  notify_reminders boolean not null default true,
  notify_daily boolean not null default true,
  notify_weekly boolean not null default true,
  daily_hour int not null default 7 check (daily_hour between 0 and 23),
  roster_name text constraint members_roster_name_len check (roster_name is null or char_length(roster_name) between 1 and 40),
  joined_at timestamptz not null default now()
);
create index if not exists members_household_idx on public.members(household_id);

create table if not exists public.shift_types (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  start_time time not null,
  end_time time not null,
  color text not null default '#cbd5e1',
  sort int not null default 0,
  kind text not null default 'shift' check (kind in ('shift','event')),
  icon text,
  created_at timestamptz not null default now()
);
create index if not exists shift_types_household_idx on public.shift_types(household_id);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  kind text not null default 'event' check (kind in ('event','shift')),
  title text not null check (char_length(title) between 1 and 200),
  category text,
  owner_id uuid references public.members(user_id) on delete set null,
  kid_ids uuid[] not null default '{}',
  all_day boolean not null default false,
  start_date date not null,
  start_time time,
  end_date date not null,
  end_time time,
  location text,
  notes text,
  shift_type_id uuid references public.shift_types(id) on delete set null,
  recur text check (recur in ('daily','weekly','monthly','yearly')),
  recur_interval int not null default 1 check (recur_interval between 1 and 99),
  recur_until date,
  exdates date[] not null default '{}',
  reminders int[] not null default '{}',
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists events_household_idx on public.events(household_id, start_date);
create index if not exists events_reminders_idx on public.events(household_id) where reminders <> '{}';

create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz not null default now(),
  last_ok timestamptz
);
create index if not exists push_subs_user_idx on public.push_subs(user_id);

create table if not exists public.activity (
  id bigint generated always as identity primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  actor_id uuid,
  action text not null,
  kind text,
  title text,
  event_id uuid,
  ev_date date,
  ev_time time,
  owner_id uuid,
  recur text,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists activity_household_idx on public.activity(household_id, id desc);

create table if not exists public.reminder_log (
  event_id uuid not null,
  occ_key text not null,
  offset_min int not null,
  sent_at timestamptz not null default now(),
  primary key (event_id, occ_key, offset_min)
);

create table if not exists public.digest_log (
  user_id uuid not null,
  kind text not null,
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, day)
);

-- ---------- helpers ----------
create or replace function public.my_household() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from public.members where user_id = auth.uid()
$$;

create or replace function public.gen_code() returns text
language plpgsql volatile as $$
declare chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; r text := ''; i int;
begin
  for i in 1..6 loop r := r || substr(chars, 1 + floor(random() * length(chars))::int, 1); end loop;
  return r;
end $$;

-- ---------- RLS ----------
alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.shift_types enable row level security;
alter table public.events enable row level security;
alter table public.push_subs enable row level security;
alter table public.activity enable row level security;
alter table public.reminder_log enable row level security;
alter table public.digest_log enable row level security;

drop policy if exists hh_select on public.households;
create policy hh_select on public.households for select to authenticated using (id = public.my_household());
drop policy if exists hh_update on public.households;
create policy hh_update on public.households for update to authenticated using (id = public.my_household()) with check (id = public.my_household());

drop policy if exists mem_select on public.members;
create policy mem_select on public.members for select to authenticated using (household_id = public.my_household());
drop policy if exists mem_update on public.members;
create policy mem_update on public.members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and household_id = public.my_household());

drop policy if exists st_all on public.shift_types;
create policy st_all on public.shift_types for all to authenticated using (household_id = public.my_household()) with check (household_id = public.my_household());

drop policy if exists ev_all on public.events;
create policy ev_all on public.events for all to authenticated using (household_id = public.my_household()) with check (household_id = public.my_household());

drop policy if exists ps_select on public.push_subs;
create policy ps_select on public.push_subs for select to authenticated using (user_id = auth.uid());
drop policy if exists ps_delete on public.push_subs;
create policy ps_delete on public.push_subs for delete to authenticated using (user_id = auth.uid());

drop policy if exists act_select on public.activity;
create policy act_select on public.activity for select to authenticated using (household_id = public.my_household());
-- reminder_log / digest_log: no policies (service role only)

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

-- ---------- kids ----------
create table if not exists public.kids (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  emoji text,
  color text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists kids_household_idx on public.kids(household_id, sort);
alter table public.kids enable row level security;
drop policy if exists kd_all on public.kids;
create policy kd_all on public.kids for all to authenticated using (household_id = public.my_household()) with check (household_id = public.my_household());
grant select, insert, update, delete on public.kids to authenticated;
revoke all on public.kids from anon;

alter table public.events add column if not exists kid_ids uuid[] not null default '{}';
alter table public.activity add column if not exists kids text;

-- a removed child disappears from the events it was tagged on (silently)
create or replace function public.kids_cleanup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.silent', 'on', true);
  update events set kid_ids = array_remove(kid_ids, old.id) where household_id = old.household_id and old.id = any(kid_ids);
  perform set_config('app.silent', '', true);
  return null;
end $$;
drop trigger if exists trg_kids_cleanup on public.kids;
create trigger trg_kids_cleanup after delete on public.kids for each row execute function public.kids_cleanup();

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

create or replace function public.household_preview(p_code text)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_id uuid; v_name text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id, name into v_id, v_name from households where invite_code = upper(trim(p_code));
  if v_id is null then return null; end if;
  return json_build_object('id', v_id, 'name', v_name, 'members',
    (select coalesce(json_agg(json_build_object('user_id', user_id, 'display_name', display_name, 'color', color) order by joined_at), '[]'::json)
       from members where household_id = v_id));
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

create or replace function public.leave_household() returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_hh uuid;
begin
  select household_id into v_hh from members where user_id = v_uid;
  if v_hh is null then return; end if;
  perform set_config('app.silent', 'on', true);
  delete from push_subs where user_id = v_uid;
  delete from members where user_id = v_uid;
  if not exists (select 1 from members where household_id = v_hh) then delete from households where id = v_hh; end if;
end $$;

create or replace function public.regenerate_invite() returns text
language plpgsql security definer set search_path = public as $$
declare v_hh uuid := my_household(); v_code text;
begin
  if v_hh is null then raise exception 'no household'; end if;
  loop v_code := gen_code(); exit when not exists (select 1 from households where invite_code = v_code); end loop;
  update households set invite_code = v_code where id = v_hh;
  return v_code;
end $$;

create or replace function public.save_push_sub(p_endpoint text, p_p256dh text, p_auth text, p_ua text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_hh uuid := my_household();
begin
  if auth.uid() is null or v_hh is null then raise exception 'no household'; end if;
  insert into push_subs(endpoint, user_id, household_id, p256dh, auth, ua)
  values (p_endpoint, auth.uid(), v_hh, p_p256dh, p_auth, left(p_ua, 200))
  on conflict (endpoint) do update set user_id = excluded.user_id, household_id = excluded.household_id,
    p256dh = excluded.p256dh, auth = excluded.auth, ua = excluded.ua, created_at = now();
end $$;

-- Several changes in one call = one transaction = one notification to the partner.
create or replace function public.apply_ops(p_ops jsonb) returns setof public.events
language plpgsql security invoker set search_path = public as $$
declare o jsonb; v_hh uuid := my_household(); r public.events;
  defaults constant jsonb := '{"kind":"event","all_day":false,"exdates":[],"reminders":[],"recur_interval":1,"kid_ids":[]}';
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
          shift_type_id, recur, recur_interval, recur_until, exdates, reminders, kid_ids) =
        (select x.kind, x.title, x.category, x.owner_id, x.all_day, x.start_date, x.start_time, x.end_date, x.end_time, x.location, x.notes,
          x.shift_type_id, x.recur, x.recur_interval, x.recur_until, x.exdates, x.reminders, coalesce(x.kid_ids, '{}')
           from jsonb_populate_record(e, o->'row') x)
      where e.id = (o->>'id')::uuid and e.household_id = v_hh
      returning e.* into r;
      if r.id is not null then return next r; end if;
    end if;
  end loop;
end $$;

-- ---------- triggers ----------
create or replace function public.events_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end $$;
drop trigger if exists trg_events_touch on public.events;
create trigger trg_events_touch before update on public.events for each row execute function public.events_touch();

create or replace function public.events_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare v public.events; v_act text; v_kids text;
begin
  if coalesce(current_setting('app.silent', true), '') = 'on' then return null; end if;
  if tg_op = 'DELETE' then v := old; v_act := 'delete';
  elsif tg_op = 'INSERT' then v := new; v_act := 'insert';
  else
    v := new; v_act := 'update';
    if (to_jsonb(new) - 'updated_at' - 'updated_by') = (to_jsonb(old) - 'updated_at' - 'updated_by') then return null; end if;
  end if;
  if not exists (select 1 from households where id = v.household_id) then return null; end if;
  if coalesce(array_length(v.kid_ids, 1), 0) > 0 then
    select string_agg(coalesce(k.emoji || ' ', '') || k.name, ', ' order by k.sort, k.created_at) into v_kids
      from kids k where k.id = any(v.kid_ids) and k.household_id = v.household_id;
  end if;
  insert into activity(household_id, actor_id, action, kind, title, event_id, ev_date, ev_time, owner_id, recur, kids)
  values (v.household_id, auth.uid(), v_act, v.kind, v.title, v.id, v.start_date,
          case when v.all_day then null else v.start_time end, v.owner_id, v.recur, v_kids);
  return null;
end $$;
drop trigger if exists trg_events_activity on public.events;
create trigger trg_events_activity after insert or update or delete on public.events for each row execute function public.events_activity();

-- At commit time: one push per transaction to the other members.
create or replace function public.activity_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_items jsonb; v_url text; v_secret text;
begin
  if new.actor_id is null then return null; end if;
  if not exists (select 1 from activity where id = new.id and notified = false) then return null; end if;
  with batch as (
    update activity set notified = true
     where household_id = new.household_id and actor_id = new.actor_id and notified = false and created_at = new.created_at
    returning id, action, kind, title, ev_date, ev_time, owner_id, recur, event_id, kids
  )
  select jsonb_agg(to_jsonb(batch) order by batch.id) into v_items from batch;
  if v_items is null then return null; end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'hook_secret';
  if v_url is null or v_secret is null then return null; end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('type', 'change', 'household_id', new.household_id, 'actor_id', new.actor_id, 'items', v_items),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', v_secret),
    timeout_milliseconds := 15000);
  return null;
end $$;
drop trigger if exists trg_activity_notify on public.activity;
create constraint trigger trg_activity_notify after insert on public.activity
  deferrable initially deferred for each row execute function public.activity_notify();

-- ---------- realtime ----------
do $$ begin
  begin alter publication supabase_realtime add table public.events; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.shift_types; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.members; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.activity; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.tasks; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.households; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.kids; exception when duplicate_object then null; end;
end $$;

-- ---------- grants ----------
revoke all on function public.gen_code() from public, anon;
grant execute on function public.create_household(text, text, text, text) to authenticated;
grant execute on function public.household_preview(text) to authenticated;
grant execute on function public.join_household(text, text, text, text, uuid) to authenticated;
grant execute on function public.leave_household() to authenticated;
grant execute on function public.regenerate_invite() to authenticated;
grant execute on function public.save_push_sub(text, text, text, text) to authenticated;
grant execute on function public.apply_ops(jsonb) to authenticated;
revoke execute on function public.create_household(text, text, text, text) from anon;
revoke execute on function public.household_preview(text) from anon;
revoke execute on function public.join_household(text, text, text, text, uuid) from anon;
revoke execute on function public.leave_household() from anon;
revoke execute on function public.regenerate_invite() from anon;
revoke execute on function public.save_push_sub(text, text, text, text) from anon;
revoke execute on function public.apply_ops(jsonb) from anon;

-- ---------- housekeeping: guests who opened the app but never created/joined a calendar ----------
select cron.schedule('hayoman-guest-cleanup', '23 3 * * *',
  $$delete from auth.users u where u.is_anonymous and u.created_at < now() - interval '3 days'
      and not exists (select 1 from public.members m where m.user_id = u.id)$$);

-- ---------- "מתמונה ליומן": log for the daily cap (Edge Function 'scan', service role only) ----------
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
alter table public.scan_log enable row level security;
revoke all on public.scan_log from anon, authenticated;
select cron.schedule('hayoman-scanlog-cleanup', '41 3 * * *',
  $$delete from public.scan_log where created_at < now() - interval '60 days'$$);
