'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QuizForgeNav from '@/components/QuizForgeNav';
import {
  DEFAULT_VOCAB_PROMPT,
  DEFAULT_WRITING_PROMPT,
  getTypeInfo,
  getTypeKind,
} from '@/lib/defaultPrompts';
import {
  MAX_TOKENS_DEFAULT,
  MAX_TOKENS_WITH_PARAPHRASE,
  applyGrammarSlotPlaceholders,
  buildUserPrompt,
} from '@/lib/paraphrasePrompt';
import InsufficientCreditsModal from '@/components/InsufficientCreditsModal';
import ProblemSupplementFields from '@/components/ProblemSupplementFields';
import { callGeneratePost, isInsufficientCreditsError } from '@/lib/callGenerateClient';
import { useCustomTypesData } from '@/hooks/useCustomTypesData';
import { toErrorMessage } from '@/lib/toErrorMessage';
import { usePreferredGptModel } from '@/hooks/usePreferredGptModel';
import { CASH_MAIN_PER_TYPE_CALL } from '@/lib/cashRules';
import { formatVocabList } from '@/lib/vocabPrompt';
import {
  GRAMMAR_SKIP_PASSAGE_EXPRS_TYPE_ID,
  GRAMMAR_WRONG_SPOT_MAX,
  clampGrammarWrongSpotCount,
  isAwkwardWordMcqType,
  promptHasAnswerCount,
  isGrammarWrongFinderType,
  isSentenceGrammarMcqType,
  grammarNeedsPassageExprsFive,
  grammarNeedsAnswerFormsFive,
  grammarNeedsFullSupplementBlocks,
  isResetOnEnterAnswerCountType,
  getTypeGroup,
  promptRequiresVoca,
  typeNeedsExtraInput as computeTypeNeedsExtraInput,
} from '@/lib/typeExtraInput';

function IconCheck(props) {
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#0f1117" strokeWidth="3" {...props}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconBolt(props) {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function IconDownload(props) {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" />
    </svg>
  );
}

function IconSuccess(props) {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--success)" strokeWidth="2.5" {...props}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconFail(props) {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--danger)" strokeWidth="2.5" {...props}>
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconAlert(props) {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4m0 4h.01" />
    </svg>
  );
}

export default function Home() {
  const {
    customTypes,
    prompts,
    ready,
    loadError,
    updateCustomType,
  } = useCustomTypesData();
  const [passage, setPassage] = useState('');
  const [vocabWords, setVocabWords] = useState(['', '', '', '', '']);
  const [awkwardVocaWords, setAwkwardVocaWords] = useState(['', '', '', '', '']);
  const [grammarPassageExprs, setGrammarPassageExprs] = useState(['', '', '', '', '']);
  const [grammarAnswerForms, setGrammarAnswerForms] = useState(['', '', '', '', '']);
  const [writingAnswer, setWritingAnswer] = useState('');
  const [paraphraseEnabled, setParaphraseEnabled] = useState(false);
  const { preferredGptModel } = usePreferredGptModel();
  const [activeTypes, setActiveTypes] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState({});
  const [resultOrder, setResultOrder] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [exampleModal, setExampleModal] = useState(null);
  const [dropTargetKind, setDropTargetKind] = useState(null);
  const dragTypeIdRef = useRef(null);
  const [underlinedStentence, setUnderlinedStentence] = useState('');
  const [grammarWrongCount, setGrammarWrongCount] = useState(2);
  const [grammarWrongLetters, setGrammarWrongLetters] = useState(['B', 'C', 'D', 'E']);
  const [grammarWrongCorrections, setGrammarWrongCorrections] = useState(['', '', '', '']);
  const [descriptiveAnswerText, setDescriptiveAnswerText] = useState('');
  const [descriptiveAnswerCount, setDescriptiveAnswerCount] = useState(1);
  const [descriptiveAnswerEntries, setDescriptiveAnswerEntries] = useState(['']);
  const [specialDescriptiveAnswerCount, setSpecialDescriptiveAnswerCount] = useState(1);
  const [specialDescriptiveAnswerEntries, setSpecialDescriptiveAnswerEntries] = useState(['']);
  const [supplementFocusTypeId, setSupplementFocusTypeId] = useState(null);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [creditsModalMessage, setCreditsModalMessage] = useState('');

  useEffect(() => {
    if (!ready) return;
    const validIds = new Set(customTypes.map((t) => t.id));
    setActiveTypes((prev) => prev.filter((id) => validIds.has(id)));
  }, [ready, customTypes]);

  useEffect(() => {
    if (supplementFocusTypeId != null && !activeTypes.includes(supplementFocusTypeId)) {
      setSupplementFocusTypeId(null);
    }
  }, [activeTypes, supplementFocusTypeId]);

  useEffect(() => {
    if (supplementFocusTypeId !== GRAMMAR_SKIP_PASSAGE_EXPRS_TYPE_ID) return;
    setSpecialDescriptiveAnswerCount(1);
    setSpecialDescriptiveAnswerEntries(['']);
  }, [supplementFocusTypeId]);

  useEffect(() => {
    setGrammarWrongCount((c) => clampGrammarWrongSpotCount(c));
  }, []);

  const mainSupplementProblem = useMemo(
    () => ({
      vocabWords,
      awkwardVocaWords,
      grammarPassageExprs,
      grammarAnswerForms,
      writingAnswer,
      underlinedStentence,
      grammarWrongCount,
      grammarWrongLetters,
      grammarWrongCorrections,
      descriptiveAnswerText,
      descriptiveAnswerCount,
      descriptiveAnswerEntries,
      specialDescriptiveAnswerCount,
      specialDescriptiveAnswerEntries,
    }),
    [
      vocabWords,
      awkwardVocaWords,
      grammarPassageExprs,
      grammarAnswerForms,
      writingAnswer,
      underlinedStentence,
      grammarWrongCount,
      grammarWrongLetters,
      grammarWrongCorrections,
      descriptiveAnswerText,
      descriptiveAnswerCount,
      descriptiveAnswerEntries,
      specialDescriptiveAnswerCount,
      specialDescriptiveAnswerEntries,
    ],
  );

  const patchMainSupplement = useCallback((patch) => {
    if (patch.vocabWords !== undefined) setVocabWords(patch.vocabWords);
    if (patch.awkwardVocaWords !== undefined) setAwkwardVocaWords(patch.awkwardVocaWords);
    if (patch.grammarPassageExprs !== undefined) setGrammarPassageExprs(patch.grammarPassageExprs);
    if (patch.grammarAnswerForms !== undefined) setGrammarAnswerForms(patch.grammarAnswerForms);
    if (patch.writingAnswer !== undefined) setWritingAnswer(patch.writingAnswer);
    if (patch.underlinedStentence !== undefined) setUnderlinedStentence(patch.underlinedStentence);
    if (patch.grammarWrongCount !== undefined) setGrammarWrongCount(patch.grammarWrongCount);
    if (patch.grammarWrongLetters !== undefined) setGrammarWrongLetters(patch.grammarWrongLetters);
    if (patch.grammarWrongCorrections !== undefined) setGrammarWrongCorrections(patch.grammarWrongCorrections);
    if (patch.descriptiveAnswerText !== undefined) setDescriptiveAnswerText(patch.descriptiveAnswerText);
    if (patch.descriptiveAnswerCount !== undefined) setDescriptiveAnswerCount(patch.descriptiveAnswerCount);
    if (patch.descriptiveAnswerEntries !== undefined) setDescriptiveAnswerEntries(patch.descriptiveAnswerEntries);
    if (patch.specialDescriptiveAnswerCount !== undefined) setSpecialDescriptiveAnswerCount(patch.specialDescriptiveAnswerCount);
    if (patch.specialDescriptiveAnswerEntries !== undefined) setSpecialDescriptiveAnswerEntries(patch.specialDescriptiveAnswerEntries);
  }, []);

  const typeIds = useMemo(() => customTypes.map((c) => c.id), [customTypes]);

  const activeCount = useMemo(
    () => typeIds.filter((id) => activeTypes.includes(id)).length,
    [typeIds, activeTypes],
  );

  const estimatedMainCash = useMemo(
    () => activeCount * CASH_MAIN_PER_TYPE_CALL,
    [activeCount],
  );

  const handleColumnDragOver = useCallback((e, kind) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetKind(kind);
  }, []);

  const handleColumnDragLeave = useCallback((e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDropTargetKind(null);
  }, []);

  const handleColumnDrop = useCallback(
    (targetKind) => async (e) => {
      e.preventDefault();
      setDropTargetKind(null);
      const id = dragTypeIdRef.current || e.dataTransfer.getData('text/plain');
      dragTypeIdRef.current = null;
      if (!id) return;
      const row = customTypes.find((x) => x.id === id);
      if (!row) return;
      const current = getTypeGroup(row);
      if (current === targetKind) return;

      const p = prompts[id] || '';
      if (targetKind === 'writing') {
        if (!p.includes('{answer}')) {
          await updateCustomType(id, { kind: 'writing', prompt: DEFAULT_WRITING_PROMPT });
        } else {
          await updateCustomType(id, { kind: 'writing' });
        }
        return;
      }
      if (targetKind === 'vocabulary') {
        if (!p.includes('{vocab}') || !p.includes('{passage}')) {
          await updateCustomType(id, { kind: 'vocabulary', prompt: DEFAULT_VOCAB_PROMPT });
        } else {
          await updateCustomType(id, { kind: 'vocabulary' });
        }
        return;
      }
      if (targetKind === 'descriptive') {
        await updateCustomType(id, { kind: 'mcq', is_descriptive: true });
        return;
      }
      await updateCustomType(id, { kind: 'mcq', is_descriptive: false });
    },
    [customTypes, prompts, updateCustomType],
  );

  const typeNeedsExtraInput = useCallback(
    (typeId) => computeTypeNeedsExtraInput(typeId, customTypes, prompts),
    [customTypes, prompts],
  );

  /** 선택된 유형 중 추가 입력이 필요한 것만, 선택 순서대로 */
  const activeExtraTypeIds = useMemo(
    () => activeTypes.filter((id) => typeNeedsExtraInput(id)),
    [activeTypes, typeNeedsExtraInput],
  );

  /** 추가 입력 불필요·필요 구역 각각에 표시할 목록(객관식·서술·영작·어휘 통합) */
  const typesPassageOnlyBucket = useMemo(
    () => customTypes.filter((c) => !typeNeedsExtraInput(c.id)),
    [customTypes, typeNeedsExtraInput],
  );
  const typesNeedingExtraBucket = useMemo(
    () => customTypes.filter((c) => typeNeedsExtraInput(c.id)),
    [customTypes, typeNeedsExtraInput],
  );

  /** 상단 구역(지문만 입력하면 되는 유형)만 일괄 선택·해제 */
  const selectAllPassageOnlyTypes = useCallback(() => {
    const passageIds = typesPassageOnlyBucket.map((c) => c.id);
    if (passageIds.length === 0) return;
    const passageSet = new Set(passageIds);
    setActiveTypes((prev) => {
      const withoutPassage = prev.filter((id) => !passageSet.has(id));
      return [...withoutPassage, ...passageIds];
    });
  }, [typesPassageOnlyBucket]);

  const deselectPassageOnlyTypes = useCallback(() => {
    const passageSet = new Set(typesPassageOnlyBucket.map((c) => c.id));
    setActiveTypes((prev) => prev.filter((id) => !passageSet.has(id)));
    setSupplementFocusTypeId((fid) => (fid && passageSet.has(fid) ? null : fid));
  }, [typesPassageOnlyBucket]);

  const grammarWrongAnswerText = useMemo(() => {
    const n = clampGrammarWrongSpotCount(grammarWrongCount);
    const lines = [];
    for (let i = 0; i < n; i += 1) {
      const letter = String(grammarWrongLetters[i] ?? '').trim().toUpperCase();
      const correction = String(grammarWrongCorrections[i] ?? '').trim();
      if (!letter || !correction) continue;
      lines.push(`- 기호 ( ${letter} ) : 고쳐 쓰기 (${correction})`);
    }
    return lines.join('\n');
  }, [grammarWrongCount, grammarWrongLetters, grammarWrongCorrections]);

  const getAnswerCountValueForType = useCallback(
    (typeId) =>
      Math.max(
        1,
        Math.min(
          4,
          Number(
            isResetOnEnterAnswerCountType(typeId)
              ? specialDescriptiveAnswerCount
              : descriptiveAnswerCount,
          ) || 1,
        ),
      ),
    [descriptiveAnswerCount, specialDescriptiveAnswerCount],
  );

  const getAnswerEntriesForType = useCallback(
    (typeId) =>
      isResetOnEnterAnswerCountType(typeId)
        ? specialDescriptiveAnswerEntries
        : descriptiveAnswerEntries,
    [descriptiveAnswerEntries, specialDescriptiveAnswerEntries],
  );

  const toggleType = useCallback((type) => {
    setActiveTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }, []);

  const openExampleModal = useCallback(async (c) => {
    const title = c?.name || '유형';
    const typeId = c?.id;
    if (!typeId) return;
    setExampleModal({ open: true, typeId, title, status: 'loading' });
    try {
      const res = await fetch(`/api/custom-type-example?typeId=${encodeURIComponent(typeId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExampleModal((prev) =>
          prev && prev.typeId === typeId
            ? { ...prev, status: 'error', err: data.error || `조회 실패 (${res.status})` }
            : prev,
        );
        return;
      }
      if (data.found && data.url) {
        setExampleModal((prev) =>
          prev && prev.typeId === typeId
            ? { ...prev, status: 'ok', url: `${data.url}?v=${Date.now()}` }
            : prev,
        );
      } else {
        setExampleModal((prev) =>
          prev && prev.typeId === typeId ? { ...prev, status: 'empty' } : prev,
        );
      }
    } catch (e) {
      setExampleModal((prev) =>
        prev && prev.typeId === typeId
          ? { ...prev, status: 'error', err: e instanceof Error ? e.message : '오류' }
          : prev,
      );
    }
  }, []);

  const closeExampleModal = useCallback(() => setExampleModal(null), []);

  const showError = useCallback((msg) => {
    setValidationError(msg);
    setShowResults(true);
    setResults({});
    setResultOrder([]);
  }, []);

  const generateQuestions = useCallback(async () => {
    const text = passage.trim();
    const customActive = typeIds.filter((id) => activeTypes.includes(id));
    const wordsTrim = vocabWords.map((w) => w.trim());
    const awkwardVocaTrim = awkwardVocaWords.map((w) => w.trim());
    const grammarExprsTrim = grammarPassageExprs.map((w) => w.trim());
    const grammarAnswersTrim = grammarAnswerForms.map((w) => w.trim());
    const hasAnyGrammarAnswerInput = grammarAnswersTrim.some((w) => Boolean(w));
    const grammarAnswerCount = grammarAnswersTrim.filter(Boolean).length;

    if (customActive.length === 0) {
      showError('최소 한 가지 문제 유형을 선택해주세요.');
      return;
    }

    const anyVocabActive = customActive.some((id) => {
      const c = customTypes.find((x) => x.id === id);
      return c && getTypeKind(c) === 'vocabulary';
    });
    if (anyVocabActive && wordsTrim.some((w) => !w)) {
      showError('어휘 유형을 선택했습니다. 출제할 단어 5개를 모두 입력해 주세요.');
      return;
    }

    const anyActiveNeedsVoca = customActive.some((id) => String(prompts[id] ?? '').includes('{voca}'));
    if (anyActiveNeedsVoca && awkwardVocaTrim.some((w) => !w)) {
      showError(
        '지문상 어휘 입력이 필요한 유형이 선택되어 있습니다. 해당 유형 카드를 눌러 지문상 어휘 5개를 모두 입력해 주세요.',
      );
      return;
    }

    const anyActiveNeedsGrammarExprs = customActive.some((id) =>
      grammarNeedsPassageExprsFive(id, customTypes, prompts),
    );
    if (anyActiveNeedsGrammarExprs && grammarExprsTrim.some((w) => !w)) {
      showError(
        '어법상 틀린 곳 찾기 계열 유형이 선택되어 있습니다. 해당 유형 카드를 눌러 보기(지문상 표현) 5개를 모두 입력해 주세요.',
      );
      return;
    }
    const anyActiveNeedsGrammarAnswerForms = customActive.some((id) =>
      grammarNeedsAnswerFormsFive(id, customTypes),
    );
    if (anyActiveNeedsGrammarAnswerForms && !hasAnyGrammarAnswerInput) {
      showError(
        '어법상 틀린 것 찾기 (객관식) 유형이 선택되어 있습니다. 오답 형태(정답) 입력칸에 최소 1개를 입력해 주세요.',
      );
      return;
    }

    const needsPassage = customActive.some((id) => {
      const c = customTypes.find((x) => x.id === id);
      return c && getTypeKind(c) !== 'vocabulary';
    });
    if (needsPassage && !text) {
      showError('선택한 유형 중 지문이 필요한 유형이 있습니다. 영어 지문을 입력해 주세요.');
      return;
    }

    const answerTrim = writingAnswer.trim();
    const underlinedTrim = underlinedStentence.trim();
    const grammarWrongAnswerTrim = grammarWrongAnswerText.trim();
    const anyActiveWriting = customActive.some((id) => {
      const c = customTypes.find((x) => x.id === id);
      return c && getTypeKind(c) === 'writing';
    });
    if (anyActiveWriting && !answerTrim) {
      showError('영작 유형을 선택했습니다. 정답(완성 영문 문장)을 입력해 주세요.');
      return;
    }

    const grammarActiveIds = customActive.filter((id) =>
      grammarNeedsFullSupplementBlocks(id, customTypes, prompts),
    );
    const grammarActive = grammarActiveIds.length > 0;
    const grammarUsesAnswerCount = grammarActiveIds.some((id) => promptHasAnswerCount(prompts, id));
    if (grammarActive) {
      if (grammarUsesAnswerCount) {
        const idsNeedingAnswerCount = grammarActiveIds.filter((id) =>
          promptHasAnswerCount(prompts, id),
        );
        for (const id of idsNeedingAnswerCount) {
          const n = getAnswerCountValueForType(id);
          const entries = getAnswerEntriesForType(id)
            .slice(0, n)
            .map((v) => String(v ?? '').trim());
          if (entries.some((x) => !x)) {
            showError('서술형(여러 정답 칸) 유형: 정답 항목을 1개씩 모두 입력해 주세요.');
            return;
          }
        }
      } else {
        const n = clampGrammarWrongSpotCount(grammarWrongCount);
        const letters = grammarWrongLetters.slice(0, n).map((l) => String(l ?? '').trim().toUpperCase());
        const corrections = grammarWrongCorrections.slice(0, n).map((v) => String(v ?? '').trim());
        const allowed = new Set(['A', 'B', 'C', 'D', 'E']);
        if (letters.some((l) => !allowed.has(l))) {
          showError('어법상 틀린 곳 개수 입력: 기호는 A~E 중에서 선택해 주세요.');
          return;
        }
        if (new Set(letters).size !== n) {
          showError('어법상 틀린 곳 개수 입력: 기호가 중복됩니다. 서로 다른 기호를 선택해 주세요.');
          return;
        }
        if (corrections.some((c) => !c)) {
          showError('어법상 틀린 곳 개수 입력: 각 고쳐 쓰기 입력을 모두 채워 주세요.');
          return;
        }
        if (!grammarWrongAnswerTrim) {
          showError('어법상 틀린 곳 개수 입력: 정답 데이터가 비어 있습니다.');
          return;
        }
      }
    }

    const otherDescriptiveNeedingSingleAnswer = customActive.some((id) => {
      if (grammarNeedsFullSupplementBlocks(id, customTypes, prompts)) return false;
      const row = customTypes.find((x) => x.id === id);
      if (!row || !row.is_descriptive) return false;
      return !promptHasAnswerCount(prompts, id);
    });
    if (otherDescriptiveNeedingSingleAnswer && !descriptiveAnswerText.trim()) {
      showError('서술형 유형이 선택되어 있습니다. 정답 입력란을 채워 주세요.');
      return;
    }

    const jobs = [];
    for (const id of typeIds) {
      if (customActive.includes(id)) jobs.push(id);
    }

    setValidationError(null);
    setGenerating(true);
    setShowResults(true);
    setResults({});
    setResultOrder(jobs);

    for (const type of jobs) {
      const info = getTypeInfo(type, customTypes);
      const label = info.label;
      const tagClass = info.tagClass;
      const typeRow = customTypes.find((x) => x.id === type);
      const kind = getTypeKind(typeRow);
      const promptTemplate = prompts[type];

      if (!promptTemplate || !String(promptTemplate).includes('{passage}')) {
        setResults((prev) => ({
          ...prev,
          [type]: {
            status: 'error',
            label,
            tagClass,
            error: '이 유형의 프롬프트에 지문이 들어갈 자리가 없습니다. 유형 설정에서 프롬프트를 확인하세요.',
          },
        }));
        continue;
      }
      if (kind === 'writing' && !String(promptTemplate).includes('{answer}')) {
        setResults((prev) => ({
          ...prev,
          [type]: {
            status: 'error',
            label,
            tagClass,
            error: '영작 유형 프롬프트에 정답 문장이 들어갈 자리가 없습니다. 유형 설정을 확인하세요.',
          },
        }));
        continue;
      }
      if (kind === 'vocabulary' && !String(promptTemplate).includes('{vocab}')) {
        setResults((prev) => ({
          ...prev,
          [type]: {
            status: 'error',
            label,
            tagClass,
            error: '어휘 유형 프롬프트에 어휘 목록이 들어갈 자리가 없습니다. 유형 설정을 확인하세요.',
          },
        }));
        continue;
      }

      const isDescriptiveType = Boolean(typeRow?.is_descriptive);
      if (isDescriptiveType) {
        const needsAnswerCount = String(promptTemplate).includes('{answer_count}');
        const n = getAnswerCountValueForType(type);
        const answerEntriesForType = getAnswerEntriesForType(type);
        const answerForThisType = needsAnswerCount
          ? answerEntriesForType
              .slice(0, n)
              .map((v) => String(v ?? '').trim())
              .join('\n')
              .trim()
          : grammarNeedsFullSupplementBlocks(type, customTypes, prompts)
            ? grammarWrongAnswerText.trim()
            : descriptiveAnswerText.trim();
        if (!String(promptTemplate).includes('{answer}')) {
          setResults((prev) => ({
            ...prev,
            [type]: {
              status: 'error',
              label,
              tagClass,
              error: '서술형 유형 프롬프트에 정답이 들어갈 자리가 없습니다. 유형 설정을 확인하세요.',
            },
          }));
          continue;
        }
        if (!answerForThisType) {
          setResults((prev) => ({
            ...prev,
            [type]: {
              status: 'error',
              label,
              tagClass,
              error: '서술형 유형의 정답 입력란을 채워 주세요.',
            },
          }));
          continue;
        }
      }

      const needsUnderlined =
        String(promptTemplate).includes('{underlined_stentence}') || String(promptTemplate).includes('{underlined_sentence}');
      if (needsUnderlined && !underlinedTrim) {
        setResults((prev) => ({
          ...prev,
          [type]: {
            status: 'error',
            label,
            tagClass,
            error: '밑줄로 묻고 싶은 표현을 입력해 주세요.',
          },
        }));
        continue;
      }

      const needsVoca = String(promptTemplate).includes('{voca}');
      if (needsVoca && awkwardVocaTrim.some((w) => !w)) {
        setResults((prev) => ({
          ...prev,
          [type]: {
            status: 'error',
            label,
            tagClass,
            error: '지문상 어휘 5개를 모두 입력해 주세요.',
          },
        }));
        continue;
      }

      const needsGrammarExprs = grammarNeedsPassageExprsFive(type, customTypes, prompts);
      if (needsGrammarExprs && grammarExprsTrim.some((w) => !w)) {
        setResults((prev) => ({
          ...prev,
          [type]: {
            status: 'error',
            label,
            tagClass,
            error: '어법상 틀린 곳 찾기 유형입니다. 보기(지문상 표현) 5개를 모두 입력해 주세요.',
          },
        }));
        continue;
      }
      const needsGrammarAnswerForms = grammarNeedsAnswerFormsFive(type, customTypes);
      if (needsGrammarAnswerForms && !hasAnyGrammarAnswerInput) {
        setResults((prev) => ({
          ...prev,
          [type]: {
            status: 'error',
            label,
            tagClass,
            error: '어법상 틀린 것 찾기 (객관식) 유형입니다. 오답 형태(정답)를 최소 1개 입력해 주세요.',
          },
        }));
        continue;
      }

      setResults((prev) => ({
        ...prev,
        [type]: { status: 'loading', label, tagClass },
      }));

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
          if (grammarNeedsPassageExprsFive(type, customTypes, prompts)) {
            const ge = formatVocabList(grammarExprsTrim);
            if (String(promptTemplate).includes('{grammar_exprs}')) {
              prompt = prompt.replace(/\{grammar_exprs\}/g, ge);
            } else if (ge.trim()) {
              prompt = `[지문 밑줄 후보 표현 5개 — 교사 지정]\n${ge}\n\n${prompt}`;
            }
          }
          if (grammarNeedsAnswerFormsFive(type, customTypes) && String(promptTemplate).includes('{grammar_answer}')) {
            prompt = prompt.replace(/\{grammar_answer\}/g, formatVocabList(grammarAnswersTrim));
          }
          prompt = applyGrammarSlotPlaceholders(
            prompt,
            grammarNeedsPassageExprsFive(type, customTypes, prompts) ? grammarExprsTrim : null,
            grammarNeedsAnswerFormsFive(type, customTypes) ? grammarAnswersTrim : null,
          );
          const out = await callGeneratePost({
            typeLabel: label,
            model: preferredGptModel,
            messages: [
              {
                role: 'system',
                content: '당신은 고등학교 내신 영어 문제 전문 출제자입니다. 어휘·영영풀이 형식 지시를 정확히 따릅니다.',
              },
              { role: 'user', content: prompt },
            ],
            max_tokens: 2200,
            temperature: 0.7,
            cashPolicy: 'main',
          });
          setResults((prev) => ({
            ...prev,
            [type]: { status: 'ok', label, tagClass, text: out },
          }));
          continue;
        }

        const needsAnswerCount = String(promptTemplate).includes('{answer_count}');
        const n = getAnswerCountValueForType(type);
        const answerEntriesForType = getAnswerEntriesForType(type);
        const answerForPrompt = needsAnswerCount
          ? answerEntriesForType
              .slice(0, n)
              .map((v) => String(v ?? '').trim())
              .join('\n')
              .trim()
          : grammarNeedsFullSupplementBlocks(type, customTypes, prompts)
            ? grammarWrongAnswerText.trim()
            : typeRow?.is_descriptive
              ? descriptiveAnswerText.trim()
              : kind === 'writing'
                ? answerTrim
                : '';
        const gwSpots = clampGrammarWrongSpotCount(grammarWrongCount);
        const answerCountForPrompt = needsAnswerCount
          ? String(n)
          : isSentenceGrammarMcqType(type)
            ? String(grammarAnswerCount)
          : grammarNeedsFullSupplementBlocks(type, customTypes, prompts)
            ? String(gwSpots)
            : '';
        const nForPrompt =
          grammarNeedsFullSupplementBlocks(type, customTypes, prompts) && !needsAnswerCount
            ? String(gwSpots)
            : null;
        const vocaForPrompt = String(promptTemplate).includes('{voca}')
          ? formatVocabList(awkwardVocaTrim)
          : null;
        const grammarExprsForPrompt = grammarNeedsPassageExprsFive(type, customTypes, prompts)
          ? formatVocabList(grammarExprsTrim)
          : null;
        const grammarAnswerForPrompt = grammarNeedsAnswerFormsFive(type, customTypes)
          ? formatVocabList(grammarAnswersTrim)
          : null;
        const grammarExprSlotsForPrompt = grammarNeedsPassageExprsFive(type, customTypes, prompts)
          ? grammarExprsTrim
          : null;
        const grammarAnswerSlotsForPrompt = grammarNeedsAnswerFormsFive(type, customTypes)
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
          typeLabel: label,
          model: preferredGptModel,
          messages: [
            {
              role: 'system',
              content: '당신은 고등학교 내신 영어 문제 전문 출제자입니다. 주어진 지문을 분석하여 고품질의 변형문제를 생성합니다.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
          cashPolicy: 'main',
        });

        setResults((prev) => ({
          ...prev,
          [type]: { status: 'ok', label, tagClass, text: out },
        }));
      } catch (err) {
        if (isInsufficientCreditsError(err)) {
          setCreditsModalOpen(true);
          setCreditsModalMessage(err.message);
        }
        setResults((prev) => ({
          ...prev,
          [type]: {
            status: 'error',
            label,
            tagClass,
            error: toErrorMessage(err),
          },
        }));
      }
    }

    setGenerating(false);
  }, [
    passage,
    vocabWords,
    awkwardVocaWords,
    grammarPassageExprs,
    grammarAnswerForms,
    writingAnswer,
    underlinedStentence,
    grammarWrongCount,
    grammarWrongLetters,
    grammarWrongCorrections,
    grammarWrongAnswerText,
    descriptiveAnswerText,
    descriptiveAnswerCount,
    descriptiveAnswerEntries,
    specialDescriptiveAnswerCount,
    specialDescriptiveAnswerEntries,
    paraphraseEnabled,
    preferredGptModel,
    activeTypes,
    prompts,
    showError,
    typeIds,
    customTypes,
  ]);

  const hasDownloadable = useMemo(
    () => Object.values(results).some((r) => r && r.status === 'ok'),
    [results],
  );

  const downloadDocx = useCallback(async () => {
    const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import('docx');
    const fileSaverMod = await import('file-saver');
    const saveAs =
      typeof fileSaverMod.default === 'function' ? fileSaverMod.default : fileSaverMod.saveAs;

    const children = [];
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'QuizForge — 변형문제', bold: true, size: 32 })],
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 },
      }),
    );

    const p = passage.trim();
    if (p) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: '📄 원본 지문', bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: p, size: 22 })], spacing: { after: 400 } }),
      );
    }

    const vw = vocabWords.map((w) => w.trim()).filter(Boolean);
    const docHasVocab = resultOrder.some((tid) => {
      const c = customTypes.find((x) => x.id === tid);
      return c && getTypeKind(c) === 'vocabulary';
    });
    if (vw.length === 5 && docHasVocab) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: '📚 출제 어휘 (5개)', bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: vw.join(', '), size: 22 })], spacing: { after: 400 } }),
      );
    }

    const wa = writingAnswer.trim();
    const docHasWriting = resultOrder.some((tid) => {
      const c = customTypes.find((x) => x.id === tid);
      return c && getTypeKind(c) === 'writing';
    });
    if (wa && docHasWriting) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: '✏️ 영작 정답 문장', bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: wa, size: 22 })], spacing: { after: 400 } }),
      );
    }

    for (const type of resultOrder) {
      const r = results[type];
      if (!r || r.status !== 'ok') continue;
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `▶ ${r.label}`, bold: true, color: '1a1a2e', size: 26 })],
          border: { bottom: { value: 'single', size: 6, color: 'e8c87d' } },
          spacing: { before: 400, after: 200 },
        }),
      );
      const lines = r.text.split('\n');
      for (const line of lines) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line || ' ', size: 22 })],
            spacing: { after: 80 },
          }),
        );
      }
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const dateStr = new Date().toLocaleDateString('ko-KR').replace(/\./g, '').replace(/ /g, '');
    saveAs(blob, `변형문제_${dateStr}.docx`);
  }, [passage, vocabWords, writingAnswer, results, resultOrder, customTypes]);

  function renderCustomCard(c) {
    const info = getTypeInfo(c.id, customTypes);
    const active = activeTypes.includes(c.id);
    return (
      <div
        key={c.id}
        className={`typeCardShell typeCardShellCustom ${active ? 'typeCardShellActive' : ''}`}
      >
        <button
          type="button"
          className="typeDragHandle"
          draggable
          aria-label="드래그하여 이 목록 구역에 놓으면 객관식으로 저장됩니다"
          title="이 구역에 놓으면 객관식으로 바뀝니다. 서술형·영작·어휘는 등록된 유형에 맞게 설정되어 있어야 합니다."
          onClick={(e) => e.preventDefault()}
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', c.id);
            e.dataTransfer.effectAllowed = 'move';
            dragTypeIdRef.current = c.id;
          }}
          onDragEnd={() => {
            dragTypeIdRef.current = null;
            setDropTargetKind(null);
          }}
        >
          ≡
        </button>
        <button
          type="button"
          className={`typeCard ${active ? 'typeCardActive' : ''}`}
          onClick={() => {
            const on = activeTypes.includes(c.id);
            const needsExtra = typeNeedsExtraInput(c.id);
            if (on && needsExtra) {
              if (supplementFocusTypeId === c.id) {
                toggleType(c.id);
              } else {
                setSupplementFocusTypeId(c.id);
              }
              return;
            }
            toggleType(c.id);
            setSupplementFocusTypeId(c.id);
          }}
        >
          <div className="typeCheck">
            <IconCheck />
          </div>
          <div className="typeInfo">
            <div className="typeName">{info.name}</div>
            <div className="typeDesc">{info.desc}</div>
          </div>
        </button>
        <div className="typeCardSide typeCardSideExampleOnly">
          <button
            type="button"
            className="examplePreviewBtn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openExampleModal(c);
            }}
          >
            예시 보기
          </button>
        </div>
      </div>
    );
  }

  function renderGlobalPassageAndOptions() {
    return (
      <div className="inlineTypeConfig globalPassageConfig">
        <div className="sectionLabel">영어 지문 입력</div>
        <p className="globalPassageHint">
          한 지문으로 선택한 모든 유형의 문제를 만듭니다.
        </p>
        <div className="passageWrap">
          <textarea
            value={passage}
            onChange={(e) => setPassage(e.target.value)}
            placeholder="분석할 영어 지문을 여기에 붙여넣으세요..."
          />
          <span className="charCount">{passage.length.toLocaleString()}자</span>
        </div>
        <div className="paraphraseModelRow paraphraseModelRowSingle">
          <div className="paraphraseHalf paraphraseHalfFull">
            <div className="paraphraseRow">
              <input
                id="paraphrase-check-main"
                type="checkbox"
                checked={paraphraseEnabled}
                onChange={(e) => setParaphraseEnabled(e.target.checked)}
              />
              <label htmlFor="paraphrase-check-main" className="paraphraseLabel">
                <span className="paraphraseTitle">Paraphraze</span>
                <span className="paraphraseHint">
                  켜면 먼저 지문을 paraphrase한 뒤, 동일한 내용의 새로운 지문으로 선택한 유형의 변형 문제를 생성합니다. (1단계 지문 Paraphrase → 2단계 문제 생성)
                </span>
              </label>
            </div>
          </div>
        </div>

      </div>
    );
  }

  function renderTypeBucket({ title, hint, typeList }) {
    return (
      <div className="typesBucket">
        <div className="typesBucketTitle">{title}</div>
        <p className="dragHint typesBucketHint">{hint}</p>
        <div
          className={`typesDropColumn ${dropTargetKind === 'mcq' ? 'typesDropColumnActive' : ''}`}
          onDragOver={(e) => handleColumnDragOver(e, 'mcq')}
          onDragLeave={handleColumnDragLeave}
          onDrop={handleColumnDrop('mcq')}
        >
          <div className="typesSubLabel">문제 유형</div>
          <div className="typesGrid">
            {typeList.length > 0 ? (
              typeList.map((c) => renderCustomCard(c))
            ) : (
              <p className="typesDropZoneEmpty">
                표시할 유형이 없습니다. ≡를 드래그해 이 구역에 놓으면 객관식으로 저장됩니다.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">for Teachers</span>
        </div>
        <p className="subtitle">영어 지문 → AI 변형문제 자동 생성 · Word 파일 다운로드</p>
      </header>
      <QuizForgeNav />
      {!ready ? (
        <p className="subtitle">불러오는 중…</p>
      ) : (
        <>
          {loadError && (
            <p className="persistMsg persistMsgErr" style={{ marginBottom: 16 }}>
              문제 유형을 불러오지 못했습니다: {loadError}
            </p>
          )}
          <p className="persistMsg" style={{ marginBottom: 16 }}>
            생성은 <strong>로그인</strong>과 <strong>캐쉬</strong>로 진행됩니다.{' '}
          </p>

          <div className="mainWorkRow">
            <div className="mainWorkColLeft">
              {renderGlobalPassageAndOptions()}

              <div className="typeSupplementZone">
                {activeExtraTypeIds.length > 0 ? (
                  <>
                    <div className="sectionLabel">선택 유형 추가 입력</div>
                    <p className="supplementFocusMeta">
                      추가 입력이 필요한 유형을 여러 개 선택하면 아래에 순서대로 쌓입니다. 각 블록을 모두 채운 뒤 생성하세요.
                    </p>
                    <div className="typeSupplementStackWrap">
                      {activeExtraTypeIds.map((typeId, stackIndex) => (
                        <div key={typeId} className="typeSupplementStackItem">
                          <div className="supplementStackHead">
                            <span className="supplementStackName">{getTypeInfo(typeId, customTypes).name}</span>
                          </div>
                          <ProblemSupplementFields
                            problemIndex={stackIndex}
                            typeId={typeId}
                            customTypes={customTypes}
                            prompts={prompts}
                            problem={mainSupplementProblem}
                            onPatch={patchMainSupplement}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                ) : supplementFocusTypeId && activeTypes.includes(supplementFocusTypeId) ? (
                  <p className="dragHint">
                    「{getTypeInfo(supplementFocusTypeId, customTypes).name}」은(는) 지문만으로 생성할 수 있습니다.
                  </p>
                ) : typesNeedingExtraBucket.length > 0 ? (
                  <p className="dragHint">
                    오른쪽 하단 &quot;지문 + 추가 입력이 필요한 유형&quot;에서 유형을 선택하면, 여기에 유형별 입력란이 차례로 나타납니다.
                  </p>
                ) : null}
              </div>
            </div>

            <aside className="mainWorkColRight" aria-label="문제 유형 선택">
              <div className="sectionLabel">문제 유형 선택</div>
              <div className="typesBulkBar">
                <button type="button" className="btnSm btnGhost typesBulkBtn" onClick={selectAllPassageOnlyTypes}>
                  전체 선택
                </button>
                <button type="button" className="btnSm btnGhost typesBulkBtn" onClick={deselectPassageOnlyTypes}>
                  전체 해제
                </button>
              </div>


              {customTypes.length === 0 && (
                <div className="typesEmptyCard">
                  <p className="typesEmptyTitle">등록된 맞춤 문제 유형이 없습니다.</p>
                  <p className="typesEmptyText">유형 추가가 필요하면 관리자에게 문의하세요.</p>
                </div>
              )}

              {customTypes.length > 0 && (
                <>
                  {renderTypeBucket({
                    title: '지문만 입력하면 되는 유형',
                    hint: '지문만으로 변형문제를 생성합니다. 예시 보기 버튼을 클릭하면 샘플 문제를 확인할 수 있습니다. 서술형·영작·어휘 등 추가 입력이 필요한 유형은 하단에 있습니다.',
                    typeList: typesPassageOnlyBucket,
                  })}
                  {renderTypeBucket({
                    title: '지문 + 추가 입력이 필요한 유형',
                    hint: '지문을 기반으로, 단어·정답·어법 표현 등을 추가 입력 창에 채운 뒤 생성하세요.',
                    typeList: typesNeedingExtraBucket,
                  })}
                </>
              )}

            </aside>
          </div>

          {activeCount > 0 && (
            <p className="dragHint" style={{ marginBottom: 10 }}>
              예상 소모 캐쉬: 약 <strong>{estimatedMainCash.toLocaleString()}</strong> (선택 유형 {activeCount}개 ×{' '}
              {CASH_MAIN_PER_TYPE_CALL}캐쉬)
            </p>
          )}

          <button
            type="button"
            className="btnGenerate"
            disabled={generating || activeTypes.length === 0}
            onClick={generateQuestions}
          >
            {generating ? (
              <>
                <span className="spinner" />
                생성 중... ({activeCount}가지 유형)
              </>
            ) : (
              <>
                <IconBolt />
                {showResults && !validationError && Object.keys(results).length > 0 ? '다시 생성하기' : '변형문제 생성하기'}
              </>
            )}
          </button>

          {showResults && (
            <div className="resultsWrap">
              {validationError && (
                <div className="errorMsg">
                  <IconAlert />
                  {validationError}
                </div>
              )}
              {resultOrder.filter((t) => results[t]).map((type) => {
                const r = results[type];
                const { label, tagClass } = r;
                if (r.status === 'loading') {
                  return (
                    <div key={type} className="resultBlock">
                      <div className="resultHeader">
                        <div className="resultTitle">
                          <span className={`typeTag ${tagClass}`}>{label}</span>
                        </div>
                        <span
                          className="spinner"
                          style={{
                            width: 16,
                            height: 16,
                            borderWidth: 2,
                            borderTopColor: 'var(--accent)',
                          }}
                        />
                      </div>
                      <div className="resultBody" style={{ color: 'var(--text2)', fontStyle: 'italic' }}>
                        생성 중...
                      </div>
                    </div>
                  );
                }
                if (r.status === 'ok') {
                  return (
                    <div key={type} className="resultBlock">
                      <div className="resultHeader">
                        <div className="resultTitle">
                          <span className={`typeTag ${tagClass}`}>{label}</span>
                        </div>
                        <IconSuccess />
                      </div>
                      <div className="resultBody">{r.text}</div>
                    </div>
                  );
                }
                return (
                  <div key={type} className="resultBlock">
                    <div className="resultHeader">
                      <div className="resultTitle">
                        <span className={`typeTag ${tagClass}`}>{label}</span>
                      </div>
                      <IconFail />
                    </div>
                    <div className="resultBody" style={{ color: 'var(--danger)' }}>
                      오류: {r.error}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasDownloadable && (
            <div className="downloadBar">
              <button type="button" className="btnDownload" onClick={downloadDocx}>
                <IconDownload />
                Word 파일로 다운로드 (.docx)
              </button>
            </div>
          )}

          <div
            className={`modalOverlay modalZExample ${exampleModal?.open ? 'modalOverlayOpen' : ''}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeExampleModal();
            }}
            role="presentation"
          >
            {exampleModal?.open && (
              <div
                className="modal modalExample"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="example-modal-title"
              >
                <h3 id="example-modal-title">{exampleModal.title} — 예시 문제</h3>
                <p className="modalIntro">
                  이 유형에 등록된 예시 이미지입니다. 파일 경로:{' '}
                  <code>public/custom-type-examples/</code>
                </p>
                {exampleModal.status === 'loading' && (
                  <div className="exampleModalBody exampleModalLoading">
                    <span className="spinner" style={{ borderTopColor: 'var(--accent)' }} />
                    불러오는 중…
                  </div>
                )}
                {exampleModal.status === 'empty' && (
                  <div className="exampleModalBody">
                    <p className="exampleEmptyText">예시 이미지가 없습니다.</p>
                    <p className="formHint">
                      해당 유형에 예시 이미지를 등록하거나, 저장소에 이미지 파일을 추가하세요.
                    </p>
                  </div>
                )}
                {exampleModal.status === 'ok' && exampleModal.url && (
                  <div className="exampleModalBody">
                    <div className="exampleImageWrap">
                      <img src={exampleModal.url} alt={`${exampleModal.title} 예시`} className="exampleImage" />
                    </div>
                  </div>
                )}
                {exampleModal.status === 'error' && (
                  <div className="exampleModalBody">
                    <p className="exampleEmptyText" style={{ color: 'var(--danger)' }}>
                      {exampleModal.err || '오류가 발생했습니다.'}
                    </p>
                  </div>
                )}
                <div className="modalFooter">
                  <button type="button" className="btnSm btnPrimary" onClick={closeExampleModal}>
                    닫기
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      <footer className="siteBusinessFooter">
        <p>상호명: 제이케이에듀케이션</p>
        <p>사업자등록번호: 605-54-01113</p>
        <p>대표자명: 김준기</p>
        <p>사업장 주소: 경기도 부천시 소사구 성무로17번길 55-6, 1층</p>
        <p>유선번호: 010-6893-2048</p>
      </footer>
      <InsufficientCreditsModal
        open={creditsModalOpen}
        onClose={() => setCreditsModalOpen(false)}
        message={creditsModalMessage}
      />
    </div>
  );
}
