'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * 모달 포커스 트랩 훅.
 * - enabled=true 시 containerRef 내부로 포커스를 가두고, Tab 키 순환을 처리합니다.
 * - Escape 키 입력 시 onEscape 콜백을 호출합니다.
 * - 비활성화(cleanup) 시 트랩 이전에 포커스가 있던 요소로 복귀합니다.
 *
 * @param {React.RefObject} containerRef  - 포커스를 가둘 컨테이너 ref
 * @param {{ enabled?: boolean, onEscape?: () => void }} options
 */
export function useFocusTrap(containerRef, { enabled = true, onEscape } = {}) {
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    previousFocus.current = document.activeElement;

    const getFocusable = () => Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS));

    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      container.setAttribute('tabindex', '-1');
      container.focus();
    }

    function handleKeyDown(e) {
      if (!containerRef.current) return;

      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus.current?.focus?.();
    };
  }, [enabled, containerRef, onEscape]);
}
