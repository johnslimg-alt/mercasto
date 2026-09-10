import React, { memo, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Eye, Heart, MapPin, Star } from 'lucide-react';
import { getImageUrls, sizedImage } from '../../utils/imageHelpers';
import { localizedText } from '../../utils/localize';
import { formatNumber } from '../../utils/localeFormat';
import { localeFor } from '../../utils/localeFormat';
import { getTranslations } from '../../utils/translations';
import { canonicalAdCondition, getAdDetailCopy } from '../../utils/adDetailCopy';

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

/** "hace 2 meses" / "2 months ago" — localized by Intl, no extra copy keys. */
const relativeAge = (value, lang) => {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return '';
  const diffDays = Math.round((then - Date.now()) / 86_400_000);
  const magnitude = Math.abs(diffDays);
  try {
    const formatter = new Intl.RelativeTimeFormat(localeFor(lang), { numeric: 'auto' });
    if (magnitude < 1) return formatter.format(0, 'day');
    if (magnitude < 30) return formatter.format(diffDays, 'day');
    if (magnitude < 365) return formatter.format(Math.round(diffDays / 30), 'month');
    return formatter.format(Math.round(diffDays / 365), 'year');
  } catch {
    return '';
  }
};

/** Single, deterministic badge slot — never stacked, and always a solid
 *  `background-color` so the e2e contrast check can read it. Inline colors are
 *  used for the lime/dark pairings so `html.dark` overrides cannot flip them. */
const AdCardBadge = ({ ad, isCatalogFiller, detailCopy, t, className = '' }) => {
  const base = `badge z-10 ${className}`;
  if (isCatalogFiller) {
    return <span className={base} style={{ background: '#0F172A', color: '#FFFFFF' }}>{detailCopy.catalogTitle}</span>;
  }
  if (ad.promoted === 'destacado' || ad.is_featured) {
    return <span className={base} style={{ background: '#2563EB', color: '#FFFFFF' }}>{t.featured_status}</span>;
  }
  if (ad.promoted === 'urgente') {
    return <span className={base} style={{ background: '#F59E0B', color: '#FFFFFF' }}>{t.urgent_badge}</span>;
  }
  if (ad.promoted === 'highlight') {
    return <span className={base} style={{ background: '#84CC16', color: '#0F172A' }}>{t.highlighted_badge}</span>;
  }
  if (ad.user?.role === 'business') {
    return (
      <span className={`${base} inline-flex items-center gap-1`} style={{ background: '#0F172A', color: '#BEF264' }}>
        <BadgeCheck size={11} aria-hidden="true" />
        PRO
      </span>
    );
  }
  return null;
};

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
  const isCatalogFiller = Boolean(ad.is_catalog_filler);
  const isHighlighted = ad.promoted === 'highlight';
  const isFav = favoriteIds.includes(ad.id);
  const imageWidth = Number.isFinite(options.imageWidth) ? options.imageWidth : 520;
  const safeImage = sizedImage(options.displayImageUrl || getImageUrl(ad.image_url, ad.image), imageWidth);

  const conditionLabel = ad.condition ? canonicalAdCondition(ad.condition) : '';
  const locationLabel = ad.state
    ? `${ad.state}${ad.location ? ` · ${ad.location.split(',')[0]}` : ''}`
    : (ad.location?.split(',')[0] || t.all_mexico);
  const age = relativeAge(ad.created_at || ad.published_at, lang);
  const viewCount = Number(ad.views ?? ad.views_count ?? 0);
  const oldPrice = Number(ad.old_price);
  const hasPriceDrop = Number.isFinite(oldPrice) && oldPrice > Number(ad.price);

  const photoCount = useMemo(() => {
    const urls = getImageUrls(ad.image_url, ad.images);
    return Array.isArray(urls) ? urls.length : 0;
  }, [ad.image_url, ad.images]);

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

  const badgeNode = (
    <AdCardBadge
      ad={ad}
      isCatalogFiller={isCatalogFiller}
      detailCopy={detailCopy}
      t={t}
      className={options.layout === 'list' ? 'absolute left-1.5 top-1.5' : 'absolute left-2.5 top-2.5'}
    />
  );

  const favoriteButton = (extraClass = '') => (
    <button
      type="button"
      data-testid="ad-card-favorite"
      aria-label={t.ad_favorite}
      aria-pressed={isFav}
      onClick={(e) => handleToggleFavorite(e, ad.id)}
      className={`pointer-events-auto absolute right-0.5 top-0.5 z-20 flex h-12 w-12 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#84CC16] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${extraClass}`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/92 shadow-sm ring-1 ring-slate-900/5 backdrop-blur transition-transform duration-200 group-hover:scale-105 hover:bg-white dark:bg-slate-900/92 dark:ring-white/10 dark:hover:bg-slate-800">
        <Heart className={`h-4 w-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-slate-700 dark:text-slate-300'}`} />
      </span>
    </button>
  );

  const metaRow = (
    <div className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
      <MapPin size={12} className="shrink-0 text-[#84CC16]" aria-hidden="true" />
      <span className="truncate">{locationLabel}</span>
      {conditionLabel && <span className="mc-chip ml-auto shrink-0 py-0.5 text-[10px]">{conditionLabel}</span>}
    </div>
  );

  if (options.layout === 'list') {
    return (
      <article
        ref={isCatalogFiller ? null : observeRef}
        data-testid="catalog-list-card"
        className={`relative market-card ad-result-card group flex min-h-[96px] overflow-hidden ${isHighlighted ? 'ring-2 ring-[#84CC16]' : ''}`}
      >
        <button
          type="button"
          aria-label={localizedText(ad.title, lang)}
          onClick={() => { options.onActivate?.(ad); handleViewAd(ad); }}
          className="absolute inset-0 z-10 cursor-pointer rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#84CC16] focus-visible:ring-inset"
        />
        <div className="pointer-events-none relative h-[96px] w-[104px] shrink-0 overflow-hidden bg-slate-100 sm:h-[108px] sm:w-[144px] md:w-[156px] dark:bg-slate-800">
          <img
            src={safeImage}
            width={imageWidth}
            height={Math.round(imageWidth * 0.75)}
            loading={options.priority ? 'eager' : 'lazy'}
            fetchPriority={options.priority ? 'high' : 'auto'}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            onError={handleImageError}
            alt={localizedText(ad.title, lang)}
          />
          {badgeNode}
        </div>
        <div className="ad-result-body pointer-events-none flex min-w-0 flex-1 flex-col px-3 py-2.5 pr-12 sm:px-4 sm:py-3">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-800 dark:text-slate-100 sm:text-[14.5px]">
            {localizedText(ad.title, lang)}
          </h3>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="mc-price text-[17px] sm:text-[19px]">${formatNumber(ad.price, lang)}</span>
            <span className="mc-price-unit">MXN</span>
            {hasPriceDrop && (
              <span className="text-[11px] font-medium text-slate-400 line-through">${formatNumber(oldPrice, lang)}</span>
            )}
          </div>
          <div className="mt-auto flex min-w-0 items-center gap-2 pt-1.5">
            {metaRow}
          </div>
        </div>
        {favoriteButton()}
      </article>
    );
  }

  return (
    <article
      ref={isCatalogFiller ? null : observeRef}
      className={`relative market-card ad-result-card group flex h-full min-h-[252px] shrink-0 flex-col overflow-hidden ${isHighlighted ? 'ring-2 ring-[#84CC16]' : ''}`}
    >
      <button
        type="button"
        aria-label={localizedText(ad.title, lang)}
        onClick={() => { options.onActivate?.(ad); handleViewAd(ad); }}
        className="absolute inset-0 z-10 cursor-pointer rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#84CC16] focus-visible:ring-inset"
      />
      <div className="pointer-events-none relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={safeImage}
          width={imageWidth}
          height={Math.round(imageWidth * 0.75)}
          loading={options.priority ? 'eager' : 'lazy'}
          fetchPriority={options.priority ? 'high' : 'auto'}
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          onError={handleImageError}
          alt={localizedText(ad.title, lang)}
        />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-slate-950/30 to-transparent" aria-hidden="true" />
        {badgeNode}
        {photoCount > 1 && (
          <span className="absolute bottom-2.5 right-2.5 z-10 inline-flex items-center rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
            {photoCount}
          </span>
        )}
      </div>
      <div className="ad-result-body pointer-events-none relative flex flex-1 flex-col bg-white p-3.5 text-[#0F172A] dark:bg-[#1E293B] dark:text-white">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <span className="mc-price text-[18px] sm:text-[19px]">${formatNumber(ad.price, lang)}</span>{' '}
            <span className="mc-price-unit">MXN</span>
          </div>
          {hasPriceDrop && (
            <span className="shrink-0 text-[11px] font-medium text-slate-400 line-through">${formatNumber(oldPrice, lang)}</span>
          )}
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-[13.5px] font-medium leading-snug text-slate-600 dark:text-slate-300">
          {localizedText(ad.title, lang)}
        </h3>
        <div className="mt-1.5"><AdRatingStars ad={ad} compact /></div>
        <div className="mt-2">{metaRow}</div>
        {(age || viewCount > 0) && (
          <div className="mt-1.5 flex items-center gap-2 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
            {age && <span>{age}</span>}
            {age && viewCount > 0 && <span aria-hidden="true">·</span>}
            {viewCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Eye size={11} aria-hidden="true" />
                {formatNumber(viewCount, lang)}
                <span className="sr-only">{detailCopy.views}</span>
              </span>
            )}
          </div>
        )}
        <div className="mt-auto pt-3">
          {isCatalogFiller ? (
            <button
              className="pointer-events-auto relative z-20 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[#84CC16]/35 bg-[#84CC16]/10 text-[12.5px] font-bold text-[#4D7C0F] transition-colors hover:border-[#84CC16] hover:bg-[#84CC16]/20 dark:border-[#84CC16]/30 dark:bg-[#84CC16]/10 dark:text-[#BEF264] dark:hover:bg-[#84CC16]/20"
              onClick={(e) => { e.stopPropagation(); navigate(currentUser ? '/post' : '/vendedores', { state: { category: ad.category } }); }}
            >
              {detailCopy.publishSimilar}
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          ) : ad.user?.role !== 'business' && (
            <button
              className="pointer-events-auto relative z-20 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 transition-colors hover:border-[#84CC16] hover:bg-[#84CC16]/10 hover:text-[#365314] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-[#84CC16] dark:hover:text-[#BEF264]"
              onClick={(e) => { e.stopPropagation(); handleViewAd(ad); }}
            >{t.ct_contact_btn}</button>
          )}
        </div>
      </div>
    </article>
  );
});

AdCard.displayName = 'AdCard';
export default AdCard;
