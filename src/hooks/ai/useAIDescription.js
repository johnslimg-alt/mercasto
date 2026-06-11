import { useState, useCallback } from 'react';
import axios from 'axios';

export function useAIDescription() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [description, setDescription] = useState(null);
  const [variants, setVariants] = useState([]);

  const generate = useCallback(async (listingData, numVariants = 1) => {
    setLoading(true);
    setError(null);
    setDescription(null);
    setVariants([]);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('/api/ai/generate-description', {
        ...listingData,
        variants: numVariants,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.data.success) {
        if (numVariants > 1 && response.data.variants) {
          setVariants(response.data.variants);
          setDescription(response.data.variants[0]);
        } else {
          setDescription(response.data);
        }
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to generate description');
      }
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const improve = useCallback(async (existingDescription, listingData) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('/api/ai/improve-description', {
        description: existingDescription,
        ...listingData,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.data.success) {
        setDescription(response.data);
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to improve description');
      }
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setDescription(null);
    setVariants([]);
    setError(null);
  }, []);

  return {
    loading,
    error,
    description,
    variants,
    generate,
    improve,
    clear,
  };
}
