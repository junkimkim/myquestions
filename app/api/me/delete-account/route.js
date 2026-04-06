import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * 본인 계정 삭제 (Supabase Auth + ON DELETE CASCADE 로 앱 데이터 정리).
 * POST JSON: { "confirm": true }
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: { message: 'Invalid JSON', code: 'BAD_REQUEST' } }, { status: 400 });
  }

  if (body.confirm !== true) {
    return Response.json(
      { error: { message: '탈퇴 확인이 필요합니다.', code: 'CONFIRM_REQUIRED' } },
      { status: 400 },
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

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : '서버 설정 오류';
    return Response.json({ error: { message: msg, code: 'SERVER_CONFIG' } }, { status: 503 });
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);

  if (delErr) {
    console.error('[delete-account]', delErr);
    return Response.json(
      {
        error: {
          message: delErr.message || '계정 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.',
          code: 'DELETE_FAILED',
        },
      },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
