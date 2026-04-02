/**
 * Phase 3: 생성 1회당 차감 크레딧 (환경변수로 조정).
 * 서버·클라이언트 모두에서 표시용으로 사용 가능 (NEXT_PUBLIC_ 접두).
 */

const DEFAULT = 1;

function parsePositiveInt(raw) {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

/** 서버: CREDIT_COST_PER_GENERATION */
export function getCreditCostPerGeneration() {
  return parsePositiveInt(process.env.CREDIT_COST_PER_GENERATION) ?? DEFAULT;
}

/** 클라이언트 번들: NEXT_PUBLIC_CREDIT_COST_PER_GENERATION (선택). 없으면 기본값 */
export function getPublicCreditCostPerGeneration() {
  return parsePositiveInt(process.env.NEXT_PUBLIC_CREDIT_COST_PER_GENERATION) ?? DEFAULT;
}
