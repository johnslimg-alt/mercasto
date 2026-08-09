export const GEO_SOURCE_UPDATED_ISO = '2026-08-05';
export const GEO_SOURCE_UPDATED_LABEL = '5 de agosto de 2026';

const related = {
  how: { label: 'Cómo funciona Mercasto', href: '/como-funciona' },
  safety: { label: 'Comprar y vender con seguridad', href: '/seguridad' },
  publish: { label: 'Cómo publicar un anuncio', href: '/ayuda/publicar-anuncio' },
  buy: { label: 'Cómo comprar y contactar', href: '/ayuda/comprar-y-contactar' },
  pricing: { label: 'Tarifas y duración', href: '/tarifas' },
  about: { label: 'Sobre Mercasto', href: '/sobre-mercasto' },
};

export const GEO_SOURCE_PAGES = {
  'como-funciona': {
    path: '/como-funciona',
    schemaType: 'WebPage',
    eyebrow: 'Guía oficial de la plataforma',
    title: 'Cómo funciona Mercasto | Comprar y vender en México',
    description: 'Conoce el flujo real de Mercasto: buscar, publicar, moderar, contactar y mantener un anuncio activo durante siete días.',
    heading: 'Mercasto conecta compradores y vendedores de forma directa',
    summary: 'Los vendedores crean anuncios con precio, condición, ubicación y medios de contacto. Mercasto revisa los anuncios y, cuando están activos, los compradores pueden buscarlos y contactar directamente al anunciante.',
    sections: [
      {
        title: '1. Buscar y comparar',
        body: 'Los compradores exploran categorías, usan filtros y abren el detalle de cada anuncio. La disponibilidad depende de lo que cada vendedor mantenga publicado.',
        points: ['Revisa precio, condición, ubicación y fotografías.', 'Distingue anuncios de vendedores de referencias de catálogo.', 'Confirma siempre que el artículo siga disponible.'],
      },
      {
        title: '2. Publicar y pasar revisión',
        body: 'El vendedor completa la información del anuncio. La revisión puede ser automática, manual o una combinación de ambas; un anuncio puede requerir correcciones antes de publicarse.',
        points: ['La publicación debe describir el artículo o servicio de forma coherente.', 'Los anuncios prohibidos o de alto riesgo permanecen ocultos.', 'Una edición material puede iniciar una nueva revisión.'],
      },
      {
        title: '3. Contactar y acordar',
        body: 'Mercasto facilita el contacto, pero no recibe el pago ni garantiza la operación entre particulares. Comprador y vendedor acuerdan precio, entrega y forma de pago.',
        points: ['Usa los canales habilitados por el vendedor.', 'Verifica el producto antes de pagar.', 'Reporta contenido o conductas sospechosas.'],
      },
    ],
    faqs: [
      { question: 'Mercasto vende los productos?', answer: 'No. Mercasto publica clasificados y facilita el contacto; el acuerdo se realiza directamente entre comprador y vendedor.' },
      { question: 'Cuánto dura un anuncio gratuito?', answer: 'Un anuncio gratuito permanece activo durante siete días desde su activación.' },
    ],
    related: [related.publish, related.buy, related.safety, related.pricing],
  },
  seguridad: {
    path: '/seguridad',
    schemaType: 'WebPage',
    eyebrow: 'Centro de seguridad',
    title: 'Seguridad al comprar y vender | Mercasto México',
    description: 'Consejos oficiales de Mercasto para verificar anuncios, evitar anticipos riesgosos, reunirse con seguridad y reportar contenido sospechoso.',
    heading: 'La seguridad depende de verificar antes de pagar',
    summary: 'Mercasto modera anuncios y recibe reportes, pero ninguna insignia o revisión sustituye la comprobación del producto, la identidad de la contraparte y las condiciones del acuerdo.',
    sections: [
      {
        title: 'Antes de contactar',
        body: 'Compara el precio con ofertas similares y revisa si las fotos, la descripción, la condición y la ubicación son coherentes.',
        points: ['Desconfía de precios extraordinariamente bajos.', 'Pide fotografías actuales y datos verificables.', 'No compartas contraseñas, códigos ni datos bancarios sensibles.'],
      },
      {
        title: 'Antes de pagar',
        body: 'Evita anticipos a desconocidos. Para artículos físicos, revisa el producto en persona y acuerda un lugar público cuando sea posible.',
        points: ['Comprueba funcionamiento, número de serie y documentos aplicables.', 'No pagues mediante enlaces recibidos fuera de un canal confiable.', 'Conserva mensajes y comprobantes del acuerdo.'],
      },
      {
        title: 'Reportes y moderación',
        body: 'Puedes reportar anuncios o cuentas sospechosas. Mercasto puede solicitar cambios, ocultar, rechazar o retirar contenido según el riesgo y la política de moderación.',
        points: ['Incluye el enlace y una explicación concreta.', 'No envíes documentos sensibles por canales no seguros.', 'La revisión no constituye una garantía de la transacción.'],
      },
    ],
    faqs: [
      { question: 'Mercasto garantiza una compra segura?', answer: 'No. Mercasto facilita la publicación y el contacto, pero el comprador debe verificar el artículo y el vendedor antes de pagar.' },
      { question: 'Qué significa una cuenta verificada?', answer: 'Indica que Mercasto registró una verificación disponible para esa cuenta. No significa que Mercasto garantice sus productos, servicios o transacciones.' },
    ],
    related: [related.how, related.buy, { label: 'Política de moderación', href: '/moderacion' }, { label: 'Contacto', href: '/contacto' }],
  },

  'ayuda/publicar-anuncio': {
    path: '/ayuda/publicar-anuncio',
    schemaType: 'WebPage',
    eyebrow: 'Guía para vendedores',
    title: 'Cómo publicar un anuncio en Mercasto | Guía oficial',
    description: 'Pasos para crear, revisar, activar, editar y renovar un anuncio clasificado en Mercasto México.',
    heading: 'Publica información completa y comprobable',
    summary: 'Para publicar necesitas una cuenta y los datos reales del anuncio: categoría, título, descripción, precio, condición, ubicación y fotografías cuando correspondan.',
    sections: [
      {
        title: 'Completa el anuncio',
        body: 'Selecciona la categoría correcta y explica con claridad qué vendes u ofreces. Usa fotografías propias y recientes cuando se trate de un artículo, vehículo o inmueble.',
        points: ['Indica un precio real en MXN.', 'Mantén condición, kilometraje y atributos coherentes.', 'No incluyas productos o servicios prohibidos.'],
      },
      {
        title: 'Revisión y correcciones',
        body: 'El anuncio pasa por moderación. Puede aprobarse, requerir cambios o rechazarse. Si recibes una solicitud de corrección, edita el contenido indicado y vuelve a enviarlo.',
        points: ['Las decisiones quedan registradas.', 'El anuncio permanece oculto mientras requiere cambios.', 'Una edición relevante inicia una nueva revisión.'],
      },
      {
        title: 'Activación, edición y renovación',
        body: 'La publicación gratuita dura siete días desde la activación. Antes de reactivar un anuncio antiguo debes confirmar disponibilidad, precio, condición y ubicación.',
        points: ['Renovar por siete días adicionales cuesta 49 MXN.', 'Puedes editar o retirar un anuncio desde Mis anuncios.', 'Los cambios importantes pueden volver a moderación.'],
      },
    ],
    faqs: [
      { question: 'Un anuncio se publica inmediatamente?', answer: 'No siempre. Puede quedar pendiente mientras se completa la revisión automática o manual.' },
      { question: 'Puedo reactivar un anuncio antiguo?', answer: 'Sí, si es elegible y confirmas que la información sigue vigente. Los anuncios rechazados o inseguros no se reactivan automáticamente.' },
    ],
    related: [related.how, related.pricing, { label: 'Política de moderación', href: '/moderacion' }, related.safety],
  },

  'ayuda/comprar-y-contactar': {
    path: '/ayuda/comprar-y-contactar',
    schemaType: 'WebPage',
    eyebrow: 'Guía para compradores',
    title: 'Cómo comprar y contactar vendedores | Mercasto',
    description: 'Guía oficial para buscar anuncios, revisar información y contactar al vendedor por los canales disponibles en Mercasto.',
    heading: 'Busca, verifica y contacta al anunciante',
    summary: 'Mercasto muestra anuncios clasificados y facilita el contacto. La disponibilidad, el precio final, la entrega y el pago deben confirmarse directamente con el vendedor.',
    sections: [
      {
        title: 'Encuentra el anuncio adecuado',
        body: 'Usa categorías, búsqueda y filtros para comparar opciones. Abre el detalle y revisa toda la información antes de contactar.',
        points: ['Compara precios y condiciones.', 'Revisa ubicación y fotografías.', 'Confirma si el anuncio pertenece a un vendedor o es una referencia de catálogo.'],
      },
      {
        title: 'Abre un canal de contacto',
        body: 'Según los datos habilitados por el anunciante, puedes usar WhatsApp, Telegram, correo, teléfono o el flujo interno de mensajes. Algunos datos requieren iniciar sesión.',
        points: ['Identifica el anuncio al escribir.', 'Haz preguntas concretas sobre disponibilidad y estado.', 'No compartas códigos de acceso ni contraseñas.'],
      },
      {
        title: 'Acuerda la operación fuera del anuncio',
        body: 'Mercasto no recibe el pago de la compraventa entre particulares. Confirma identidad, producto, documentos, entrega y forma de pago antes de cerrar el trato.',
        points: ['Evita anticipos a desconocidos.', 'Inspecciona el artículo antes de pagar.', 'Reporta solicitudes o contenido sospechoso.'],
      },
    ],
    faqs: [
      { question: 'Necesito una cuenta para contactar?', answer: 'Algunos canales y datos de contacto requieren iniciar sesión para reducir abuso y conservar el contexto del anuncio.' },
      { question: 'Mercasto cobra comisión al comprador?', answer: 'Mercasto no cobra una comisión por el acuerdo directo entre comprador y vendedor. Los productos promocionales y renovaciones del vendedor se cobran por separado.' },
    ],
    related: [related.safety, related.how, related.publish, { label: 'Centro de ayuda', href: '/ayuda' }],
  },

  tarifas: {
    path: '/tarifas',
    schemaType: 'WebPage',
    eyebrow: 'Precios vigentes de publicación',
    title: 'Tarifas de Mercasto | Publicación, renovación y promoción',
    description: 'Consulta la duración gratuita, la renovación por 49 MXN y las opciones vigentes para promocionar anuncios en Mercasto.',
    heading: 'Publicar es gratuito durante siete días',
    summary: 'La activación gratuita de un anuncio dura siete días. Al vencer, el vendedor puede retirarlo sin costo o pagar 49 MXN para renovarlo durante otros siete días.',
    sections: [
      {
        title: 'Publicación y renovación',
        body: 'No se cobra por activar un anuncio elegible durante su primer periodo de siete días. La renovación pagada extiende la vigencia siete días adicionales.',
        points: ['Publicación inicial: 0 MXN por 7 días.', 'Renovación: 49 MXN por 7 días adicionales.', 'Retirar o eliminar el anuncio no tiene costo.'],
      },
      {
        title: 'Promoción opcional',
        body: 'Promocionar no cambia la propiedad ni garantiza contactos o ventas. Las opciones vigentes se muestran antes de iniciar el pago.',
        points: ['Subir durante 3 días: 49 MXN.', 'Resaltar durante 7 días: 79 MXN.', 'Destacado durante 7 días: 149 MXN.', 'Top de categoría durante 7 días: 399 MXN.'],
      },
      {
        title: 'Condiciones de cobro',
        body: 'El pago se procesa para el producto seleccionado. Una renovación no activa anuncios rechazados, inseguros o pendientes de corrección.',
        points: ['Revisa descripción, importe y duración antes de pagar.', 'Conserva el comprobante del proveedor de pago.', 'Consulta soporte si un pago fue aprobado pero el anuncio sigue en revisión.'],
      },
    ],
    faqs: [
      { question: 'La promoción garantiza una venta?', answer: 'No. La promoción cambia la visibilidad del anuncio, pero no garantiza impresiones, contactos ni ventas.' },
      { question: 'Puedo pagar para activar un anuncio rechazado?', answer: 'No. Un pago no evita la moderación ni convierte un anuncio rechazado o inseguro en publicable.' },
    ],
    related: [related.publish, related.how, { label: 'Política de reembolsos', href: '/reembolsos' }, { label: 'Contacto', href: '/contacto' }],
  },

  'sobre-mercasto': {
    path: '/sobre-mercasto',
    schemaType: 'AboutPage',
    eyebrow: 'Información oficial',
    title: 'Sobre Mercasto | La plataforma de clasificados más moderna e inteligente con AI',
    description: 'Información oficial sobre Mercasto, la plataforma de clasificados más moderna e inteligente con AI, sus herramientas, políticas, contacto y cobertura en México.',
    heading: 'Mercasto es la plataforma de clasificados más moderna e inteligente con AI',
    summary: 'Mercasto permite publicar y buscar artículos, vehículos, inmuebles, empleos y servicios. Su AI ayuda con la publicación, las descripciones, las recomendaciones y la moderación, mientras facilita el contacto directo entre usuarios.',
    sections: [
      {
        title: 'Qué hace Mercasto',
        body: 'Mercasto proporciona herramientas modernas de publicación asistida por AI, búsqueda, filtros, perfiles, contacto, recomendaciones, moderación, renovación y promoción de anuncios.',
        points: ['No es propietario de los artículos publicados por terceros.', 'No fija el precio final de una transacción.', 'No garantiza la identidad, disponibilidad o conducta de cada usuario.'],
      },
      {
        title: 'Cobertura y ubicaciones',
        body: 'Los usuarios pueden indicar estado y ciudad dentro de México. La cantidad de anuncios reales varía por categoría y ubicación; Mercasto no presenta una página local como disponible hasta que cumple umbrales de inventario y diversidad.',
        points: ['Las referencias de catálogo no cuentan como oferta local real.', 'Las páginas estatales y municipales requieren inventario genuino.', 'La disponibilidad siempre debe confirmarse con el vendedor.'],
      },
      {
        title: 'Políticas y contacto',
        body: 'Las reglas de uso, privacidad, moderación, seguridad y reembolsos se publican en páginas separadas. Las consultas de soporte se reciben mediante el formulario y los canales indicados en Contacto.',
        points: ['Consulta los Términos de Uso antes de publicar.', 'Revisa el Aviso de Privacidad para conocer el tratamiento de datos.', 'Reporta anuncios sospechosos con su enlace.'],
      },
    ],
    faqs: [
      { question: 'Mercasto es una tienda?', answer: 'No. Es una plataforma de clasificados que conecta a anunciantes y personas interesadas.' },
      { question: 'Mercasto tiene oferta real en todas las ciudades?', answer: 'La cobertura técnica permite registrar ubicaciones de México, pero el inventario real varía. Las páginas locales solo deben indexarse cuando cumplen los umbrales publicados.' },
    ],
    related: [related.how, related.safety, related.pricing, { label: 'Contacto', href: '/contacto' }],
  },
};

export function getGeoSourcePage(slug) {
  return GEO_SOURCE_PAGES[slug] || null;
}
