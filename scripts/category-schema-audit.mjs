import { categorySchema, resolveCategorySchema } from '../src/constants/categorySchema.js';

const productionCategories = [
  'coches', 'motor', 'inmobiliaria', 'empleo', 'servicios', 'electronica',
  'hogar', 'moda', 'deportes', 'infantil', 'mascotas', 'negocios',
  'formacion', 'ocio', 'boletos',
];

const errors = [];

for (const slug of productionCategories) {
  const schema = resolveCategorySchema(slug);
  if (!categorySchema[slug]) errors.push(`${slug}: missing category schema`);
  if (schema.subcategories.length === 0) errors.push(`${slug}: missing subcategories`);
  if (schema.attributes.length < 2) errors.push(`${slug}: insufficient attributes`);

  const attributeIds = schema.attributes.map((field) => field.id || field.key);
  if (new Set(attributeIds).size !== attributeIds.length) {
    errors.push(`${slug}: duplicate attribute ids`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`category schema audit passed: ${productionCategories.length} categories`);
