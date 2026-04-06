'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';

const CONFIRM_PHRASE = '탈퇴';

export default function MypageDeleteAccount() {
  const router = useRouter();
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const canSubmit = phrase.trim() === CONFIRM_PHRASE;

  const onDelete = useCallback(async () => {
    if (!canSubmit || busy) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/me/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error?.message === 'string' ? data.error.message : '처리에 실패했습니다.');
        return;
      }

      if (isSupabaseConfigured()) {
        try {
          const supabase = createSupabaseBrowserClient();
          await supabase.auth.signOut();
        } catch {
          /* 세션 정리 실패해도 이동 */
        }
      }
      router.refresh();
      window.location.assign('/');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '네트워크 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }, [canSubmit, busy, router]);

  return (
    <div className="mypageDeleteZone">
      <p className="mypageDeleteHint">
        탈퇴 시 프로필·캐쉬·결제·생성 이력 등 계정 관련 데이터가 삭제되며 복구할 수 없습니다.
      </p>
      <label className="mypageDeleteLabel" htmlFor="mypage-delete-confirm">
        확인을 위해 아래 입력란에 <strong>{CONFIRM_PHRASE}</strong>라고 입력하세요.
      </label>
      <input
        id="mypage-delete-confirm"
        type="text"
        className="mypageDeleteInput"
        autoComplete="off"
        placeholder={CONFIRM_PHRASE}
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        disabled={busy}
      />
      {err && <p className="mypageDeleteErr">{err}</p>}
      <button
        type="button"
        className="btnSm mypageDeleteBtn"
        disabled={!canSubmit || busy}
        onClick={() => void onDelete()}
      >
        {busy ? '처리 중…' : '회원 탈퇴'}
      </button>
    </div>
  );
}
