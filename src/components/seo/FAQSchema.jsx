/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react';
import { useUI } from '../../contexts/UIContext';
import { getTranslations } from '../../utils/translations';
import { getHomeFaqCopy } from '../../utils/homeFaqCopy';

export default function FAQSchema({ faqs, pageType = 'general', lang = 'es', variant = 'default' }) {
  useUI();
  const currentLang = lang || 'es';
  const t = getTranslations(currentLang);
  const activeFaqs = pageType === 'home'
    ? getHomeFaqCopy(currentLang)
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

  // The V2 homepage runs on its own class-based design system, so it must not
  // host the Tailwind card below: same copy, same JSON-LD, different skin.
  if (variant === 'v2') {
    return (
      <div className="v2-faq" data-testid="v2-faq">
        <h2>{t.faq_title || 'FAQ'}</h2>
        <div className="v2-faq-list">
          {activeFaqs.map((faq) => (
            <details key={faq.question} className="v2-faq-item">
              <summary>
                {faq.question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        {t.faq_title || 'FAQ'}
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
