const KEY = 'mercasto_recently_viewed';
const MAX = 8;

export function addRecentlyViewed(ad) {
  if (!ad || !ad.id) return;
  const { id, title, price, image_url, image, city, state, location } = ad;
  const thumbnail = (() => {
    try {
      const urls = typeof image_url === 'string' && image_url.startsWith('[')
        ? JSON.parse(image_url)
        : image_url ? [image_url] : image ? [image] : [];
      return urls[0] || null;
    } catch { return image_url || image || null; }
  })();
  const minimal = { id, title, price, thumbnail, city: city || null, state: state || null, location: location || null };
  let list = getRecentlyViewed();
  list = [minimal, ...list.filter(a => a.id !== id)].slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export function getRecentlyViewed() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function clearRecentlyViewed() {
  try { localStorage.removeItem(KEY); } catch {}
}
