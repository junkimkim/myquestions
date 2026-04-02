-- Phase 1: 프로필·크레딧·결제·생성 이력 (plan.md §11 Phase 1)
-- 적용: supabase db push 또는 SQL Editor

-- ---------------------------------------------------------------------------
-- 1. profiles (auth.users 1:1)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

-- ---------------------------------------------------------------------------
-- 2. user_wallets
-- ---------------------------------------------------------------------------
create table if not exists public.user_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. credit_ledger (충전·차감 원장; INSERT는 서버 service role 권장)
-- ---------------------------------------------------------------------------
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('charge', 'spend', 'refund', 'adjust')),
  amount bigint not null check (amount > 0),
  balance_after bigint not null check (balance_after >= 0),
  reference text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists credit_ledger_reference_uidx on public.credit_ledger (reference)
  where reference is not null;

create index if not exists credit_ledger_user_created_idx on public.credit_ledger (user_id, created_at desc);

comment on table public.credit_ledger is 'type: charge/refund는 잔액 증가, spend은 감소. amount는 항상 양수.';

-- ---------------------------------------------------------------------------
-- 4. payments (PG 충전)
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  amount_krw bigint not null check (amount_krw > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled')),
  external_id text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payments_provider_external_uidx on public.payments (provider, external_id)
  where external_id is not null;

create index if not exists payments_user_created_idx on public.payments (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 5. generation_jobs + generation_outputs (마이페이지·2주 보관용)
-- ---------------------------------------------------------------------------
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cost_credits bigint not null default 0 check (cost_credits >= 0),
  model text,
  type_label text,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  input_summary text,
  created_at timestamptz not null default now()
);

create index if not exists generation_jobs_user_created_idx on public.generation_jobs (user_id, created_at desc);

create table if not exists public.generation_outputs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.generation_jobs (id) on delete cascade,
  result_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists generation_outputs_job_id_idx on public.generation_outputs (job_id);

-- ---------------------------------------------------------------------------
-- 6. 신규 가입 시 profile + wallet 행 생성
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''),
      'user'
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do nothing;

  insert into public.user_wallets (user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_wallets enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.payments enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.generation_outputs enable row level security;

-- profiles: 본인 읽기·수정
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- wallets: 본인 잔액 조회만 (변경은 service role / RPC)
drop policy if exists "user_wallets_select_own" on public.user_wallets;
create policy "user_wallets_select_own" on public.user_wallets for select using (auth.uid() = user_id);

-- ledger: 본인 조회만
drop policy if exists "credit_ledger_select_own" on public.credit_ledger;
create policy "credit_ledger_select_own" on public.credit_ledger for select using (auth.uid() = user_id);

-- payments: 본인 조회만
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments for select using (auth.uid() = user_id);

-- generation_jobs: 본인 조회만
drop policy if exists "generation_jobs_select_own" on public.generation_jobs;
create policy "generation_jobs_select_own" on public.generation_jobs for select using (auth.uid() = user_id);

-- generation_outputs: 소유 job을 통해서만 조회
drop policy if exists "generation_outputs_select_own" on public.generation_outputs;
create policy "generation_outputs_select_own" on public.generation_outputs
  for select using (
    exists (
      select 1 from public.generation_jobs j
      where j.id = generation_outputs.job_id and j.user_id = auth.uid()
    )
  );
