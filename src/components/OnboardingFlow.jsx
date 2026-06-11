import React, { useState } from 'react';
import { X, Sparkles, Image, User, Users, ArrowRight, Check } from 'lucide-react';

const OnboardingFlow = ({ onComplete, userName }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: <Sparkles className="w-16 h-16 text-primary-600" />,
      title: `¡Bienvenido a Mercasto, ${userName || 'usuario'}!`,
      description: 'Te guiaré en 4 pasos simples para que empieces a vender con IA.',
      action: 'Comenzar',
    },
    {
      icon: <Image className="w-16 h-16 text-primary-600" />,
      title: 'Crea tu primer anuncio',
      description: 'Sube fotos de lo que quieres vender. Nuestra IA generará una descripción profesional automáticamente.',
      action: 'Entendido',
    },
    {
      icon: <User className="w-16 h-16 text-primary-600" />,
      title: 'Completa tu perfil',
      description: 'Agrega tu ubicación y datos de contacto. Los compradores confían más en perfiles completos.',
      action: 'Entendido',
    },
    {
      icon: <Users className="w-16 h-16 text-primary-600" />,
      title: 'Invita a tus amigos',
      description: 'Mercasto es mejor con más vendedores y compradores. Comparte con amigos y familiares.',
      action: '¡Empezar!',
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('onboarding_completed', 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  const currentStep = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
            <span>Paso {step + 1} de {steps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">{currentStep.icon}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">{currentStep.title}</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{currentStep.description}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={handleSkip}
              className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Saltar
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {currentStep.action}
            {step === steps.length - 1 ? <Check className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
