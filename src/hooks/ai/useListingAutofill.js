import { useCallback, useState } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

export function useListingAutofill() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState(null);

  const analyze = useCallback(async ({ shortText, images }) => {
    setLoading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append('hint_text', String(shortText || '').slice(0, 2000));
      (images || [])
        .filter((image) => image?.source === 'new' && image?.file instanceof File)
        .slice(0, 2)
        .forEach((image) => body.append('images[]', image.file));

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/ads/autofill`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.available || !payload.suggestions) {
        throw new Error(payload.reason || 'Autofill unavailable');
      }

      setSuggestions(payload.suggestions);
      return payload.suggestions;
    } catch (caught) {
      setSuggestions(null);
      setError(caught?.message || 'Autofill unavailable');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setError(null);
    setSuggestions(null);
  }, []);

  return { loading, error, suggestions, analyze, clear };
}
