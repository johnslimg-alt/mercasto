const MAP_SELECTOR = 'form .leaflet-container';
const PICKER_MARKER_SELECTOR = '.leaflet-marker-icon';
const CITY_OPTION_SELECTOR = 'option[value="otro"]';
const CUSTOM_CITY_SELECTOR = 'input[placeholder="Escribe el nombre de tu ciudad"]';
const MAX_ATTEMPTS = 4;
const RETRY_MS = 700;

const attempts = new WeakMap();
let intervalId = null;

function isPublicationRoute() {
  return window.location.pathname === '/post';
}

function publicationForm() {
  return document.querySelector(MAP_SELECTOR)?.closest('form') || null;
}

function hasChosenCity(form) {
  const citySelect = [...form.querySelectorAll('select')]
    .find((select) => select.querySelector(CITY_OPTION_SELECTOR));

  if (citySelect?.value && citySelect.value !== 'otro') return true;

  const customCity = form.querySelector(CUSTOM_CITY_SELECTOR);
  return Boolean(customCity?.value?.trim());
}

function dispatchCenterClick(mapElement) {
  const rect = mapElement.getBoundingClientRect();
  if (rect.width < 20 || rect.height < 20) return false;

  mapElement.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX: rect.left + (rect.width / 2),
    clientY: rect.top + (rect.height / 2),
    view: window,
  }));

  return true;
}

function tryAutofillPublicationLocation() {
  if (!isPublicationRoute()) return;

  const form = publicationForm();
  if (!form || !hasChosenCity(form)) return;

  const mapElement = form.querySelector('.leaflet-container');
  if (!mapElement || mapElement.querySelector(PICKER_MARKER_SELECTOR)) return;

  const count = attempts.get(mapElement) || 0;
  if (count >= MAX_ATTEMPTS) return;

  attempts.set(mapElement, count + 1);
  window.requestAnimationFrame(() => dispatchCenterClick(mapElement));
}

export function installPublishLocationAutofill() {
  if (typeof window === 'undefined' || window.__mercastoPublishLocationAutofill) return;
  window.__mercastoPublishLocationAutofill = true;

  const schedule = () => window.setTimeout(tryAutofillPublicationLocation, RETRY_MS);

  document.addEventListener('change', schedule, true);
  document.addEventListener('input', schedule, true);
  window.addEventListener('popstate', schedule);

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  intervalId = window.setInterval(tryAutofillPublicationLocation, RETRY_MS);

  window.addEventListener('pagehide', () => {
    if (intervalId !== null) window.clearInterval(intervalId);
    observer.disconnect();
  }, { once: true });
}
