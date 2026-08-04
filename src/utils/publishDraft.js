export const PUBLISH_DRAFT_KEY = 'mercasto.publish_draft.v1';
export const PUBLISH_DRAFT_VERSION = 1;
export const PUBLISH_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

const FORM_STRING_FIELDS = [
  'title',
  'price',
  'description',
  'location',
  'city',
  'state',
  'latitude',
  'longitude',
  'category',
  'subcategory',
  'condition',
];
const CONTACT_METHODS = new Set(['phone', 'whatsapp', 'telegram']);
const WA_MODES = new Set(['phone', 'username']);

function browserSessionStorage() {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function boundedString(value, maxLength = 5000) {
  if (value == null) return '';
  return String(value).slice(0, maxLength);
}

function sanitizeAttributeValue(value) {
  if (typeof value === 'string') return boundedString(value, 500);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map(sanitizeAttributeValue)
      .filter((item) => item !== undefined);
  }
  return undefined;
}

function sanitizeAttributes(attributes) {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return {};
  return Object.fromEntries(
    Object.entries(attributes)
      .slice(0, 80)
      .map(([key, value]) => [boundedString(key, 100), sanitizeAttributeValue(value)])
      .filter(([key, value]) => key && value !== undefined),
  );
}

export function sanitizePublishForm(form = {}) {
  const result = {};
  FORM_STRING_FIELDS.forEach((field) => {
    const maxLength = field === 'description' ? 12000 : field === 'title' ? 240 : 1000;
    result[field] = boundedString(form[field], maxLength);
  });
  result.condition = result.condition || 'nuevo';
  result.attributes = sanitizeAttributes(form.attributes);
  return result;
}

export function isPublishFormEmpty(form = {}) {
  const safe = sanitizePublishForm(form);
  return ![
    safe.title,
    safe.price,
    safe.description,
    safe.location,
    safe.city,
    safe.state,
    safe.category,
    safe.subcategory,
    safe.latitude,
    safe.longitude,
    ...Object.values(safe.attributes),
  ].some((value) => Array.isArray(value) ? value.length > 0 : String(value ?? '').trim());
}

export function sanitizePublishContact(contact = {}) {
  const methods = Array.isArray(contact.contactMethods)
    ? [...new Set(contact.contactMethods.filter((method) => CONTACT_METHODS.has(method)))].slice(0, 3)
    : [];
  return {
    contactMethods: methods,
    waMode: WA_MODES.has(contact.waMode) ? contact.waMode : 'phone',
    phoneValue: boundedString(contact.phoneValue, 40),
    waUsername: boundedString(contact.waUsername, 80).replace(/^@/, ''),
    telegramValue: boundedString(contact.telegramValue, 80).replace(/^@/, ''),
  };
}

export function createPublishDraft(input = {}, now = Date.now()) {
  const step = Math.min(3, Math.max(1, Number.parseInt(input.step, 10) || 1));
  return {
    version: PUBLISH_DRAFT_VERSION,
    savedAt: Number.isFinite(now) ? now : Date.now(),
    step,
    form: sanitizePublishForm(input.form),
    contact: sanitizePublishContact(input.contact),
  };
}

export function writePublishDraft(input, storage = browserSessionStorage(), now = Date.now()) {
  if (!storage) return false;
  const draft = createPublishDraft(input, now);
  if (isPublishFormEmpty(draft.form)) {
    clearPublishDraft(storage);
    return false;
  }
  try {
    storage.setItem(PUBLISH_DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function readPublishDraft(storage = browserSessionStorage(), now = Date.now()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PUBLISH_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== PUBLISH_DRAFT_VERSION) {
      clearPublishDraft(storage);
      return null;
    }
    if (!Number.isFinite(parsed.savedAt) || now - parsed.savedAt > PUBLISH_DRAFT_TTL_MS || parsed.savedAt > now + 60_000) {
      clearPublishDraft(storage);
      return null;
    }
    const draft = createPublishDraft(parsed, parsed.savedAt);
    if (isPublishFormEmpty(draft.form)) {
      clearPublishDraft(storage);
      return null;
    }
    return draft;
  } catch {
    clearPublishDraft(storage);
    return null;
  }
}

export function clearPublishDraft(storage = browserSessionStorage()) {
  if (!storage) return;
  try {
    storage.removeItem(PUBLISH_DRAFT_KEY);
  } catch {
    // Session storage may be blocked in privacy-restricted browsers.
  }
}
