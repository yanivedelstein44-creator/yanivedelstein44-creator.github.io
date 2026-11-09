-- היומן שלנו 1.7 – תמונות באירועים. Safe to run more than once.
-- Photos live in a private Storage bucket, one folder per household; events.photos holds the file paths.

alter table public.events add column if not exists photos text[] not null default '{}';
do $$ begin
  alter table public.events add constraint events_photos_max check (coalesce(array_length(photos, 1), 0) <= 8);
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-photos', 'event-photos', false, 4194304, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 4194304, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists ph_select on storage.objects;
drop policy if exists ph_insert on storage.objects;
drop policy if exists ph_delete on storage.objects;
create policy ph_select on storage.objects for select to authenticated
  using (bucket_id = 'event-photos' and (storage.foldername(name))[1] = public.my_household()::text);
create policy ph_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'event-photos' and (storage.foldername(name))[1] = public.my_household()::text);
create policy ph_delete on storage.objects for delete to authenticated
  using (bucket_id = 'event-photos' and (storage.foldername(name))[1] = public.my_household()::text);

-- apply_ops: photos is editable
create or replace function public.apply_ops(p_ops jsonb) returns setof public.events
language plpgsql security invoker set search_path = public as $$
declare o jsonb; v_hh uuid := my_household(); r public.events;
  defaults constant jsonb := '{"kind":"event","all_day":false,"exdates":[],"reminders":[],"recur_interval":1,"kid_ids":[],"photos":[]}';
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
          shift_type_id, recur, recur_interval, recur_until, exdates, reminders, kid_ids, photos) =
        (select x.kind, x.title, x.category, x.owner_id, x.all_day, x.start_date, x.start_time, x.end_date, x.end_time, x.location, x.notes,
          x.shift_type_id, x.recur, x.recur_interval, x.recur_until, x.exdates, x.reminders, coalesce(x.kid_ids, '{}'), coalesce(x.photos, '{}')
           from jsonb_populate_record(e, o->'row') x)
      where e.id = (o->>'id')::uuid and e.household_id = v_hh
      returning e.* into r;
      if r.id is not null then return next r; end if;
    end if;
  end loop;
end $$;
