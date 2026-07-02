-- Confetti — initial schema
-- Migration 001 · 2026-07-02
-- Design notes: one couple = one wedding (v1). All user data isolated per couple via RLS.

-- ============ CORE ============

create table couples (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table couple_members (
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'partner' check (role in ('owner','partner','helper')),
  created_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table weddings (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  wedding_date date,                          -- nullable: "no date yet" mode
  wedding_type text not null default 'uk' check (wedding_type in ('uk','destination')),
  budget_total numeric(10,2),
  guest_estimate int,
  style text,                                 -- free text: "rustic barn", etc.
  created_at timestamptz not null default now(),
  unique (couple_id)                          -- v1: one wedding per couple
);

-- ============ TASK LIBRARY (global, read-only to users) ============

create table task_library (
  id text primary key,                        -- e.g. 'venue-004'
  title text not null,
  category text not null,
  phase text not null check (phase in ('just-engaged','big-decisions','details','final-countdown','the-day','after')),
  lead_weeks int not null,                    -- weeks before wedding task should be complete (negative = after)
  duration_weeks int not null default 1,
  priority text not null check (priority in ('essential','recommended','optional')),
  depends_on text[] not null default '{}',
  guidance text not null,
  typical_cost_gbp text,
  ask_suppliers jsonb not null default '[]',
  wedding_types text[] not null default '{uk,destination}',
  library_version text not null default '1.1'
);

-- ============ PER-WEDDING DATA ============

create table tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  library_id text references task_library(id),  -- null = custom task
  title text not null,
  category text not null default 'admin',
  status text not null default 'todo' check (status in ('todo','in_progress','done','skipped')),
  pinned_date date,                           -- user-set date; overrides computed
  computed_date date,                         -- engine-set: wedding_date - lead_weeks
  assignee uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, library_id)             -- library task instantiated once per wedding
);
create index tasks_wedding_idx on tasks (wedding_id, status);

create table guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  household text,
  full_name text not null,
  invite_type text not null default 'day' check (invite_type in ('day','evening')),
  rsvp_status text not null default 'pending' check (rsvp_status in ('pending','yes','no')),
  dietary text,
  email text,
  address text,
  is_child boolean not null default false,
  plus_one_of uuid references guests(id),
  created_at timestamptz not null default now()
);
create index guests_wedding_idx on guests (wedding_id);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  category text not null,
  name text not null,
  stage text not null default 'researching' check (stage in ('researching','enquired','quoted','booked','rejected')),
  contact_email text,
  phone text,
  quote_amount numeric(10,2),
  notes text,
  created_at timestamptz not null default now()
);
create index suppliers_wedding_idx on suppliers (wedding_id);

create table budget_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  category text not null,
  name text not null,
  estimated numeric(10,2),
  quoted numeric(10,2),
  paid numeric(10,2) not null default 0,
  due_date date,
  supplier_id uuid references suppliers(id) on delete set null,
  created_at timestamptz not null default now()
);
create index budget_wedding_idx on budget_items (wedding_id);

create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('user','assistant')),
  content text not null,
  tokens int,
  created_at timestamptz not null default now()
);
create index ai_messages_wedding_idx on ai_messages (wedding_id, created_at);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','sparkle','luxe')),
  status text not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  unique (couple_id)
);

-- ============ ROW LEVEL SECURITY ============

-- membership check used by every policy
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

alter table couples          enable row level security;
alter table couple_members   enable row level security;
alter table weddings         enable row level security;
alter table task_library     enable row level security;
alter table tasks            enable row level security;
alter table guests           enable row level security;
alter table suppliers        enable row level security;
alter table budget_items     enable row level security;
alter table ai_messages      enable row level security;
alter table subscriptions    enable row level security;

create policy "members read couple"   on couples for select using (is_couple_member(id));
create policy "anyone creates couple" on couples for insert with check (true);

create policy "members read membership" on couple_members for select using (is_couple_member(couple_id));
create policy "self join couple"        on couple_members for insert with check (user_id = auth.uid());
create policy "self leave couple"       on couple_members for delete using (user_id = auth.uid());

create policy "members full access" on weddings for all
  using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));

create policy "library readable" on task_library for select to authenticated using (true);

create policy "members full access" on tasks for all
  using (is_couple_member(wedding_couple(wedding_id))) with check (is_couple_member(wedding_couple(wedding_id)));
create policy "members full access" on guests for all
  using (is_couple_member(wedding_couple(wedding_id))) with check (is_couple_member(wedding_couple(wedding_id)));
create policy "members full access" on suppliers for all
  using (is_couple_member(wedding_couple(wedding_id))) with check (is_couple_member(wedding_couple(wedding_id)));
create policy "members full access" on budget_items for all
  using (is_couple_member(wedding_couple(wedding_id))) with check (is_couple_member(wedding_couple(wedding_id)));
create policy "members full access" on ai_messages for all
  using (is_couple_member(wedding_couple(wedding_id))) with check (is_couple_member(wedding_couple(wedding_id)));

create policy "members read subscription" on subscriptions for select using (is_couple_member(couple_id));
-- writes to subscriptions happen only via service role (Stripe webhook edge function)

-- ============ LEAD-TIME ENGINE (v1: date computation in SQL) ============

-- Recompute task dates for a wedding (call after wedding_date changes or tasks seeded)
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

-- Instantiate library tasks for a wedding, filtered by its wedding_type
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
