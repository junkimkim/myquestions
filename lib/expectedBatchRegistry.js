/**
 * 예상문제 세트 선결제 배치 — 서버 메모리 (멀티 인스턴스/서버리스에서는 공유되지 않음).
 * @type {Map<string, { userId: string, remaining: number }>}
 */
const batches = new Map();

export function registerExpectedBatch(batchId, userId, remaining) {
  batches.set(batchId, { userId, remaining });
}

export function assertExpectedBatchReady(batchId, userId) {
  const b = batches.get(batchId);
  return Boolean(b && b.userId === userId && b.remaining > 0);
}

/** OpenAI·저장 성공 후 호출 */
export function consumeExpectedBatchSlot(batchId, userId) {
  const b = batches.get(batchId);
  if (!b || b.userId !== userId || b.remaining <= 0) return false;
  b.remaining -= 1;
  if (b.remaining <= 0) {
    batches.delete(batchId);
  }
  return true;
}

export function clearExpectedBatch(batchId, userId) {
  const b = batches.get(batchId);
  if (b && b.userId === userId) {
    batches.delete(batchId);
  }
}
