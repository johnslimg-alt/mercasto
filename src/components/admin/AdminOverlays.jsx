import React from 'react';
import { useLocation } from 'react-router-dom';

const AdminModerationCenter = React.lazy(() => import('./AdminModerationCenter.jsx'));
const AdvertisingHub = React.lazy(() => import('./AdvertisingHub.jsx'));

export default function AdminOverlays() {
  const { pathname } = useLocation();
  if (!pathname.startsWith('/admin')) return null;

  return (
    <React.Suspense fallback={null}>
      <AdminModerationCenter />
      <AdvertisingHub />
    </React.Suspense>
  );
}
