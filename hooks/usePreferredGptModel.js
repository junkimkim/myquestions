'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_GPT_MODEL, isAllowedGptModelId } from '@/lib/openaiModels';

/**
 * 프로필에 저장된 선호 GPT 모델 (로그인 없으면 기본값).
 * 로딩 후 서버 값으로 동기화됩니다.
 */
export function usePreferredGptModel() {
  const [preferredGptModel, setPreferredGptModel] = useState(DEFAULT_GPT_MODEL);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me/preferences', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && typeof data.preferredGptModel === 'string' && isAllowedGptModelId(data.preferredGptModel)) {
          setPreferredGptModel(data.preferredGptModel);
        }
      } catch {
        /* keep default */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { preferredGptModel, preferencesReady: ready };
}
