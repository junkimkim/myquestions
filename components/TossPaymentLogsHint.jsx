'use client';

import { TOSS_DEVELOPERS_HOME, TOSS_DEVELOPERS_PAYMENT_LOGS } from '@/lib/tossPaymentsLinks';

/**
 * 결제위젯 클라이언트 키는 이 앱에서 결제창을 열 때만 필요합니다.
 * 테스트 결제·취소 내역은 개발자센터에 로그인한 뒤 결제 로그에서 확인할 수 있습니다.
 */
export default function TossPaymentLogsHint({ className = 'dragHint', style }) {
  return (
    <p className={className} style={style}>
      <strong>테스트 결제 내역</strong>은 이 서비스에 클라이언트 키를 넣지 않아도,{' '}
      <a href={TOSS_DEVELOPERS_PAYMENT_LOGS} target="_blank" rel="noopener noreferrer">
        토스페이먼츠 개발자센터 — 결제 로그
      </a>
      에 로그인해 조회할 수 있습니다.{' '}
      <a href={TOSS_DEVELOPERS_HOME} target="_blank" rel="noopener noreferrer">
        개발자 홈
      </a>
    </p>
  );
}
