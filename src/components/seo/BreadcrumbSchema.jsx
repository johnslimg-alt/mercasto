import { useEffect } from 'react';

/**
 * BreadcrumbList Schema Component for SEO
 * Adds structured data for breadcrumbs to help search engines understand site structure
 */
export default function BreadcrumbSchema({ items }) {
  useEffect(() => {
    if (!items || items.length === 0) return;

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url || undefined
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(breadcrumbSchema);
    script.id = 'breadcrumb-schema';
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('breadcrumb-schema');
      if (existing) existing.remove();
    };
  }, [items]);

  // Render visible breadcrumbs
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
      {items.map((item, index) => (
        <span key={index} className="flex items-center">
          {index > 0 && <span className="mx-2">/</span>}
          {item.url ? (
            <a href={item.url} className="hover:text-green-600 dark:hover:text-green-400">
              {item.name}
            </a>
          ) : (
            <span className="text-gray-900 dark:text-white font-medium">
              {item.name}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
