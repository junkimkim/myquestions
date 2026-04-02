import { createBrowserClient } from '@supabase/ssr';

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트.
 * Phase 2 OAuth 세션은 쿠키로 유지되며, 미들웨어가 갱신을 돕습니다.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다. .env.local 을 확인하세요.',
    );
  }
  return createBrowserClient(url, anon);
}
