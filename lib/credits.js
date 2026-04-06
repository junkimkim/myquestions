/**
 * 생성 1회당 차감 캐쉬 (환경변수로 조정).
 * CASH_* 우선, 없으면 기존 CREDIT_* 호환.
 */

const DEFAULT = 1;

function parsePositiveInt(raw) {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

/** 서버: CASH_COST_PER_GENERATION → CREDIT_COST_PER_GENERATION → 기본 1 */
export function getCashCostPerGeneration() {
  return (
    parsePositiveInt(process.env.CASH_COST_PER_GENERATION) ??
    parsePositiveInt(process.env.CREDIT_COST_PER_GENERATION) ??
    DEFAULT
  );
}

/** @deprecated 이름 호환 — getCashCostPerGeneration 과 동일 */
export function getCreditCostPerGeneration() {
  return getCashCostPerGeneration();
}

/** 클라이언트: NEXT_PUBLIC_CASH_COST_PER_GENERATION → NEXT_PUBLIC_CREDIT_* */
export function getPublicCashCostPerGeneration() {
  return (
    parsePositiveInt(process.env.NEXT_PUBLIC_CASH_COST_PER_GENERATION) ??
    parsePositiveInt(process.env.NEXT_PUBLIC_CREDIT_COST_PER_GENERATION) ??
    DEFAULT
  );
}

/** @deprecated — getPublicCashCostPerGeneration 과 동일 */
export function getPublicCreditCostPerGeneration() {
  return getPublicCashCostPerGeneration();
}
