import { filterOptionLabel } from './filterOptionTranslations.js';
import { formatNumber } from './localeFormat.js';

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

function displayValue(value, lang = 'es') {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) return value.map(item => displayValue(item, lang)).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return displayValue(value[lang] ?? value.en ?? value.es ?? Object.values(value)[0], lang);
  }
  return '';
}

function formatMileage(value, lang = 'es') {
  const raw = displayValue(value, lang);
  if (!raw) return '';
  const numeric = Number(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) && numeric >= 0
    ? `${formatNumber(numeric, lang)} km`
    : raw;
}

function compact(values, lang = 'es') {
  return values.map(value => displayValue(value, lang)).filter(Boolean);
}

function localizedAttributeValue(fieldId, value, lang = 'es') {
  if (Array.isArray(value)) {
    return value.map(item => localizedAttributeValue(fieldId, item, lang)).filter(Boolean).join(', ');
  }
  const raw = displayValue(value, lang);
  return raw ? filterOptionLabel(fieldId, raw, lang) : '';
}

export function getVerticalCardMeta(ad = {}, variant = '', lang = 'es') {
  const attributes = normalizeAttributes(ad.attributes);
  const type = String(variant || ad.category || '').toLowerCase();

  if (type === 'autos' || type === 'motor') {
    return {
      primary: compact([attributes.marca, attributes.modelo, attributes.year], lang),
      secondary: [formatMileage(attributes.km, lang), localizedAttributeValue('combustible', attributes.combustible, lang)].filter(Boolean),
    };
  }

  if (type === 'services' || type === 'servicios') {
    return {
      primary: [
        localizedAttributeValue('tipo', attributes.tipo, lang),
        localizedAttributeValue('modalidad', attributes.modalidad, lang),
      ].filter(Boolean),
      secondary: [
        localizedAttributeValue('experiencia_servicio', attributes.experiencia_servicio, lang),
        localizedAttributeValue('tipo_cobro', attributes.tipo_cobro, lang),
      ].filter(Boolean),
    };
  }

  return { primary: [], secondary: [] };
}
