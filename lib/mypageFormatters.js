/**
 * 마이페이지 결제·원장 표시용 (서버/클라 공통 가능)
 */

export function paymentStatusLabelKo(status) {
  const m = { pending: '대기', paid: '완료', failed: '실패', cancelled: '취소' };
  return m[status] ?? status;
}

export function ledgerTypeLabelKo(type) {
  const m = { charge: '충전·지급', spend: '사용', refund: '환불', adjust: '조정' };
  return m[type] ?? type;
}

/** @param {unknown} _meta 향후 메타 기반 설명용 */
export function describeLedgerReference(reference, _meta) {
  if (!reference) return '—';
  if (reference.startsWith('signup_bonus:')) return '신규 가입 축하 보너스';
  if (reference.startsWith('charge:toss:')) return '토스 결제 충전';
  if (reference.startsWith('expected:batch:')) return '예상문제 세트(일괄 선차감)';
  if (reference.startsWith('spend:gen:')) return '문제 생성';
  if (reference.startsWith('refund:gen:')) return '생성 실패 환불';
  if (reference.startsWith('refund:')) return '환불';
  return reference.length > 56 ? `${reference.slice(0, 56)}…` : reference;
}
