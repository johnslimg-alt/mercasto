/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { AuthProvider } from './AuthContext';
import { UIProvider } from './UIContext';
import { AdsProvider } from './AdsContext';
import { NotificationsProvider } from './NotificationsContext';

import { ToastProvider } from '../components/ui/Toast';

/**
 * AppProviders - объединяет все контексты приложения
 * 
 * Порядок провайдеров важен:
 * 1. AuthProvider - авторизация (нужна для других контекстов)
 * 2. UIProvider - темы, язык, модалки
 * 3. AdsProvider - объявления (может использовать UI для toast)
 * 4. NotificationsProvider - уведомления (нужен токен из AuthContext)
 */
export function AppProviders({ children }) {
  return (
    <AuthProvider>
      <UIProvider>
        <AdsProvider>
          <NotificationsProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </NotificationsProvider>
        </AdsProvider>
      </UIProvider>
    </AuthProvider>
  );
}

// Экспортируем все контексты для удобного импорта
export { useAuth } from './AuthContext';
export { useUI } from './UIContext';
export { useAds } from './AdsContext';
export { useNotifications } from './NotificationsContext';
