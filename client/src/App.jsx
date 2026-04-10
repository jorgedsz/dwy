import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import AppLayout from './components/Layout/AppLayout';
import DashboardPage from './components/Dashboard/DashboardPage';
import ClientsListPage from './components/Clients/ClientsListPage';
import ClientDetailPage from './components/Clients/ClientDetailPage';
import SessionDetailPage from './components/Sessions/SessionDetailPage';
import WhatsAppPage from './components/WhatsApp/WhatsAppPage';
import MeetingsPage from './components/Meetings/MeetingsPage';
import AgentsPage from './components/Dashboard/AgentsPage';
import AgentEdit from './components/Dashboard/AgentEdit';
import TelephonySetup from './components/Dashboard/TelephonySetup';
import PhoneNumbers from './components/Dashboard/PhoneNumbers';
import ClientPortalPage from './components/Portal/ClientPortalPage';
import SessionPortalPage from './components/Portal/SessionPortalPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/portal/:token" element={<ClientPortalPage />} />
      <Route path="/portal/:token/sessions/:sessionId" element={<SessionPortalPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="clients" element={<ClientsListPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="sessions/:id" element={<SessionDetailPage />} />
        <Route path="meetings" element={<MeetingsPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="agents/:id" element={<AgentEdit />} />
        <Route path="phone-setup" element={<TelephonySetup />} />
        <Route path="phone-numbers" element={<PhoneNumbers />} />
        <Route path="whatsapp" element={<WhatsAppPage />} />
      </Route>
    </Routes>
  );
}

export default App;
