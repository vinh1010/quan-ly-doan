import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseApiError } from "../api/secretaries";
import { fetchAccounts, setAccountStatus, type Account } from "../api/system";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { ACCOUNT_STATUS_LABEL, POSITION_LABEL, formatDate } from "../lib/constants";

const PAGE_SIZE = 10;
const HEAD = "border border-white/30 px-3 py-2 text-center text-[13px] font-medium";
const CELL = "px-3 py-3 text-[13px]";
const field =
  "mt-1 w-full border-0 border-b border-slate-300 bg-transparent py-1 text-sm outline-none focus:border-[#1890ff]";

export default function Accounts() {
  const toast = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ search: "", status: "" });
  const [applied, setApplied] = useState({ search: "", status: "", page: 1 });
  const [target, setTarget] = useState<Account | null>(null);

  const list = useQuery({
    queryKey: ["accounts", applied],
    queryFn: () => fetchAccounts({ ...applied, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const toggle = useMutation({
    mutationFn: (a: Account) => setAccountStatus(a.id, a.status === "ACTIVE" ? "LOCKED" : "ACTIVE"),
    onSuccess: (r) => {
      toast("success", r.message);
      setTarget(null);
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["secretaries"] });
    },
    onError: (err) => {
      toast("error", parseApiError(err).message);
      setTarget(null);
    },
  });

  const search = (e: FormEvent) => {
    e.preventDefault();
    setApplied({ ...draft, page: 1 });
  };
  const reset = () => {
    setDraft({ search: "", status: "" });
    setApplied({ search: "", status: "", page: 1 });
  };

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const locking = target?.status === "ACTIVE";

  return (
    <div className="bg-white shadow-sm">
      <h1 className="border-b px-4 py-4 text-2xl font-light text-slate-800 sm:px-9">Quản lý tài khoản</h1>

      <form onSubmit={search} className="flex flex-wrap items-end gap-4 px-4 pt-5 sm:px-[43px]">
        <label className="min-w-[220px] flex-1 text-xs text-slate-500">
          Tên đăng nhập / họ tên
          <input className={field} value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} />
        </label>
        <label className="w-44 text-xs text-slate-500">
          Trạng thái
          <select className={field} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option value="">Tất cả</option>
            <option value="ACTIVE">{ACCOUNT_STATUS_LABEL.ACTIVE}</option>
            <option value="LOCKED">{ACCOUNT_STATUS_LABEL.LOCKED}</option>
          </select>
        </label>
        <button type="submit" className="w-28 rounded-sm bg-[#3d7ebf] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
          Tìm kiếm
        </button>
        <button type="button" onClick={reset} className="w-28 rounded-sm bg-[#a5a5a5] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
          Làm mới
        </button>
      </form>

      <div className="overflow-x-auto px-4 py-5 sm:px-[43px]">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead className="bg-[#2260cf] text-white">
            <tr>
              <th className={HEAD + " w-10"}>#</th>
              <th className={HEAD + " text-left"}>Tên đăng nhập</th>
              <th className={HEAD + " text-left"}>Họ và tên</th>
              <th className={HEAD}>Đơn vị</th>
              <th className={HEAD}>Chức vụ</th>
              <th className={HEAD}>Đăng nhập gần nhất</th>
              <th className={HEAD}>Trạng thái</th>
              <th className={HEAD + " w-32"}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a, idx) => (
              <tr key={a.id} className="border-b hover:bg-slate-50">
                <td className={CELL + " text-center"}>{(applied.page - 1) * PAGE_SIZE + idx + 1}</td>
                <td className={CELL + " font-medium"}>{a.username}</td>
                <td className={CELL}>{a.fullName}</td>
                <td className={CELL + " text-center"}>{a.unit?.name}</td>
                <td className={CELL + " text-center"}>{a.secretary ? POSITION_LABEL[a.secretary.position] : ""}</td>
                <td className={CELL + " text-center"}>{a.lastLoginAt ? formatDate(a.lastLoginAt) : "Chưa đăng nhập"}</td>
                <td className={CELL + " text-center"}>
                  <span className={a.status === "ACTIVE" ? "text-green-700" : "text-red-600"}>
                    {ACCOUNT_STATUS_LABEL[a.status]}
                  </span>
                </td>
                <td className={CELL + " text-center"}>
                  <button
                    onClick={() => setTarget(a)}
                    disabled={a.status === "LOCKED" && !!a.secretary?.deletedAt}
                    title={a.secretary?.deletedAt ? "Hồ sơ đã bị xóa" : undefined}
                    className="rounded-sm bg-[#1e88e5] px-3 py-1.5 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-40"
                  >
                    {a.status === "ACTIVE" ? "Khóa" : "Kích hoạt"}
                  </button>
                </td>
              </tr>
            ))}
            {!list.isFetching && items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  {list.isError ? "Không thể tải dữ liệu" : "Không tìm thấy kết quả"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <span>{list.isFetching ? "Đang tải..." : `Tổng ${total} tài khoản · Trang ${applied.page}/${pages}`}</span>
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

      {target && (
        <ConfirmDialog
          title={locking ? "Bạn có chắc chắn khóa tài khoản ?" : "Bạn có chắc chắn kích hoạt tài khoản ?"}
          busy={toggle.isPending}
          onCancel={() => setTarget(null)}
          onConfirm={() => toggle.mutate(target)}
        >
          <p className="font-medium text-slate-800">{target.username}</p>
          <p>{target.fullName}</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
