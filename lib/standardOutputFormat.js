/**
 * 변형문제 생성 응답을 [지문] / [문제] / [정답] 세 블록으로 정형화하기 위한 시스템 지시.
 * 유형별 user 프롬프트와 함께 system 메시지에 포함합니다.
 */
export const STANDARD_OUTPUT_FORMAT_SYSTEM_PROMPT = `【출력 형식 — 반드시 준수】
최종 답변은 아래 세 블록만 사용합니다. 블록 제목은 한글 그대로, 대괄호를 포함해 정확히 적습니다. 세 블록 외에 서론·요약·추가 제목(예: 단독 [해설] 섹션)을 넣지 마세요. 해설·근거는 [정답] 블록 안에 적습니다.

[지문]
이 문제에 쓰이는 영어 지문 전체(또는 문제에서 인용하는 지문). 지문이 없는 유형(예: 단어 나열만)이면 한 줄로 "지문 없음" 또는 해당 없음을 명시합니다.

[문제]
발문·지시문·보기·선지 등 문제 본문 전체.

[정답]
정답(번호 또는 서술)·필요 시 간단한 근거·해설.

위 순서([지문] → [문제] → [정답])를 바꾸지 마세요.`;

/** 역할 설명 문자열 뒤에 출력 정형화 지시를 붙입니다. */
export function withStandardOutputFormat(baseSystemInstruction) {
  return `${String(baseSystemInstruction).trim()}\n\n${STANDARD_OUTPUT_FORMAT_SYSTEM_PROMPT}`;
}
