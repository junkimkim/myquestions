'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { WALLET_REFRESH_EVENT } from '@/lib/walletEvents';

export default function AuthNavUser() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);

  const fetchWallet = useCallback(async () => {
    const res = await fetch('/api/me/wallet', { credentials: 'same-origin' });
    if (!res.ok) {
      setWallet(null);
      return;
    }
    const data = await res.json();
    setWallet({ balance: data.balance });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setWallet(null);
      return;
    }
    fetchWallet();
  }, [user, fetchWallet]);

  useEffect(() => {
    const onRefresh = () => fetchWallet();
    window.addEventListener(WALLET_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(WALLET_REFRESH_EVENT, onRefresh);
  }, [fetchWallet]);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setWallet(null);
    router.refresh();
  }, [router]);

  if (!isSupabaseConfigured()) {
    return (
      <span className="authNavMuted" title="NEXT_PUBLIC_SUPABASE_* 설정 필요">
        OAuth 미설정
      </span>
    );
  }

  if (loading) {
    return <span className="authNavMuted">…</span>;
  }

  if (!user) {
    return (
      <Link href="/login" className="appNavLink authNavLogin">
        로그인
      </Link>
    );
  }

  const email = user.email ?? '';
  const bal = wallet?.balance;

  return (
    <div className="authNavUser">
      <Link href="/pricing" className="authNavWallet" title="요금·충전">
        {bal != null ? (
          <>
            <span className="authNavWalletN">{bal.toLocaleString()}</span> 크레딧
          </>
        ) : (
          <span className="authNavMuted">잔액 …</span>
        )}
      </Link>
      <Link href="/mypage" className="appNavLink" title={email || undefined}>
        마이페이지
      </Link>
      <button type="button" className="authNavLogout" onClick={signOut}>
        로그아웃
      </button>
    </div>
  );
}
