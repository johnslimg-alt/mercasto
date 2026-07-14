/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { events } from '../utils/analytics';

const AuthContext = createContext(null);

function createMetaRegistrationEventId() {
  const randomPart = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  return `register_user_${randomPart}`.slice(0, 120);
}

export function AuthProvider({ children }) {
  // === ПОЛЬЗОВАТЕЛЬ ===
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));

  // === МОДАЛЬНЫЕ ОКНА АВТОРИЗАЦИИ ===
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // login, register, forgot_password, reset_password, phone_verify, two_factor

  // === 2FA И ВЕРИФИКАЦИЯ ===
  const [pending2FA, setPending2FA] = useState(null);
  const [pendingPhoneVerification, setPendingPhoneVerification] = useState(null);

  // === ЗАГРУЗКА ПОЛЬЗОВАТЕЛЯ ===
  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setAuthReady(true);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Токен недействителен
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setAuthReady(true);
    }
  };

  // === ВХОД ===
  const login = useCallback((email, password) => {
    return fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(async (response) => {
      const data = await response.json();
      
      if (response.ok) {
        if (data.two_factor_required) {
          setPending2FA(data);
          setAuthMode('two_factor');
          setShowAuthModal(true);
          return { success: false, requires2FA: true };
        }
        
        setToken(data.token);
        localStorage.setItem('auth_token', data.token);
        setUser(data.user);
        setShowAuthModal(false);
        return { success: true };
      }
      
      return { success: false, error: data.message };
    });
  }, []);

  // === РЕГИСТРАЦИЯ ===
  const register = useCallback((name, email, password, password_confirmation, referral_code = null) => {
    const metaEventId = createMetaRegistrationEventId();
    const payload = {
      name,
      email,
      password,
      password_confirmation,
      meta_event_id: metaEventId,
    };
    if (referral_code) payload.referral_code = referral_code;
    
    return fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(async (response) => {
      const data = await response.json();
      
      if (response.ok) {
        setToken(data.token);
        localStorage.setItem('auth_token', data.token);
        setUser(data.user);
        setShowAuthModal(false);
        localStorage.setItem('just_registered', '1');
        events.registered({ event_id: metaEventId });
        return { success: true };
      }
      
      return { success: false, error: data.message };
    });
  }, []);

  // === ВЫХОД ===
  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('Failed to logout:', error);
      }
    }
    
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    setShowAuthModal(false);
  }, [token]);

  // === СБРОС ПАРОЛЯ ===
  const forgotPassword = useCallback((email) => {
    return fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    }).then(async (response) => {
      const data = await response.json();
      return { success: response.ok, message: data.message };
    });
  }, []);

  const resetPassword = useCallback((email, token, password, password_confirmation) => {
    return fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, password, password_confirmation })
    }).then(async (response) => {
      const data = await response.json();
      return { success: response.ok, message: data.message };
    });
  }, []);

  // === 2FA ===
  const verify2FA = useCallback((code) => {
    if (!pending2FA) return Promise.resolve({ success: false });
    
    return fetch('/api/two-factor/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: pending2FA.user_id,
        code
      })
    }).then(async (response) => {
      const data = await response.json();
      
      if (response.ok) {
        setToken(data.token);
        localStorage.setItem('auth_token', data.token);
        setUser(data.user);
        setPending2FA(null);
        setShowAuthModal(false);
        return { success: true };
      }
      
      return { success: false, error: data.message };
    });
  }, [pending2FA]);

  // === ВЕРИФИКАЦИЯ ТЕЛЕФОНА ===
  const verifyPhone = useCallback((code) => {
    if (!pendingPhoneVerification) return Promise.resolve({ success: false });
    
    return fetch('/api/phone/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    }).then(async (response) => {
      const data = await response.json();
      
      if (response.ok) {
        setUser(prev => ({ ...prev, phone_verified: true }));
        setPendingPhoneVerification(null);
        return { success: true };
      }
      
      return { success: false, error: data.message };
    });
  }, [pendingPhoneVerification, token]);

  // === РЕФЕРАЛЬНАЯ СИСТЕМА ===
  const applyPendingReferral = useCallback(() => {
    const pendingReferral = localStorage.getItem('pendingReferral');
    if (!pendingReferral || !token) return;
    
    fetch('/api/referral/apply', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code: pendingReferral })
    }).then(response => {
      if (response.ok) {
        localStorage.removeItem('pendingReferral');
      }
    }).catch(error => {
      console.error('Failed to apply referral:', error);
    });
  }, [token]);

  // === ПРОВЕРКА РОЛИ ===
  const hasRole = useCallback((role) => {
    if (!user) return false;
    return user.role === role || user.roles?.includes(role);
  }, [user]);

  const isAdmin = useCallback(() => hasRole('admin'), [hasRole]);
  const isSeller = useCallback(() => hasRole('seller') || hasRole('business'), [hasRole]);

  const value = {
    // Пользователь
    user,
    setUser,
    authReady,
    token,
    
    // Модальные окна
    showAuthModal,
    setShowAuthModal,
    authMode,
    setAuthMode,
    
    // 2FA и верификация
    pending2FA,
    setPending2FA,
    pendingPhoneVerification,
    setPendingPhoneVerification,
    
    // Методы
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    verify2FA,
    verifyPhone,
    applyPendingReferral,
    
    // Роли
    hasRole,
    isAdmin,
    isSeller,
    
    // Статусы
    isAuthenticated: !!user,
    isVerified: user?.email_verified_at && user?.phone_verified
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
