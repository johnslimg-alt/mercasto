import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle, MessageCircle, ShieldCheck, ArrowRight, ArrowLeft, Camera, Phone, FileText } from 'lucide-react';

export default function OnboardingModal({ onClose, user, t, lang }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  // Clear the just_registered flag immediately on mount
  useEffect(() => {
    localStorage.removeItem('just_registered');
  }, []);

  const dictionary = t || {};

  const SLIDES = [
    {
      id: 'welcome',
      emoji: '🎉',
      title: dictionary.onboarding_welcome_title || '¡Bienvenido a Mercasto!',
      subtitle: dictionary.onboarding_welcome_subtitle || 'El marketplace de confianza para México',
      content: (
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="w-28 h-28 rounded-full bg-lime-50 flex items-center justify-center text-6xl shadow-inner">
            🛒
          </div>
          <p className="text-slate-600 text-center text-[15px] leading-relaxed max-w-xs">
            {dictionary.onboarding_welcome_desc || 'Compra, vende y renta en todo México. Miles de productos y servicios cerca de ti.'}
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            {[
              `🚗 ${dictionary.motor || 'Autos'}`,
              `🏠 ${dictionary.inmobiliaria || 'Inmuebles'}`,
              `📱 ${dictionary.telefonia || 'Telefonía'}`,
              `💼 ${dictionary.empleo || 'Empleo'}`
            ].map(tag => (
              <span key={tag} className="px-3 py-1 bg-lime-50 text-lime-700 rounded-full text-[13px] font-medium border border-lime-100">
                {tag}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'how',
      emoji: '📱',
      title: dictionary.onboarding_how_title || '¿Cómo funciona?',
      subtitle: dictionary.onboarding_how_subtitle || 'En 3 simples pasos',
      content: (
        <div className="flex flex-col gap-4 py-2 w-full max-w-xs mx-auto">
          {[
            { step: '1', icon: '📝', label: dictionary.onboarding_step1_label || 'Publica gratis', desc: dictionary.onboarding_step1_desc || 'Sube fotos y describe lo que vendes en minutos' },
            { step: '2', icon: '🤝', label: dictionary.onboarding_step2_label || 'Coordina con confianza', desc: dictionary.onboarding_step2_desc || 'Usa los canales públicos del vendedor y revisa su reputación' },
            { step: '3', icon: '✅', label: dictionary.onboarding_step3_label || 'Vende seguro', desc: dictionary.onboarding_step3_desc || 'Coordina la entrega y recibe tu pago' },
          ].map(({ step: sNum, icon, label, desc }) => (
            <div key={sNum} className="flex items-start gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-[#84CC16] text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm">
                {sNum}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <span className="font-semibold text-slate-800 text-[14px]">{label}</span>
                </div>
                <p className="text-slate-500 text-[13px] mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'profile',
      emoji: '✅',
      title: dictionary.onboarding_profile_title || 'Completa tu perfil',
      subtitle: dictionary.onboarding_profile_subtitle || 'Los vendedores verificados venden 3× más rápido',
      content: null, // rendered separately to allow navigation
    },
  ];

  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  const handleComplete = () => {
    onClose();
    navigate('/perfil');
  };

  const checklist = [
    { icon: Camera, label: dictionary.onboarding_checklist_photo || 'Agrega una foto de perfil', done: !!(user?.avatar_url || user?.profile_photo_path || user?.avatar) },
    { icon: Phone, label: dictionary.onboarding_checklist_phone || 'Verifica tu teléfono', done: !!(user?.phone_verified) },
    { icon: FileText, label: dictionary.onboarding_checklist_bio || 'Escribe una descripción', done: !!(user?.bio && user.bio.trim()) },
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#84CC16] to-[#65A30D] px-6 pt-6 pb-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label={dictionary.close_btn || "Cerrar"}
          >
            <X size={20} />
          </button>
          <div className="text-4xl mb-2">{slide.emoji}</div>
          <h2 className="text-white font-bold text-xl leading-tight">{slide.title}</h2>
          <p className="text-white/80 text-[13px] mt-1">{slide.subtitle}</p>

          {/* Progress dots */}
          <div className="flex gap-2 mt-4">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'bg-white w-6' : i < step ? 'bg-white/60 w-3' : 'bg-white/30 w-3'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {slide.id !== 'profile' ? (
            slide.content
          ) : (
            <div className="flex flex-col gap-3 py-2">
              <p className="text-slate-500 text-[13px] text-center mb-1">
                {dictionary.onboarding_checklist_desc || 'Completa estos pasos para generar más confianza con los compradores:'}
              </p>
              {checklist.map(({ icon: Icon, label, done }) => (
                <div key={label} className={`flex items-center gap-3 p-3 rounded-2xl border ${done ? 'bg-lime-50 border-lime-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-[#84CC16] text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {done ? <CheckCircle size={16} /> : <Icon size={16} />}
                  </div>
                  <span className={`text-[14px] font-medium ${done ? 'text-lime-700 line-through' : 'text-slate-700'}`}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          {isLast ? (
            <>
              <button
                onClick={handleComplete}
                className="w-full bg-[#84CC16] hover:bg-[#65A30D] text-white font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {dictionary.onboarding_complete_btn || 'Completar perfil'} <ArrowRight size={16} />
              </button>
              <button
                onClick={onClose}
                className="w-full text-slate-400 hover:text-slate-600 text-[13px] py-1 transition-colors"
              >
                {dictionary.onboarding_skip_btn || 'Omitir por ahora'}
              </button>
            </>
          ) : (
            <div className="flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-3 rounded-2xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={16} /> {dictionary.prev_btn || 'Anterior'}
                </button>
              )}
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex-1 bg-[#84CC16] hover:bg-[#65A30D] text-white font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                {dictionary.next_btn || 'Siguiente'} <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
