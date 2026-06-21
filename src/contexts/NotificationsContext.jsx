/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  // === УВЕДОМЛЕНИЯ ===
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // === СОХРАНЁННЫЕ ПОИСКИ ===
  const [savedSearches, setSavedSearches] = useState(() => {
    const saved = localStorage.getItem('savedSearches');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('savedSearches', JSON.stringify(savedSearches));
  }, [savedSearches]);

  // === ЗАГРУЗКА УВЕДОМЛЕНИЙ ===
  const loadNotifications = useCallback(async (token) => {
    if (!token) return;
    
    setLoadingNotifications(true);
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data || []);
        setUnreadCount(data.data?.filter(n => !n.read_at).length || 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  // === ПОМЕТИТЬ КАК ПРОЧИТАННОЕ ===
  const markAsRead = useCallback(async (notificationId, token) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // === ПОМЕТИТЬ ВСЕ КАК ПРОЧИТАННЫЕ ===
  const markAllAsRead = useCallback(async (token) => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, []);

  // === СОХРАНИТЬ ПОИСК ===
  const saveSearch = useCallback((searchParams, searchName) => {
    const newSearch = {
      id: Date.now(),
      name: searchName || `Поиск ${savedSearches.length + 1}`,
      params: searchParams,
      createdAt: new Date().toISOString(),
      alertEnabled: true
    };
    
    setSavedSearches(prev => [...prev, newSearch]);
    return newSearch;
  }, [savedSearches.length]);

  // === УДАЛИТЬ СОХРАНЁННЫЙ ПОИСК ===
  const removeSavedSearch = useCallback((searchId) => {
    setSavedSearches(prev => prev.filter(s => s.id !== searchId));
  }, []);

  // === ВКЛЮЧИТЬ/ВЫКЛЮЧИТЬ АЛЕРТЫ ===
  const toggleSearchAlert = useCallback((searchId) => {
    setSavedSearches(prev => prev.map(s => 
      s.id === searchId ? { ...s, alertEnabled: !s.alertEnabled } : s
    ));
  }, []);

  const value = {
    // Уведомления
    notifications,
    unreadCount,
    loadingNotifications,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    
    // Сохранённые поиски
    savedSearches,
    saveSearch,
    removeSavedSearch,
    toggleSearchAlert
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}
