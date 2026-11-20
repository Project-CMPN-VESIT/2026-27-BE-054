import { useState, useMemo } from 'react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import useFloodStore from '../store/floodStore';
import { getDispatchCenters } from '../utils/constants';
import { formatINR } from '../utils/formatters';
import { Navigation } from 'lucide-react';

export default function RoutingPage() {
  const { selectedState, districts, computeRoute, routeResult, loading } = useFloodStore();
  const [searchParams] = useSearchParams();
  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(0);
  const [teamSize, setTeamSize] = useState(5);
  const [vehicleType, setVehicleType] = useState('truck');

  const centers = useMemo(() => getDispatchCenters(selectedState), [selectedState]);
  const destDistricts = useMemo(() => (districts || []).filter(d => d.latitude && d.longitude), [districts]);

  useEffect(() => {
    const districtParam = searchParams.get('district');
    if (!districtParam || !destDistricts.length) return;
    const idx = destDistricts.findIndex((d) => d.district?.toUpperCase() === districtParam.toUpperCase());
    if (idx >= 0) setToIdx(idx);
  }, [destDistricts, searchParams]);

  const handleCompute = async () => {
    const from = centers[fromIdx];
    const to = destDistricts[toIdx];
    if (!from || !to) return;
    await computeRoute(
      { name: from.name, lat: from.lat, lon: from.lon },
      { name: to.district, lat: to.latitude, lon: to.longitude },
      teamSize,
      vehicleType,
      to.impact_population || 10000,
    );
  };

  // Parse geometry for polyline
  const routePolyline = useMemo(() => {
    if (!routeResult?.geometry) return [];
    // If geometry is an array of [lat,lon] pairs (fallback)
    if (Array.isArray(routeResult.geometry)) {
      return routeResult.geometry;
    }
    return [];
  }, [routeResult]);

  const mapCenter = useMemo(() => {
    if (routeResult?.from && routeResult?.to) {
      return [
        (routeResult.from.lat + routeResult.to.lat) / 2,
        (routeResult.from.lon + routeResult.to.lon) / 2,
      ];
    }
    if (centers[0]) return [centers[0].lat, centers[0].lon];
    return [22.5, 82];
  }, [routeResult, centers]);

  return (
    <div className="p-6 space-y-5">
      <div className="page-header rounded-lg">
        <h1>🚛 Dispatch Routing — {selectedState}</h1>
        {routeResult && (
          <span className={routeResult.source === 'openrouteservice' ? 'status-live' : 'status-simulated'}>
            {routeResult.message}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Controls */}
        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <h3 className="text-sm font-bold text-gov-navy">Route Configuration</h3>

          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">From (Dispatch Center)</label>
            <select value={fromIdx} onChange={e => setFromIdx(+e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-accent-primary">
              {centers.map((c, i) => <option key={i} value={i}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">To (Affected District)</label>
            <select value={toIdx} onChange={e => setToIdx(+e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-accent-primary">
              {destDistricts.map((d, i) => (
                <option key={i} value={i}>{d.district} (Sev: {d.severity_score?.toFixed(1)})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Team Size</label>
              <input type="number" value={teamSize} onChange={e => setTeamSize(+e.target.value)} min={1} max={100}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-accent-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Vehicle</label>
              <select value={vehicleType} onChange={e => setVehicleType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-accent-primary">
                <option value="truck">Truck</option>
                <option value="car">Car</option>
              </select>
            </div>
          </div>

          <button onClick={handleCompute} disabled={loading.route} className="btn-primary w-full flex items-center justify-center gap-2">
            <Navigation size={16} />
            {loading.route ? 'Computing...' : 'Compute Route'}
          </button>

          {/* Results */}
          {routeResult && (
            <div className="mt-4 p-4 bg-bg-primary rounded-lg border border-border space-y-2">
              <h4 className="text-xs font-bold text-gov-navy uppercase">Route Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-text-muted">Distance</span><div className="font-bold font-[family-name:var(--font-data)]">{routeResult.distance_km} km</div></div>
                <div><span className="text-text-muted">ETA</span><div className="font-bold font-[family-name:var(--font-data)]">{routeResult.duration_hrs} hrs</div></div>
                <div><span className="text-text-muted">Est. Cost</span><div className="font-bold text-accent-primary font-[family-name:var(--font-data)]">{formatINR(routeResult.cost_inr)}</div></div>
                <div><span className="text-text-muted">Source</span><div className="font-bold font-[family-name:var(--font-data)]">{routeResult.source === 'openrouteservice' ? 'ORS Live' : 'Estimated'}</div></div>
              </div>
              <div className="text-[11px] text-text-muted mt-2">
                {routeResult.from?.name} → {routeResult.to?.name}
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border overflow-hidden" style={{ height: 500 }}>
          <MapContainer center={mapCenter} zoom={7} className="w-full h-full" attributionControl={false}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            />

            {/* Route polyline */}
            {routePolyline.length > 0 && (
              <Polyline positions={routePolyline} color="#1a56db" weight={4} opacity={0.8} dashArray="10 6" />
            )}

            {/* From marker */}
            {routeResult?.from && (
              <Marker position={[routeResult.from.lat, routeResult.from.lon]}>
                <Popup><strong>🏛️ {routeResult.from.name}</strong><br />Dispatch Center</Popup>
              </Marker>
            )}

            {/* To marker */}
            {routeResult?.to && (
              <Marker position={[routeResult.to.lat, routeResult.to.lon]}>
                <Popup><strong>📍 {routeResult.to.name}</strong><br />Destination</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
