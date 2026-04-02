import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * 서버(Route Handler, Server Component)용 Supabase 클라이언트.
 * 사용자 세션은 anon 키 + 쿠키 기준으로 읽습니다.
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다. .env.local 을 확인하세요.',
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component 등 set 불가 컨텍스트 — 미들웨어에서 세션 갱신
        }
      },
    },
  });
}
