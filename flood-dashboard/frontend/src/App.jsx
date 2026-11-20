import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useFloodStore from './store/floodStore';
import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';
import StateSelector from './components/panels/StateSelector';
import DashboardPage from './pages/DashboardPage';
import WeatherPage from './pages/WeatherPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ResourcesPage from './pages/ResourcesPage';
import RoutingPage from './pages/RoutingPage';
import AlertsPage from './pages/AlertsPage';
import ReportsPage from './pages/ReportsPage';

export default function App() {
  const { selectedState, fetchStates } = useFloodStore();

  useEffect(() => {
    fetchStates();
  }, [fetchStates]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (!selectedState) return;
    const interval = setInterval(() => {
      useFloodStore.getState().refreshAll();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedState]);

  // Show state selector when no state selected
  if (!selectedState) {
    return <StateSelector />;
  }

  return (
    <div className="h-screen flex flex-col bg-bg-primary overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/weather" element={<WeatherPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/routing" element={<RoutingPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
