import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

export function useAIChatbot() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

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
        session_id: sessionIdRef.current,
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
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.post('/api/ai/chat/clear', {
        session_id: sessionIdRef.current,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setMessages([]);
      setError(null);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  }, []);

  return {
    loading,
    error,
    messages,
    sessionId: sessionIdRef.current,
    sendMessage,
    clearHistory,
  };
}
