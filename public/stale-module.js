const refreshUrl = `/?refresh=${Date.now()}`;

Promise.allSettled([
  globalThis.caches ? caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))) : Promise.resolve(),
  navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(regs => Promise.all(regs.map(reg => reg.update()))) : Promise.resolve(),
]).finally(() => {
  if (!location.search.includes('refresh=')) {
    location.replace(refreshUrl);
  }
});

export default function StaleModuleFallback() {
  return null;
}

