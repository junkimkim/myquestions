'use client';

import { useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

/**
 * 인라인 모달의 내용을 감싸 포커스를 가두는 래퍼 컴포넌트.
 * 마운트 시 트랩 활성화, 언마운트 시 이전 포커스로 복귀.
 *
 * @param {{ children: React.ReactNode, onEscape?: () => void }} props
 */
export default function FocusTrap({ children, onEscape }) {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, { enabled: true, onEscape });
  return <div ref={containerRef}>{children}</div>;
}
