import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, X } from 'lucide-react';
import { trackEvent } from '../utils/analytics';
import { FUNNEL_EVENTS } from '../utils/funnelAnalytics';
import {
  isBuyerNudgeBucketEligible,
  isBuyerNudgeFrequencyCapOpen,
  isBuyerNudgeRouteEligible,
  normalizeBuyerNudgeRollout,
  readBuyerNudgeState,
  readOrCreateBuyerNudgeBucket,
  writeBuyerNudgeState,
} from '../utils/buyerNudge';
import { buyerNudgeCopy } from './buyerNudgeCopy';

const EXPERIMENT = 'buyer_conversion_nudge_v1';
const VARIANT = 'favorites_contact_options';
const DISPLAY_DELAY_MS = 8000;

export default function BuyerConversionNudge({
  user,
  authModalOpen,
  pathname,
  language,
  onRegister,
}) {
  const rolloutPercent = normalizeBuyerNudgeRollout(import.meta.env.VITE_BUYER_NUDGE_ROLLOUT_PERCENT || 0);
  const copy = useMemo(() => buyerNudgeCopy(language), [language]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    if (user || authModalOpen || rolloutPercent <= 0 || !isBuyerNudgeRouteEligible(pathname)) return undefined;

    const bucket = readOrCreateBuyerNudgeBucket();
    const state = readBuyerNudgeState();
    if (!isBuyerNudgeBucketEligible(bucket, rolloutPercent)) return undefined;
    if (!isBuyerNudgeFrequencyCapOpen(state.lastShownAt)) return undefined;

    const timer = window.setTimeout(() => {
      writeBuyerNudgeState({ lastShownAt: Date.now(), lastPath: pathname, variant: VARIANT });
      trackEvent(FUNNEL_EVENTS.BUYER_NUDGE_IMPRESSION, {
        experiment: EXPERIMENT,
        variant: VARIANT,
        rollout_percent: rolloutPercent,
      });
      setVisible(true);
    }, DISPLAY_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [authModalOpen, pathname, rolloutPercent, user]);

  if (!visible || user || authModalOpen) return null;

  const dismiss = () => {
    trackEvent(FUNNEL_EVENTS.BUYER_NUDGE_DISMISSED, { experiment: EXPERIMENT, variant: VARIANT });
    writeBuyerNudgeState({ dismissedAt: Date.now() });
    setVisible(false);
  };

  const register = () => {
    trackEvent(FUNNEL_EVENTS.BUYER_NUDGE_REGISTER_CLICK, { experiment: EXPERIMENT, variant: VARIANT });
    trackEvent(FUNNEL_EVENTS.SIGN_UP_ATTEMPT, {
      source: 'buyer_nudge',
      experiment: EXPERIMENT,
      variant: VARIANT,
      return_behavior: 'modal_preserves_current_route',
    });
    writeBuyerNudgeState({ registerClickedAt: Date.now() });
    setVisible(false);
    onRegister();
  };

  return (
    <aside
      className="fixed bottom-20 left-3 right-3 z-[90] mx-auto max-w-xl rounded-2xl border border-lime-300/70 bg-white/95 p-3 shadow-2xl backdrop-blur md:bottom-6 md:left-auto md:right-6 md:w-[420px] dark:border-lime-500/30 dark:bg-slate-950/95"
      role="status"
      aria-live="polite"
      data-testid="buyer-conversion-nudge"
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label={copy.dismiss}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="flex gap-3 pr-7">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime-100 text-lime-700 dark:bg-lime-500/10 dark:text-lime-300">
          <Bookmark className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-slate-900 dark:text-white">{copy.title}</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{copy.body}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={register}
              className="rounded-xl bg-[#84CC16] px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-[#65A30D]"
            >
              {copy.cta}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {copy.dismiss}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
