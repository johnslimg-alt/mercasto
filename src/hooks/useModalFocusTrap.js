import { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled]):not([tabindex="-1"])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export default function useModalFocusTrap({ isOpen, onClose, returnFocusRef = null }) {
  const dialogRef = useRef(null);
  const initialFocusRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const explicitReturnTarget = returnFocusRef?.current;
    const active = document.activeElement;
    openerRef.current = explicitReturnTarget instanceof HTMLElement
      ? explicitReturnTarget
      : active instanceof HTMLElement && active !== document.body
        ? active
        : null;
    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      const target = initialFocusRef.current || dialog?.querySelector(FOCUSABLE_SELECTOR);
      target?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      const opener = openerRef.current;
      openerRef.current = null;
      window.requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus();
      });
    };
  }, [isOpen]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose?.();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusables = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter(element => element.getClientRects().length > 0);
    if (!focusables.length) {
      event.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }, [onClose]);

  return { dialogRef, initialFocusRef, handleKeyDown };
}
