/**
 * Phase 0: 배포·로컬에서 환경 변수 존재 여부만 확인 (값은 노출하지 않음).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabasePublic = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const supabaseService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const openaiServer = Boolean(process.env.OPENAI_API_KEY);

  return Response.json({
    ok: true,
    env: {
      supabasePublic,
      supabaseService,
      /** Phase 4 이후 서버 전용 OpenAI 키 사용 시 true */
      openaiServerKey: openaiServer,
    },
  });
}
