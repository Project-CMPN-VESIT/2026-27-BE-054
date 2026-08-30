import { create } from 'zustand';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

const useFloodStore = create((set, get) => ({
  // ── State ─────────────────────────────────
  selectedState: null,
  states: [],
  districts: [],
  stateSummary: null,
  priorityData: null,
  resourceData: null,
  alertsData: null,
  geojsonData: null,
  weatherCache: {},
  bulkWeather: null,
  selectedDistrict: null,
  weatherApiStatus: null,
  routeResult: null,
  lastRefresh: null,
  loading: {
    states: false, districts: false, priority: false,
    resources: false, alerts: false, weather: false,
    dashboard: false, route: false,
  },
  error: null,

  // ── Actions ───────────────────────────────
  fetchStates: async () => {
    set(s => ({ loading: { ...s.loading, states: true } }));
    try {
      const { data } = await api.get('/states');
      set({ states: data.states, loading: { ...get().loading, states: false } });
    } catch (e) {
      set({ error: e.message, loading: { ...get().loading, states: false } });
    }
  },

  selectState: async (stateName) => {
    set(s => ({
      selectedState: stateName,
      selectedDistrict: null,
      districts: [],
      stateSummary: null,
      priorityData: null,
      resourceData: null,
      alertsData: null,
      geojsonData: null,
      bulkWeather: null,
      loading: { ...s.loading, dashboard: true },
    }));

    try {
      // Single unified dashboard call
      const [dashRes] = await Promise.all([
        api.get(`/dashboard/${encodeURIComponent(stateName)}`),
      ]);

      const d = dashRes.data;
      set(s => ({
        districts: d.districts,
        stateSummary: d.summary,
        priorityData: d.priorities,
        resourceData: d.resources,
        alertsData: d.alerts,
        weatherApiStatus: d.weather_status,
        lastRefresh: new Date(),
        loading: { ...s.loading, dashboard: false, districts: false, priority: false, resources: false, alerts: false },
      }));

      // Fetch GeoJSON separately (large payload, cached)
      get().fetchGeoJSON(stateName);
    } catch (e) {
      set(s => ({
        error: e.message,
        loading: { ...s.loading, dashboard: false, districts: false, priority: false, resources: false, alerts: false },
      }));
    }
  },

  fetchPriority: async (stateName) => {
    set(s => ({ loading: { ...s.loading, priority: true } }));
    try {
      const { data } = await api.get(`/priority/${encodeURIComponent(stateName)}`);
      set(s => ({ priorityData: data, loading: { ...s.loading, priority: false }, lastRefresh: new Date() }));
    } catch (e) {
      set(s => ({ loading: { ...s.loading, priority: false } }));
    }
  },

  fetchResources: async (stateName) => {
    set(s => ({ loading: { ...s.loading, resources: true } }));
    try {
      const { data } = await api.get(`/resources/${encodeURIComponent(stateName)}`);
      set(s => ({ resourceData: data, loading: { ...s.loading, resources: false } }));
    } catch (e) {
      set(s => ({ loading: { ...s.loading, resources: false } }));
    }
  },

  fetchAlerts: async (stateName) => {
    set(s => ({ loading: { ...s.loading, alerts: true } }));
    try {
      const { data } = await api.get(`/alerts?state=${encodeURIComponent(stateName)}`);
      set(s => ({ alertsData: data, loading: { ...s.loading, alerts: false } }));
    } catch (e) {
      set(s => ({ loading: { ...s.loading, alerts: false } }));
    }
  },

  fetchGeoJSON: async (stateName) => {
    try {
      const { data } = await api.get(`/geojson/${encodeURIComponent(stateName)}`);
      set({ geojsonData: data });
    } catch (e) {
      console.warn('[GeoJSON] Failed to load boundaries:', e.message);
      set({ geojsonData: null });
    }
  },

  fetchWeather: async (district) => {
    const key = district.district;
    set(s => ({ loading: { ...s.loading, weather: true } }));
    try {
      const { data } = await api.get(
        `/weather/district/${encodeURIComponent(key)}?lat=${district.latitude}&lon=${district.longitude}`
      );
      set(s => ({
        weatherCache: { ...s.weatherCache, [key]: data },
        loading: { ...s.loading, weather: false },
      }));
      return data;
    } catch (e) {
      set(s => ({ loading: { ...s.loading, weather: false } }));
      return null;
    }
  },

  fetchWeatherBulk: async (stateName) => {
    set(s => ({ loading: { ...s.loading, weather: true }, error: null }));
    try {
      const { data } = await api.get(
        `/weather/bulk?state=${encodeURIComponent(stateName)}`,
        { timeout: 30000 }
      );
      set(s => ({
        bulkWeather: data,
        weatherApiStatus: data.weather_status,
        loading: { ...s.loading, weather: false },
      }));
      return data;
    } catch (e) {
      set(s => ({
        loading: { ...s.loading, weather: false },
        error: e?.message || 'Failed to load weather data',
      }));
      return null;
    }
  },

  fetchWeatherStatus: async () => {
    try {
      const { data } = await api.get('/weather/status');
      set({ weatherApiStatus: data.status });
      return data;
    } catch (e) {
      return null;
    }
  },

  computeRoute: async (fromPoint, toPoint, teamSize = 5, vehicleType = 'truck', affectedPop = 10000) => {
    set(s => ({ loading: { ...s.loading, route: true } }));
    try {
      const { data } = await api.post('/route', {
        from_point: fromPoint,
        to_point: toPoint,
        vehicle_type: vehicleType,
        team_size: teamSize,
        affected_pop: affectedPop,
      });
      set(s => ({ routeResult: data.route, loading: { ...s.loading, route: false } }));
      return data.route;
    } catch (e) {
      set(s => ({ loading: { ...s.loading, route: false } }));
      return null;
    }
  },

  selectDistrict: (district) => set({ selectedDistrict: district }),

  refreshAll: async () => {
    const state = get().selectedState;
    if (state) {
      await get().selectState(state);
    }
  },

  clearState: () => set({
    selectedState: null, districts: [], stateSummary: null,
    priorityData: null, resourceData: null, alertsData: null,
    selectedDistrict: null, weatherCache: {}, geojsonData: null,
    bulkWeather: null, routeResult: null, weatherApiStatus: null,
  }),
}));

export default useFloodStore;
