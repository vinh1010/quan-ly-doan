import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "../api/system";
import { useAuth } from "../hooks/useAuth";

const PAGE_SIZE = 20;
const HEAD = "border border-white/30 px-3 py-2 text-center text-[13px] font-medium";
const CELL = "px-3 py-2.5 text-[13px]";
const field =
  "mt-1 w-full border-0 border-b border-slate-300 bg-transparent py-1 text-sm outline-none focus:border-[#1890ff]";

const ACTION_LABEL: Record<string, string> = {
  LOGIN: "Đăng nhập",
  LOGOUT: "Đăng xuất",
  CHANGE_PASSWORD: "Đổi mật khẩu",
  CREATE: "Thêm mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  VIEW: "Xem chi tiết",
  SEARCH: "Tìm kiếm",
  EXPORT: "Xuất dữ liệu",
  LOCK_ACCOUNT: "Khóa tài khoản",
  UNLOCK_ACCOUNT: "Kích hoạt tài khoản",
};

const formatDateTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { hour12: false });

export default function AuditLogs() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [draft, setDraft] = useState({ action: "", search: "", from: "", to: "" });
  const [applied, setApplied] = useState({ ...draft, page: 1 });

  const list = useQuery({
    queryKey: ["audit-logs", applied],
    queryFn: () => fetchAuditLogs({ ...applied, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const search = (e: FormEvent) => {
    e.preventDefault();
    setApplied({ ...draft, page: 1 });
  };
  const reset = () => {
    const empty = { action: "", search: "", from: "", to: "" };
    setDraft(empty);
    setApplied({ ...empty, page: 1 });
  };

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="bg-white shadow-sm">
      <h1 className="border-b px-4 py-4 text-2xl font-light text-slate-800 sm:px-9">Nhật ký hoạt động</h1>
      {!isAdmin && <p className="px-4 pt-3 text-xs text-slate-500 sm:px-[43px]">Chỉ hiển thị các thao tác của bạn.</p>}

      <form onSubmit={search} className="grid gap-x-6 gap-y-3 px-4 pt-4 sm:grid-cols-2 sm:px-[43px] lg:grid-cols-5">
        <label className="text-xs text-slate-500">
          Thao tác
          <select className={field} value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })}>
            <option value="">Tất cả</option>
            {Object.entries(ACTION_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {isAdmin && (
          <label className="text-xs text-slate-500">
            Người thực hiện
            <input className={field} value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} />
          </label>
        )}
        <label className="text-xs text-slate-500">
          Từ ngày
          <input type="date" className={field} value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        </label>
        <label className="text-xs text-slate-500">
          Đến ngày
          <input type="date" className={field} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        </label>
        <div className="flex items-end gap-3">
          <button type="submit" className="w-28 rounded-sm bg-[#3d7ebf] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
            Tìm kiếm
          </button>
          <button type="button" onClick={reset} className="w-28 rounded-sm bg-[#a5a5a5] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
            Làm mới
          </button>
        </div>
      </form>

      <div className="overflow-x-auto px-4 py-5 sm:px-[43px]">
        {/* Điện thoại / máy tính bảng: dạng thẻ */}
        <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
          {items.map((l) => (
            <div key={l.id} className="rounded border border-slate-200 p-3 text-[13px]">
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold">{ACTION_LABEL[l.action] ?? l.action}</span>
                <span className="shrink-0 text-xs text-slate-500">{formatDateTime(l.createdAt)}</span>
              </div>
              <div className="mt-1 text-slate-600">
                {l.user.fullName ? `${l.user.fullName} (${l.user.username})` : l.user.username}
              </div>
              <div className="text-slate-500">
                {l.target}
                {l.targetId ? ` #${l.targetId}` : ""}
                {l.ip ? ` · ${l.ip}` : ""}
              </div>
            </div>
          ))}
          {!list.isFetching && items.length === 0 && (
            <p className="py-8 text-center text-slate-500 sm:col-span-2">
              {list.isError ? "Không thể tải dữ liệu" : "Không có nhật ký nào"}
            </p>
          )}
        </div>

        <table className="hidden w-full border-collapse text-left lg:table">
          <thead className="bg-[#2260cf] text-white">
            <tr>
              <th className={HEAD}>Thời gian</th>
              <th className={HEAD}>Người thực hiện</th>
              <th className={HEAD}>Thao tác</th>
              <th className={HEAD}>Đối tượng</th>
              <th className={HEAD}>IP</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} className="border-b hover:bg-slate-50">
                <td className={CELL + " whitespace-nowrap text-center"}>{formatDateTime(l.createdAt)}</td>
                <td className={CELL}>{l.user.fullName ? `${l.user.fullName} (${l.user.username})` : l.user.username}</td>
                <td className={CELL + " text-center"}>{ACTION_LABEL[l.action] ?? l.action}</td>
                <td className={CELL + " text-center"}>
                  {l.target}
                  {l.targetId ? ` #${l.targetId}` : ""}
                </td>
                <td className={CELL + " text-center"}>{l.ip}</td>
              </tr>
            ))}
            {!list.isFetching && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  {list.isError ? "Không thể tải dữ liệu" : "Không có nhật ký nào"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>{list.isFetching ? "Đang tải..." : `Tổng ${total} bản ghi · Trang ${applied.page}/${pages}`}</span>
          <div className="flex gap-2">
            <button
              disabled={applied.page <= 1}
              onClick={() => setApplied({ ...applied, page: applied.page - 1 })}
              className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40"
            >
              Trước
            </button>
            <button
              disabled={applied.page >= pages}
              onClick={() => setApplied({ ...applied, page: applied.page + 1 })}
              className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
