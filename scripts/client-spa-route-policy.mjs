export const protectedClientScreens = [
  { name: 'messages-auth-gate', path: '/mensajes', selector: 'input[name="email"]' },
  { name: 'notifications-auth-gate', path: '/notificaciones', selector: 'input[name="email"]' },
  { name: 'profile-edit-auth-gate', path: '/perfil/editar', selector: 'input[name="email"]' },
  { name: 'referrals-auth-gate', path: '/referidos', selector: 'input[name="email"]' },
  { name: 'admin-marketing-auth-gate', path: '/admin/marketing', selector: 'input[name="email"]' },
];

export const publicClientScreens = [
  { name: 'verify-email', path: '/verificar-email' },
];

export const staticClientRedirects = {
  '/publish': { expectedPath: '/post' },
  '/account': { expectedPath: '/profile' },
  '/account/listings': { expectedPath: '/profile', expectedSearch: '?tab=my_ads' },
  '/account/billing': { expectedPath: '/profile', expectedSearch: '?tab=transactions' },
  '/account/promotions': { expectedPath: '/tarifas' },
  '/admin/login': { expectedPath: '/admin' },
  '/vendedores': { expectedPath: '/post', preMount: true },
  '/publicar-gratis': { expectedPath: '/post', preMount: true },
};

export const clientDynamicPatterns = [
  '/account/listing/:id/edit',
  '/account/listing/:id/photos',
  '/anuncio/:id',
  '/anuncio/:id/editar',
  '/vendedor/:id',
  '/r/:code',
];

export const clientWildcardPattern = '*';
