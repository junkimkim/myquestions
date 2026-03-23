'use client';

import { useCallback, useState } from 'react';
import { DEFAULT_CUSTOM_PROMPT, DEFAULT_WRITING_PROMPT, getTypeKind } from '@/lib/defaultPrompts';
import QuizForgeNav from '@/components/QuizForgeNav';
import { useCustomTypesData } from '@/hooks/useCustomTypesData';

export default function TypesManagePage() {
  const { customTypes, setCustomTypes, prompts, setPrompts, ready } = useCustomTypesData();
  const isDev = process.env.NODE_ENV === 'development';

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [newKind, setNewKind] = useState('mcq');
  const [promptText, setPromptText] = useState('');
  const [exampleFile, setExampleFile] = useState(null);
  const [formError, setFormError] = useState('');
  const [formOk, setFormOk] = useState('');

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editKind, setEditKind] = useState('mcq');
  const [editPrompt, setEditPrompt] = useState('');
  const [editExampleFile, setEditExampleFile] = useState(null);
  const [editError, setEditError] = useState('');
  const [editOk, setEditOk] = useState('');

  const resetForm = useCallback(() => {
    setName('');
    setDesc('');
    setNewKind('mcq');
    setPromptText('');
    setExampleFile(null);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditId(null);
    setEditName('');
    setEditDesc('');
    setEditKind('mcq');
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
      setEditPrompt(prompts[c.id] ?? (getTypeKind(c) === 'writing' ? DEFAULT_WRITING_PROMPT : DEFAULT_CUSTOM_PROMPT));
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
      editPrompt.trim() || (editKind === 'writing' ? DEFAULT_WRITING_PROMPT : DEFAULT_CUSTOM_PROMPT);
    if (!prompt.includes('{passage}')) {
      setEditError('프롬프트에 {passage}를 포함해야 합니다.');
      return;
    }
    if (editKind === 'writing' && !prompt.includes('{answer}')) {
      setEditError('영작 유형은 프롬프트에 {answer}를 포함해야 합니다.');
      return;
    }

    const storedKind = editKind === 'writing' ? 'writing' : 'mcq';
    setCustomTypes((prev) =>
      prev.map((t) =>
        t.id === editId ? { ...t, name: n, desc: editDesc.trim() || '사용자 정의 유형', kind: storedKind } : t,
      ),
    );
    setPrompts((prev) => ({ ...prev, [editId]: prompt }));

    if (isDev && editExampleFile) {
      const fd = new FormData();
      fd.append('typeId', editId);
      fd.append('file', editExampleFile);
      const res = await fetch('/api/custom-type-example', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.error || '이미지 저장에 실패했습니다. 이름·설명·프롬프트는 반영되었습니다.');
        return;
      }
      setEditOk(`저장했습니다. 예시 이미지: ${data.path || ''}`);
      setEditExampleFile(null);
      return;
    }

    setEditOk('저장했습니다.');
    setTimeout(() => closeEditModal(), 600);
  }, [editId, editName, editDesc, editKind, editPrompt, editExampleFile, isDev, setCustomTypes, setPrompts, closeEditModal]);

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
      promptText.trim() || (newKind === 'writing' ? DEFAULT_WRITING_PROMPT : DEFAULT_CUSTOM_PROMPT);
    if (!prompt.includes('{passage}')) {
      setFormError('프롬프트에 {passage}를 포함해야 합니다.');
      return;
    }
    if (newKind === 'writing' && !prompt.includes('{answer}')) {
      setFormError('영작 유형은 프롬프트에 {answer}를 포함해야 합니다.');
      return;
    }

    const id = `c_${crypto.randomUUID().replace(/-/g, '')}`;
    const storedKind = newKind === 'writing' ? 'writing' : 'mcq';

    setCustomTypes((prev) => [...prev, { id, name: n, desc: desc.trim() || '사용자 정의 유형', kind: storedKind }]);
    setPrompts((prev) => ({ ...prev, [id]: prompt }));

    if (isDev && exampleFile) {
      const fd = new FormData();
      fd.append('typeId', id);
      fd.append('file', exampleFile);
      const res = await fetch('/api/custom-type-example', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || '이미지 저장에 실패했습니다. 유형 데이터는 추가되었습니다.');
        resetForm();
        return;
      }
      setFormOk(`유형을 추가하고 예시 이미지를 저장했습니다. (${data.path || ''})`);
    } else if (!isDev && exampleFile) {
      setFormOk(
        `유형을 추가했습니다. 유형 ID: ${id} — 선택한 이미지를 저장소에 public/custom-type-examples/${id}.png (또는 jpg/webp/gif)로 복사한 뒤 커밋·배포하세요.`,
      );
    } else {
      setFormOk(
        `유형을 추가했습니다. 유형 ID: ${id} — 예시 이미지는 public/custom-type-examples/${id}.png 등 파일명으로 프로젝트에 넣을 수 있습니다.`,
      );
    }

    resetForm();
  }, [name, desc, newKind, promptText, exampleFile, isDev, setCustomTypes, setPrompts, resetForm]);

  const removeType = useCallback(
    async (id) => {
      if (!window.confirm('이 유형과 프롬프트를 삭제할까요?')) return;
      setCustomTypes((prev) => prev.filter((c) => c.id !== id));
      setPrompts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (editId === id) closeEditModal();
      if (isDev) {
        await fetch(`/api/custom-type-example?typeId=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
      }
    },
    [isDev, setCustomTypes, setPrompts, editId, closeEditModal],
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
          <div className="sectionLabel">등록된 유형 ({customTypes.length})</div>
          {customTypes.length === 0 ? (
            <p className="typesEmptyHint">아래 폼에서 첫 유형을 추가하세요.</p>
          ) : (
            <ul className="typesManageList">
              {customTypes.map((c) => (
                <li key={c.id} className="typesManageItem">
                  <div className="typesManageInfo">
                    <span
                      className={`typesKindBadge ${getTypeKind(c) === 'writing' ? 'typesKindBadgeWriting' : ''}`}
                    >
                      {getTypeKind(c) === 'writing' ? '영작' : '객관식'}
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
                    checked={newKind === 'mcq'}
                    onChange={() => {
                      setNewKind('mcq');
                      if (promptText === DEFAULT_WRITING_PROMPT) setPromptText('');
                    }}
                  />
                  객관식
                </label>
                <label>
                  <input
                    type="radio"
                    name="addKind"
                    checked={newKind === 'writing'}
                    onChange={() => {
                      setNewKind('writing');
                      if (!promptText.trim() || promptText === DEFAULT_CUSTOM_PROMPT) {
                        setPromptText(DEFAULT_WRITING_PROMPT);
                      }
                    }}
                  />
                  영작
                </label>
              </div>
              <p className="formHint">영작은 프롬프트에 {'{passage}'}와 메인 화면 정답이 들어갈 {'{answer}'}를 모두 넣어야 합니다.</p>
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
                    : '비우면 기본 템플릿. 반드시 {passage} 포함'
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
                    checked={editKind === 'mcq'}
                    onChange={() => {
                      setEditKind('mcq');
                      if (editPrompt === DEFAULT_WRITING_PROMPT) setEditPrompt('');
                    }}
                  />
                  객관식
                </label>
                <label>
                  <input
                    type="radio"
                    name="editKind"
                    checked={editKind === 'writing'}
                    onChange={() => {
                      setEditKind('writing');
                      if (!editPrompt.trim() || editPrompt === DEFAULT_CUSTOM_PROMPT) {
                        setEditPrompt(DEFAULT_WRITING_PROMPT);
                      }
                    }}
                  />
                  영작
                </label>
              </div>
              <p className="formHint">영작으로 바꾸면 프롬프트에 {'{answer}'}가 있는지 확인하세요.</p>
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
