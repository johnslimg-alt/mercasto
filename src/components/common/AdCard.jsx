import React, { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import { sizedImage } from '../../utils/imageHelpers';
import { localizedText } from '../../utils/localize';
import { formatNumber } from '../../utils/localeFormat';
import { getTranslations } from '../../utils/translations';
import { getAdDetailCopy } from '../../utils/adDetailCopy';
import { isCatalogReference } from '../../utils/catalogInventory';

const AdRatingStars = memo(({ ad, compact = false }) => {
  const rawRating = Number(ad.rating_average ?? ad.average_rating ?? ad.rating ?? 0);
  const rawCount = Number(ad.reviews_count ?? ad.comments_count ?? ad.review_count ?? 0);
  const count = Number.isFinite(rawCount) && rawCount > 0 ? Math.floor(rawCount) : 0;
  const rating = count > 0 && Number.isFinite(rawRating) && rawRating > 0
    ? Math.min(5, Math.max(1, rawRating))
    : 0;

  const hasReviews = rating > 0 && count > 0;
  if (!hasReviews) return null;

  const filled = Math.round(rating);
  return (
    <div className={`flex items-center gap-1 ${compact ? 'text-[11px]' : 'text-[13px]'}`}>
      <div className="flex text-amber-400" role="img" aria-label={`${rating.toFixed(1)} / 5`}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} ${i <= filled ? 'fill-amber-400' : 'fill-none'} text-amber-400`} />
        ))}
      </div>
      <span className="font-bold text-slate-700 dark:text-slate-200">{rating.toFixed(1)}</span>
      <span className="text-slate-500 dark:text-slate-400">({count})</span>
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
  observeAdImpression,
  onImageError,
  lang = 'es',
  currentUser,
}) => {
  const navigate = useNavigate();
  const t = getTranslations(lang);
  const detailCopy = getAdDetailCopy(lang);
  const isDestacado = ad.promoted === 'destacado' || ad.is_featured;
  const isUrgente = ad.promoted === 'urgente';
  const isHighlighted = ad.promoted === 'highlight';
  const isPro = ad.user?.role === 'business';
  // Strict marker: only an explicit placeholder flag disables impression tracking.
  // Anything ambiguous stays a real listing so a real ad never loses tracking.
  const isCatalogFiller = isCatalogReference(ad);
  const isFav = favoriteIds.includes(ad.id);
  const imageWidth = Number.isFinite(options.imageWidth) ? options.imageWidth : 520;
  const safeImage = sizedImage(options.displayImageUrl || getImageUrl(ad.image_url, ad.image), imageWidth);

  if (options.priority) {
    try {
      localStorage.setItem('__mercasto_lcp_image', safeImage);
    } catch (e) {}
  }

  const observeRef = useCallback((node) => {
    observeAdImpression?.(node, ad.id);
  }, [ad.id, observeAdImpression]);

  const handleImageError = useCallback((e) => {
    if (onImageError) {
      onImageError(e);
      return;
    }
    if (e.currentTarget.src.endsWith('/placeholder-ad.svg')) return;
    e.currentTarget.src = '/placeholder-ad.svg';
  }, [onImageError]);

  if (options.layout === 'list') {
    return (
      <article
        ref={isCatalogFiller ? null : observeRef}
        data-testid="catalog-list-card"
        className={`relative market-card ad-result-card group flex min-h-[96px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${isHighlighted ? 'ring-2 ring-lime-400/70 shadow-lime-500/20' : ''}`}
      >
        <button
          type="button"
          aria-label={localizedText(ad.title, lang)}
          onClick={() => { options.onActivate?.(ad); handleViewAd(ad); }}
          className="absolute inset-0 z-10 cursor-pointer rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#84CC16] focus-visible:ring-inset"
        />
        <div className="relative pointer-events-none h-[96px] w-[104px] shrink-0 overflow-hidden bg-slate-200 sm:h-[108px] sm:w-[144px] md:w-[156px] dark:bg-slate-800">
          <img
            src={safeImage}
            width={imageWidth}
            height={Math.round(imageWidth * 0.75)}
            loading={options.priority ? 'eager' : 'lazy'}
            fetchPriority={options.priority ? 'high' : 'auto'}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={handleImageError}
            alt={localizedText(ad.title, lang)}
          />
          {isCatalogFiller && <span className="badge absolute left-1.5 top-1.5 z-10 bg-slate-900/90 text-[9px] text-white">{detailCopy.catalogTitle}</span>}
          {!isCatalogFiller && isDestacado && <span className="badge absolute left-1.5 top-1.5 z-10 bg-blue-600 text-[9px] text-white">{t.featured_status}</span>}
          {!isCatalogFiller && !isDestacado && isUrgente && <span className="badge absolute left-1.5 top-1.5 z-10 bg-amber-500 text-[9px] text-white">{t.urgent_badge}</span>}
        </div>
        <div className="ad-result-body pointer-events-none flex min-w-0 flex-1 flex-col px-3 py-2.5 pr-12 text-[#0F172A] dark:text-white sm:px-4 sm:py-3">
          <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-slate-800 dark:text-slate-100 sm:text-[14px]">{localizedText(ad.title, lang)}</h3>
          <div className="mt-1 text-[16px] font-black leading-none text-slate-950 dark:text-white sm:text-[18px]">
            ${formatNumber(ad.price, lang)} <span className="text-[9px] font-semibold text-slate-400">MXN</span>
          </div>
          <div className="mt-auto flex min-w-0 items-center gap-2 pt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="truncate">{ad.state ? `${ad.state}${ad.location ? ` · ${ad.location.split(',')[0]}` : ''}` : (ad.location?.split(',')[0] || t.all_mexico)}</span>
            {ad.condition && <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 sm:inline dark:bg-slate-800 dark:text-slate-300">{ad.condition}</span>}
          </div>
        </div>
        <button
          type="button"
          data-testid="ad-card-favorite"
          aria-label={t.ad_favorite}
          aria-pressed={isFav}
          onClick={(e) => handleToggleFavorite(e, ad.id)}
          className="pointer-events-auto absolute right-1 top-1 z-20 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#84CC16]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/92 shadow-sm backdrop-blur transition-colors hover:bg-white dark:bg-slate-900/92 dark:hover:bg-slate-800">
            <Heart className={`h-4 w-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-slate-700 dark:text-slate-300'}`} />
          </span>
        </button>
      </article>
    );
  }

  return (
    <article ref={isCatalogFiller ? null : observeRef} className={`relative market-card ad-result-card overflow-hidden group flex flex-col h-full min-h-[252px] shrink-0 dark:border-slate-800 ${isHighlighted ? 'ring-2 ring-lime-400/70 shadow-lime-500/20' : ''}`}>
      <button
        type="button"
        aria-label={localizedText(ad.title, lang)}
        onClick={() => { options.onActivate?.(ad); handleViewAd(ad); }}
        className="absolute inset-0 z-10 cursor-pointer rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#84CC16] focus-visible:ring-inset"
      />
      <div className="relative pointer-events-none aspect-[4/3] w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
        <img src={safeImage} width={imageWidth} height={Math.round(imageWidth * 0.75)} loading={options.priority ? 'eager' : 'lazy'} fetchPriority={options.priority ? 'high' : 'auto'} decoding="async" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" onError={handleImageError} alt={localizedText(ad.title, lang)} />
        <button
          type="button"
          data-testid="ad-card-favorite"
          aria-label={t.ad_favorite}
          aria-pressed={isFav}
          onClick={(e) => handleToggleFavorite(e, ad.id)}
          className="heart pointer-events-auto absolute top-0.5 right-0.5 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#84CC16] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur transition-colors hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-800">
            <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-slate-700 dark:text-slate-300'}`} />
          </span>
        </button>
        {isCatalogFiller && <span className="badge absolute top-2.5 left-2.5 bg-slate-900/90 text-white z-10">{detailCopy.catalogTitle}</span>}
        {!isCatalogFiller && isDestacado && <span className="badge absolute top-2.5 left-2.5 bg-blue-600 text-white z-10">{t.featured_status}</span>}
        {!isCatalogFiller && !isDestacado && isUrgente && <span className="badge absolute top-2.5 left-2.5 bg-amber-500 text-white z-10">{t.urgent_badge}</span>}
        {!isCatalogFiller && !isDestacado && !isUrgente && isHighlighted && <span className="badge absolute top-2.5 left-2.5 bg-[#84CC16] z-10" style={{ color: '#0F172A' }}>{t.highlighted_badge}</span>}
        {!isCatalogFiller && !isDestacado && !isUrgente && !isHighlighted && isPro && <span className="badge absolute top-2.5 left-2.5 bg-[#84CC16] z-10" style={{ color: '#0F172A' }}>PRO</span>}
      </div>
      <div className="ad-result-body pointer-events-none p-3.5 flex flex-col flex-1 min-h-[112px] relative bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white">
        <div className="text-[17px] sm:text-[18px] font-bold leading-none text-[#0F172A] dark:text-white truncate">
          ${formatNumber(ad.price, lang)} <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">MXN</span>
        </div>
        <h3 className="text-[14px] font-medium mt-1.5 line-clamp-1 text-slate-700 dark:text-slate-300">{localizedText(ad.title, lang)}</h3>
        <div className="mt-1.5"><AdRatingStars ad={ad} compact /></div>
        <div className="flex items-center justify-between mt-auto pt-2 text-[12px] text-slate-500 dark:text-slate-400">
          <span className="truncate pr-2">{ad.state ? `${ad.state}${ad.location ? ` · ${ad.location.split(',')[0]}` : ''}` : (ad.location?.split(',')[0] || t.all_mexico)}</span>
        </div>
        {isCatalogFiller ? (
          <button className="pointer-events-auto relative z-20 w-full mt-3 btn-md bg-[#84CC16] text-slate-950 hover:bg-[#65A30D]" onClick={(e) => { e.stopPropagation(); navigate(currentUser ? '/post' : '/vendedores', { state: { category: ad.category } }); }}>
            {detailCopy.publishSimilar}
          </button>
        ) : ad.user?.role !== 'business' && (
          <button className="pointer-events-auto relative z-20 w-full mt-3 btn-md bg-[#0F172A] dark:bg-slate-800 text-white hover:bg-black dark:hover:bg-slate-700" onClick={(e) => { e.stopPropagation(); handleViewAd(ad); }}>{t.ct_contact_btn}</button>
        )}
      </div>
    </article>
  );
});

AdCard.displayName = 'AdCard';
export default AdCard;
