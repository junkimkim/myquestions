-- 예상문제 선결제 배치 상태를 DB로 관리 (인메모리 Map 대체)
-- 멀티 인스턴스/서버리스 환경에서도 배치 ID가 공유됨

-- ---------------------------------------------------------------------------
-- 1. expected_batches
-- ---------------------------------------------------------------------------
create table if not exists public.expected_batches (
  batch_id   uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  remaining  integer not null check (remaining >= 0),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now()
);

create index if not exists expected_batches_user_id_idx   on public.expected_batches (user_id);
create index if not exists expected_batches_expires_at_idx on public.expected_batches (expires_at);

-- service role 전용 — 별도 RLS 정책 불필요 (admin client 사용)
alter table public.expected_batches enable row level security;

-- ---------------------------------------------------------------------------
-- 2. consume_expected_batch_slot — 원자적 감소
--    남은 횟수가 1 이상이면 1 감소 후 true, 아니면 false 반환
--    remaining = 0 이 되면 행 삭제
-- ---------------------------------------------------------------------------
create or replace function public.consume_expected_batch_slot(
  p_batch_id uuid,
  p_user_id  uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer;
begin
  update expected_batches
  set    remaining = remaining - 1
  where  batch_id  = p_batch_id
    and  user_id   = p_user_id
    and  remaining > 0
    and  expires_at > now()
  returning remaining into v_remaining;

  if not found then
    return false;
  end if;

  if v_remaining = 0 then
    delete from expected_batches where batch_id = p_batch_id;
  end if;

  return true;
end;
$$;
