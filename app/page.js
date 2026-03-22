'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_CUSTOM_PROMPT,
  DEFAULT_PROMPTS,
  QUESTION_TYPES,
  TYPE_INFO,
  allTypeIds,
  getTypeInfo,
  isBuiltinType,
} from '@/lib/defaultPrompts';
import {
  MAX_TOKENS_DEFAULT,
  MAX_TOKENS_WITH_PARAPHRASE,
  buildUserPrompt,
} from '@/lib/paraphrasePrompt';
import { loadCustomTypes, loadPromptsPartial, saveCustomTypes, savePromptsPartial } from '@/lib/quizforgeStorage';

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

function IconPlus(props) {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 5v14M5 12h14" />
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
  const [apiKey, setApiKey] = useState('');
  const [passage, setPassage] = useState('');
  const [paraphraseEnabled, setParaphraseEnabled] = useState(false);
  const [customTypes, setCustomTypes] = useState([]);
  const [prompts, setPrompts] = useState(() => ({ ...DEFAULT_PROMPTS }));
  const [activeTypes, setActiveTypes] = useState(() => [...QUESTION_TYPES]);
  const [modalOpen, setModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [promptDrafts, setPromptDrafts] = useState(() => ({ ...DEFAULT_PROMPTS }));
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState({});
  const [resultOrder, setResultOrder] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [newTypeTag, setNewTypeTag] = useState('맞춤');
  const [newTypePrompt, setNewTypePrompt] = useState('');

  const hydratedRef = useRef(false);

  useEffect(() => {
    const types = loadCustomTypes();
    const partial = loadPromptsPartial() || {};
    const merged = { ...DEFAULT_PROMPTS, ...partial };
    for (const c of types) {
      if (merged[c.id] == null || merged[c.id] === '') merged[c.id] = DEFAULT_CUSTOM_PROMPT;
    }
    setCustomTypes(types);
    setPrompts(merged);
    setActiveTypes([...QUESTION_TYPES, ...types.map((t) => t.id)]);
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    savePromptsPartial(prompts);
  }, [prompts]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    saveCustomTypes(customTypes);
  }, [customTypes]);

  const typeIds = useMemo(() => allTypeIds(customTypes), [customTypes]);

  const apiStatus = useMemo(() => {
    const k = apiKey.trim();
    if (k.startsWith('sk-') && k.length > 20) return { text: '입력됨', ok: true };
    return { text: '미입력', ok: false };
  }, [apiKey]);

  const activeCount = useMemo(() => typeIds.filter((id) => activeTypes.includes(id)).length, [typeIds, activeTypes]);

  const toggleType = useCallback((type) => {
    setActiveTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }, []);

  const openModal = useCallback(() => {
    const ids = allTypeIds(customTypes);
    const draft = {};
    for (const id of ids) {
      const fallback = isBuiltinType(id) ? DEFAULT_PROMPTS[id] : DEFAULT_CUSTOM_PROMPT;
      draft[id] = prompts[id] ?? fallback;
    }
    setPromptDrafts(draft);
    setModalOpen(true);
  }, [prompts, customTypes]);

  const closeModal = useCallback(() => setModalOpen(false), []);

  const savePromptsFromModal = useCallback(() => {
    setPrompts({ ...promptDrafts });
    setModalOpen(false);
  }, [promptDrafts]);

  const resetPrompts = useCallback(() => {
    const next = { ...DEFAULT_PROMPTS };
    for (const c of customTypes) {
      next[c.id] = DEFAULT_CUSTOM_PROMPT;
    }
    setPromptDrafts(next);
  }, [customTypes]);

  const removeCustomType = useCallback((id) => {
    setCustomTypes((prev) => prev.filter((c) => c.id !== id));
    setActiveTypes((prev) => prev.filter((t) => t !== id));
    setPrompts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPromptDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const openAddModal = useCallback(() => {
    setNewTypeName('');
    setNewTypeDesc('');
    setNewTypeTag('맞춤');
    setNewTypePrompt('');
    setAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => setAddModalOpen(false), []);

  const submitNewType = useCallback(() => {
    const name = newTypeName.trim();
    const desc = newTypeDesc.trim();
    if (!name) return;
    const id = `c_${crypto.randomUUID().replace(/-/g, '')}`;
    const tag = newTypeTag.trim() || '맞춤';
    const promptText = newTypePrompt.trim() || DEFAULT_CUSTOM_PROMPT;
    setCustomTypes((prev) => [...prev, { id, name, desc: desc || '맞춤 유형', tag }]);
    setPrompts((prev) => ({ ...prev, [id]: promptText }));
    setActiveTypes((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setAddModalOpen(false);
  }, [newTypeName, newTypeDesc, newTypeTag, newTypePrompt]);

  const showError = useCallback((msg) => {
    setValidationError(msg);
    setShowResults(true);
    setResults({});
    setResultOrder([]);
  }, []);

  const generateQuestions = useCallback(async () => {
    const key = apiKey.trim();
    const text = passage.trim();
    const types = typeIds.filter((id) => activeTypes.includes(id));

    if (!key || !key.startsWith('sk-')) {
      showError('OpenAI API 키를 입력해주세요. (sk-로 시작)');
      return;
    }
    if (!text) {
      showError('영어 지문을 입력해주세요.');
      return;
    }
    if (types.length === 0) {
      showError('최소 한 가지 문제 유형을 선택해주세요.');
      return;
    }

    setValidationError(null);
    setGenerating(true);
    setShowResults(true);
    setResults({});
    setResultOrder(types);

    for (const type of types) {
      const info = getTypeInfo(type, customTypes);
      const label = info.label;
      const tagClass = info.tagClass;
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

      setResults((prev) => ({
        ...prev,
        [type]: { status: 'loading', label, tagClass },
      }));

      try {
        const prompt = buildUserPrompt(text, promptTemplate, paraphraseEnabled);
        const maxTokens = paraphraseEnabled ? MAX_TOKENS_WITH_PARAPHRASE : MAX_TOKENS_DEFAULT;
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: key,
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: '당신은 수능 영어 전문 출제자입니다. 주어진 지문을 분석하여 고품질의 변형문제를 생성합니다.',
              },
              { role: 'user', content: prompt },
            ],
            max_tokens: maxTokens,
            temperature: 0.7,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error?.message || '요청에 실패했습니다.');
        }

        const out = data.choices?.[0]?.message?.content;
        if (out == null) throw new Error('응답 형식이 올바르지 않습니다.');

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
  }, [apiKey, passage, paraphraseEnabled, activeTypes, prompts, showError, typeIds, customTypes]);

  const hasDownloadable = useMemo(
    () => Object.values(results).some((r) => r && r.status === 'ok'),
    [results],
  );

  const downloadDocx = useCallback(async () => {
    const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import('docx');
    const { saveAs } = await import('file-saver');

    const children = [];
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'QuizForge — 변형문제', bold: true, size: 32 })],
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 },
      }),
    );

    const p = passage.trim();
    children.push(
      new Paragraph({ children: [new TextRun({ text: '📄 원본 지문', bold: true, size: 24 })] }),
      new Paragraph({ children: [new TextRun({ text: p, size: 22 })], spacing: { after: 400 } }),
    );

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
  }, [passage, results, resultOrder]);

  const renderPromptEditors = (ids, sectionTitle) => (
    <>
      <div className="promptSectionLabel">{sectionTitle}</div>
      {ids.map((type) => {
        const info = getTypeInfo(type, customTypes);
        return (
          <div key={type} className="promptItem">
            <div className="promptLabel">
              <span className={`typeTag ${info.tagClass}`} style={{ fontSize: '0.65rem' }}>
                {info.name}
              </span>
              {!isBuiltinType(type) && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text2)', fontWeight: 400 }}>맞춤</span>
              )}
            </div>
            <textarea
              value={promptDrafts[type] ?? ''}
              onChange={(e) => setPromptDrafts((d) => ({ ...d, [type]: e.target.value }))}
            />
          </div>
        );
      })}
    </>
  );

  return (
    <div className="container">
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">for Teachers</span>
        </div>
        <p className="subtitle">영어 지문 → AI 변형문제 자동 생성 · Word 파일 다운로드</p>
      </header>

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
            켜면 먼저 지문을 paraphrase한 뒤, 그 결과만을 근거로 아래에서 선택한 유형의 변형 문제 프롬프트가 동작합니다. (1단계 지문 Paraphrase → 2단계 문제 생성)
          </span>
        </label>
      </div>

      <div className="sectionLabel">문제 유형 선택</div>
      <div className="typesGrid">
        {QUESTION_TYPES.map((type) => {
          const info = TYPE_INFO[type];
          const active = activeTypes.includes(type);
          return (
            <div key={type} className={`typeCardShell ${active ? 'typeCardShellActive' : ''}`}>
              <button type="button" className={`typeCard ${active ? 'typeCardActive' : ''}`} onClick={() => toggleType(type)}>
                <div className="typeCheck">
                  <IconCheck />
                </div>
                <div className="typeInfo">
                  <div className="typeName">{info.name}</div>
                  <div className="typeDesc">{info.desc}</div>
                </div>
                <span className={`typeTag ${info.tagClass}`}>{info.tag}</span>
              </button>
            </div>
          );
        })}
        {customTypes.map((c) => {
          const info = getTypeInfo(c.id, customTypes);
          const active = activeTypes.includes(c.id);
          return (
            <div key={c.id} className={`typeCardShell ${active ? 'typeCardShellActive' : ''}`}>
              <button type="button" className={`typeCard ${active ? 'typeCardActive' : ''}`} onClick={() => toggleType(c.id)}>
                <div className="typeCheck">
                  <IconCheck />
                </div>
                <div className="typeInfo">
                  <div className="typeName">{info.name}</div>
                  <div className="typeDesc">{info.desc}</div>
                </div>
                <span className={`typeTag ${info.tagClass}`}>{info.tag}</span>
              </button>
              <button
                type="button"
                className="typeDeleteBtn"
                onClick={() => removeCustomType(c.id)}
                aria-label={`${info.name} 유형 삭제`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className="typesActions">
        <button type="button" className="addTypeBtn" onClick={openAddModal}>
          <IconPlus />
          문제 유형 추가
        </button>
        <button type="button" className="settingsBtn" onClick={openModal}>
          <IconSettings />
          프롬프트 설정 편집
        </button>
      </div>

      <button type="button" className="btnGenerate" disabled={generating} onClick={generateQuestions}>
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
              기본·맞춤 유형 모두 GPT에 전달되는 지시문을 바꿀 수 있습니다.{' '}
              <code>{'{passage}'}</code>는 입력 지문으로 자동 대체됩니다.
            </p>

            {renderPromptEditors(QUESTION_TYPES, '기본 유형')}
            {customTypes.length > 0 && renderPromptEditors(
              customTypes.map((c) => c.id),
              '맞춤 유형',
            )}

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
        className={`modalOverlay modalZTop ${addModalOpen ? 'modalOverlayOpen' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeAddModal();
        }}
        role="presentation"
      >
        {addModalOpen && (
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
            <h3 id="add-modal-title">문제 유형 추가</h3>
            <p className="modalIntro">이름과 설명은 카드에 표시됩니다. 프롬프트는 비워 두면 기본 템플릿이 들어가며, 이후 &quot;프롬프트 설정 편집&quot;에서 수정할 수 있습니다.</p>

            <div className="formField">
              <label htmlFor="nt-name">유형 이름</label>
              <input
                id="nt-name"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="예: 함의 추론"
                maxLength={80}
              />
            </div>
            <div className="formField">
              <label htmlFor="nt-desc">설명</label>
              <textarea
                id="nt-desc"
                value={newTypeDesc}
                onChange={(e) => setNewTypeDesc(e.target.value)}
                placeholder="카드에 보여 줄 한 줄 설명"
                maxLength={300}
              />
            </div>
            <div className="formField">
              <label htmlFor="nt-tag">배지 (짧은 라벨)</label>
              <input id="nt-tag" value={newTypeTag} onChange={(e) => setNewTypeTag(e.target.value)} placeholder="맞춤" maxLength={12} />
              <p className="formHint">카드 오른쪽 작은 태그에 표시됩니다.</p>
            </div>
            <div className="formField">
              <label htmlFor="nt-prompt">초기 프롬프트 (선택)</label>
              <textarea
                id="nt-prompt"
                value={newTypePrompt}
                onChange={(e) => setNewTypePrompt(e.target.value)}
                placeholder={'비워 두면 기본 맞춤 템플릿이 사용됩니다. 반드시 {passage}를 포함하세요.'}
                style={{ minHeight: 120, fontFamily: 'var(--font-dmono), monospace', fontSize: '0.82rem' }}
              />
            </div>

            <div className="modalFooter">
              <button type="button" className="btnSm btnGhost" onClick={closeAddModal}>
                취소
              </button>
              <button type="button" className="btnSm btnPrimary" onClick={submitNewType} disabled={!newTypeName.trim()}>
                추가
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
