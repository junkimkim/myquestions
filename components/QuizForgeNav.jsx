'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function QuizForgeNav() {
  const pathname = usePathname();

  return (
    <nav className="appNav" aria-label="주요 메뉴">
      <Link href="/" className={`appNavLink ${pathname === '/' ? 'appNavLinkActive' : ''}`}>
        문제 생성
      </Link>
      <Link href="/types" className={`appNavLink ${pathname === '/types' ? 'appNavLinkActive' : ''}`}>
        유형 관리
      </Link>
      <Link href="/prompt" className={`appNavLink ${pathname === '/prompt' ? 'appNavLinkActive' : ''}`}>
        프롬프트 도우미
      </Link>
      <Link href="/one_type" className={`appNavLink ${pathname === '/one_type' ? 'appNavLinkActive' : ''}`}>
        한 유형 일괄
      </Link>
      <Link
        href="/expected_questions"
        className={`appNavLink ${pathname === '/expected_questions' ? 'appNavLinkActive' : ''}`}
      >
        예상문제 세트
      </Link>
    </nav>
  );
}
