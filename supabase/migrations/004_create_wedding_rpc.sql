-- Confetti — onboarding RPC.
-- One atomic call: couple -> membership -> wedding -> seeded, dated tasks.
-- Avoids the insert+select RLS chicken-and-egg (you can't read a couple
-- you're not yet a member of).

create or replace function create_wedding(
  p_wedding_date date default null,
  p_wedding_type text default 'uk',
  p_budget_total numeric default null,
  p_guest_estimate int default null,
  p_style text default null
) returns weddings
language plpgsql security definer set search_path = public as $$
declare
  c uuid;
  w weddings;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a wedding';
  end if;
  if exists (
    select 1 from couple_members cm join weddings wd on wd.couple_id = cm.couple_id
    where cm.user_id = auth.uid()
  ) then
    raise exception 'You already have a wedding plan';
  end if;

  insert into couples default values returning id into c;
  insert into couple_members (couple_id, user_id, role) values (c, auth.uid(), 'owner');
  insert into weddings (couple_id, wedding_date, wedding_type, budget_total, guest_estimate, style)
  values (c, p_wedding_date, p_wedding_type, p_budget_total, p_guest_estimate, p_style)
  returning * into w;

  perform seed_wedding_tasks(w.id);
  return w;
end;
$$;

revoke execute on function create_wedding from anon;
