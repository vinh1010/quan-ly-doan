import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Đang tải...</div>;
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}
