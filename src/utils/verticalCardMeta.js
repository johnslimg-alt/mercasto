function normalizeAttributes(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}

function displayValue(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return displayValue(value.es ?? value.en ?? Object.values(value)[0]);
  }
  return '';
}

function formatMileage(value) {
  const raw = displayValue(value);
  if (!raw) return '';
  const numeric = Number(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) && numeric >= 0
    ? `${numeric.toLocaleString('es-MX')} km`
    : raw;
}

function compact(values) {
  return values.map(displayValue).filter(Boolean);
}

export function getVerticalCardMeta(ad = {}, variant = '') {
  const attributes = normalizeAttributes(ad.attributes);
  const type = String(variant || ad.category || '').toLowerCase();

  if (type === 'autos' || type === 'motor') {
    return {
      primary: compact([attributes.marca, attributes.modelo, attributes.year]),
      secondary: [formatMileage(attributes.km), displayValue(attributes.combustible)].filter(Boolean),
    };
  }

  if (type === 'services' || type === 'servicios') {
    return {
      primary: compact([attributes.tipo, attributes.modalidad]),
      secondary: compact([attributes.experiencia_servicio, attributes.tipo_cobro]),
    };
  }

  return { primary: [], secondary: [] };
}
