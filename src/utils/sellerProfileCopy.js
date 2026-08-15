import { normalizeLanguage } from './translations.js';

const copy = {
  es: {
    sellerNotFound: 'Este vendedor no existe.', loadError: 'Error al cargar el perfil.', back: 'Volver', retry: 'Reintentar', adsLoadError: 'No pudimos cargar los anuncios.',
    phoneVerified: 'Teléfono verificado', emailVerified: 'Email verificado', verified: 'Verificado', editProfile: 'Editar perfil',
    memberSince: 'Miembro desde {year}', reviewOne: 'reseña', reviewMany: 'reseñas', about: 'Sobre mí', contact: 'Contacto',
    activeAds: 'Anuncios activos', reviews: 'Reseñas', noActiveAds: 'Este vendedor no tiene anuncios activos.', priceOnRequest: 'Precio a tratar',
  },
  en: {
    sellerNotFound: 'This seller does not exist.', loadError: 'Error loading the profile.', back: 'Back', retry: 'Retry', adsLoadError: 'We could not load the listings.',
    phoneVerified: 'Phone verified', emailVerified: 'Email verified', verified: 'Verified', editProfile: 'Edit profile',
    memberSince: 'Member since {year}', reviewOne: 'review', reviewMany: 'reviews', about: 'About me', contact: 'Contact',
    activeAds: 'Active listings', reviews: 'Reviews', noActiveAds: 'This seller has no active listings.', priceOnRequest: 'Price on request',
  },
  pt: {
    sellerNotFound: 'Este vendedor não existe.', loadError: 'Erro ao carregar o perfil.', back: 'Voltar', retry: 'Tentar novamente', adsLoadError: 'Não foi possível carregar os anúncios.',
    phoneVerified: 'Telefone verificado', emailVerified: 'Email verificado', verified: 'Verificado', editProfile: 'Editar perfil',
    memberSince: 'Membro desde {year}', reviewOne: 'avaliação', reviewMany: 'avaliações', about: 'Sobre mim', contact: 'Contato',
    activeAds: 'Anúncios ativos', reviews: 'Avaliações', noActiveAds: 'Este vendedor não tem anúncios ativos.', priceOnRequest: 'Preço a combinar',
  },
  fr: {
    sellerNotFound: "Ce vendeur n'existe pas.", loadError: 'Erreur lors du chargement du profil.', back: 'Retour', retry: 'Réessayer', adsLoadError: 'Impossible de charger les annonces.',
    phoneVerified: 'Téléphone vérifié', emailVerified: 'Email vérifié', verified: 'Vérifié', editProfile: 'Modifier le profil',
    memberSince: 'Membre depuis {year}', reviewOne: 'avis', reviewMany: 'avis', about: 'À propos de moi', contact: 'Contact',
    activeAds: 'Annonces actives', reviews: 'Avis', noActiveAds: "Ce vendeur n'a aucune annonce active.", priceOnRequest: 'Prix à convenir',
  },
  zh: {
    sellerNotFound: '此卖家不存在。', loadError: '加载个人资料时出错。', back: '返回', retry: '重试', adsLoadError: '无法加载广告。',
    phoneVerified: '手机号已验证', emailVerified: '邮箱已验证', verified: '已验证', editProfile: '编辑个人资料',
    memberSince: '{year} 年加入', reviewOne: '条评价', reviewMany: '条评价', about: '关于我', contact: '联系方式',
    activeAds: '有效广告', reviews: '评价', noActiveAds: '此卖家暂无有效广告。', priceOnRequest: '价格面议',
  },
  ko: {
    sellerNotFound: '판매자를 찾을 수 없습니다.', loadError: '프로필을 불러오는 중 오류가 발생했습니다.', back: '뒤로', retry: '재시도', adsLoadError: '광고를 불러오지 못했습니다.',
    phoneVerified: '전화번호 인증됨', emailVerified: '이메일 인증됨', verified: '인증됨', editProfile: '프로필 수정',
    memberSince: '{year}년부터 회원', reviewOne: '리뷰', reviewMany: '리뷰', about: '소개', contact: '연락처',
    activeAds: '활성 광고', reviews: '리뷰', noActiveAds: '이 판매자에게 활성 광고가 없습니다.', priceOnRequest: '가격 협의',
  },
  de: {
    sellerNotFound: 'Dieser Verkäufer existiert nicht.', loadError: 'Fehler beim Laden des Profils.', back: 'Zurück', retry: 'Wiederholen', adsLoadError: 'Anzeigen konnten nicht geladen werden.',
    phoneVerified: 'Telefon verifiziert', emailVerified: 'E-Mail verifiziert', verified: 'Verifiziert', editProfile: 'Profil bearbeiten',
    memberSince: 'Mitglied seit {year}', reviewOne: 'Bewertung', reviewMany: 'Bewertungen', about: 'Über mich', contact: 'Kontakt',
    activeAds: 'Aktive Anzeigen', reviews: 'Bewertungen', noActiveAds: 'Dieser Verkäufer hat keine aktiven Anzeigen.', priceOnRequest: 'Preis auf Anfrage',
  },
  it: {
    sellerNotFound: 'Questo venditore non esiste.', loadError: 'Errore durante il caricamento del profilo.', back: 'Indietro', retry: 'Riprova', adsLoadError: 'Impossibile caricare gli annunci.',
    phoneVerified: 'Telefono verificato', emailVerified: 'Email verificata', verified: 'Verificato', editProfile: 'Modifica profilo',
    memberSince: 'Membro dal {year}', reviewOne: 'recensione', reviewMany: 'recensioni', about: 'Su di me', contact: 'Contatto',
    activeAds: 'Annunci attivi', reviews: 'Recensioni', noActiveAds: 'Questo venditore non ha annunci attivi.', priceOnRequest: 'Prezzo da concordare',
  },
  ar: {
    sellerNotFound: 'هذا البائع غير موجود.', loadError: 'حدث خطأ أثناء تحميل الملف الشخصي.', back: 'رجوع', retry: 'إعادة المحاولة', adsLoadError: 'تعذّر تحميل الإعلانات.',
    phoneVerified: 'رقم الهاتف موثّق', emailVerified: 'البريد الإلكتروني موثّق', verified: 'موثّق', editProfile: 'تعديل الملف الشخصي',
    memberSince: 'عضو منذ {year}', reviewOne: 'مراجعة', reviewMany: 'مراجعات', about: 'نبذة عني', contact: 'التواصل',
    activeAds: 'الإعلانات النشطة', reviews: 'المراجعات', noActiveAds: 'لا توجد لدى هذا البائع إعلانات نشطة.', priceOnRequest: 'السعر عند التواصل',
  },
  ru: {
    sellerNotFound: 'Такого продавца не существует.', loadError: 'Не удалось загрузить профиль.', back: 'Назад', retry: 'Повторить', adsLoadError: 'Не удалось загрузить объявления.',
    phoneVerified: 'Телефон подтверждён', emailVerified: 'Email подтверждён', verified: 'Подтверждён', editProfile: 'Редактировать профиль',
    memberSince: 'На Mercasto с {year} года', reviewOne: 'отзыв', reviewMany: 'отзывов', about: 'О себе', contact: 'Контакты',
    activeAds: 'Активные объявления', reviews: 'Отзывы', noActiveAds: 'У этого продавца нет активных объявлений.', priceOnRequest: 'Цена по запросу',
  },
  ja: {
    sellerNotFound: 'この販売者は存在しません。', loadError: 'プロフィールの読み込み中にエラーが発生しました。', back: '戻る', retry: '再試行', adsLoadError: '広告を読み込めませんでした。',
    phoneVerified: '電話番号認証済み', emailVerified: 'メール認証済み', verified: '認証済み', editProfile: 'プロフィールを編集',
    memberSince: '{year}年からメンバー', reviewOne: 'レビュー', reviewMany: 'レビュー', about: '自己紹介', contact: '連絡先',
    activeAds: '掲載中の広告', reviews: 'レビュー', noActiveAds: 'この販売者には掲載中の広告がありません。', priceOnRequest: '価格は要相談',
  },
};

function interpolate(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
}

export function getSellerProfileCopy(language = 'es') {
  return copy[normalizeLanguage(language)] || copy.es;
}

export function formatSellerProfileCopy(template, values) {
  return interpolate(template, values);
}

export function sellerReviewLabel(language, count) {
  const selected = getSellerProfileCopy(language);
  return Number(count) === 1 ? selected.reviewOne : selected.reviewMany;
}

export function hasSellerProfileCopyLanguage(language) {
  const raw = String(language || '').toLowerCase().split('-')[0];
  return Object.hasOwn(copy, raw);
}
