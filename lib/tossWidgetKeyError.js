/**
 * 토스 SDK가 "API 개별 연동 키"를 넣었을 때 내는 메시지 감지.
 * @param {unknown} err
 */
export function isTossWidgetKeyTypeError(err) {
  const msg =
    typeof err === 'string'
      ? err
      : err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
        ? err.message
        : '';
  if (!msg) return false;
  return msg.includes('API 개별 연동') || msg.includes('결제위젯 연동 키');
}
