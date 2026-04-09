/**
 * AI 모델이 STEP 1 / STEP 2 / STEP 3 형식의 추론 과정을 출력했을 때
 * 최종 결과 부분만 추출합니다.
 *
 * 처리하는 패턴 예:
 *   **STEP 1 — 정답 단어 선정** … **STEP 2 — 요약문 작성** … **STEP 3 — 최종 출력**
 *   ---
 *   [실제 문제]
 *   ---
 *
 * 패턴이 없으면 원문 그대로 반환합니다.
 */

const STEP_HEADER_RE = /\*\*STEP\s+\d+[^*\n]*\*\*/g;

/**
 * @param {string} raw AI가 반환한 원문 텍스트
 * @returns {string} STEP 추론 과정이 제거된 최종 결과 텍스트
 */
export function stripAiSteps(raw) {
  if (!raw || !STEP_HEADER_RE.test(raw)) return raw;

  // RegExp.test() 가 lastIndex 를 전진시키므로 reset
  STEP_HEADER_RE.lastIndex = 0;

  // 마지막 **STEP …** 헤더 위치 탐색
  let lastMatch = null;
  let m;
  while ((m = STEP_HEADER_RE.exec(raw)) !== null) {
    lastMatch = m;
  }

  if (!lastMatch) return raw;

  // 마지막 STEP 헤더 이후 내용 추출
  let result = raw.slice(lastMatch.index + lastMatch[0].length).trimStart();

  // 앞뒤 --- (수평선) 제거 — 모델이 최종 출력 구분자로 사용할 때
  result = result.replace(/^-{3,}\n?/, '').replace(/\n?-{3,}\s*$/, '').trim();

  return result || raw; // 추출 결과가 비어 있으면 원문 반환
}
