import { useState } from 'react';

export default function OptimizedImage({ 
  src, 
  alt, 
  className = '',
  width,
  height,
  priority = false,
  fallback = '/placeholder.jpg'
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleError = () => {
    if (!imageError) {
      setImageError(true);
    }
  };

  const handleLoad = () => {
    setImageLoaded(true);
  };

  return (
    <img
      src={imageError ? fallback : src}
      alt={alt}
      className={`transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={handleLoad}
      onError={handleError}
      fetchPriority={priority ? 'high' : 'auto'}
    />
  );
}
