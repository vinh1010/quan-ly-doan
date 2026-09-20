import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div className="bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-light text-slate-800">Trang chủ</h1>
      <p className="mt-3 text-slate-600">
        Xin chào <b>{user?.fullName ?? user?.username}</b>
        {user?.unit && <> — {user.unit.name}</>}.
      </p>
      <Link
        to="/secretaries"
        className="mt-4 inline-block rounded-sm bg-[#3d7ebf] px-4 py-2 text-xs font-bold uppercase text-white hover:opacity-90"
      >
        Ban chấp hành đoàn cơ sở
      </Link>
    </div>
  );
}
