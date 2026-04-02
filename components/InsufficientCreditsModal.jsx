'use client';

import Link from 'next/link';

export default function InsufficientCreditsModal({ open, onClose, message }) {
  if (!open) return null;

  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credits-modal-title"
      onClick={onClose}
    >
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        <h2 id="credits-modal-title" className="modalTitle">
          크레딧이 부족합니다
        </h2>
        <p className="modalBody">{message || '생성에 필요한 크레딧이 부족합니다.'}</p>
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
