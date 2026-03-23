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
    </nav>
  );
}
