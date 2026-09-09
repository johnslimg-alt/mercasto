export const FILTER_OPTION_LANGUAGES = ['en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];

const cache = {};
const loaders = {
  en: () => import('../constants/filterOptionTranslations/en.js'),
  pt: () => import('../constants/filterOptionTranslations/pt.js'),
  fr: () => import('../constants/filterOptionTranslations/fr.js'),
  zh: () => import('../constants/filterOptionTranslations/zh.js'),
  ko: () => import('../constants/filterOptionTranslations/ko.js'),
  de: () => import('../constants/filterOptionTranslations/de.js'),
  it: () => import('../constants/filterOptionTranslations/it.js'),
  ar: () => import('../constants/filterOptionTranslations/ar.js'),
  ru: () => import('../constants/filterOptionTranslations/ru.js'),
  ja: () => import('../constants/filterOptionTranslations/ja.js'),
};

const normalize = (language) => String(language || 'es').toLowerCase().split('-')[0];

// Runtime category attributes use durable machine values while the older frontend
// translation catalogs are keyed by their Spanish presentation values. Keep this
// bridge in one place so persisted canonical values remain presentation-safe.
const canonicalPresentation = {
  brand: {
    toyota: ['marca', 'Toyota'], nissan: ['marca', 'Nissan'], ford: ['marca', 'Ford'],
    chevrolet: ['marca', 'Chevrolet'], honda: ['marca', 'Honda'], volkswagen: ['marca', 'Volkswagen'],
    bmw: ['marca', 'BMW'], mercedes: ['marca', 'Mercedes-Benz'],
  },
  fuel: {
    gasolina: ['combustible', 'Gasolina'], diesel: ['combustible', 'Diésel'],
    hibrido: ['combustible', 'Híbrido'], electrico: ['combustible', 'Eléctrico'],
  },
  property_type: {
    casa: ['tipo', 'Casa'], departamento: ['tipo', 'Departamento'], terreno: ['tipo', 'Terreno'],
    local: ['tipo', 'Local comercial'], oficina: ['tipo', 'Oficina'], bodega: ['tipo', 'Bodega'],
  },
  contract_type: {
    indefinido: ['contrato', 'Indefinido'], temporal: ['contrato', 'Temporal'],
    beca: ['tipo_empleo', 'Prácticas'], autonomo: ['tipo_empleo', 'Freelance'],
  },
  working_hours: {
    completa: ['tipo_empleo', 'Tiempo completo'], parcial: ['tipo_empleo', 'Medio tiempo'],
  },
};

const presentationFieldAliases = {
  marca: ['brand'],
  combustible: ['fuel'],
  tipo: ['property_type'],
  contrato: ['contract_type'],
  // Legacy fallback schemas have used tipo_empleo for values now split between
  // contract_type and working_hours, so try both canonical definitions.
  tipo_empleo: ['working_hours', 'contract_type'],
};

function presentationEntry(fieldId, value) {
  const normalizedValue = String(value || '').trim().toLocaleLowerCase();
  const candidates = [fieldId, ...(presentationFieldAliases[fieldId] || [])];
  for (const candidate of candidates) {
    const entry = canonicalPresentation[candidate]?.[normalizedValue];
    if (entry) return entry;
  }
  return null;
}

export async function loadFilterOptionLanguage(language) {
  const lang = normalize(language);
  if (lang === 'es' || cache[lang]) return cache[lang] || null;
  const loader = loaders[lang];
  if (!loader) return null;
  const module = await loader();
  cache[lang] = module.default || module;
  return cache[lang];
}

export function filterOptionValue(option) {
  if (typeof option === 'string' || typeof option === 'number') return String(option);
  return String(option?.value ?? option?.label ?? '');
}

export function canonicalizeFilterOptionSelection(options, selection) {
  if (!Array.isArray(options) || selection == null) return selection;
  const canonicalizeOne = (item) => {
    if (typeof item !== 'string' && typeof item !== 'number') return item;
    const candidate = String(item).trim().toLocaleLowerCase();
    for (const option of options) {
      const canonical = filterOptionValue(option);
      if (!canonical) continue;
      if (canonical.trim().toLocaleLowerCase() === candidate) return canonical;
      if (option && typeof option === 'object' && typeof option.label === 'string'
        && option.label.trim().toLocaleLowerCase() === candidate) return canonical;
    }
    return item;
  };
  return Array.isArray(selection) ? selection.map(canonicalizeOne) : canonicalizeOne(selection);
}

export function filterOptionLabel(fieldId, canonicalValue, language = 'es') {
  const value = String(canonicalValue ?? '');
  if (!value) return value;
  const lang = normalize(language);
  const presentation = presentationEntry(fieldId, value);
  const displayValue = presentation?.[1] || value;

  if (lang === 'es') return displayValue;

  const direct = cache[lang]?.[fieldId]?.[value];
  if (direct) return direct;

  if (presentation) {
    const [legacyFieldId, legacyDisplayValue] = presentation;
    return cache[lang]?.[legacyFieldId]?.[legacyDisplayValue] || legacyDisplayValue;
  }

  return cache[lang]?.[fieldId]?.[value] || value;
}

export function filterOptionDisplayLabel(fieldId, option, language = 'es') {
  const value = filterOptionValue(option);
  if (!value) return value;
  const translated = filterOptionLabel(fieldId, value, language);
  if (translated !== value) return translated;
  if (option && typeof option === 'object' && typeof option.label === 'string' && option.label.trim()) {
    const label = option.label.trim();
    const lang = normalize(language);
    if (lang !== 'es') {
      const presentation = presentationEntry(fieldId, value);
      const legacyFieldId = presentation?.[0];
      const translatedLabel = legacyFieldId ? cache[lang]?.[legacyFieldId]?.[label] : null;
      if (translatedLabel) return translatedLabel;
    }
    return label;
  }
  return value;
}
