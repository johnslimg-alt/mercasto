import { useState, useCallback, useId } from 'react';
import axios from 'axios';

export function useAIChatbot() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const sessionId = `session_${useId().replace(/:/g, '')}`;

  const sendMessage = useCallback(async (message) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('/api/ai/chat', {
        message: message.trim(),
        session_id: sessionId,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.data.success) {
        const botMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.data.response,
          source: response.data.source,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, botMessage]);
        return botMessage;
      } else {
        throw new Error(response.data.error || 'Chat failed');
      }
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Chat service unavailable';
      setError(message);
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Lo siento, estoy teniendo problemas técnicos. Por favor intenta de nuevo.',
        source: 'error',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const clearHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.post('/api/ai/chat/clear', {
        session_id: sessionId,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setMessages([]);
      setError(null);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  }, [sessionId]);

  return {
    loading,
    error,
    messages,
    sessionId,
    sendMessage,
    clearHistory,
  };
}
