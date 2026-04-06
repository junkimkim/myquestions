'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import QuizForgeNav from '@/components/QuizForgeNav';
import TossPaymentLogsHint from '@/components/TossPaymentLogsHint';

function FailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const message = searchParams.get('message') || '';
  const orderId = searchParams.get('orderId') || '';
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    fetch('/api/payments/toss/fail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ orderId, code, message }),
    })
      .then(() => setNotified(true))
      .catch(() => setNotified(true));
  }, [orderId, code, message]);

  return (
    <div className="paymentResultInner">
      <p className="persistMsg persistMsgErr">결제가 완료되지 않았습니다.</p>
      {message && (
        <p className="dragHint">
          {code && <span className="mypageJobModel">{code}</span>}
          {code && ' — '}
          {(() => {
            try {
              return decodeURIComponent(message);
            } catch {
              return message;
            }
          })()}
        </p>
      )}
      {!message && <p className="dragHint">창을 닫았거나 결제가 취소되었을 수 있습니다.</p>}
      {orderId && (
        <p className="dragHint" style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>
          주문번호: {orderId}
          {notified ? ' · 기록 반영됨' : ''}
        </p>
      )}
      <TossPaymentLogsHint style={{ marginTop: 20 }} />
      <p className="dragHint" style={{ marginTop: 24 }}>
        <Link href="/pricing">요금·충전으로 돌아가기</Link>
        {' · '}
        <Link href="/">문제 생성</Link>
      </p>
    </div>
  );
}

export default function TossFailPage() {
  return (
    <div className="container">
      <QuizForgeNav />
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">결제 취소</span>
        </div>
      </header>
      <Suspense fallback={<p className="subtitle">불러오는 중…</p>}>
        <FailContent />
      </Suspense>
    </div>
  );
}
