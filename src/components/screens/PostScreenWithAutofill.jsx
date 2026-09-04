import React, { useCallback, useState } from 'react';
import ListingAutofillPanel from '../ai/ListingAutofillPanel';
import PostScreen from './PostScreen';
import { subcategoriesMap } from '../../constants/locationsAndCategories';
import { subcategoriesByLang } from '../../constants/subcategoryTranslations';

function subcategoryOptions(category, lang) {
  const taxonomyCategory = category === 'coches' ? 'motor' : category;
  const canonical = subcategoriesByLang.es[taxonomyCategory];
  const localized = subcategoriesByLang[lang]?.[taxonomyCategory];
  if (canonical && !Array.isArray(canonical)) {
    return Object.keys(canonical).map((value) => ({
      value,
      label: (!Array.isArray(localized) && localized?.[value]) || canonical[value],
    }));
  }
  const values = Array.isArray(canonical)
    ? canonical
    : (subcategoriesMap[taxonomyCategory] || subcategoriesMap[category] || []);
  const labels = Array.isArray(localized) ? localized : values;
  return values.map((value, index) => ({ value, label: labels[index] || value }));
}

function normalized(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase();
}

export default function PostScreenWithAutofill(props) {
  const { form, images, lang, setForm } = props;
  const [formRevision, setFormRevision] = useState(0);

  const applyCategory = useCallback((category) => {
    if (!category) return;
    setForm((current) => ({ ...current, category, subcategory: '', attributes: {} }));
    // PostScreen owns category-navigation UI state. Remount only after an explicit
    // seller category acceptance so its local parent-category state reflects the new value.
    setFormRevision((value) => value + 1);
  }, [setForm]);

  const applySubcategory = useCallback((category, hint) => {
    if (!category || !hint) return;
    const options = subcategoryOptions(category, lang);
    const needle = normalized(hint);
    const match = options.find((option) => normalized(option.value) === needle || normalized(option.label) === needle);
    if (!match) return;
    setForm((current) => current.category === category
      ? { ...current, subcategory: match.value }
      : current);
  }, [lang, setForm]);

  const applyAttribute = useCallback((category, key, value) => {
    if (!category || !key || value == null) return;
    setForm((current) => current.category === category
      ? { ...current, attributes: { ...(current.attributes || {}), [key]: value } }
      : current);
  }, [setForm]);

  return (
    <>
      <div className="bg-[var(--paper)] px-4 pt-5 md:pt-8">
        <ListingAutofillPanel
          form={form}
          images={images}
          lang={lang}
          onApplyCategory={applyCategory}
          onApplySubcategory={applySubcategory}
          onApplyAttribute={applyAttribute}
          onApplyTitle={(title) => setForm((current) => ({ ...current, title }))}
          onApplyDescription={(description) => setForm((current) => ({ ...current, description }))}
        />
      </div>
      <PostScreen key={`post-${formRevision}`} {...props} />
    </>
  );
}
