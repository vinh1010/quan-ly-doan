import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUnits, parseApiError } from "../api/secretaries";
import {
  createMember,
  deleteMember,
  fetchMembers,
  updateMember,
  type Member,
  type MemberInput,
} from "../api/members";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";
import { GENDER_LABEL, formatDate, toDateInput } from "../lib/constants";

const PAGE_SIZE = 20;
const HEAD = "border border-white/30 px-3 py-2 text-center text-[13px] font-medium";
const CELL = "px-3 py-2.5 text-[13px]";
const field =
  "mt-1 w-full border-0 border-b border-slate-300 bg-transparent py-1 text-sm outline-none focus:border-[#1890ff]";

const STATUS_LABEL = { ACTIVE: "Đang sinh hoạt", INACTIVE: "Tạm vắng", MOVED: "Đã chuyển đi" } as const;
const STATUS_COLOR: Record<string, string> = { ACTIVE: "text-green-700", INACTIVE: "text-amber-600", MOVED: "text-slate-400" };

/* ---------- Icon gọn cho các nút thao tác (cùng kiểu với Ban chấp hành đoàn cơ sở) ---------- */
function IconBtn({ label, color, onClick, children }: { label: string; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color} text-white hover:opacity-90`}
    >
      {children}
    </button>
  );
}
const ICON_PROPS = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, "aria-hidden": true } as const;
const PencilIcon = <svg {...ICON_PROPS}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>;
const TrashIcon = <svg {...ICON_PROPS}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" /></svg>;

function empty(unitId?: string): MemberInput {
  return { fullName: "", dob: "", gender: "", status: "ACTIVE", note: "", unitId: unitId ?? "" };
}
function fromMember(m: Member): MemberInput {
  return { fullName: m.fullName, dob: toDateInput(m.dob), gender: m.gender ?? "", status: m.status, note: m.note ?? "", unitId: String(m.unitId) };
}

function Err({ text }: { text?: string }) {
  return text ? <span className="mt-0.5 block text-xs text-red-600">{text}</span> : null;
}

function FormModal({ item, onClose, onDone }: { item?: Member; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState<MemberInput>(item ? fromMember(item) : empty(user?.unit ? String(user.unit.id) : undefined));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const units = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const unitOptions = (units.data ?? []).filter((u) => u.level === "CO_SO" || u.level === "XA_PHUONG");

  const save = useMutation({
    mutationFn: () => (item ? updateMember(item.id, form) : createMember(form)),
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

  const set = (k: keyof MemberInput) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="my-6 w-full max-w-md rounded bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg text-slate-800">{item ? "Cập nhật Đoàn viên" : "Thêm Đoàn viên"}</h2>
          <button onClick={onClose} className="text-xl leading-none text-slate-500 hover:text-slate-800" aria-label="Đóng">
            ×
          </button>
        </div>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            setErrors({});
            save.mutate();
          }}
          noValidate
          className="space-y-3"
        >
          <label className="block text-xs text-slate-500">
            Họ và tên <span className="text-red-500">*</span>
            <input className={field} value={form.fullName} onChange={set("fullName")} />
            <Err text={errors.fullName} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-500">
              Ngày sinh
              <input type="date" className={field} value={form.dob} onChange={set("dob")} />
            </label>
            <label className="text-xs text-slate-500">
              Giới tính
              <select className={field} value={form.gender} onChange={set("gender")}>
                <option value="">— —</option>
                {Object.entries(GENDER_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-xs text-slate-500">
            Đơn vị (chi đoàn/thôn) <span className="text-red-500">*</span>
            <select className={field} value={form.unitId} onChange={set("unitId")}>
              <option value="">— Chọn đơn vị —</option>
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <Err text={errors.unitId} />
          </label>
          <label className="block text-xs text-slate-500">
            Trạng thái
            <select className={field} value={form.status} onChange={set("status")}>
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-500">
            Ghi chú
            <textarea className={field + " min-h-[50px]"} value={form.note} onChange={set("note")} />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={save.isPending} className="w-28 rounded-sm bg-[#a5a5a5] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
              Hủy
            </button>
            <button type="submit" disabled={save.isPending} className="w-28 rounded-sm bg-[#3d7ebf] py-2 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-60">
              {save.isPending ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Members() {
  const toast = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ name: "", status: "" });
  const [applied, setApplied] = useState({ name: "", status: "", page: 1 });
  const [modal, setModal] = useState<{ item?: Member } | null>(null);
  const [toDelete, setToDelete] = useState<Member | null>(null);

  const list = useQuery({
    queryKey: ["members", applied],
    queryFn: () => fetchMembers({ ...applied, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["members"] });

  const remove = useMutation({
    mutationFn: (m: Member) => deleteMember(m.id),
    onSuccess: (r) => {
      toast("success", r.message);
      setToDelete(null);
      refresh();
    },
    onError: (err) => {
      toast("error", parseApiError(err).message);
      setToDelete(null);
    },
  });

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="bg-white shadow-sm">
      <h1 className="border-b px-4 py-4 text-xl font-light text-slate-800 sm:px-9 sm:text-2xl">Danh sách Đoàn viên</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ ...draft, page: 1 });
        }}
        className="flex flex-wrap items-end gap-4 px-4 pt-5 sm:px-[43px]"
      >
        <label className="min-w-[200px] flex-1 text-xs text-slate-500">
          Họ tên
          <input className={field} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label className="w-full text-xs text-slate-500 sm:w-44">
          Trạng thái
          <select className={field} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option value="">Tất cả</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="flex-1 rounded-sm bg-[#3d7ebf] py-2 text-xs font-bold uppercase text-white hover:opacity-90 sm:w-28 sm:flex-none">
          Tìm kiếm
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft({ name: "", status: "" });
            setApplied({ name: "", status: "", page: 1 });
          }}
          className="flex-1 rounded-sm bg-[#a5a5a5] py-2 text-xs font-bold uppercase text-white hover:opacity-90 sm:w-28 sm:flex-none"
        >
          Làm mới
        </button>
      </form>

      <div className="px-4 py-5 sm:px-[43px]">
        <button onClick={() => setModal({})} className="mb-4 w-full rounded-sm bg-[#2196f3] py-2.5 text-xs font-bold uppercase text-white hover:opacity-90 sm:w-auto sm:px-6">
          + Thêm Đoàn viên
        </button>

        <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
          {items.map((m) => (
            <div key={m.id} className="rounded border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-bold">{m.fullName}</span>
                <span className={`shrink-0 text-xs font-medium ${STATUS_COLOR[m.status]}`}>{STATUS_LABEL[m.status]}</span>
              </div>
              <dl className="mt-2 grid grid-cols-[90px_1fr] gap-x-2 gap-y-1 text-[13px]">
                <dt className="text-slate-500">Đơn vị</dt>
                <dd>{m.unit.name}</dd>
                {m.dob && (
                  <>
                    <dt className="text-slate-500">Ngày sinh</dt>
                    <dd>{formatDate(m.dob)}</dd>
                  </>
                )}
              </dl>
              <div className="mt-3 flex gap-2">
                <IconBtn label="Sửa" color="bg-[#1e88e5]" onClick={() => setModal({ item: m })}>{PencilIcon}</IconBtn>
                <IconBtn label="Xóa" color="bg-[#c0392b]" onClick={() => setToDelete(m)}>{TrashIcon}</IconBtn>
              </div>
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
              <th className={HEAD + " text-left"}>Họ và tên</th>
              <th className={HEAD}>Ngày sinh</th>
              <th className={HEAD}>Giới tính</th>
              <th className={HEAD + " text-left"}>Đơn vị</th>
              <th className={HEAD}>Trạng thái</th>
              <th className={HEAD + " w-36"}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m, idx) => (
              <tr key={m.id} className="border-b hover:bg-slate-50">
                <td className={CELL + " text-center"}>{(applied.page - 1) * PAGE_SIZE + idx + 1}</td>
                <td className={CELL + " font-medium"}>{m.fullName}</td>
                <td className={CELL + " text-center"}>{m.dob ? formatDate(m.dob) : "—"}</td>
                <td className={CELL + " text-center"}>{m.gender ? GENDER_LABEL[m.gender] : "—"}</td>
                <td className={CELL}>{m.unit.name}</td>
                <td className={CELL + " text-center"}>
                  <span className={STATUS_COLOR[m.status]}>{STATUS_LABEL[m.status]}</span>
                </td>
                <td className={CELL}>
                  <div className="flex justify-center gap-2">
                    <IconBtn label="Sửa" color="bg-[#1e88e5]" onClick={() => setModal({ item: m })}>{PencilIcon}</IconBtn>
                    <IconBtn label="Xóa" color="bg-[#c0392b]" onClick={() => setToDelete(m)}>{TrashIcon}</IconBtn>
                  </div>
                </td>
              </tr>
            ))}
            {!list.isFetching && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  {list.isError ? "Không thể tải dữ liệu" : "Không tìm thấy kết quả"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>{list.isFetching ? "Đang tải..." : `Tổng ${total} Đoàn viên · Trang ${applied.page}/${pages}`}</span>
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

      {modal && (
        <FormModal
          item={modal.item}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            refresh();
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog title="Bạn có chắc chắn xóa Đoàn viên này ?" busy={remove.isPending} onCancel={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete)}>
          <p className="font-medium text-slate-800">{toDelete.fullName}</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
