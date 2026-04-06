/**
 * Phase 4: 로그인 세션 + 서버 OpenAI. apiKey 없음.
 * Phase 5: 성공 시 잔액 갱신 이벤트, 402는 InsufficientCreditsError.
 */

import { dispatchWalletRefresh } from '@/lib/walletEvents';

export class InsufficientCreditsError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'InsufficientCreditsError';
    this.code = 'INSUFFICIENT_CREDITS';
    this.balance = details.balance;
    this.requiredCredits = details.requiredCredits;
  }
}

export function isInsufficientCreditsError(err) {
  return err instanceof InsufficientCreditsError || err?.code === 'INSUFFICIENT_CREDITS';
}

export async function callGeneratePost(body) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`요청에 실패했습니다. (${res.status})`);
  }
  if (res.status === 401) {
    throw new Error('로그인이 필요합니다. 상단에서 로그인해 주세요.');
  }
  if (res.status === 402) {
    throw new InsufficientCreditsError(data.error?.message || '캐쉬가 부족합니다. 잔액을 확인해 주세요.', {
      balance: data.error?.balance,
      requiredCredits: data.error?.requiredCredits,
    });
  }
  if (res.status === 429) {
    throw new Error(data.error?.message || '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
  }
  if (res.status === 503) {
    throw new Error(data.error?.message || '서버에 OpenAI 키가 설정되지 않았습니다.');
  }
  if (!res.ok) {
    const msg =
      typeof data.error?.message === 'string'
        ? data.error.message
        : typeof data.error === 'string'
          ? data.error
          : null;
    throw new Error(msg || `요청에 실패했습니다. (${res.status})`);
  }
  const out = data.choices?.[0]?.message?.content;
  if (out == null) throw new Error('응답 형식이 올바르지 않습니다.');
  dispatchWalletRefresh();
  return out;
}
