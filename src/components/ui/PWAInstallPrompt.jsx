import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

/**
 * PWA Install Prompt - показывает пользователю предложение установить приложение
 * Появляется когда браузер поддерживает PWA и пользователь ещё не установил
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Проверяем установлено ли уже приложение
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Проверяем iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Проверяем что пользователь уже видел prompt (localStorage)
    const hasSeenPrompt = localStorage.getItem('pwa-prompt-dismissed');
    if (hasSeenPrompt) {
      const dismissedDate = new Date(hasSeenPrompt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return; // Не показываем 7 дней после dismiss
    }

    // Для iOS показываем инструкции через 10 секунд
    if (isIOSDevice) {
      const timer = setTimeout(() => {
        setShowIOSInstructions(true);
      }, 10000);
      return () => clearTimeout(timer);
    }

    // Для Android/Desktop слушаем beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Показываем prompt через 30 секунд после загрузки
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
  };

  // Не показываем если уже установлено
  if (isInstalled) return null;

  // iOS инструкции
  if (showIOSInstructions && isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-5 z-50 animate-slide-up">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} className="text-gray-500 dark:text-gray-400" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-lime-100 dark:bg-lime-900/30 rounded-xl flex items-center justify-center">
            <Smartphone size={24} className="text-lime-600 dark:text-lime-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">Instala Mercasto en tu iPhone</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Accede más rápido y usa la app como nativa
            </p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-lime-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Toca el botón <strong>Compartir</strong> <span className="inline-block w-5 h-5 bg-gray-200 dark:bg-slate-600 rounded">↗</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-lime-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Desliza hacia abajo y toca <strong>"Agregar a inicio"</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-lime-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Toca <strong>"Agregar"</strong> para confirmar
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="w-full py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-medium"
        >
          Entendido
        </button>
      </div>
    );
  }

  // Android/Desktop prompt
  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-5 z-50 animate-slide-up">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
        aria-label="Cerrar"
      >
        <X size={20} className="text-gray-500 dark:text-gray-400" />
      </button>

      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-12 h-12 bg-lime-100 dark:bg-lime-900/30 rounded-xl flex items-center justify-center">
          <Download size={24} className="text-lime-600 dark:text-lime-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">Instala Mercasto</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Accede más rápido, recibe notificaciones y usa la app sin conexión
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleDismiss}
          className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
        >
          Ahora no
        </button>
        <button
          onClick={handleInstall}
          className="flex-1 py-2.5 px-4 text-sm font-bold text-white bg-lime-500 hover:bg-lime-600 rounded-xl transition-colors shadow-lg shadow-lime-500/30"
        >
          Instalar
        </button>
      </div>
    </div>
  );
}
