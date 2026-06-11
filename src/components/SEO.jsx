import { useEffect } from 'react';

export default function SEO({ title, description, image, url }) {
  useEffect(() => {
    // Обновляем title
    if (title) {
      document.title = title;
    }

    // Обновляем meta description
    if (description) {
      let descMeta = document.querySelector('meta[name="description"]');
      if (!descMeta) {
        descMeta = document.createElement('meta');
        descMeta.setAttribute('name', 'description');
        document.head.appendChild(descMeta);
      }
      descMeta.setAttribute('content', description);
    }

    // Обновляем Open Graph теги
    const ogTags = {
      'og:title': title,
      'og:description': description,
      'og:image': image,
      'og:url': url || window.location.href,
    };

    Object.entries(ogTags).forEach(([property, content]) => {
      if (content) {
        let tag = document.querySelector(`meta[property="${property}"]`);
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute('property', property);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
      }
    });

    // Обновляем Twitter Card теги
    const twitterTags = {
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': image,
    };

    Object.entries(twitterTags).forEach(([name, content]) => {
      if (content) {
        let tag = document.querySelector(`meta[name="${name}"]`);
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute('name', name);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
      }
    });
  }, [title, description, image, url]);

  return null;
}
