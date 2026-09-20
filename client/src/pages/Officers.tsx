import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUnits, parseApiError } from "../api/secretaries";
import {
  createOfficer,
  fetchOfficers,
  resetOfficerPassword,
  setOfficerStatus,
  type Officer,
  type OfficerInput,
} from "../api/system";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";
import { ACCOUNT_STATUS_LABEL, formatDate } from "../lib/constants";

const PAGE_SIZE = 10;
const HEAD = "border border-white/30 px-3 py-2 text-center text-[13px] font-medium";
const CELL = "px-3 py-3 text-[13px]";
const field =
  "mt-1 w-full border-0 border-b border-slate-300 bg-transparent py-1 text-sm outline-none focus:border-[#1890ff]";

const ROLE_LABEL = { ADMIN: "Quản trị hệ thống", SUPERIOR: "Cán bộ cấp trên" } as const;
const LEVEL_LABEL: Record<string, string> = {
  TINH: "Tỉnh", HUYEN: "Huyện", XA_PHUONG: "Xã/Phường", CO_SO: "Cơ sở", CHI_DOAN: "Chi đoàn",
};
const EMPTY: OfficerInput = { username: "", fullName: "", email: "", role: "SUPERIOR", unitId: "", password: "", confirmPassword: "" };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="my-6 w-full max-w-md rounded bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-xl leading-none text-slate-500 hover:text-slate-800" aria-label="Đóng">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Err({ text }: { text?: string }) {
  return text ? <span className="mt-0.5 block text-xs text-red-600">{text}</span> : null;
}

function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [form, setForm] = useState<OfficerInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const units = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const unitOptions = (units.data ?? []).filter((u) => u.level !== "CHI_DOAN");

  const create = useMutation({
    mutationFn: () => createOfficer(form),
    onSuccess: (r) => {
      toast("success", r.message);
      onDone();
    },
    onError: (err) => {
      const e = parseApiError(err);
      setErrors(e.fields);
      if (Object.keys(e.fields).length === 0) toast("error", e.message);
    },
  });

  const set = (k: keyof OfficerInput) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    create.mutate();
  };

  return (
    <Modal title="Thêm tài khoản cán bộ cấp trên" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-3">
        {isAdmin && (
          <label className="block text-xs text-slate-500">
            Vai trò
            <select className={field} value={form.role} onChange={set("role")}>
              <option value="SUPERIOR">{ROLE_LABEL.SUPERIOR}</option>
              <option value="ADMIN">{ROLE_LABEL.ADMIN}</option>
            </select>
            <Err text={errors.role} />
          </label>
        )}
        <label className="block text-xs text-slate-500">
          Đơn vị {form.role === "SUPERIOR" && <span className="text-red-500">*</span>}
          <select className={field} value={form.unitId} onChange={set("unitId")}>
            <option value="">{form.role === "ADMIN" ? "— Không giới hạn —" : "— Chọn đơn vị —"}</option>
            {unitOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({LEVEL_LABEL[u.level] ?? u.level})
              </option>
            ))}
          </select>
          <Err text={errors.unitId} />
        </label>
        <label className="block text-xs text-slate-500">
          Họ và tên <span className="text-red-500">*</span>
          <input className={field} value={form.fullName} onChange={set("fullName")} />
          <Err text={errors.fullName} />
        </label>
        <label className="block text-xs text-slate-500">
          Email
          <input className={field} type="email" value={form.email} onChange={set("email")} />
          <Err text={errors.email} />
        </label>
        <label className="block text-xs text-slate-500">
          Tên đăng nhập <span className="text-red-500">*</span>
          <input className={field} autoComplete="off" value={form.username} onChange={set("username")} />
          <Err text={errors.username} />
        </label>
        <label className="block text-xs text-slate-500">
          Mật khẩu <span className="text-red-500">*</span>
          <input className={field} type="password" autoComplete="new-password" value={form.password} onChange={set("password")} />
          <Err text={errors.password} />
        </label>
        <label className="block text-xs text-slate-500">
          Xác nhận mật khẩu <span className="text-red-500">*</span>
          <input className={field} type="password" autoComplete="new-password" value={form.confirmPassword} onChange={set("confirmPassword")} />
          <Err text={errors.confirmPassword} />
        </label>
        <p className="text-xs text-slate-400">Mật khẩu tối thiểu 6 ký tự, gồm cả chữ và số.</p>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={create.isPending} className="w-28 rounded-sm bg-[#a5a5a5] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
            Hủy
          </button>
          <button type="submit" disabled={create.isPending} className="w-28 rounded-sm bg-[#3d7ebf] py-2 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-60">
            {create.isPending ? "Đang lưu..." : "Tạo"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ResetModal({ officer, onClose }: { officer: Officer; onClose: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = useMutation({
    mutationFn: () => resetOfficerPassword(officer.id, password, confirm),
    onSuccess: (r) => {
      toast("success", r.message);
      onClose();
    },
    onError: (err) => {
      const e = parseApiError(err);
      setErrors(e.fields);
      if (Object.keys(e.fields).length === 0) toast("error", e.message);
    },
  });

  return (
    <Modal title="Đặt lại mật khẩu" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setErrors({});
          reset.mutate();
        }}
        noValidate
        className="space-y-3"
      >
        <p className="text-sm text-slate-600">
          Tài khoản <b>{officer.username}</b>. Mọi phiên đăng nhập cũ của tài khoản này sẽ bị đăng xuất.
        </p>
        <label className="block text-xs text-slate-500">
          Mật khẩu mới
          <input className={field} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Err text={errors.password} />
        </label>
        <label className="block text-xs text-slate-500">
          Xác nhận mật khẩu
          <input className={field} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Err text={errors.confirmPassword} />
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={reset.isPending} className="w-28 rounded-sm bg-[#a5a5a5] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
            Hủy
          </button>
          <button type="submit" disabled={reset.isPending} className="w-28 rounded-sm bg-[#3d7ebf] py-2 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-60">
            {reset.isPending ? "Đang lưu..." : "Đặt lại"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Officers() {
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [draft, setDraft] = useState({ search: "", status: "" });
  const [applied, setApplied] = useState({ search: "", status: "", page: 1 });
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<Officer | null>(null);
  const [target, setTarget] = useState<Officer | null>(null);

  const list = useQuery({
    queryKey: ["officers", applied],
    queryFn: () => fetchOfficers({ ...applied, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["officers"] });

  const toggle = useMutation({
    mutationFn: (o: Officer) => setOfficerStatus(o.id, o.status === "ACTIVE" ? "LOCKED" : "ACTIVE"),
    onSuccess: (r) => {
      toast("success", r.message);
      setTarget(null);
      refresh();
    },
    onError: (err) => {
      toast("error", parseApiError(err).message);
      setTarget(null);
    },
  });

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const unitText = (o: Officer) => (o.unit ? `${o.unit.name} (${LEVEL_LABEL[o.unit.level] ?? o.unit.level})` : "Toàn hệ thống");

  const actions = (o: Officer, block = false) => {
    const self = o.id === user?.id;
    const btn = "rounded-sm px-3 py-1.5 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-40 " + (block ? "flex-1 py-2 " : "");
    return (
      <div className={block ? "mt-3 flex gap-2" : "flex justify-center gap-2"}>
        <button onClick={() => setResetting(o)} disabled={self} title={self ? "Dùng nút Đổi mật khẩu ở thanh trên" : undefined} className={btn + "bg-[#3d7ebf]"}>
          Đặt lại MK
        </button>
        <button onClick={() => setTarget(o)} disabled={self} title={self ? "Không thể khóa chính mình" : undefined} className={btn + "bg-[#1e88e5]"}>
          {o.status === "ACTIVE" ? "Khóa" : "Kích hoạt"}
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white shadow-sm">
      <h1 className="border-b px-4 py-4 text-xl font-light text-slate-800 sm:px-9 sm:text-2xl">Quản lý cán bộ cấp trên</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ ...draft, page: 1 });
        }}
        className="flex flex-wrap items-end gap-4 px-4 pt-5 sm:px-[43px]"
      >
        <label className="min-w-[220px] flex-1 text-xs text-slate-500">
          Tên đăng nhập / họ tên
          <input className={field} value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} />
        </label>
        <label className="w-full text-xs text-slate-500 sm:w-44">
          Trạng thái
          <select className={field} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option value="">Tất cả</option>
            <option value="ACTIVE">{ACCOUNT_STATUS_LABEL.ACTIVE}</option>
            <option value="LOCKED">{ACCOUNT_STATUS_LABEL.LOCKED}</option>
          </select>
        </label>
        <button type="submit" className="flex-1 rounded-sm bg-[#3d7ebf] py-2 text-xs font-bold uppercase text-white hover:opacity-90 sm:w-28 sm:flex-none">
          Tìm kiếm
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft({ search: "", status: "" });
            setApplied({ search: "", status: "", page: 1 });
          }}
          className="flex-1 rounded-sm bg-[#a5a5a5] py-2 text-xs font-bold uppercase text-white hover:opacity-90 sm:w-28 sm:flex-none"
        >
          Làm mới
        </button>
      </form>

      <div className="px-4 py-5 sm:px-[43px]">
        <button onClick={() => setCreating(true)} className="mb-4 w-full rounded-sm bg-[#2196f3] py-2.5 text-xs font-bold uppercase text-white hover:opacity-90 sm:w-auto sm:px-6">
          + Thêm tài khoản
        </button>

        <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
          {items.map((o) => (
            <div key={o.id} className="rounded border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="break-all text-sm font-bold">{o.username}</div>
                  <div className="text-[13px] text-slate-600">{o.fullName}</div>
                </div>
                <span className={`shrink-0 text-xs font-medium ${o.status === "ACTIVE" ? "text-green-700" : "text-red-600"}`}>
                  {ACCOUNT_STATUS_LABEL[o.status]}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-[88px_1fr] gap-x-2 gap-y-1 text-[13px]">
                <dt className="text-slate-500">Vai trò</dt>
                <dd>{ROLE_LABEL[o.role]}</dd>
                <dt className="text-slate-500">Đơn vị</dt>
                <dd>{unitText(o)}</dd>
                <dt className="text-slate-500">Đăng nhập cuối</dt>
                <dd>{o.lastLoginAt ? formatDate(o.lastLoginAt) : "Chưa đăng nhập"}</dd>
              </dl>
              {actions(o, true)}
            </div>
          ))}
          {!list.isFetching && items.length === 0 && (
            <p className="py-8 text-center text-slate-500 sm:col-span-2">{list.isError ? "Không thể tải dữ liệu" : "Không tìm thấy kết quả"}</p>
          )}
        </div>

        <table className="hidden w-full border-collapse text-left lg:table">
          <thead className="bg-[#2260cf] text-white">
            <tr>
              <th className={HEAD + " w-10"}>#</th>
              <th className={HEAD + " text-left"}>Tên đăng nhập</th>
              <th className={HEAD + " text-left"}>Họ và tên</th>
              <th className={HEAD}>Vai trò</th>
              <th className={HEAD}>Đơn vị</th>
              <th className={HEAD}>Đăng nhập gần nhất</th>
              <th className={HEAD}>Trạng thái</th>
              <th className={HEAD + " w-56"}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o, idx) => (
              <tr key={o.id} className="border-b hover:bg-slate-50">
                <td className={CELL + " text-center"}>{(applied.page - 1) * PAGE_SIZE + idx + 1}</td>
                <td className={CELL + " font-medium"}>{o.username}</td>
                <td className={CELL}>{o.fullName}</td>
                <td className={CELL + " text-center"}>{ROLE_LABEL[o.role]}</td>
                <td className={CELL + " text-center"}>{unitText(o)}</td>
                <td className={CELL + " text-center"}>{o.lastLoginAt ? formatDate(o.lastLoginAt) : "Chưa đăng nhập"}</td>
                <td className={CELL + " text-center"}>
                  <span className={o.status === "ACTIVE" ? "text-green-700" : "text-red-600"}>{ACCOUNT_STATUS_LABEL[o.status]}</span>
                </td>
                <td className={CELL}>{actions(o)}</td>
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>{list.isFetching ? "Đang tải..." : `Tổng ${total} tài khoản · Trang ${applied.page}/${pages}`}</span>
          <div className="flex gap-2">
            <button disabled={applied.page <= 1} onClick={() => setApplied({ ...applied, page: applied.page - 1 })} className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40">
              Trước
            </button>
            <button disabled={applied.page >= pages} onClick={() => setApplied({ ...applied, page: applied.page + 1 })} className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40">
              Sau
            </button>
          </div>
        </div>
      </div>

      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            refresh();
          }}
        />
      )}
      {resetting && <ResetModal officer={resetting} onClose={() => setResetting(null)} />}
      {target && (
        <ConfirmDialog
          title={target.status === "ACTIVE" ? "Bạn có chắc chắn khóa tài khoản ?" : "Bạn có chắc chắn kích hoạt tài khoản ?"}
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
