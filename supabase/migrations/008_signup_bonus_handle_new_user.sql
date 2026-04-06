-- 신규 가입 시 100 캐쉬 지급 (charge_credits, reference 멱등: signup_bonus:{user_id})
-- 금액은 lib/cashRules.js SIGNUP_BONUS_CASH 와 반드시 동일하게 유지
-- handle_new_user 가 charge_credits 를 호출하려면 postgres 등에 EXECUTE 권한 필요

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('postgres', 'supabase_admin')
  LOOP
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.charge_credits(uuid, bigint, text, jsonb) TO %I',
      r.rolname
    );
  END LOOP;
END $$;

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

  begin
    perform public.charge_credits(
      new.id,
      100,
      'signup_bonus:' || new.id::text,
      jsonb_build_object('kind', 'signup_welcome')
    );
  exception
    when others then
      raise warning 'signup bonus failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  '신규 auth.users 행에 대해 profile·wallet 생성 후 100 캐쉬 가입 보너스 지급(실패 시 경고만)';
