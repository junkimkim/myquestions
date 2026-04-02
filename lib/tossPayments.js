/**
 * 토스페이먼츠 서버 전용 — 시크릿 키는 절대 클라이언트에 노출하지 않음.
 * @see https://docs.tosspayments.com/reference#%EA%B2%B0%EC%A0%9C-%EC%8A%B9%EC%9D%B8
 */

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

export function getTossSecretKey() {
  const k = process.env.TOSS_PAYMENTS_SECRET_KEY;
  if (!k || typeof k !== 'string') {
    throw new Error('TOSS_PAYMENTS_SECRET_KEY 가 설정되지 않았습니다.');
  }
  return k.trim();
}

function getAuthorizationHeader() {
  const secret = getTossSecretKey();
  const token = Buffer.from(`${secret}:`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

/**
 * @param {{ paymentKey: string, orderId: string, amount: number }} params
 * @returns {Promise<{ ok: true, data: object } | { ok: false, status: number, data: object }>}
 */
export async function confirmTossPayment({ paymentKey, orderId, amount }) {
  const res = await fetch(TOSS_CONFIRM_URL, {
    method: 'POST',
    headers: {
      Authorization: getAuthorizationHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount: Math.floor(Number(amount)),
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return { ok: false, status: res.status, data };
  }

  return { ok: true, data };
}
