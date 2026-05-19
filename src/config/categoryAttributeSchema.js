export const CATEGORY_ATTRIBUTE_SCHEMA = {
  'coches-y-motor': {
    label: 'Autos y motor',
    fields: [
      { key: 'brand', label: 'Marca', type: 'text', placeholder: 'Toyota, Nissan, Volkswagen' },
      { key: 'model', label: 'Modelo', type: 'text', placeholder: 'Corolla, Versa, Jetta' },
      { key: 'year', label: 'Año', type: 'number', min: 1950, max: new Date().getFullYear() + 1 },
      { key: 'mileage_km', label: 'Kilometraje', type: 'number', min: 0, suffix: 'km' },
      {
        key: 'transmission',
        label: 'Transmisión',
        type: 'select',
        options: ['Manual', 'Automática'],
      },
      {
        key: 'fuel',
        label: 'Combustible',
        type: 'select',
        options: ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico'],
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
      {
        key: 'operation',
        label: 'Operación',
        type: 'select',
        options: ['Venta', 'Renta'],
      },
      {
        key: 'property_type',
        label: 'Tipo de inmueble',
        type: 'select',
        options: ['Casa', 'Departamento', 'Terreno', 'Local', 'Oficina', 'Bodega'],
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

  return null;
}

export function getCategoryAttributeFields(categorySlug = '') {
  return getCategoryAttributeSchema(categorySlug)?.fields || [];
}
