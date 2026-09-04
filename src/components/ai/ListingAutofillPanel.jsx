import React, { useMemo, useState } from 'react';
import { Check, Loader2, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react';
import { useListingAutofill } from '../../hooks/ai/useListingAutofill';
import { getListingAutofillCopy } from './listingAutofillI18n';

function SuggestionRow({ label, suggestion, copy, onApply, disabled = false }) {
  if (!suggestion?.value) return null;
  const confidence = Math.round(Math.max(0, Math.min(1, Number(suggestion.confidence) || 0)) * 100);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="mt-0.5 break-words text-sm font-semibold text-slate-900 dark:text-white">
          {suggestion.value}
        </div>
        <div className="mt-1 text-[11px] text-slate-500">{confidence}% {copy.confidence}</div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onApply}
        className="min-h-10 shrink-0 rounded-lg bg-lime-500 px-3 text-xs font-extrabold text-slate-950 hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Check size={14} className="mr-1 inline" />
        {copy.apply}
      </button>
    </div>
  );
}

export default function ListingAutofillPanel({
  form,
  images,
  lang,
  onApplyCategory,
  onApplySubcategory,
  onApplyAttribute,
  onApplyTitle,
  onApplyDescription,
}) {
  const copy = getListingAutofillCopy(lang);
  const [shortText, setShortText] = useState('');
  const { loading, error, suggestions, analyze, clear } = useListingAutofill();
  const newPhotos = useMemo(
    () => (images || []).filter((image) => image?.source === 'new' && image?.file instanceof File),
    [images],
  );
  const canAnalyze = shortText.trim().length > 0 || newPhotos.length > 0;
  const category = suggestions?.category?.value || null;
  const subcategory = suggestions?.subcategory?.value || null;

  const run = async () => {
    if (!canAnalyze) return;
    await analyze({ shortText, images: newPhotos });
  };

  return (
    <section
      className="mx-auto mb-4 w-full max-w-3xl rounded-2xl border border-lime-200 bg-gradient-to-br from-lime-50 to-white p-4 shadow-sm dark:border-lime-500/20 dark:from-lime-500/10 dark:to-slate-950"
      data-testid="listing-autofill-panel"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-lime-500 p-2 text-slate-950">
          <WandSparkles size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">{copy.title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{copy.subtitle}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          data-testid="listing-autofill-text"
          value={shortText}
          onChange={(event) => {
            setShortText(event.target.value);
            if (suggestions) clear();
          }}
          maxLength={2000}
          placeholder={copy.placeholder}
          className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <button
          type="button"
          data-testid="listing-autofill-run"
          onClick={run}
          disabled={loading || !canAnalyze}
          className="min-h-11 rounded-xl bg-slate-950 px-4 text-xs font-extrabold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 dark:bg-lime-500 dark:text-slate-950 dark:hover:bg-lime-400"
        >
          {loading ? <Loader2 size={15} className="mr-1 inline animate-spin" /> : <Sparkles size={15} className="mr-1 inline" />}
          {loading ? copy.analyzing : copy.analyze}
        </button>
      </div>

      {!canAnalyze && <p className="mt-2 text-[11px] text-slate-500">{copy.noInput}</p>}
      {error && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          {copy.unavailable}
        </p>
      )}

      {suggestions && (
        <div className="mt-4 space-y-2" data-testid="listing-autofill-suggestions">
          <SuggestionRow
            label={copy.category}
            suggestion={suggestions.category}
            copy={copy}
            onApply={() => onApplyCategory?.(category)}
          />
          <SuggestionRow
            label={copy.subcategory}
            suggestion={suggestions.subcategory}
            copy={copy}
            disabled={!category || !subcategory}
            onApply={() => onApplySubcategory?.(category, subcategory)}
          />
          <SuggestionRow
            label={copy.titleField}
            suggestion={suggestions.title}
            copy={copy}
            onApply={() => onApplyTitle?.(suggestions.title.value)}
          />
          <SuggestionRow
            label={copy.description}
            suggestion={suggestions.description}
            copy={copy}
            onApply={() => onApplyDescription?.(suggestions.description.value)}
          />

          {Object.keys(suggestions.attributes || {}).length > 0 && (
            <div className="pt-1">
              <div className="mb-2 text-xs font-bold text-slate-600 dark:text-slate-300">{copy.attributes}</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Object.entries(suggestions.attributes).map(([key, suggestion]) => (
                  <SuggestionRow
                    key={key}
                    label={key}
                    suggestion={suggestion}
                    copy={copy}
                    disabled={form.category !== category}
                    onApply={() => onApplyAttribute?.(category, key, suggestion.value)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
        <ShieldCheck size={13} className="text-lime-600" />
        {copy.privacy}
      </div>
    </section>
  );
}
