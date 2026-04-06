import { randomUUID } from 'crypto';
import { expectedBatchCashCost, MAX_EXPECTED_PROBLEMS, MIN_EXPECTED_PROBLEMS } from '@/lib/cashRules';
import { registerExpectedBatch } from '@/lib/expectedBatchRegistry';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { spendCreditsServer } from '@/lib/serverCredits';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return Response.json({ error: { message: '로그인이 필요합니다.', code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: { message: 'Invalid JSON', code: 'BAD_REQUEST' } }, { status: 400 });
  }

  const n = Math.floor(Number(body.problemCount));
  const cost = expectedBatchCashCost(n);
  if (cost == null) {
    return Response.json(
      {
        error: {
          message: `문항 수는 ${MIN_EXPECTED_PROBLEMS}~${MAX_EXPECTED_PROBLEMS} 사이여야 합니다.`,
          code: 'INVALID_PROBLEM_COUNT',
        },
      },
      { status: 400 },
    );
  }

  const { data: wallet, error: walletErr } = await supabase
    .from('user_wallets')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  if (walletErr) {
    return Response.json({ error: { message: walletErr.message, code: 'WALLET_READ_FAILED' } }, { status: 500 });
  }

  const balance = wallet?.balance ?? 0;
  if (balance < cost) {
    return Response.json(
      {
        error: {
          message: `캐쉬가 부족합니다. (필요: ${cost}, 잔액: ${balance})`,
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: cost,
          balance,
        },
      },
      { status: 402 },
    );
  }

  const batchId = randomUUID();
  const ref = `expected:batch:${batchId}`;

  try {
    await spendCreditsServer(user.id, cost, ref, { problemCount: n, kind: 'expected_batch' });
  } catch (e) {
    const msg = e?.message ?? String(e);
    if (msg.includes('INSUFFICIENT')) {
      return Response.json(
        { error: { message: '캐쉬가 부족합니다.', code: 'INSUFFICIENT_CREDITS' } },
        { status: 402 },
      );
    }
    return Response.json({ error: { message: msg, code: 'SPEND_FAILED' } }, { status: 500 });
  }

  await registerExpectedBatch(batchId, user.id, n);

  return Response.json({
    ok: true,
    batchId,
    cashSpent: cost,
    problemCount: n,
  });
}
