import { useState, useCallback } from 'react';
import axios from 'axios';

export function useAIPricing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestion, setSuggestion] = useState(null);

  const suggestPrice = useCallback(async (listingData) => {
    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('/api/ai/pricing-suggestion', listingData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.data.success) {
        setSuggestion(response.data);
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to get price suggestion');
      }
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    suggestion,
    suggestPrice,
    clearSuggestion,
  };
}
