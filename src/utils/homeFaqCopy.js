export const HOME_FAQ_LANGUAGES = Object.freeze(['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja']);

const HOME_FAQ_COPY = Object.freeze({
  es: [
    { question: 'Qué es Mercasto?', answer: 'Mercasto es la plataforma de anuncios clasificados más moderna e inteligente con AI para México. Organiza publicaciones y facilita el contacto directo entre compradores y vendedores.' },
    { question: 'Cómo usa Mercasto la AI?', answer: 'Mercasto usa AI para asistir la publicación, mejorar descripciones, ofrecer recomendaciones y apoyar la moderación de anuncios.' },
    { question: 'Cuánto cuesta publicar?', answer: 'La activación inicial de un anuncio elegible es gratuita durante siete días. Renovarlo por otros siete días cuesta 49 MXN.' },
    { question: 'Cómo contacto al vendedor?', answer: 'Según los datos habilitados en el anuncio, puedes usar WhatsApp, Telegram, correo, teléfono o el flujo interno de mensajes.' },
    { question: 'Mercasto garantiza las transacciones?', answer: 'No. Mercasto facilita la publicación y el contacto, pero comprador y vendedor deben verificar el producto, la identidad, la entrega y el pago.' },
    { question: 'Qué significa una cuenta verificada?', answer: 'Indica que Mercasto registró una verificación disponible para esa cuenta. No constituye una garantía sobre sus anuncios o transacciones.' },
  ],
  en: [
    { question: 'What is Mercasto?', answer: 'Mercasto is the most modern and intelligent AI-powered classifieds platform for Mexico. It organizes listings and helps buyers and sellers contact each other directly.' },
    { question: 'How does Mercasto use AI?', answer: 'Mercasto uses AI to assist posting, improve descriptions, provide recommendations, and support listing moderation.' },
    { question: 'How much does it cost to post?', answer: 'The initial activation of an eligible listing is free for seven days. Renewing it for seven more days costs 49 MXN.' },
    { question: 'How do I contact a seller?', answer: 'Depending on the listing, you can use WhatsApp, Telegram, email, phone, or the internal messaging flow.' },
    { question: 'Does Mercasto guarantee transactions?', answer: 'No. Mercasto facilitates listings and contact, while buyers and sellers must verify the item, identity, delivery, and payment.' },
    { question: 'What does a verified account mean?', answer: 'It means Mercasto recorded an available verification for the account. It is not a guarantee of listings or transactions.' },
  ],
  pt: [
    { question: 'O que é o Mercasto?', answer: 'Mercasto é uma plataforma moderna de classificados com AI para o México. Ela organiza anúncios e facilita o contato direto entre compradores e vendedores.' },
    { question: 'Como o Mercasto usa AI?', answer: 'Mercasto usa AI para ajudar na publicação, melhorar descrições, oferecer recomendações e apoiar a moderação de anúncios.' },
    { question: 'Quanto custa publicar?', answer: 'A ativação inicial de um anúncio elegível é gratuita por sete dias. Renovar por mais sete dias custa 49 MXN.' },
    { question: 'Como entro em contato com o vendedor?', answer: 'Dependendo dos dados habilitados no anúncio, você pode usar WhatsApp, Telegram, e-mail, telefone ou as mensagens internas.' },
    { question: 'O Mercasto garante as transações?', answer: 'Não. Mercasto facilita a publicação e o contato, mas comprador e vendedor devem verificar o produto, a identidade, a entrega e o pagamento.' },
    { question: 'O que significa uma conta verificada?', answer: 'Significa que Mercasto registrou uma verificação disponível para a conta. Isso não garante anúncios nem transações.' },
  ],
  fr: [
    { question: 'Qu’est-ce que Mercasto ?', answer: 'Mercasto est une plateforme moderne de petites annonces avec AI pour le Mexique. Elle organise les annonces et facilite le contact direct entre acheteurs et vendeurs.' },
    { question: 'Comment Mercasto utilise AI ?', answer: 'Mercasto utilise AI pour aider à publier, améliorer les descriptions, proposer des recommandations et soutenir la modération des annonces.' },
    { question: 'Combien coûte la publication ?', answer: 'L’activation initiale d’une annonce éligible est gratuite pendant sept jours. Le renouvellement pour sept jours supplémentaires coûte 49 MXN.' },
    { question: 'Comment contacter le vendeur ?', answer: 'Selon les coordonnées activées dans l’annonce, vous pouvez utiliser WhatsApp, Telegram, l’e-mail, le téléphone ou la messagerie interne.' },
    { question: 'Mercasto garantit-il les transactions ?', answer: 'Non. Mercasto facilite la publication et le contact, mais l’acheteur et le vendeur doivent vérifier le produit, l’identité, la livraison et le paiement.' },
    { question: 'Que signifie un compte vérifié ?', answer: 'Cela signifie que Mercasto a enregistré une vérification disponible pour ce compte. Ce n’est pas une garantie concernant les annonces ou les transactions.' },
  ],
  zh: [
    { question: 'Mercasto 是什么？', answer: 'Mercasto 是面向墨西哥的现代 AI 分类信息平台，用于整理广告并帮助买卖双方直接联系。' },
    { question: 'Mercasto 如何使用 AI？', answer: 'Mercasto 使用 AI 协助发布、改进描述、提供推荐并支持广告审核。' },
    { question: '发布广告需要多少钱？', answer: '符合条件的广告首次激活可免费展示七天。再续期七天的费用为 49 MXN。' },
    { question: '如何联系卖家？', answer: '根据广告中启用的联系方式，你可以使用 WhatsApp、Telegram、电子邮件、电话或站内消息。' },
    { question: 'Mercasto 会担保交易吗？', answer: '不会。Mercasto 提供发布和联系工具，但买卖双方应自行核实商品、身份、交付和付款。' },
    { question: '已验证账户是什么意思？', answer: '这表示 Mercasto 已记录该账户可用的验证信息，但不代表对其广告或交易提供担保。' },
  ],
  ko: [
    { question: 'Mercasto는 무엇인가요?', answer: 'Mercasto는 멕시코를 위한 현대적인 AI 기반 중고·분류 광고 플랫폼으로, 광고를 정리하고 구매자와 판매자가 직접 연락할 수 있도록 돕습니다.' },
    { question: 'Mercasto는 AI를 어떻게 사용하나요?', answer: 'Mercasto는 AI를 사용해 게시 작성을 돕고 설명을 개선하며 추천을 제공하고 광고 검토를 지원합니다.' },
    { question: '광고 등록 비용은 얼마인가요?', answer: '조건을 충족하는 광고의 최초 활성화는 7일 동안 무료입니다. 추가 7일 갱신 비용은 49 MXN입니다.' },
    { question: '판매자에게 어떻게 연락하나요?', answer: '광고에 활성화된 연락처에 따라 WhatsApp, Telegram, 이메일, 전화 또는 내부 메시지를 사용할 수 있습니다.' },
    { question: 'Mercasto가 거래를 보장하나요?', answer: '아니요. Mercasto는 광고 게시와 연락을 지원하지만 상품, 신원, 배송 및 결제 확인은 구매자와 판매자가 직접 해야 합니다.' },
    { question: '인증된 계정은 무엇을 의미하나요?', answer: 'Mercasto가 해당 계정에 사용할 수 있는 인증 정보를 기록했다는 뜻이며, 광고나 거래를 보장한다는 의미는 아닙니다.' },
  ],
  de: [
    { question: 'Was ist Mercasto?', answer: 'Mercasto ist eine moderne AI-gestützte Kleinanzeigenplattform für Mexiko. Sie organisiert Anzeigen und erleichtert den direkten Kontakt zwischen Käufern und Verkäufern.' },
    { question: 'Wie nutzt Mercasto AI?', answer: 'Mercasto nutzt AI, um beim Veröffentlichen zu helfen, Beschreibungen zu verbessern, Empfehlungen zu geben und die Anzeigenmoderation zu unterstützen.' },
    { question: 'Was kostet das Veröffentlichen?', answer: 'Die erste Aktivierung einer geeigneten Anzeige ist sieben Tage kostenlos. Eine Verlängerung um weitere sieben Tage kostet 49 MXN.' },
    { question: 'Wie kontaktiere ich den Verkäufer?', answer: 'Je nach aktivierten Kontaktdaten der Anzeige können Sie WhatsApp, Telegram, E-Mail, Telefon oder interne Nachrichten verwenden.' },
    { question: 'Garantiert Mercasto Transaktionen?', answer: 'Nein. Mercasto erleichtert Veröffentlichung und Kontakt, aber Käufer und Verkäufer müssen Produkt, Identität, Übergabe und Zahlung selbst prüfen.' },
    { question: 'Was bedeutet ein verifiziertes Konto?', answer: 'Es bedeutet, dass Mercasto eine verfügbare Verifizierung für dieses Konto erfasst hat. Dies ist keine Garantie für Anzeigen oder Transaktionen.' },
  ],
  it: [
    { question: 'Che cos’è Mercasto?', answer: 'Mercasto è una moderna piattaforma di annunci con AI per il Messico. Organizza gli annunci e facilita il contatto diretto tra acquirenti e venditori.' },
    { question: 'Come usa AI Mercasto?', answer: 'Mercasto usa AI per assistere la pubblicazione, migliorare le descrizioni, offrire suggerimenti e supportare la moderazione degli annunci.' },
    { question: 'Quanto costa pubblicare?', answer: 'L’attivazione iniziale di un annuncio idoneo è gratuita per sette giorni. Il rinnovo per altri sette giorni costa 49 MXN.' },
    { question: 'Come contatto il venditore?', answer: 'In base ai contatti abilitati nell’annuncio, puoi usare WhatsApp, Telegram, e-mail, telefono o la messaggistica interna.' },
    { question: 'Mercasto garantisce le transazioni?', answer: 'No. Mercasto facilita la pubblicazione e il contatto, ma acquirente e venditore devono verificare prodotto, identità, consegna e pagamento.' },
    { question: 'Cosa significa account verificato?', answer: 'Significa che Mercasto ha registrato una verifica disponibile per quell’account. Non è una garanzia sugli annunci o sulle transazioni.' },
  ],
  ar: [
    { question: 'ما هو Mercasto؟', answer: 'Mercasto منصة حديثة للإعلانات المبوبة مدعومة بالذكاء الاصطناعي ومخصصة للمكسيك. تنظم الإعلانات وتسهّل التواصل المباشر بين المشترين والبائعين.' },
    { question: 'كيف يستخدم Mercasto الذكاء الاصطناعي؟', answer: 'يستخدم Mercasto الذكاء الاصطناعي للمساعدة في النشر وتحسين الأوصاف وتقديم التوصيات ودعم مراجعة الإعلانات.' },
    { question: 'كم تبلغ تكلفة نشر إعلان؟', answer: 'التفعيل الأولي للإعلان المؤهل مجاني لمدة سبعة أيام. تجديده لسبعة أيام إضافية يكلف 49 MXN.' },
    { question: 'كيف أتواصل مع البائع؟', answer: 'بحسب وسائل الاتصال المفعلة في الإعلان، يمكنك استخدام WhatsApp أو Telegram أو البريد الإلكتروني أو الهاتف أو الرسائل الداخلية.' },
    { question: 'هل يضمن Mercasto المعاملات؟', answer: 'لا. يسهّل Mercasto النشر والتواصل، لكن يجب على المشتري والبائع التحقق من المنتج والهوية والتسليم والدفع بأنفسهم.' },
    { question: 'ماذا يعني الحساب الموثق؟', answer: 'يعني أن Mercasto سجل تحققًا متاحًا لذلك الحساب. ولا يُعد ذلك ضمانًا للإعلانات أو المعاملات.' },
  ],
  ru: [
    { question: 'Что такое Mercasto?', answer: 'Mercasto — современная платформа объявлений с AI для Мексики, которая организует публикации и помогает покупателям напрямую связываться с продавцами.' },
    { question: 'Как Mercasto использует AI?', answer: 'Mercasto использует AI, чтобы помогать с публикацией, улучшать описания, давать рекомендации и поддерживать модерацию объявлений.' },
    { question: 'Сколько стоит публикация?', answer: 'Первая активация подходящего объявления бесплатна на семь дней. Продление ещё на семь дней стоит 49 MXN.' },
    { question: 'Как связаться с продавцом?', answer: 'В зависимости от объявления доступны WhatsApp, Telegram, email, телефон или внутренние сообщения.' },
    { question: 'Mercasto гарантирует сделки?', answer: 'Нет. Mercasto помогает разместить объявление и связаться, а товар, личность, доставку и оплату стороны проверяют самостоятельно.' },
    { question: 'Что означает подтверждённый аккаунт?', answer: 'Это означает, что Mercasto зарегистрировал доступную проверку аккаунта. Это не гарантия объявлений или сделок.' },
  ],
  ja: [
    { question: 'Mercastoとは何ですか？', answer: 'Mercastoはメキシコ向けの最新AIクラシファイド広告プラットフォームです。広告を整理し、買い手と売り手が直接連絡できるようにします。' },
    { question: 'MercastoはAIをどのように使いますか？', answer: 'MercastoはAIを使って出品作成を支援し、説明文を改善し、おすすめを提示し、広告のモデレーションを支援します。' },
    { question: '掲載料金はいくらですか？', answer: '対象となる広告の初回有効化は7日間無料です。さらに7日間更新する場合は49 MXNです。' },
    { question: '売り手にはどう連絡しますか？', answer: '広告で有効になっている連絡方法に応じて、WhatsApp、Telegram、メール、電話、または内部メッセージを利用できます。' },
    { question: 'Mercastoは取引を保証しますか？', answer: 'いいえ。Mercastoは掲載と連絡を支援しますが、商品、本人確認、受け渡し、支払いは買い手と売り手が確認する必要があります。' },
    { question: '認証済みアカウントとは何ですか？', answer: 'Mercastoがそのアカウントで利用可能な認証情報を記録したことを示します。広告や取引を保証するものではありません。' },
  ],
});

export function getHomeFaqCopy(language = 'es') {
  const lang = String(language || 'es').toLowerCase().split('-')[0];
  return HOME_FAQ_COPY[lang] || HOME_FAQ_COPY.es;
}

export { HOME_FAQ_COPY };
