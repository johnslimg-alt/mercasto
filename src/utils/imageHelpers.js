/**
 * Image URL helpers — centralized utilities for resolving image paths
 * from the backend storage or external URLs.
 *
 * Extracted from App.jsx to be reusable across components.
 */

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'https://mercasto.com/storage';

/**
 * Resolve a single image path to a full URL.
 * Handles: null/undefined, arrays, JSON-encoded arrays, external URLs, data URIs, relative paths.
 *
 * @param {string|string[]|null} path - Image path from the API
 * @param {string|null} fallback - Fallback URL if path cannot be resolved
 * @returns {string} Resolved image URL
 */
export const getImageUrl = (path, fallback = null) => {
  const safeExternalImage = (url) => url;

  if (!path) return fallback || '/placeholder-ad.svg';

  if (Array.isArray(path)) {
    if (path.length > 0) {
      const first = path[0];
      if (first && (first.startsWith('http') || first.startsWith('data:'))) return safeExternalImage(first);
      return `${STORAGE_URL}/${first}`;
    }
    return fallback || '/placeholder-ad.svg';
  }

  if (typeof path === 'string') {
    if (path.startsWith('http') || path.startsWith('data:')) return safeExternalImage(path);
    if (path.startsWith('[')) {
      try {
        const arr = JSON.parse(path);
        if (arr && arr.length > 0) {
          const first = arr[0];
          if (first.startsWith('http') || first.startsWith('data:')) return safeExternalImage(first);
          return `${STORAGE_URL}/${first}`;
        }
      } catch (e) {}
    }
    return `${STORAGE_URL}/${path}`;
  }

  return fallback || '/placeholder-ad.svg';
};

/**
 * Downsize images for list/card thumbnails so they don't ship full-resolution
 * files:
 *   - Unsplash / Picsum  -> their native on-the-fly resize params;
 *   - storage uploads     -> our /api/img WebP thumbnail endpoint;
 *   - unknown hosts       -> returned unchanged.
 *
 * @param {string} url - Resolved image URL
 * @param {number} width - Target display width (CSS px); served at ~2x for retina
 * @returns {string} Possibly-resized URL
 */
export const sizedImage = (url, width = 480) => {
  if (!url || typeof url !== 'string') return url;
  const w = Math.max(120, Math.round(width));
  try {
    if (url.includes('images.unsplash.com')) {
      const u = new URL(url);
      u.searchParams.set('w', String(w));
      u.searchParams.set('q', '60');
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', 'crop');
      return u.toString();
    }
    if (url.includes('picsum.photos')) {
      const h = Math.round(w * 0.75);
      return url.replace(/\/(\d+)\/(\d+)(?=($|\?))/, `/${w}/${h}`);
    }
    // Storage-hosted uploads -> serve a width-constrained WebP via /api/img.
    // Only route real image files (jpg/png/webp); leave SVGs/placeholders alone.
    const storageMatch = url.match(/\/storage\/(.+\.(?:jpe?g|png|webp))(?:\?.*)?$/i);
    if (storageMatch) {
      const apiBase = (typeof window !== 'undefined' && window.__API_URL__) || '/api';
      return `${apiBase}/img?path=${encodeURIComponent(storageMatch[1])}&w=${w}`;
    }
  } catch (e) {}
  return url;
};

/**
 * Resolve multiple image paths to an array of full URLs.
 *
 * @param {string|string[]} pathStr - Image path(s) from the API
 * @param {string[]} fallbackArr - Fallback array if pathStr is empty
 * @returns {string[]} Array of resolved image URLs
 */
export const getImageUrls = (pathStr, fallbackArr = []) => {
  if (!pathStr) return fallbackArr;
  if (Array.isArray(pathStr)) {
    return pathStr.map(p => getImageUrl(p));
  }
  try {
    const arr = JSON.parse(pathStr);
    if (Array.isArray(arr)) {
      return arr.map(p => getImageUrl(p));
    }
  } catch (e) {}
  const single = getImageUrl(pathStr);
  return [single];
};

/**
 * Convert a full URL back to a relative storage path.
 *
 * @param {string|null} url - Full URL
 * @returns {string|null} Relative path or null
 */
export const getRelativePath = (url) => {
  if (!url) return null;
  if (url.startsWith(STORAGE_URL)) return url.replace(`${STORAGE_URL}/`, '');
  return url;
};
