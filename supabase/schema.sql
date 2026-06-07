create table if not exists financial_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null check (
    category in (
      'stocks',
      'mutual_funds',
      'crypto',
      'fixed_deposit',
      'real_estate',
      'gold',
      'cash',
      'other'
    )
  ),
  current_value numeric(14,2) not null check (current_value >= 0),
  invested_amount numeric(14,2) check (invested_amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_financial_assets_user_id on financial_assets (user_id);

alter table financial_assets enable row level security;

create policy "financial_assets_owner_read_write" on financial_assets
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists financial_asset_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  asset_id uuid references financial_assets (id) on delete set null,
  action text not null check (action in ('create', 'update', 'delete')),
  before_value numeric(14,2),
  after_value numeric(14,2),
  payload_before jsonb,
  payload_after jsonb,
  created_at timestamptz not null default now()
);

create table if not exists financial_portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  snapshot_date date not null default (now()::date),
  total_current_value numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

create index if not exists idx_financial_asset_events_user_id_created_at
  on financial_asset_events (user_id, created_at desc);
create index if not exists idx_financial_snapshots_user_id_date
  on financial_portfolio_snapshots (user_id, snapshot_date desc);

alter table financial_asset_events enable row level security;
alter table financial_portfolio_snapshots enable row level security;

drop policy if exists "financial_asset_events_owner_read_write" on financial_asset_events;
drop policy if exists "financial_asset_events_owner_read" on financial_asset_events;
drop policy if exists "financial_asset_events_owner_insert" on financial_asset_events;
create policy "financial_asset_events_owner_read" on financial_asset_events
for select
using (auth.uid() = user_id);
create policy "financial_asset_events_owner_insert" on financial_asset_events
for insert
with check (auth.uid() = user_id);

drop policy if exists "financial_portfolio_snapshots_owner_read_write" on financial_portfolio_snapshots;
drop policy if exists "financial_portfolio_snapshots_owner_read" on financial_portfolio_snapshots;
drop policy if exists "financial_portfolio_snapshots_owner_insert" on financial_portfolio_snapshots;
drop policy if exists "financial_portfolio_snapshots_owner_update" on financial_portfolio_snapshots;
create policy "financial_portfolio_snapshots_owner_read" on financial_portfolio_snapshots
for select
using (auth.uid() = user_id);
create policy "financial_portfolio_snapshots_owner_insert" on financial_portfolio_snapshots
for insert
with check (auth.uid() = user_id);
create policy "financial_portfolio_snapshots_owner_update" on financial_portfolio_snapshots
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

alter table financial_asset_events
drop constraint if exists financial_asset_events_payload_check;
alter table financial_asset_events
add constraint financial_asset_events_payload_check check (
  (action = 'create' and payload_after is not null) or
  (action = 'update' and payload_before is not null and payload_after is not null) or
  (action = 'delete' and payload_before is not null)
);

create or replace function log_financial_asset_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into financial_asset_events (
      user_id,
      asset_id,
      action,
      before_value,
      after_value,
      payload_before,
      payload_after
    )
    values (
      new.user_id,
      new.id,
      'create',
      null,
      new.current_value,
      null,
      to_jsonb(new)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into financial_asset_events (
      user_id,
      asset_id,
      action,
      before_value,
      after_value,
      payload_before,
      payload_after
    )
    values (
      new.user_id,
      new.id,
      'update',
      old.current_value,
      new.current_value,
      to_jsonb(old),
      to_jsonb(new)
    );
    return new;
  elsif tg_op = 'DELETE' then
    insert into financial_asset_events (
      user_id,
      asset_id,
      action,
      before_value,
      after_value,
      payload_before,
      payload_after
    )
    values (
      old.user_id,
      old.id,
      'delete',
      old.current_value,
      null,
      to_jsonb(old),
      null
    );
    return old;
  end if;
  return null;
end;
$$;

create or replace function refresh_financial_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_total numeric(14,2);
begin
  v_user_id := coalesce(new.user_id, old.user_id);

  select coalesce(sum(current_value), 0)::numeric(14,2)
    into v_total
  from financial_assets
  where user_id = v_user_id;

  insert into financial_portfolio_snapshots (
    user_id,
    snapshot_date,
    total_current_value,
    updated_at
  )
  values (
    v_user_id,
    now()::date,
    v_total,
    now()
  )
  on conflict (user_id, snapshot_date)
  do update set
    total_current_value = excluded.total_current_value,
    updated_at = now();

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_log_financial_asset_event on financial_assets;
create trigger trg_log_financial_asset_event
after insert or update or delete on financial_assets
for each row
execute function log_financial_asset_event();

drop trigger if exists trg_refresh_financial_snapshot on financial_assets;
create trigger trg_refresh_financial_snapshot
after insert or update or delete on financial_assets
for each row
execute function refresh_financial_snapshot();

create table if not exists financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  target_amount numeric(14,2) not null check (target_amount >= 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_financial_goals_user_id on financial_goals (user_id);

alter table financial_goals enable row level security;

drop policy if exists "financial_goals_owner_read_write" on financial_goals;
create policy "financial_goals_owner_read_write" on financial_goals
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Link assets to goals (many-to-many). Each link stores how much of an asset is allocated to a goal.
create table if not exists financial_goal_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references financial_goals (id) on delete cascade,
  asset_id uuid not null references financial_assets (id) on delete cascade,
  allocated_amount numeric(14,2) not null default 0 check (allocated_amount >= 0),
  created_at timestamptz not null default now(),
  unique (goal_id, asset_id)
);

create index if not exists idx_financial_goal_assets_user_id on financial_goal_assets (user_id);
create index if not exists idx_financial_goal_assets_goal_id on financial_goal_assets (goal_id);
create index if not exists idx_financial_goal_assets_asset_id on financial_goal_assets (asset_id);

alter table financial_goal_assets enable row level security;

drop policy if exists "financial_goal_assets_owner_read_write" on financial_goal_assets;
create policy "financial_goal_assets_owner_read_write" on financial_goal_assets
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Legacy single-goal column on assets (kept for backward compatibility).
alter table financial_assets
  add column if not exists goal_id uuid references financial_goals (id) on delete set null;

create index if not exists idx_financial_assets_goal_id on financial_assets (goal_id);

-- Migrate any existing goal_id links into the junction table.
insert into financial_goal_assets (user_id, goal_id, asset_id)
select user_id, goal_id, id
from financial_assets
where goal_id is not null
on conflict (goal_id, asset_id) do nothing;

alter table financial_goal_assets
  add column if not exists allocated_amount numeric(14,2) not null default 0 check (allocated_amount >= 0);
