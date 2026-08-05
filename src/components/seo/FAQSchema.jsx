/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react';
import { useUI } from '../../contexts/UIContext';
import { getTranslations } from '../../utils/translations';

const HOME_FAQS_ES = [
  {
    question: '¿Qué es Mercasto?',
    answer: 'Mercasto es una plataforma de anuncios clasificados para México. Organiza publicaciones y facilita el contacto directo entre compradores y vendedores.',
  },
  {
    question: '¿Cuánto cuesta publicar?',
    answer: 'La activación inicial de un anuncio elegible es gratuita durante siete días. Renovarlo por otros siete días cuesta 49 MXN.',
  },
  {
    question: '¿Cómo contacto al vendedor?',
    answer: 'Según los datos habilitados en el anuncio, puedes usar WhatsApp, Telegram, correo, teléfono o el flujo interno de mensajes.',
  },
  {
    question: '¿Mercasto garantiza las transacciones?',
    answer: 'No. Mercasto facilita la publicación y el contacto, pero comprador y vendedor deben verificar el producto, la identidad, la entrega y el pago.',
  },
  {
    question: '¿Qué significa una cuenta verificada?',
    answer: 'Indica que Mercasto registró una verificación disponible para esa cuenta. No constituye una garantía sobre sus anuncios o transacciones.',
  },
];
const HOME_FAQS_EN = [
  { question: 'What is Mercasto?', answer: 'Mercasto is a classifieds platform for Mexico. It organizes listings and helps buyers contact sellers directly.' },
  { question: 'How much does it cost to post?', answer: 'The initial activation of an eligible listing is free for seven days. Renewing it for seven more days costs 49 MXN.' },
  { question: 'How do I contact a seller?', answer: 'Depending on the listing, you can use WhatsApp, Telegram, email, phone, or the internal messaging flow.' },
  { question: 'Does Mercasto guarantee transactions?', answer: 'No. Mercasto facilitates listings and contact, while buyers and sellers must verify the item, identity, delivery, and payment.' },
  { question: 'What does a verified account mean?', answer: 'It means Mercasto recorded an available verification for the account. It is not a guarantee of listings or transactions.' },
];

const HOME_FAQS_RU = [
  { question: 'Что такое Mercasto?', answer: 'Mercasto — платформа объявлений для Мексики, которая организует публикации и помогает покупателям напрямую связаться с продавцами.' },
  { question: 'Сколько стоит публикация?', answer: 'Первая активация подходящего объявления бесплатна на семь дней. Продление ещё на семь дней стоит 49 MXN.' },
  { question: 'Как связаться с продавцом?', answer: 'В зависимости от объявления доступны WhatsApp, Telegram, email, телефон или внутренние сообщения.' },
  { question: 'Mercasto гарантирует сделки?', answer: 'Нет. Mercasto помогает разместить объявление и связаться, а товар, личность, доставку и оплату стороны проверяют самостоятельно.' },
  { question: 'Что означает подтверждённый аккаунт?', answer: 'Это означает, что Mercasto зарегистрировал доступную проверку аккаунта. Это не гарантия объявлений или сделок.' },
];

const HOME_FAQS = {
  es: HOME_FAQS_ES,
  en: HOME_FAQS_EN,
  ru: HOME_FAQS_RU,
};
export const FAQ_DATA = {
  home: HOME_FAQS,
  category: (categoryName) => [
    {
      question: `¿Cómo comprar ${categoryName} en Mercasto?`,
      answer: `Busca en la categoría, compara precio, condición, ubicación y fotos, y contacta al vendedor por los canales habilitados. Verifica el artículo antes de pagar.`,
    },
    {
      question: `¿Cómo vender ${categoryName} en Mercasto?`,
      answer: `Publica información real, fotografías actuales, precio y ubicación. El anuncio puede pasar por revisión antes de quedar activo.`,
    },
    {
      question: `¿Cuánto cuesta publicar ${categoryName}?`,
      answer: `La activación inicial de un anuncio elegible es gratuita durante siete días. La renovación por otros siete días cuesta 49 MXN.`,
    },
  ],
  state: (stateName) => [
    {
      question: `¿Hay anuncios disponibles en ${stateName}?`,
      answer: `La oferta cambia constantemente. Usa los filtros de ubicación y confirma la disponibilidad directamente con el vendedor.`,
    },
    {
      question: `¿Cómo buscar anuncios en ${stateName}?`,
      answer: `Usa la búsqueda y los filtros de categoría, estado, ciudad, precio y características. Las páginas locales solo se publican cuando existe inventario real suficiente.`,
    },
  ],
};
export default function FAQSchema({ faqs, pageType = 'general', lang = 'es' }) {
  useUI();
  const currentLang = lang || 'es';
  const t = getTranslations(currentLang);
  const activeFaqs = pageType === 'home'
    ? (HOME_FAQS[currentLang] || HOME_FAQS_ES)
    : (faqs || []);

  useEffect(() => {
    if (!activeFaqs.length) return undefined;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-schema';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: activeFaqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    });
    document.head.appendChild(script);

    return () => document.getElementById('faq-schema')?.remove();
  }, [activeFaqs]);

  return (
    <div className="mt-8 rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        {t.faq_title || 'Preguntas frecuentes'}
      </h2>
      <div className="space-y-4">
        {activeFaqs.map((faq) => (
          <details key={faq.question} className="border-b border-gray-200 pb-4 dark:border-gray-700">
            <summary className="cursor-pointer font-semibold text-gray-900 hover:text-[#84CC16] dark:text-white">
              {faq.question}
            </summary>
            <p className="mt-2 pl-4 text-gray-600 dark:text-gray-400">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
