'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import QuizForgeNav from '@/components/QuizForgeNav';
import InsufficientCreditsModal from '@/components/InsufficientCreditsModal';
import ProblemSupplementFields from '@/components/ProblemSupplementFields';
import { getTypeInfo } from '@/lib/defaultPrompts';
import { createEmptyProblemState } from '@/lib/expectedProblemState';
import { runExpectedProblemGeneration, validateExpectedProblem } from '@/lib/runExpectedProblemGeneration';
import { typeNeedsExtraInput } from '@/lib/typeExtraInput';
import { useCustomTypesData } from '@/hooks/useCustomTypesData';
import { usePreferredGptModel } from '@/hooks/usePreferredGptModel';
import { formatExamMetaLines, getDefaultExamMeta } from '@/lib/expectedExamMeta';
import {
  expectedBatchCashCost,
  MAX_EXPECTED_PROBLEMS,
  MIN_EXPECTED_PROBLEMS,
} from '@/lib/cashRules';

function createProblemSlot() {
  return { ...createEmptyProblemState(), typeId: null };
}

function IconBolt(props) {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
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

function TypeRadioBuckets({ problemIndex, customTypes, prompts, selectedTypeId, onSelectTypeId, onOpenExample }) {
  const passageOnly = useMemo(
    () => customTypes.filter((c) => !typeNeedsExtraInput(c.id, customTypes, prompts)),
    [customTypes, prompts],
  );
  const needExtra = useMemo(
    () => customTypes.filter((c) => typeNeedsExtraInput(c.id, customTypes, prompts)),
    [customTypes, prompts],
  );

  const renderRadio = (c) => {
    const inf = getTypeInfo(c.id, customTypes);
    const id = `exp-${problemIndex}-${c.id}`;
    return (
      <label key={c.id} htmlFor={id} className={`oneTypeRadioItem ${selectedTypeId === c.id ? 'oneTypeRadioItemActive' : ''}`}>
        <input
          id={id}
          type="radio"
          name={`expected-problem-${problemIndex}-type`}
          value={c.id}
          checked={selectedTypeId === c.id}
          onChange={() => onSelectTypeId(c.id)}
        />
        <div className="oneTypeRadioMeta">
          <div className="oneTypeRadioName">{inf.name}</div>
          <div className="oneTypeRadioDesc">{inf.desc || '—'}</div>
        </div>
        <button
          type="button"
          className="examplePreviewBtn oneTypeExampleBtn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenExample(c);
          }}
        >
          예시 보기
        </button>
      </label>
    );
  };

  return (
    <>
      <div className="typesBucket" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
        <div className="typesBucketTitle">지문만으로 생성 가능</div>
        <p className="typesBucketHint dragHint" style={{ marginBottom: 8 }}>
          추가 입력 없이 지문(또는 어휘 유형의 단어만)으로 생성합니다.
        </p>
        <div className="oneTypeRadioList">{passageOnly.length ? passageOnly.map(renderRadio) : <p className="dragHint">없음</p>}</div>
      </div>
      <div className="typesBucket" style={{ marginBottom: 0, paddingBottom: 0, border: 'none' }}>
        <div className="typesBucketTitle">추가 입력 필요</div>
        <p className="typesBucketHint dragHint" style={{ marginBottom: 8 }}>
          왼쪽에 유형별 입력란이 나타납니다.
        </p>
        <div className="oneTypeRadioList">{needExtra.length ? needExtra.map(renderRadio) : <p className="dragHint">없음</p>}</div>
      </div>
    </>
  );
}

export default function ExpectedQuestionsPage() {
  const { customTypes, prompts, ready, loadError } = useCustomTypesData();
  const { preferredGptModel } = usePreferredGptModel();
  const [problems, setProblems] = useState([createProblemSlot()]);
  /** 각 문항 `<details>` 펼침 — React는 `defaultOpen` 대신 `open`+`onToggle` 사용 */
  const [accordionOpen, setAccordionOpen] = useState([true]);
  const [generating, setGenerating] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  /** @type {Record<number, { status: string, label: string, tagClass: string, text?: string, error?: string }>} */
  const [resultsByIndex, setResultsByIndex] = useState({});
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [creditsModalMessage, setCreditsModalMessage] = useState('');
  const [exampleModal, setExampleModal] = useState(null);
  const [examMeta, setExamMeta] = useState(() => getDefaultExamMeta());
  const pdfMetaRef = useRef(null);
  const pdfProblemsRef = useRef(null);
  /** 선결제 배치(예상문제 세트 일괄 요금) — 실패 시 같은 batchId로 이어서 생성 */
  const [prepaidBatchId, setPrepaidBatchId] = useState(null);
  const [resumeFromIndex, setResumeFromIndex] = useState(0);
  const [prepaidProblemCount, setPrepaidProblemCount] = useState(null);

  const patchExamMeta = useCallback((patch) => {
    setExamMeta((prev) => ({ ...prev, ...patch }));
  }, []);

  const hasDownloadable = useMemo(
    () => problems.some((_, i) => resultsByIndex[i]?.status === 'ok'),
    [problems, resultsByIndex],
  );

  const expectedBatchEstimate = useMemo(
    () => expectedBatchCashCost(problems.length),
    [problems.length],
  );

  const downloadWord = useCallback(async () => {
    const items = problems
      .map((_, i) => {
        const r = resultsByIndex[i];
        if (!r || r.status !== 'ok') return null;
        return { num: i + 1, label: r.label, text: r.text };
      })
      .filter(Boolean);
    if (items.length === 0) return;
    const { buildExpectedExamDocxBlob } = await import('@/lib/expectedExamDocx');
    const blob = await buildExpectedExamDocxBlob(examMeta, items);
    const y = examMeta.year?.trim() || String(new Date().getFullYear());
    const sem = examMeta.semester === '2' ? '2학기' : '1학기';
    const ex = examMeta.examType === 'final' ? '기말' : '중간';
    const title = (examMeta.paperTitle?.trim() || '예상문제세트').replace(/[\\/:*?"<>|]/g, '_');
    saveAs(blob, `${title}_${y}_${sem}_${ex}.docx`);
  }, [examMeta, problems, resultsByIndex]);

  const downloadPdf = useCallback(async () => {
    if (!pdfMetaRef.current || !pdfProblemsRef.current) return;
    const { downloadExpectedExamPdf } = await import('@/lib/expectedExamPdf');
    const y = examMeta.year?.trim() || String(new Date().getFullYear());
    const sem = examMeta.semester === '2' ? '2학기' : '1학기';
    const ex = examMeta.examType === 'final' ? '기말' : '중간';
    const title = (examMeta.paperTitle?.trim() || '예상문제세트').replace(/[\\/:*?"<>|]/g, '_');
    await downloadExpectedExamPdf(pdfMetaRef.current, pdfProblemsRef.current, `${title}_${y}_${sem}_${ex}.pdf`);
  }, [examMeta]);

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

  const patchProblem = useCallback((index, patch) => {
    setProblems((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }, []);

  const addProblem = useCallback(() => {
    setPrepaidBatchId(null);
    setResumeFromIndex(0);
    setPrepaidProblemCount(null);
    setProblems((prev) => (prev.length >= MAX_EXPECTED_PROBLEMS ? prev : [...prev, createProblemSlot()]));
    setAccordionOpen((prev) => (prev.length >= MAX_EXPECTED_PROBLEMS ? prev : [...prev, false]));
  }, []);

  const removeProblem = useCallback((index) => {
    setProblems((prev) => {
      if (prev.length <= MIN_EXPECTED_PROBLEMS) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setAccordionOpen((prev) => {
      if (prev.length <= MIN_EXPECTED_PROBLEMS) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setResultsByIndex({});
    setShowResults(false);
    setPrepaidBatchId(null);
    setResumeFromIndex(0);
    setPrepaidProblemCount(null);
  }, []);

  const runBatch = useCallback(async () => {
    if (problems.length < MIN_EXPECTED_PROBLEMS || problems.length > MAX_EXPECTED_PROBLEMS) {
      setValidationError(
        `예상문제 세트는 ${MIN_EXPECTED_PROBLEMS}~${MAX_EXPECTED_PROBLEMS}문항이어야 합니다. (현재 ${problems.length}문항)`,
      );
      setShowResults(true);
      return;
    }

    for (let i = 0; i < problems.length; i += 1) {
      const p = problems[i];
      const err = validateExpectedProblem(i + 1, p, p.typeId, customTypes, prompts);
      if (err) {
        setValidationError(err);
        setShowResults(true);
        return;
      }
    }

    if (prepaidBatchId && prepaidProblemCount !== problems.length) {
      setValidationError('문항 수가 바뀌어 이전 선결제가 무효화되었습니다. 다시 생성을 눌러 주세요.');
      setPrepaidBatchId(null);
      setResumeFromIndex(0);
      setPrepaidProblemCount(null);
      setShowResults(true);
      return;
    }

    setValidationError(null);
    setGenerating(true);
    setShowResults(true);

    let batchId = prepaidBatchId;
    let startIdx = resumeFromIndex;

    if (!batchId) {
      const res = await fetch('/api/expected/start-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ problemCount: problems.length }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGenerating(false);
        if (res.status === 402) {
          setCreditsModalOpen(true);
          setCreditsModalMessage(
            typeof data.error?.message === 'string' ? data.error.message : '캐쉬가 부족합니다.',
          );
        } else {
          setValidationError(
            typeof data.error?.message === 'string'
              ? data.error.message
              : `요청에 실패했습니다. (${res.status})`,
          );
          setShowResults(true);
        }
        return;
      }
      batchId = data.batchId;
      setPrepaidBatchId(batchId);
      setPrepaidProblemCount(problems.length);
      setResumeFromIndex(0);
      startIdx = 0;
      setResultsByIndex({});
    } else {
      startIdx = resumeFromIndex;
    }

    for (let i = startIdx; i < problems.length; i += 1) {
      const p = problems[i];
      const typeId = p.typeId;
      const info = getTypeInfo(typeId, customTypes);

      setResultsByIndex((prev) => ({
        ...prev,
        [i]: { status: 'loading', label: info.label, tagClass: info.tagClass },
      }));

      const res = await runExpectedProblemGeneration({
        problem: p,
        typeId,
        model: preferredGptModel,
        paraphraseEnabled: Boolean(p.paraphraseEnabled),
        customTypes,
        prompts,
        expectedFreeBatchId: batchId,
      });

      if (res.ok) {
        setResultsByIndex((prev) => ({
          ...prev,
          [i]: { status: 'ok', label: info.label, tagClass: info.tagClass, text: res.text },
        }));
      } else {
        if (res.insufficientCredits) {
          setCreditsModalOpen(true);
          setCreditsModalMessage(res.error ?? '');
          setResultsByIndex((prev) => ({
            ...prev,
            [i]: {
              status: 'error',
              label: info.label,
              tagClass: info.tagClass,
              error: res.error,
            },
          }));
          setGenerating(false);
          setResumeFromIndex(i);
          return;
        }
        setResultsByIndex((prev) => ({
          ...prev,
          [i]: {
            status: 'error',
            label: info.label,
            tagClass: info.tagClass,
            error: res.error,
          },
        }));
        setGenerating(false);
        setResumeFromIndex(i);
        return;
      }
    }

    setGenerating(false);
    setPrepaidBatchId(null);
    setResumeFromIndex(0);
    setPrepaidProblemCount(null);
  }, [
    problems,
    customTypes,
    prompts,
    preferredGptModel,
    prepaidBatchId,
    prepaidProblemCount,
    resumeFromIndex,
  ]);

  return (
    <div className="container">

      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">예상문제 세트</span>
        </div>
        <p className="subtitle">
          한 회분({MIN_EXPECTED_PROBLEMS}~{MAX_EXPECTED_PROBLEMS}문항) 예상문제를 지문·유형별로 구성해 순서대로 생성합니다. 문항 수에 따라 일괄 캐쉬가 책정됩니다.
        </p>
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

          <div className="sectionLabel">시험지 정보 (다운로드 시 상단에 표시)</div>
          <div className="expectedExamMetaForm">
            <div className="expectedExamField">
              <label htmlFor="exam-academy">학원 이름</label>
              <input
                id="exam-academy"
                type="text"
                value={examMeta.academyName}
                onChange={(e) => patchExamMeta({ academyName: e.target.value })}
                placeholder="예: ○○학원"
                autoComplete="organization"
              />
            </div>
            <div className="expectedExamField">
              <label htmlFor="exam-teacher">선생님 이름</label>
              <input
                id="exam-teacher"
                type="text"
                value={examMeta.teacherName}
                onChange={(e) => patchExamMeta({ teacherName: e.target.value })}
                placeholder="담당 강사"
                autoComplete="name"
              />
            </div>
            <div className="expectedExamField">
              <label htmlFor="exam-school">학교명</label>
              <input
                id="exam-school"
                type="text"
                value={examMeta.schoolName}
                onChange={(e) => patchExamMeta({ schoolName: e.target.value })}
                placeholder="예: ○○고등학교"
              />
            </div>
            <div className="expectedExamField">
              <label htmlFor="exam-grade">학년</label>
              <input
                id="exam-grade"
                type="text"
                value={examMeta.grade}
                onChange={(e) => patchExamMeta({ grade: e.target.value })}
                placeholder="예: 고1"
              />
            </div>
            <div className="expectedExamField">
              <label htmlFor="exam-year">연도</label>
              <input
                id="exam-year"
                type="text"
                inputMode="numeric"
                value={examMeta.year}
                onChange={(e) => patchExamMeta({ year: e.target.value })}
                placeholder="예: 2026"
              />
            </div>
            <div className="expectedExamField">
              <label htmlFor="exam-semester">학기</label>
              <select
                id="exam-semester"
                value={examMeta.semester}
                onChange={(e) => patchExamMeta({ semester: e.target.value })}
              >
                <option value="1">1학기</option>
                <option value="2">2학기</option>
              </select>
            </div>
            <div className="expectedExamField">
              <label htmlFor="exam-type">시험 구분</label>
              <select
                id="exam-type"
                value={examMeta.examType}
                onChange={(e) => patchExamMeta({ examType: e.target.value })}
              >
                <option value="mid">중간고사</option>
                <option value="final">기말고사</option>
              </select>
            </div>
            <div className="expectedExamField expectedExamFieldFull">
              <label htmlFor="exam-paper">시험지 명</label>
              <input
                id="exam-paper"
                type="text"
                value={examMeta.paperTitle}
                onChange={(e) => patchExamMeta({ paperTitle: e.target.value })}
                placeholder="파일 상단 제목으로 사용됩니다"
              />
            </div>
          </div>

          {/* <p className="globalPassageHint" style={{ marginBottom: 24 }}>
            GPT 모델은 로그인 시 프로필에 저장된 설정을 사용합니다. 기본은 <code>gpt-5.4-mini</code>입니다.
          </p> */}

          <div className="sectionLabel">문항 구성</div>
          <p className="globalPassageHint" style={{ marginBottom: 16 }}>
            각 문항을 접었다 펼칠 수 있습니다. Paraphraze는 문항마다 아코디언 안에서 따로 켜거나 끌 수 있습니다. 문항마다 지문과 문제 유형을 한 개씩만 지정합니다.
          </p>

          {problems.map((prob, index) => {
            const selectedName = prob.typeId ? getTypeInfo(prob.typeId, customTypes).name : '유형 미선택';
            return (
              <details
                key={index}
                className="expectedAccordion"
                open={accordionOpen[index] ?? false}
                onToggle={(e) => {
                  const next = e.currentTarget.open;
                  setAccordionOpen((prev) => {
                    const copy = [...prev];
                    while (copy.length <= index) copy.push(false);
                    copy[index] = next;
                    return copy;
                  });
                }}
              >
                <summary className="expectedAccordionSummary">
                  <span className="expectedAccordionNo">{index + 1}번 문제</span>
                  <span className="expectedAccordionMeta">{selectedName}</span>
                  <span className="expectedAccordionSummaryEnd">
                    {problems.length > MIN_EXPECTED_PROBLEMS && (
                      <button
                        type="button"
                        className="btnSm btnGhost expectedAccordionRemove"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeProblem(index);
                        }}
                      >
                        문항 삭제
                      </button>
                    )}
                    <span className="expectedAccordionChevron" aria-hidden="true" title="접기·펼치기" />
                  </span>
                </summary>
                <div className="paraphraseModelRow paraphraseModelRowSingle expectedAccordionParaphrase">
                  <div className="paraphraseHalf paraphraseHalfFull">
                    <div className="paraphraseRow">
                      <input
                        id={`paraphrase-check-exp-${index}`}
                        type="checkbox"
                        checked={Boolean(prob.paraphraseEnabled)}
                        onChange={(e) => patchProblem(index, { paraphraseEnabled: e.target.checked })}
                      />
                      <label htmlFor={`paraphrase-check-exp-${index}`} className="paraphraseLabel">
                        <span className="paraphraseTitle">Paraphraze</span>
                        <span className="paraphraseHint">
                          이 문항 지문에 대해 1단계 paraphrase 후 2단계 문제 생성을 적용합니다.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mainWorkRow expectedProblemInner">
                  <div className="mainWorkColLeft">
                    <div className="sectionLabel" style={{ marginBottom: 8 }}>
                      영어 지문
                    </div>
                    <div className="passageWrap">
                      <textarea
                        value={prob.passage}
                        onChange={(e) => patchProblem(index, { passage: e.target.value })}
                        placeholder="이 문항의 영어 지문을 붙여넣으세요..."
                        aria-label={`${index + 1}번 지문`}
                      />
                      <span className="charCount">{prob.passage.length.toLocaleString()}자</span>
                    </div>
                    {prob.typeId && (
                      <ProblemSupplementFields
                        problemIndex={index}
                        typeId={prob.typeId}
                        customTypes={customTypes}
                        prompts={prompts}
                        problem={prob}
                        onPatch={(patch) => patchProblem(index, patch)}
                      />
                    )}
                  </div>
                  <aside className="mainWorkColRight" aria-label={`${index + 1}번 문제 유형`}>
                    <div className="sectionLabel">문제 유형 (1개)</div>
                    {customTypes.length === 0 ? (
                      <div className="typesEmptyCard">
                        <p className="typesEmptyTitle">등록된 유형이 없습니다.</p>
                      </div>
                    ) : (
                      <TypeRadioBuckets
                        problemIndex={index}
                        customTypes={customTypes}
                        prompts={prompts}
                        selectedTypeId={prob.typeId}
                        onSelectTypeId={(id) => patchProblem(index, { typeId: id })}
                        onOpenExample={openExampleModal}
                      />
                    )}
                  </aside>
                </div>
              </details>
            );
          })}

          <div className="expectedQuestionsActions">
            <button
              type="button"
              className="btnSm btnGhost"
              disabled={problems.length >= MAX_EXPECTED_PROBLEMS}
              onClick={addProblem}
            >
              문제 추가 ({problems.length}/{MAX_EXPECTED_PROBLEMS})
            </button>
          </div>

          {expectedBatchEstimate != null && (
            <p className="dragHint" style={{ marginBottom: 10 }}>
              이번 회차 예상 소모: <strong>{expectedBatchEstimate.toLocaleString()} 캐쉬</strong> ({problems.length}문항 일괄, 25문항 400 → 30문항 500 등)
            </p>
          )}
          {expectedBatchEstimate === null && problems.length > 0 && (
            <p className="dragHint" style={{ marginBottom: 10 }}>
              문항을 {MIN_EXPECTED_PROBLEMS}~{MAX_EXPECTED_PROBLEMS}개로 맞추면 일괄 요금이 표시됩니다.
            </p>
          )}
          {resumeFromIndex > 0 && prepaidBatchId && (
            <p className="persistMsg" style={{ marginBottom: 10 }}>
              이전 생성이 {resumeFromIndex}번 문항에서 중단되었습니다. 같은 선결제로 이어서 생성합니다.
            </p>
          )}

          <button
            type="button"
            className="btnGenerate"
            disabled={generating || customTypes.length === 0 || expectedBatchEstimate == null}
            onClick={runBatch}
          >
            {generating ? (
              <>
                <span className="spinner" />
                생성 중… ({problems.length}문항)
              </>
            ) : (
              <>
                <IconBolt />
                {resumeFromIndex > 0 && prepaidBatchId ? '이어서 생성' : '예상문제 세트 생성'}
              </>
            )}
          </button>

          {showResults && hasDownloadable && !validationError && !generating && (
            <div className="expectedDownloadBar">
              <span className="dragHint" style={{ marginRight: 8 }}>
                생성된 문항을 파일로 저장합니다. (메타 1단 · 문제 2단)
              </span>
              <button type="button" className="btnSm btnPrimary" onClick={downloadWord}>
                Word(.docx) 다운로드
              </button>
              <button type="button" className="btnSm btnPrimary" onClick={downloadPdf}>
                PDF 다운로드
              </button>
            </div>
          )}

          {showResults && (
            <div className="resultsWrap">
              {validationError && (
                <div className="errorMsg">
                  <IconAlert />
                  {validationError}
                </div>
              )}
              {!validationError &&
                problems.map((_, i) => {
                  const r = resultsByIndex[i];
                  if (!r) return null;
                  const num = i + 1;
                  if (r.status === 'loading') {
                    return (
                      <div key={i} className="resultBlock">
                        <div className="resultHeader">
                          <div className="resultTitle">
                            <span className="expectedResultHeading">{num}번 문제</span>
                            <span className={`typeTag ${r.tagClass}`} style={{ marginLeft: 8 }}>
                              {r.label}
                            </span>
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
                      <div key={i} className="resultBlock">
                        <div className="resultHeader">
                          <div className="resultTitle">
                            <span className="expectedResultHeading">{num}번 문제</span>
                            <span className={`typeTag ${r.tagClass}`} style={{ marginLeft: 8 }}>
                              {r.label}
                            </span>
                          </div>
                          <IconSuccess />
                        </div>
                        <div className="resultBody">{r.text}</div>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="resultBlock">
                      <div className="resultHeader">
                        <div className="resultTitle">
                          <span className="expectedResultHeading">{num}번 문제</span>
                          <span className={`typeTag ${r.tagClass}`} style={{ marginLeft: 8 }}>
                            {r.label}
                          </span>
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

          <div ref={pdfMetaRef} className="expectedPdfExport expectedPdfMeta" aria-hidden="true">
            <div className="expectedPdfExportTitle">{examMeta.paperTitle?.trim() || '예상문제 세트'}</div>
            {formatExamMetaLines(examMeta)
              .filter((line) => !line.startsWith('시험지 명:'))
              .map((line, i) => (
                <p key={i} className="expectedPdfExportLine">
                  {line}
                </p>
              ))}
          </div>
          <div ref={pdfProblemsRef} className="expectedPdfExport expectedPdfProblems" aria-hidden="true">
            {problems.map((_, i) => {
              const r = resultsByIndex[i];
              if (!r || r.status !== 'ok') return null;
              const num = i + 1;
              return (
                <div key={i} className="expectedPdfProblemBlock">
                  <h3>
                    {num}번 문제 ({r.label})
                  </h3>
                  <pre>{r.text}</pre>
                </div>
              );
            })}
          </div>

          {/* <p className="dragHint" style={{ marginTop: 24 }}>
            <Link href="/">← 문제 생성(메인)</Link>
            {' · '}
            <Link href="/one_type">한 유형 일괄</Link>
          </p> */}

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
                aria-labelledby="expected-example-modal-title"
              >
                <h3 id="expected-example-modal-title">{exampleModal.title} — 예시 문제</h3>
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
      <InsufficientCreditsModal
        open={creditsModalOpen}
        onClose={() => setCreditsModalOpen(false)}
        message={creditsModalMessage}
      />
    </div>
  );
}
