import { useEffect } from 'react';

/**
 * AggregateRating Schema for ads and categories
 * Helps search engines understand quality signals
 */
export default function AggregateRatingSchema({ 
  item, 
  ratingValue = 4.5, 
  reviewCount = 100,
  bestRating = 5,
  worstRating = 1
}) {
  useEffect(() => {
    if (!item) return;

    const ratingSchema = {
      "@context": "https://schema.org",
      "@type": item.type || "Product",
      "name": item.name,
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": ratingValue,
        "reviewCount": reviewCount,
        "bestRating": bestRating,
        "worstRating": worstRating
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ratingSchema);
    script.id = 'rating-schema';
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('rating-schema');
      if (existing) existing.remove();
    };
  }, [item, ratingValue, reviewCount]);

  // Render visible rating stars
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-5 h-5 ${i < Math.floor(ratingValue) ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {ratingValue.toFixed(1)} ({reviewCount} reseñas)
      </span>
    </div>
  );
}
