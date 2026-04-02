/**
 * UI에 표시할 오류 문자열. Event·비표준 객체는 일반 문구로 대체합니다.
 */
export function toErrorMessage(err) {
  if (err == null) return '알 수 없는 오류가 발생했습니다.';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || '알 수 없는 오류가 발생했습니다.';
  if (typeof err === 'object') {
    if (typeof err.message === 'string' && err.message.trim()) return err.message;
    if (typeof err.code === 'string' || typeof err.code === 'number') {
      const m = typeof err.message === 'string' ? err.message : '';
      if (m) return m;
    }
    if (
      typeof err.type === 'string' &&
      (typeof err.preventDefault === 'function' || 'nativeEvent' in err || 'target' in err)
    ) {
      return '요청 처리 중 오류가 발생했습니다. 다시 시도해 주세요.';
    }
  }
  const s = String(err);
  if (s === '[object Event]' || s === '[object Object]') {
    return '알 수 없는 오류가 발생했습니다.';
  }
  return s;
}
