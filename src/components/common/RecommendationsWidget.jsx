import React, { useState, useEffect, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';

const RecommendationsWidget = memo(({ 
  userId, 
  excludeAdId = null, 
  limit = 12,
  onAdClick 
}) => {
  const { t } = useTranslation();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchRecommendations();
  }, [userId, excludeAdId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
      });

      if (excludeAdId) {
        params.append('exclude_ad_id', excludeAdId);
      }

      const endpoint = userId 
        ? `/api/recommendations?${params}`
        : `/api/recommendations/trending?${params}`;

      const response = await fetch(endpoint, {
        headers: {
          'Accept': 'application/json',
          ...(userId && { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.data || []);
    } catch (err) {
      console.error('Recommendations error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 320; // Width of one card + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleAdClick = (ad) => {
    // Track view
    if (userId) {
      fetch(`/api/ads/${ad.id}/view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Accept': 'application/json',
        },
      }).catch(console.error);
    }

    if (onAdClick) {
      onAdClick(ad);
    }
  };

  const formatPrice = (price, currency = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {userId ? '🎯 Para ti' : '🔥 Trending'}
          </h2>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72">
              <div className="bg-gray-200 dark:bg-slate-700 rounded-xl h-48 animate-pulse" />
              <div className="mt-3 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return null; // Don't show widget if no recommendations
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {userId ? '🎯 Para ti' : '🔥 Trending'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {userId 
              ? 'Recomendaciones personalizadas basadas en tus intereses'
              : 'Los anuncios más populares en tu zona'}
          </p>
        </div>
        
        {/* Navigation arrows */}
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            aria-label="Scroll left"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            aria-label="Scroll right"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Recommendations carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {recommendations.map((ad) => (
          <div
            key={ad.id}
            onClick={() => handleAdClick(ad)}
            className="flex-shrink-0 w-72 bg-white dark:bg-slate-700 rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer group overflow-hidden"
          >
            {/* Image */}
            <div className="relative h-48 bg-gray-200 dark:bg-slate-600 overflow-hidden">
              {ad.images && ad.images.length > 0 ? (
                <img
                  src={ad.images[0]}
                  alt={ad.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Reason badge */}
              {ad.reason_label && (
                <div className="absolute top-2 left-2 px-3 py-1 bg-lime-500 text-slate-950 text-xs font-semibold rounded-full shadow-lg">
                  {ad.reason_label}
                </div>
              )}

              {/* Views badge */}
              {ad.views > 0 && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded-full flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  {ad.views}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors">
                {ad.title}
              </h3>
              
              <div className="flex items-center justify-between">
                <p className="text-xl font-bold text-lime-600 dark:text-lime-400">
                  {formatPrice(ad.price, ad.currency)}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{ad.city}, {ad.state}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hide scrollbar CSS */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
});

RecommendationsWidget.displayName = 'RecommendationsWidget';

export default RecommendationsWidget;
