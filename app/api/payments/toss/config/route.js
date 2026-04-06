import { isTossPaymentConfigured } from '@/lib/tossEffectiveKeys';

export const dynamic = 'force-dynamic';

/** 클라이언트가 결제 UI를 켤 수 있는지(키 존재 여부만, 값은 노출 안 함) */
export async function GET() {
  return Response.json({ configured: isTossPaymentConfigured() });
}
