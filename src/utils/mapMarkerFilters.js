import { localizedText } from './localize.js';

const normalizedString = (value) => String(value ?? '').trim().toLowerCase();

const numericPrice = (marker, ad) => {
  const rawAdPrice = ad?.price;
  if (rawAdPrice !== null && rawAdPrice !== undefined && rawAdPrice !== '') {
    const value = Number(rawAdPrice);
    return Number.isFinite(value) ? value : null;
  }

  const labelNumber = String(marker?.label ?? '').replace(/[^\d.]/g, '');
  if (!labelNumber) return null;
  const value = Number(labelNumber);
  return Number.isFinite(value) ? value : null;
};

export function markerMatchesMapFilters(marker, filters = {}) {
  const ad = marker?.ad || {};
  const query = normalizedString(filters.query);
  const minPrice = filters.minPrice == null || filters.minPrice === '' ? null : Number(filters.minPrice);
  const maxPrice = filters.maxPrice == null || filters.maxPrice === '' ? null : Number(filters.maxPrice);
  const selectedState = normalizedString(filters.state);
  const selectedCity = normalizedString(filters.city);
  const selectedCategory = normalizedString(filters.category);
  const listingType = normalizedString(filters.listingType);
  const selectedConditions = Array.isArray(filters.condition)
    ? filters.condition.map(normalizedString).filter(Boolean)
    : [];
  const dynamicFilters = filters.dynamic && typeof filters.dynamic === 'object' ? filters.dynamic : {};

  if (query) {
    const text = [
      marker?.label,
      localizedText(ad.title),
      ad.location,
      ad.state,
      ad.city,
      ad.category,
    ].map(normalizedString).filter(Boolean).join(' ');
    if (!text.includes(query)) return false;
  }

  if (minPrice !== null || maxPrice !== null) {
    const price = numericPrice(marker, ad);
    if (price === null) return false;
    if (Number.isFinite(minPrice) && price < minPrice) return false;
    if (Number.isFinite(maxPrice) && price > maxPrice) return false;
  }

  if (filters.onlyWithCoords) {
    if (!(marker?.coords && marker.coords.length >= 2) || marker.approximate) return false;
  }

  if (selectedState && !normalizedString(ad.state).includes(selectedState)) return false;
  if (selectedCity && !normalizedString(ad.city).includes(selectedCity)) return false;
  if (selectedCategory && normalizedString(ad.category) !== selectedCategory) return false;
  if (listingType && normalizedString(ad.listing_type) !== listingType) return false;
  if (selectedConditions.length && !selectedConditions.includes(normalizedString(ad.condition))) return false;

  const attributes = ad.attributes && typeof ad.attributes === 'object' ? ad.attributes : {};
  for (const [key, expectedRaw] of Object.entries(dynamicFilters)) {
    if (['sort', 'location_state', 'location_city', 'listing_type'].includes(key)) continue;
    const expected = (Array.isArray(expectedRaw) ? expectedRaw : [expectedRaw])
      .map((value) => String(value ?? ''))
      .filter(Boolean);
    if (!expected.length) continue;

    const actualRaw = attributes[key] ?? ad[key];
    if (actualRaw === null || actualRaw === undefined || actualRaw === '') return false;
    const actual = (Array.isArray(actualRaw) ? actualRaw : [actualRaw]).map(String);
    if (!expected.some((value) => actual.includes(value))) return false;
  }

  return true;
}
