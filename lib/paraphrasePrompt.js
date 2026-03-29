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
 * @param {string} [answerText] 영작 등 — {answer} 치환(없으면 빈 문자열)
 * @param {string} [underlinedText] 밑줄 표현 — {underlined_sentence} 치환(없으면 빈 문자열)
 * @param {string|number} [answerCount] 정답 개수 — {answer_count} 치환
 * @param {string|number|null} [nPlaceholder] 어법 틀린 곳 개수 등 — {n} 치환(null/빈 문자열이면 치환 생략)
 * @param {string|null} [vocaPlaceholder] 지문상 어휘 목록 — {voca} 치환(null이면 치환 생략)
 * @param {string|null} [grammarExprsPlaceholder] 어법 밑줄 후보 표현 5개 — {grammar_exprs} 치환(null이면 생략)
 * @param {string|null} [grammarAnswerPlaceholder] 변형 문제 정답(오답 형태) 5개 — {grammar_answer} 치환(null이면 생략)
 * @param {string[]|null} [grammarExprSlots] 보기 1~5 — {grammar_expr_1}…{grammar_expr_5} 치환(null이면 생략)
 * @param {string[]|null} [grammarAnswerSlots] 틀린 보기 1~5 — {grammar_answer_1}…{grammar_answer_5} 치환(null이면 생략)
 */
export function buildUserPrompt(
  passageText,
  typePromptTemplate,
  useParaphrase,
  answerText = '',
  underlinedText = '',
  answerCount = '',
  nPlaceholder = null,
  vocaPlaceholder = null,
  grammarExprsPlaceholder = null,
  grammarAnswerPlaceholder = null,
  grammarExprSlots = null,
  grammarAnswerSlots = null,
) {
  let result;
  if (!useParaphrase) {
    result = typePromptTemplate.replace(/\{passage\}/g, passageText);
  } else {
    const step1 = PARAPHRASE_TWO_STEP_PREFIX.replace(/\{passage\}/g, passageText);
    const step2Body = typePromptTemplate.replace(/\{passage\}/g, STEP2_PASSAGE_INSTRUCTION);
    result = `${step1}${step2Body}`;
  }
  // 레거시 호환을 위해 오타 변수도 함께 치환합니다.
  const u = underlinedText ?? '';
  let out = result
    .replace(/\{answer\}/g, answerText ?? '')
    .replace(/\{answer_count\}/g, String(answerCount ?? ''))
    .replace(/\{underlined_stentence\}/g, u)
    .replace(/\{underlined_sentence\}/g, u);
  if (nPlaceholder != null && String(nPlaceholder).length > 0) {
    out = out.replace(/\{n\}/g, String(nPlaceholder));
  }
  if (vocaPlaceholder != null) {
    out = out.replace(/\{voca\}/g, String(vocaPlaceholder));
  }
  const geTrim =
    grammarExprsPlaceholder != null ? String(grammarExprsPlaceholder).trim() : '';
  if (geTrim) {
    if (typePromptTemplate.includes('{grammar_exprs}')) {
      out = out.replace(/\{grammar_exprs\}/g, geTrim);
    } else {
      out = `[지문 밑줄 후보 표현 5개 — 교사 지정]\n${geTrim}\n\n${out}`;
    }
  }
  if (grammarAnswerPlaceholder != null) {
    out = out.replace(/\{grammar_answer\}/g, String(grammarAnswerPlaceholder));
  }
  out = applyGrammarSlotPlaceholders(out, grammarExprSlots, grammarAnswerSlots);
  const at = String(answerText ?? '').trim();
  if (at && !typePromptTemplate.includes('{answer}')) {
    out = `[교사 지정 정답·고쳐 쓰기]\n${at}\n\n${out}`;
  }
  return out;
}

/**
 * 보기·틀린 보기를 번호별로 짝 지어 프롬프트에 넣을 때 사용합니다.
 * - {grammar_expr_1} … {grammar_expr_5}
 * - {grammar_answer_1} … {grammar_answer_5}
 * - {grammar_pairs} — (1)~(5) 보기/틀린 보기 블록(둘 다 비어 있으면 해당 줄 생략)
 */
export function applyGrammarSlotPlaceholders(out, grammarExprSlots, grammarAnswerSlots) {
  let s = String(out);
  if (grammarExprSlots && Array.isArray(grammarExprSlots)) {
    for (let i = 0; i < 5; i += 1) {
      const v = String(grammarExprSlots[i] ?? '').trim();
      s = s.replace(new RegExp(`\\{grammar_expr_${i + 1}\\}`, 'g'), v);
    }
  }
  if (grammarAnswerSlots && Array.isArray(grammarAnswerSlots)) {
    for (let i = 0; i < 5; i += 1) {
      const v = String(grammarAnswerSlots[i] ?? '').trim();
      s = s.replace(new RegExp(`\\{grammar_answer_${i + 1}\\}`, 'g'), v);
    }
  }
  if (s.includes('{grammar_pairs}') && grammarExprSlots && grammarAnswerSlots) {
    const pairs = [];
    for (let i = 0; i < 5; i += 1) {
      const e = String(grammarExprSlots[i] ?? '').trim();
      const a = String(grammarAnswerSlots[i] ?? '').trim();
      if (!e && !a) continue;
      pairs.push(`${i + 1}) 보기: ${e}\n   틀린 보기(고칠 부분): ${a}`);
    }
    s = s.replace(/\{grammar_pairs\}/g, pairs.join('\n\n'));
  }
  return s;
}

export const MAX_TOKENS_WITH_PARAPHRASE = 2800;
export const MAX_TOKENS_DEFAULT = 1200;
