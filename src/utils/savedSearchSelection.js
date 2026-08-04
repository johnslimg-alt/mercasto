function clean(value) {
  return value == null ? '' : String(value).trim();
}

export function normalizeSavedSearchSelection(filters = {}) {
  return {
    query: clean(filters.query),
    category: clean(filters.category),
    state: clean(filters.state || filters.city),
    minPrice: clean(filters.min_price),
    maxPrice: clean(filters.max_price),
  };
}
