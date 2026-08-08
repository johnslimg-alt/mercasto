export const BUYER_NUDGE_COPY = Object.freeze({
  es: { title: 'No pierdas tus favoritos', body: 'Guarda anuncios y accede rápido a las opciones de contacto de cada vendedor.', cta: 'Crear cuenta', dismiss: 'Ahora no' },
  en: { title: 'Keep your favorites handy', body: 'Save listings and get quick access to each seller’s available contact options.', cta: 'Create account', dismiss: 'Not now' },
  pt: { title: 'Não perca seus favoritos', body: 'Salve anúncios e acesse rapidamente as opções de contato disponíveis de cada vendedor.', cta: 'Criar conta', dismiss: 'Agora não' },
  fr: { title: 'Gardez vos favoris à portée de main', body: 'Enregistrez des annonces et accédez rapidement aux moyens de contact proposés par chaque vendeur.', cta: 'Créer un compte', dismiss: 'Pas maintenant' },
  zh: { title: '别错过你收藏的商品', body: '保存广告，并快速查看每位卖家提供的联系方式。', cta: '创建账户', dismiss: '暂时不要' },
  ko: { title: '마음에 든 매물을 놓치지 마세요', body: '매물을 저장하고 판매자가 제공한 연락 방법을 빠르게 확인하세요.', cta: '계정 만들기', dismiss: '나중에' },
  de: { title: 'Behalte deine Favoriten im Blick', body: 'Speichere Anzeigen und öffne schnell die verfügbaren Kontaktmöglichkeiten des Verkäufers.', cta: 'Konto erstellen', dismiss: 'Nicht jetzt' },
  it: { title: 'Tieni a portata di mano i preferiti', body: 'Salva gli annunci e accedi rapidamente alle opzioni di contatto disponibili del venditore.', cta: 'Crea account', dismiss: 'Non ora' },
  ar: { title: 'احتفظ بإعلاناتك المفضلة', body: 'احفظ الإعلانات واصل بسرعة إلى وسائل الاتصال المتاحة التي يوفّرها كل بائع.', cta: 'إنشاء حساب', dismiss: 'ليس الآن' },


  ru: { title: 'Не теряйте понравившиеся объявления', body: 'Сохраняйте объявления и быстро открывайте доступные способы связи с продавцом.', cta: 'Создать аккаунт', dismiss: 'Не сейчас' },
  ja: { title: '気になる広告をすぐ見つける', body: '広告を保存し、出品者が用意している連絡方法へすばやくアクセスできます。', cta: 'アカウントを作成', dismiss: '今はしない' },
});

export function buyerNudgeCopy(language = 'es') {
  const code = String(language || 'es').toLowerCase().split('-')[0];
  return BUYER_NUDGE_COPY[code] || BUYER_NUDGE_COPY.es;
}
