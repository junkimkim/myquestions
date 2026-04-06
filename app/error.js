'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { toErrorMessage } from '@/lib/toErrorMessage';

/**
 * 세그먼트 런타임 오류 표시. Event 등 비표준 값이 Error로 감싸져도 메시지를 안전히 보여줍니다.
 */
export default function AppError({ error, reset }) {
  const message = toErrorMessage(error);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container" style={{ padding: '48px 16px' }}>
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
        </div>
        <p className="subtitle">일시적인 오류가 발생했습니다.</p>
      </header>
      <p className="persistMsg persistMsgErr" style={{ marginBottom: 16 }}>
        {message}
      </p>
      <p className="dragHint" style={{ marginBottom: 16 }}>
        페이지를 새로고침하거나 잠시 후 다시 시도해 주세요.
      </p>
      <button type="button" className="btnPrimary" onClick={() => reset()}>
        다시 시도
      </button>
      <p className="dragHint" style={{ marginTop: 24 }}>
        <Link href="/">← 홈으로</Link>
      </p>
    </div>
  );
}
