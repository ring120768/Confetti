-- Calendar feed token: a secret per wedding that lets a calendar app
-- subscribe to the plan without logging in. Unguessable UUID = the key.
alter table weddings add column if not exists ics_token uuid not null default gen_random_uuid();
create unique index if not exists weddings_ics_token_idx on weddings (ics_token);
