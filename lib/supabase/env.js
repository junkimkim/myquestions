/**
 * Supabase 공개 키가 설정되어 있는지 (빌드/런타임).
 * 클라이언트에서는 NEXT_PUBLIC_* 만 사용 가능합니다.
 */
export function isSupabaseConfigured() {
  return Boolean(
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
      typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'string' &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0,
  );
}
