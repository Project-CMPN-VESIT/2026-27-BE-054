import { useEffect, useMemo } from 'react';
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

function normalize(value) {
  return (value || '').toUpperCase().trim().replace(/\s+/g, ' ').replace(/[^A-Z0-9 ]/g, '');
}

function FitDistrictBounds({ feature }) {
  const map = useMap();
  useEffect(() => {
    if (!feature) return;
    const layer = L.geoJSON(feature);
    map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 9 });
  }, [feature, map]);
  return null;
}

function getSeverityColor(score) {
  if (score >= 8) return '#dc2626';
  if (score >= 6) return '#ea580c';
  if (score >= 4) return '#ca8a04';
  return '#16a34a';
}

function getWaterColor(type) {
  const t = (type || '').toLowerCase();
  if (t === 'dam' || t === 'reservoir') return '#00d4ff';
  if (t === 'river' || t === 'canal') return '#00ff88';
  if (t === 'lake' || t === 'wetland') return '#4dd0ff';
  return '#00d4ff';
}

function getRiskRadius(riskLevel) {
  if (riskLevel === 'HIGH') return 12;
  if (riskLevel === 'MEDIUM') return 12;
  return 12;
}

export default function AlertMiniMap({ geojson, districtName, lat, lon, severityScore, waterFeatures }) {
  const selectedNorm = normalize(districtName);

  const selectedFeature = useMemo(() => {
    const features = geojson?.features || [];
    return features.find((feature) => {
      const district = normalize(
        feature.properties?.district ||
          feature.properties?.DISTRICT ||
          feature.properties?.dtname ||
          feature.properties?.NAME_2,
      );
      return district === selectedNorm;
    }) || null;
  }, [geojson, selectedNorm]);

  const surrounding = useMemo(() => {
    const features = geojson?.features || [];
    return features.filter((feature) => feature !== selectedFeature);
  }, [geojson, selectedFeature]);

  if (!geojson?.features?.length) {
    return <div className="h-[300px] flex items-center justify-center text-sm text-slate-500 bg-slate-100 rounded-lg">Map unavailable</div>;
  }

  return (
    <div className="relative h-[300px] rounded-lg overflow-hidden border border-slate-300 shadow-sm">
      <MapContainer
        center={[22.5, 82]}
        zoom={6}
        zoomControl={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        dragging={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        attributionControl={false}
        className="w-full h-full"
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles © Esri"
          maxZoom={18}
        />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution=""
          maxZoom={18}
          opacity={0.8}
        />
        <GeoJSON
          data={{ type: 'FeatureCollection', features: surrounding }}
          style={{ color: '#94a3b8', weight: 1, fillColor: '#cbd5e1', fillOpacity: 0.15 }}
        />
        {selectedFeature && (
          <>
            <GeoJSON
              data={selectedFeature}
              style={{
                color: '#ffffff',
                weight: 3,
                fillColor: getSeverityColor(severityScore || 0),
                fillOpacity: 0.45,
              }}
            />
            <FitDistrictBounds feature={selectedFeature} />
          </>
        )}
        {(waterFeatures || []).filter((w) => w.lat && w.lon).map((water, idx) => (
          <CircleMarker
            key={`${water.name}-${idx}`}
            center={[water.lat, water.lon]}
            radius={getRiskRadius(water.risk_level)}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: getWaterColor(water.type),
              fillOpacity: 1,
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -12]}>
              <div style={{ fontSize: '11px', fontWeight: 600 }}>
                {'💧'} {water.name}<br />
                <span style={{ color: '#64748b' }}>
                  {water.type} {'·'} {water.distance_from_center_km}km
                </span><br />
                <span style={{
                  color: water.risk_level === 'HIGH' ? '#dc2626' : water.risk_level === 'MEDIUM' ? '#d97706' : '#16a34a',
                  fontWeight: 700,
                }}
                >
                  {water.risk_level} RISK
                </span>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
        {lat && lon && (
          <CircleMarker
            center={[lat, lon]}
            radius={8}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: '#ff4444',
              fillOpacity: 1,
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -8]}>
              <span style={{ fontSize: '11px', fontWeight: 700 }}>
                {'📍'} {districtName}
              </span>
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'rgba(255,255,255,0.92)',
          borderRadius: '6px',
          padding: '8px 10px',
          fontSize: '11px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4, color: '#1a3c5e' }}>MAP LEGEND</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00d4ff' }} />
          Dam / Reservoir
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00ff88' }} />
          River / Canal
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff4444' }} />
          District Center
        </div>
      </div>
    </div>
  );
}
