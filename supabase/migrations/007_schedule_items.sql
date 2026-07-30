-- On-the-Day Running Order — the wedding-day schedule
-- Migration 007 · 30 July 2026
-- A timed, editable running order for the day (hair & makeup → ceremony →
-- speeches → first dance). Buzz can draft it; the couple edits it. The supplier
-- contacts sheet renders from the existing suppliers table (no new fields).
--
-- Only adds a new table. Nothing on existing tables is changed.

create table schedule_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  time text,                                   -- 'HH:MM' 24h; null = unscheduled
  title text not null,
  who text,                                    -- who's responsible / point person
  note text,
  category text not null default 'general',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index schedule_items_wedding_idx on schedule_items (wedding_id, time);

alter table schedule_items enable row level security;

create policy "members manage schedule" on schedule_items for all
  using (is_couple_member(wedding_couple(wedding_id)))
  with check (is_couple_member(wedding_couple(wedding_id)));
