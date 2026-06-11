import fs from 'fs';
import path from 'path';

const cleanedPath = path.resolve('./scratch/cleaned_translations.json');
const cleaned = JSON.parse(fs.readFileSync(cleanedPath, 'utf8'));

const footerTranslations = {
  es: {
    about_us: 'Acerca de',
    contact: 'Contacto',
    terms_of_use: 'Términos de uso',
    privacy: 'Privacidad',
    cookies: 'Cookies',
    mercasto_pro: 'Mercasto Pro',
    stores: 'Directorio de Tiendas',
    solutions: 'Soluciones',
    faq_title: 'Preguntas Frecuentes'
  },
  en: {
    about_us: 'About Us',
    contact: 'Contact',
    terms_of_use: 'Terms of Use',
    privacy: 'Privacy',
    cookies: 'Cookies',
    mercasto_pro: 'Mercasto Pro',
    stores: 'Store Directory',
    solutions: 'Solutions',
    faq_title: 'Frequently Asked Questions'
  },
  pt: {
    about_us: 'Sobre nós',
    contact: 'Contato',
    terms_of_use: 'Termos de uso',
    privacy: 'Privacidade',
    cookies: 'Cookies',
    mercasto_pro: 'Mercasto Pro',
    stores: 'Diretório de Lojas',
    solutions: 'Soluções',
    faq_title: 'Perguntas Frequentes'
  },
  ru: {
    about_us: 'О нас',
    contact: 'Контакты',
    terms_of_use: 'Условия использования',
    privacy: 'Конфиденциальность',
    cookies: 'Куки',
    mercasto_pro: 'Mercasto Pro',
    stores: 'Каталог магазинов',
    solutions: 'Решения',
    faq_title: 'Часто задаваемые вопросы'
  },
  zh: {
    about_us: '关于我们',
    contact: '联系我们',
    terms_of_use: '使用条款',
    privacy: '隐私政策',
    cookies: 'Cookies',
    mercasto_pro: 'Mercasto Pro',
    stores: '商家目录',
    solutions: '解决方案',
    faq_title: '常见问题'
  },
  ko: {
    about_us: '회사 소개',
    contact: '문의하기',
    terms_of_use: '이용 약관',
    privacy: '개인정보처리방침',
    cookies: '쿠키',
    mercasto_pro: 'Mercasto Pro',
    stores: '상점 디렉토리',
    solutions: '솔루션',
    faq_title: '자주 묻는 질문'
  },
  de: {
    about_us: 'Über uns',
    contact: 'Kontakt',
    terms_of_use: 'Nutzungsbedingungen',
    privacy: 'Datenschutz',
    cookies: 'Cookies',
    mercasto_pro: 'Mercasto Pro',
    stores: 'Geschäftsverzeichnis',
    solutions: 'Lösungen',
    faq_title: 'Häufig gestellte Fragen'
  },
  it: {
    about_us: 'Chi siamo',
    contact: 'Contatti',
    terms_of_use: 'Termini di utilizzo',
    privacy: 'Privacy',
    cookies: 'Cookie',
    mercasto_pro: 'Mercasto Pro',
    stores: 'Elenco dei negozi',
    solutions: 'Soluzioni',
    faq_title: 'Domande frequenti'
  },
  ar: {
    about_us: 'معلومات عنا',
    contact: 'اتصل بنا',
    terms_of_use: 'شروط الاستخدام',
    privacy: 'الخصوصية',
    cookies: 'ملفات تعريف الارتباط',
    mercasto_pro: 'ميركاستو برو',
    stores: 'دليل المتاجر',
    solutions: 'حلول',
    faq_title: 'الأسئلة الشائعة'
  },
  he: {
    about_us: 'אודותינו',
    contact: 'צור קשר',
    terms_of_use: 'תנאי שימוש',
    privacy: 'פרטיות',
    cookies: 'קובצי Cookie',
    mercasto_pro: 'מרקאסטו פרו',
    stores: 'אינדקס חנויות',
    solutions: 'פתרונות',
    faq_title: 'שאלות נפוצות'
  },
  yi: {
    about_us: 'וועגן אונז',
    contact: 'קאָנטאַקט',
    terms_of_use: 'תנאי שימוש',
    privacy: 'פּריוואַטקייט',
    cookies: 'קאָאָקיעס',
    mercasto_pro: 'מערקאַסטאָ פּראָ',
    stores: 'סטאָר Directory',
    solutions: 'לייזונגען',
    faq_title: 'אָפט געשטעלטע פֿראגן'
  },
  ja: {
    about_us: '会社概要',
    contact: 'お問い合わせ',
    terms_of_use: '利用規約',
    privacy: 'プライバシーポリシー',
    cookies: 'クッキー',
    mercasto_pro: 'Mercasto Pro',
    stores: '店舗ディレクトリ',
    solutions: 'ソリューション',
    faq_title: 'よくある質問'
  },
  fr: {
    about_us: 'À propos',
    contact: 'Contact',
    terms_of_use: "Conditions d'utilisation",
    privacy: 'Confidentialité',
    cookies: 'Cookies',
    mercasto_pro: 'Mercasto Pro',
    stores: 'Annuaire des magasins',
    solutions: 'Solutions',
    faq_title: 'Questions fréquentes'
  }
};

for (const [lang, keys] of Object.entries(footerTranslations)) {
  if (cleaned[lang]) {
    Object.assign(cleaned[lang], keys);
  }
}

fs.writeFileSync(cleanedPath, JSON.stringify(cleaned, null, 2), 'utf8');
console.log("Updated footer translations in cleaned_translations.json!");
