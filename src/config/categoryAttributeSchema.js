export const CATEGORY_ATTRIBUTE_SCHEMA = {
  'coches-y-motor': {
    label: 'Autos y motor',
    fields: [
      { key: 'brand', label: 'Marca', type: 'text', placeholder: 'Toyota, Nissan, Volkswagen' },
      { key: 'model', label: 'Modelo', type: 'text', placeholder: 'Corolla, Versa, Jetta' },
      { key: 'year', label: 'Año', type: 'number', min: 1950, max: new Date().getFullYear() + 1 },
      { key: 'mileage_km', label: 'Kilometraje', type: 'number', min: 0, suffix: 'km' },
      {
        key: 'body_type',
        label: 'Carrocería',
        type: 'select',
        options: ['Sedán', 'Hatchback', 'SUV', 'Pickup', 'Van', 'Coupé', 'Convertible'],
      },
      {
        key: 'transmission',
        label: 'Transmisión',
        type: 'select',
        options: ['Manual', 'Automática', 'CVT'],
      },
      {
        key: 'fuel',
        label: 'Combustible',
        type: 'select',
        options: ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico'],
      },
      {
        key: 'seller_type',
        label: 'Tipo de vendedor',
        type: 'select',
        options: ['Particular', 'Agencia', 'Verificado'],
      },
    ],
  },
  inmobiliaria: {
    label: 'Inmuebles',
    fields: [
      { key: 'area_m2', label: 'Superficie', type: 'number', min: 0, suffix: 'm²' },
      { key: 'bedrooms', label: 'Recámaras', type: 'number', min: 0 },
      { key: 'bathrooms', label: 'Baños', type: 'number', min: 0 },
      { key: 'parking_spaces', label: 'Estacionamientos', type: 'number', min: 0 },
      { key: 'age_years', label: 'Antigüedad', type: 'number', min: 0, suffix: 'años' },
      {
        key: 'operation',
        label: 'Operación',
        type: 'select',
        options: ['Venta', 'Renta', 'Traspaso'],
      },
      {
        key: 'property_type',
        label: 'Tipo de inmueble',
        type: 'select',
        options: ['Casa', 'Departamento', 'Terreno', 'Local', 'Oficina', 'Bodega'],
      },
      {
        key: 'amenities',
        label: 'Amenidades',
        type: 'checkbox',
        options: ['Seguridad', 'Alberca', 'Gimnasio', 'Elevador', 'Pet friendly', 'Amueblado', 'Jardín'],
      },
    ],
  },
  empleo: {
    label: 'Empleo',
    fields: [
      { key: 'salary_min', label: 'Sueldo mínimo', type: 'number', min: 0, prefix: '$' },
      { key: 'salary_max', label: 'Sueldo máximo', type: 'number', min: 0, prefix: '$' },
      {
        key: 'employment_type',
        label: 'Tipo de empleo',
        type: 'select',
        options: ['Tiempo completo', 'Medio tiempo', 'Temporal', 'Freelance', 'Prácticas'],
      },
      {
        key: 'work_mode',
        label: 'Modalidad',
        type: 'select',
        options: ['Presencial', 'Remoto', 'Híbrido'],
      },
      {
        key: 'experience',
        label: 'Experiencia',
        type: 'select',
        options: ['Sin experiencia', '1-2 años', '3-5 años', 'Más de 5 años'],
      },
      {
        key: 'shift',
        label: 'Turno',
        type: 'select',
        options: ['Matutino', 'Vespertino', 'Nocturno', 'Mixto'],
      },
      {
        key: 'benefits',
        label: 'Beneficios',
        type: 'checkbox',
        options: ['Seguro', 'Prestaciones', 'Bonos', 'Vales', 'Capacitación'],
      },
    ],
  },
  servicios: {
    label: 'Servicios',
    fields: [
      {
        key: 'service_type',
        label: 'Tipo de servicio',
        type: 'select',
        options: ['Hogar', 'Profesionales', 'Tecnología', 'Transporte', 'Clases', 'Eventos', 'Belleza', 'Construcción', 'Mantenimiento'],
      },
      {
        key: 'service_mode',
        label: 'Modalidad',
        type: 'select',
        options: ['A domicilio', 'En local', 'En línea'],
      },
      {
        key: 'availability',
        label: 'Disponibilidad',
        type: 'checkbox',
        options: ['Hoy', 'Esta semana', '24/7', 'Fines de semana'],
      },
      { key: 'price_from', label: 'Precio desde', type: 'number', min: 0, prefix: '$' },
      {
        key: 'trust',
        label: 'Confianza',
        type: 'checkbox',
        options: ['Verificado', 'Con reseñas', 'Factura', 'Garantía'],
      },
    ],
  },
  electronica: {
    label: 'Electrónica',
    fields: [
      { key: 'brand', label: 'Marca', type: 'text', placeholder: 'Apple, Samsung, Xiaomi' },
      { key: 'model', label: 'Modelo', type: 'text', placeholder: 'iPhone 15, Galaxy S24, ThinkPad' },
      {
        key: 'condition_detail',
        label: 'Condición',
        type: 'select',
        options: ['Nuevo', 'Usado', 'Reacondicionado'],
      },
      {
        key: 'storage',
        label: 'Almacenamiento',
        type: 'select',
        options: ['32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB', '2 TB'],
      },
      {
        key: 'extras',
        label: 'Incluye',
        type: 'checkbox',
        options: ['Garantía', 'Factura', 'Caja original', 'Accesorios', 'Liberado'],
      },
    ],
  },
};

export function getCategoryAttributeSchema(categorySlug = '') {
  if (!categorySlug) return null;

  const normalized = String(categorySlug).toLowerCase();

  if (normalized.startsWith('coches-y-motor') || normalized.startsWith('coches') || normalized.startsWith('motor')) {
    return CATEGORY_ATTRIBUTE_SCHEMA['coches-y-motor'];
  }

  if (normalized.startsWith('inmobiliaria') || normalized.startsWith('inmuebles')) {
    return CATEGORY_ATTRIBUTE_SCHEMA.inmobiliaria;
  }

  if (normalized.startsWith('empleo') || normalized.startsWith('trabajo')) {
    return CATEGORY_ATTRIBUTE_SCHEMA.empleo;
  }

  if (normalized.startsWith('servicios')) {
    return CATEGORY_ATTRIBUTE_SCHEMA.servicios;
  }

  if (normalized.startsWith('electronica') || normalized.startsWith('electrónica') || normalized.startsWith('informatica') || normalized.startsWith('telefonia') || normalized.startsWith('moviles-y-telefonia')) {
    return CATEGORY_ATTRIBUTE_SCHEMA.electronica;
  }

  return null;
}

export function getCategoryAttributeFields(categorySlug = '') {
  return getCategoryAttributeSchema(categorySlug)?.fields || [];
}
