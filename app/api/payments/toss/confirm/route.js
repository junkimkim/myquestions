import { confirmTossPayment } from '@/lib/tossPayments';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { chargeCreditsServer } from '@/lib/serverCredits';

export const dynamic = 'force-dynamic';

/**
 * 결제 승인 성공 시 토스 API confirm + `charge_credits` + `payments` paid.
 */
export async function POST(request) {
  if (!process.env.TOSS_PAYMENTS_SECRET_KEY) {
    return Response.json(
      { error: { message: '토스 시크릿 키가 설정되지 않았습니다.', code: 'TOSS_NOT_CONFIGURED' } },
      { status: 503 },
    );
  }

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

  const { paymentKey, orderId, amount } = body;
  if (!paymentKey || !orderId || amount == null) {
    return Response.json({ error: { message: 'paymentKey, orderId, amount 가 필요합니다.', code: 'BAD_REQUEST' } }, { status: 400 });
  }

  const amountNum = Math.floor(Number(amount));
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return Response.json({ error: { message: '금액이 올바르지 않습니다.', code: 'BAD_REQUEST' } }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  const { data: row, error: fetchErr } = await admin
    .from('payments')
    .select('id, user_id, amount_krw, status, metadata, external_id')
    .eq('provider', 'tosspayments')
    .eq('external_id', orderId)
    .maybeSingle();

  if (fetchErr || !row) {
    return Response.json({ error: { message: '주문을 찾을 수 없습니다.', code: 'ORDER_NOT_FOUND' } }, { status: 404 });
  }

  if (row.user_id !== user.id) {
    return Response.json({ error: { message: '권한이 없습니다.', code: 'FORBIDDEN' } }, { status: 403 });
  }

  if (row.amount_krw !== amountNum) {
    return Response.json({ error: { message: '결제 금액이 주문과 일치하지 않습니다.', code: 'AMOUNT_MISMATCH' } }, { status: 400 });
  }

  if (row.status === 'paid') {
    const credits = Number(row.metadata?.credits ?? 0);
    return Response.json({
      ok: true,
      idempotent: true,
      creditsCharged: credits,
      message: '이미 처리된 결제입니다.',
    });
  }

  if (row.status !== 'pending') {
    return Response.json({ error: { message: '처리할 수 없는 주문 상태입니다.', code: 'INVALID_STATUS' } }, { status: 400 });
  }

  const credits = Number(row.metadata?.credits ?? 0);
  if (!Number.isFinite(credits) || credits <= 0) {
    return Response.json({ error: { message: '주문 메타데이터가 올바르지 않습니다.', code: 'BAD_METADATA' } }, { status: 500 });
  }

  const tossResult = await confirmTossPayment({ paymentKey, orderId, amount: amountNum });

  if (!tossResult.ok) {
    console.error('[toss/confirm] Toss API error', tossResult.status, tossResult.data);
    await admin
      .from('payments')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
        metadata: {
          ...(row.metadata || {}),
          tossError: tossResult.data,
        },
      })
      .eq('id', row.id);

    return Response.json(
      {
        error: {
          message: tossResult.data?.message || '결제 승인에 실패했습니다.',
          code: 'TOSS_CONFIRM_FAILED',
          details: tossResult.data,
        },
      },
      { status: 502 },
    );
  }

  const ref = `charge:toss:${orderId}`;

  try {
    await chargeCreditsServer(user.id, credits, ref, {
      paymentId: row.id,
      orderId,
      tossPaymentKey: paymentKey,
    });
  } catch (e) {
    console.error('[toss/confirm] charge_credits failed', e);
    return Response.json(
      { error: { message: e?.message || '크레딧 충전에 실패했습니다.', code: 'CHARGE_FAILED' } },
      { status: 500 },
    );
  }

  await admin
    .from('payments')
    .update({
      status: 'paid',
      updated_at: new Date().toISOString(),
      metadata: {
        ...(row.metadata || {}),
        tossApproved: tossResult.data,
      },
    })
    .eq('id', row.id);

  return Response.json({
    ok: true,
    creditsCharged: credits,
    orderId,
  });
}
