-- Supabase SQL Editor에서 실행하거나 supabase db push 로 적용

create table if not exists public.custom_question_types (
  id text primary key,
  name text not null,
  description text not null default '',
  kind text not null default 'mcq'
    check (kind in ('mcq', 'writing', 'vocabulary')),
  prompt text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.removed_question_type_ids (
  id text primary key,
  created_at timestamptz not null default now()
);

create index if not exists custom_question_types_updated_at_idx
  on public.custom_question_types (updated_at desc);

alter table public.custom_question_types enable row level security;
alter table public.removed_question_type_ids enable row level security;

-- API는 service role로 접근하므로 RLS는 우회됩니다. anon 직접 접근 시 정책을 추가하세요.
