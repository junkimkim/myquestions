'use client';

import Link from 'next/link';
import { toErrorMessage } from '@/lib/toErrorMessage';

function modalMessageText(message) {
  if (message == null || message === '') return null;
  if (typeof message === 'string') return message;
  return toErrorMessage(message);
}

export default function InsufficientCreditsModal({ open, onClose, message }) {
  if (!open) return null;

  const body = modalMessageText(message) ?? '생성에 필요한 캐쉬가 부족합니다.';

  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cash-modal-title"
      onClick={onClose}
    >
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        <h2 id="cash-modal-title" className="modalTitle">
          캐쉬가 부족합니다
        </h2>
        <p className="modalBody">{body}</p>
        <div className="modalActions">
          <Link href="/pricing" className="btnPrimary modalBtn" onClick={onClose}>
            충전·요금 안내
          </Link>
          <button type="button" className="btnGhost modalBtn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
