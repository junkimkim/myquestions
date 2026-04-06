import Link from 'next/link';
import QuizForgeNav from '@/components/QuizForgeNav';

/**
 * 이용약관·개인정보처리방침 등 정적 법률/안내 페이지 공통 레이아웃
 */
export default function LegalPageShell({ title, badge, children }) {
  return (
    <div className="container legalPage">
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">{badge}</span>
        </div>
        <p className="subtitle">{title}</p>
      </header>
      <QuizForgeNav />
      <article className="legalDoc">{children}</article>
      <p className="dragHint legalPageBack">
        <Link href="/">← 홈으로</Link>
      </p>
    </div>
  );
}
