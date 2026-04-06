import { createSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * 사용자당 분당 생성 요청 상한 — generation_jobs 테이블 기반.
 * 멀티 인스턴스/서버리스 환경에서도 정확하게 동작함.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 45;

export async function checkGenerateRateLimit(userId) {
  const supabase = createSupabaseAdmin();
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count, error } = await supabase
    .from('generation_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart);

  if (error) {
    // 조회 실패 시 허용 (fail-open)
    console.error('[rateLimit] checkGenerateRateLimit query failed', error);
    return { ok: true };
  }

  if ((count ?? 0) >= MAX_PER_WINDOW) {
    // 윈도우 내 가장 오래된 job이 만료되는 시각까지 대기 시간 계산
    const { data: oldest } = await supabase
      .from('generation_jobs')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const retryAfterSec = oldest
      ? Math.max(1, Math.ceil((new Date(oldest.created_at).getTime() + WINDOW_MS - Date.now()) / 1000))
      : Math.ceil(WINDOW_MS / 1000);

    return { ok: false, retryAfterSec };
  }

  return { ok: true };
}
