import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ChangePasswordModal from "./ChangePasswordModal";

const CRUMBS: Record<string, string> = {
  "/": "TRANG CHỦ",
  "/secretaries": "BAN CHẤP HÀNH ĐOÀN CƠ SỞ",
  "/accounts": "QUẢN LÝ TÀI KHOẢN",
  "/officers": "QUẢN LÝ CÁN BỘ CẤP TRÊN",
  "/reports": "BÁO CÁO – THỐNG KÊ",
  "/audit-logs": "NHẬT KÝ HOẠT ĐỘNG",
};

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `block px-4 py-2 text-[13px] uppercase hover:bg-slate-100 ${isActive ? "text-[#1e88e5]" : "text-slate-700"}`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f0f0f5]">
      <header className="flex min-h-16 items-center justify-between gap-2 bg-[#08326b] px-3 py-2 text-white sm:px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-[36px] w-[34px] shrink-0 object-contain sm:h-[46px] sm:w-[44px]"
          />
          <div className="hidden text-[13px] font-bold uppercase leading-tight tracking-[0.12em] sm:block">
            Hệ thống nghiệp vụ công tác
            <br />
            Đoàn TNCS Hồ Chí Minh
          </div>
          <div className="text-xs font-bold uppercase leading-tight tracking-wide sm:hidden">
            Công tác Đoàn
            <br />
            TNCS Hồ Chí Minh
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-2 text-sm sm:gap-4">
          <div className="hidden text-right leading-tight md:block">
            <div>{user?.unit?.name ?? user?.username}</div>
            <div className="text-xs text-white/70">{user?.fullName}</div>
          </div>
          <button
            onClick={() => setPwOpen(true)}
            className="whitespace-nowrap rounded border border-white/40 px-2 py-1 text-xs hover:bg-white/10 sm:px-3"
          >
            <span className="sm:hidden">Mật khẩu</span>
            <span className="hidden sm:inline">Đổi mật khẩu</span>
          </button>
          <button
            onClick={handleLogout}
            className="whitespace-nowrap rounded border border-white/40 px-2 py-1 text-xs hover:bg-white/10 sm:px-3"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <nav className="border-b bg-white px-4">
        <ul className="flex items-center">
          <li className="relative" onMouseLeave={() => setMenuOpen(false)}>
            <button
              onMouseEnter={() => setMenuOpen(true)}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              className="flex items-center gap-1.5 border-b-2 border-[#1e88e5] px-3 py-4 text-[13px] uppercase text-[#1e88e5]"
            >
              Thông tin chung <span className="text-[9px]">▼</span>
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-full z-20 min-w-[260px] border bg-white shadow-lg">
                <NavLink to="/" end className={linkCls} onClick={() => setMenuOpen(false)}>
                  Trang chủ
                </NavLink>
                <NavLink to="/secretaries" className={linkCls} onClick={() => setMenuOpen(false)}>
                  Ban chấp hành đoàn cơ sở
                </NavLink>
                <NavLink to="/accounts" className={linkCls} onClick={() => setMenuOpen(false)}>
                  Quản lý tài khoản
                </NavLink>
                <NavLink to="/officers" className={linkCls} onClick={() => setMenuOpen(false)}>
                  Quản lý cán bộ cấp trên
                </NavLink>
                <NavLink to="/reports" className={linkCls} onClick={() => setMenuOpen(false)}>
                  Báo cáo – Thống kê
                </NavLink>
                <NavLink to="/audit-logs" className={linkCls} onClick={() => setMenuOpen(false)}>
                  Nhật ký hoạt động
                </NavLink>
              </div>
            )}
          </li>
        </ul>
      </nav>

      <div className="px-4 py-3 text-[13px] uppercase text-slate-700">
        THÔNG TIN CHUNG <span className="mx-1">/</span> {CRUMBS[pathname] ?? ""}
      </div>

      <main className="px-4 pb-8">
        <Outlet />
      </main>

      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  );
}
