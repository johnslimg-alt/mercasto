import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(standalone);

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after 3 seconds or on second visit
      const visitCount = parseInt(localStorage.getItem('pwa_visit_count') || '0', 10);
      localStorage.setItem('pwa_visit_count', (visitCount + 1).toString());
      
      if (visitCount >= 1) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ PWA installed');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_dismissed', 'true');
  };

  // Don't show if already installed or dismissed
  if (isStandalone || localStorage.getItem('pwa_dismissed') === 'true') {
    return null;
  }

  // iOS instructions
  if (isIOS && !showPrompt) {
    return null; // Will show on demand
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-lime-100 dark:bg-lime-900/30 rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-lime-600 dark:text-lime-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Instalar Mercasto
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Accede rápidamente desde tu pantalla de inicio
              </p>
              
              {isIOS ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    1. Toca <span className="font-bold">Compartir</span> <span className="inline-block">⬆️</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    2. Selecciona <span className="font-bold">"Agregar a inicio"</span>
                  </p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleInstall}
                    className="flex-1 btn-md bg-lime-500 hover:bg-lime-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Instalar
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="px-4 py-2 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Funciona sin conexión • Carga más rápido
          </p>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
