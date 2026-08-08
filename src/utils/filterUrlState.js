const FILTER_KEY_RE = /^[a-zA-Z0-9_-]+$/;
const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== '';

export function appendDynamicFilters(params, dynamicFilters = {}) {
  if (!(params instanceof URLSearchParams) || !dynamicFilters || typeof dynamicFilters !== 'object') return params;

  Object.keys(dynamicFilters).sort().forEach((key) => {
    if (!FILTER_KEY_RE.test(key)) return;
    const value = dynamicFilters[key];

    if (Array.isArray(value)) {
      [...new Set(value.filter(hasValue).map(String))].forEach((item) => params.append(`filters[${key}][]`, item));
      return;
    }

    if (value && typeof value === 'object') {
      Object.keys(value).sort().forEach((subKey) => {
        const subValue = value[subKey];
        if (FILTER_KEY_RE.test(subKey) && hasValue(subValue)) params.set(`filters[${key}][${subKey}]`, String(subValue));
      });
      return;
    }

    if (hasValue(value)) params.set(`filters[${key}]`, String(value));
  });

  return params;
}

export function parseDynamicFilters(params) {
  const result = {};
  if (!(params instanceof URLSearchParams)) return result;

  for (const [name, value] of params.entries()) {
    const match = name.match(/^filters\[([a-zA-Z0-9_-]+)\](?:\[([a-zA-Z0-9_-]*)\])?$/);
    if (!match || !hasValue(value)) continue;
    const [, key, subKey] = match;

    if (subKey === '') {
      const current = Array.isArray(result[key]) ? result[key] : [];
      result[key] = [...new Set([...current, value])];
    } else if (subKey) {
      const current = result[key] && typeof result[key] === 'object' && !Array.isArray(result[key]) ? result[key] : {};
      result[key] = { ...current, [subKey]: value };
    } else {
      result[key] = value;
    }
  }

  return result;
}
