import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent, trackPageView } from '../../lib/analytics';

export default function AnalyticsRouteTracker() {
  const location = useLocation();

  useEffect(() => {
    const page = location.pathname || '/';

    trackPageView(page);

    if (page === '/') {
      trackEvent('homepage_viewed', {
        page: '/',
        source: 'route',
      });
    }
  }, [location.pathname]);

  return null;
}
