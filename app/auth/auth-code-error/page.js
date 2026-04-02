import Link from 'next/link';

export const metadata = {
  title: '로그인 오류 — QuizForge',
};

export default async function AuthCodeErrorPage({ searchParams }) {
  const params = await searchParams;
  const message =
    typeof params.message === 'string' && params.message.length > 0
      ? params.message
      : '인증 코드 처리에 실패했습니다.';

  return (
    <div className="container">
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
        </div>
      </header>
      <div className="typesEmptyCard" style={{ marginTop: 24 }}>
        <p className="typesEmptyTitle">로그인에 실패했습니다</p>
        <p className="typesEmptyText persistMsg persistMsgErr" style={{ marginTop: 12 }}>
          {message}
        </p>
        <p className="typesEmptyText" style={{ marginTop: 16 }}>
          Supabase 대시보드에서 Redirect URL·OAuth(구글/카카오) 설정을 확인해 주세요.
        </p>
        <Link href="/login" className="typesEmptyLink" style={{ marginTop: 16, display: 'inline-block' }}>
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
