import React, { useEffect, useLayoutEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock3, Home, ShieldCheck } from 'lucide-react';
import SEO from '../SEO';
import { useUI } from '../../contexts/UIContext';
import GoldenPublicPageShell from '../shell/GoldenPublicPageShell';
import { getBlogArticles, getBlogArticle } from '../../content/blogArticles';

const SITE_URL = 'https://mercasto.com';

const copyFor = (lang) => lang === 'es'
  ? {
      back: 'Volver al blog',
      updated: 'Actualizado',
      min: 'min de lectura',
      related: 'Más consejos',
      missingTitle: 'Artículo no encontrado',
      missingBody: 'Este artículo no existe o ya no está disponible.',
      allArticles: 'Ver todos los artículos',
      home: 'Inicio',
    }
  : {
      back: 'Back to blog',
      updated: 'Updated',
      min: 'min read',
      related: 'More tips',
      missingTitle: 'Article not found',
      missingBody: 'This article does not exist or is no longer available.',
      allArticles: 'View all articles',
      home: 'Home',
    };

function BlogArticleSchema({ article }) {
  useEffect(() => {
    if (!article) return undefined;
    const canonical = `${SITE_URL}/blog/${article.slug}`;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'mercasto-blog-article-schema';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      datePublished: article.updatedAt,
      dateModified: article.updatedAt,
      mainEntityOfPage: canonical,
      author: { '@type': 'Organization', name: 'Mercasto', url: SITE_URL },
      publisher: {
        '@type': 'Organization',
        name: 'Mercasto',
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512x512.png` },
      },
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, [article]);

  return null;
}

export default function BlogArticleScreen({ shellProps = {} }) {
  const { slug = '' } = useParams();
  const { lang } = useUI();
  const copy = copyFor(lang);
  const article = getBlogArticle(slug, lang);

  useLayoutEffect(() => {
    document.documentElement.dataset.mercastoSeoOwner = 'blog';
    return () => {
      if (document.documentElement.dataset.mercastoSeoOwner === 'blog') {
        delete document.documentElement.dataset.mercastoSeoOwner;
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (article) return undefined;

    const canonicalUrl = `${SITE_URL}/blog/${slug}`;

    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex,nofollow');

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    return undefined;
  }, [article, slug]);

  if (!article) {
    return (
      <GoldenPublicPageShell {...shellProps} testId="golden-blog-article-main" className="mcg-blog-article-page">
        <SEO
          title={`${copy.missingTitle} | Mercasto`}
          description={copy.missingBody}
          url={`/blog/${slug}`}
          noindex
        />
        <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-16 text-slate-950 dark:bg-slate-950 dark:text-white">
          <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <ShieldCheck className="mx-auto h-10 w-10 text-lime-600 dark:text-lime-300" aria-hidden="true" />
            <h1 className="mt-4 text-3xl font-black">{copy.missingTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.missingBody}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/blog" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#84CC16] px-5 font-black text-slate-950 hover:bg-[#65A30D]">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {copy.allArticles}
              </Link>
              <Link to="/" className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                <Home className="h-4 w-4" aria-hidden="true" />
                {copy.home}
              </Link>
            </div>
          </section>
        </div>
      </GoldenPublicPageShell>
    );
  }

  const related = getBlogArticles(lang).filter(item => item.slug !== article.slug).slice(0, 2);
  const canonical = `/blog/${article.slug}`;

  return (
    <GoldenPublicPageShell {...shellProps} testId="golden-blog-article-main" className="mcg-blog-article-page">
      <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
        <SEO
          title={`${article.title} | Mercasto`}
          description={article.description}
          url={canonical}
          image="https://mercasto.com/icon-512x512.png"
          type="article"
        />
        <BlogArticleSchema article={article} />

        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
            <Link to="/blog" className="inline-flex min-h-12 items-center gap-2 text-sm font-black text-lime-700 hover:text-lime-800 dark:text-lime-300">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              {copy.back}
            </Link>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="rounded-full bg-lime-100 px-3 py-1 text-lime-900 dark:bg-lime-500/10 dark:text-lime-300">{article.category}</span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                {article.readMinutes} {copy.min}
              </span>
              <span>{copy.updated}: <time dateTime={article.updatedAt}>{article.updatedAt}</time></span>
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{article.title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">{article.description}</p>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-9">
            <div className="space-y-9">
              {article.sections.map((section, index) => (
                <section key={section.title} data-testid="blog-article-section">
                  <div className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lime-100 text-sm font-black text-lime-900 dark:bg-lime-500/10 dark:text-lime-300">
                      {index + 1}
                    </span>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">{section.title}</h2>
                      <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">{section.body}</p>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </article>

          <section className="mt-10">
            <h2 className="text-2xl font-black tracking-tight">{copy.related}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {related.map(item => (
                <Link
                  key={item.slug}
                  to={`/blog/${item.slug}`}
                  className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-lime-400 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="text-xs font-black uppercase tracking-wider text-lime-700 dark:text-lime-300">{item.category}</p>
                  <h3 className="mt-2 text-lg font-black">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </GoldenPublicPageShell>
  );
}
