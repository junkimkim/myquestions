import Link from 'next/link';
import { redirect } from 'next/navigation';
import QuizForgeNav from '@/components/QuizForgeNav';
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

  const label = profile?.display_name?.trim() || user.email?.split('@')[0] || '사용자';

  const { data: wallet } = await supabase.from('user_wallets').select('balance').eq('user_id', user.id).maybeSingle();

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: recentJobs } = await supabase
    .from('generation_jobs')
    .select('id, created_at, model, type_label, status, cost_credits, generation_outputs(result_text)')
    .eq('user_id', user.id)
    .gte('created_at', fourteenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="container">
      <QuizForgeNav />
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">마이페이지</span>
        </div>
        <p className="subtitle">계정·크레딧·최근 2주 생성 이력(서버 저장)입니다.</p>
      </header>

      <div className="mypageCard">
        <div className="sectionLabel">크레딧</div>
        <p className="mypageRow">
          <span className="mypageLabel">잔액</span>
          <span>{wallet?.balance ?? 0}</span>
        </p>
      </div>

      <div className="mypageCard">
        <div className="sectionLabel">계정</div>
        <p className="mypageRow">
          <span className="mypageLabel">표시 이름</span>
          <span>{label}</span>
        </p>
        <p className="mypageRow">
          <span className="mypageLabel">이메일</span>
          <span>{user.email ?? '(없음)'}</span>
        </p>
        <p className="mypageRow">
          <span className="mypageLabel">가입</span>
          <span>{profile?.created_at ? new Date(profile.created_at).toLocaleString('ko-KR') : '—'}</span>
        </p>
        {profile?.avatar_url && (
          <p className="mypageRow">
            <span className="mypageLabel">아바타</span>
            <img src={profile.avatar_url} alt="프로필" width={40} height={40} className="mypageAvatar" />
          </p>
        )}
      </div>

      <div className="mypageCard mypageCardWide">
        <div className="sectionLabel">최근 생성 (2주 이내, 최대 20건)</div>
        {!recentJobs?.length ? (
          <p className="dragHint">아직 저장된 생성 결과가 없습니다.</p>
        ) : (
          <ul className="mypageJobList">
            {recentJobs.map((j) => {
              const preview = j.generation_outputs?.[0]?.result_text;
              const snippet =
                typeof preview === 'string' && preview.length > 0
                  ? preview.length > 180
                    ? `${preview.slice(0, 180)}…`
                    : preview
                  : null;
              return (
                <li key={j.id} className="mypageJobItem">
                  <div className="mypageJobMeta">
                    <time dateTime={j.created_at}>{new Date(j.created_at).toLocaleString('ko-KR')}</time>
                    <span className="mypageJobBadge">{j.status}</span>
                    <span>{j.cost_credits} 크레딧</span>
                    {j.model && <span className="mypageJobModel">{j.model}</span>}
                    {j.type_label && <span>{j.type_label}</span>}
                    <Link href={`/mypage/jobs/${j.id}`} className="mypageJobDetailLink">
                      상세
                    </Link>
                  </div>
                  {snippet && <p className="mypageJobPreview">{snippet}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="dragHint" style={{ marginTop: 24 }}>
        <Link href="/">← 문제 생성</Link>
        {' · '}
        <Link href="/pricing">요금·충전</Link>
      </p>
    </div>
  );
}
