/**
 * Phase 4 (선택): 사용자당 분당 생성 요청 상한 — 프로세스 메모리 기준(서버리스 인스턴스별).
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 45;

/** @type {Map<string, { count: number, resetAt: number }>} */
const buckets = new Map();

export function checkGenerateRateLimit(userId) {
  const now = Date.now();
  let b = buckets.get(userId);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(userId, b);
  }
  b.count += 1;
  if (b.count > MAX_PER_WINDOW) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    };
  }
  return { ok: true };
}
