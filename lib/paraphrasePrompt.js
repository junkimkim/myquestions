/**
 * Paraphrase 후 변형문제 생성 시 사용자 메시지 앞부분(1단계 + 2단계 헤더).
 * {passage}는 원문 지문으로 치환됩니다.
 */
export const PARAPHRASE_TWO_STEP_PREFIX = `다음 영어 지문을 읽고, 아래 두 단계를 순서대로 수행해 주세요.

[지문]
{passage}

━━━━━━━━━━━━━━━━━━━━━━
[1단계] 지문 Paraphrase
━━━━━━━━━━━━━━━━━━━━━━

원문을 바탕으로 paraphrase 지문을 작성하세요.

Paraphrase 규칙:
1. 원문의 모든 핵심 내용과 논리 흐름을 유지하세요.
2. 아래 변형 기법을 골고루 적용하세요:
   · 어휘 교체 (유의어/다른 품사로 변환)
   · 문장 구조 변경 (단문 → 복문, 능동 → 수동 등)
   · 문장 분리 또는 병합
   · 연결어 교체 (Furthermore → On top of that 등)
3. 원문보다 1~3문장 더 길게 작성하세요.
   - 원문의 함축된 인과관계나 결과를 추가 문장으로 풀어서 써도 됩니다.

[Paraphrase 출력]
(작성된 paraphrase 지문)

━━━━━━━━━━━━━━━━━━━━━━
[2단계] 문제 생성
━━━━━━━━━━━━━━━━━━━━━━

`;

/**
 * 2단계에 붙는 유형별 프롬프트 안에서 {passage}를 이 문구로 바꿉니다.
 * (원문 텍스트를 다시 넣지 않고, 1단계 paraphrase만 근거로 쓰도록 지시)
 */
export const STEP2_PASSAGE_INSTRUCTION = `【1단계 [Paraphrase 출력]에 작성한 영어 지문 전체】
※ 2단계 문제·보기·해설은 오직 위 paraphrase만을 분석·인용의 근거로 하세요. 상단 [지문]의 원문은 직접 인용하거나 문제 근거로 사용하지 마세요.
※ 출력 순서: (1) 1단계에서 작성한 paraphrase 본문을 필요하면 한 번 더 제시 (2) 이어서 아래 요구에 따른 문제 전체를 작성하세요.`;

/**
 * @param {string} passageText 원문
 * @param {string} typePromptTemplate 유형별 프롬프트 ({passage} 포함)
 * @param {boolean} useParaphrase Paraphrase 2단계 모드
 */
export function buildUserPrompt(passageText, typePromptTemplate, useParaphrase) {
  if (!useParaphrase) {
    return typePromptTemplate.replace(/\{passage\}/g, passageText);
  }
  const step1 = PARAPHRASE_TWO_STEP_PREFIX.replace(/\{passage\}/g, passageText);
  const step2Body = typePromptTemplate.replace(/\{passage\}/g, STEP2_PASSAGE_INSTRUCTION);
  return `${step1}${step2Body}`;
}

export const MAX_TOKENS_WITH_PARAPHRASE = 2800;
export const MAX_TOKENS_DEFAULT = 1200;
