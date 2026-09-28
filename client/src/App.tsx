import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import StaffRoute from "./components/StaffRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SecretaryList from "./pages/SecretaryList";
import Accounts from "./pages/Accounts";
import AuditLogs from "./pages/AuditLogs";
import Reports from "./pages/Reports";
import Officers from "./pages/Officers";
import MyProfile from "./pages/MyProfile";
import Documents from "./pages/Documents";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/me" element={<MyProfile />} />
          <Route element={<StaffRoute />}>
            <Route path="/secretaries" element={<SecretaryList />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/officers" element={<Officers />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
