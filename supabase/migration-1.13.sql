-- 1.15 – רשימת הקניות כמו "הקניות שלנו": תמונה לפריט, אווטר לכל אחד, רשימות מוכנות משותפות, התראה מרוכזת על הרשימה.
-- Safe to run more than once.

-- a photo per item (same private bucket as the event photos: <household>/shop/<uuid>.jpg)
alter table public.shop_items add column if not exists photo_path text;
do $$ begin
  alter table public.shop_items add constraint shop_items_photo_len check (photo_path is null or char_length(photo_path) <= 200);
exception when duplicate_object then null; end $$;

-- each person's drawn avatar (a1…a12; empty = by pronoun)
alter table public.members add column if not exists avatar text;
do $$ begin
  alter table public.members add constraint members_avatar_chk check (avatar is null or avatar ~ '^a([1-9]|1[0-2])$');
exception when duplicate_object then null; end $$;

-- the household's ready-made shopping lists: { list: [{id, name, items}], hidden: [built-in ids] }
alter table public.households add column if not exists shop_tpl jsonb;

-- shopping-list notifications: "added" and "bought" go to the activity log with kind 'shop'.
-- They are not sent at once: the push function's minute tick sends one push per person,
-- about a minute after they stop changing the list (adding 10 items = 1 notification).
create or replace function public.shop_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_act text;
begin
  if coalesce(current_setting('app.silent', true), '') = 'on' then return null; end if;
  if tg_op = 'DELETE' then
    -- removed before the push went out: nothing to tell
    delete from activity where kind = 'shop' and event_id = old.id and notified = false;
    return null;
  end if;
  if auth.uid() is null then return null; end if;
  if tg_op = 'INSERT' then
    if new.bought then return null; end if;           -- undo of "ניקוי" puts bought items back: silent
    v_act := 'insert';
  elsif new.bought and not old.bought then v_act := 'bought';
  else return null; end if;
  insert into activity(household_id, actor_id, action, kind, title, event_id)
  values (new.household_id, auth.uid(), v_act, 'shop', new.name, new.id);
  return null;
end $$;
drop trigger if exists trg_shop_activity on public.shop_items;
create trigger trg_shop_activity after insert or update or delete on public.shop_items for each row execute function public.shop_activity();
create index if not exists activity_shop_pending_idx on public.activity(created_at) where kind = 'shop' and notified = false;

-- calendar changes still go out at commit time; shopping rows wait for the tick
create or replace function public.activity_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_items jsonb; v_url text; v_secret text;
begin
  if new.actor_id is null or new.kind = 'shop' then return null; end if;
  if not exists (select 1 from activity where id = new.id and notified = false) then return null; end if;
  with batch as (
    update activity set notified = true
     where household_id = new.household_id and actor_id = new.actor_id and notified = false and created_at = new.created_at
       and kind is distinct from 'shop'
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
