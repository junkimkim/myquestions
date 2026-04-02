'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import QuizForgeNav from '@/components/QuizForgeNav';
import { toErrorMessage } from '@/lib/toErrorMessage';
import { DEFAULT_GPT_MODEL } from '@/lib/openaiModels';

const API_KEY_STORAGE = 'qforge_prompt_openai_key';

export default function PromptAssistantPage() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_GPT_MODEL);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem(API_KEY_STORAGE);
      if (s) setApiKey(s);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const persistKey = useCallback((k) => {
    try {
      if (k.trim()) localStorage.setItem(API_KEY_STORAGE, k);
      else localStorage.removeItem(API_KEY_STORAGE);
    } catch {
      /* ignore */
    }
  }, []);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || loading) return;
    const key = apiKey.trim();
    if (!key.startsWith('sk-')) {
      setError('OpenAI API 키를 입력하세요. (sk-로 시작)');
      return;
    }

    setError(null);
    const nextUser = { role: 'user', content: text };
    const historyForApi = [...messages, nextUser];
    setMessages(historyForApi);
    setDraft('');
    setLoading(true);

    try {
      const res = await fetch('/api/prompt-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: key,
          model,
          messages: historyForApi,
          max_tokens: 2800,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        let msg = '요청에 실패했습니다.';
        if (data.error) {
          if (typeof data.error === 'string') msg = data.error;
          else if (typeof data.error?.message === 'string') msg = data.error.message;
        } else if (typeof data.message === 'string') msg = data.message;
        throw new Error(msg);
      }
      const out = data.choices?.[0]?.message?.content;
      if (out == null) throw new Error('응답 형식이 올바르지 않습니다.');
      setMessages((prev) => [...prev, { role: 'assistant', content: out }]);
    } catch (e) {
      setError(toErrorMessage(e));
      setMessages((prev) => prev.slice(0, -1));
      setDraft(text);
    } finally {
      setLoading(false);
    }
  }, [apiKey, draft, loading, messages, model]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <div className="container">
      <QuizForgeNav />
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">Prompt helper</span>
        </div>
        <p className="subtitle">문제 작성용 프롬프트를 대화로 설계·다듬습니다. 완성된 초안은 문제 유형 설정에 붙여넣을 수 있습니다.</p>
      </header>

      <div className="sectionLabel">OpenAI API</div>
      <div className="apiRow promptApiRow">
        <div className="promptApiFields">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onBlur={() => persistKey(apiKey)}
            placeholder="sk-..."
            autoComplete="off"
            className="promptApiKeyInput"
          />
          <select className="modelSelect promptModelSelect" value={model} onChange={(e) => setModel(e.target.value)}>
            <optgroup label="GPT-5">
              <option value="gpt-5.4-mini">gpt-5.4-mini (기본)</option>
              <option value="gpt-5.1">gpt-5.1</option>
              <option value="gpt-5">gpt-5</option>
              <option value="gpt-5-mini">gpt-5-mini</option>
              <option value="gpt-5-nano">gpt-5-nano</option>
            </optgroup>
            <optgroup label="GPT-4 / 이전">
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
            </optgroup>
          </select>
        </div>
        <p className="promptApiNote">키는 서버로 전달되어 OpenAI에만 사용되며 저장되지 않습니다. 브라우저에는 선택 시 로컬에만 보관됩니다.</p>
      </div>

      <div className="sectionLabel">대화</div>
      <div className="promptChatShell">
        <div className="promptChatLog" role="log" aria-live="polite" aria-relevant="additions">
          {messages.length === 0 && !loading && (
            <p className="promptChatEmpty">
              예: 「빈칸 어법 문제 프롬프트를 지문만 넣는 자리로 짜고 5지선다로 만들어줘」처럼 요청해 보세요.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`promptChatMsg promptChatMsg--${m.role}`}>
              <span className="promptChatRole">{m.role === 'user' ? '나' : '도우미'}</span>
              <div className="promptChatBody">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="promptChatMsg promptChatMsg--assistant promptChatMsgPending">
              <span className="promptChatRole">도우미</span>
              <div className="promptChatBody">
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                응답 작성 중…
              </div>
            </div>
          )}
          <div ref={logEndRef} />
        </div>
        {error && (
          <div className="promptChatError" role="alert">
            {error}
          </div>
        )}
        <div className="promptChatComposer">
          <textarea
            className="promptChatTextarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="메시지 입력… (Enter 전송, Shift+Enter 줄바꿈)"
            rows={3}
            disabled={loading}
          />
          <div className="promptChatActions">
            <button type="button" className="btnSm btnGhost" onClick={clearChat} disabled={loading || messages.length === 0}>
              대화 비우기
            </button>
            <button type="button" className="btnSm btnPrimary" onClick={send} disabled={loading || !draft.trim()}>
              보내기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
