import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import CreateEvent from './pages/CreateEvent';
import EventList from './pages/EventList';
import EventDetails from './pages/EventDetails';
import MyRegistrations from './pages/MyRegistrations';
import MyProfile from './pages/MyProfile';
import QRScanner from './pages/QRScanner';
import ManageParticipants from './pages/ManageParticipants';
import EventReports from './pages/EventReports';
import ManageEvents from './pages/ManageEvents';
import AuditLogs from './pages/AuditLogs';
import CreditsRules from './pages/CreditsRules';
import UserManagement from './pages/UserManagement';
import EventApprovals from './pages/EventApprovals';
import AdminReports from './pages/AdminReports';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:resetToken" element={<ResetPassword />} />
              <Route path="/verify-email/:verificationToken" element={<VerifyEmail />} />
              <Route path="/create-event" element={<CreateEvent />} />
              <Route path="/events" element={<EventList />} />
              <Route path="/events/:id" element={<EventDetails />} />
              <Route path="/my-activities" element={<MyRegistrations />} />
              <Route path="/profile" element={<MyProfile />} />
              <Route path="/scan-qr" element={<QRScanner />} />
              <Route path="/coordinator/manage-participants" element={<ManageParticipants />} />
              <Route path="/coordinator/manage-events" element={<ManageEvents />} />
              <Route path="/coordinator/reports" element={<EventReports />} />
              <Route path="/admin/credits" element={<CreditsRules />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/approvals" element={<EventApprovals />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/" element={<Dashboard />} />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
