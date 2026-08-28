import { useRef, useState } from 'react';

export function useLocationSearchState() {
  const [radius, setRadius] = useState(50);
  const [searchLocation, setSearchLocation] = useState(null);
  const [searchLocationInput, setSearchLocationInput] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showMobileLocationPicker, setShowMobileLocationPicker] = useState(false);
  const [locState, setLocState] = useState('');
  const [locCity, setLocCity] = useState('');
  const mobileSearchInputRef = useRef(null);

  return {
    locCity,
    locState,
    mobileSearchInputRef,
    radius,
    searchLocation,
    searchLocationInput,
    setLocCity,
    setLocState,
    setRadius,
    setSearchLocation,
    setSearchLocationInput,
    setShowLocationPicker,
    setShowMobileLocationPicker,
    showLocationPicker,
    showMobileLocationPicker,
  };
}
