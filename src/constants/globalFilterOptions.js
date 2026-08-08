const option = (value, label) => ({ value, label });

export const SUPPORTED_GLOBAL_FILTER_IDS = [
  'listing_type',
  'published_at',
  'seller_type_global',
  'seller_verified',
  'media',
  'sort',
  'payment_method',
  'seller_response',
  'warranty',
  'negotiable',
];

export function getGlobalFilterDefinitions(t = {}) {
  const tr = (key, fallback) => t[key] || fallback;
  return [
    { id: 'listing_type', label: tr('filter_global_listing_type', 'Tipo de anuncio'), options: [
      option('Venta', tr('gf_venta', 'Venta')),
      option('Renta', tr('gf_renta', 'Renta')),
      option('Renta con opción a compra', tr('gf_renta_opcion', 'Renta con opción a compra')),
      option('Traspaso', tr('gf_traspaso', 'Traspaso')),
      option('Gratis', tr('gf_gratis', 'Gratis')),
      option('Intercambio', tr('gf_intercambio', 'Intercambio')),
    ] },
    { id: 'published_at', label: tr('filter_global_published', 'Publicado'), type: 'select', options: [
      option('today', tr('gf_hoy', 'Hoy')),
      option('yesterday', tr('gf_ayer', 'Ayer')),
      option('last_3_days', tr('gf_3days', 'Últimos 3 días')),
      option('last_week', tr('gf_week', 'Última semana')),
      option('last_month', tr('gf_month', 'Último mes')),
      option('last_3_months', tr('gf_3months', 'Últimos 3 meses')),
    ] },
    { id: 'seller_type_global', label: tr('filter_global_seller_type', 'Tipo de vendedor'), options: [
      option('individual', tr('gf_particular', 'Particular')),
      option('business', tr('gf_tienda', 'Tienda')),
    ] },
    { id: 'seller_verified', label: tr('filter_global_verification', 'Verificación'), options: [
      option('verified', tr('gf_verified_seller', 'Vendedor verificado')),
      option('phone_verified', tr('gf_verified_phone', 'Teléfono verificado')),
    ] },
    { id: 'media', label: tr('filter_global_content', 'Contenido'), options: [
      option('photos', tr('gf_with_photos', 'Con fotos')),
      option('video', tr('gf_with_video', 'Con video')),
      option('map', tr('gf_with_map', 'Tour / mapa')),
    ] },
    { id: 'sort', label: tr('filter_global_sort', 'Ordenar por'), type: 'select', options: [
      option('latest', tr('sort_newest', 'Más recientes')),
      option('price_asc', tr('sort_price_asc', 'Precio menor')),
      option('price_desc', tr('sort_price_desc', 'Precio mayor')),
      option('popular', tr('sort_most_viewed', 'Más vistos')),
    ] },
    { id: 'payment_method', label: tr('filter_global_payment', 'Pago aceptado'), options: [
      option('Efectivo', tr('gf_cash', 'Efectivo')),
      option('Transferencia SPEI', tr('gf_spei', 'Transferencia SPEI')),
      option('Tarjeta de crédito', tr('gf_credit_card', 'Tarjeta de crédito')),
      option('Tarjeta de débito', tr('gf_debit_card', 'Tarjeta de débito')),
      option('Pago seguro (escrow)', tr('gf_escrow', 'Pago seguro (escrow)')),
      option('PayPal', 'PayPal'),
      option('Criptomonedas', tr('gf_crypto', 'Criptomonedas')),
    ] },
    { id: 'seller_response', label: tr('filter_global_response', 'Respuesta del vendedor'), options: [
      option('Responde rápido (< 1 hora)', tr('gf_fast_response', 'Responde rápido (< 1 hora)')),
      option('Responde hoy', tr('gf_replies_today', 'Responde hoy')),
      option('Atiende por chat', tr('gf_by_chat', 'Atiende por chat')),
      option('Atiende por teléfono', tr('gf_by_phone', 'Atiende por teléfono')),
    ] },
    { id: 'warranty', label: tr('filter_global_warranty', 'Garantía'), options: [
      option('Con garantía', tr('gf_with_warranty', 'Con garantía')),
      option('Garantía de fábrica', tr('gf_factory_warranty', 'Garantía de fábrica')),
      option('30 días de garantía', tr('gf_warranty_30', '30 días de garantía')),
      option('90 días de garantía', tr('gf_warranty_90', '90 días de garantía')),
      option('1 año de garantía', tr('gf_warranty_1y', '1 año de garantía')),
    ] },
    { id: 'negotiable', label: tr('filter_global_price_type', 'Precio'), options: [
      option('Precio fijo', tr('gf_fixed_price', 'Precio fijo')),
      option('Negociable', tr('gf_negotiable', 'Negociable')),
      option('Acepto ofertas', tr('gf_accept_offers', 'Acepto ofertas')),
    ] },
  ];
}
