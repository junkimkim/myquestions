import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import QuizForgeNav from '@/components/QuizForgeNav';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function MypageJobDetailPage({ params }) {
  const { id } = await params;

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
    redirect(`/login?next=/mypage/jobs/${id}`);
  }

  const { data: job, error } = await supabase
    .from('generation_jobs')
    .select('id, created_at, model, type_label, status, cost_credits, input_summary, generation_outputs(result_text)')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !job) {
    notFound();
  }

  const text = job.generation_outputs?.[0]?.result_text ?? '';

  return (
    <div className="container">
      <QuizForgeNav />
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">생성 상세</span>
        </div>
        <p className="subtitle">
          <time dateTime={job.created_at}>{new Date(job.created_at).toLocaleString('ko-KR')}</time>
          {job.type_label && ` · ${job.type_label}`}
          {job.model && ` · ${job.model}`}
          {' · '}
          {job.cost_credits} 크레딧 · {job.status}
        </p>
      </header>

      {job.input_summary ? (
        <div className="mypageCard mypageCardWide" style={{ marginBottom: 16 }}>
          <div className="sectionLabel">입력 요약</div>
          <p className="mypageJobPreview" style={{ marginTop: 8 }}>
            {job.input_summary}
          </p>
        </div>
      ) : null}

      <div className="mypageCard mypageCardWide">
        <div className="sectionLabel">생성 결과</div>
        <pre className="mypageJobDetailBody">{text || '(본문 없음)'}</pre>
      </div>

      <p className="dragHint" style={{ marginTop: 24 }}>
        <Link href="/mypage">← 마이페이지</Link>
      </p>
    </div>
  );
}
