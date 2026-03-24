'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QuizForgeNav from '@/components/QuizForgeNav';
import {
  DEFAULT_VOCAB_PROMPT,
  DEFAULT_WRITING_PROMPT,
  defaultCustomPromptForKind,
  getTypeInfo,
  getTypeKind,
} from '@/lib/defaultPrompts';
import {
  MAX_TOKENS_DEFAULT,
  MAX_TOKENS_WITH_PARAPHRASE,
  buildUserPrompt,
} from '@/lib/paraphrasePrompt';
import { useCustomTypesData } from '@/hooks/useCustomTypesData';
import { formatVocabList } from '@/lib/vocabPrompt';

function IconKey(props) {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

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

function IconSettings(props) {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" />
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
  const { customTypes, setCustomTypes, prompts, setPrompts, ready } = useCustomTypesData();
  const [apiKey, setApiKey] = useState('');
  const [passage, setPassage] = useState('');
  const [vocabWords, setVocabWords] = useState(['', '', '', '', '']);
  const [writingAnswer, setWritingAnswer] = useState('');
  const [paraphraseEnabled, setParaphraseEnabled] = useState(false);
  const [activeTypes, setActiveTypes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [promptDrafts, setPromptDrafts] = useState({});
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState({});
  const [resultOrder, setResultOrder] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [exampleModal, setExampleModal] = useState(null);
  const [dropTargetKind, setDropTargetKind] = useState(null);
  const dragTypeIdRef = useRef(null);

  const customTypeIdsKey = useMemo(() => customTypes.map((t) => t.id).join('|'), [customTypes]);

  useEffect(() => {
    if (!ready) return;
    setActiveTypes([...customTypes.map((t) => t.id)]);
  }, [ready, customTypeIdsKey]);

  const typeIds = useMemo(() => customTypes.map((c) => c.id), [customTypes]);

  const apiStatus = useMemo(() => {
    const k = apiKey.trim();
    if (k.startsWith('sk-') && k.length > 20) return { text: '입력됨', ok: true };
    return { text: '미입력', ok: false };
  }, [apiKey]);

  const activeCount = useMemo(
    () => typeIds.filter((id) => activeTypes.includes(id)).length,
    [typeIds, activeTypes],
  );

  const selectAllTypes = useCallback(() => {
    setActiveTypes([...typeIds]);
  }, [typeIds]);

  const deselectAllTypes = useCallback(() => {
    setActiveTypes([]);
  }, []);

  const setVocabAt = useCallback((index, value) => {
    setVocabWords((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

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
    (targetKind) => (e) => {
      e.preventDefault();
      setDropTargetKind(null);
      const id = dragTypeIdRef.current || e.dataTransfer.getData('text/plain');
      dragTypeIdRef.current = null;
      if (!id) return;
      const row = customTypes.find((x) => x.id === id);
      if (!row) return;
      const current = getTypeKind(row);
      if (current === targetKind) return;
      const nextKind =
        targetKind === 'writing' ? 'writing' : targetKind === 'vocabulary' ? 'vocabulary' : 'mcq';
      setCustomTypes((prev) =>
        prev.map((t) => (t.id === id ? { ...t, kind: nextKind } : t)),
      );
      if (targetKind === 'writing') {
        setPrompts((prev) => {
          const p = prev[id] || '';
          if (p.includes('{answer}')) return prev;
          return { ...prev, [id]: DEFAULT_WRITING_PROMPT };
        });
      }
      if (targetKind === 'vocabulary') {
        setPrompts((prev) => {
          const p = prev[id] || '';
          if (p.includes('{vocab}') && p.includes('{passage}')) return prev;
          return { ...prev, [id]: DEFAULT_VOCAB_PROMPT };
        });
      }
    },
    [customTypes, setCustomTypes, setPrompts],
  );

  const mcqTypes = useMemo(
    () => customTypes.filter((c) => getTypeKind(c) === 'mcq'),
    [customTypes],
  );
  const writingTypes = useMemo(
    () => customTypes.filter((c) => getTypeKind(c) === 'writing'),
    [customTypes],
  );
  const vocabTypes = useMemo(
    () => customTypes.filter((c) => getTypeKind(c) === 'vocabulary'),
    [customTypes],
  );

  const needsVocabWords = useMemo(
    () =>
      activeTypes.some((id) => {
        const c = customTypes.find((x) => x.id === id);
        return c && getTypeKind(c) === 'vocabulary';
      }),
    [activeTypes, customTypes],
  );

  const needsWritingAnswer = useMemo(
    () =>
      activeTypes.some((id) => {
        const c = customTypes.find((x) => x.id === id);
        return c && getTypeKind(c) === 'writing';
      }),
    [activeTypes, customTypes],
  );

  const toggleType = useCallback((type) => {
    setActiveTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }, []);

  const openModal = useCallback(() => {
    const draft = {};
    for (const c of customTypes) {
      draft[c.id] = prompts[c.id] ?? defaultCustomPromptForKind(getTypeKind(c));
    }
    setPromptDrafts(draft);
    setModalOpen(true);
  }, [prompts, customTypes]);

  const closeModal = useCallback(() => setModalOpen(false), []);

  const savePromptsFromModal = useCallback(() => {
    setPrompts({ ...promptDrafts });
    setModalOpen(false);
  }, [promptDrafts, setPrompts]);

  const resetPrompts = useCallback(() => {
    const next = {};
    for (const c of customTypes) {
      next[c.id] = defaultCustomPromptForKind(getTypeKind(c));
    }
    setPromptDrafts(next);
  }, [customTypes]);

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
    const key = apiKey.trim();
    const text = passage.trim();
    const customActive = typeIds.filter((id) => activeTypes.includes(id));
    const wordsTrim = vocabWords.map((w) => w.trim());

    if (!key || !key.startsWith('sk-')) {
      showError('OpenAI API 키를 입력해주세요. (sk-로 시작)');
      return;
    }
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

    const needsPassage = customActive.some((id) => {
      const c = customTypes.find((x) => x.id === id);
      return c && getTypeKind(c) !== 'vocabulary';
    });
    if (needsPassage && !text) {
      showError('선택한 유형 중 지문이 필요한 유형이 있습니다. 영어 지문을 입력해 주세요.');
      return;
    }

    const answerTrim = writingAnswer.trim();
    const anyActiveWriting = customActive.some((id) => {
      const c = customTypes.find((x) => x.id === id);
      return c && getTypeKind(c) === 'writing';
    });
    if (anyActiveWriting && !answerTrim) {
      showError('영작 유형을 선택했습니다. 정답(완성 영문 문장)을 입력해 주세요.');
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

    const runOne = async (body) => {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || '요청에 실패했습니다.');
      }
      const out = data.choices?.[0]?.message?.content;
      if (out == null) throw new Error('응답 형식이 올바르지 않습니다.');
      return out;
    };

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
            error: '프롬프트에 {passage} 플레이스홀더가 필요합니다. 프롬프트 설정을 확인하세요.',
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
            error: '영작 유형 프롬프트에 {answer} 플레이스홀더가 필요합니다. 유형 관리 또는 프롬프트 설정을 확인하세요.',
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
            error: '어휘 유형 프롬프트에 {vocab} 플레이스홀더가 필요합니다. 유형 관리 또는 프롬프트 설정을 확인하세요.',
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
          const prompt = String(promptTemplate)
            .replace(/\{passage\}/g, text)
            .replace(/\{vocab\}/g, formatVocabList(wordsTrim));
          const out = await runOne({
            apiKey: key,
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content:
                  '당신은 고등학교 내신 영어 문제 전문 출제자입니다. 어휘·영영풀이 형식 지시를 정확히 따릅니다.',
              },
              { role: 'user', content: prompt },
            ],
            max_tokens: 2200,
            temperature: 0.7,
          });
          setResults((prev) => ({
            ...prev,
            [type]: { status: 'ok', label, tagClass, text: out },
          }));
          continue;
        }

        const answerForPrompt = kind === 'writing' ? answerTrim : '';
        const prompt = buildUserPrompt(text, promptTemplate, paraphraseEnabled, answerForPrompt);
        const maxTokens = paraphraseEnabled ? MAX_TOKENS_WITH_PARAPHRASE : MAX_TOKENS_DEFAULT;
        const out = await runOne({
          apiKey: key,
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: '당신은 고등학교 내신 영어 문제 전문 출제자입니다. 주어진 지문을 분석하여 고품질의 변형문제를 생성합니다.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        });

        setResults((prev) => ({
          ...prev,
          [type]: { status: 'ok', label, tagClass, text: out },
        }));
      } catch (err) {
        setResults((prev) => ({
          ...prev,
          [type]: {
            status: 'error',
            label,
            tagClass,
            error: err instanceof Error ? err.message : String(err),
          },
        }));
      }
    }

    setGenerating(false);
  }, [
    apiKey,
    passage,
    vocabWords,
    writingAnswer,
    paraphraseEnabled,
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
      <div key={c.id} className={`typeCardShell typeCardShellCustom ${active ? 'typeCardShellActive' : ''}`}>
        <button
          type="button"
          className="typeDragHandle"
          draggable
          aria-label="드래그하여 객관식 또는 영작 구역으로 이동"
          title="드래그하여 다른 구역에 놓으면 객관식↔영작이 바뀝니다"
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
        <button type="button" className={`typeCard ${active ? 'typeCardActive' : ''}`} onClick={() => toggleType(c.id)}>
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

  return (
    <div className="container">
      <QuizForgeNav />
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">for Teachers</span>
        </div>
        <p className="subtitle">영어 지문 → AI 변형문제 자동 생성 · Word 파일 다운로드</p>
      </header>

      {!ready ? (
        <p className="subtitle">불러오는 중…</p>
      ) : (
        <>
          <div className="sectionLabel">API 설정</div>
          <div className="apiRow">
            <IconKey />
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
            <span className={`apiStatus ${apiStatus.ok ? 'apiStatusOk' : 'apiStatusEmpty'}`}>{apiStatus.text}</span>
          </div>

          <div className="sectionLabel">영어 지문 입력</div>
          <div className="passageWrap">
            <textarea
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              placeholder="분석할 영어 지문을 여기에 붙여넣으세요..."
            />
            <span className="charCount">{passage.length.toLocaleString()}자</span>
          </div>

          {needsVocabWords && (
            <>
              <div className="sectionLabel" style={{ marginTop: 20 }}>
                출제 어휘 5개
              </div>
              <p className="vocabSectionHint">
                지문과 함께 쓰면 지문에서 해당 표현을 찾아 맥락 문제로 출제합니다. 단어 5칸만 채우면 지문 없이 &quot;단어:영영풀이&quot; 형식의 5지선다 문제로 출제합니다.
              </p>
              <div className="vocabWordsRow">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="vocabWordCell">
                    <label className="vocabWordLabel" htmlFor={`vocab-${i}`}>
                      {i + 1}
                    </label>
                    <input
                      id={`vocab-${i}`}
                      type="text"
                      className="vocabWordInput"
                      value={vocabWords[i]}
                      onChange={(e) => setVocabAt(i, e.target.value)}
                      placeholder={`단어 ${i + 1}`}
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {needsWritingAnswer && (
            <>
              <div className="sectionLabel" style={{ marginTop: 20 }}>
                영작 정답 문장
              </div>
              <div className="passageWrap">
                <textarea
                  value={writingAnswer}
                  onChange={(e) => setWritingAnswer(e.target.value)}
                  placeholder="영작 문제의 기준이 되는 완성 영문을 입력하세요. (예: It seems like we might make our funding goal!)"
                />
                <span className="charCount">{writingAnswer.length.toLocaleString()}자</span>
              </div>
            </>
          )}

          <div className="paraphraseRow">
            <input
              id="paraphrase-check"
              type="checkbox"
              checked={paraphraseEnabled}
              onChange={(e) => setParaphraseEnabled(e.target.checked)}
            />
            <label htmlFor="paraphrase-check" className="paraphraseLabel">
              <span className="paraphraseTitle">Paraphraze</span>
              <span className="paraphraseHint">
                켜면 먼저 지문을 paraphrase한 뒤, 그 결과만을 근거로 선택한 유형의 변형 문제 프롬프트가 동작합니다. (1단계 지문 Paraphrase → 2단계 문제 생성)
              </span>
            </label>
          </div>

          <div className="sectionLabel">문제 유형 선택</div>
          <div className="typesBulkBar">
            <button type="button" className="btnSm btnGhost typesBulkBtn" onClick={selectAllTypes}>
              전체 선택
            </button>
            <button type="button" className="btnSm btnGhost typesBulkBtn" onClick={deselectAllTypes}>
              전체 해제
            </button>
          </div>
          <p className="dragHint">
            맞춤 유형 카드 왼쪽 ≡ 핸들을 드래그해 객관식·영작·어휘 구역에 놓으면 유형 구분이 바뀝니다.
          </p>

          {customTypes.length === 0 && (
            <div className="typesEmptyCard">
              <p className="typesEmptyTitle">등록된 맞춤 문제 유형이 없습니다.</p>
              <p className="typesEmptyText">
                <Link href="/types" className="typesEmptyLink">
                  유형 관리
                </Link>
                에서 객관식·영작·어휘 유형을 추가할 수 있습니다.
              </p>
            </div>
          )}

          {customTypes.length > 0 && (
            <>
              <div
                className={`typesDropColumn ${dropTargetKind === 'mcq' ? 'typesDropColumnActive' : ''}`}
                onDragOver={(e) => handleColumnDragOver(e, 'mcq')}
                onDragLeave={handleColumnDragLeave}
                onDrop={handleColumnDrop('mcq')}
              >
                <div className="typesSubLabel">객관식 유형</div>
                <div className="typesGrid">
                  {mcqTypes.length > 0 ? (
                    mcqTypes.map((c) => renderCustomCard(c))
                  ) : (
                    <p className="typesDropZoneEmpty">맞춤 유형을 이 구역에 놓으면 객관식으로 저장됩니다.</p>
                  )}
                </div>
              </div>
              <div
                className={`typesDropColumn ${dropTargetKind === 'writing' ? 'typesDropColumnActive' : ''}`}
                onDragOver={(e) => handleColumnDragOver(e, 'writing')}
                onDragLeave={handleColumnDragLeave}
                onDrop={handleColumnDrop('writing')}
              >
                <div className="typesSubLabel" style={{ marginTop: 18 }}>
                  영작 유형
                </div>
                <div className="typesGrid">
                  {writingTypes.length > 0 ? (
                    writingTypes.map((c) => renderCustomCard(c))
                  ) : (
                    <p className="typesDropZoneEmpty">맞춤 유형을 이 구역에 놓으면 영작으로 저장됩니다. (프롬프트에 {'{answer}'} 필요)</p>
                  )}
                </div>
              </div>
              <div
                className={`typesDropColumn ${dropTargetKind === 'vocabulary' ? 'typesDropColumnActive' : ''}`}
                onDragOver={(e) => handleColumnDragOver(e, 'vocabulary')}
                onDragLeave={handleColumnDragLeave}
                onDrop={handleColumnDrop('vocabulary')}
              >
                <div className="typesSubLabel" style={{ marginTop: 18 }}>
                  어휘 유형
                </div>
                <div className="typesGrid">
                  {vocabTypes.length > 0 ? (
                    vocabTypes.map((c) => renderCustomCard(c))
                  ) : (
                    <p className="typesDropZoneEmpty">
                      맞춤 유형을 이 구역에 놓으면 어휘로 저장됩니다. (프롬프트에 {'{vocab}'} 필요)
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="typesActions">
            <Link href="/types" className="addTypeBtn addTypeBtnLink">
              유형 관리에서 추가·삭제
            </Link>
            <button type="button" className="settingsBtn" onClick={openModal} disabled={customTypes.length === 0}>
              <IconSettings />
              프롬프트 설정 편집
            </button>
          </div>

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
            className={`modalOverlay ${modalOpen ? 'modalOverlayOpen' : ''}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
            role="presentation"
          >
            {modalOpen && (
              <div
                className="modal modalWide"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
              >
                <h3 id="modal-title">프롬프트 설정</h3>
                <p className="modalIntro">
                  각 유형별 GPT 지시문을 수정할 수 있습니다. <code>{'{passage}'}</code>는 입력 지문으로 치환됩니다(어휘 유형에서 지문 없이 생성하면 빈 문자열). 영작은 메인 정답이{' '}
                  <code>{'{answer}'}</code>, 어휘는 메인 5단어 목록이 <code>{'{vocab}'}</code>로 들어갑니다.
                </p>
                {customTypes.map((c) => {
                  const info = getTypeInfo(c.id, customTypes);
                  return (
                    <div key={c.id} className="promptItem">
                      <div className="promptLabel">
                        <span className={`typeTag ${info.tagClass}`} style={{ fontSize: '0.65rem' }}>
                          {info.name}
                        </span>
                        {info.kind === 'writing' && (
                          <span className="typesKindBadge typesKindBadgeWriting" style={{ marginLeft: 8 }}>
                            영작
                          </span>
                        )}
                        {info.kind === 'vocabulary' && (
                          <span className="typesKindBadge typesKindBadgeVocab" style={{ marginLeft: 8 }}>
                            어휘
                          </span>
                        )}
                      </div>
                      <textarea
                        value={promptDrafts[c.id] ?? ''}
                        onChange={(e) => setPromptDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                      />
                    </div>
                  );
                })}
                <div className="modalFooter">
                  <button type="button" className="btnSm btnGhost" onClick={resetPrompts}>
                    기본값으로 초기화
                  </button>
                  <button type="button" className="btnSm btnPrimary" onClick={savePromptsFromModal}>
                    저장
                  </button>
                </div>
              </div>
            )}
          </div>

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
                  유형 관리에서 등록한 예시 이미지입니다. 파일 경로:{' '}
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
                      <Link href="/types" className="typesEmptyLink">
                        유형 관리
                      </Link>
                      에서 해당 유형에 이미지를 등록하거나, 저장소에 이미지 파일을 추가하세요.
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
    </div>
  );
}
