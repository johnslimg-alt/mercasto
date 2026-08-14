import { getStoresDirectoryCopy } from '../utils/storesDirectoryCopy.js';
import { getContactPageCopy } from '../utils/contactPageCopy.js';

export const PUBLIC_SEO_ROUTES = Object.freeze({
  '/tiendas': {
    title: 'Tiendas y Negocios en México | Mercasto',
    description: 'Explora perfiles de tiendas y negocios que publican anuncios clasificados en Mercasto México.',
  },
  '/terminos': {
    title: 'Términos de Uso | Mercasto',
    description: 'Consulta los Términos de Uso vigentes de Mercasto para publicar, buscar y contactar mediante la plataforma de clasificados.',
  },
  '/privacidad': {
    title: 'Política de Privacidad | Mercasto',
    description: 'Consulta la Política de Privacidad de Mercasto y cómo se tratan los datos personales conforme al marco aplicable en México.',
  },
  '/cookies': {
    title: 'Política de Cookies | Mercasto',
    description: 'Consulta qué cookies y tecnologías similares usa Mercasto, para qué se utilizan y cómo administrar tus preferencias.',
  },
  '/contacto': {
    title: 'Contacto | Mercasto',
    description: 'Consulta los canales oficiales para contactar al equipo de Mercasto sobre soporte, seguridad, moderación o tu cuenta.',
  },
  '/ayuda': {
    title: 'Centro de Ayuda de Mercasto | Comprar y vender',
    description: 'Encuentra guías oficiales sobre publicación, seguridad, compra, contacto, pagos y políticas de Mercasto.',
  },
});

export function getPublicSeo(pathname = '', language = 'es') {
  if (pathname === '/tiendas') {
    const copy = getStoresDirectoryCopy(language);
    return { title: copy.seoTitle, description: copy.seoDescription };
  }
  if (pathname === '/contacto') {
    const copy = getContactPageCopy(language);
    return { title: copy.seoTitle, description: copy.seoDescription };
  }
  return PUBLIC_SEO_ROUTES[pathname] || null;
}
