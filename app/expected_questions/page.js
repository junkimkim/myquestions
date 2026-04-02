'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import QuizForgeNav from '@/components/QuizForgeNav';
import InsufficientCreditsModal from '@/components/InsufficientCreditsModal';
import ProblemSupplementFields from '@/components/ProblemSupplementFields';
import { getTypeInfo } from '@/lib/defaultPrompts';
import { createEmptyProblemState } from '@/lib/expectedProblemState';
import { runExpectedProblemGeneration, validateExpectedProblem } from '@/lib/runExpectedProblemGeneration';
import { typeNeedsExtraInput } from '@/lib/typeExtraInput';
import { useCustomTypesData } from '@/hooks/useCustomTypesData';
import { usePreferredGptModel } from '@/hooks/usePreferredGptModel';

const MAX_PROBLEMS = 30;

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

function TypeRadioBuckets({ problemIndex, customTypes, prompts, selectedTypeId, onSelectTypeId }) {
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

  const patchProblem = useCallback((index, patch) => {
    setProblems((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }, []);

  const addProblem = useCallback(() => {
    setProblems((prev) => (prev.length >= MAX_PROBLEMS ? prev : [...prev, createProblemSlot()]));
    setAccordionOpen((prev) => (prev.length >= MAX_PROBLEMS ? prev : [...prev, false]));
  }, []);

  const removeProblem = useCallback((index) => {
    setProblems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setAccordionOpen((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setResultsByIndex({});
    setShowResults(false);
  }, []);

  const runBatch = useCallback(async () => {
    for (let i = 0; i < problems.length; i += 1) {
      const p = problems[i];
      const err = validateExpectedProblem(i + 1, p, p.typeId, customTypes, prompts);
      if (err) {
        setValidationError(err);
        setShowResults(true);
        return;
      }
    }

    setValidationError(null);
    setGenerating(true);
    setShowResults(true);
    setResultsByIndex({});

    for (let i = 0; i < problems.length; i += 1) {
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
      }
    }

    setGenerating(false);
  }, [problems, customTypes, prompts, preferredGptModel]);

  return (
    <div className="container">

      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">예상문제 세트</span>
        </div>
        <p className="subtitle">한 회분(1~{MAX_PROBLEMS}문항) 예상문제를 지문·유형별로 구성해 순서대로 생성합니다.</p>
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
            생성은 <strong>로그인</strong>과 <strong>크레딧</strong>으로 진행됩니다. OpenAI는 서버에서 호출됩니다.{' '}
            <Link href="/login">로그인</Link> · <Link href="/mypage">마이페이지</Link>
          </p>

          <p className="globalPassageHint" style={{ marginBottom: 24 }}>
            GPT 모델은 <strong>유형 관리</strong>(<code>/types</code>)에서 선택합니다. 기본 <code>gpt-5.4-mini</code>.
          </p>

          <div className="sectionLabel">문항 구성</div>
          <p className="globalPassageHint" style={{ marginBottom: 16 }}>
            각 문항을 접었다 펼칠 수 있습니다. Paraphraze는 문항마다 아코디언 안에서 따로 켜거나 끌 수 있습니다. 문항마다 지문과 문제 유형을 한 개씩만 지정합니다.{' '}
            <Link href="/types" className="typesEmptyLink">
              유형 관리
            </Link>
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
                  {problems.length > 1 && (
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
                      />
                    )}
                  </aside>
                </div>
              </details>
            );
          })}

          <div className="expectedQuestionsActions">
            <button type="button" className="btnSm btnGhost" disabled={problems.length >= MAX_PROBLEMS} onClick={addProblem}>
              문제 추가 ({problems.length}/{MAX_PROBLEMS})
            </button>
          </div>

          <button type="button" className="btnGenerate" disabled={generating || customTypes.length === 0} onClick={runBatch}>
            {generating ? (
              <>
                <span className="spinner" />
                생성 중… ({problems.length}문항)
              </>
            ) : (
              <>
                <IconBolt />
                예상문제 세트 생성
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

          <p className="dragHint" style={{ marginTop: 24 }}>
            <Link href="/">← 문제 생성(메인)</Link>
            {' · '}
            <Link href="/one_type">한 유형 일괄</Link>
          </p>
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
