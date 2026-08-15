import React, { useEffect, useRef, useCallback } from 'react';

/**
 * BottomSheet — Premium mobile bottom sheet component
 *
 * Props:
 *   isOpen      {boolean}   — controls visibility
 *   onClose     {function}  — called when closed
 *   title       {string}    — optional header title
 *   children    {node}      — sheet content
 *   maxHeight   {string}    — CSS max-height value, default '85vh'
 *   zIndex      {number}    — z-index base, default 9999
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '85vh',
  zIndex = 9999,
  closeLabel = 'Close',
}) {
  const sheetRef = useRef(null);
  const closeButtonRef = useRef(null);
  const openerRef = useRef(null);
  const wasOpenRef = useRef(false);
  const titleId = React.useId();
  const startY = useRef(null);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const focusableSelector = 'button:not([disabled]):not([tabindex="-1"]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      const active = document.activeElement;
      openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
      const frame = window.requestAnimationFrame(() => {
        const first = closeButtonRef.current || sheetRef.current?.querySelector(focusableSelector);
        first?.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }
    if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      const opener = openerRef.current;
      openerRef.current = null;
      const frame = window.requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [isOpen]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose?.();
      return;
    }
    if (event.key !== 'Tab') return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    const focusables = Array.from(sheet.querySelectorAll(focusableSelector))
      .filter(element => element.getClientRects().length > 0);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !sheet.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !sheet.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }, [onClose]);

  // Drag-to-dismiss: if dragged down > 100px, close
  const handleTouchStart = useCallback((e) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current || startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    currentY.current = dy;
    if (dy > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    if (currentY.current > 100) {
      onClose?.();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    startY.current = null;
    currentY.current = 0;
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-end"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        data-testid="bottom-sheet-backdrop"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label={closeLabel}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-slideUp"
        style={{ maxHeight, transition: 'transform 0.2s ease' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-slate-800">
            <h3 id={titleId} className="font-bold text-slate-900 dark:text-white text-base">
              {title}
            </h3>
            <button
              ref={closeButtonRef}
              type="button"
              data-testid="bottom-sheet-close"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              aria-label={closeLabel}
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: title ? `calc(${maxHeight} - 100px)` : `calc(${maxHeight} - 48px)` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
