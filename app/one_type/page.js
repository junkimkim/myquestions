'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import QuizForgeNav from '@/components/QuizForgeNav';
import { getTypeInfo, getTypeKind } from '@/lib/defaultPrompts';
import { MAX_TOKENS_DEFAULT, MAX_TOKENS_WITH_PARAPHRASE, buildUserPrompt } from '@/lib/paraphrasePrompt';
import { typeNeedsExtraInput } from '@/lib/typeExtraInput';
import { useCustomTypesData } from '@/hooks/useCustomTypesData';

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

export default function OneTypePage() {
  const { customTypes, prompts, ready, loadError } = useCustomTypesData();
  const [apiKey, setApiKey] = useState('');
  const [passages, setPassages] = useState(['']);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [paraphraseEnabled, setParaphraseEnabled] = useState(false);
  const [gptModel, setGptModel] = useState('gpt-4o');
  const [generating, setGenerating] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  /** @type {Record<number, { status: string, label: string, tagClass: string, text?: string, error?: string }>} */
  const [resultsByIndex, setResultsByIndex] = useState({});

  const passageOnlyTypes = useMemo(
    () => customTypes.filter((c) => !typeNeedsExtraInput(c.id, customTypes, prompts)),
    [customTypes, prompts],
  );

  useEffect(() => {
    if (!ready) return;
    if (selectedTypeId && passageOnlyTypes.some((c) => c.id === selectedTypeId)) return;
    setSelectedTypeId(passageOnlyTypes[0]?.id ?? null);
  }, [ready, passageOnlyTypes, selectedTypeId]);

  const apiStatus = useMemo(() => {
    const k = apiKey.trim();
    if (k.startsWith('sk-') && k.length > 20) return { text: '입력됨', ok: true };
    return { text: '미입력', ok: false };
  }, [apiKey]);

  const setPassageAt = useCallback((index, value) => {
    setPassages((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const addPassage = useCallback(() => {
    setPassages((prev) => [...prev, '']);
  }, []);

  const removePassage = useCallback((index) => {
    setPassages((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [''];
    });
    setResultsByIndex({});
    setShowResults(false);
  }, []);

  const generateBatch = useCallback(async () => {
    const key = apiKey.trim();
    if (!key || !key.startsWith('sk-')) {
      setValidationError('OpenAI API 키를 입력해주세요. (sk-로 시작)');
      setShowResults(true);
      return;
    }
    if (!selectedTypeId) {
      setValidationError('문제 유형을 하나 선택해 주세요.');
      setShowResults(true);
      return;
    }

    const typeRow = customTypes.find((x) => x.id === selectedTypeId);
    const promptTemplate = prompts[selectedTypeId];
    const info = getTypeInfo(selectedTypeId, customTypes);
    const kind = getTypeKind(typeRow);

    if (!promptTemplate || !String(promptTemplate).includes('{passage}')) {
      setValidationError('선택한 유형의 프롬프트에 {passage}가 필요합니다. 유형 관리에서 확인하세요.');
      setShowResults(true);
      return;
    }
    if (kind === 'vocabulary' || kind === 'writing') {
      setValidationError('이 페이지에서는 지문만으로 생성 가능한 유형만 사용할 수 있습니다.');
      setShowResults(true);
      return;
    }

    const jobIndices = passages.map((p, i) => (p.trim() ? i : -1)).filter((i) => i >= 0);
    if (jobIndices.length === 0) {
      setValidationError('최소 한 개의 지문을 입력해 주세요.');
      setShowResults(true);
      return;
    }

    setValidationError(null);
    setGenerating(true);
    setShowResults(true);
    setResultsByIndex({});

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

    const maxTokens = paraphraseEnabled ? MAX_TOKENS_WITH_PARAPHRASE : MAX_TOKENS_DEFAULT;

    for (const i of jobIndices) {
      const text = passages[i].trim();
      setResultsByIndex((prev) => ({
        ...prev,
        [i]: { status: 'loading', label: info.label, tagClass: info.tagClass },
      }));

      try {
        const prompt = buildUserPrompt(
          text,
          promptTemplate,
          paraphraseEnabled,
          '',
          '',
          '',
          null,
          null,
          null,
          null,
          null,
          null,
        );
        const out = await runOne({
          apiKey: key,
          model: gptModel,
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
        setResultsByIndex((prev) => ({
          ...prev,
          [i]: { status: 'ok', label: info.label, tagClass: info.tagClass, text: out },
        }));
      } catch (err) {
        setResultsByIndex((prev) => ({
          ...prev,
          [i]: {
            status: 'error',
            label: info.label,
            tagClass: info.tagClass,
            error: err instanceof Error ? err.message : String(err),
          },
        }));
      }
    }

    setGenerating(false);
  }, [
    apiKey,
    passages,
    selectedTypeId,
    customTypes,
    prompts,
    paraphraseEnabled,
    gptModel,
  ]);

  return (
    <div className="container">
      <QuizForgeNav />
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">한 유형 일괄</span>
        </div>
        <p className="subtitle">여러 지문에 같은 유형의 변형문제를 순서대로 만듭니다. (지문만으로 생성 가능한 유형만)</p>
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

          <div className="mainWorkRow">
            <div className="mainWorkColLeft">
              <div className="inlineTypeConfig globalPassageConfig">
                <div className="sectionLabel">영어 지문 (여러 개)</div>
                <p className="globalPassageHint oneTypeHint">
                  문제 생성 화면에서 &quot;지문만 입력하면 되는 유형&quot;과 동일한 조건입니다. 영작·어휘·서술·어법 보조 입력이 필요한 유형은 오른쪽 목록에 나오지 않습니다.{' '}
                  <Link href="/types" className="typesEmptyLink">
                    유형 관리
                  </Link>
                </p>

                {passages.map((p, i) => (
                  <div key={i} className="oneTypePassageBlock">
                    <div className="oneTypePassageHead">
                      <span className="oneTypePassageTitle">지문 {i + 1}</span>
                      {passages.length > 1 && (
                        <button type="button" className="btnSm btnGhost oneTypeRemoveBtn" onClick={() => removePassage(i)}>
                          삭제
                        </button>
                      )}
                    </div>
                    <div className="passageWrap">
                      <textarea
                        value={p}
                        onChange={(e) => setPassageAt(i, e.target.value)}
                        placeholder="분석할 영어 지문을 여기에 붙여넣으세요..."
                        aria-label={`영어 지문 ${i + 1}`}
                      />
                      <span className="charCount">{p.length.toLocaleString()}자</span>
                    </div>
                  </div>
                ))}

                <button type="button" className="btnSm btnGhost oneTypeAddPassageBtn" onClick={addPassage}>
                  지문 추가
                </button>

                <div className="paraphraseModelRow" style={{ marginTop: 20 }}>
                  <div className="paraphraseHalf">
                    <div className="paraphraseRow">
                      <input
                        id="paraphrase-check-onetype"
                        type="checkbox"
                        checked={paraphraseEnabled}
                        onChange={(e) => setParaphraseEnabled(e.target.checked)}
                      />
                      <label htmlFor="paraphrase-check-onetype" className="paraphraseLabel">
                        <span className="paraphraseTitle">Paraphraze</span>
                        <span className="paraphraseHint">
                          켜면 각 지문에 대해 1단계 paraphrase 후 2단계 문제 생성이 적용됩니다.
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="modelSelectHalf">
                    <div className="modelSelectCard">
                      <label htmlFor="gpt-model-onetype" className="modelSelectLabel">
                        GPT 모델
                      </label>
                      <select
                        id="gpt-model-onetype"
                        className="modelSelect"
                        value={gptModel}
                        onChange={(e) => setGptModel(e.target.value)}
                      >
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
              </div>
            </div>

            <aside className="mainWorkColRight" aria-label="문제 유형 (하나만 선택)">
              <div className="sectionLabel">문제 유형 (1개)</div>
              <p className="dragHint typesBucketHint">복수 선택은 되지 않습니다. 한 유형만 고르면, 왼쪽의 모든 지문에 그 유형이 적용됩니다.</p>

              {passageOnlyTypes.length === 0 ? (
                <div className="typesEmptyCard">
                  <p className="typesEmptyTitle">지문만으로 생성할 수 있는 등록 유형이 없습니다.</p>
                  <p className="typesEmptyText">
                    <Link href="/types" className="typesEmptyLink">
                      유형 관리
                    </Link>
                    에서 객관식 유형을 추가하거나, 영작·어휘·서술이 아닌 유형을 사용해 주세요.
                  </p>
                </div>
              ) : (
                <div className="oneTypeRadioList" role="radiogroup" aria-label="문제 유형 단일 선택">
                  {passageOnlyTypes.map((c) => {
                    const inf = getTypeInfo(c.id, customTypes);
                    const id = `onetype-${c.id}`;
                    return (
                      <label
                        key={c.id}
                        htmlFor={id}
                        className={`oneTypeRadioItem ${selectedTypeId === c.id ? 'oneTypeRadioItemActive' : ''}`}
                      >
                        <input
                          id={id}
                          type="radio"
                          name="one_type_kind"
                          value={c.id}
                          checked={selectedTypeId === c.id}
                          onChange={() => setSelectedTypeId(c.id)}
                        />
                        <div className="oneTypeRadioMeta">
                          <div className="oneTypeRadioName">{inf.name}</div>
                          <div className="oneTypeRadioDesc">{inf.desc || '—'}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </aside>
          </div>

          <button
            type="button"
            className="btnGenerate"
            disabled={generating || !selectedTypeId || passageOnlyTypes.length === 0}
            onClick={generateBatch}
          >
            {generating ? (
              <>
                <span className="spinner" />
                생성 중…
              </>
            ) : (
              <>
                <IconBolt />
                변형문제 일괄 생성
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
                passages.map((_, i) => {
                  const r = resultsByIndex[i];
                  if (!r) return null;
                  const { label, tagClass } = r;
                  if (r.status === 'loading') {
                    return (
                      <div key={i} className="resultBlock">
                        <div className="resultHeader">
                          <div className="resultTitle">
                            <span className={`typeTag ${tagClass}`}>{label}</span>
                            <span className="oneTypeResultPassageIdx"> · 지문 {i + 1}</span>
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
                            <span className={`typeTag ${tagClass}`}>{label}</span>
                            <span className="oneTypeResultPassageIdx"> · 지문 {i + 1}</span>
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
                          <span className={`typeTag ${tagClass}`}>{label}</span>
                          <span className="oneTypeResultPassageIdx"> · 지문 {i + 1}</span>
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
          </p>
        </>
      )}
    </div>
  );
}
