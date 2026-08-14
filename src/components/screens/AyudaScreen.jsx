import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronDown, Search, X,
  PlusCircle, ShoppingBag, UserCircle, ShieldCheck, Star,
} from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { getTranslations } from '../../utils/translations';
import { getHelpCenterCopy } from '../../utils/helpCenterCopy';

const SECTION_UI = Object.freeze({
  publicar: { icon: PlusCircle, color: 'text-lime-600', bg: 'bg-lime-50' },
  comprar: { icon: ShoppingBag, color: 'text-sky-600', bg: 'bg-sky-50' },
  cuenta: { icon: UserCircle, color: 'text-violet-600', bg: 'bg-violet-50' },
  seguridad: { icon: ShieldCheck, color: 'text-red-500', bg: 'bg-red-50' },
  destacar: { icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
});

function FAQItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left py-4 px-5 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors group"
      >
        <span className="text-sm font-medium text-slate-800 group-hover:text-lime-700 transition-colors leading-snug">
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
        <div className="px-5 pb-4 text-sm text-slate-500 leading-relaxed">{faq.a}</div>
      </div>
    </div>
  );
}

export default function AyudaScreen() {
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
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2 text-sm">
          <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronLeft className="w-4 h-4" /> {t.back}
          </button>
          <span className="text-slate-300 mx-1">|</span>
          <button type="button" className="text-slate-400 cursor-pointer hover:text-lime-600" onClick={() => navigate('/')}>Mercasto</button>
          <span className="text-slate-300">›</span>
          <span className="text-slate-600 font-medium">{copy.breadcrumb}</span>
        </div>
      </div>

      <div className="bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">{copy.heroTitle}</h1>
          <p className="text-slate-500 mb-7">{copy.heroSubtitle}</p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-label={copy.searchPlaceholder}
              className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 bg-slate-50"
            />
            {query && (
              <button
                type="button"
                aria-label={copy.clearSearch}
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
            <div key={section.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ui.bg}`}>
                    <Icon className={`w-4 h-4 ${ui.color}`} />
                  </div>
                  <span className="font-bold text-slate-900">{section.title}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{section.faqs.length}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSections[section.id] ? 'rotate-180' : ''}`} />
              </button>

              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: openSections[section.id] ? '2000px' : '0px' }}
              >
                <div className="border-t border-slate-100">
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
          <div className="bg-gradient-to-br from-lime-50 to-teal-50 border border-lime-200 rounded-2xl p-6 text-center mt-6">
            <p className="font-semibold text-slate-800 mb-1">{copy.contactTitle}</p>
            <p className="text-sm text-slate-500 mb-4">{copy.contactBody}</p>
            <button
              type="button"
              onClick={() => navigate('/contacto')}
              className="inline-flex items-center gap-2 bg-lime-500 hover:bg-lime-600 text-white font-semibold rounded-full px-6 py-2.5 text-sm transition-colors"
            >
              {copy.contactButton}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
