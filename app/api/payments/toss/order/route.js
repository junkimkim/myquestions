import { randomUUID } from 'crypto';
import { getEffectiveTossClientKey, isTossPaymentConfigured } from '@/lib/tossEffectiveKeys';
import { getPackById } from '@/lib/pricingPacks';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * 토스 결제 전 주문 생성 — `payments` pending + 고유 orderId(toss external_id).
 */
export async function POST(request) {
  if (!isTossPaymentConfigured()) {
    return Response.json(
      { error: { message: '토스페이먼츠 키가 서버에 설정되지 않았습니다.', code: 'TOSS_NOT_CONFIGURED' } },
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

  const packId = typeof body.packId === 'string' ? body.packId.trim() : '';
  const pack = getPackById(packId);
  if (!pack) {
    return Response.json({ error: { message: '유효하지 않은 상품입니다.', code: 'INVALID_PACK' } }, { status: 400 });
  }

  const orderId = `toss_${randomUUID()}`;
  const orderName = `QuizForge 캐쉬 충전 ${pack.cashGranted.toLocaleString()} (결제 ${pack.priceKrw.toLocaleString()}원)`;

  const admin = createSupabaseAdmin();
  const { error: insErr } = await admin.from('payments').insert({
    user_id: user.id,
    provider: 'tosspayments',
    amount_krw: pack.priceKrw,
    status: 'pending',
    external_id: orderId,
    metadata: {
      cashGranted: pack.cashGranted,
      credits: pack.cashGranted,
      packId: pack.id,
      priceKrw: pack.priceKrw,
      orderName,
    },
  });

  if (insErr) {
    console.error('[toss/order] insert failed', insErr);
    return Response.json({ error: { message: '주문을 저장할 수 없습니다.', code: 'ORDER_INSERT_FAILED' } }, { status: 500 });
  }

  return Response.json({
    orderId,
    orderName,
    amount: pack.priceKrw,
    customerKey: user.id,
    clientKey: getEffectiveTossClientKey(),
  });
}
