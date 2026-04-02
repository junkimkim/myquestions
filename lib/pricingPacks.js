/**
 * 크레딧 충전 상품 — 서버·클라이언트 공통 (금액·크레딧은 서버 주문 API에서만 확정).
 */

export const CREDIT_PACKS = [
  { id: 'starter', name: '스타터', credits: 50, priceKrw: 9900, note: '가볍게 체험' },
  { id: 'standard', name: '스탠다드', credits: 200, priceKrw: 34900, note: '자주 쓰는 분께' },
  { id: 'pro', name: '프로', credits: 500, priceKrw: 79000, note: '다량 생성' },
];

export function getPackById(id) {
  return CREDIT_PACKS.find((p) => p.id === id) ?? null;
}
