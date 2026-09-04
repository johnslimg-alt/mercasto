import React, { useCallback, useState } from 'react';
import ListingAutofillPanel from '../ai/ListingAutofillPanel';
import PostScreen from './PostScreen';

export default function PostScreenWithAutofill(props) {
  const { form, images, lang, setForm, user } = props;
  const [formRevision, setFormRevision] = useState(0);

  const applyCategory = useCallback((category) => {
    if (!category) return;
    setForm((current) => ({
      ...current,
      category,
      subcategory: '',
      attributes: {},
    }));
    setFormRevision((value) => value + 1);
  }, [setForm]);

  const applySubcategory = useCallback((category, subcategory) => {
    if (!category || !subcategory) return;
    setForm((current) => (
      current.category === category
        ? { ...current, subcategory }
        : current
    ));
  }, [setForm]);

  const applyAttribute = useCallback((category, key, value) => {
    if (!category || !key || value == null) return;
    setForm((current) => (
      current.category === category
        ? { ...current, attributes: { ...(current.attributes || {}), [key]: value } }
        : current
    ));
  }, [setForm]);

  return (
    <>
      {user && (
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
      )}
      <PostScreen key={`post-${formRevision}`} {...props} />
    </>
  );
}
