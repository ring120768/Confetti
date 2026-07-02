-- Confetti — policy repair. Idempotent: safe to run any number of times.
-- Drops and recreates every RLS policy and helper function.

create or replace function is_couple_member(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from couple_members
    where couple_id = c and user_id = auth.uid()
  );
$$;

create or replace function wedding_couple(w uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from weddings where id = w;
$$;

alter table couples        enable row level security;
alter table couple_members enable row level security;
alter table weddings       enable row level security;
alter table task_library   enable row level security;
alter table tasks          enable row level security;
alter table guests         enable row level security;
alter table suppliers      enable row level security;
alter table budget_items   enable row level security;
alter table ai_messages    enable row level security;
alter table subscriptions  enable row level security;

drop policy if exists "members read couple"   on couples;
drop policy if exists "anyone creates couple" on couples;
create policy "members read couple"   on couples for select using (is_couple_member(id));
create policy "anyone creates couple" on couples for insert to authenticated with check (true);

drop policy if exists "members read membership" on couple_members;
drop policy if exists "self join couple"        on couple_members;
drop policy if exists "self leave couple"       on couple_members;
create policy "members read membership" on couple_members for select using (is_couple_member(couple_id));
create policy "self join couple"        on couple_members for insert to authenticated with check (user_id = auth.uid());
create policy "self leave couple"       on couple_members for delete using (user_id = auth.uid());

drop policy if exists "members full access" on weddings;
create policy "members full access" on weddings for all
  using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));

drop policy if exists "library readable" on task_library;
create policy "library readable" on task_library for select to authenticated using (true);

drop policy if exists "members full access" on tasks;
create policy "members full access" on tasks for all
  using (is_couple_member(wedding_couple(wedding_id))) with check (is_couple_member(wedding_couple(wedding_id)));

drop policy if exists "members full access" on guests;
create policy "members full access" on guests for all
  using (is_couple_member(wedding_couple(wedding_id))) with check (is_couple_member(wedding_couple(wedding_id)));

drop policy if exists "members full access" on suppliers;
create policy "members full access" on suppliers for all
  using (is_couple_member(wedding_couple(wedding_id))) with check (is_couple_member(wedding_couple(wedding_id)));

drop policy if exists "members full access" on budget_items;
create policy "members full access" on budget_items for all
  using (is_couple_member(wedding_couple(wedding_id))) with check (is_couple_member(wedding_couple(wedding_id)));

drop policy if exists "members full access" on ai_messages;
create policy "members full access" on ai_messages for all
  using (is_couple_member(wedding_couple(wedding_id))) with check (is_couple_member(wedding_couple(wedding_id)));

drop policy if exists "members read subscription" on subscriptions;
create policy "members read subscription" on subscriptions for select using (is_couple_member(couple_id));

-- Engine functions (recreated here too, in case the original migration stopped early)
create or replace function recompute_task_dates(w uuid)
returns void language plpgsql security definer set search_path = public as $$
declare wd date;
begin
  select wedding_date into wd from weddings where id = w;
  if wd is null then
    update tasks set computed_date = null where wedding_id = w;
  else
    update tasks t
    set computed_date = wd - (tl.lead_weeks * 7)
    from task_library tl
    where t.wedding_id = w and t.library_id = tl.id;
  end if;
end;
$$;

create or replace function seed_wedding_tasks(w uuid)
returns void language plpgsql security definer set search_path = public as $$
declare wt text;
begin
  select wedding_type into wt from weddings where id = w;
  insert into tasks (wedding_id, library_id, title, category)
  select w, tl.id, tl.title, tl.category
  from task_library tl
  where wt = any(tl.wedding_types)
  on conflict (wedding_id, library_id) do nothing;
  perform recompute_task_dates(w);
end;
$$;

-- Quick health check: run this after — you should see ~14 policies listed.
select tablename, policyname
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
