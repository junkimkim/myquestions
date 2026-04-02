'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export default function LoginClient({ initialNext, configError }) {
  const router = useRouter();
  const nextPath =
    typeof initialNext === 'string' && initialNext.startsWith('/') && !initialNext.startsWith('//')
      ? initialNext
      : '/';

  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(
    configError ? 'Supabase URL/anon 키가 없습니다. .env.local 을 확인하세요.' : null,
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace(nextPath);
      } else {
        setReady(true);
      }
    });
  }, [nextPath, router]);

  const redirectTo = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  }, [nextPath]);

  const signIn = useCallback(
    async (provider) => {
      setErr(null);
      if (!isSupabaseConfigured()) {
        setErr('Supabase 환경 변수를 설정해 주세요.');
        return;
      }
      setBusy(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectTo(),
          },
        });
        if (error) setErr(error.message);
      } catch (e) {
        setErr(e instanceof Error ? e.message : '로그인 요청에 실패했습니다.');
      } finally {
        setBusy(false);
      }
    },
    [redirectTo],
  );

  if (!ready) {
    return (
      <div className="container authLoginPage">
        <p className="subtitle">세션 확인 중…</p>
      </div>
    );
  }

  return (
    <div className="container authLoginPage">
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
        </div>
        <p className="subtitle">구글 또는 카카오 계정으로 로그인합니다.</p>
      </header>

      <div className="authLoginCard">
        {err && (
          <p className="persistMsg persistMsgErr" style={{ marginBottom: 16 }}>
            {err}
          </p>
        )}
        {!isSupabaseConfigured() ? (
          <p className="typesEmptyText">
            `.env.local`에 <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 를 넣은 뒤
            다시 시도하세요.
          </p>
        ) : (
          <>
            <button
              type="button"
              className="authOAuthBtn authOAuthGoogle"
              disabled={busy}
              onClick={() => signIn('google')}
            >
              Google로 계속하기
            </button>
            <button
              type="button"
              className="authOAuthBtn authOAuthKakao"
              disabled={busy}
              onClick={() => signIn('kakao')}
            >
              카카오로 계속하기
            </button>
          </>
        )}
        <p className="authLoginHint">
          로그인 후 이동: <code>{nextPath}</code>
        </p>
        <Link href="/" className="typesEmptyLink">
          ← 홈으로
        </Link>
      </div>
    </div>
  );
}
