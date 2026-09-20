import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";

const ACCENT = "#1890ff";

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

// Huy hiệu tượng trưng (cờ đỏ sao vàng trong vòng tròn xanh). Thay bằng logo chính thức bằng cách đặt file vào client/public.
function Emblem() {
  return (
    <svg width="90" height="96" viewBox="0 0 90 96" aria-hidden>
      <circle cx="45" cy="60" r="30" fill="#fff" stroke="#1b7a3a" strokeWidth="6" />
      <path d="M12 8c14-6 24 6 38 0s22 0 28-2v40c-6 2-14 2-28 2s-24-12-38-6z" fill="#d6141e" />
      <polygon
        points="45,14 49,26 62,26 52,33 56,45 45,38 34,45 38,33 28,26 41,26"
        fill="#ffd400"
      />
    </svg>
  );
}

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Vui lòng nhập tên đăng nhập và mật khẩu");
      return;
    }
    setSubmitting(true);
    try {
      await login({ username: username.trim(), password }, false);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Không thể kết nối máy chủ",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fieldCls = "flex h-8 items-center gap-2 rounded-sm border border-slate-300 bg-white px-2 text-slate-500 focus-within:border-[#40a9ff] focus-within:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const inputCls = "min-w-0 flex-1 bg-transparent text-[13px] text-slate-900 outline-none";

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-white">
      {/* Cột đăng nhập */}
      <div className="relative z-10 flex w-full flex-col items-center bg-white px-6 md:w-[500px] md:shrink-0">
        <div className="flex flex-1 flex-col items-center justify-center">
          <Emblem />
          <h1
            className="mt-2 text-center text-[15px] font-bold uppercase leading-tight"
            style={{ color: "#1a56c4" }}
          >
            Hệ thống nghiệp vụ công tác
            <br />
            Đoàn TNCS Hồ Chí Minh
          </h1>
        </div>

        <form onSubmit={onSubmit} noValidate className="w-full max-w-[400px] flex-[2]">
          <div className="mb-6 border-b border-slate-200">
            <span
              className="inline-block border-b-2 pb-2 text-[13px] uppercase"
              style={{ color: ACCENT, borderColor: ACCENT }}
            >
              Thông tin đăng nhập
            </span>
          </div>

          <div className={fieldCls}>
            <UserIcon />
            <input
              className={inputCls}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              aria-label="Tên đăng nhập"
              placeholder="Tên đăng nhập"
            />
          </div>

          <div className={fieldCls + " mt-5"}>
            <LockIcon />
            <input
              className={inputCls}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-label="Mật khẩu"
              placeholder="Mật khẩu"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-slate-500 hover:text-slate-800"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>

          {error && <div className="mt-4 rounded bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</div>}

          <div className="mt-5 text-center">
            <button
              type="submit"
              disabled={submitting}
              className="h-8 rounded-sm px-4 text-[13px] text-white hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </div>
        </form>
      </div>

      {/* Ảnh nền bên phải (thay bằng ảnh thật: đặt vào client/public/login-bg.jpg) */}
      <div
        className="relative hidden flex-1 md:block"
        style={{
          backgroundImage: "url(/login-bg.jpg), linear-gradient(135deg, #e6f4ff 0%, #b7defa 55%, #5bb5f0 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <svg className="absolute left-0 top-0 h-56 w-[60%]" viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden>
          <path d="M0 0h420C330 20 250 130 0 200z" fill="#1e88e5" opacity="0.9" />
          <path d="M0 0h300C220 20 140 90 0 130z" fill="#1a56c4" opacity="0.9" />
        </svg>
      </div>

      {/* Sóng xanh dưới chân trang */}
      <svg
        className="pointer-events-none absolute bottom-0 left-0 z-20 h-24 w-full"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d="M0 60C160 20 300 20 420 60S700 110 1000 70 1300 20 1440 50V120H0z" fill="#00a8f0" />
        <path d="M0 95C200 60 380 80 520 100S900 110 1150 85 1350 70 1440 85V120H0z" fill="#1e88e5" />
      </svg>
    </div>
  );
}
