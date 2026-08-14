import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';
import SEO from '../SEO';
import { useUI } from '../../contexts/UIContext';
import { localeFor } from '../../utils/localeFormat';
import {
  GEO_SOURCE_UPDATED_ISO,
  getGeoSourcePage,
  getGeoSourceShellCopy,
} from '../../content/geoSourcePages';

const SITE_URL = 'https://mercasto.com';

function SourceSchema({ page, lang, homeLabel }) {
  useEffect(() => {
    const canonical = `${SITE_URL}${page.path}`;
    const schemaLanguage = lang === 'es' ? 'es-MX' : lang;
    const graph = [
      {
        '@type': page.schemaType,
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: page.title,
        description: page.description,
        inLanguage: schemaLanguage,
        dateModified: GEO_SOURCE_UPDATED_ISO,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: homeLabel, item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: page.heading, item: canonical },
        ],
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Mercasto',
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/icon-512x512.png`,
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          url: `${SITE_URL}/contacto`,
          availableLanguage: [schemaLanguage],
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: 'Mercasto',
        url: `${SITE_URL}/`,
        inLanguage: schemaLanguage,
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ];

    if (page.faqs?.length) {
      graph.push({
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        inLanguage: schemaLanguage,
        mainEntity: page.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      });
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'geo-source-schema';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
    document.head.appendChild(script);

    return () => document.getElementById('geo-source-schema')?.remove();
  }, [homeLabel, lang, page]);

  return null;
}

function formatUpdatedDate(lang) {
  return new Intl.DateTimeFormat(localeFor(lang), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${GEO_SOURCE_UPDATED_ISO}T00:00:00Z`));
}

export default function GeoSourcePage({ slug }) {
  const { lang, loadedLangVersion } = useUI();
  void loadedLangVersion;
  const page = getGeoSourcePage(slug, lang);
  const shell = getGeoSourceShellCopy(lang);

  if (!page) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <SEO
        title={page.title}
        description={page.description}
        url={page.path}
        image="https://mercasto.com/icon-512x512.png"
      />
      <SourceSchema page={page} lang={lang} homeLabel={shell.home} />

      <main>
        <section className="border-b border-slate-200 bg-slate-950 text-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-lime-300">
              <ShieldCheck className="h-4 w-4" />
              {page.eyebrow}
            </div>
            <h1 className="max-w-4xl text-4xl font-black tracking-[-0.045em] sm:text-6xl">
              {page.heading}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              {page.summary}
            </p>
            <div className="mt-7 inline-flex items-center gap-2 text-sm text-slate-400">
              <Clock3 className="h-4 w-4" />
              {shell.updatedLabel}:{' '}
              <time dateTime={GEO_SOURCE_UPDATED_ISO}>{formatUpdatedDate(lang)}</time>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-3">
            {page.sections.map((section) => (
              <article key={section.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black tracking-tight">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{section.body}</p>
                <ul className="mt-5 space-y-3">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm leading-6 text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-lime-600" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          {page.faqs?.length > 0 && (
            <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
              <h2 className="text-2xl font-black tracking-tight">{shell.faqTitle}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {page.faqs.map((faq) => (
                  <article key={faq.question} className="rounded-2xl bg-slate-50 p-5">
                    <h3 className="font-black text-slate-900">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="mt-12 rounded-3xl bg-lime-100 p-6 sm:p-8">
            <h2 className="text-2xl font-black tracking-tight">{shell.relatedTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
              {shell.relatedBody}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {page.related.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center justify-between rounded-2xl border border-lime-300 bg-white px-5 py-4 font-bold text-slate-900 transition hover:border-lime-500 hover:shadow-sm"
                >
                  <span>{item.label}</span>
                  <ArrowRight className="h-5 w-5 text-lime-700 rtl:rotate-180" />
                </Link>
              ))}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
