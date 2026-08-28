import { useEffect } from 'react';

export function useRefQueryParam() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && ref.trim()) {
      localStorage.setItem('pendingReferral', ref.trim().toUpperCase());
    }
  }, []);
}
