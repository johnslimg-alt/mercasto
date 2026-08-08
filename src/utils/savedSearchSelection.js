function clean(value) {
  return value == null ? '' : String(value).trim();
}

function cleanList(value) {
  const items = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? value.split(',') : []);
  return [...new Set(items.map(clean).filter(Boolean))];
}

function hasDynamicValue(value) {
  if (Array.isArray(value)) return value.some((item) => clean(item));
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => clean(item));
  }
  return Boolean(clean(value));
}

function cleanDynamicValue(value) {
  if (Array.isArray(value)) return [...new Set(value.map(clean).filter(Boolean))];
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, clean(item)])
        .filter(([, item]) => item),
    );
  }
  return clean(value);
}
const RESERVED_KEYS = new Set([
  'query', 'category', 'category_slug', 'state', 'city',
  'min_price', 'max_price', 'filters', 'dynamicFilters', 'condition',
  'name', 'id', 'is_active', 'category_id', 'created_at', 'updated_at',
]);

export function normalizeSavedSearchSelection(filters = {}) {
  const nestedFilters = filters.filters && typeof filters.filters === 'object' && !Array.isArray(filters.filters)
    ? filters.filters
    : {};
  const explicitDynamic = filters.dynamicFilters && typeof filters.dynamicFilters === 'object' && !Array.isArray(filters.dynamicFilters)
    ? filters.dynamicFilters
    : {};
  const dynamicFilters = { ...nestedFilters, ...explicitDynamic };

  Object.entries(filters).forEach(([key, value]) => {
    if (!RESERVED_KEYS.has(key)) dynamicFilters[key] = value;
  });
  delete dynamicFilters.condition;

  Object.keys(dynamicFilters).forEach((key) => {
    const value = dynamicFilters[key];
    if (!hasDynamicValue(value)) delete dynamicFilters[key];
    else dynamicFilters[key] = cleanDynamicValue(value);
  });
  const conditionSource = Object.prototype.hasOwnProperty.call(filters, 'condition')
    ? filters.condition
    : nestedFilters.condition;

  return {
    query: clean(filters.query),
    category: clean(filters.category || filters.category_slug),
    state: clean(filters.state || filters.city),
    city: clean(filters.city),
    minPrice: clean(filters.min_price),
    maxPrice: clean(filters.max_price),
    condition: cleanList(conditionSource),
    dynamicFilters,
  };
}
