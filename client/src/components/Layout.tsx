import { useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ChangePasswordModal from "./ChangePasswordModal";

interface MenuItem {
  to: string;
  label: string;
  end?: boolean;
}
interface MenuGroup {
  key: string;
  label: string;
  items: MenuItem[];
}

/** Cấu trúc menu ngang: mỗi nhóm là 1 mục trên thanh — 1 trang thì bấm thẳng, nhiều trang thì xổ xuống. */
function menuGroups(role?: string): MenuGroup[] {
  if (role === "SECRETARY") {
    return [
      {
        key: "overview",
        label: "Tổng quan",
        items: [
          { to: "/", label: "Trang chủ", end: true },
          { to: "/me", label: "Hồ sơ của tôi" },
        ],
      },
      {
        key: "members",
        label: "Công tác Đoàn viên",
        items: [
          { to: "/members", label: "Danh sách Đoàn viên" },
          { to: "/evaluations", label: "Đánh giá, xếp loại Đoàn viên" },
        ],
      },
      { key: "tools", label: "Công cụ", items: [{ to: "/ai-assistant", label: "Trợ lý AI soạn thảo" }] },
    ];
  }
  return [
    { key: "overview", label: "Tổng quan", items: [{ to: "/", label: "Trang chủ", end: true }] },
    {
      key: "members",
      label: "Công tác Đoàn viên",
      items: [
        { to: "/secretaries", label: "Ban chấp hành đoàn cơ sở" },
        { to: "/members", label: "Danh sách Đoàn viên" },
        { to: "/evaluations", label: "Đánh giá, xếp loại Đoàn viên" },
      ],
    },
    { key: "documents", label: "Văn bản", items: [{ to: "/documents", label: "Nhận công văn" }] },
    { key: "tools", label: "Công cụ", items: [{ to: "/ai-assistant", label: "Trợ lý AI soạn thảo" }] },
    {
      key: "admin",
      label: "Quản trị",
      items: [
        { to: "/accounts", label: "Quản lý tài khoản" },
        { to: "/officers", label: "Quản lý cán bộ cấp trên" },
      ],
    },
    {
      key: "reports",
      label: "Báo cáo",
      items: [
        { to: "/reports", label: "Báo cáo – Thống kê" },
        { to: "/audit-logs", label: "Nhật ký hoạt động" },
      ],
    },
  ];
}

const topCls = (active: boolean) =>
  `flex items-center gap-1.5 whitespace-nowrap px-3 py-4 text-[13px] uppercase ${
    active ? "border-b-2 border-[#1e88e5] text-[#1e88e5]" : "border-b-2 border-transparent text-slate-700 hover:text-[#1e88e5]"
  }`;
const subCls = ({ isActive }: { isActive: boolean }) =>
  `block px-4 py-2 text-[13px] uppercase hover:bg-slate-100 ${isActive ? "text-[#1e88e5]" : "text-slate-700"}`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [subPos, setSubPos] = useState<{ left: number; top: number } | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  // Thanh menu cuộn ngang được (overflow-x-auto) nên khung menu con phải định vị kiểu "fixed" theo
  // tọa độ tính tay từ nút bấm, thay vì "absolute" trong thanh — nếu không sẽ bị chính thanh menu
  // cắt mất theo chiều dọc (quy tắc CSS: 1 trục overflow khác "visible" thì trục kia cũng bị cắt theo).
  const openDropdown = (key: string) => {
    const btn = btnRefs.current[key];
    if (btn) {
      const r = btn.getBoundingClientRect();
      setSubPos({ left: r.left, top: r.bottom });
    }
    setOpenGroup(key);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const groups = menuGroups(user?.role);
  const isItemActive = (i: MenuItem) => pathname === i.to;
  const currentItem = groups.flatMap((g) => g.items).find(isItemActive);
  const currentGroup = currentItem ? groups.find((g) => g.items.includes(currentItem)) : undefined;

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
            <br />
            Xã Phú Cát
          </div>
          <div className="text-xs font-bold uppercase leading-tight tracking-wide sm:hidden">
            Công tác Đoàn Xã Phú Cát
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

      {/* Web/PC: thanh ngang 1 hàng, cuộn được khi tràn */}
      <nav className="hidden overflow-x-auto border-b bg-white px-4 sm:block">
        <ul className="flex flex-nowrap items-center">
          {groups.map((g) => {
            const active = g.items.some(isItemActive);
            if (g.items.length === 1) {
              const only = g.items[0];
              return (
                <li key={g.key}>
                  <NavLink to={only.to} end={only.end} className={() => topCls(active)}>
                    {g.label}
                  </NavLink>
                </li>
              );
            }
            return (
              <li key={g.key} onMouseLeave={() => setOpenGroup(null)}>
                <button
                  ref={(el) => { btnRefs.current[g.key] = el; }}
                  onMouseEnter={() => openDropdown(g.key)}
                  onClick={() => (openGroup === g.key ? setOpenGroup(null) : openDropdown(g.key))}
                  aria-expanded={openGroup === g.key}
                  className={topCls(active)}
                >
                  {g.label} <span className="text-[9px]">▼</span>
                </button>
                {openGroup === g.key && subPos && (
                  <div
                    style={{ position: "fixed", left: subPos.left, top: subPos.top }}
                    className="z-20 min-w-[260px] border bg-white shadow-lg"
                  >
                    {g.items.map((i) => (
                      <NavLink key={i.to} to={i.to} end={i.end} className={subCls} onClick={() => setOpenGroup(null)}>
                        {i.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile: nút hamburger, bấm ra menu trượt đè lên giao diện (kiểu Render) */}
      <div className="border-b bg-white sm:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 px-4 py-3 text-[13px] uppercase text-[#1e88e5]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="shrink-0">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
          <span>Menu</span>
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[82%] max-w-xs overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-[13px] font-bold uppercase text-[#1e88e5]">Menu</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Đóng" className="text-xl leading-none text-slate-500 hover:text-slate-800">
                ×
              </button>
            </div>
            <div className="pb-4">
              {groups.map((g) => (
                <div key={g.key}>
                  <div className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">{g.label}</div>
                  {g.items.map((i) => (
                    <NavLink key={i.to} to={i.to} end={i.end} className={subCls} onClick={() => setMobileOpen(false)}>
                      {i.label}
                    </NavLink>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-3 text-[13px] uppercase text-slate-700">
        {(currentGroup?.label ?? "").toUpperCase()} <span className="mx-1">/</span> {(currentItem?.label ?? "").toUpperCase()}
      </div>

      <main className="px-4 pb-8">
        <Outlet />
      </main>

      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  );
}
