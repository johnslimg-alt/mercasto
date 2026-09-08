const INTERNAL_ATTRIBUTE_PREFIXES = ['catalog_', 'editorial_'];

export function isPublicListingAttributeKey(key) {
  const normalized = String(key || '').trim().toLowerCase();
  if (!normalized) return false;
  return !INTERNAL_ATTRIBUTE_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

export function publicListingAttributeEntries(attributes) {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return [];
  return Object.entries(attributes).filter(([key, value]) => (
    isPublicListingAttributeKey(key)
    && value !== null
    && value !== undefined
    && value !== ''
  ));
}
