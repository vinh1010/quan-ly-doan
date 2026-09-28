import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * Chặn vai trò SECRETARY khỏi các trang chỉ dành cho cán bộ Đoàn cấp trên (ADMIN/SUPERIOR).
 * Dùng thêm ở client vì server đã chặn qua requireRole — tránh việc bấm nhầm link/gõ thẳng URL
 * rồi gặp lỗi 403 khó hiểu.
 */
export default function StaffRoute() {
  const { user } = useAuth();
  if (user?.role === "SECRETARY") return <Navigate to="/" replace />;
  return <Outlet />;
}
