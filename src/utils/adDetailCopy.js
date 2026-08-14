import { normalizeLanguage } from './translations.js';

const copy = {
  es: {
    edit: 'Editar', expired: 'Este anuncio ha expirado y no es visible para otros usuarios.',
    expiringOne: 'Este anuncio expira el {date} (en 1 día).', expiringMany: 'Este anuncio expira el {date} (en {days} días).',
    renew: 'Renovar anuncio', imageAlt: 'Imagen del anuncio', catalogTitle: 'Referencia de catálogo Mercasto',
    catalogBody: 'Este producto se muestra como referencia. La disponibilidad, el precio y el vendedor deben confirmarse en una publicación real.',
    publishSimilar: 'Publicar uno similar', comments: 'comentarios', views: 'vistas', priceDropped: 'Bajó de precio', before: 'Antes', less: 'menos',
    approximateLocation: 'La ubicación es aproximada y se muestra solo con datos públicos del anuncio.', mapPlaceholder: 'Mapa de ubicación',
    sellTitle: 'Vendes este producto o uno parecido?', sellBody: 'Publica tus propias fotos, precio, ubicación y datos de contacto para recibir compradores reales.',
    publishFree: 'Publicar gratis', loginToMessageHint: 'Inicia sesión para escribir al vendedor sin perder este anuncio.', loginToMessage: 'Iniciar sesión para enviar mensaje', user: 'Usuario', verifiedSeller: 'Vendedor verificado', memberSince: 'En Mercasto desde {year}', allMexico: 'Todo México', mexico: 'México',
  },
  en: {
    edit: 'Edit', expired: 'This listing has expired and is no longer visible to other users.',
    expiringOne: 'This listing expires on {date} (in 1 day).', expiringMany: 'This listing expires on {date} (in {days} days).',
    renew: 'Renew listing', imageAlt: 'Listing image', catalogTitle: 'Mercasto catalog reference',
    catalogBody: 'This product is shown as a reference. Availability, price, and seller must be confirmed in a real listing.',
    publishSimilar: 'List a similar item', comments: 'reviews', views: 'views', priceDropped: 'Price dropped', before: 'Before', less: 'less',
    approximateLocation: 'The location is approximate and only uses public information from the listing.', mapPlaceholder: 'Location map',
    sellTitle: 'Do you sell this product or something similar?', sellBody: 'Post your own photos, price, location, and contact details to reach real buyers.',
    publishFree: 'Post for free', loginToMessageHint: 'Sign in to message the seller without losing this listing.', loginToMessage: 'Sign in to send a message', user: 'User', verifiedSeller: 'Verified seller', memberSince: 'On Mercasto since {year}', allMexico: 'All Mexico', mexico: 'Mexico',
  },
  pt: {
    edit: 'Editar', expired: 'Este anúncio expirou e não está mais visível para outros usuários.',
    expiringOne: 'Este anúncio expira em {date} (em 1 dia).', expiringMany: 'Este anúncio expira em {date} (em {days} dias).',
    renew: 'Renovar anúncio', imageAlt: 'Imagem do anúncio', catalogTitle: 'Referência do catálogo Mercasto',
    catalogBody: 'Este produto é exibido como referência. Disponibilidade, preço e vendedor devem ser confirmados em um anúncio real.',
    publishSimilar: 'Publicar um semelhante', comments: 'avaliações', views: 'visualizações', priceDropped: 'Preço reduzido', before: 'Antes', less: 'a menos',
    approximateLocation: 'A localização é aproximada e usa apenas dados públicos do anúncio.', mapPlaceholder: 'Mapa de localização',
    sellTitle: 'Você vende este produto ou algo parecido?', sellBody: 'Publique suas próprias fotos, preço, localização e dados de contato para receber compradores reais.',
    publishFree: 'Publicar grátis', loginToMessageHint: 'Entre na sua conta para falar com o vendedor sem perder este anúncio.', loginToMessage: 'Entrar para enviar mensagem', user: 'Usuário', verifiedSeller: 'Vendedor verificado', memberSince: 'No Mercasto desde {year}', allMexico: 'Todo o México', mexico: 'México',
  },
  fr: {
    edit: 'Modifier', expired: "Cette annonce a expiré et n'est plus visible par les autres utilisateurs.",
    expiringOne: 'Cette annonce expire le {date} (dans 1 jour).', expiringMany: 'Cette annonce expire le {date} (dans {days} jours).',
    renew: "Renouveler l'annonce", imageAlt: "Image de l'annonce", catalogTitle: 'Référence du catalogue Mercasto',
    catalogBody: 'Ce produit est affiché à titre de référence. La disponibilité, le prix et le vendeur doivent être confirmés dans une annonce réelle.',
    publishSimilar: 'Publier un article similaire', comments: 'avis', views: 'vues', priceDropped: 'Prix réduit', before: 'Avant', less: 'de moins',
    approximateLocation: "La localisation est approximative et utilise uniquement les données publiques de l'annonce.", mapPlaceholder: 'Carte de localisation',
    sellTitle: 'Vous vendez ce produit ou un produit similaire?', sellBody: 'Publiez vos propres photos, prix, localisation et coordonnées pour toucher de vrais acheteurs.',
    publishFree: 'Publier gratuitement', loginToMessageHint: "Connectez-vous pour écrire au vendeur sans perdre cette annonce.", loginToMessage: 'Se connecter pour envoyer un message', user: 'Utilisateur', verifiedSeller: 'Vendeur vérifié', memberSince: 'Sur Mercasto depuis {year}', allMexico: 'Tout le Mexique', mexico: 'Mexique',
  },
  zh: {
    edit: '编辑', expired: '此广告已过期，其他用户将无法再看到。',
    expiringOne: '此广告将于 {date} 到期（1 天后）。', expiringMany: '此广告将于 {date} 到期（{days} 天后）。',
    renew: '续期广告', imageAlt: '广告图片', catalogTitle: 'Mercasto 商品目录参考',
    catalogBody: '此商品仅作为参考展示。实际供应情况、价格和卖家信息需以真实发布的广告为准。',
    publishSimilar: '发布类似商品', comments: '评价', views: '浏览', priceDropped: '价格已下调', before: '原价', less: '降幅',
    approximateLocation: '该位置为近似位置，仅使用广告中的公开信息。', mapPlaceholder: '位置地图',
    sellTitle: '您出售此商品或类似商品吗?', sellBody: '发布您自己的照片、价格、位置和联系方式，与真实买家取得联系。',
    publishFree: '免费发布', loginToMessageHint: '登录后即可联系卖家，同时保留此广告。', loginToMessage: '登录并发送消息', user: '用户', verifiedSeller: '已验证卖家', memberSince: '{year} 年加入 Mercasto', allMexico: '墨西哥全国', mexico: '墨西哥',
  },
  ko: {
    edit: '수정', expired: '이 광고는 만료되어 다른 사용자에게 더 이상 표시되지 않습니다.',
    expiringOne: '이 광고는 {date}에 만료됩니다(1일 후).', expiringMany: '이 광고는 {date}에 만료됩니다({days}일 후).',
    renew: '광고 갱신', imageAlt: '광고 이미지', catalogTitle: 'Mercasto 카탈로그 참고',
    catalogBody: '이 상품은 참고용으로 표시됩니다. 실제 재고, 가격 및 판매자는 실제 광고에서 확인해야 합니다.',
    publishSimilar: '비슷한 상품 등록', comments: '리뷰', views: '조회', priceDropped: '가격 인하', before: '이전 가격', less: '인하',
    approximateLocation: '위치는 대략적인 정보이며 광고에 공개된 정보만 사용합니다.', mapPlaceholder: '위치 지도',
    sellTitle: '이 상품 또는 비슷한 상품을 판매하시나요?', sellBody: '직접 찍은 사진, 가격, 위치와 연락처를 등록해 실제 구매자를 만나보세요.',
    publishFree: '무료 등록', loginToMessageHint: '로그인하면 이 광고를 잃지 않고 판매자에게 메시지를 보낼 수 있습니다.', loginToMessage: '로그인하고 메시지 보내기', user: '사용자', verifiedSeller: '인증 판매자', memberSince: '{year}년부터 Mercasto 이용', allMexico: '멕시코 전역', mexico: '멕시코',
  },
  de: {
    edit: 'Bearbeiten', expired: 'Diese Anzeige ist abgelaufen und für andere Nutzer nicht mehr sichtbar.',
    expiringOne: 'Diese Anzeige läuft am {date} ab (in 1 Tag).', expiringMany: 'Diese Anzeige läuft am {date} ab (in {days} Tagen).',
    renew: 'Anzeige verlängern', imageAlt: 'Anzeigenbild', catalogTitle: 'Mercasto-Katalogreferenz',
    catalogBody: 'Dieses Produkt wird als Referenz angezeigt. Verfügbarkeit, Preis und Verkäufer müssen in einer echten Anzeige bestätigt werden.',
    publishSimilar: 'Ähnlichen Artikel inserieren', comments: 'Bewertungen', views: 'Aufrufe', priceDropped: 'Preis gesenkt', before: 'Vorher', less: 'weniger',
    approximateLocation: 'Der Standort ist ungefähr und basiert nur auf öffentlich sichtbaren Angaben der Anzeige.', mapPlaceholder: 'Standortkarte',
    sellTitle: 'Verkaufen Sie dieses oder ein ähnliches Produkt?', sellBody: 'Veröffentlichen Sie eigene Fotos, Preis, Standort und Kontaktdaten, um echte Käufer zu erreichen.',
    publishFree: 'Kostenlos inserieren', loginToMessageHint: 'Melden Sie sich an, um dem Verkäufer zu schreiben, ohne diese Anzeige zu verlieren.', loginToMessage: 'Anmelden und Nachricht senden', user: 'Nutzer', verifiedSeller: 'Verifizierter Verkäufer', memberSince: 'Bei Mercasto seit {year}', allMexico: 'Ganz Mexiko', mexico: 'Mexiko',
  },
  it: {
    edit: 'Modifica', expired: 'Questo annuncio è scaduto e non è più visibile agli altri utenti.',
    expiringOne: 'Questo annuncio scade il {date} (tra 1 giorno).', expiringMany: 'Questo annuncio scade il {date} (tra {days} giorni).',
    renew: 'Rinnova annuncio', imageAlt: "Immagine dell'annuncio", catalogTitle: 'Riferimento catalogo Mercasto',
    catalogBody: 'Questo prodotto è mostrato come riferimento. Disponibilità, prezzo e venditore devono essere confermati in un annuncio reale.',
    publishSimilar: 'Pubblica un articolo simile', comments: 'recensioni', views: 'visualizzazioni', priceDropped: 'Prezzo ridotto', before: 'Prima', less: 'in meno',
    approximateLocation: "La posizione è approssimativa e usa solo i dati pubblici dell'annuncio.", mapPlaceholder: 'Mappa della posizione',
    sellTitle: 'Vendi questo prodotto o qualcosa di simile?', sellBody: 'Pubblica le tue foto, il prezzo, la posizione e i contatti per raggiungere acquirenti reali.',
    publishFree: 'Pubblica gratis', loginToMessageHint: "Accedi per scrivere al venditore senza perdere questo annuncio.", loginToMessage: 'Accedi per inviare un messaggio', user: 'Utente', verifiedSeller: 'Venditore verificato', memberSince: 'Su Mercasto dal {year}', allMexico: 'Tutto il Messico', mexico: 'Messico',
  },
  ar: {
    edit: 'تعديل', expired: 'انتهت صلاحية هذا الإعلان ولم يعد مرئيا للمستخدمين الآخرين.',
    expiringOne: 'ينتهي هذا الإعلان في {date} (بعد يوم واحد).', expiringMany: 'ينتهي هذا الإعلان في {date} (بعد {days} أيام).',
    renew: 'تجديد الإعلان', imageAlt: 'صورة الإعلان', catalogTitle: 'مرجع كتالوج Mercasto',
    catalogBody: 'يُعرض هذا المنتج كمرجع فقط. يجب تأكيد التوفر والسعر والبائع في إعلان حقيقي.',
    publishSimilar: 'نشر منتج مشابه', comments: 'مراجعات', views: 'مشاهدات', priceDropped: 'انخفض السعر', before: 'السعر السابق', less: 'أقل',
    approximateLocation: 'الموقع تقريبي ويستخدم فقط المعلومات العامة الواردة في الإعلان.', mapPlaceholder: 'خريطة الموقع',
    sellTitle: 'هل تبيع هذا المنتج أو منتجا مشابها?', sellBody: 'انشر صورك وسعرك وموقعك وبيانات الاتصال للوصول إلى مشترين حقيقيين.',
    publishFree: 'نشر مجانا', loginToMessageHint: 'سجّل الدخول لمراسلة البائع دون فقدان هذا الإعلان.', loginToMessage: 'تسجيل الدخول لإرسال رسالة', user: 'مستخدم', verifiedSeller: 'بائع موثّق', memberSince: 'على Mercasto منذ {year}', allMexico: 'كل المكسيك', mexico: 'المكسيك',
  },
  ru: {
    edit: 'Редактировать', expired: 'Это объявление истекло и больше не видно другим пользователям.',
    expiringOne: 'Объявление истекает {date} (через 1 день).', expiringMany: 'Объявление истекает {date} (через {days} дн.).',
    renew: 'Продлить объявление', imageAlt: 'Изображение объявления', catalogTitle: 'Справочная позиция каталога Mercasto',
    catalogBody: 'Этот товар показан как справочная позиция. Наличие, цену и продавца нужно подтвердить в реальном объявлении.',
    publishSimilar: 'Опубликовать похожий товар', comments: 'отзывов', views: 'просмотров', priceDropped: 'Цена снижена', before: 'Раньше', less: 'дешевле',
    approximateLocation: 'Местоположение указано приблизительно и основано только на публичных данных объявления.', mapPlaceholder: 'Карта местоположения',
    sellTitle: 'Продаёте такой или похожий товар?', sellBody: 'Добавьте свои фотографии, цену, местоположение и контакты, чтобы получать обращения реальных покупателей.',
    publishFree: 'Опубликовать бесплатно', loginToMessageHint: 'Войдите, чтобы написать продавцу и не потерять это объявление.', loginToMessage: 'Войти и отправить сообщение', user: 'Пользователь', verifiedSeller: 'Проверенный продавец', memberSince: 'На Mercasto с {year} года', allMexico: 'Вся Мексика', mexico: 'Мексика',
  },
  ja: {
    edit: '編集', expired: 'この広告は期限切れのため、他のユーザーには表示されません。',
    expiringOne: 'この広告は {date} に期限切れになります（あと1日）。', expiringMany: 'この広告は {date} に期限切れになります（あと{days}日）。',
    renew: '広告を更新', imageAlt: '広告画像', catalogTitle: 'Mercasto カタログ参考情報',
    catalogBody: 'この商品は参考情報として表示されています。在庫、価格、販売者は実際の広告で確認する必要があります。',
    publishSimilar: '類似商品を掲載', comments: 'レビュー', views: '閲覧', priceDropped: '値下げ', before: '以前', less: '割引',
    approximateLocation: '位置は概算で、広告に公開されている情報のみを使用しています。', mapPlaceholder: '位置マップ',
    sellTitle: 'この商品または似た商品を販売していますか?', sellBody: 'ご自身の写真、価格、場所、連絡先を掲載して、実際の購入者に届けましょう。',
    publishFree: '無料で掲載', loginToMessageHint: 'ログインすると、この広告を保持したまま販売者にメッセージを送れます。', loginToMessage: 'ログインしてメッセージを送る', user: 'ユーザー', verifiedSeller: '認証済み販売者', memberSince: '{year}年からMercastoを利用', allMexico: 'メキシコ全土', mexico: 'メキシコ',
  },
};


const CONDITION_CANONICAL = {
  new: 'Nuevo', nuevo: 'Nuevo',
  used: 'Usado', usado: 'Usado',
  refurbished: 'Reacondicionado', reacondicionado: 'Reacondicionado',
  'like new': 'Como nuevo', 'como nuevo': 'Como nuevo',
  restored: 'Restaurado', restaurado: 'Restaurado',
};

export function canonicalAdCondition(value = 'usado') {
  const raw = String(value || 'usado').trim();
  return CONDITION_CANONICAL[raw.toLowerCase()] || raw || 'Usado';
}

function interpolate(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
}

export function getAdDetailCopy(language = 'es') {
  return copy[normalizeLanguage(language)] || copy.es;
}

export function formatAdDetailCopy(template, values) {
  return interpolate(template, values);
}

export function hasAdDetailCopyLanguage(language) {
  return Object.hasOwn(copy, normalizeLanguage(language)) && Object.hasOwn(copy, String(language).toLowerCase().split('-')[0]);
}
