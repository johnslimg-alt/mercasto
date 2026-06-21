import { useState, useCallback } from 'react';
import axios from 'axios';

export function useAIImageRecognition() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const analyzeImage = useCallback(async (imagePath, title = null) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('/api/ai/analyze-image', {
        image_path: imagePath,
        title: title,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.data.success) {
        setAnalysis(response.data);
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to analyze image');
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
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    analysis,
    analyzeImage,
    clear,
  };
}
