/**
 * Geographic helper functions.
 */

export function getBoundsForDistricts(districts) {
  if (!districts?.length) return [[20, 73], [28, 90]]; // Default India view
  const lats = districts.map(d => d.latitude).filter(Boolean);
  const lons = districts.map(d => d.longitude).filter(Boolean);
  if (!lats.length) return [[20, 73], [28, 90]];
  const pad = 0.5;
  return [
    [Math.min(...lats) - pad, Math.min(...lons) - pad],
    [Math.max(...lats) + pad, Math.max(...lons) + pad],
  ];
}

export function getMapCenter(districts) {
  if (!districts?.length) return [22.5, 82]; // India center
  const lats = districts.map(d => d.latitude).filter(Boolean);
  const lons = districts.map(d => d.longitude).filter(Boolean);
  if (!lats.length) return [22.5, 82];
  return [
    lats.reduce((a, b) => a + b, 0) / lats.length,
    lons.reduce((a, b) => a + b, 0) / lons.length,
  ];
}
