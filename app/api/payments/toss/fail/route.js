import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * 결제창 실패 후 orderId 로 pending 주문을 failed 로 표시.
 */
export async function POST(request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return Response.json({ error: { message: '로그인이 필요합니다.' } }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: { message: 'Invalid JSON' } }, { status: 400 });
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const code = typeof body.code === 'string' ? body.code : '';
  const message = typeof body.message === 'string' ? body.message : '';

  if (!orderId) {
    return Response.json({ error: { message: 'orderId 가 필요합니다.' } }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  const { data: row, error: fetchErr } = await admin
    .from('payments')
    .select('id, user_id, status, metadata')
    .eq('provider', 'tosspayments')
    .eq('external_id', orderId)
    .maybeSingle();

  if (fetchErr || !row) {
    return Response.json({ ok: true, skipped: true });
  }

  if (row.user_id !== user.id) {
    return Response.json({ error: { message: '권한이 없습니다.' } }, { status: 403 });
  }

  if (row.status !== 'pending') {
    return Response.json({ ok: true, skipped: true });
  }

  await admin
    .from('payments')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
      metadata: {
        ...(row.metadata || {}),
        failCode: code,
        failMessage: message,
      },
    })
    .eq('id', row.id);

  return Response.json({ ok: true });
}
