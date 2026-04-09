'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import QuizForgeNav from '@/components/QuizForgeNav';
import FocusTrap from '@/components/FocusTrap';
import InsufficientCreditsModal from '@/components/InsufficientCreditsModal';
import { callGeneratePost, isInsufficientCreditsError } from '@/lib/callGenerateClient';
import { getTypeInfo, getTypeKind } from '@/lib/defaultPrompts';
import { MAX_TOKENS_DEFAULT, MAX_TOKENS_WITH_PARAPHRASE, buildUserPrompt } from '@/lib/paraphrasePrompt';
import { typeNeedsExtraInput } from '@/lib/typeExtraInput';
import { useCustomTypesData } from '@/hooks/useCustomTypesData';
import { toErrorMessage } from '@/lib/toErrorMessage';
import { usePreferredGptModel } from '@/hooks/usePreferredGptModel';
import { CASH_ONE_TYPE_PER_PASSAGE_UNIT } from '@/lib/cashRules';
import { formatExamMetaLines, getDefaultExamMeta } from '@/lib/expectedExamMeta';

/** 한 유형 일괄 페이지는 유형 1개 고정 — 정책 확장 시 선택 유형 수로 곱함 */
const ONE_TYPE_SELECTED_COUNT = 1;

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

export default function OneTypePage() {
  const { customTypes, prompts, ready, loadError } = useCustomTypesData();
  const [passages, setPassages] = useState(['']);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [paraphraseEnabled, setParaphraseEnabled] = useState(false);
  const { preferredGptModel } = usePreferredGptModel();
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

  const patchExamMeta = useCallback((patch) => {
    setExamMeta((prev) => ({ ...prev, ...patch }));
  }, []);

  const hasDownloadable = useMemo(
    () => passages.some((_, i) => resultsByIndex[i]?.status === 'ok'),
    [passages, resultsByIndex],
  );

  const downloadWord = useCallback(async () => {
    const typeInfo = selectedTypeId ? getTypeInfo(selectedTypeId, customTypes) : null;
    const items = passages
      .map((_, i) => {
        const r = resultsByIndex[i];
        if (!r || r.status !== 'ok') return null;
        return { num: i + 1, label: typeInfo?.label ?? r.label, text: r.text };
      })
      .filter(Boolean);
    if (items.length === 0) return;
    const { buildExpectedExamDocxBlob } = await import('@/lib/expectedExamDocx');
    const blob = await buildExpectedExamDocxBlob(examMeta, items);
    const y = examMeta.year?.trim() || String(new Date().getFullYear());
    const sem = examMeta.semester === '2' ? '2학기' : '1학기';
    const ex = examMeta.examType === 'final' ? '기말' : '중간';
    const title = (examMeta.paperTitle?.trim() || '한유형일괄').replace(/[\\/:*?"<>|]/g, '_');
    saveAs(blob, `${title}_${y}_${sem}_${ex}.docx`);
  }, [examMeta, passages, resultsByIndex, selectedTypeId, customTypes]);

  const downloadPdf = useCallback(async () => {
    if (!pdfMetaRef.current || !pdfProblemsRef.current) return;
    const { downloadExpectedExamPdf } = await import('@/lib/expectedExamPdf');
    const y = examMeta.year?.trim() || String(new Date().getFullYear());
    const sem = examMeta.semester === '2' ? '2학기' : '1학기';
    const ex = examMeta.examType === 'final' ? '기말' : '중간';
    const title = (examMeta.paperTitle?.trim() || '한유형일괄').replace(/[\\/:*?"<>|]/g, '_');
    await downloadExpectedExamPdf(pdfMetaRef.current, pdfProblemsRef.current, `${title}_${y}_${sem}_${ex}.pdf`);
  }, [examMeta]);

  const passageOnlyTypes = useMemo(
    () => customTypes.filter((c) => !typeNeedsExtraInput(c.id, customTypes, prompts)),
    [customTypes, prompts],
  );

  useEffect(() => {
    if (!ready) return;
    if (selectedTypeId && passageOnlyTypes.some((c) => c.id === selectedTypeId)) return;
    setSelectedTypeId(passageOnlyTypes[0]?.id ?? null);
  }, [ready, passageOnlyTypes, selectedTypeId]);

  const filledPassageCount = useMemo(() => passages.filter((p) => p.trim()).length, [passages]);

  const estimatedOneTypeCash = useMemo(
    () =>
      selectedTypeId
        ? filledPassageCount * CASH_ONE_TYPE_PER_PASSAGE_UNIT * ONE_TYPE_SELECTED_COUNT
        : 0,
    [filledPassageCount, selectedTypeId],
  );

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

  const generateBatch = useCallback(async () => {
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
      setValidationError('선택한 유형의 프롬프트에 지문이 들어갈 자리가 없습니다. 유형 설정을 확인하세요.');
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
        const out = await callGeneratePost({
          typeLabel: info.label,
          model: preferredGptModel,
          messages: [
            {
              role: 'system',
              content: '당신은 고등학교 내신 영어 문제 전문 출제자입니다. 주어진 지문을 분석하여 고품질의 변형문제를 생성합니다. 추론 과정이나 중간 단계(STEP 등)는 출력하지 말고, 최종 결과만 출력하세요.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
          cashPolicy: 'one_type',
          oneTypeSelectedCount: ONE_TYPE_SELECTED_COUNT,
        });
        setResultsByIndex((prev) => ({
          ...prev,
          [i]: { status: 'ok', label: info.label, tagClass: info.tagClass, text: out },
        }));
      } catch (err) {
        if (isInsufficientCreditsError(err)) {
          setCreditsModalOpen(true);
          setCreditsModalMessage(err.message);
        }
        setResultsByIndex((prev) => ({
          ...prev,
          [i]: {
            status: 'error',
            label: info.label,
            tagClass: info.tagClass,
            error: toErrorMessage(err),
          },
        }));
      }
    }

    setGenerating(false);
  }, [
    passages,
    selectedTypeId,
    customTypes,
    prompts,
    paraphraseEnabled,
    preferredGptModel,
  ]);

  return (
    <div className="container">

      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">한 유형 일괄</span>
        </div>
        <p className="subtitle">여러 지문을 한 유형의 변형문제로 생성합니다. (지문만으로 생성 가능한 유형만)</p>
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
              <label htmlFor="ot-academy">학원 이름</label>
              <input
                id="ot-academy"
                type="text"
                value={examMeta.academyName}
                onChange={(e) => patchExamMeta({ academyName: e.target.value })}
                placeholder="예: ○○학원"
                autoComplete="organization"
              />
            </div>
            <div className="expectedExamField">
              <label htmlFor="ot-teacher">선생님 이름</label>
              <input
                id="ot-teacher"
                type="text"
                value={examMeta.teacherName}
                onChange={(e) => patchExamMeta({ teacherName: e.target.value })}
                placeholder="담당 강사"
                autoComplete="name"
              />
            </div>
            <div className="expectedExamField">
              <label htmlFor="ot-school">학교명</label>
              <input
                id="ot-school"
                type="text"
                value={examMeta.schoolName}
                onChange={(e) => patchExamMeta({ schoolName: e.target.value })}
                placeholder="예: ○○고등학교"
              />
            </div>
            <div className="expectedExamField">
              <label htmlFor="ot-grade">학년</label>
              <input
                id="ot-grade"
                type="text"
                value={examMeta.grade}
                onChange={(e) => patchExamMeta({ grade: e.target.value })}
                placeholder="예: 고1"
              />
            </div>
            <div className="expectedExamField">
              <label htmlFor="ot-year">연도</label>
              <input
                id="ot-year"
                type="text"
                inputMode="numeric"
                value={examMeta.year}
                onChange={(e) => patchExamMeta({ year: e.target.value })}
                placeholder="예: 2026"
              />
            </div>
            <div className="expectedExamField">
              <label htmlFor="ot-semester">학기</label>
              <select
                id="ot-semester"
                value={examMeta.semester}
                onChange={(e) => patchExamMeta({ semester: e.target.value })}
              >
                <option value="1">1학기</option>
                <option value="2">2학기</option>
              </select>
            </div>
            <div className="expectedExamField">
              <label htmlFor="ot-examtype">시험 구분</label>
              <select
                id="ot-examtype"
                value={examMeta.examType}
                onChange={(e) => patchExamMeta({ examType: e.target.value })}
              >
                <option value="mid">중간고사</option>
                <option value="final">기말고사</option>
              </select>
            </div>
            <div className="expectedExamField expectedExamFieldFull">
              <label htmlFor="ot-title">시험지 명</label>
              <input
                id="ot-title"
                type="text"
                value={examMeta.paperTitle}
                onChange={(e) => patchExamMeta({ paperTitle: e.target.value })}
                placeholder="예: 2026년 1학기 중간고사"
              />
            </div>
          </div>

          <div className="mainWorkRow">
            <div className="mainWorkColLeft">
              <div className="inlineTypeConfig globalPassageConfig">
                <div className="sectionLabel">영어 지문 ('지문 추가'를 클릭하여 지문을 추가할 수 있습니다.)</div>
                <p className="globalPassageHint oneTypeHint">
                  영작·어휘·서술·어법 추가 입력이 필요한 유형은 오른쪽 목록에 나오지 않습니다.
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

                <div className="paraphraseModelRow paraphraseModelRowSingle" style={{ marginTop: 20 }}>
                  <div className="paraphraseHalf paraphraseHalfFull">
                    <div className="paraphraseRow">
                      <input
                        id="paraphrase-check-onetype"
                        type="checkbox"
                        checked={paraphraseEnabled}
                        onChange={(e) => setParaphraseEnabled(e.target.checked)}
                      />
                      <label htmlFor="paraphrase-check-onetype" className="paraphraseLabel">
                        <span className="paraphraseTitle">Paraphrase</span>
                        <span className="paraphraseHint">
                          켜면 각 지문에 대해 1단계 paraphrase 후 2단계 문제 생성이 적용됩니다.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
                {/* <p className="globalPassageHint" style={{ marginTop: 8 }}>
                  GPT 모델은 로그인 시 프로필에 저장된 설정을 사용합니다.
                </p> */}
              </div>
            </div>

            <aside className="mainWorkColRight" aria-label="문제 유형 (하나만 선택)">
              <div className="sectionLabel">문제 유형 (1개)</div>
              <p className="dragHint typesBucketHint">복수 선택은 되지 않습니다. 한 유형만 고르면, 왼쪽의 모든 지문에 그 유형이 적용됩니다.</p>

              {passageOnlyTypes.length === 0 ? (
                <div className="typesEmptyCard">
                  <p className="typesEmptyTitle">지문만으로 생성할 수 있는 등록 유형이 없습니다.</p>
                  <p className="typesEmptyText">
                    객관식 유형이 등록되어 있어야 하며, 영작·어휘·서술이 아닌 유형만 이 목록에 표시됩니다. 유형이 없으면 관리자에게 문의하세요.
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
                        <button
                          type="button"
                          className="examplePreviewBtn oneTypeExampleBtn"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openExampleModal(c);
                          }}
                        >
                          예시 보기
                        </button>
                      </label>
                    );
                  })}
                </div>
              )}
            </aside>
          </div>

          {selectedTypeId && filledPassageCount > 0 && (
            <p className="dragHint" style={{ marginBottom: 10 }}>
              예상 소모 캐쉬: 약 <strong>{estimatedOneTypeCash.toLocaleString()}</strong> (지문 {filledPassageCount}개 × 유형{' '}
              {ONE_TYPE_SELECTED_COUNT}개 × {CASH_ONE_TYPE_PER_PASSAGE_UNIT}캐쉬)
            </p>
          )}

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

          {/* <p className="dragHint" style={{ marginTop: 24 }}>
            <Link href="/">← 문제 생성(메인)</Link>
          </p> */}

          <div
            className={`modalOverlay modalZExample ${exampleModal?.open ? 'modalOverlayOpen' : ''}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeExampleModal();
            }}
            role="presentation"
          >
            {exampleModal?.open && (
              <FocusTrap onEscape={closeExampleModal}>
              <div
                className="modal modalExample"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="onetype-example-modal-title"
              >
                <h3 id="onetype-example-modal-title">{exampleModal.title} — 예시 문제</h3>
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
              </FocusTrap>
            )}
          </div>

          {/* PDF 렌더용 숨김 DOM — html2canvas가 캡처 */}
          <div ref={pdfMetaRef} className="expectedPdfExport expectedPdfMeta" aria-hidden="true">
            <div className="expectedPdfExportTitle">{examMeta.paperTitle?.trim() || '한 유형 일괄 문제'}</div>
            {formatExamMetaLines(examMeta)
              .filter((line) => !line.startsWith('시험지 명:'))
              .map((line, i) => (
                <p key={i} className="expectedPdfExportLine">
                  {line}
                </p>
              ))}
          </div>
          <div ref={pdfProblemsRef} className="expectedPdfExport expectedPdfProblems" aria-hidden="true">
            {passages.map((_, i) => {
              const r = resultsByIndex[i];
              if (!r || r.status !== 'ok') return null;
              return (
                <div key={i} className="expectedPdfProblemBlock">
                  <h3>
                    지문 {i + 1} ({r.label})
                  </h3>
                  <pre>{r.text}</pre>
                </div>
              );
            })}
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
