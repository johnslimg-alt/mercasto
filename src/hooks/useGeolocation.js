import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * useGeolocation — React hook for browser geolocation.
 *
 * Provides the user's current position and a function to request it.
 * Handles permission states, errors, and timeout.
 *
 * Usage:
 *   const { coords, loading, error, requestLocation, clearLocation } = useGeolocation();
 *
 * @param {Object} options
 * @param {boolean} options.autoRequest - If true, requests location on mount (default: false)
 * @param {number} options.timeout - Geolocation timeout in ms (default: 10000)
 * @param {number} options.maxAge - Maximum age of cached position in ms (default: 300000 = 5min)
 * @param {boolean} options.highAccuracy - Enable high accuracy GPS (default: true)
 * @param {Function} options.onSuccess - Callback when location is obtained
 * @param {Function} options.onError - Callback when location fails
 *
 * @returns {Object} { coords, loading, error, requestLocation, clearLocation }
 */
export default function useGeolocation({
  autoRequest = false,
  timeout = 10000,
  maxAge = 300000,
  highAccuracy = true,
  onSuccess = null,
  onError = null,
} = {}) {
  const [coords, setCoords] = useState(null); // { latitude, longitude, accuracy }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // { code, message }
  const watchIdRef = useRef(null);

  const clearLocation = useCallback(() => {
    setCoords(null);
    setError(null);
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const err = { code: 0, message: 'Geolocalización no soportada en este navegador' };
      setError(err);
      onError?.(err);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setCoords(newCoords);
        setLoading(false);
        onSuccess?.(newCoords);
      },
      (geoError) => {
        const errorMap = {
          1: 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.',
          2: 'Ubicación no disponible. Verifica tu conexión GPS.',
          3: 'Tiempo de espera agotado. Intenta de nuevo.',
        };
        const err = {
          code: geoError.code,
          message: errorMap[geoError.code] || geoError.message || 'Error desconocido',
        };
        setError(err);
        setLoading(false);
        onError?.(err);
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout,
        maximumAge: maxAge,
      }
    );
  }, [timeout, maxAge, highAccuracy, onSuccess, onError]);

  // Auto-request on mount if configured
  useEffect(() => {
    if (autoRequest) {
      requestLocation();
    }
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [autoRequest, requestLocation]);

  return {
    coords,
    loading,
    error,
    requestLocation,
    clearLocation,
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula.
 *
 * @param {Object} coord1 - { latitude, longitude }
 * @param {Object} coord2 - { latitude, longitude }
 * @returns {number} Distance in kilometers
 */
export function getDistanceKm(coord1, coord2) {
  if (!coord1 || !coord2) return Infinity;

  const R = 6371; // Earth radius in km
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitude)) *
    Math.cos(toRad(coord2.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Format distance for display.
 *
 * @param {number} km - Distance in kilometers
 * @returns {string} Formatted distance string (e.g., "1.2 km" or "350 m")
 */
export function formatDistance(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km)} km`;
}
