import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * OAuth PKCE 콜백 — Supabase 대시보드 Redirect URLs에
 * `${SITE_URL}/auth/callback` 등록 필요.
 */
export async function GET(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.redirect(new URL('/login?error=config', request.url));
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextPath = searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(new URL('/auth/auth-code-error', request.url));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const errUrl = new URL('/auth/auth-code-error', request.url);
    errUrl.searchParams.set('message', error.message);
    return NextResponse.redirect(errUrl);
  }

  const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
  return NextResponse.redirect(`${origin}${safeNext}`);
}
