const FILTER_KEY_RE = /^[a-zA-Z0-9_-]+$/;

const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== '';

export function appendDynamicFilters(params, dynamicFilters = {}) {
  if (!(params instanceof URLSearchParams) || !dynamicFilters || typeof dynamicFilters !== 'object') return params;

  for (const [key, value] of Object.entries(dynamicFilters)) {
    if (!FILTER_KEY_RE.test(key)) continue;

    if (Array.isArray(value)) {
      value.filter(hasValue).forEach(item => params.append(`filters[${key}][]`, String(item)));
      continue;
    }

    if (value && typeof value === 'object') {
      for (const [subKey, subValue] of Object.entries(value)) {
        if (!FILTER_KEY_RE.test(subKey) || !hasValue(subValue)) continue;
        params.set(`filters[${key}][${subKey}]`, String(subValue));
      }
      continue;
    }

    if (hasValue(value)) params.set(`filters[${key}]`, String(value));
  }

  return params;
}
export function parseDynamicFilters(params) {
  const result = {};
  if (!(params instanceof URLSearchParams)) return result;

  for (const [name, value] of params.entries()) {
    const match = name.match(/^filters\[([a-zA-Z0-9_-]+)\](?:\[([a-zA-Z0-9_-]*)\])?$/);
    if (!match) continue;

    const [, key, subKey] = match;
    if (subKey === '') {
      const current = Array.isArray(result[key]) ? result[key] : [];
      result[key] = [...current, value];
    } else if (subKey) {
      const current = result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])
        ? result[key]
        : {};
      result[key] = { ...current, [subKey]: value };
    } else {
      result[key] = value;
    }
  }

  return result;
}