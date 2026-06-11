import React, { memo, useCallback } from 'react';
import { Heart, Star } from 'lucide-react';

const AdRatingStars = memo(({ ad, compact = false }) => {
  const rawRating = Number(ad.rating_average ?? ad.average_rating ?? ad.rating ?? 0);
  const rating = rawRating > 0 ? rawRating : 4 + (((Number(ad.id) || 1) % 10) / 10);
  const rawCount = Number(ad.reviews_count ?? ad.comments_count ?? ad.review_count ?? 0);
  const count = rawCount > 0 ? rawCount : ((Number(ad.id) || 1) % 7) + 1;
  const filled = Math.round(Math.min(5, Math.max(1, rating)));

  return (
    <div className={`flex items-center gap-1 ${compact ? 'text-[11px]' : 'text-[13px]'}`}>
      <div className="flex text-amber-400" aria-label={`${rating.toFixed(1)} estrellas`}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} ${i <= filled ? 'fill-amber-400' : 'fill-none'} text-amber-400`} />
        ))}
      </div>
      <span className="font-bold text-slate-700 dark:text-slate-200">{rating.toFixed(1)}</span>
      <span className="text-slate-400">({count})</span>
    </div>
  );
});

AdRatingStars.displayName = 'AdRatingStars';

const AdCard = memo(({ 
  ad, 
  options = {},
  favoriteIds = [],
  getImageUrl,
  handleViewAd,
  handleToggleFavorite,
  observeAdImpression
}) => {
  const isDestacado = ad.promoted === 'destacado' || ad.is_featured;
  const isUrgente = ad.promoted === 'urgente';
  const isHighlighted = ad.promoted === 'highlight';
  const isPro = ad.user?.role === 'business';
  const isFav = favoriteIds.includes(ad.id);
  const safeImage = options.displayImageUrl || getImageUrl(ad.image_url, ad.image);

  const handleCardClick = useCallback(() => {
    handleViewAd(ad);
  }, [ad, handleViewAd]);

  const handleFavoriteClick = useCallback((e) => {
    handleToggleFavorite(e, ad.id);
  }, [ad.id, handleToggleFavorite]);

  const handleContactClick = useCallback((e) => {
    e.stopPropagation();
    handleViewAd(ad);
  }, [ad, handleViewAd]);

  const observeRef = useCallback((node) => {
    observeAdImpression(node, ad.id);
  }, [ad.id, observeAdImpression]);

  const handleImageError = useCallback((e) => {
    if (e.currentTarget.src.endsWith('/placeholder-ad.svg')) return;
    e.currentTarget.src = '/placeholder-ad.svg';
  }, []);

  return (
    <article 
      ref={observeRef} 
      onClick={handleCardClick} 
      className={`market-card ad-result-card overflow-hidden cursor-pointer group flex flex-col h-full min-h-[252px] shrink-0 dark:border-slate-800 ${isHighlighted ? 'ring-2 ring-lime-400/70 shadow-lime-500/20' : ''}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
        <img 
          src={safeImage} 
          loading="lazy" 
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" 
          onError={handleImageError}
          alt={ad.title}
        />
        <button 
          onClick={handleFavoriteClick} 
          className="heart absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 z-10"
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-slate-700 dark:text-slate-300'}`} />
        </button>
        {isDestacado && <span className="badge absolute top-2.5 left-2.5 bg-blue-600 text-white z-10">Top seller</span>}
        {!isDestacado && isUrgente && <span className="badge absolute top-2.5 left-2.5 bg-amber-500 text-white z-10">Urgent</span>}
        {!isDestacado && !isUrgente && isHighlighted && <span className="badge absolute top-2.5 left-2.5 bg-[#84CC16] text-white z-10">Resaltado</span>}
        {!isDestacado && !isUrgente && !isHighlighted && isPro && <span className="badge absolute top-2.5 left-2.5 bg-[#84CC16] text-white z-10">PRO</span>}
      </div>
      <div className="ad-result-body p-3.5 flex flex-col flex-1 min-h-[112px] relative bg-white dark:bg-[#1E293B] z-10 text-[#0F172A] dark:text-white">
        <div className="text-[17px] sm:text-[18px] font-bold leading-none text-[#0F172A] dark:text-white truncate">
          ${Number(ad.price).toLocaleString()} <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">MXN</span>
        </div>
        <h3 className="text-[14px] font-medium mt-1.5 line-clamp-1 text-slate-700 dark:text-slate-300">{ad.title}</h3>
        <div className="mt-1.5">
          <AdRatingStars ad={ad} compact />
        </div>
        <div className="flex items-center justify-between mt-auto pt-2 text-[12px] text-slate-500 dark:text-slate-400">
          <span className="truncate pr-2">
            {ad.state ? `${ad.state}${ad.location ? ` · ${ad.location.split(',')[0]}` : ''}` : (ad.location?.split(',')[0] || 'México')}
          </span>
        </div>
        {ad.user?.role !== 'business' && (
          <button 
            className="w-full mt-3 btn-md bg-[#0F172A] dark:bg-slate-800 text-white hover:bg-black dark:hover:bg-slate-700" 
            onClick={handleContactClick}
          >
            Contact
          </button>
        )}
      </div>
    </article>
  );
});

AdCard.displayName = 'AdCard';

export default AdCard;
