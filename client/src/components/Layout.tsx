import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ChangePasswordModal from "./ChangePasswordModal";

const CRUMBS: Record<string, string> = {
  "/": "TRANG CHỦ",
  "/secretaries": "BAN CHẤP HÀNH ĐOÀN CƠ SỞ",
  "/accounts": "QUẢN LÝ TÀI KHOẢN",
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
      <header className="flex h-16 items-center justify-between bg-[#08326b] px-4 text-white">
        <Link to="/" className="flex items-center gap-3">
          <svg width="44" height="46" viewBox="0 0 90 96" aria-hidden>
            <circle cx="45" cy="60" r="30" fill="#fff" stroke="#1b7a3a" strokeWidth="6" />
            <path d="M12 8c14-6 24 6 38 0s22 0 28-2v40c-6 2-14 2-28 2s-24-12-38-6z" fill="#d6141e" />
            <polygon points="45,14 49,26 62,26 52,33 56,45 45,38 34,45 38,33 28,26 41,26" fill="#ffd400" />
          </svg>
          <div className="text-[13px] font-bold uppercase leading-tight tracking-[0.12em]">
            Hệ thống nghiệp vụ công tác
            <br />
            Đoàn TNCS Hồ Chí Minh
          </div>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right leading-tight">
            <div>{user?.unit?.name ?? user?.username}</div>
            <div className="text-xs text-white/70">{user?.fullName}</div>
          </div>
          <button onClick={() => setPwOpen(true)} className="rounded border border-white/40 px-3 py-1 text-xs hover:bg-white/10">
            Đổi mật khẩu
          </button>
          <button onClick={handleLogout} className="rounded border border-white/40 px-3 py-1 text-xs hover:bg-white/10">
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
