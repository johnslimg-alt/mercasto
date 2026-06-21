import { useState, useEffect, useCallback, memo } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

// Кэширование запросов (чтобы не запрашивать баннеры повторно при навигации)
const bannerCache = new Map();
const CACHE_TTL = 60000; // 1 минута

function getCacheKey(placement, category, state) {
  return `${placement}|${category || ''}|${state || ''}`;
}

function AdBannerDisplay({ 
  placement, 
  category = null, 
  state = null, 
  className = '',
  style = {},
  showLabel = false, // Показывать метку "Publicidad"
}) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchBanners = useCallback(async () => {
    const cacheKey = getCacheKey(placement, category, state);
    const cached = bannerCache.get(cacheKey);

    // Проверяем кэш
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setBanners(cached.data);
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ placement });
      if (category) params.append('category', category);
      if (state) params.append('state', state);

      const response = await fetch(`${API_URL}/banners?${params}`);
      
      if (!response.ok) {
        setBanners([]);
        setLoading(false);
        return;
      }

      const data = await response.json();
      const bannerList = data.banners || [];

      // Сохраняем в кэш
      bannerCache.set(cacheKey, {
        data: bannerList,
        timestamp: Date.now(),
      });

      setBanners(bannerList);
    } catch (error) {
      console.warn('Failed to fetch banners:', error);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, [placement, category, state]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // Автопрокрутка баннеров (если их несколько)
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // Переключение каждые 5 секунд

    return () => clearInterval(interval);
  }, [banners.length]);

  const handleBannerClick = async (banner) => {
    // Трекинг клика
    try {
      await fetch(`${API_URL}/banners/${banner.id}/click`, { method: 'POST' });
    } catch (error) {
      console.warn('Failed to track banner click:', error);
    }

    // Переход по ссылке
    if (banner.link_url) {
      window.open(banner.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Не показываем ничего если нет баннеров или идёт загрузка
  if (loading || banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className={`relative ${className}`} style={style}>
      {/* Метка "Publicidad" (реклама) */}
      {showLabel && (
        <div className="absolute top-1 right-1 z-10 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded">
          Publicidad
        </div>
      )}

      {/* Баннер */}
      <div
        onClick={() => handleBannerClick(currentBanner)}
        className="cursor-pointer overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow"
      >
        <img
          src={currentBanner.image_url}
          alt={currentBanner.alt_text || currentBanner.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Индикаторы (если несколько баннеров) */}
      {banners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
              aria-label={`Banner ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(AdBannerDisplay);
