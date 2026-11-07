-- היומן שלנו 1.4: children (name + emoji + colour), events can be tagged with one or more kids
-- Safe to run more than once.

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

-- change log row now carries the kids' names (for the feed and the partner's notification)
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

-- notification batch includes the kids' names
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

-- apply_ops: kid_ids is editable
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

do $$ begin
  begin alter publication supabase_realtime add table public.kids; exception when duplicate_object then null; end;
end $$;
