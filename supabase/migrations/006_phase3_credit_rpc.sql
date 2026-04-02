-- Phase 3: 크레딧 RPC (plan.md §11 Phase 3)
-- charge_credits / spend_credits — 행 잠금 + advisory lock + reference 멱등으로 원장·지갑 일치

-- ---------------------------------------------------------------------------
-- charge_credits
-- ---------------------------------------------------------------------------
create or replace function public.charge_credits(
  p_user_id uuid,
  p_amount bigint,
  p_reference text,
  p_meta jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance bigint;
  v_existing_user uuid;
  v_existing_type text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'CHARGE_AMOUNT_INVALID';
  end if;

  if p_reference is not null then
    perform pg_advisory_xact_lock(hashtextextended('charge:' || p_reference, 0));
  end if;

  insert into public.user_wallets (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select balance into v_balance
  from public.user_wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'WALLET_USER_NOT_FOUND';
  end if;

  -- 지갑 잠금 이후 재확인: 동일 reference 경쟁 시 선행 트랜잭션 커밋 후 멱등 반환
  if p_reference is not null then
    select user_id, type into v_existing_user, v_existing_type
    from public.credit_ledger
    where reference = p_reference
    limit 1;
    if found then
      if v_existing_user <> p_user_id then
        raise exception 'REFERENCE_USER_MISMATCH';
      end if;
      if v_existing_type <> 'charge' then
        raise exception 'REFERENCE_TYPE_MISMATCH';
      end if;
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'balance', v_balance
      );
    end if;
  end if;

  update public.user_wallets
  set balance = balance + p_amount,
      updated_at = now()
  where user_id = p_user_id
  returning balance into v_balance;

  insert into public.credit_ledger (user_id, type, amount, balance_after, reference, meta)
  values (p_user_id, 'charge', p_amount, v_balance, p_reference, p_meta);

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'balance', v_balance
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- spend_credits
-- ---------------------------------------------------------------------------
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount bigint,
  p_reference text,
  p_meta jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance bigint;
  v_existing_user uuid;
  v_existing_type text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'SPEND_AMOUNT_INVALID';
  end if;

  if p_reference is not null then
    perform pg_advisory_xact_lock(hashtextextended('spend:' || p_reference, 0));
  end if;

  insert into public.user_wallets (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select balance into v_balance
  from public.user_wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'WALLET_USER_NOT_FOUND';
  end if;

  if p_reference is not null then
    select user_id, type into v_existing_user, v_existing_type
    from public.credit_ledger
    where reference = p_reference
    limit 1;
    if found then
      if v_existing_user <> p_user_id then
        raise exception 'REFERENCE_USER_MISMATCH';
      end if;
      if v_existing_type <> 'spend' then
        raise exception 'REFERENCE_TYPE_MISMATCH';
      end if;
      select balance into v_balance
      from public.user_wallets
      where user_id = p_user_id;
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'balance', coalesce(v_balance, 0)
      );
    end if;
  end if;

  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDIT_BALANCE';
  end if;

  update public.user_wallets
  set balance = balance - p_amount,
      updated_at = now()
  where user_id = p_user_id
  returning balance into v_balance;

  insert into public.credit_ledger (user_id, type, amount, balance_after, reference, meta)
  values (p_user_id, 'spend', p_amount, v_balance, p_reference, p_meta);

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'balance', v_balance
  );
end;
$$;

comment on function public.charge_credits(uuid, bigint, text, jsonb) is
  '지갑 충전 + charge 원장. 서버(service role)에서만 호출. reference가 있으면 멱등.';

comment on function public.spend_credits(uuid, bigint, text, jsonb) is
  '지갑 차감 + spend 원장. 서버(service role)에서만 호출. reference가 있으면 멱등.';

revoke all on function public.charge_credits(uuid, bigint, text, jsonb) from public;
revoke all on function public.spend_credits(uuid, bigint, text, jsonb) from public;

grant execute on function public.charge_credits(uuid, bigint, text, jsonb) to service_role;
grant execute on function public.spend_credits(uuid, bigint, text, jsonb) to service_role;
