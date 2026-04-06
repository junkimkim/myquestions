import { createSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * 예상문제 세트 선결제 배치 — Supabase `expected_batches` 테이블 기반.
 * 멀티 인스턴스/서버리스 환경에서도 상태 공유됨.
 */

export async function registerExpectedBatch(batchId, userId, remaining) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from('expected_batches').insert({
    batch_id: batchId,
    user_id: userId,
    remaining,
  });
  if (error) throw error;
}

export async function assertExpectedBatchReady(batchId, userId) {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('expected_batches')
    .select('remaining')
    .eq('batch_id', batchId)
    .eq('user_id', userId)
    .gt('remaining', 0)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  return Boolean(data);
}

/** OpenAI·저장 성공 후 호출 — 원자적 감소 (RPC) */
export async function consumeExpectedBatchSlot(batchId, userId) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc('consume_expected_batch_slot', {
    p_batch_id: batchId,
    p_user_id: userId,
  });
  if (error) {
    console.error('[expectedBatch] consumeExpectedBatchSlot failed', error);
    return false;
  }
  return Boolean(data);
}

export async function clearExpectedBatch(batchId, userId) {
  const supabase = createSupabaseAdmin();
  await supabase
    .from('expected_batches')
    .delete()
    .eq('batch_id', batchId)
    .eq('user_id', userId);
}
