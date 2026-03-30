import { defaultCustomPromptForKind, getTypeKind } from '@/lib/defaultPrompts';

export const GRAMMAR_WRONG_FINDER_TYPE_ID = 'c_grammar_wrong_finder';
/** 테이블 유형: 지문상 표현 5칸만 필요(기호·고쳐 쓰기·서술형 추가 블록 없음) */
export const GRAMMAR_EXPRS_ONLY_TYPE_ID = 'c_ecfd806caa744af8ac1bfcc48744c31e';
/** 사용자 지정: 보기 5문장 + 틀리게 고칠 부분 입력 */
export const GRAMMAR_SENTENCE_MCQ_TYPE_ID = 'c_6dd890316e9e4a3bb1ff6c65f0e147e1';
/** 테이블 유형: 어법 계열이어도 지문상 표현 5칸은 사용하지 않음 */
export const GRAMMAR_SKIP_PASSAGE_EXPRS_TYPE_ID = 'c_5927a2a3636d4920acea6b4a8654c5f0';
/** 어법상 틀린 곳 찾기(객관식): 지문에 넣을 틀린 밑줄 개수 — UI에서는 1 또는 2만 선택 */
export const GRAMMAR_WRONG_SPOT_MAX = 2;

export function clampGrammarWrongSpotCount(v) {
  return Math.max(1, Math.min(GRAMMAR_WRONG_SPOT_MAX, Number(v) || 1));
}

/** 시드 `문맥상 어색한 낱말` — 이름이 바뀌어도 desc/이름 패턴으로 인식 */
export const AWKWARD_WORD_MCQ_TYPE_ID = 'c_6148fad0a7ec44aaaaedd654e54f207f';

export function isAwkwardWordMcqType(row) {
  if (!row) return false;
  if (row.id === AWKWARD_WORD_MCQ_TYPE_ID) return true;
  const t = `${row.name || ''} ${row.desc || ''}`;
  return /문맥상\s*어색한\s*낱말|어색한\s*낱말/.test(t);
}

export function promptHasAnswerCount(prompts, typeId) {
  return String(prompts[typeId] ?? '').includes('{answer_count}');
}

export function promptHasGrammarExprs(prompts, typeId) {
  return String(prompts[typeId] ?? '').includes('{grammar_exprs}');
}

/** DB에 복제된 어법 유형 등 — 이름·설명에 어법+틀린 이 있으면 인식 */
export function rowLooksLikeGrammarWrongFinder(row) {
  if (!row) return false;
  const t = `${row.name || ''} ${row.desc || ''}`;
  return /어법/.test(t) && /틀린/.test(t);
}

/** 시드 ID · {grammar_exprs} · 이름/설명 패턴으로 어법 틀린 곳 유형 인식 */
export function isGrammarWrongFinderType(typeId, customTypes, prompts) {
  const row = customTypes.find((x) => x.id === typeId);
  if (row?.id === GRAMMAR_WRONG_FINDER_TYPE_ID) return true;
  if (promptHasGrammarExprs(prompts, typeId)) return true;
  return rowLooksLikeGrammarWrongFinder(row);
}

export function isGrammarExprsOnlyType(typeId, customTypes) {
  if (typeId === GRAMMAR_EXPRS_ONLY_TYPE_ID) return true;
  if (typeId === GRAMMAR_SENTENCE_MCQ_TYPE_ID) return true;
  const row = customTypes.find((x) => x.id === typeId);
  return row?.mcq_category === 'grammar-mcq';
}

export function isSentenceGrammarMcqType(typeId) {
  return typeId === GRAMMAR_SENTENCE_MCQ_TYPE_ID;
}

/** 지문상 표현 5칸을 프롬프트·검증에 쓸지 — 특정 ID는 제외/전용 */
export function grammarNeedsPassageExprsFive(typeId, customTypes, prompts) {
  if (typeId === GRAMMAR_SKIP_PASSAGE_EXPRS_TYPE_ID) return false;
  if (isGrammarExprsOnlyType(typeId, customTypes)) return true;
  return isGrammarWrongFinderType(typeId, customTypes, prompts);
}

export function grammarNeedsAnswerFormsFive(typeId, customTypes) {
  return isGrammarExprsOnlyType(typeId, customTypes);
}

/** 기호·고쳐 쓰기 또는 {answer_count} 서술 블록 등 “전체 어법 보조 UI”가 필요한지 */
export function grammarNeedsFullSupplementBlocks(typeId, customTypes, prompts) {
  return isGrammarWrongFinderType(typeId, customTypes, prompts) && !isGrammarExprsOnlyType(typeId, customTypes);
}

export function isResetOnEnterAnswerCountType(typeId) {
  return typeId === GRAMMAR_SKIP_PASSAGE_EXPRS_TYPE_ID;
}

export function getTypeGroup(c) {
  const kind = getTypeKind(c);
  if (kind === 'writing') return 'writing';
  if (kind === 'vocabulary') return 'vocabulary';
  if (Boolean(c?.is_descriptive)) return 'descriptive';
  return 'mcq';
}

/** @param {string} typeId @param {{ id: string }[]} customTypes @param {Record<string, string>} prompts */
export function promptRequiresUnderlined(typeId, customTypes, prompts) {
  const row = customTypes.find((x) => x.id === typeId);
  const kind = getTypeKind(row);
  const template = prompts[typeId] ?? defaultCustomPromptForKind(kind);
  return String(template).includes('{underlined_stentence}') || String(template).includes('{underlined_sentence}');
}

/** @param {string} typeId @param {{ id: string }[]} customTypes @param {Record<string, string>} prompts */
export function promptRequiresVoca(typeId, customTypes, prompts) {
  const row = customTypes.find((x) => x.id === typeId);
  const kind = getTypeKind(row);
  const template = prompts[typeId] ?? defaultCustomPromptForKind(kind);
  return String(template).includes('{voca}');
}

/**
 * 영작·어휘·서술·어법 보조 등 지문 외 추가 입력이 필요한 맞춤 유형인지.
 * @param {string} typeId
 * @param {{ id: string, name?: string, desc?: string, kind?: string, is_descriptive?: boolean, mcq_category?: string }[]} customTypes
 * @param {Record<string, string>} prompts
 */
export function typeNeedsExtraInput(typeId, customTypes, prompts) {
  const c = customTypes.find((x) => x.id === typeId);
  if (!c) return false;
  const kind = getTypeKind(c);
  if (kind === 'vocabulary' || kind === 'writing') return true;
  if (promptRequiresUnderlined(typeId, customTypes, prompts)) return true;
  if (grammarNeedsPassageExprsFive(typeId, customTypes, prompts)) return true;
  if (isGrammarWrongFinderType(typeId, customTypes, prompts)) return true;
  if (c.is_descriptive) return true;
  if (isAwkwardWordMcqType(c) && kind === 'mcq') return true;
  if (kind === 'mcq' && promptRequiresVoca(typeId, customTypes, prompts)) return true;
  return false;
}
