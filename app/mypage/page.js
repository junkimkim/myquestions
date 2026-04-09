import { redirect } from 'next/navigation';
import QuizForgeNav from '@/components/QuizForgeNav';
import MypageTabs from '@/components/MypageTabs';
import { SIGNUP_BONUS_CASH } from '@/lib/cashRules';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function MypagePage() {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    redirect('/login?next=/mypage&error=config');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/mypage');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, created_at')
    .eq('id', user.id)
    .maybeSingle();

  const { data: wallet } = await supabase
    .from('user_wallets')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <div className="container">
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">마이페이지</span>
        </div>
        <p className="subtitle">
          신규 가입 시 <strong>{SIGNUP_BONUS_CASH.toLocaleString()} 캐쉬</strong>가 자동 지급됩니다.
        </p>
      </header>
      <QuizForgeNav />

      <MypageTabs
        user={{ id: user.id, email: user.email }}
        profile={profile}
        walletBalance={wallet?.balance ?? 0}
      />

      <p className="dragHint" style={{ marginTop: 24 }}>
        <a href="/">← 문제 생성</a>
        {' · '}
        <a href="/pricing">요금·충전</a>
      </p>
    </div>
  );
}
