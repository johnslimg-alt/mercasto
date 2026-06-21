import React from 'react';

/**
 * Универсальный спиннер для Mercasto
 * @param {string} size - размер: 'sm', 'md', 'lg', 'xl'
 * @param {string} color - цвет: 'primary', 'white', 'muted'
 * @param {string} text - опциональный текст под спиннером
 * @param {boolean} overlay - показывать с затемнённым фоном
 * @param {string} className - дополнительные классы
 */
export default function Spinner({ 
  size = 'md', 
  color = 'primary', 
  text = null,
  overlay = false,
  className = ''
}) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colors = {
    primary: 'text-[#84CC16]',
    white: 'text-white',
    muted: 'text-slate-400 dark:text-slate-500'
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <svg
        className={`animate-spin ${sizes[size]} ${colors[color]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {text && (
        <p className={`text-sm font-medium ${color === 'white' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
}

// Inline версия для кнопок
export function SpinnerInline({ size = 'sm', color = 'primary' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const colors = {
    primary: 'text-[#84CC16]',
    white: 'text-white',
    muted: 'text-slate-400'
  };

  return (
    <svg
      className={`animate-spin ${sizes[size]} ${colors[color]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
