import { getCashCostPerGeneration } from '@/lib/credits';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * 로그인 사용자의 지갑 잔액 + 정책 상수(생성당 캐쉬 비용).
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: row, error } = await supabase
    .from('user_wallets')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const balance = row?.balance ?? 0;
  const cashCostPerGeneration = getCashCostPerGeneration();

  return Response.json({
    balance,
    cashCostPerGeneration,
    creditCostPerGeneration: cashCostPerGeneration,
  });
}
