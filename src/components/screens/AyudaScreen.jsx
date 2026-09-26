import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronDown, Search, X,
  PlusCircle, ShoppingBag, UserCircle, ShieldCheck, Star,
} from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { getTranslations } from '../../utils/translations';
import { getHelpCenterCopy } from '../../utils/helpCenterCopy';
import GoldenPublicPageShell from '../shell/GoldenPublicPageShell';

const SECTION_UI = Object.freeze({
  publicar: { icon: PlusCircle, color: 'text-lime-700 dark:text-lime-300', bg: 'bg-lime-50 dark:bg-lime-500/10' },
  comprar: { icon: ShoppingBag, color: 'text-lime-700 dark:text-lime-300', bg: 'bg-lime-50 dark:bg-lime-500/10' },
  cuenta: { icon: UserCircle, color: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-100 dark:bg-slate-800' },
  seguridad: { icon: ShieldCheck, color: 'text-red-600 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-950/30' },
  destacar: { icon: Star, color: 'text-amber-600 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/30' },
});

function FAQItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <button
        type="button"
        onClick={onToggle}
        className="w-full min-h-12 text-left py-4 px-5 flex items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
      >
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-lime-700 dark:group-hover:text-lime-300 transition-colors leading-snug">
          {faq.q}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 mt-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: isOpen ? '400px' : '0px', opacity: isOpen ? 1 : 0 }}
      >
        <div className="px-5 pb-4 text-sm text-slate-500 dark:text-slate-300 leading-relaxed">{faq.a}</div>
      </div>
    </div>
  );
}

export default function AyudaScreen({ shellProps = {} }) {
  const navigate = useNavigate();
  const { lang, loadedLangVersion } = useUI();
  void loadedLangVersion;
  const t = getTranslations(lang);
  const copy = getHelpCenterCopy(lang);
  const sections = copy.sections;
  const [query, setQuery] = useState('');
  const [openItems, setOpenItems] = useState({});
  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries(sections.map(section => [section.id, true]))
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setOpenSections(Object.fromEntries(sections.map(section => [section.id, true])));
    setOpenItems({});
  }, [lang, loadedLangVersion, sections]);

  useEffect(() => {
    if (query.trim()) {
      setOpenSections(Object.fromEntries(sections.map(section => [section.id, true])));
    }
  }, [query, sections]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLocaleLowerCase().trim();
    if (!normalizedQuery) return sections;
    return sections.map(section => ({
      ...section,
      faqs: section.faqs.filter(faq =>
        faq.q.toLocaleLowerCase().includes(normalizedQuery)
        || faq.a.toLocaleLowerCase().includes(normalizedQuery)
      ),
    })).filter(section => section.faqs.length > 0);
  }, [query, sections]);

  const toggleItem = (sectionId, index) => {
    const key = `${sectionId}-${index}`;
    setOpenItems(previous => ({ ...previous, [key]: !previous[key] }));
  };

  const toggleSection = (id) => {
    setOpenSections(previous => ({ ...previous, [id]: !previous[id] }));
  };

  return (
    <GoldenPublicPageShell {...shellProps} testId="golden-help-main" className="mcg-help-page">
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="bg-white border-b border-slate-200 sticky mcg-public-sticky z-10 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2 text-sm">
          <button type="button" data-testid="help-back" onClick={() => navigate(-1)} className="inline-flex min-h-12 items-center gap-1 px-1 text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" /> {t.back}
          </button>
          <span className="text-slate-300 mx-1">|</span>
          <button type="button" data-testid="help-home" className="inline-flex min-h-12 items-center px-1 text-slate-400 cursor-pointer hover:text-lime-600 dark:text-slate-300 dark:hover:text-lime-300" onClick={() => navigate('/')}>Mercasto</button>
          <span className="text-slate-300">›</span>
          <span className="text-slate-600 font-medium dark:text-slate-300">{copy.breadcrumb}</span>
        </div>
      </div>

      <div className="bg-white border-b border-slate-100 dark:border-slate-800 dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 dark:text-white">{copy.heroTitle}</h1>
          <p className="text-slate-500 mb-7 dark:text-slate-300">{copy.heroSubtitle}</p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              data-testid="help-search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-label={copy.searchPlaceholder}
              className="w-full min-h-12 pl-10 pr-12 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
            />
            {query && (
              <button
                type="button"
                data-testid="help-search-clear"
                aria-label={copy.clearSearch}
                onClick={() => setQuery('')}
                className="absolute right-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{copy.noResults} "{query}"</p>
            <p className="text-sm mt-1">
              {copy.tryOther}{' '}
              <button type="button" onClick={() => setQuery('')} className="text-lime-600 underline">{copy.clearSearch}</button>.
            </p>
          </div>
        )}

        {filtered.map(section => {
          const ui = SECTION_UI[section.id] || SECTION_UI.publicar;
          const Icon = ui.icon;
          return (
            <div key={section.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                data-testid={`help-section-${section.id}`}
                onClick={() => toggleSection(section.id)}
                className="w-full min-h-12 flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ui.bg}`}>
                    <Icon className={`w-4 h-4 ${ui.color}`} />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{section.title}</span>
                  <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 dark:bg-slate-800 dark:text-slate-300">{section.faqs.length}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSections[section.id] ? 'rotate-180' : ''}`} />
              </button>

              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: openSections[section.id] ? '2000px' : '0px' }}
              >
                <div className="border-t border-slate-100 dark:border-slate-800">
                  {section.faqs.map((faq, index) => (
                    <FAQItem
                      key={`${section.id}-${index}`}
                      faq={faq}
                      isOpen={Boolean(openItems[`${section.id}-${index}`])}
                      onToggle={() => toggleItem(section.id, index)}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {!query && (
          <div className="bg-gradient-to-br from-lime-50 to-white border border-lime-200 rounded-2xl p-6 text-center mt-6 dark:from-lime-950/30 dark:to-slate-900 dark:border-lime-800/60">
            <p className="font-semibold text-slate-800 mb-1 dark:text-white">{copy.contactTitle}</p>
            <p className="text-sm text-slate-500 mb-4 dark:text-slate-300">{copy.contactBody}</p>
            <button
              type="button"
              data-testid="help-contact-support"
              onClick={() => navigate('/contacto')}
              className="inline-flex min-h-12 items-center gap-2 bg-[#84CC16] hover:bg-[#65A30D] text-slate-950 hover:text-white font-bold rounded-full px-6 py-2.5 text-sm transition-colors"
            >
              {copy.contactButton}
            </button>
          </div>
        )}
      </div>
    </div>
    </GoldenPublicPageShell>
  );
}
