/**
 * Phase 5: 생성 성공 후 헤더 잔액 갱신용 브라우저 이벤트
 */

export const WALLET_REFRESH_EVENT = 'quizforge:wallet-refresh';

export function dispatchWalletRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WALLET_REFRESH_EVENT));
  }
}
