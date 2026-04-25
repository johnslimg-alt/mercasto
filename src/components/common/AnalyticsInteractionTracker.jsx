import { useEffect } from 'react';
import { trackEvent } from '../../lib/analytics';

const CATEGORY_LABELS = new Map([
  ['motor', 'motor'],
  ['autos', 'motor'],
  ['automotriz', 'motor'],
  ['inmuebles', 'inmobiliaria'],
  ['inmobiliaria', 'inmobiliaria'],
  ['servicios', 'servicios'],
  ['empleo', 'empleo'],
  ['informática', 'informatica'],
  ['telefonía', 'telefonia'],
  ['hogar', 'hogar'],
  ['moda', 'moda'],
  ['bebés', 'bebes'],
  ['mascotas', 'mascotas'],
  ['ocio', 'ocio'],
  ['boletos', 'boletos'],
]);

function normalizeText(value = '') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function findClickableText(target) {
  const clickable = target?.closest?.('button, a, [role="button"]');
  if (!clickable) return '';
  return normalizeText(clickable.textContent || clickable.getAttribute('aria-label') || '');
}

function looksLikeSearchInput(target) {
  if (!target || !['INPUT', 'TEXTAREA'].includes(target.tagName)) return false;

  const haystack = normalizeText([
    target.type,
    target.name,
    target.id,
    target.placeholder,
    target.getAttribute('aria-label'),
  ].filter(Boolean).join(' '));

  return haystack.includes('search') || haystack.includes('buscar');
}

export default function AnalyticsInteractionTracker() {
  useEffect(() => {
    const onClick = (event) => {
      const text = findClickableText(event.target);
      if (!text) return;

      for (const [label, category] of CATEGORY_LABELS.entries()) {
        if (text === label || text.includes(label)) {
          trackEvent('category_selected', {
            category,
            source: 'click',
          });
          return;
        }
      }

      if (text.includes('buscar') || text.includes('search')) {
        trackEvent('search_submitted', {
          source: 'click',
        });
      }
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Enter') return;
      if (!looksLikeSearchInput(event.target)) return;

      trackEvent('search_submitted', {
        source: 'keyboard',
      });
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, []);

  return null;
}
