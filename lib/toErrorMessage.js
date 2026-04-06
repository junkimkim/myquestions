/**
 * UI에 표시할 오류 문자열. Event·비표준 객체는 일반 문구로 대체합니다.
 */
const GARBAGE_STRINGS = new Set(['[object Event]', '[object Object]', '[object Promise]']);

function isGarbageMessage(m) {
  return typeof m === 'string' && GARBAGE_STRINGS.has(m.trim());
}

export function toErrorMessage(err) {
  if (err == null) return '알 수 없는 오류가 발생했습니다.';
  if (typeof Event !== 'undefined' && err instanceof Event) {
    return '요청 처리 중 오류가 발생했습니다. 다시 시도해 주세요.';
  }
  if (typeof err === 'string') {
    return isGarbageMessage(err) ? '알 수 없는 오류가 발생했습니다.' : err;
  }
  if (err instanceof Error) {
    const m = err.message || '';
    if (isGarbageMessage(m)) return '알 수 없는 오류가 발생했습니다.';
    return m.trim() || '알 수 없는 오류가 발생했습니다.';
  }
  if (typeof err === 'object') {
    if (typeof err.message === 'string' && err.message.trim() && !isGarbageMessage(err.message)) return err.message;
    if (typeof err.code === 'string' || typeof err.code === 'number') {
      const m = typeof err.message === 'string' ? err.message : '';
      if (m && !isGarbageMessage(m)) return m;
    }
    if (
      typeof err.type === 'string' &&
      (typeof err.preventDefault === 'function' || 'nativeEvent' in err || 'target' in err)
    ) {
      return '요청 처리 중 오류가 발생했습니다. 다시 시도해 주세요.';
    }
  }
  const s = String(err);
  if (GARBAGE_STRINGS.has(s)) {
    return '알 수 없는 오류가 발생했습니다.';
  }
  return s;
}
