import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SecretaryList from "./pages/SecretaryList";
import Accounts from "./pages/Accounts";
import AuditLogs from "./pages/AuditLogs";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/secretaries" element={<SecretaryList />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          {/* TODO: /reports */}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
