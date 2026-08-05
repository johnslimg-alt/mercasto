export const VERTICAL_SEO_ROUTES = Object.freeze({
  '/ocio': {
    name: 'Ocio y Deportes',
    title: 'Ocio, Deportes y Coleccionismo en México | Mercasto',
    description: 'Explora anuncios de bicicletas, deporte, instrumentos musicales, libros, arte y coleccionismo publicados en México.',
  },
  '/boletos': {
    name: 'Boletos',
    title: 'Boletos para Conciertos y Eventos en México | Mercasto',
    description: 'Encuentra anuncios de boletos para conciertos, deportes, teatro, festivales y otros eventos en México.',
  },
  '/empleos': {
    name: 'Empleos',
    title: 'Empleos y Vacantes en México | Mercasto',
    description: 'Explora vacantes y oportunidades laborales publicadas en México por área, modalidad y ubicación.',
  },
  '/moda': {
    name: 'Moda',
    title: 'Moda en México — Ropa, Calzado y Accesorios | Mercasto',
    description: 'Explora anuncios de ropa, calzado, bolsos, accesorios, cosmética y joyería nueva o usada publicados en México.',
  },
  '/hogar': {
    name: 'Hogar',
    title: 'Muebles y Artículos para el Hogar en México | Mercasto',
    description: 'Explora anuncios de muebles, decoración, electrodomésticos, cocina, jardín y herramientas en México.',
  },
  '/electronica': {
    name: 'Electrónica',
    title: 'Electrónica en México — Compra y Venta | Mercasto',
    description: 'Explora anuncios de televisores, audio, cámaras, consolas, computadoras y accesorios electrónicos en México.',
  },
  '/servicios': {
    name: 'Servicios',
    title: 'Servicios Profesionales en México | Mercasto',
    description: 'Encuentra anuncios de reparaciones, limpieza, clases, diseño, eventos, transporte y otros servicios en México.',
  },
  '/motor': {
    name: 'Motor',
    title: 'Autos, Motos y Refacciones en México | Mercasto',
    description: 'Explora anuncios de autos, motos, camionetas, camiones, autopartes y refacciones publicados en México.',
  },
  '/inmuebles': {
    name: 'Inmuebles',
    title: 'Inmuebles en Venta y Renta en México | Mercasto',
    description: 'Explora anuncios de casas, departamentos, terrenos, locales y oficinas en venta o renta publicados en México.',
  },
  '/infantil': {
    name: 'Infantil y Bebés',
    title: 'Artículos Infantiles y para Bebés en México | Mercasto',
    description: 'Explora anuncios de juguetes, ropa infantil, carriolas, cunas y artículos para bebés en México.',
  },
  '/mascotas': {
    name: 'Mascotas',
    title: 'Mascotas, Accesorios y Servicios en México | Mercasto',
    description: 'Explora anuncios de adopción, alimento, accesorios y servicios para mascotas publicados en México.',
  },
  '/negocios': {
    name: 'Negocios',
    title: 'Negocios, Franquicias e Inversiones en México | Mercasto',
    description: 'Explora anuncios de negocios en venta, traspasos, franquicias, maquinaria y oportunidades de inversión en México.',
  },
  '/productos': {
    name: 'Productos',
    title: 'Productos Nuevos y Usados en México | Mercasto',
    description: 'Explora categorías de productos nuevos y usados publicados en México: electrónica, hogar, moda, ocio, infantil y más.',
  },
  '/turismo': {
    name: 'Turismo',
    title: 'Turismo, Hospedaje y Actividades en México | Mercasto',
    description: 'Explora anuncios de hospedaje, tours, actividades, transporte, artículos de viaje y experiencias en México.',
  },
});

export function getVerticalSeo(pathname = '') {
  return VERTICAL_SEO_ROUTES[pathname] || null;
}

export const VERTICAL_CANONICAL_ALIASES = Object.freeze({
  '/tecnologia': '/electronica',
  '/telefonos': '/electronica',
  '/hospedaje': '/turismo',
  '/tours': '/turismo',
  '/boletos_turismo': '/turismo',
  '/articulos_camping': '/turismo',
  '/souvenirs': '/turismo',
  '/renta_vehiculos': '/turismo',
  '/guias_servicios': '/turismo',
  '/atracciones_exp': '/turismo',
  '/retiros_bienestar': '/turismo',
});

export function getVerticalCanonicalAlias(pathname = '') {
  return VERTICAL_CANONICAL_ALIASES[pathname] || null;
}
