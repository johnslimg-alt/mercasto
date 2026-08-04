export function protectedIntentKind(pathname, search = '') {
  if (/^\/post\/?$/.test(pathname || '')) return 'seller_post';
  if (!/^\/mensajes\/?$/.test(pathname || '')) return null;

  const params = new URLSearchParams(search || '');
  const adId = Number(params.get('ad_id') || 0);
  const sellerId = Number(params.get('seller_id') || 0);
  return adId > 0 && sellerId > 0 ? 'contact_message' : 'messages_inbox';
}
