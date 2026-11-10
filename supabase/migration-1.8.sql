-- היומן שלנו 1.9b – התראה לאירוע (נפרדת מהתזכורת): שעות, נמען וסוג. Safe to run more than once.
alter table public.events add column if not exists alerts int[] not null default '{}';   -- התראה: minutes before start (separate from reminders)
alter table public.events add column if not exists remind_to text;     -- null = default (owner, or both if shared) | 'both' | a member user id
alter table public.events add column if not exists remind_style text;  -- null = default | 'strong' | 'normal' | 'quiet'
do $$ begin
  alter table public.events add constraint events_remind_style_chk check (remind_style is null or remind_style in ('strong','normal','quiet'));
exception when duplicate_object then null; end $$;

create or replace function public.apply_ops(p_ops jsonb) returns setof public.events
language plpgsql security invoker set search_path = public as $$
declare o jsonb; v_hh uuid := my_household(); r public.events;
  defaults constant jsonb := '{"kind":"event","all_day":false,"exdates":[],"reminders":[],"alerts":[],"recur_interval":1,"kid_ids":[],"photos":[]}';
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
          shift_type_id, recur, recur_interval, recur_until, exdates, reminders, kid_ids, photos, alerts, remind_to, remind_style) =
        (select x.kind, x.title, x.category, x.owner_id, x.all_day, x.start_date, x.start_time, x.end_date, x.end_time, x.location, x.notes,
          x.shift_type_id, x.recur, x.recur_interval, x.recur_until, x.exdates, x.reminders, coalesce(x.kid_ids, '{}'), coalesce(x.photos, '{}'), coalesce(x.alerts, '{}'), x.remind_to, x.remind_style
           from jsonb_populate_record(e, o->'row') x)
      where e.id = (o->>'id')::uuid and e.household_id = v_hh
      returning e.* into r;
      if r.id is not null then return next r; end if;
    end if;
  end loop;
end $$;
