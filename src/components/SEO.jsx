import { useEffect } from 'react';

const SITE_URL = 'https://mercasto.com';

const upsertMeta = (selector, attribute, value) => {
  if (!value) return;
  let tag = document.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    document.head.appendChild(tag);
  }
  Object.entries(attribute).forEach(([key, content]) => tag.setAttribute(key, content));
  tag.setAttribute('content', value);
};

export default function SEO({ title, description, image, url, type = 'website', noindex = false }) {
  useEffect(() => {
    const canonicalUrl = new URL(url || window.location.pathname, SITE_URL).toString();

    if (title) {
      document.title = title;
    }

    upsertMeta('meta[name="description"]', { name: 'description' }, description);
    upsertMeta('meta[name="robots"]', { name: 'robots' }, noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    const ogTags = {
      'og:title': title,
      'og:description': description,
      'og:image': image,
      'og:url': canonicalUrl,
      'og:type': type,
      'og:site_name': 'Mercasto',
      'og:locale': 'es_MX',
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

    const twitterTags = {
      'twitter:card': image ? 'summary_large_image' : 'summary',
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
  }, [title, description, image, url, type, noindex]);

  return null;
}
