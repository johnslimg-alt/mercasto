const fallbackNotification = function fallbackNotification() {
  return null;
};

fallbackNotification.permission = 'denied';
fallbackNotification.requestPermission = () => Promise.resolve('denied');

if (typeof globalThis !== 'undefined' && typeof globalThis.Notification === 'undefined') {
  Object.defineProperty(globalThis, 'Notification', {
    value: fallbackNotification,
    configurable: true,
    writable: false,
  });
}
