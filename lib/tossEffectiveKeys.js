/**
 * 토스 연동 키 — `.env.local` 동기 읽기 우선(파일 저장 직후 반영), 없으면 `process.env`.
 */
import { getParsedEnvLocalFromDiskSync, TOSS_ENV_KEYS } from '@/lib/envLocalFile';

function effectiveKey(envName, diskKey) {
  const parsed = getParsedEnvLocalFromDiskSync();
  const fromDisk = parsed?.[diskKey]?.trim();
  if (fromDisk) return fromDisk;
  return process.env[envName]?.trim() || null;
}

export function getEffectiveTossClientKey() {
  return effectiveKey('NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY', TOSS_ENV_KEYS.client);
}

export function getEffectiveTossSecretKey() {
  return effectiveKey('TOSS_PAYMENTS_SECRET_KEY', TOSS_ENV_KEYS.secret);
}

export function getEffectiveTossSecurityKey() {
  return effectiveKey('TOSS_PAYMENTS_SECURITY_KEY', TOSS_ENV_KEYS.security);
}

export function isTossPaymentConfigured() {
  const c = getEffectiveTossClientKey();
  const s = getEffectiveTossSecretKey();
  return Boolean(c && s);
}
