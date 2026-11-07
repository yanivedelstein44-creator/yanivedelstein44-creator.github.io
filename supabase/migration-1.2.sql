-- היומן שלנו 1.2: shared calendar theme ("שמירה לשנינו"), pushed live to the partner
alter table public.households add column if not exists theme jsonb;
do $$ begin
  begin alter publication supabase_realtime add table public.households; exception when duplicate_object then null; end;
end $$;
