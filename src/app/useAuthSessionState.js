import { useState } from 'react';

export function useAuthSessionState(initialAuthToken, initialUser) {
  const [authReady, setAuthReady] = useState(!initialAuthToken);
  const [user, setUser] = useState(initialUser);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [registrationConsentAccepted, setRegistrationConsentAccepted] = useState(false);
  const [pendingPhoneRegistrationConsent, setPendingPhoneRegistrationConsent] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [emailBannerDismissed, setEmailBannerDismissed] = useState(false);
  const [emailBannerSent, setEmailBannerSent] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorChallengeToken, setTwoFactorChallengeToken] = useState('');

  return {
    authReady, setAuthReady, user, setUser, showAuthModal, setShowAuthModal,
    authMode, setAuthMode, registrationConsentAccepted, setRegistrationConsentAccepted,
    pendingPhoneRegistrationConsent, setPendingPhoneRegistrationConsent,
    showOnboarding, setShowOnboarding, emailBannerDismissed, setEmailBannerDismissed,
    emailBannerSent, setEmailBannerSent, resetToken, setResetToken, resetEmail, setResetEmail,
    authLoading, setAuthLoading, requiresTwoFactor, setRequiresTwoFactor,
    twoFactorEmail, setTwoFactorEmail, twoFactorChallengeToken, setTwoFactorChallengeToken,
  };
}
