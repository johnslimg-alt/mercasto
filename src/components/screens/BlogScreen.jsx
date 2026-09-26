import React, { useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock3, Newspaper, ShieldCheck, Sparkles } from 'lucide-react';
import SEO from '../SEO';
import { useUI } from '../../contexts/UIContext';
import GoldenPublicPageShell from '../shell/GoldenPublicPageShell';
import { getBlogArticles } from '../../content/blogArticles';

const copyFor = (lang) => lang === 'es'
  ? {
      eyebrow: 'Mercasto Editorial',
      title: 'Consejos y novedades',
      subtitle: 'Guías oficiales para comprar, vender y usar Mercasto con más confianza.',
      latest: 'Últimas publicaciones',
      read: 'Leer artículo',
      min: 'min de lectura',
      safety: 'Consejos prácticos',
      safetyBody: 'Contenido editorial de Mercasto. No sustituye la verificación que cada usuario debe hacer antes de una transacción.',
      seoTitle: 'Consejos y novedades | Mercasto',
      seoDescription: 'Guías oficiales de Mercasto para comprar, vender y usar la plataforma con más seguridad y mejores resultados.',
    }
  : {
      eyebrow: 'Mercasto Editorial',
      title: 'Tips and updates',
      subtitle: 'Official guides for buying, selling, and using Mercasto with more confidence.',
      latest: 'Latest posts',
      read: 'Read article',
      min: 'min read',
      safety: 'Practical guidance',
      safetyBody: 'Mercasto editorial content. It does not replace the checks each user should make before a transaction.',
      seoTitle: 'Tips and updates | Mercasto',
      seoDescription: 'Official Mercasto guides for buying, selling, and using the platform more safely and effectively.',
    };

export default function BlogScreen({ shellProps = {} }) {
  const { lang } = useUI();
  const copy = copyFor(lang);
  const articles = getBlogArticles(lang);

  useLayoutEffect(() => {
    document.documentElement.dataset.mercastoSeoOwner = 'blog';
    return () => {
      if (document.documentElement.dataset.mercastoSeoOwner === 'blog') {
        delete document.documentElement.dataset.mercastoSeoOwner;
      }
    };
  }, []);

  return (
    <GoldenPublicPageShell {...shellProps} testId="golden-blog-main" className="mcg-blog-page">
      <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
        <SEO
          title={copy.seoTitle}
          description={copy.seoDescription}
          url="/blog"
          image="https://mercasto.com/icon-512x512.png"
          type="website"
        />

        <section className="border-b border-slate-200 bg-slate-950 text-white dark:border-slate-800">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-lime-300">
              <Newspaper className="h-4 w-4" aria-hidden="true" />
              {copy.eyebrow}
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.045em] sm:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">{copy.subtitle}</p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black tracking-tight">{copy.latest}</h2>
            <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black text-lime-800 dark:bg-lime-500/10 dark:text-lime-300">
              {articles.length}
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {articles.map((article, index) => (
              <article
                key={article.slug}
                data-testid="blog-card"
                className="group flex min-h-[300px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <div className={"flex h-28 items-end p-5 " + (
                  index === 0
                    ? 'bg-gradient-to-br from-lime-200 via-lime-100 to-white dark:from-lime-900/70 dark:via-slate-900 dark:to-slate-950'
                    : index === 1
                      ? 'bg-gradient-to-br from-slate-200 via-slate-100 to-white dark:from-slate-800 dark:via-slate-900 dark:to-slate-950'
                      : 'bg-gradient-to-br from-amber-200 via-amber-100 to-white dark:from-amber-900/60 dark:via-slate-900 dark:to-slate-950'
                )}>
                  {index === 1
                    ? <ShieldCheck className="h-9 w-9 text-lime-700 dark:text-lime-300" aria-hidden="true" />
                    : index === 2
                      ? <Sparkles className="h-9 w-9 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                      : <BookOpen className="h-9 w-9 text-lime-800 dark:text-lime-300" aria-hidden="true" />}
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{article.category}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {article.readMinutes} {copy.min}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950 dark:text-white">{article.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{article.description}</p>
                  <Link
                    to={`/blog/${article.slug}`}
                    className="mt-5 inline-flex min-h-12 items-center justify-between rounded-2xl border border-lime-300 bg-lime-50 px-4 font-black text-lime-900 transition hover:bg-lime-100 dark:border-lime-800/70 dark:bg-lime-950/30 dark:text-lime-300 dark:hover:bg-lime-950/50"
                  >
                    <span>{copy.read}</span>
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <aside className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <h2 className="text-xl font-black">{copy.safety}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.safetyBody}</p>
          </aside>
        </div>
      </div>
    </GoldenPublicPageShell>
  );
}
