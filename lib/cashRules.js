/** 캐쉬 소모 정책 (문제 생성 / 한 유형 일괄 / 예상문제 세트) */

/** 신규 가입 시 1회 지급 — DB `handle_new_user` 와 동일 값 유지 */
export const SIGNUP_BONUS_CASH = 200;

/** 메인 문제 생성: 선택 유형 1개당 1회 생성 시 */
export const CASH_MAIN_PER_TYPE_CALL = 40;

/** 한 유형 일괄: 지문 1개(생성 1회)당 — 유형 수를 곱함 (현재 페이지는 유형 1개 고정 → 20) */
export const CASH_ONE_TYPE_PER_PASSAGE_UNIT = 40;

export const MIN_EXPECTED_PROBLEMS = 25;
export const MAX_EXPECTED_PROBLEMS = 30;

/**
 * 예상문제 세트: 25~30문항 일괄 요금 (30→1100, 25→950, 선형).
 * @param {number} n 문항 수
 * @returns {number | null} 범위 밖이면 null
 */
export function expectedBatchCashCost(n) {
  const k = Math.floor(Number(n));
  if (!Number.isFinite(k) || k < MIN_EXPECTED_PROBLEMS || k > MAX_EXPECTED_PROBLEMS) return null;
  return 20 * k - 100;
}
