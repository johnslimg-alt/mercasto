const SOURCE_ARTICLES = Object.freeze([
  {
    slug: 'como-vender-mas-rapido',
    updatedAt: '2026-09-22',
    readMinutes: 4,
    translations: {
      es: {
        category: 'Vender',
        title: 'Cómo vender más rápido en Mercasto',
        description: 'Consejos prácticos para crear un anuncio claro, generar confianza y facilitar el contacto con compradores.',
        sections: [
          {
            title: 'Empieza por un anuncio que se entienda en segundos',
            body: 'Usa un título específico, una categoría correcta y un precio realista. Describe el estado del artículo, sus características principales y cualquier detalle que una persona necesitaría conocer antes de escribirte.',
          },
          {
            title: 'Las fotos deben responder preguntas',
            body: 'Muestra el artículo completo y también sus detalles importantes. Evita imágenes borrosas, repetidas o que oculten defectos relevantes. Una presentación honesta reduce conversaciones innecesarias y mejora la confianza.',
          },
          {
            title: 'Haz fácil el siguiente paso',
            body: 'Mantén actualizados tu ubicación y los canales de contacto que decidas compartir. Responde con información concreta y acuerda entregas en condiciones seguras.',
          },
        ],
      },
      en: {
        category: 'Selling',
        title: 'How to sell faster on Mercasto',
        description: 'Practical tips for creating a clear listing, building trust, and making it easier for buyers to contact you.',
        sections: [
          {
            title: 'Start with a listing people understand in seconds',
            body: 'Use a specific title, the right category, and a realistic price. Describe the item condition, its main features, and anything a buyer should know before contacting you.',
          },
          {
            title: 'Photos should answer questions',
            body: 'Show the whole item as well as important details. Avoid blurry or repetitive images, and do not hide relevant defects. Honest presentation reduces unnecessary conversations and builds trust.',
          },
          {
            title: 'Make the next step easy',
            body: 'Keep your location and the contact channels you choose to share up to date. Reply with concrete information and arrange deliveries under safe conditions.',
          },
        ],
      },
    },
  },
  {
    slug: 'comprar-con-seguridad',
    updatedAt: '2026-09-22',
    readMinutes: 5,
    translations: {
      es: {
        category: 'Seguridad',
        title: 'Guía para comprar con seguridad',
        description: 'Qué revisar antes de contactar, pagar o acordar una entrega con otra persona.',
        sections: [
          {
            title: 'Verifica la información del anuncio',
            body: 'Compara descripción, fotografías, precio, ubicación y perfil del vendedor. Si algo no coincide, pregunta antes de avanzar.',
          },
          {
            title: 'Evita pagos que no puedas verificar',
            body: 'Mercasto facilita el contacto, pero no es parte de la compraventa entre usuarios. No envíes dinero por adelantado a desconocidos y comprueba el producto antes de pagar siempre que sea posible.',
          },
          {
            title: 'Elige una entrega segura',
            body: 'Para operaciones presenciales, utiliza lugares públicos y acuerda de antemano qué vas a revisar. Si detectas una conducta sospechosa, utiliza las herramientas de reporte de Mercasto.',
          },
        ],
      },
      en: {
        category: 'Safety',
        title: 'Guide to buying safely',
        description: 'What to check before contacting someone, making a payment, or arranging a delivery.',
        sections: [
          {
            title: 'Verify the listing information',
            body: 'Compare the description, photos, price, location, and seller profile. If something does not match, ask before moving forward.',
          },
          {
            title: 'Avoid payments you cannot verify',
            body: 'Mercasto helps people connect, but it is not a party to transactions between users. Do not send money in advance to strangers, and inspect the product before paying whenever possible.',
          },
          {
            title: 'Choose a safe handoff',
            body: 'For in-person transactions, use public places and agree in advance on what you will inspect. If you notice suspicious behavior, use Mercasto reporting tools.',
          },
        ],
      },
    },
  },
  {
    slug: 'encontrar-grandes-oportunidades',
    updatedAt: '2026-09-22',
    readMinutes: 4,
    translations: {
      es: {
        category: 'Comprar',
        title: 'Ideas para encontrar grandes oportunidades',
        description: 'Cómo usar búsqueda, filtros, ubicación y favoritos para encontrar anuncios relevantes sin perder tiempo.',
        sections: [
          {
            title: 'Empieza con una búsqueda concreta',
            body: 'Combina palabras específicas con categoría, ubicación y rango de precio. Un filtro bien definido elimina resultados que no cumplen lo que buscas.',
          },
          {
            title: 'Compara antes de decidir',
            body: 'Revisa varios anuncios similares y presta atención al estado, la ubicación y la información disponible. Un precio bajo por sí solo no convierte un anuncio en una buena oportunidad.',
          },
          {
            title: 'Guarda lo que merece una segunda revisión',
            body: 'Usa favoritos y búsquedas guardadas para volver a opciones interesantes. Así puedes comparar con calma sin depender de recordar cada anuncio.',
          },
        ],
      },
      en: {
        category: 'Buying',
        title: 'Ideas for finding great opportunities',
        description: 'How to use search, filters, location, and favorites to find relevant listings without wasting time.',
        sections: [
          {
            title: 'Start with a specific search',
            body: 'Combine specific terms with category, location, and price range. A well-defined filter removes results that do not match what you need.',
          },
          {
            title: 'Compare before deciding',
            body: 'Review several similar listings and pay attention to condition, location, and the information provided. A low price alone does not make a listing a good opportunity.',
          },
          {
            title: 'Save what deserves another look',
            body: 'Use favorites and saved searches to return to interesting options. That lets you compare calmly without relying on memory.',
          },
        ],
      },
    },
  },
]);

const materializeArticle = (article, lang = 'es') => {
  const locale = lang === 'es' ? 'es' : 'en';
  return Object.freeze({
    slug: article.slug,
    updatedAt: article.updatedAt,
    readMinutes: article.readMinutes,
    ...article.translations[locale],
  });
};

export const BLOG_ARTICLES = Object.freeze(SOURCE_ARTICLES.map(article => materializeArticle(article, 'es')));

export function getBlogArticles(lang = 'es') {
  return SOURCE_ARTICLES.map(article => materializeArticle(article, lang));
}

export function getBlogArticle(slug = '', lang = 'es') {
  return getBlogArticles(lang).find(article => article.slug === slug) || null;
}
