-- Task delegation — Phase 1
-- Migration 006 · 21 July 2026
-- Lets a couple hand a single task to a helper by email (no account needed).
-- The helper opens a secure token link, marks it done + leaves a note, and the
-- update flows back into the couple's plan. "Complete the loop."
--
-- Only adds a new table. Nothing on existing tables is changed.

create table task_delegations (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  wedding_id uuid not null references weddings(id) on delete cascade,
  delegate_name text not null,
  delegate_email text not null,
  message text,                                   -- optional personal note from the couple
  token text not null unique,                     -- secret for the no-login helper link
  status text not null default 'sent'
    check (status in ('sent','viewed','done','declined')),
  reply_note text,                                -- the helper's note back to the couple
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  viewed_at timestamptz,
  completed_at timestamptz
);
create index task_delegations_wedding_idx on task_delegations (wedding_id);
create index task_delegations_task_idx on task_delegations (task_id);

-- ============ ROW LEVEL SECURITY ============
-- Couple members manage their own wedding's delegations. The helper never uses
-- RLS — the public edge function reads/writes by token via the service role.

alter table task_delegations enable row level security;

create policy "members manage delegations" on task_delegations for all
  using (is_couple_member(wedding_couple(wedding_id)))
  with check (is_couple_member(wedding_couple(wedding_id)));
