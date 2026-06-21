/**
 * Resolve a possibly-multilingual field to a plain display string.
 *
 * Some ad fields (e.g. title) are stored as a multilingual object or a
 * JSON-encoded string like {"es":"...","en":"..."}. Rendering that raw shows
 * `{"es":"..."}` in card titles and image alt text, which hurts UX, SEO and
 * accessibility. This helper returns the value for the requested language with
 * sensible fallbacks, and passes plain strings through unchanged.
 *
 * @param {string|object|null} value - Raw field value (string, JSON string, or object)
 * @param {string} lang - Preferred language code (e.g. 'es', 'en')
 * @returns {string} Display string
 */
export const localizedText = (value, lang = 'es') => {
  if (value == null) return '';

  // Already a plain object map of locales.
  if (typeof value === 'object' && !Array.isArray(value)) {
    return pickLocale(value, lang);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    // Only attempt JSON parsing when it looks like a locale object.
    if (trimmed.startsWith('{') && trimmed.includes('"')) {
      try {
        const obj = JSON.parse(trimmed);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          return pickLocale(obj, lang);
        }
      } catch (e) {
        // not JSON — fall through and return the original string
      }
    }
    return value;
  }

  return String(value);
};

const pickLocale = (obj, lang) => {
  const direct = obj[lang];
  if (typeof direct === 'string' && direct.trim()) return direct;
  if (typeof obj.es === 'string' && obj.es.trim()) return obj.es;
  if (typeof obj.en === 'string' && obj.en.trim()) return obj.en;
  const first = Object.values(obj).find(v => typeof v === 'string' && v.trim());
  return first || '';
};
