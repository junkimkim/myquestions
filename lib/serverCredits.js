import { createSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Phase 3: service role로만 호출. 결제 웹훅·생성 API(Phase 4)에서 사용.
 */

export async function chargeCreditsServer(userId, amount, reference, meta) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc('charge_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_reference: reference,
    p_meta: meta ?? null,
  });
  if (error) throw error;
  return data;
}

export async function spendCreditsServer(userId, amount, reference, meta) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc('spend_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_reference: reference,
    p_meta: meta ?? null,
  });
  if (error) throw error;
  return data;
}
