'use client';

import { useCallback, useState } from 'react';
import {
  DEFAULT_CUSTOM_PROMPT,
  DEFAULT_VOCAB_PROMPT,
  DEFAULT_WRITING_PROMPT,
  defaultCustomPromptForKind,
  getTypeKind,
} from '@/lib/defaultPrompts';
import QuizForgeNav from '@/components/QuizForgeNav';
import { useCustomTypesData } from '@/hooks/useCustomTypesData';

function errorToMessage(err, fallback) {
  if (typeof err === 'string' && err.trim()) return err;
  if (err && typeof err === 'object') {
    if (typeof err.message === 'string' && err.message.trim()) return err.message;
    if (typeof err.error_description === 'string' && err.error_description.trim()) return err.error_description;
    if (typeof err.details === 'string' && err.details.trim()) return err.details;
    if (typeof err.hint === 'string' && err.hint.trim()) return err.hint;
    try {
      const s = JSON.stringify(err);
      if (s && s !== '{}' && s !== 'null') return s;
    } catch {}
  }
  return fallback;
}

export default function TypesManagePage() {
  const {
    customTypes,
    prompts,
    removeCustomType,
    updateCustomType,
    createCustomType,
    ready,
    loadError,
  } = useCustomTypesData();
  const isDev = process.env.NODE_ENV === 'development';

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [newKind, setNewKind] = useState('mcq');
  const [isDescriptive, setIsDescriptive] = useState(false);
  const [newMcqCategory, setNewMcqCategory] = useState(null);
  const [promptText, setPromptText] = useState('');
  const [exampleFile, setExampleFile] = useState(null);
  const [formError, setFormError] = useState('');
  const [formOk, setFormOk] = useState('');

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editKind, setEditKind] = useState('mcq');
  const [editIsDescriptive, setEditIsDescriptive] = useState(false);
  const [editMcqCategory, setEditMcqCategory] = useState(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editExampleFile, setEditExampleFile] = useState(null);
  const [editError, setEditError] = useState('');
  const [editOk, setEditOk] = useState('');

  const resetForm = useCallback(() => {
    setName('');
    setDesc('');
    setNewKind('mcq');
    setIsDescriptive(false);
    setNewMcqCategory(null);
    setPromptText('');
    setExampleFile(null);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditId(null);
    setEditName('');
    setEditDesc('');
    setEditKind('mcq');
    setEditIsDescriptive(false);
    setEditMcqCategory(null);
    setEditPrompt('');
    setEditExampleFile(null);
    setEditError('');
    setEditOk('');
  }, []);

  const openEditModal = useCallback(
    (c) => {
      setEditId(c.id);
      setEditName(c.name);
      setEditDesc(c.desc || '');
      setEditKind(getTypeKind(c));
      setEditIsDescriptive(Boolean(c.is_descriptive ?? c.is_descriptive_answer ?? false));
      setEditMcqCategory(c?.mcq_category === 'grammar-mcq' ? 'grammar-mcq' : null);
      setEditPrompt(prompts[c.id] ?? defaultCustomPromptForKind(getTypeKind(c)));
      setEditExampleFile(null);
      setEditError('');
      setEditOk('');
    },
    [prompts],
  );

  const saveEdit = useCallback(async () => {
    if (!editId) return;
    setEditError('');
    setEditOk('');
    const n = editName.trim();
    if (!n) {
      setEditError('유형 이름을 입력하세요.');
      return;
    }
    const prompt =
      editPrompt.trim() ||
      (editKind === 'writing'
        ? DEFAULT_WRITING_PROMPT
        : editKind === 'vocabulary'
          ? DEFAULT_VOCAB_PROMPT
          : DEFAULT_CUSTOM_PROMPT);
    if (!prompt.includes('{passage}')) {
      setEditError('프롬프트에 {passage}를 포함해야 합니다.');
      return;
    }
    if (editKind === 'writing' && !prompt.includes('{answer}')) {
      setEditError('영작 유형은 프롬프트에 {answer}를 포함해야 합니다.');
      return;
    }
    if (editKind === 'vocabulary' && !prompt.includes('{vocab}')) {
      setEditError('어휘 유형은 프롬프트에 {vocab}를 포함해야 합니다.');
      return;
    }
    if (editIsDescriptive && editKind === 'mcq' && !prompt.includes('{answer}')) {
      setEditError('서술형(mcq) 유형은 프롬프트에 {answer}를 포함해야 합니다.');
      return;
    }

    const storedKind =
      editKind === 'writing' ? 'writing' : editKind === 'vocabulary' ? 'vocabulary' : 'mcq';
    const storedIsDescriptive = storedKind === 'mcq' ? Boolean(editIsDescriptive) : false;
    const storedMcqCategory =
      storedKind === 'mcq' && !storedIsDescriptive && editMcqCategory === 'grammar-mcq'
        ? 'grammar-mcq'
        : null;
    const patchRes = await updateCustomType(editId, {
      name: n,
      desc: editDesc.trim() || '사용자 정의 유형',
      kind: storedKind,
      prompt,
      is_descriptive: storedIsDescriptive,
      mcq_category: storedMcqCategory,
    });
    if (!patchRes.ok) {
      const errData = await patchRes.json().catch(() => ({}));
      setEditError(errorToMessage(errData.error, '저장에 실패했습니다.'));
      return;
    }

    if (isDev && editExampleFile) {
      const fd = new FormData();
      fd.append('typeId', editId);
      fd.append('file', editExampleFile);
      const res = await fetch('/api/custom-type-example', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(errorToMessage(data.error, '이미지 저장에 실패했습니다. 이름·설명·프롬프트는 반영되었습니다.'));
        return;
      }
      setEditOk(`저장했습니다. 예시 이미지: ${data.path || ''}`);
      setEditExampleFile(null);
      return;
    }

    setEditOk('저장했습니다.');
    setTimeout(() => closeEditModal(), 600);
  }, [editId, editName, editDesc, editKind, editIsDescriptive, editMcqCategory, editPrompt, editExampleFile, isDev, updateCustomType, closeEditModal]);

  const addType = useCallback(async () => {
    setFormError('');
    setFormOk('');
    const n = name.trim();
    if (!n) {
      setFormError('유형 이름을 입력하세요.');
      return;
    }
    if (isDev && !exampleFile) {
      setFormError('로컬 개발에서는 예시 문제 이미지 파일을 반드시 선택하세요.');
      return;
    }
    const prompt =
      promptText.trim() ||
      (newKind === 'writing'
        ? DEFAULT_WRITING_PROMPT
        : newKind === 'vocabulary'
          ? DEFAULT_VOCAB_PROMPT
          : DEFAULT_CUSTOM_PROMPT);
    if (!prompt.includes('{passage}')) {
      setFormError('프롬프트에 {passage}를 포함해야 합니다.');
      return;
    }
    if (newKind === 'writing' && !prompt.includes('{answer}')) {
      setFormError('영작 유형은 프롬프트에 {answer}를 포함해야 합니다.');
      return;
    }
    if (newKind === 'vocabulary' && !prompt.includes('{vocab}')) {
      setFormError('어휘 유형은 프롬프트에 {vocab}를 포함해야 합니다.');
      return;
    }

    const id = `c_${crypto.randomUUID().replace(/-/g, '')}`;
    const storedKind =
      newKind === 'writing' ? 'writing' : newKind === 'vocabulary' ? 'vocabulary' : 'mcq';
    const storedIsDescriptive = storedKind === 'mcq' ? Boolean(isDescriptive) : false;
    const storedMcqCategory =
      storedKind === 'mcq' && !storedIsDescriptive && newMcqCategory === 'grammar-mcq'
        ? 'grammar-mcq'
        : null;
    if (storedIsDescriptive && !prompt.includes('{answer}')) {
      setFormError('서술형 유형은 프롬프트에 {answer}를 포함해야 합니다.');
      return;
    }

    const createRes = await createCustomType({
      id,
      name: n,
      desc: desc.trim() || '사용자 정의 유형',
      kind: storedKind,
      is_descriptive: storedIsDescriptive,
      mcq_category: storedMcqCategory,
      prompt,
    });
    const createData = await createRes.json().catch(() => ({}));
    if (!createRes.ok) {
      setFormError(errorToMessage(createData.error, '유형 추가에 실패했습니다.'));
      return;
    }
    const newId = createData.id || id;

    if (isDev && exampleFile) {
      const fd = new FormData();
      fd.append('typeId', newId);
      fd.append('file', exampleFile);
      const res = await fetch('/api/custom-type-example', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(errorToMessage(data.error, '이미지 저장에 실패했습니다. 유형 데이터는 추가되었습니다.'));
        resetForm();
        return;
      }
      setFormOk(`유형을 추가하고 예시 이미지를 저장했습니다. (${data.path || ''})`);
    } else if (!isDev && exampleFile) {
      setFormOk(
        `유형을 추가했습니다. 유형 ID: ${newId} — 선택한 이미지를 저장소에 public/custom-type-examples/${newId}.png (또는 jpg/webp/gif)로 복사한 뒤 커밋·배포하세요.`,
      );
    } else {
      setFormOk(
        `유형을 추가했습니다. 유형 ID: ${newId} — 예시 이미지는 public/custom-type-examples/${newId}.png 등 파일명으로 프로젝트에 넣을 수 있습니다.`,
      );
    }

    resetForm();
  }, [name, desc, newKind, isDescriptive, newMcqCategory, promptText, exampleFile, isDev, createCustomType, resetForm]);

  const removeType = useCallback(
    async (id) => {
      if (!window.confirm('이 유형과 프롬프트를 삭제할까요?')) return;
      await removeCustomType(id);
      if (editId === id) closeEditModal();
      if (isDev) {
        await fetch(`/api/custom-type-example?typeId=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
      }
    },
    [isDev, removeCustomType, editId, closeEditModal],
  );

  return (
    <div className="container">
      <QuizForgeNav />
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">유형 관리</span>
        </div>
        <p className="subtitle">문제 유형·프롬프트·예시 이미지를 등록합니다. 메인 화면에서 유형을 선택해 문제를 생성하세요.</p>
      </header>

      {!ready ? (
        <p className="subtitle">불러오는 중…</p>
      ) : (
        <>
          {loadError && (
            <p className="persistMsg persistMsgErr" style={{ marginBottom: 16 }}>
              Supabase 연결 오류: {loadError}. <code>.env.local</code>에 URL·SERVICE_ROLE_KEY를 확인하고, SQL 마이그레이션을
              실행했는지 확인하세요.
            </p>
          )}
          <div className="sectionLabel">등록된 유형 ({customTypes.length})</div>
          {customTypes.length === 0 ? (
            <p className="typesEmptyHint">아래 폼에서 첫 유형을 추가하세요.</p>
          ) : (
            <ul className="typesManageList">
              {customTypes.map((c) => (
                <li key={c.id} className="typesManageItem">
                  <div className="typesManageInfo">
                    <span
                      className={`typesKindBadge ${
                        getTypeKind(c) === 'writing'
                          ? 'typesKindBadgeWriting'
                          : getTypeKind(c) === 'vocabulary'
                            ? 'typesKindBadgeVocab'
                            : c.mcq_category === 'grammar-mcq'
                              ? 'typesKindBadgeVocab'
                            : c.is_descriptive
                              ? 'typesKindBadgeWriting'
                            : ''
                      }`}
                    >
                      {getTypeKind(c) === 'writing'
                        ? '영작'
                        : getTypeKind(c) === 'vocabulary'
                          ? '어휘'
                          : c.mcq_category === 'grammar-mcq'
                            ? '객관식 어법'
                          : c.is_descriptive
                            ? '서술형'
                            : '객관식'}
                    </span>
                    <strong>{c.name}</strong>
                    <span className="typesManageMeta">{c.desc}</span>
                    <code className="typesManageId">{c.id}</code>
                  </div>
                  <div className="typesManageActions">
                    <button type="button" className="btnSm btnPrimary" onClick={() => openEditModal(c)}>
                      수정
                    </button>
                    <button type="button" className="btnSm btnGhost typesManageRemove" onClick={() => removeType(c.id)}>
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="sectionLabel" style={{ marginTop: 36 }}>
            새 유형 추가
          </div>
          <div className="typesFormCard">
            {formError && <p className="persistMsg persistMsgErr" style={{ marginBottom: 14 }}>{formError}</p>}
            {formOk && <p className="persistMsg persistMsgOk" style={{ marginBottom: 14 }}>{formOk}</p>}

            <div className="formField">
              <label htmlFor="add-name">유형 이름</label>
              <input id="add-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 함의 추론" maxLength={80} />
            </div>
            <div className="formField">
              <label htmlFor="add-desc">설명</label>
              <textarea id="add-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="카드에 표시할 설명" maxLength={300} />
            </div>
            <div className="formField">
              <span className="formFieldLabel">유형 구분</span>
              <div className="kindRadios" role="group" aria-label="유형 구분">
                <label>
                  <input
                    type="radio"
                    name="addKind"
                    checked={newKind === 'mcq' && !isDescriptive && newMcqCategory !== 'grammar-mcq'}
                    onChange={() => {
                      setNewKind('mcq');
                      setIsDescriptive(false);
                      setNewMcqCategory(null);
                      if (promptText === DEFAULT_WRITING_PROMPT || promptText === DEFAULT_VOCAB_PROMPT) {
                        setPromptText('');
                      }
                    }}
                  />
                  객관식
                </label>
                <label>
                  <input
                    type="radio"
                    name="addKind"
                    checked={newKind === 'mcq' && !isDescriptive && newMcqCategory === 'grammar-mcq'}
                    onChange={() => {
                      setNewKind('mcq');
                      setIsDescriptive(false);
                      setNewMcqCategory('grammar-mcq');
                    }}
                  />
                  객관식 어법
                </label>
                <label>
                  <input
                    type="radio"
                    name="addKind"
                    checked={newKind === 'writing'}
                    onChange={() => {
                      setNewKind('writing');
                      setIsDescriptive(false);
                      setNewMcqCategory(null);
                      if (!promptText.trim() || promptText === DEFAULT_CUSTOM_PROMPT || promptText === DEFAULT_VOCAB_PROMPT) {
                        setPromptText(DEFAULT_WRITING_PROMPT);
                      }
                    }}
                  />
                  영작
                </label>
                <label>
                  <input
                    type="radio"
                    name="addKind"
                    checked={newKind === 'vocabulary'}
                    onChange={() => {
                      setNewKind('vocabulary');
                      setIsDescriptive(false);
                      setNewMcqCategory(null);
                      if (!promptText.trim() || promptText === DEFAULT_CUSTOM_PROMPT || promptText === DEFAULT_WRITING_PROMPT) {
                        setPromptText(DEFAULT_VOCAB_PROMPT);
                      }
                    }}
                  />
                  어휘
                </label>
                <label>
                  <input
                    type="radio"
                    name="addKind"
                    checked={newKind === 'mcq' && isDescriptive}
                    onChange={() => {
                      setNewKind('mcq');
                      setIsDescriptive(true);
                      setNewMcqCategory(null);
                      if (promptText === DEFAULT_WRITING_PROMPT || promptText === DEFAULT_VOCAB_PROMPT) {
                        setPromptText('');
                      }
                    }}
                  />
                  서술형
                </label>
              </div>
              <p className="formHint">
                영작: {'{passage}'}, {'{answer}'} 필수 · 어휘: {'{passage}'}, {'{vocab}'} 필수(메인에서 5단어가 {'{vocab}'}로 들어갑니다) · 객관식 어법은 메인에서 보기/오답 5칸 UI가 표시됩니다 · 서술형 선택 시 메인 입력값이 {'{answer}'}로 주입됩니다.
              </p>
            </div>
            <div className="formField">
              <label htmlFor="add-prompt">프롬프트</label>
              <textarea
                id="add-prompt"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder={
                  newKind === 'writing'
                    ? '비우면 영작 기본 템플릿. {passage}·{answer} 필수'
                    : newKind === 'vocabulary'
                      ? '비우면 어휘 기본 템플릿. {passage}·{vocab} 필수'
                      : '비우면 기본 템플릿. 반드시 {passage} 포함 (밑줄 의미형: {underlined_sentence}도 사용)'
                }
                style={{ minHeight: 160, fontFamily: 'var(--font-dmono), monospace', fontSize: '0.82rem' }}
              />
            </div>
            <div className="formField">
              <label htmlFor="add-example">예시 문제 이미지</label>
              <input
                id="add-example"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => setExampleFile(e.target.files?.[0] ?? null)}
              />
              <p className="formHint">
                {isDev
                  ? '로컬(npm run dev): 필수. 추가 시 public/custom-type-examples/에 유형 ID 파일명으로 저장됩니다.'
                  : '선택 사항. 선택하면 추가 후 안내에 따라 저장소에 동일 ID 파일명으로 이미지를 넣으면 됩니다.'}
              </p>
            </div>

            <div className="typesFormActions">
              <button type="button" className="btnSm btnPrimary" onClick={addType}>
                유형 추가
              </button>
            </div>
          </div>
        </>
      )}

      <div
        className={`modalOverlay modalZTop ${editId ? 'modalOverlayOpen' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeEditModal();
        }}
        role="presentation"
      >
        {editId && (
          <div className="modal modalWide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
            <h3 id="edit-modal-title">유형 수정</h3>
            <p className="modalIntro">
              유형 ID는 바꿀 수 없습니다. <code>{editId}</code>
            </p>
            {editError && <p className="persistMsg persistMsgErr" style={{ marginBottom: 14 }}>{editError}</p>}
            {editOk && <p className="persistMsg persistMsgOk" style={{ marginBottom: 14 }}>{editOk}</p>}

            <div className="formField">
              <label htmlFor="edit-name">유형 이름</label>
              <input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={80} />
            </div>
            <div className="formField">
              <label htmlFor="edit-desc">설명</label>
              <textarea id="edit-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={300} />
            </div>
            <div className="formField">
              <span className="formFieldLabel">유형 구분</span>
              <div className="kindRadios" role="group" aria-label="유형 구분">
                <label>
                  <input
                    type="radio"
                    name="editKind"
                    checked={editKind === 'mcq' && !editIsDescriptive && editMcqCategory !== 'grammar-mcq'}
                    onChange={() => {
                      setEditKind('mcq');
                      setEditIsDescriptive(false);
                      setEditMcqCategory(null);
                      if (editPrompt === DEFAULT_WRITING_PROMPT || editPrompt === DEFAULT_VOCAB_PROMPT) {
                        setEditPrompt('');
                      }
                    }}
                  />
                  객관식
                </label>
                <label>
                  <input
                    type="radio"
                    name="editKind"
                    checked={editKind === 'mcq' && !editIsDescriptive && editMcqCategory === 'grammar-mcq'}
                    onChange={() => {
                      setEditKind('mcq');
                      setEditIsDescriptive(false);
                      setEditMcqCategory('grammar-mcq');
                    }}
                  />
                  객관식 어법
                </label>
                <label>
                  <input
                    type="radio"
                    name="editKind"
                    checked={editKind === 'writing'}
                    onChange={() => {
                      setEditKind('writing');
                      setEditIsDescriptive(false);
                      setEditMcqCategory(null);
                      if (!editPrompt.trim() || editPrompt === DEFAULT_CUSTOM_PROMPT || editPrompt === DEFAULT_VOCAB_PROMPT) {
                        setEditPrompt(DEFAULT_WRITING_PROMPT);
                      }
                    }}
                  />
                  영작
                </label>
                <label>
                  <input
                    type="radio"
                    name="editKind"
                    checked={editKind === 'vocabulary'}
                    onChange={() => {
                      setEditKind('vocabulary');
                      setEditIsDescriptive(false);
                      setEditMcqCategory(null);
                      if (!editPrompt.trim() || editPrompt === DEFAULT_CUSTOM_PROMPT || editPrompt === DEFAULT_WRITING_PROMPT) {
                        setEditPrompt(DEFAULT_VOCAB_PROMPT);
                      }
                    }}
                  />
                  어휘
                </label>
                <label>
                  <input
                    type="radio"
                    name="editKind"
                    checked={editKind === 'mcq' && editIsDescriptive}
                    onChange={() => {
                      setEditKind('mcq');
                      setEditIsDescriptive(true);
                      setEditMcqCategory(null);
                      if (editPrompt === DEFAULT_WRITING_PROMPT || editPrompt === DEFAULT_VOCAB_PROMPT) {
                        setEditPrompt('');
                      }
                    }}
                  />
                  서술형
                </label>
              </div>
              <p className="formHint">
                영작은 {'{answer}'}, 어휘는 {'{vocab}'} 포함 여부를 확인하세요. 객관식 어법은 메인에서 보기/오답 5칸 UI가 표시됩니다. 서술형 선택 시 메인 입력값이 {'{answer}'}로 주입됩니다.
              </p>
            </div>
            <div className="formField">
              <label htmlFor="edit-prompt">프롬프트</label>
              <textarea
                id="edit-prompt"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                style={{ minHeight: 400, fontFamily: 'var(--font-dmono), monospace', fontSize: '0.82rem' }}
              />
            </div>
            {isDev && (
              <div className="formField">
                <label htmlFor="edit-example">예시 이미지 교체 (선택)</label>
                <input
                  id="edit-example"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => setEditExampleFile(e.target.files?.[0] ?? null)}
                />
                <p className="formHint">파일을 고르면 저장 시 같은 ID로 이미지가 덮어씌워집니다.</p>
              </div>
            )}

            <div className="modalFooter">
              <button type="button" className="btnSm btnGhost" onClick={closeEditModal}>
                닫기
              </button>
              <button type="button" className="btnSm btnPrimary" onClick={saveEdit}>
                저장
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
