import React from 'react';

/**
 * SearchSuggestions — autocomplete dropdown for the global search bar.
 * Renders recent searches (when query is empty) and API suggestions (while typing).
 * Keyboard navigation: ArrowUp/Down highlights rows, Enter selects, Escape closes.
 */
export default function SearchSuggestions({
  show,
  suggestions = [],
  recentSearches = [],
  query = '',
  onSelect,
  onClearRecent,
  highlightedIndex = -1,
}) {
  const showRecent = query.length === 0 && recentSearches.length > 0;
  const hasSuggestions = suggestions.length > 0;

  if (!show || (!showRecent && !hasSuggestions)) return null;

  const recentItems  = showRecent     ? recentSearches : [];
  const suggItems    = hasSuggestions ? suggestions     : [];

  const escapeRe = (s) => s.replace(/[.*+?^()|[\]\\]/g, '\\$&');

  const highlight = (text) => {
    if (!query || query.length < 2) return text;
    try {
      const parts = text.split(new RegExp('(' + escapeRe(query) + ')', 'gi'));
      return parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? React.createElement('strong', { key: i, className: 'text-slate-900 dark:text-white font-semibold' }, part)
          : part
      );
    } catch { return text; }
  };

  return (
    React.createElement('div', {
      className: 'absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[9999] mt-1.5 overflow-hidden'
    },
      showRecent && React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'flex items-center justify-between px-4 pt-3 pb-1.5' },
          React.createElement('span', { className: 'text-[11px] font-semibold text-slate-400 uppercase tracking-wider' }, 'Búsquedas recientes'),
          React.createElement('button', {
            onMouseDown: (e) => { e.preventDefault(); onClearRecent?.(); },
            className: 'text-[11px] text-red-400 hover:text-red-600 font-medium transition-colors'
          }, 'Borrar')
        ),
        recentItems.map((item, i) =>
          React.createElement('button', {
            key: 'r' + i,
            onMouseDown: (e) => { e.preventDefault(); onSelect?.(item); },
            className: 'w-full text-left px-4 py-2.5 flex items-center gap-3 text-[13px] transition-colors ' + (highlightedIndex === i ? 'bg-slate-100 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700/60')
          },
            React.createElement('span', { className: 'text-slate-400 shrink-0 text-base' }, '\u{1F550}'),
            React.createElement('span', { className: 'text-slate-700 dark:text-slate-200 truncate' }, item)
          )
        )
      ),
      showRecent && hasSuggestions && React.createElement('div', { className: 'border-t border-slate-100 dark:border-slate-700 mx-3 my-1' }),
      hasSuggestions && React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'px-4 pt-3 pb-1.5' },
          React.createElement('span', { className: 'text-[11px] font-semibold text-slate-400 uppercase tracking-wider' }, 'Sugerencias')
        ),
        suggItems.map((item, i) => {
          const flatIdx = recentItems.length + i;
          const isFuzzy = query.length > 0 && !item.toLowerCase().includes(query.toLowerCase());
          return React.createElement('button', {
            key: 's' + i,
            onMouseDown: (e) => { e.preventDefault(); onSelect?.(item); },
            className: 'w-full text-left px-4 py-2.5 flex items-center gap-3 text-[13px] transition-colors ' + (highlightedIndex === flatIdx ? 'bg-[#84CC16]/10 dark:bg-[#84CC16]/20' : 'hover:bg-[#84CC16]/5 dark:hover:bg-[#84CC16]/10')
          },
            React.createElement('svg', { className: 'w-3.5 h-3.5 text-[#84CC16] shrink-0', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2.5 },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z' })
            ),
            isFuzzy
              ? React.createElement('span', { className: 'truncate' },
                  React.createElement('span', { className: 'text-slate-400 italic' }, 'Quizás: '),
                  React.createElement('span', { className: 'text-slate-500 dark:text-slate-400 italic' }, item)
                )
              : React.createElement('span', { className: 'text-slate-700 dark:text-slate-200 truncate' }, highlight(item))
          );
        })
      ),
      React.createElement('div', { className: 'h-1' })
    )
  );
}
