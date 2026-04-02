import { randomUUID } from 'crypto';
import { getPackById } from '@/lib/pricingPacks';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * 토스 결제 전 주문 생성 — `payments` pending + 고유 orderId(toss external_id).
 */
export async function POST(request) {
  if (!process.env.TOSS_PAYMENTS_SECRET_KEY?.trim() || !process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY?.trim()) {
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
  const orderName = `QuizForge ${pack.name} (${pack.credits}크레딧)`;

  const admin = createSupabaseAdmin();
  const { error: insErr } = await admin.from('payments').insert({
    user_id: user.id,
    provider: 'tosspayments',
    amount_krw: pack.priceKrw,
    status: 'pending',
    external_id: orderId,
    metadata: {
      credits: pack.credits,
      packId: pack.id,
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
    clientKey: process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY,
  });
}
