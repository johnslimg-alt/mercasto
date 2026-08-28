import { useState } from 'react';

export function useTransientModalState() {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingAd, setReportingAd] = useState(null);
  const [showUserReportModal, setShowUserReportModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [qrModalData, setQrModalData] = useState(null);

  return {
    showProfileModal,
    setShowProfileModal,
    showCouponModal,
    setShowCouponModal,
    showReportModal,
    setShowReportModal,
    reportingAd,
    setReportingAd,
    showUserReportModal,
    setShowUserReportModal,
    showAiModal,
    setShowAiModal,
    qrModalData,
    setQrModalData,
  };
}
