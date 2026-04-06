import { InsufficientCreditsError, callGeneratePost } from '@/lib/callGenerateClient';
import { toErrorMessage } from '@/lib/toErrorMessage';
import { getTypeInfo, getTypeKind } from '@/lib/defaultPrompts';
import {
  MAX_TOKENS_DEFAULT,
  MAX_TOKENS_WITH_PARAPHRASE,
  applyGrammarSlotPlaceholders,
  buildUserPrompt,
} from '@/lib/paraphrasePrompt';
import { formatVocabList } from '@/lib/vocabPrompt';
import {
  clampGrammarWrongSpotCount,
  grammarNeedsAnswerFormsFive,
  grammarNeedsFullSupplementBlocks,
  grammarNeedsPassageExprsFive,
  isGrammarExprsOnlyType,
  isGrammarWrongFinderType,
  isResetOnEnterAnswerCountType,
  isSentenceGrammarMcqType,
  promptHasAnswerCount,
} from '@/lib/typeExtraInput';

function getAnswerCountValueForType(typeId, problem) {
  return Math.max(
    1,
    Math.min(
      4,
      Number(
        isResetOnEnterAnswerCountType(typeId)
          ? problem.specialDescriptiveAnswerCount
          : problem.descriptiveAnswerCount,
      ) || 1,
    ),
  );
}

function getAnswerEntriesForType(typeId, problem) {
  return isResetOnEnterAnswerCountType(typeId)
    ? problem.specialDescriptiveAnswerEntries
    : problem.descriptiveAnswerEntries;
}

export function computeGrammarWrongAnswerText(problem) {
  const n = clampGrammarWrongSpotCount(problem.grammarWrongCount);
  const lines = [];
  for (let i = 0; i < n; i += 1) {
    const letter = String(problem.grammarWrongLetters[i] ?? '').trim().toUpperCase();
    const correction = String(problem.grammarWrongCorrections[i] ?? '').trim();
    if (!letter || !correction) continue;
    lines.push(`- 기호 ( ${letter} ) : 고쳐 쓰기 (${correction})`);
  }
  return lines.join('\n');
}

/**
 * @param {number} index1Based
 * @param {Record<string, unknown>} problem
 * @param {string|null} typeId
 * @param {object[]} customTypes
 * @param {Record<string, string>} prompts
 * @returns {string|null} 오류 메시지 또는 null
 */
export function validateExpectedProblem(index1Based, problem, typeId, customTypes, prompts) {
  const label = `${index1Based}번 문제`;
  if (!typeId) return `${label}: 문제 유형을 선택해 주세요.`;

  const typeRow = customTypes.find((x) => x.id === typeId);
  if (!typeRow) return `${label}: 알 수 없는 유형입니다.`;

  const kind = getTypeKind(typeRow);
  const promptTemplate = prompts[typeId];
  const text = String(problem.passage ?? '').trim();
  const wordsTrim = problem.vocabWords.map((w) => String(w ?? '').trim());
  const awkwardVocaTrim = problem.awkwardVocaWords.map((w) => String(w ?? '').trim());
  const grammarExprsTrim = problem.grammarPassageExprs.map((w) => String(w ?? '').trim());
  const grammarAnswersTrim = problem.grammarAnswerForms.map((w) => String(w ?? '').trim());
  const hasAnyGrammarAnswerInput = grammarAnswersTrim.some((w) => Boolean(w));
  const grammarAnswerCount = grammarAnswersTrim.filter(Boolean).length;

  if (!promptTemplate || !String(promptTemplate).includes('{passage}')) {
    return `${label}: 프롬프트에 지문이 들어갈 자리가 없습니다. 유형 설정을 확인하세요.`;
  }
  if (kind === 'writing' && !String(promptTemplate).includes('{answer}')) {
    return `${label}: 영작 유형 프롬프트에 정답 문장이 들어갈 자리가 없습니다. 유형 설정을 확인하세요.`;
  }
  if (kind === 'vocabulary' && !String(promptTemplate).includes('{vocab}')) {
    return `${label}: 어휘 유형 프롬프트에 어휘 목록이 들어갈 자리가 없습니다. 유형 설정을 확인하세요.`;
  }

  if (kind === 'vocabulary' && wordsTrim.some((w) => !w)) {
    return `${label}: 어휘 유형입니다. 출제할 단어 5개를 모두 입력해 주세요.`;
  }

  if (String(prompts[typeId] ?? '').includes('{voca}') && awkwardVocaTrim.some((w) => !w)) {
    return `${label}: 지문상 어휘 5개를 모두 입력해 주세요.`;
  }

  if (grammarNeedsPassageExprsFive(typeId, customTypes, prompts) && grammarExprsTrim.some((w) => !w)) {
    return `${label}: 어법 계열 유형입니다. 보기(지문상 표현) 5개를 모두 입력해 주세요.`;
  }

  if (grammarNeedsAnswerFormsFive(typeId, customTypes) && !hasAnyGrammarAnswerInput) {
    return `${label}: 객관식 어법 유형입니다. 오답 형태(정답) 입력칸에 최소 1개를 입력해 주세요.`;
  }

  const needsPassage = kind !== 'vocabulary';
  if (needsPassage && !text) {
    return `${label}: 영어 지문을 입력해 주세요.`;
  }

  const answerTrim = String(problem.writingAnswer ?? '').trim();
  if (kind === 'writing' && !answerTrim) {
    return `${label}: 영작 유형입니다. 정답(완성 영문 문장)을 입력해 주세요.`;
  }

  const grammarWrongAnswerTrim = computeGrammarWrongAnswerText(problem).trim();
  const grammarActiveIds = grammarNeedsFullSupplementBlocks(typeId, customTypes, prompts) ? [typeId] : [];
  const grammarActive = grammarActiveIds.length > 0;
  if (grammarActive) {
    const grammarUsesAnswerCount = grammarActiveIds.some((id) => promptHasAnswerCount(prompts, id));
    if (grammarUsesAnswerCount) {
      const n = getAnswerCountValueForType(typeId, problem);
      const entries = getAnswerEntriesForType(typeId, problem)
        .slice(0, n)
        .map((v) => String(v ?? '').trim());
      if (entries.some((x) => !x)) {
        return `${label}: 서술형(여러 정답 칸) 유형 — 정답 항목을 모두 입력해 주세요.`;
      }
    } else {
      const n = clampGrammarWrongSpotCount(problem.grammarWrongCount);
      const letters = problem.grammarWrongLetters.slice(0, n).map((l) => String(l ?? '').trim().toUpperCase());
      const corrections = problem.grammarWrongCorrections.slice(0, n).map((v) => String(v ?? '').trim());
      const allowed = new Set(['A', 'B', 'C', 'D', 'E']);
      if (letters.some((l) => !allowed.has(l))) {
        return `${label}: 어법 기호는 A~E 중에서 선택해 주세요.`;
      }
      if (new Set(letters).size !== n) {
        return `${label}: 어법 기호가 중복됩니다.`;
      }
      if (corrections.some((c) => !c)) {
        return `${label}: 고쳐 쓰기 입력을 모두 채워 주세요.`;
      }
      if (!grammarWrongAnswerTrim) {
        return `${label}: 어법 정답 데이터가 비어 있습니다.`;
      }
    }
  }

  const otherDescriptiveNeedingSingleAnswer =
    !grammarNeedsFullSupplementBlocks(typeId, customTypes, prompts) &&
    Boolean(typeRow?.is_descriptive) &&
    !promptHasAnswerCount(prompts, typeId);
  if (otherDescriptiveNeedingSingleAnswer && !String(problem.descriptiveAnswerText ?? '').trim()) {
    return `${label}: 서술형 유형입니다. 정답 입력란을 채워 주세요.`;
  }

  const isDescriptiveType = Boolean(typeRow?.is_descriptive);
  if (isDescriptiveType) {
    const needsAnswerCount = String(promptTemplate).includes('{answer_count}');
    const n = getAnswerCountValueForType(typeId, problem);
    const answerEntriesForType = getAnswerEntriesForType(typeId, problem);
    const answerForThisType = needsAnswerCount
      ? answerEntriesForType
          .slice(0, n)
          .map((v) => String(v ?? '').trim())
          .join('\n')
          .trim()
      : grammarNeedsFullSupplementBlocks(typeId, customTypes, prompts)
        ? grammarWrongAnswerTrim
        : String(problem.descriptiveAnswerText ?? '').trim();
    if (!String(promptTemplate).includes('{answer}')) {
      return `${label}: 서술형 유형 프롬프트에 정답이 들어갈 자리가 없습니다. 유형 설정을 확인하세요.`;
    }
    if (!answerForThisType) {
      return `${label}: 서술형 정답 입력란을 채워 주세요.`;
    }
  }

  const underlinedTrim = String(problem.underlinedSentence ?? '').trim();
  const needsUnderlined =
    String(promptTemplate).includes('{underlined_stentence}') ||
    String(promptTemplate).includes('{underlined_sentence}');
  if (needsUnderlined && !underlinedTrim) {
    return `${label}: 밑줄 표현을 입력해 주세요.`;
  }

  return null;
}

/**
 * @returns {Promise<{ ok: true, text: string } | { ok: false, error: string }>}
 */
export async function runExpectedProblemGeneration({
  problem,
  typeId,
  model,
  paraphraseEnabled,
  customTypes,
  prompts,
  expectedFreeBatchId,
}) {
  const typeRow = customTypes.find((x) => x.id === typeId);
  const kind = getTypeKind(typeRow);
  const promptTemplate = prompts[typeId];
  const text = String(problem.passage ?? '').trim();
  const wordsTrim = problem.vocabWords.map((w) => String(w ?? '').trim());
  const awkwardVocaTrim = problem.awkwardVocaWords.map((w) => String(w ?? '').trim());
  const grammarExprsTrim = problem.grammarPassageExprs.map((w) => String(w ?? '').trim());
  const grammarAnswersTrim = problem.grammarAnswerForms.map((w) => String(w ?? '').trim());
  const grammarAnswerCount = grammarAnswersTrim.filter(Boolean).length;
  const answerTrim = String(problem.writingAnswer ?? '').trim();
  const underlinedTrim = String(problem.underlinedSentence ?? '').trim();
  const grammarWrongAnswerTrim = computeGrammarWrongAnswerText(problem).trim();

  try {
    if (kind === 'vocabulary') {
      let prompt = String(promptTemplate)
        .replace(/\{passage\}/g, text)
        .replace(/\{vocab\}/g, formatVocabList(wordsTrim))
        .replace(/\{underlined_stentence\}/g, underlinedTrim)
        .replace(/\{underlined_sentence\}/g, underlinedTrim);
      if (String(promptTemplate).includes('{voca}')) {
        prompt = prompt.replace(/\{voca\}/g, formatVocabList(awkwardVocaTrim));
      }
      if (grammarNeedsPassageExprsFive(typeId, customTypes, prompts)) {
        const ge = formatVocabList(grammarExprsTrim);
        if (String(promptTemplate).includes('{grammar_exprs}')) {
          prompt = prompt.replace(/\{grammar_exprs\}/g, ge);
        } else if (ge.trim()) {
          prompt = `[지문 밑줄 후보 표현 5개 — 교사 지정]\n${ge}\n\n${prompt}`;
        }
      }
      if (grammarNeedsAnswerFormsFive(typeId, customTypes) && String(promptTemplate).includes('{grammar_answer}')) {
        prompt = prompt.replace(/\{grammar_answer\}/g, formatVocabList(grammarAnswersTrim));
      }
      prompt = applyGrammarSlotPlaceholders(
        prompt,
        grammarNeedsPassageExprsFive(typeId, customTypes, prompts) ? grammarExprsTrim : null,
        grammarNeedsAnswerFormsFive(typeId, customTypes) ? grammarAnswersTrim : null,
      );
      const out = await callGeneratePost({
        model,
        typeLabel: getTypeInfo(typeId, customTypes).label,
        messages: [
          {
            role: 'system',
            content: '당신은 고등학교 내신 영어 문제 전문 출제자입니다. 어휘·영영풀이 형식 지시를 정확히 따릅니다.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2200,
        temperature: 0.7,
        ...(expectedFreeBatchId ? { expectedFreeBatchId } : {}),
      });
      return { ok: true, text: out };
    }

    const needsAnswerCount = String(promptTemplate).includes('{answer_count}');
    const n = getAnswerCountValueForType(typeId, problem);
    const answerEntriesForType = getAnswerEntriesForType(typeId, problem);
    const answerForPrompt = needsAnswerCount
      ? answerEntriesForType
          .slice(0, n)
          .map((v) => String(v ?? '').trim())
          .join('\n')
          .trim()
      : grammarNeedsFullSupplementBlocks(typeId, customTypes, prompts)
        ? grammarWrongAnswerTrim
        : typeRow?.is_descriptive
          ? String(problem.descriptiveAnswerText ?? '').trim()
          : kind === 'writing'
            ? answerTrim
            : '';
    const gwSpots = clampGrammarWrongSpotCount(problem.grammarWrongCount);
    const answerCountForPrompt = needsAnswerCount
      ? String(n)
      : isSentenceGrammarMcqType(typeId)
        ? String(grammarAnswerCount)
        : grammarNeedsFullSupplementBlocks(typeId, customTypes, prompts)
          ? String(gwSpots)
          : '';
    const nForPrompt =
      grammarNeedsFullSupplementBlocks(typeId, customTypes, prompts) && !needsAnswerCount
        ? String(gwSpots)
        : null;
    const vocaForPrompt = String(promptTemplate).includes('{voca}') ? formatVocabList(awkwardVocaTrim) : null;
    const grammarExprsForPrompt = grammarNeedsPassageExprsFive(typeId, customTypes, prompts)
      ? formatVocabList(grammarExprsTrim)
      : null;
    const grammarAnswerForPrompt = grammarNeedsAnswerFormsFive(typeId, customTypes)
      ? formatVocabList(grammarAnswersTrim)
      : null;
    const grammarExprSlotsForPrompt = grammarNeedsPassageExprsFive(typeId, customTypes, prompts)
      ? grammarExprsTrim
      : null;
    const grammarAnswerSlotsForPrompt = grammarNeedsAnswerFormsFive(typeId, customTypes)
      ? grammarAnswersTrim
      : null;

    const prompt = buildUserPrompt(
      text,
      promptTemplate,
      paraphraseEnabled,
      answerForPrompt,
      underlinedTrim,
      answerCountForPrompt,
      nForPrompt,
      vocaForPrompt,
      grammarExprsForPrompt,
      grammarAnswerForPrompt,
      grammarExprSlotsForPrompt,
      grammarAnswerSlotsForPrompt,
    );
    const maxTokens = paraphraseEnabled ? MAX_TOKENS_WITH_PARAPHRASE : MAX_TOKENS_DEFAULT;
    const out = await callGeneratePost({
      model,
      typeLabel: getTypeInfo(typeId, customTypes).label,
      messages: [
        {
          role: 'system',
          content: '당신은 고등학교 내신 영어 문제 전문 출제자입니다. 주어진 지문을 분석하여 고품질의 변형문제를 생성합니다.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
      ...(expectedFreeBatchId ? { expectedFreeBatchId } : {}),
    });
    return { ok: true, text: out };
  } catch (e) {
    if (e instanceof InsufficientCreditsError) {
      return { ok: false, insufficientCredits: true, error: e.message };
    }
    return { ok: false, error: toErrorMessage(e) };
  }
}
