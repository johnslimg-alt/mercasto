import { filterConfig } from './filterConfig.js';

const labels = (es, en) => ({ es, en });

export const categorySchema = {
  coches: { aliases: ['motor'], label: labels('Autos', 'Cars'), subcategories: [
    ['autos', 'Autos', 'Cars'], ['motos', 'Motos', 'Motorcycles'], ['camionetas', 'Camionetas', 'Trucks'],
    ['camiones', 'Camiones', 'Commercial trucks'], ['refacciones', 'Refacciones', 'Parts'], ['autopartes', 'Autopartes', 'Auto parts'],
  ] },
  motor: { canonical: 'coches', label: labels('Autos', 'Cars') },
  inmobiliaria: { label: labels('Inmuebles', 'Real Estate'), subcategories: [
    ['casas-en-venta', 'Casas en venta', 'Homes for sale'], ['casas-en-renta', 'Casas en renta', 'Homes for rent'],
    ['departamentos', 'Departamentos', 'Apartments'], ['terrenos', 'Terrenos', 'Land'],
    ['locales-comerciales', 'Locales comerciales', 'Commercial'], ['oficinas', 'Oficinas', 'Offices'],
    ['bodegas', 'Bodegas', 'Warehouses'], ['renta-vacacional', 'Renta vacacional', 'Vacation rentals'],
  ] },
  empleo: { label: labels('Empleo', 'Jobs'), subcategories: [
    ['ventas', 'Ventas', 'Sales'], ['chofer', 'Chofer', 'Drivers'], ['construccion', 'Construcción', 'Construction'],
    ['administracion', 'Administración', 'Administration'], ['atencion-al-cliente', 'Atención al cliente', 'Customer service'],
    ['tecnologia', 'Tecnología', 'Technology'], ['hoteleria', 'Hotelería', 'Hospitality'], ['medio-tiempo', 'Medio tiempo', 'Part-time'],
  ] },
  servicios: { label: labels('Servicios', 'Services'), subcategories: [
    ['hogar', 'Hogar', 'Home'], ['reparaciones', 'Reparaciones', 'Repairs'], ['limpieza', 'Limpieza', 'Cleaning'],
    ['clases', 'Clases', 'Lessons'], ['eventos', 'Eventos', 'Events'], ['transporte', 'Transporte', 'Transport'],
    ['mascotas', 'Mascotas', 'Pets'], ['belleza', 'Belleza', 'Beauty'],
  ] },
  electronica: { label: labels('Electrónica', 'Electronics'), subcategories: [
    ['telefonos', 'Teléfonos', 'Phones'], ['laptops', 'Laptops', 'Laptops'], ['tablets', 'Tablets', 'Tablets'],
    ['tv-y-video', 'TV y video', 'TV & video'], ['audio', 'Audio', 'Audio'], ['camaras', 'Cámaras', 'Cameras'],
    ['drones', 'Drones', 'Drones'], ['accesorios', 'Accesorios', 'Accessories'],
  ] },
  hogar: { label: labels('Hogar y jardín', 'Home & Garden'), subcategories: [
    ['muebles', 'Muebles', 'Furniture'], ['electrodomesticos', 'Electrodomésticos', 'Appliances'],
    ['decoracion', 'Decoración', 'Decor'], ['herramientas', 'Herramientas', 'Tools'], ['jardin', 'Jardín', 'Garden'],
  ] },
  moda: { label: labels('Moda y belleza', 'Fashion & Beauty'), subcategories: [
    ['ropa-mujer', 'Ropa de mujer', "Women's clothing"], ['ropa-hombre', 'Ropa de hombre', "Men's clothing"],
    ['calzado', 'Calzado', 'Shoes'], ['bolsos', 'Bolsos', 'Bags'], ['accesorios', 'Accesorios', 'Accessories'],
  ] },
  deportes: { label: labels('Deportes y náutica', 'Sports'), subcategories: [
    ['bicicletas', 'Bicicletas', 'Bicycles'], ['gimnasio', 'Gimnasio', 'Fitness'], ['camping', 'Camping', 'Camping'],
    ['pesca', 'Pesca', 'Fishing'], ['surf', 'Surf', 'Surf'], ['nautica', 'Náutica', 'Marine'],
  ] },
  infantil: { label: labels('Infantil', 'Kids'), subcategories: [
    ['juguetes', 'Juguetes', 'Toys'], ['ropa', 'Ropa infantil', 'Kids clothing'], ['escolar', 'Escolar', 'School'],
    ['muebles', 'Muebles infantiles', 'Kids furniture'], ['seguridad', 'Seguridad', 'Safety'],
  ] },
  mascotas: { label: labels('Mascotas', 'Pets'), subcategories: [
    ['perros', 'Perros', 'Dogs'], ['gatos', 'Gatos', 'Cats'], ['aves', 'Aves', 'Birds'],
    ['accesorios', 'Accesorios', 'Accessories'], ['alimento', 'Alimento', 'Food'], ['servicios', 'Servicios', 'Services'],
  ] },
  negocios: { label: labels('Negocios', 'Business'), subcategories: [
    ['traspasos', 'Traspasos', 'Businesses for sale'], ['franquicias', 'Franquicias', 'Franchises'],
    ['maquinaria', 'Maquinaria', 'Machinery'], ['equipamiento', 'Equipamiento', 'Equipment'], ['inversion', 'Inversión', 'Investment'],
  ] },
  formacion: { label: labels('Formación y libros', 'Education'), subcategories: [
    ['libros', 'Libros', 'Books'], ['cursos', 'Cursos', 'Courses'], ['idiomas', 'Idiomas', 'Languages'],
    ['certificaciones', 'Certificaciones', 'Certifications'], ['material-escolar', 'Material escolar', 'School supplies'],
  ] },
  ocio: { label: labels('Ocio', 'Leisure'), subcategories: [
    ['videojuegos', 'Videojuegos', 'Video games'], ['coleccionismo', 'Coleccionismo', 'Collectibles'],
    ['fotografia', 'Fotografía', 'Photography'], ['instrumentos', 'Instrumentos', 'Instruments'], ['viajes', 'Viajes', 'Travel'],
  ] },
  boletos: { label: labels('Boletos', 'Tickets'), subcategories: [
    ['conciertos', 'Conciertos', 'Concerts'], ['deportes', 'Deportes', 'Sports'], ['teatro', 'Teatro y cultura', 'Theatre'],
    ['festivales', 'Festivales', 'Festivals'], ['conferencias', 'Conferencias', 'Conferences'],
  ] },
};

const normalizeSubcategories = (definition = {}) => (definition.subcategories || []).map(([slug, es, en]) => ({
  slug,
  label: labels(es, en),
}));

export const resolveCategorySchema = (category = '') => {
  const definition = categorySchema[category] || {};
  const canonical = definition.canonical || category;
  const canonicalDefinition = categorySchema[canonical] || definition;
  return {
    slug: category,
    canonical,
    label: definition.label || canonicalDefinition.label || labels(category, category),
    subcategories: normalizeSubcategories(canonicalDefinition),
    attributes: filterConfig[category] || filterConfig[canonical] || [],
  };
};

export const getCategoryFields = (category = '', subcategory = '') => (
  filterConfig[subcategory ? `${category}/${subcategory}` : category]
  || resolveCategorySchema(category).attributes
);
