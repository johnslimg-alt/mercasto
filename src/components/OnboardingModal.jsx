import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle, ArrowRight, ArrowLeft, Camera, Phone, FileText, ShoppingBag, Store, Users, MapPin, Bell, Heart, Star, Sparkles, MessageCircle } from 'lucide-react';
import { getOnboardingExperienceCopy } from '../utils/onboardingExperienceCopy';
import useModalFocusTrap from '../hooks/useModalFocusTrap';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const ONBOARDING_DONE_USER_KEY = 'onboarding_done_user_id';
const ONBOARDING_PENDING_SYNC_KEY = 'onboarding_pending_sync';

const ROLES = [
  { id: 'buyer', icon: ShoppingBag, emoji: '🛍️', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  { id: 'seller', icon: Store, emoji: '💰', color: 'from-[#84CC16] to-[#65A30D]', bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700' },
  { id: 'both', icon: Users, emoji: '🤝', color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
];

const INTERESTS = [
  { slug: 'motor', emoji: '🚗' }, { slug: 'inmobiliaria', emoji: '🏠' }, { slug: 'empleo', emoji: '💼' },
  { slug: 'servicios', emoji: '🔧' }, { slug: 'tecnologia', emoji: '📱' }, { slug: 'hogar', emoji: '🛋️' },
  { slug: 'moda', emoji: '👗' }, { slug: 'deportes', emoji: '⚽' }, { slug: 'mascotas', emoji: '🐕' },
];

export default function OnboardingModal({ onClose, user, t, lang, smsEnabled = false }) {
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const dictionary = t || {};
  const experience = getOnboardingExperienceCopy(lang);

  useEffect(() => {
    if (user?.preferred_role) setSelectedRole(user.preferred_role);
    if (Array.isArray(user?.preferred_categories)) setSelectedInterests(user.preferred_categories);
  }, [user]);

  const persistResolution = async (resolution) => {
    const payload = {
      preferred_role: selectedRole || null,
      preferred_categories: selectedInterests,
      onboarding_resolution: resolution,
    };

    localStorage.setItem('onboarding_role', selectedRole);
    localStorage.setItem('onboarding_interests', JSON.stringify(selectedInterests));

    const token = localStorage.getItem('auth_token');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4000);
    let persisted = false;
    if (token) {
      try {
        const response = await fetch(`${API_URL}/user/preferences`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        persisted = response.ok;
      } catch {
        persisted = false;
      } finally {
        window.clearTimeout(timeout);
      }
    } else {
      window.clearTimeout(timeout);
    }

    if (persisted) {
      localStorage.removeItem(ONBOARDING_PENDING_SYNC_KEY);
    } else {
      localStorage.setItem(ONBOARDING_PENDING_SYNC_KEY, JSON.stringify({
        user_id: user?.id ?? null,
        payload,
      }));
    }
    if (user?.id != null) localStorage.setItem(ONBOARDING_DONE_USER_KEY, String(user.id));
    localStorage.removeItem('onboarding_done');
    localStorage.removeItem('just_registered');
  };

  const toggleInterest = (slug) => {
    setSelectedInterests(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
    );
  };

  const STEPS = [
    // Step 0: Welcome
    {
      id: 'welcome',
      emoji: '🎉',
      title: dictionary.onboarding_welcome_title,
      subtitle: dictionary.onboarding_welcome_subtitle,
    },
    // Step 1: Role selection
    {
      id: 'role',
      emoji: '🎯',
      title: experience.roleTitle,
      subtitle: experience.roleSubtitle,
    },
    // Step 2: Interests
    {
      id: 'interests',
      emoji: '✨',
      title: experience.interestsTitle,
      subtitle: experience.interestsSubtitle,
    },
    // Step 3: How it works (personalized)
    {
      id: 'how',
      emoji: selectedRole === 'buyer' ? '🛍️' : selectedRole === 'seller' ? '💰' : '🤝',
      title: experience.howTitle[selectedRole] || experience.howTitle.both,
      subtitle: dictionary.onboarding_how_subtitle,
    },
    // Step 4: Profile checklist
    {
      id: 'profile',
      emoji: '✅',
      title: dictionary.onboarding_profile_title,
      subtitle: dictionary.onboarding_profile_subtitle,
    },
  ];

  const isLast = step === STEPS.length - 1;
  const currentStep = STEPS[step];

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    await persistResolution('completed');
    onClose();

    if (selectedRole === 'buyer') {
      navigate('/listings');
    } else {
      navigate('/post');
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    await persistResolution('skipped');
    onClose();
  };

  const checklist = [
    { icon: Camera, label: dictionary.onboarding_checklist_photo, done: !!(user?.avatar_url || user?.profile_photo_path || user?.avatar) },
    ...(smsEnabled ? [{ icon: Phone, label: dictionary.onboarding_checklist_phone, done: !!(user?.phone_verified) }] : []),
    { icon: FileText, label: dictionary.onboarding_checklist_bio, done: !!(user?.bio && user.bio.trim()) },
  ];

  const getHowItWorksSteps = () => {
    const roleKey = selectedRole === 'buyer' || selectedRole === 'seller' ? selectedRole : 'both';
    return experience.how[roleKey].map(([label, desc], index) => ({
      step: String(index + 1),
      icon: roleKey === 'buyer' ? ['🔍', '💬', '✅'][index] : roleKey === 'seller' ? ['📝', '🤝', '💰'][index] : ['📝', '🤝', '✅'][index],
      label,
      desc,
    }));
  };

  const getFinalCTA = () => {
    const roleKey = selectedRole === 'buyer' || selectedRole === 'seller' ? selectedRole : 'both';
    const [primary, secondary] = experience.cta[roleKey];
    return { primary, secondary, icon: roleKey === 'buyer' ? ShoppingBag : roleKey === 'seller' ? Store : Users };
  };

  const canProceed = () => {
    if (currentStep.id === 'role') return !!selectedRole;
    if (currentStep.id === 'interests') return true;
    return true;
  };

  const closeOnboarding = () => {
    if (!saving) void handleSkip();
  };
  const { dialogRef, initialFocusRef, handleKeyDown } = useModalFocusTrap({
    isOpen: true,
    onClose: closeOnboarding,
  });

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        onKeyDown={handleKeyDown}
        className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className={`bg-gradient-to-br ${currentStep.id === 'role' && selectedRole
          ? ROLES.find(r => r.id === selectedRole)?.color || 'from-[#84CC16] to-[#65A30D]'
          : 'from-[#84CC16] to-[#65A30D]'
        } px-6 pt-6 pb-5 relative flex-shrink-0`}>
          <button
            ref={initialFocusRef}
            type="button"
            onClick={closeOnboarding}
            disabled={saving}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 disabled:opacity-50"
            aria-label={dictionary.close_btn}
          >
            <X size={20} />
          </button>
          <div className="text-4xl mb-2">{currentStep.emoji}</div>
          <h2 id="onboarding-title" className="text-white font-bold text-xl leading-tight">{currentStep.title}</h2>
          <p className="text-white/80 text-[13px] mt-1">{currentStep.subtitle}</p>

          {/* Progress bar */}
          <div className="flex gap-2 mt-4">
            {STEPS.map((_, i) => (
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
        <div className="px-6 py-5 flex-1 overflow-y-auto">
          {currentStep.id === 'welcome' && (
            <div className="flex flex-col items-center gap-5 py-2 animate-in slide-in-from-right-4 duration-300">
              <div className="w-24 h-24 rounded-full bg-lime-50 flex items-center justify-center text-5xl shadow-inner">
                🛒
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-center text-[15px] leading-relaxed max-w-xs">
                {experience.welcomeBody}
              </p>
              <div className="flex gap-2 flex-wrap justify-center">
                {experience.welcomeChips.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-lime-50 text-lime-700 rounded-full text-[12px] font-medium border border-lime-100">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="w-full bg-lime-50 dark:bg-lime-900/20 rounded-2xl p-4 border border-lime-100 dark:border-lime-400/30">
                <div className="flex items-start gap-3">
                  <Sparkles size={20} className="text-[#84CC16] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-white">{experience.pricingFree}</p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{experience.pricingRenew}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep.id === 'role' && (
            <div className="flex flex-col gap-3 py-1 animate-in slide-in-from-right-4 duration-300">
              {ROLES.map(role => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? `${role.border} ${role.bg} shadow-md scale-[1.02]`
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                      <Icon size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-[15px]">{experience.roles[role.id][0]}</span>
                        <span className="text-lg">{role.emoji}</span>
                      </div>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{experience.roles[role.id][1]}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle size={20} className={role.text} />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {currentStep.id === 'interests' && (
            <div className="flex flex-col gap-3 py-1 animate-in slide-in-from-right-4 duration-300">
              <p className="text-[13px] text-slate-500 dark:text-slate-400 text-center mb-1">
                {experience.interestsOptional}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {INTERESTS.map(interest => {
                  const isSelected = selectedInterests.includes(interest.slug);
                  return (
                    <button
                      key={interest.slug}
                      onClick={() => toggleInterest(interest.slug)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
                        isSelected
                          ? 'border-[#84CC16] bg-lime-50 dark:bg-lime-900/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <span className="text-2xl">{interest.emoji}</span>
                      <span className={`text-[12px] font-medium ${isSelected ? 'text-lime-700 dark:text-lime-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {experience.interests[interest.slug]}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[12px] text-center text-slate-400 dark:text-slate-500">
                {experience.selectedCount.replace('{count}', selectedInterests.length)}
              </p>
            </div>
          )}

          {currentStep.id === 'how' && (
            <div className="flex flex-col gap-3 py-1 w-full animate-in slide-in-from-right-4 duration-300">
              {getHowItWorksSteps().map(({ step: sNum, icon, label, desc }) => (
                <div key={sNum} className="flex items-start gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#84CC16] to-[#65A30D] text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm">
                    {sNum}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{icon}</span>
                      <span className="font-semibold text-slate-800 dark:text-white text-[14px]">{label}</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[13px] mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
              {selectedRole === 'buyer' && (
                <div className="flex items-center gap-2 mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-400/30">
                  <MapPin size={18} className="text-blue-600 flex-shrink-0" />
                  <p className="text-[12px] text-blue-800 dark:text-blue-300">{experience.buyerMapTip}</p>
                </div>
              )}
              {selectedRole === 'seller' && (
                <div className="flex items-center gap-2 mt-2 p-3 bg-lime-50 dark:bg-lime-900/20 rounded-2xl border border-lime-100 dark:border-lime-400/30">
                  <Star size={18} className="text-[#84CC16] flex-shrink-0" />
                  <p className="text-[12px] text-lime-800 dark:text-lime-300">{experience.sellerAiTip}</p>
                </div>
              )}
            </div>
          )}

          {currentStep.id === 'profile' && (
            <div className="flex flex-col gap-3 py-2 animate-in slide-in-from-right-4 duration-300">
              <p className="text-slate-500 dark:text-slate-400 text-[13px] text-center mb-1">
                {dictionary.onboarding_checklist_desc}
              </p>
              {checklist.map(({ icon: Icon, label, done }) => (
                <div key={label} className={`flex items-center gap-3 p-3 rounded-2xl border ${done ? 'bg-lime-50 dark:bg-lime-900/20 border-lime-100 dark:border-lime-400/30' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-[#84CC16] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                    {done ? <CheckCircle size={16} /> : <Icon size={16} />}
                  </div>
                  <span className={`text-[14px] font-medium ${done ? 'text-lime-700 dark:text-lime-300 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{label}</span>
                </div>
              ))}
              {selectedRole === 'buyer' && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-400/30 mt-1">
                  <Bell size={18} className="text-blue-600 flex-shrink-0" />
                  <span className="text-[13px] text-blue-700 dark:text-blue-300 font-medium">{experience.profileNotificationsTip}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-6 pb-6 pt-3 flex flex-col gap-3 flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          {isLast ? (
            <>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="w-full bg-gradient-to-r from-[#84CC16] to-[#65A30D] hover:from-[#65A30D] hover:to-[#84CC16] text-white font-semibold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                {saving ? `${dictionary.saving_word}…` : getFinalCTA().primary} <ArrowRight size={16} />
              </button>
              <button
                onClick={handleSkip}
                disabled={saving}
                className="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[13px] py-1.5 transition-colors"
              >
                {dictionary.onboarding_skip_btn}
              </button>
            </>
          ) : (
            <div className="flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium py-3 rounded-2xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={16} /> {dictionary.back}
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1 bg-gradient-to-r from-[#84CC16] to-[#65A30D] hover:from-[#65A30D] hover:to-[#84CC16] disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                {dictionary.next_btn} <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
