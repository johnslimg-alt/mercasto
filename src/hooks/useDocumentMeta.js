import { useEffect } from 'react';

/**
 * Hook для динамического обновления meta тегов (title, OG, Twitter Card)
 * Автоматически восстанавливает оригинальные значения при unmount
 */
export default function useDocumentMeta({ title, description, image, url }) {
  useEffect(() => {
    // Сохранить оригинальные значения
    const originalTitle = document.title;
    const originalOgTitle = document.querySelector('meta[property="og:title"]')?.content;
    const originalOgDesc = document.querySelector('meta[property="og:description"]')?.content;
    const originalOgImage = document.querySelector('meta[property="og:image"]')?.content;
    const originalOgUrl = document.querySelector('meta[property="og:url"]')?.content;
    const originalTwitterTitle = document.querySelector('meta[name="twitter:title"]')?.content;
    const originalTwitterDesc = document.querySelector('meta[name="twitter:description"]')?.content;
    const originalTwitterImage = document.querySelector('meta[name="twitter:image"]')?.content;

    // Обновить title
    if (title) {
      document.title = `${title} | Mercasto`;
    }

    // Обновить OG теги
    if (title) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', `${title} | Mercasto`);
    }

    if (description) {
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', description);

      const twitterDesc = document.querySelector('meta[name="twitter:description"]');
      if (twitterDesc) twitterDesc.setAttribute('content', description);
    }

    if (image) {
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) ogImage.setAttribute('content', image);

      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage) twitterImage.setAttribute('content', image);
    }

    if (url) {
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute('content', url);
    }

    // Обновить Twitter title
    if (title) {
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) twitterTitle.setAttribute('content', `${title} | Mercasto`);
    }

    // Восстановить оригинальные значения при unmount
    return () => {
      document.title = originalTitle;
      
      if (originalOgTitle) {
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', originalOgTitle);
      }
      
      if (originalOgDesc) {
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', originalOgDesc);
      }
      
      if (originalOgImage) {
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) ogImage.setAttribute('content', originalOgImage);
      }
      
      if (originalOgUrl) {
        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.setAttribute('content', originalOgUrl);
      }
      
      if (originalTwitterTitle) {
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) twitterTitle.setAttribute('content', originalTwitterTitle);
      }
      
      if (originalTwitterDesc) {
        const twitterDesc = document.querySelector('meta[name="twitter:description"]');
        if (twitterDesc) twitterDesc.setAttribute('content', originalTwitterDesc);
      }
      
      if (originalTwitterImage) {
        const twitterImage = document.querySelector('meta[name="twitter:image"]');
        if (twitterImage) twitterImage.setAttribute('content', originalTwitterImage);
      }
    };
  }, [title, description, image, url]);
}
