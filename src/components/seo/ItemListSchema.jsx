import { useEffect } from 'react';
import { localizedText } from '../../utils/localize';

/**
 * ItemList Schema for ad listings
 * Helps search engines understand list structure
 */
export default function ItemListSchema({ items, listName = "Anuncios" }) {
  useEffect(() => {
    if (!items || items.length === 0) return;

    const itemListSchema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": listName,
      "itemListElement": items.slice(0, 20).map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Product",
          "name": localizedText(item.title),
          "url": `https://mercasto.com/ad/${item.id}`,
          "image": item.images?.[0] || 'https://mercasto.com/icon-512x512.png',
          "description": localizedText(item.description)?.substring(0, 200),
          "offers": {
            "@type": "Offer",
            "price": item.price,
            "priceCurrency": "MXN",
            "availability": "https://schema.org/InStock"
          }
        }
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(itemListSchema);
    script.id = 'itemlist-schema';
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('itemlist-schema');
      if (existing) existing.remove();
    };
  }, [items, listName]);

  return null; // No visible output, only schema
}
