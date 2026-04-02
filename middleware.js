import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Supabase Auth 세션 쿠키 갱신 (OAuth·세션 유지).
 * NEXT_PUBLIC_* 가 없으면(로컬에서 Supabase 미사용) 그대로 통과합니다.
 *
 * 보호 경로(예: /mypage)는 서버 컴포넌트에서 redirect — 미들웨어에서 리다이렉트 시
 * 쿠키 병합 이슈를 피하기 위해 서버 측 검증을 사용합니다.
 */
export async function middleware(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    /*
     * 정적·이미지·_next 제외 (Supabase 권장 패턴과 유사)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
