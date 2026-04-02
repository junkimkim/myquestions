'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import QuizForgeNav from '@/components/QuizForgeNav';
import { dispatchWalletRefresh } from '@/lib/walletEvents';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [phase, setPhase] = useState('loading');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');

    if (!paymentKey || !orderId || amount == null) {
      setPhase('error');
      setDetail('결제 정보(paymentKey, orderId, amount)가 없습니다. URL을 확인해 주세요.');
      return;
    }

    let cancelled = false;

    (async () => {
      const res = await fetch('/api/payments/toss/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ paymentKey, orderId, amount }),
      });
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setPhase('error');
        setDetail(data.error?.message || '결제 승인에 실패했습니다.');
        return;
      }
      dispatchWalletRefresh();
      setPhase('ok');
      setDetail(
        data.idempotent
          ? '이미 처리된 결제입니다. 크레딧이 반영되어 있습니다.'
          : `크레딧 ${data.creditsCharged != null ? data.creditsCharged : ''} 충전이 완료되었습니다.`,
      );
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  return (
    <div className="paymentResultInner">
      {phase === 'loading' && <p className="subtitle">결제를 확인하는 중입니다…</p>}
      {phase === 'ok' && (
        <>
          <p className="persistMsg" style={{ color: 'var(--success)' }}>
            결제가 완료되었습니다.
          </p>
          <p className="dragHint">{detail}</p>
        </>
      )}
      {phase === 'error' && (
        <>
          <p className="persistMsg persistMsgErr">처리할 수 없습니다.</p>
          <p className="dragHint">{detail}</p>
        </>
      )}
      <p className="dragHint" style={{ marginTop: 24 }}>
        <Link href="/pricing">요금·충전</Link>
        {' · '}
        <Link href="/mypage">마이페이지</Link>
        {' · '}
        <Link href="/">문제 생성</Link>
      </p>
    </div>
  );
}

export default function TossSuccessPage() {
  return (
    <div className="container">
      <QuizForgeNav />
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">결제 완료</span>
        </div>
      </header>
      <Suspense fallback={<p className="subtitle">불러오는 중…</p>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
