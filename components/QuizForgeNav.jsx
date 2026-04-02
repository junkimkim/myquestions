'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthNavUser from '@/components/AuthNavUser';

export default function QuizForgeNav() {
  const pathname = usePathname();

  return (
    <nav className="appNav" aria-label="주요 메뉴">
      <div className="appNavMain">
        <Link href="/" className={`appNavLink ${pathname === '/' ? 'appNavLinkActive' : ''}`}>
          문제 생성
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
        <Link href="/pricing" className={`appNavLink ${pathname === '/pricing' ? 'appNavLinkActive' : ''}`}>
          요금·충전
        </Link>
      </div>
      <AuthNavUser />
    </nav>
  );
}
