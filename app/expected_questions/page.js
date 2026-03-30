'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import QuizForgeNav from '@/components/QuizForgeNav';
import ProblemSupplementFields from '@/components/ProblemSupplementFields';
import { getTypeInfo } from '@/lib/defaultPrompts';
import { createEmptyProblemState } from '@/lib/expectedProblemState';
import { runExpectedProblemGeneration, validateExpectedProblem } from '@/lib/runExpectedProblemGeneration';
import { typeNeedsExtraInput } from '@/lib/typeExtraInput';
import { useCustomTypesData } from '@/hooks/useCustomTypesData';

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

function IconKey(props) {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
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
  const [apiKey, setApiKey] = useState('');
  const [paraphraseEnabled, setParaphraseEnabled] = useState(false);
  const [gptModel, setGptModel] = useState('gpt-4o');
  const [problems, setProblems] = useState([createProblemSlot()]);
  /** 각 문항 `<details>` 펼침 — React는 `defaultOpen` 대신 `open`+`onToggle` 사용 */
  const [accordionOpen, setAccordionOpen] = useState([true]);
  const [generating, setGenerating] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  /** @type {Record<number, { status: string, label: string, tagClass: string, text?: string, error?: string }>} */
  const [resultsByIndex, setResultsByIndex] = useState({});

  const apiStatus = useMemo(() => {
    const k = apiKey.trim();
    if (k.startsWith('sk-') && k.length > 20) return { text: '입력됨', ok: true };
    return { text: '미입력', ok: false };
  }, [apiKey]);

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
    const key = apiKey.trim();
    if (!key || !key.startsWith('sk-')) {
      setValidationError('OpenAI API 키를 입력해주세요. (sk-로 시작)');
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
        apiKey: key,
        model: gptModel,
        paraphraseEnabled,
        customTypes,
        prompts,
      });

      if (res.ok) {
        setResultsByIndex((prev) => ({
          ...prev,
          [i]: { status: 'ok', label: info.label, tagClass: info.tagClass, text: res.text },
        }));
      } else {
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
  }, [apiKey, problems, customTypes, prompts, gptModel, paraphraseEnabled]);

  return (
    <div className="container">
      <QuizForgeNav />
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">예상문제 세트</span>
        </div>
        <p className="subtitle">한 회분(1~{MAX_PROBLEMS}문항) 예상문제를 지문·유형별로 구성해 순서대로 생성합니다.</p>
      </header>

      {!ready ? (
        <p className="subtitle">불러오는 중…</p>
      ) : (
        <>
          {loadError && (
            <p className="persistMsg persistMsgErr" style={{ marginBottom: 16 }}>
              문제 유형을 불러오지 못했습니다: {loadError}
            </p>
          )}

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

          <div className="paraphraseModelRow" style={{ marginBottom: 24 }}>
            <div className="paraphraseHalf">
              <div className="paraphraseRow">
                <input
                  id="paraphrase-check-exp"
                  type="checkbox"
                  checked={paraphraseEnabled}
                  onChange={(e) => setParaphraseEnabled(e.target.checked)}
                />
                <label htmlFor="paraphrase-check-exp" className="paraphraseLabel">
                  <span className="paraphraseTitle">Paraphraze</span>
                  <span className="paraphraseHint">각 문항 지문에 대해 1단계 paraphrase 후 2단계 문제 생성을 적용합니다.</span>
                </label>
              </div>
            </div>
            <div className="modelSelectHalf">
              <div className="modelSelectCard">
                <label htmlFor="gpt-model-exp" className="modelSelectLabel">
                  GPT 모델
                </label>
                <select id="gpt-model-exp" className="modelSelect" value={gptModel} onChange={(e) => setGptModel(e.target.value)}>
                  <optgroup label="GPT-5">
                    <option value="gpt-5.1">gpt-5.1</option>
                    <option value="gpt-5">gpt-5</option>
                    <option value="gpt-5-mini">gpt-5-mini</option>
                    <option value="gpt-5-nano">gpt-5-nano</option>
                    <option value="gpt-5-chat-latest">gpt-5-chat-latest</option>
                  </optgroup>
                  <optgroup label="GPT-4 / 이전">
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                    <option value="gpt-4-turbo">gpt-4-turbo</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          <div className="sectionLabel">문항 구성</div>
          <p className="globalPassageHint" style={{ marginBottom: 16 }}>
            각 문항을 접었다 펼칠 수 있습니다. 문항마다 지문과 문제 유형을 한 개씩만 지정합니다.{' '}
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
    </div>
  );
}
