import { useMemo, useEffect, useCallback, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import useFloodStore from '../../store/floodStore';
import { getSeverityColor } from '../../utils/colorScale';
import { getBoundsForDistricts } from '../../utils/geoHelpers';
import { formatPopulation, formatPercent } from '../../utils/formatters';

// ── Helper: normalize a district name for fuzzy matching ────────
function normalize(s) {
  return (s || '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Z0-9 ]/g, '');
}

// ── Known alternate spellings between CSV ↔ GeoJSON ────────────
const DISTRICT_ALIASES = {
  // Maharashtra – Ahmednagar / Ahilyanagar
  'AHILYANAGAR': 'AHMEDNAGAR',
  'AHMADNAGAR': 'AHMEDNAGAR',
  'AHMEDNAGAR': 'AHILYANAGAR',
  // Maharashtra – Mumbai variants
  'MUMBAI CITY': 'MUMBAI',
  'MUMBAI SUBURBAN': 'MUMBAI',
  'GREATER MUMBAI': 'MUMBAI',
  'BRIHAN MUMBAI': 'MUMBAI',
  'MUMBAI': 'MUMBAI CITY',
  // Maharashtra – Aurangabad / Sambhajinagar
  'AURANGABAD': 'CHHATRAPATI SAMBHAJINAGAR',
  'CHHATRAPATI SAMBHAJINAGAR': 'AURANGABAD',
  'SAMBHAJI NAGAR': 'AURANGABAD',
  // Maharashtra – Osmanabad / Dharashiv
  'OSMANA BAD': 'DHARASHIV',
  'OSMANABAD': 'DHARASHIV',
  'DHARASHIV': 'OSMANABAD',
  // Maharashtra – other
  'RAIGARH': 'RAIGAD',
  'BID': 'BEED',
  'GONDIYA': 'GONDIA',
  'SINDHUDURG': 'SINDHUDURGA',
  'PALGHAR': 'PALGHAR',
  
  // BIHAR
  'AURANGABAD BIHAR': 'AURANGABAD',
  'BUXAR': 'BAKSAR',
  'KAIMUR BHABUA': 'KAIMUR',
  'PURBA CHAMPARAN': 'EAST CHAMPARAN',
  'PASHCHIM CHAMPARAN': 'WEST CHAMPARAN',
  
  // WEST BENGAL
  'PURBA MEDINIPUR': 'EAST MIDNAPORE',
  'PASHCHIM MEDINIPUR': 'WEST MIDNAPORE',
  'BALESHWAR': 'BALASORE',
  'PURULIYA': 'PURULIA',
  'HAORA': 'HOWRAH',
  'HUGLI': 'HOOGHLY',
  'KOCH BIHAR': 'COOCH BEHAR',
  'DARJILING': 'DARJEELING',
  'NORTH TWENTYFOUR PARGANAS': 'NORTH 24 PARGANAS',
  'SOUTH TWENTYFOUR PARGANAS': 'SOUTH 24 PARGANAS',
  'NORTH 24 PARGANAS': 'NORTH TWENTYFOUR PARGANAS',
  'SOUTH 24 PARGANAS': 'SOUTH TWENTYFOUR PARGANAS',
  'NORTH TWENTY FOUR PARGAN': 'NORTH 24 PARGANAS',
  'NORTH TWENTY FOUR PARGANNAS': 'NORTH 24 PARGANAS',
  'SOUTH SALMARA MANCACHAR': 'SOUTH SALMARA-MANKACHAR',
};

// Build the reverse mapping too
const ALL_ALIASES = { ...DISTRICT_ALIASES };
for (const [k, v] of Object.entries(DISTRICT_ALIASES)) {
  ALL_ALIASES[v] = k;
}

// ── Build a fuzzy district lookup from CSV district data ────────
function buildDistrictLookup(districts) {
  const lookup = {};
  for (const d of districts || []) {
    if (!d.district) continue;
    const key = normalize(d.district);
    lookup[key] = d;

    // Also index known alternate spellings
    if (ALL_ALIASES[key]) {
      lookup[normalize(ALL_ALIASES[key])] = d;
    }
  }
  return lookup;
}

// ── Map helper components ───────────────────────────────────────

function MapBoundsUpdater({ districts }) {
  const map = useMap();
  useEffect(() => {
    if (districts?.length) {
      const bounds = getBoundsForDistricts(districts);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 9 });
    }
  }, [districts, map]);
  return null;
}

function SelectedHighlighter({ district }) {
  const map = useMap();
  useEffect(() => {
    if (district?.latitude && district?.longitude) {
      map.flyTo([district.latitude, district.longitude], 10, { duration: 0.8 });
    }
  }, [district, map]);
  return null;
}

// ── Main FloodMap component ─────────────────────────────────────

export default function FloodMap() {
  const { districts, selectedDistrict, selectDistrict, selectedState, geojsonData } = useFloodStore();
  const [hoveredDistrict, setHoveredDistrict] = useState(null);

  // Build fuzzy lookup once when districts change
  const districtLookup = useMemo(() => buildDistrictLookup(districts), [districts]);

  // Fuzzy match a GeoJSON feature → CSV district data
  const getDistrictData = useCallback((feature) => {
    // Try multiple GeoJSON property fields
    const geoNames = [
      feature.properties?.district,
      feature.properties?.DISTRICT,
      feature.properties?.dtname,
      feature.properties?.NAME_2,
      feature.properties?.District_N,
      feature.properties?.DIST_NAME,
    ].filter(Boolean).map(normalize);

    for (const name of geoNames) {
      // 1. Direct match
      if (districtLookup[name]) return districtLookup[name];

      // 2. Forward alias: GeoJSON name → CSV name
      const aliasedName = ALL_ALIASES[name];
      if (aliasedName) {
        const normAlias = normalize(aliasedName);
        if (districtLookup[normAlias]) return districtLookup[normAlias];
      }

      // 3. Reverse alias: find any alias whose value matches this name
      const reverseHit = Object.entries(ALL_ALIASES)
        .find(([, v]) => normalize(v) === name);
      if (reverseHit) {
        const normKey = normalize(reverseHit[0]);
        if (districtLookup[normKey]) return districtLookup[normKey];
      }

      // 4. Partial / contains match (last resort)
      const found = Object.entries(districtLookup).find(([key]) =>
        key.includes(name) || name.includes(key)
      );
      if (found) return found[1];
    }

    return null; // truly unmatched → grey fill
  }, [districtLookup]);

  // All districts with coordinates (for map bounds)
  const allMarkers = useMemo(() => {
    if (!districts?.length) return [];
    return districts.filter(d => d.latitude && d.longitude);
  }, [districts]);

  // ── Style each GeoJSON polygon ──────────────────────────────
  const districtStyle = useCallback((feature) => {
    const data = getDistrictData(feature);

    if (!data) {
      // Unmatched district: light grey, semi-transparent
      return {
        fillColor: '#cbd5e1',
        fillOpacity: 0.25,
        color: '#94a3b8',
        weight: 0.5,
        opacity: 0.5,
      };
    }

    const score = data.severity_score ?? 0;
    const isSelected = selectedDistrict?.district === data.district;

    return {
      fillColor: getSeverityColor(score),
      fillOpacity: isSelected ? 0.85 : 0.65,
      color: isSelected ? '#1a56db' : '#94a3b8',
      weight: isSelected ? 3 : 1,
      opacity: 1,
    };
  }, [getDistrictData, selectedDistrict]);

  // ── Attach events to each GeoJSON feature ───────────────────
  const onEachFeature = useCallback((feature, layer) => {
    const data = getDistrictData(feature);

    layer.on({
      mouseover: (e) => {
        const lyr = e.target;
        lyr.setStyle({
          fillOpacity: 0.85,
          weight: 2.5,
          color: '#1a56db',
          opacity: 1,
        });
        lyr.bringToFront();
        if (data) {
          setHoveredDistrict({ name: data.district, severity: data.severity_score });
        }
      },
      mouseout: (e) => {
        const lyr = e.target;
        const isSelected = data && selectedDistrict?.district === data.district;
        if (data) {
          lyr.setStyle({
            fillOpacity: isSelected ? 0.85 : 0.65,
            weight: isSelected ? 3 : 1,
            color: isSelected ? '#1a56db' : '#94a3b8',
            opacity: 1,
          });
        } else {
          lyr.setStyle({
            fillOpacity: 0.25,
            weight: 0.5,
            color: '#94a3b8',
            opacity: 0.5,
          });
        }
        setHoveredDistrict(null);
      },
      click: () => {
        if (data) selectDistrict(data);
      },
    });

    // Tooltip on hover
    if (data) {
      const sev = (data.severity_score || 0).toFixed(1);
      const pop = formatPopulation(data.population);
      const color = getSeverityColor(data.severity_score);
      layer.bindTooltip(
        `<div style="font-family: 'Noto Sans', sans-serif; font-size: 11px;">
          <strong>${data.district}</strong><br/>
          Severity: <span style="color:${color}; font-weight:700">${sev}</span> &nbsp;
          Pop: ${pop}
        </div>`,
        { sticky: true, direction: 'top', className: 'district-tooltip' }
      );
    } else {
      // Show raw GeoJSON name for unmatched
      const rawName = feature.properties?.district || feature.properties?.DISTRICT || 'Unknown';
      layer.bindTooltip(
        `<div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; color: #64748b;">
          <strong>${rawName}</strong><br/>
          <em>No matching data</em>
        </div>`,
        { sticky: true, direction: 'top', className: 'district-tooltip' }
      );
    }
  }, [getDistrictData, selectedDistrict, selectDistrict]);

  // Force re-render key when data or selection changes
  const geoKey = useMemo(() => {
    const selName = selectedDistrict?.district || 'none';
    return `geojson-${selectedState}-${geojsonData?.features?.length || 0}-${selName}`;
  }, [geojsonData, selectedDistrict, selectedState]);

  // ── Debug log for match quality ────────────────────────────
  useEffect(() => {
    if (!geojsonData?.features?.length || !districts?.length) return;

    const features = geojsonData.features;
    const matched = features.filter(f => getDistrictData(f) !== null);
    console.log(`[GeoJSON Match] State: ${selectedState}`);
    console.log(`  GeoJSON districts: ${features.length}`);
    console.log(`  Matched to CSV:    ${matched.length}`);
    console.log(`  Unmatched:         ${features.length - matched.length}`);

    const unmatched = features
      .filter(f => getDistrictData(f) === null)
      .map(f => f.properties?.district || f.properties?.DISTRICT || '???');
    if (unmatched.length > 0) console.log('  Unmatched names:', unmatched);

    // Maharashtra-specific debug: show all unmatched with full properties
    const maharashtraFeatures = features.filter(f => {
      const state = (f.properties?.ST_NM || f.properties?.state || f.properties?.STATE || '').toUpperCase();
      return state.includes('MAHARASHTRA');
    });
    if (maharashtraFeatures.length > 0) {
      const unmatchedMH = maharashtraFeatures
        .filter(f => getDistrictData(f) === null)
        .map(f => ({
          geo_name: f.properties?.DISTRICT || f.properties?.dtname || f.properties?.district,
          all_props: Object.fromEntries(
            Object.entries(f.properties || {}).filter(([k]) =>
              ['DISTRICT', 'dtname', 'district', 'NAME_2', 'District_N', 'DIST_NAME', 'ST_NM', 'state'].includes(k)
            )
          ),
        }));
      if (unmatchedMH.length > 0) {
        console.warn('🔴 UNMATCHED Maharashtra districts:', unmatchedMH);
      } else {
        console.log('✅ All Maharashtra districts matched!');
      }
    }
  }, [geojsonData, districts, selectedState, getDistrictData]);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="flex-1 relative">
      <MapContainer
        center={[22.5, 82]}
        zoom={5}
        className="w-full h-full"
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        <MapBoundsUpdater districts={allMarkers} />
        {selectedDistrict && <SelectedHighlighter district={selectedDistrict} />}

        {/* GeoJSON choropleth — polygons only, NO circle markers */}
        {geojsonData?.features?.length > 0 && (
          <GeoJSON
            key={geoKey}
            data={geojsonData}
            style={districtStyle}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>

      {/* Hover Info Box */}
      {hoveredDistrict && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg px-3 py-2 shadow-md border border-border z-[1000]">
          <div className="text-xs font-bold text-gov-navy">{hoveredDistrict.name}</div>
          <div className="text-xs text-text-muted">
            Severity: <span className="font-bold font-[family-name:var(--font-data)]" style={{ color: getSeverityColor(hoveredDistrict.severity) }}>
              {hoveredDistrict.severity?.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg p-3 shadow-md border border-border z-[1000]">
        <div className="text-[10px] font-bold text-gov-navy mb-2 uppercase tracking-wider">Severity</div>
        {[
          { color: '#dc2626', label: 'Critical (7+)' },
          { color: '#ea580c', label: 'High (5–7)' },
          { color: '#ca8a04', label: 'Medium (3–5)' },
          { color: '#16a34a', label: 'Low (0–3)' },
          { color: '#cbd5e1', label: 'No data' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: item.color }} />
            <span className="text-[10px] text-text-muted">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
