/**
 * 원화 충전 상품 — 서버·클라이언트 공통.
 * 1만원(10,000원) 이상 결제 시 지급 캐쉬에 5% 보너스(원 단위 내림).
 */

const TOPUP_AMOUNTS = [1000, 5000, 10000, 30000, 50000];

/**
 * @param {number} priceKrw 결제 금액(원)
 * @returns {number} 지급 캐쉬
 */
export function cashGrantedForTopup(priceKrw) {
  const n = Number(priceKrw);
  if (!Number.isFinite(n) || n < 1) return 0;
  if (n >= 10000) return Math.floor((n * 105) / 100);
  return Math.floor(n);
}

export const CASH_TOPUP_PACKS = TOPUP_AMOUNTS.map((priceKrw) => {
  const cashGranted = cashGrantedForTopup(priceKrw);
  const bonus = cashGranted - priceKrw;
  return {
    id: `topup_${priceKrw}`,
    name: `${priceKrw.toLocaleString()}원`,
    priceKrw,
    cashGranted,
    bonusCash: bonus,
    note:
      bonus > 0
        ? `결제 ${priceKrw.toLocaleString()}원 → ${cashGranted.toLocaleString()} 캐쉬 (+${bonus.toLocaleString()} 보너스 5%)`
        : '결제 금액과 동일 캐쉬 지급',
  };
});

export function getPackById(id) {
  return CASH_TOPUP_PACKS.find((p) => p.id === id) ?? null;
}

/** 결제 `payments.metadata` 에서 지급 캐쉬 (구 `credits` 호환) */
export function cashGrantedFromPaymentMetadata(metadata) {
  const m = metadata || {};
  const n = Number(m.cashGranted ?? m.credits ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
