import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  PlusCircle, ChevronRight, ChevronLeft, Trash2, Camera, Loader2,
  Sparkles, Video, MapPin, Tag, Zap, Car, Home, Briefcase,
  ShoppingBag, Dog, Monitor, Smartphone, Shirt, Baby, Dumbbell,
  BookOpen, Package, Cpu, Settings2, Ticket, Building2, Check,
  Phone, MessageCircle, Send, Locate, Compass,
} from 'lucide-react';
import { mexicoLocations, subcategoriesMap } from '../../constants/locationsAndCategories';
import { filterConfig, autoModelsByBrand } from '../../constants/filterConfig';
import { filterOptionDisplayLabel, filterOptionValue } from '../../utils/filterOptionTranslations';
import { getGlobalFilterDefinitions } from '../../constants/globalFilterOptions';
import { subcategoriesByLang } from '../../constants/subcategoryTranslations';
import MapV3 from '../common/MapV3';
import SortablePhotoGrid from '../SortablePhotoGrid';
import { events } from '../../utils/analytics';
import { isPublishFormEmpty, readPublishDraft, writePublishDraft } from '../../utils/publishDraft';

// Mirrors App.jsx's getSubcategoryOptions: some categories (currently only "turismo") store a
// stable slug as the subcategory value (matching real listing data + the search filter dropdown),
// while the rest store the canonical Spanish label text as-is. Always posts in Spanish, since ad
// content itself is not translated per-poster-language.
function getPostSubcategoryOptions(category, lang = 'es') {
  const taxonomyCategory = category === 'coches' ? 'motor' : category;
  const canonical = subcategoriesByLang.es[taxonomyCategory];
  const localized = subcategoriesByLang[lang]?.[taxonomyCategory];

  if (canonical && !Array.isArray(canonical)) {
    return Object.keys(canonical).map((slug) => ({
      value: slug,
      label: (!Array.isArray(localized) && localized?.[slug]) || canonical[slug],
    }));
  }

  const canonicalLabels = Array.isArray(canonical)
    ? canonical
    : (subcategoriesMap[taxonomyCategory] || subcategoriesMap[category] || []);
  const localizedLabels = Array.isArray(localized) ? localized : canonicalLabels;

  return canonicalLabels.map((value, index) => ({
    value,
    label: localizedLabels[index] || value,
  }));
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

const MEXICO_STATES = Object.keys(mexicoLocations);

const CATEGORY_ICONS = {
  coches: Car, motor: Car, inmobiliaria: Home, empleo: Briefcase,
  servicios: Settings2, moda: Shirt, hogar: Home, electronica: Monitor,
  telefonos: Smartphone, deportes: Dumbbell, infantil: Baby, bebes: Baby,
  mascotas: Dog, negocios: Building2, formacion: BookOpen,
  informatica: Cpu, coleccionismo: Package, productos: ShoppingBag, turismo: Compass,
};

const PRODUCT_GROUPS = ['electronica', 'hogar', 'moda', 'ocio', 'infantil', 'mascotas', 'formacion'];

// Фасеты публикации — сохраняются в form.attributes (filterConfig) и используются фильтрами поиска
// (доставки нет: продажа напрямую покупатель↔продавец).
function getSaleFacets(t) {
  const definitions = Object.fromEntries(getGlobalFilterDefinitions(t).map((definition) => [definition.id, definition]));
  return ['listing_type', 'payment_method', 'warranty', 'negotiable', 'seller_response'].map((key) => {
    const definition = definitions[key];
    const options = definition?.options || [];
    return {
      key,
      label: definition?.label || key,
      options: key === 'warranty'
        ? [{ value: 'Sin garantía', label: t.gf_no_warranty }, ...options]
        : options,
    };
  });
}

const CONTACT_METHODS = [
  { id: 'phone', labelKey: 'phone', icon: Phone, hintKey: 'post_calls' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, hintKey: 'messages' },
  { id: 'telegram', label: 'Telegram', icon: Send, hintKey: 'post_username' },
];

const fieldClass = 'w-full min-h-12 sm:min-h-0 px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500';
const selectFieldClass = fieldClass + ' cursor-pointer';
const labelClass = 'block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2';

function Stepper({ step, t }) {
  const labels = [t.category, t.post_step_details, t.post_step_contact];
  return (
    <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-5">
      {labels.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-[#84CC16] text-slate-950 shadow-md' : done ? 'bg-[#84CC16]/25 text-[#65A30D]' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              {done ? <Check size={14} /> : n}
            </span>
            <span data-testid={`publish-step-${n}`} className={`text-xs md:text-sm font-semibold ${active ? 'text-slate-950 dark:text-white' : 'text-slate-400'}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function PostScreen({
  categoriesData,
  editingAd,
  form,
  handleImageChange,
  handlePostSubmit,
  images,
  isMapUpdating,
  lang,
  listingQualityPreflight,
  clearListingQualityPreflight,
  postLoading,
  removeImage,
  removeImageById,
  reorderImages,
  setEditingAd,
  setForm,
  setVideoFile,
  t,
  videoFile,
  aiLoading,
  handleGenerateDescription,
  user,
  setUser,
}) {
  const location = useLocation();
  const saleFacets = useMemo(() => getSaleFacets(t), [t]);
  const preselectedCategory = location.state?.preselectedCategory || '';
  const [recoveredDraft] = useState(() => (
    !editingAd && !preselectedCategory ? readPublishDraft() : null
  ));
  const initialDraftForm = recoveredDraft?.form || form;
  const initialDraftContact = recoveredDraft?.contact || {};
  const [step, setStep] = useState(() => recoveredDraft?.step || 1);
  const [draftHydrated, setDraftHydrated] = useState(() => !recoveredDraft);
  const [draftRecovered, setDraftRecovered] = useState(false);
  const hasQualityWarnings = !!listingQualityPreflight?.passes_hard_validation && (listingQualityPreflight?.warnings || []).length > 0;

  useEffect(() => {
    clearListingQualityPreflight?.(null);
  }, [form, images, videoFile, clearListingQualityPreflight]);

  useEffect(() => {
    const preselected = preselectedCategory;
    if (preselected) {
      handleParentCategorySelect(preselected);
    }
  }, [preselectedCategory]);

  const [apiAttributes, setApiAttributes] = useState(null);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [customCity, setCustomCity] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [savingContact, setSavingContact] = useState(false);

  const [selectedParentCategory, setSelectedParentCategory] = useState(() => {
    const parentMap = {
      electronica: 'productos',
      hogar: 'productos',
      moda: 'productos',
      ocio: 'productos',
      infantil: 'productos',
      mascotas: 'productos',
      formacion: 'productos',
    };
    return parentMap[initialDraftForm.category] || '';
  });

  const handleParentCategorySelect = (slug) => {
    if (slug === 'productos') {
      setSelectedParentCategory(slug);
      setForm({ ...form, category: '', subcategory: '', attributes: {} });
    } else {
      setSelectedParentCategory('');
      setForm({ ...form, category: slug, subcategory: '', attributes: {} });
    }
  };

  const handleProductGroupSelect = (slug) => {
    setForm({ ...form, category: slug, subcategory: '', attributes: {} });
  };

  /* ---------- contact step state ---------- */
  const [contactMethods, setContactMethods] = useState(() => {
    if (initialDraftContact.contactMethods?.length) return initialDraftContact.contactMethods;
    const methods = [];
    if (user?.phone_number) methods.push('phone');
    if (user?.whatsapp) methods.push('whatsapp');
    if (user?.telegram_username) methods.push('telegram');
    return methods.length ? methods : ['whatsapp'];
  });
  const profileWhatsapp = String(user?.whatsapp || '').trim();
  const profileWhatsappIsUsername = profileWhatsapp.startsWith('@');
  const [waMode, setWaMode] = useState(
    initialDraftContact.waMode || (profileWhatsappIsUsername ? 'username' : 'phone'),
  );
  const [phoneValue, setPhoneValue] = useState(
    initialDraftContact.phoneValue || user?.phone_number || (profileWhatsappIsUsername ? '' : profileWhatsapp),
  );
  const [waUsername, setWaUsername] = useState(
    initialDraftContact.waUsername || (profileWhatsappIsUsername ? profileWhatsapp.replace(/^@/, '') : ''),
  );
  const [telegramValue, setTelegramValue] = useState(
    initialDraftContact.telegramValue || user?.telegram_username || '',
  );

  useEffect(() => {
    if (editingAd || !recoveredDraft) return;
    setForm((current) => (isPublishFormEmpty(current) ? {
      ...current,
      ...recoveredDraft.form,
      attributes: { ...(recoveredDraft.form.attributes || {}) },
    } : current));
    setDraftRecovered(true);
    setDraftHydrated(true);
    events.publishStep('draft_restored', recoveredDraft.form.category || '', {
      source: 'session_draft',
      draft_age_ms: Math.max(0, Date.now() - recoveredDraft.savedAt),
    });
  }, [editingAd, recoveredDraft, setForm]);

  useEffect(() => {
    if (editingAd || !draftHydrated) return undefined;
    const timer = window.setTimeout(() => {
      writePublishDraft({
        step,
        form,
        contact: { contactMethods, waMode, phoneValue, waUsername, telegramValue },
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    contactMethods,
    draftHydrated,
    editingAd,
    form,
    phoneValue,
    step,
    telegramValue,
    waMode,
    waUsername,
  ]);

  // Reset city mode when state changes
  useEffect(() => {
    setCustomCity(false);
  }, [form.state]);

  // Fetch dynamic attributes from API when category changes
  useEffect(() => {
    if (!form.category) {
      setApiAttributes(null);
      setAttributesLoading(false);
      return;
    }
    let cancelled = false;
    setAttributesLoading(true);
    fetch(`${API_URL}/category-attributes?category=${encodeURIComponent(form.category)}`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (!cancelled) setApiAttributes(Array.isArray(data) && data.length > 0 ? data : null);
      })
      .catch(() => { if (!cancelled) setApiAttributes(null); })
      .finally(() => { if (!cancelled) setAttributesLoading(false); });
    return () => { cancelled = true; };
  }, [form.category]);

  // Prune stale attribute keys when category's attribute list changes
  const dynamicAttributes = useMemo(() => {
    if (apiAttributes && apiAttributes.length > 0) return apiAttributes;
    return filterConfig[form.category] || [];
  }, [apiAttributes, form.category]);

  useEffect(() => {
    if (!form.category || dynamicAttributes.length === 0 || !form.attributes) return;
    const validKeys = new Set(dynamicAttributes.map(f => f.id || f.key));
    saleFacets.forEach(f => validKeys.add(f.key));
    const pruned = Object.fromEntries(
      Object.entries(form.attributes).filter(([k]) => validKeys.has(k))
    );
    if (Object.keys(pruned).length !== Object.keys(form.attributes).length) {
      setForm(prev => ({ ...prev, attributes: pruned }));
    }
  }, [dynamicAttributes, form.category, saleFacets, setForm]);

  // Set GPS coords
  const setCoords = (lat, lng) => {
    setForm(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      location: prev.location || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    }));
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      alert(t.post_gps_unsupported);
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords(pos.coords.latitude, pos.coords.longitude); setGpsLoading(false); },
      () => { setGpsLoading(false); alert(t.post_gps_failed); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Step navigation with JS validation
  const goNext = () => {
    if (step === 1) {
      if (!form.category) { alert(t.select_category); return; }
      const subs = getPostSubcategoryOptions(form.category, lang);
      if (subs.length > 0 && !form.subcategory) { alert(t.post_select_subcategory); return; }
      events.publishStep('details', form.category || '', { source: 'publish_flow' });
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 2) {
      const errs = {};
      if (!form.title?.trim()) errs.title = t.post_field_required.replace('{field}', t.ad_title);
      if (!form.price) errs.price = t.post_field_required.replace('{field}', t.ad_price);
      if (!form.description?.trim()) errs.description = t.post_field_required.replace('{field}', t.ad_desc);
      // Validate required dynamic attributes
      dynamicAttributes.forEach(field => {
        const key = field.id || field.key || '';
        const label = field.label || '';
        if (key === 'subcategory' || /subcategor/i.test(label)) {
          if (field.required && !form.subcategory) {
            errs[`attr_${key}`] = t.post_field_required.replace('{field}', t[`filter_label_${key}`] || key);
          }
        } else {
          if (field.required && !form.attributes?.[key]) {
            errs[`attr_${key}`] = t.post_field_required.replace('{field}', t[`filter_label_${key}`] || key);
          }
        }
      });
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
      setErrors({});
      events.publishStep('contact', form.category || '', { source: 'publish_flow' });
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goBack = () => { setStep(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const mapQuery = form.location || form.state || 'México';

  const phoneDigitsOk = (phoneValue || '').replace(/\D/g, '').length === 10;
  const step3Valid = !!form.state && !!form.city && !!form.location && contactMethods.length > 0
    && (!contactMethods.includes('phone') || phoneDigitsOk)
    && (!contactMethods.includes('whatsapp') || (waMode === 'username' ? !!waUsername.trim() : phoneDigitsOk))
    && (!contactMethods.includes('telegram') || !!telegramValue.trim());

  /* ---------- submit: sync contact info to profile, then publish ---------- */
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!step3Valid) return;

    const nextPhone = contactMethods.includes('phone') || (contactMethods.includes('whatsapp') && waMode === 'phone') ? phoneValue : (user?.phone_number || '');
    const nextWhatsapp = contactMethods.includes('whatsapp') ? (waMode === 'username' ? `@${waUsername.replace(/^@/, '')}` : phoneValue) : (user?.whatsapp || '');
    const whatsappChanged = nextWhatsapp !== (user?.whatsapp || '');
    const phoneChanged = nextPhone !== (user?.phone_number || '');

    if (user && (whatsappChanged || phoneChanged)) {
      setSavingContact(true);
      try {
        const token = localStorage.getItem('auth_token');
        const profileData = new FormData();
        profileData.append('name', user.name || '');
        if (nextWhatsapp) profileData.append('whatsapp', nextWhatsapp);
        if (nextPhone) profileData.append('phone_number', nextPhone);
        const res = await fetch(`${API_URL}/user/profile`, {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: profileData
        });
        if (res.ok && setUser) {
          const updatedUser = await res.json();
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } catch (err) { console.error('Contact sync error', err); }
      finally { setSavingContact(false); }
    }

    handlePostSubmit(e, { acceptWarnings: hasQualityWarnings });
  };

  // Render a dynamic attribute field
  const renderAttrField = (field) => {
    const key = field.id || field.key;
    const val = form.attributes?.[key] || '';
    const errKey = `attr_${key}`;
    const hasErr = !!errors[errKey];
    const fieldLabel = t[`filter_label_${key}`] || key;
    const baseClass = `w-full min-h-12 sm:min-h-0 px-3.5 py-2.5 border ${hasErr ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'} rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-all`;
    const onChange = v => setForm(prev => ({ ...prev, attributes: { ...(prev.attributes || {}), [key]: v } }));

    if (key === 'modelo') {
      const selectedBrand = form.attributes?.marca || '';
      const models = autoModelsByBrand[selectedBrand];
      if (models?.length > 0) {
        return (
          <div key={key} className="space-y-2">
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              {t[`filter_label_${key}`] || key}{field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select data-testid={`post-attribute-${key}`} aria-label={fieldLabel} value={val} onChange={e => onChange(e.target.value)} className={baseClass + ' cursor-pointer'}>
              <option value="">{t.select}</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
              <option value="Otro">{t.post_other_model}</option>
            </select>
            {val === 'Otro' && (
              <input
                type="text"
                aria-label={`${fieldLabel}: ${t.post_other_model}`}
                value={form.attributes?.modelo_otro || ''}
                onChange={e => setForm(prev => ({ ...prev, attributes: { ...(prev.attributes || {}), modelo_otro: e.target.value, modelo: e.target.value } }))}
                placeholder={t.post_specify_model}
                className={baseClass + ' mt-2'}
              />
            )}
            {hasErr && <p className="text-xs text-red-500">{errors[errKey]}</p>}
          </div>
        );
      }
    }

    if ((field.type === 'select' || field.type === 'checkbox') && field.options?.length > 0) {
      return (
        <div key={key} className="space-y-2">
          <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            {t[`filter_label_${key}`] || key}{field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select data-testid={`post-attribute-${key}`} aria-label={fieldLabel} value={val} onChange={e => onChange(e.target.value)} className={baseClass + ' cursor-pointer'}>
            <option value="">{t.select}</option>
            {field.options.map(o => { const value = filterOptionValue(o); return <option key={value} value={value}>{filterOptionDisplayLabel(key, o, lang)}</option>; })}
          </select>
          {hasErr && <p className="text-xs text-red-500">{errors[errKey]}</p>}
        </div>
      );
    }
    if (field.type === 'number' || field.type === 'range') {
      return (
        <div key={key} className="space-y-2">
          <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            {t[`filter_label_${key}`] || key}{field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input type="number" aria-label={fieldLabel} value={val} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} className={baseClass} />
          {hasErr && <p className="text-xs text-red-500">{errors[errKey]}</p>}
        </div>
      );
    }
    return (
      <div key={key} className="space-y-2">
        <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300">
          {t[`filter_label_${key}`] || key}{field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input type="text" aria-label={fieldLabel} value={val} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} className={baseClass} />
        {hasErr && <p className="text-xs text-red-500">{errors[errKey]}</p>}
      </div>
    );
  };

  return (
    <div className="bg-[var(--paper)] min-h-screen w-full flex items-start justify-center py-6 md:py-10 px-4 pb-28 md:pb-10">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-950 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-10 shadow-sm">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <PlusCircle className="text-[#84CC16]" size={26} />
            {editingAd ? t.edit_ad : t.post_title}
          </h2>
          {editingAd && (
            <button type="button" onClick={() => setEditingAd(null)} className="shrink-0 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              {t.cancel}
            </button>
          )}
        </div>
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-lime-50 px-3 py-1.5 text-xs font-extrabold text-lime-800 dark:bg-lime-500/10 dark:text-lime-300" data-testid="publish-ai-brand-message">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {t.ai_brand_tagline}
        </div>

        <Stepper step={step} t={t} />

        {draftRecovered && (
          <div
            className="mb-5 rounded-xl border border-lime-300 bg-lime-50 px-4 py-3 text-[13px] font-semibold text-lime-900 dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-lime-200"
            data-testid="publish-draft-restored"
          >
            {t.post_draft_restored}
          </div>
        )}

        {/* KEY FIX: noValidate disables browser HTML5 validation */}
        <form onSubmit={handleFinalSubmit} noValidate className="space-y-6">

          {/* ══════════════ STEP 1 — Categoría ══════════════ */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <label className="block text-[14px] font-bold text-slate-700 dark:text-slate-300 mb-3">
                  {t.select_category}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categoriesData
                    .filter(cat => {
                      const excludedSlugs = new Set([
                        'electronica', 'hogar', 'moda', 'ocio', 'infantil', 'mascotas', 'formacion',
                      ]);
                      return !excludedSlugs.has(cat.slug);
                    })
                    .map(cat => {
                      const Icon = CATEGORY_ICONS[cat.slug] || Tag;
                      const selected = selectedParentCategory === cat.slug || (selectedParentCategory === '' && form.category === cat.slug);
                      return (
                        <button
                          key={cat.slug}
                          type="button"
                          onClick={() => handleParentCategorySelect(cat.slug)}
                          className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${selected ? 'border-[#84CC16] bg-[#F7FEE7] dark:bg-slate-900/60 ring-2 ring-[#84CC16]' : 'border-slate-200 dark:border-slate-800 hover:border-[#84CC16] hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                          <Icon size={24} className={selected ? 'text-[#65A30D]' : 'text-slate-500'} />
                          <span className="text-[13px] font-bold mt-2 text-slate-800 dark:text-slate-100">
                            {cat.name?.[lang] || cat.slug}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* PRODUCT GROUPS (Level 2 for Goods) */}
              {selectedParentCategory === 'productos' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <label className="block text-[14px] font-bold text-slate-700 dark:text-slate-300 mb-3">
                    {t.post_select_product_type}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PRODUCT_GROUPS.map(slug => {
                      const group = categoriesData.find((cat) => cat.slug === slug);
                      const selected = form.category === slug;
                      return (
                        <button
                          key={slug}
                          type="button"
                          onClick={() => handleProductGroupSelect(slug)}
                          className={`p-3 rounded-lg border text-center transition-all text-xs font-semibold ${selected ? 'border-[#84CC16] bg-[#F7FEE7] dark:bg-slate-900/60 ring-2 ring-[#84CC16]' : 'border-slate-200 dark:border-slate-800 hover:border-[#84CC16] hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                          {group?.name?.[lang] || slug}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}


              {/* SUBCATEGORY (Level 3) */}
              {form.category && getPostSubcategoryOptions(form.category, lang).length > 0 && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <label className="block text-[14px] font-bold text-slate-700 dark:text-slate-300 mb-3">
                    {t.post_select_subcategory}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {getPostSubcategoryOptions(form.category, lang).map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm({ ...form, subcategory: value })}
                        className={`p-3 rounded-lg border text-center transition-all text-xs font-semibold ${form.subcategory === value ? 'border-[#84CC16] bg-[#F7FEE7] dark:bg-slate-900/60 ring-2 ring-[#84CC16]' : 'border-slate-200 dark:border-slate-800 hover:border-[#84CC16] hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="hidden md:flex justify-end pt-6">
                <button
                  type="button"
                  disabled={!form.category || (getPostSubcategoryOptions(form.category, lang).length > 0 && !form.subcategory)}
                  onClick={goNext}
                  className="btn-lg bg-[#0F172A] text-white hover:bg-black flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.next_btn} <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ══════════════ STEP 2 — Detalles ══════════════ */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">

              {/* Title */}
              <div>
                <label className={labelClass}>{t.ad_title}</label>
                <input
                  data-testid="publish-title"
                  aria-label={t.ad_title}
                  value={form.title}
                  onChange={e => { setForm({ ...form, title: e.target.value }); if (errors.title) setErrors(p => ({ ...p, title: null })); }}
                  className={`w-full min-h-12 sm:min-h-0 px-3.5 py-2.5 border ${errors.title ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'} rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white`}
                  placeholder={t.post_title_placeholder}
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>

              {/* Photos */}
              <div>
                <label className={labelClass}>
                  {t.ad_photos} <span className="font-normal text-slate-400">({images.length}/10)</span>
                </label>
                {images.length > 0 ? (
                  <div className="w-full space-y-3">
                    <SortablePhotoGrid photos={images} onReorder={reorderImages} onDelete={removeImageById || removeImage} />
                    {images.length < 10 && (
                      <label className="aspect-square border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-center hover:bg-[#84CC16]/5 hover:border-[#84CC16]/50 transition-all cursor-pointer bg-slate-50 dark:bg-slate-950 w-full py-4">
                        <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
                        <PlusCircle className="text-slate-400" size={22} />
                        <span className="text-xs text-slate-400 mt-1">{t.add_more_photos}</span>
                      </label>
                    )}
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-[#84CC16]/5 hover:border-[#84CC16]/50 transition-all cursor-pointer h-40 md:h-48 bg-slate-50 dark:bg-slate-950">
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
                    <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mb-3 shadow-sm">
                      <Camera className="text-slate-400" size={28} />
                    </div>
                    <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200 mb-1">
                      {t.drag_photos_hint} <span className="text-[#65A30D]">{t.browse_label}</span>
                    </p>
                    <p className="text-[12px] text-slate-500">{t.max_photos_hint}</p>
                  </label>
                )}
              </div>

              {/* Video */}
              <div>
                <label className={labelClass}>{t.video_hint}</label>
                {videoFile ? (
                  <div className="flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <Video className="text-slate-500" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{videoFile.name}</span>
                    <button type="button" onClick={() => setVideoFile(null)} className="p-1 text-slate-400 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-[#84CC16]/5 hover:border-[#84CC16]/50 transition-all cursor-pointer">
                    <input type="file" accept="video/mp4,video/quicktime" onChange={e => setVideoFile(e.target.files[0])} className="hidden" />
                    <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-800">
                      <Video className="text-[#65A30D]" size={20} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{t.video_opt}</p>
                      <p className="text-[11px] text-slate-500">{t.no_file_selected}</p>
                    </div>
                  </label>
                )}
              </div>

              {/* Condition + Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>{t.condition}</label>
                  <select
                    aria-label={t.condition}
                    value={form.condition}
                    onChange={e => setForm({ ...form, condition: e.target.value })}
                    className={selectFieldClass}
                  >
                    <option value="nuevo">{t.new}</option>
                    <option value="usado">{t.used}</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t.ad_price}</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-slate-400 text-[14px]">$</span>
                    <input
                      type="number"
                      data-testid="publish-price"
                      aria-label={t.ad_price}
                      value={form.price}
                      onChange={e => { setForm({ ...form, price: e.target.value }); if (errors.price) setErrors(p => ({ ...p, price: null })); }}
                      className={`w-full min-h-12 sm:min-h-0 px-3.5 py-2.5 pl-7 border ${errors.price ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'} rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
                </div>
              </div>

              {/* Dynamic attributes */}
              {form.category && (attributesLoading || dynamicAttributes.length > 0) && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/50">
                  <h3 className="text-[14px] font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Zap size={16} className="text-[#84CC16]" />
                    {t.ad_attributes}
                    {attributesLoading && <Loader2 size={14} className="animate-spin text-slate-400" />}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dynamicAttributes.filter(field => {
                      const k = field.id || field.key || '';
                      const label = field.label || '';
                      return k !== 'subcategory' && !/subcategor/i.test(label);
                    }).map(field => renderAttrField(field))}
                  </div>
                </div>
              )}

              {/* Detalles de venta (фасеты для фильтров поиска) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/50">
                <h3 className="text-[14px] font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Zap size={16} className="text-[#84CC16]" />
                  {t.sale_details}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {saleFacets.map(f => (
                    <div key={f.key} className="space-y-2">
                      <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300">{f.label}</label>
                      <select
                        aria-label={f.label}
                        value={form.attributes?.[f.key] || ''}
                        onChange={e => setForm(prev => ({ ...prev, attributes: { ...(prev.attributes || {}), [f.key]: e.target.value } }))}
                        className={selectFieldClass}
                      >
                        <option value="">{t.select_optional}</option>
                        {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Description */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClass + ' mb-0'}>{t.ad_desc}</label>
                  {handleGenerateDescription && (
                    <button
                      type="button"
                      data-testid="publish-generate-ai"
                      onClick={handleGenerateDescription}
                      disabled={aiLoading}
                      className="flex min-h-12 sm:min-h-0 items-center gap-1.5 px-2 sm:px-0 text-xs font-semibold text-[#65A30D] hover:text-[#84CC16] disabled:opacity-50 transition-colors"
                    >
                      {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      {t.generate_ai}
                    </button>
                  )}
                </div>
                <textarea
                  data-testid="publish-description"
                  aria-label={t.ad_desc}
                  value={form.description}
                  onChange={e => { setForm({ ...form, description: e.target.value }); if (errors.description) setErrors(p => ({ ...p, description: null })); }}
                  className={`w-full px-3.5 py-2.5 border ${errors.description ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'} rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all min-h-[140px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white`}
                  placeholder={t.ad_desc}
                />
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
              </div>

              {/* Step 2 navigation */}
              <div className="hidden md:flex justify-between items-center pt-6">
                <button type="button" onClick={goBack} className="btn-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
                  <ChevronLeft size={16} /> {t.back}
                </button>
                <button type="button" onClick={goNext} className="btn-lg bg-[#0F172A] text-white hover:bg-black flex items-center gap-1.5">
                  {t.next_btn} <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ══════════════ STEP 3 — Contacto ══════════════ */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">

              {/* State + City */}
              <div>
                <h3 className="text-[14px] font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <MapPin size={16} className="text-[#84CC16]" /> {t.location}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>
                      {t.state} <span className="text-red-500">*</span>
                    </label>
                    <select
                      data-testid="publish-state"
                      aria-label={t.state}
                      value={form.state || ''}
                      onChange={e => {
                        setForm(prev => ({
                          ...prev,
                          state: e.target.value,
                          city: '',
                          location: e.target.value,
                          latitude: '',
                          longitude: '',
                        }));
                        setCustomCity(false);
                      }}
                      className={selectFieldClass}
                    >
                      <option value="">{t.select_state}</option>
                      {MEXICO_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {form.state && (
                    <div>
                      <label className={labelClass}>
                        {t.city} <span className="text-red-500">*</span>
                      </label>
                      {customCity ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            data-testid="publish-city"
                            aria-label={t.city}
                            value={form.city || ''}
                            onChange={e => {
                              const v = e.target.value;
                              setForm(prev => ({
                                ...prev,
                                city: v,
                                location: v ? `${v}, ${prev.state}` : prev.state,
                                latitude: '',
                                longitude: '',
                              }));
                            }}
                            placeholder={t.post_city_manual_placeholder}
                            className={fieldClass}
                          />
                          <button
                            type="button"
                            onClick={() => { setCustomCity(false); setForm(prev => ({ ...prev, city: '' })); }}
                            className="min-h-12 sm:min-h-0 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                          >
                            {t.post_city_select_list}
                          </button>
                        </div>
                      ) : (
                        <select
                          data-testid="publish-city"
                          aria-label={t.city}
                          value={form.city || ''}
                          onChange={e => {
                            const v = e.target.value;
                            if (v === 'otro') {
                              setCustomCity(true);
                              setForm(prev => ({ ...prev, city: '' }));
                            } else {
                              setForm(prev => ({
                                ...prev,
                                city: v,
                                location: v ? `${v}, ${prev.state}` : prev.state,
                                latitude: '',
                                longitude: '',
                              }));
                            }
                          }}
                          className={selectFieldClass}
                        >
                          <option value="">{t.select_city}</option>
                          {(mexicoLocations[form.state] || []).map(c => <option key={c} value={c}>{c}</option>)}
                          <option value="otro">{t.post_city_other_manual}</option>
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {/* Location + Map */}
                <div className="mt-5">
                  <label className={labelClass}>
                    {t.location}
                  </label>
                  <div className="relative mb-3">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      aria-label={t.location}
                      value={form.location || ''}
                      onChange={e => setForm(prev => ({
                        ...prev,
                        location: e.target.value,
                        latitude: '',
                        longitude: '',
                      }))}
                      className="w-full min-h-12 sm:min-h-0 px-3.5 py-2.5 pl-10 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                      placeholder={t.loc_placeholder}
                    />
                  </div>

                  <div className="mb-3 flex justify-end">
                    <button
                      type="button"
                      data-testid="publish-gps"
                      onClick={handleGPS}
                      disabled={gpsLoading}
                      className="min-h-12 sm:min-h-0 px-4 py-2 bg-[#84CC16] hover:bg-[#65A30D] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                    >
                      {gpsLoading ? <Loader2 size={14} className="animate-spin" /> : <Locate size={14} />}
                      {t.post_use_current_gps}
                    </button>
                  </div>

                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-2" data-testid="publish-location-optional">
                    {t.tap_map_hint}
                  </p>
                  <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                    {isMapUpdating && <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 dark:bg-slate-900/50"><Loader2 className="w-8 h-8 text-[#84CC16] animate-spin" /></div>}
                    <MapV3
                      locationPicker
                      showFullscreen={false}
                      locationQuery={mapQuery}
                      markers={form.latitude && form.longitude ? [{ label: t.selected_label, coords: [Number(form.latitude), Number(form.longitude)], tone: 'lime' }] : []}
                      onLocationSelect={({ lat, lng }) => setForm(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                      className="h-full rounded-none border-0 shadow-none"
                    />
                  </div>
                </div>
              </div>

              {/* Contact methods */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/50">
                <h3 className="text-[14px] font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <MessageCircle size={16} className="text-[#84CC16]" /> {t.post_contact_heading}
                </h3>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {CONTACT_METHODS.map((m) => {
                    const sel = contactMethods.includes(m.id);
                    return (
                      <button key={m.id} type="button"
                        onClick={() => setContactMethods(sel ? contactMethods.filter((x) => x !== m.id) : [...contactMethods, m.id])}
                        className={`flex min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-sm font-semibold transition-all ${sel ? 'border-[#84CC16] bg-[#F7FEE7] dark:bg-slate-900/60 ring-2 ring-[#84CC16] text-[#65A30D]' : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#84CC16] hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <m.icon size={20} />
                        {m.label || t[m.labelKey]}
                        <span className="text-[10px] font-normal text-slate-400">{t[m.hintKey]}</span>
                      </button>
                    );
                  })}
                </div>

                {contactMethods.includes('whatsapp') && (
                  <div className="mt-4">
                    <label className={labelClass}>{t.post_whatsapp_question}</label>
                    <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-950">
                      {[{ id: 'phone', label: t.post_phone_number }, { id: 'username', label: `${t.post_username} (@usuario)` }].map((opt) => (
                        <button key={opt.id} type="button" data-testid={`publish-whatsapp-mode-${opt.id}`} onClick={() => setWaMode(opt.id)}
                          className={`min-h-12 sm:min-h-[40px] rounded-lg px-4 text-sm font-semibold transition-colors ${waMode === opt.id ? 'bg-[#84CC16] text-slate-950' : 'text-slate-600 dark:text-slate-300'}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {(contactMethods.includes('phone') || (contactMethods.includes('whatsapp') && waMode === 'phone')) && (
                    <div>
                      <label className={labelClass}>{t.post_phone_digits}</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-slate-400 text-[14px]">+52</span>
                        <input type="tel" data-testid="publish-phone" aria-label={t.post_phone_digits} value={phoneValue} onChange={(e) => setPhoneValue(e.target.value.replace(/[^\d\s-]/g, ''))}
                          placeholder="55 1234 5678" className="w-full min-h-12 sm:min-h-0 pl-11 pr-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
                      </div>
                      {contactMethods.includes('whatsapp') && waMode === 'phone' && (
                        <p className="mt-1 text-xs text-slate-400">{t.post_phone_whatsapp_hint}</p>
                      )}
                    </div>
                  )}
                  {contactMethods.includes('whatsapp') && waMode === 'username' && (
                    <div>
                      <label className={labelClass}>{t.post_whatsapp_username}</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-slate-400 text-[14px]">@</span>
                        <input aria-label={t.post_whatsapp_username} value={waUsername} onChange={(e) => setWaUsername(e.target.value.replace(/^@/, ''))} placeholder={t.post_username}
                          className="w-full min-h-12 sm:min-h-0 pl-7 pr-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
                      </div>
                    </div>
                  )}
                  {contactMethods.includes('telegram') && (
                    <div>
                      <label className={labelClass}>{t.post_telegram_username}</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-slate-400 text-[14px]">@</span>
                        <input aria-label={t.post_telegram_username} value={telegramValue} onChange={(e) => setTelegramValue(e.target.value.replace(/^@/, ''))} placeholder={t.post_username}
                          className="w-full min-h-12 sm:min-h-0 pl-7 pr-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {listingQualityPreflight && ((listingQualityPreflight.errors || []).length > 0 || (listingQualityPreflight.warnings || []).length > 0) && (
                <div data-testid="listing-quality-guidance" className={`rounded-2xl border p-4 ${listingQualityPreflight.passes_hard_validation ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30' : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30'}`}>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">
                    {listingQualityPreflight.passes_hard_validation ? t.listing_quality_warning_title : t.listing_quality_blocked_title}
                  </p>
                  <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                    {[...(listingQualityPreflight.errors || []), ...(listingQualityPreflight.warnings || [])].map(code => (
                      <li key={code}>{t[`listing_quality_${code}`] || t.listing_quality_generic}</li>
                    ))}
                  </ul>
                  {hasQualityWarnings && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{t.listing_quality_continue_hint}</p>}
                </div>
              )}

              {/* Step 3 navigation */}
              <div className="hidden md:flex justify-between items-center pt-6">
                <button type="button" onClick={goBack} className="btn-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
                  <ChevronLeft size={16} /> {t.back}
                </button>
                <button
                  type="submit"
                  disabled={postLoading || savingContact || !step3Valid}
                  className="btn-lg bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {(postLoading || savingContact)
                    ? <Loader2 className="animate-spin" size={20} />
                    : <><Sparkles size={18} /> {hasQualityWarnings ? t.listing_quality_continue : (editingAd ? t.save_changes : t.publish_btn)}</>
                  }
                </button>
              </div>

            </div>
          )}

        </form>
      </div>

      {/* Mobile sticky navigation */}
      <div className="fixed bottom-0 inset-x-0 z-40 flex gap-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 md:hidden">
        {step > 1 ? (
          <button type="button" onClick={goBack} className="btn-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex-1 flex items-center justify-center gap-1.5">
            <ChevronLeft size={16} /> {t.back}
          </button>
        ) : <div className="flex-1" />}
        {step < 3 ? (
          <button
            type="button"
            disabled={step === 1 && (!form.category || (getPostSubcategoryOptions(form.category, lang).length > 0 && !form.subcategory))}
            onClick={goNext}
            className="btn-lg bg-[#0F172A] text-white hover:bg-black flex-[2] flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {t.next_btn} <ChevronRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={postLoading || savingContact || !step3Valid}
            className="btn-lg bg-[#0F172A] text-white hover:bg-black flex-[2] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {(postLoading || savingContact)
              ? <Loader2 className="animate-spin" size={20} />
              : <><Sparkles size={18} /> {hasQualityWarnings ? t.listing_quality_continue : (editingAd ? t.save_changes : t.publish_btn)}</>
            }
          </button>
        )}
      </div>
    </div>
  );
}
