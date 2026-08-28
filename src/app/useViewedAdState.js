import { useState } from 'react';

export function useViewedAdState() {
  const [viewedAd, setViewedAd] = useState(null);
  const [deepLinkAdMissing, setDeepLinkAdMissing] = useState(false);
  const [deepLinkAdLoadError, setDeepLinkAdLoadError] = useState(false);
  const [deepLinkAdRetryNonce, setDeepLinkAdRetryNonce] = useState(0);

  return {
    viewedAd,
    setViewedAd,
    deepLinkAdMissing,
    setDeepLinkAdMissing,
    deepLinkAdLoadError,
    setDeepLinkAdLoadError,
    deepLinkAdRetryNonce,
    setDeepLinkAdRetryNonce,
  };
}
