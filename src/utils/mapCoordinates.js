export function getExactMapCoordinates(ad = {}) {
  const lat = Number(ad.latitude ?? ad.lat);
  const lng = Number(ad.longitude ?? ad.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
    return null;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return [lat, lng];
}
