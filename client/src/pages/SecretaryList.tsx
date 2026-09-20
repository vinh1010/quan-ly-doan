import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteSecretary,
  fetchSecretaries,
  fetchUnits,
  parseApiError,
  type Secretary,
  type SecretaryFilters,
} from "../api/secretaries";
import Avatar from "../components/Avatar";
import CccdDialog from "../components/CccdDialog";
import ConfirmDialog from "../components/ConfirmDialog";
import SecretaryModal, { type ModalMode } from "../components/SecretaryModal";
import { useToast } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";
import { formatDate, POSITION_LABEL, STATUS_LABEL } from "../lib/constants";

const PAGE_SIZE = 10;
const HEAD = "border border-white/30 px-3 py-2 text-center text-[13px] font-medium";
const CELL = "px-3 py-3 text-[13px]";
const field =
  "mt-1 w-full border-0 border-b border-slate-300 bg-transparent py-1 text-sm outline-none focus:border-[#1890ff]";

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1e88e5] text-white hover:opacity-90"
    >
      {children}
    </button>
  );
}

const PencilIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);
const TrashIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
  </svg>
);

/** Giống quy tắc RB5 ở server: đang hoạt động và chưa hết nhiệm kỳ thì không được xóa. */
const isInTerm = (s: Secretary) =>
  s.status === "ACTIVE" && (!s.termEnd || new Date(s.termEnd) >= new Date());

export default function SecretaryList() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const qc = useQueryClient();

  // bộ lọc đã áp dụng nằm trên URL để quay lại vẫn giữ kết quả; mặc định là đơn vị của người dùng
  const applied: SecretaryFilters = {
    name: params.get("name") ?? "",
    phone: params.get("phone") ?? "",
    unitId: params.get("unitId") ?? (user?.unit ? String(user.unit.id) : ""),
    status: params.get("status") ?? "",
    termFrom: params.get("termFrom") ?? "",
    termTo: params.get("termTo") ?? "",
    page: Number(params.get("page") ?? 1) || 1,
    pageSize: PAGE_SIZE,
  };

  const [draft, setDraft] = useState(applied);
  const [askCccd, setAskCccd] = useState(false);
  const [modal, setModal] = useState<{ mode: ModalMode; id?: number; cccd?: string } | null>(null);
  const [toDelete, setToDelete] = useState<Secretary | null>(null);

  const units = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const unitOptions = (units.data ?? []).filter((u) => u.level === "CO_SO" || u.level === "XA_PHUONG");
  const list = useQuery({
    queryKey: ["secretaries", applied],
    queryFn: () => fetchSecretaries(applied),
    placeholderData: (prev) => prev,
  });

  const apply = (f: SecretaryFilters) => {
    const next = new URLSearchParams();
    (Object.entries(f) as [string, string | number][]).forEach(([k, v]) => {
      if (k !== "pageSize" && v !== "" && !(k === "page" && v === 1)) next.set(k, String(v));
    });
    setParams(next);
  };

  const search = (e: FormEvent) => {
    e.preventDefault();
    apply({ ...draft, page: 1 });
  };
  const reset = () => {
    const empty = { name: "", phone: "", unitId: user?.unit ? String(user.unit.id) : "", status: "", termFrom: "", termTo: "", page: 1, pageSize: PAGE_SIZE };
    setDraft(empty);
    apply(empty);
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["secretaries"] });

  const remove = useMutation({
    mutationFn: (s: Secretary) => deleteSecretary(s.id),
    onSuccess: (r: { message: string }) => {
      toast("success", r.message);
      setToDelete(null);
      refresh();
    },
    onError: (err) => {
      toast("error", parseApiError(err).message);
      setToDelete(null);
    },
  });

  // bước 1 của Thêm mới: kiểm tra CCCD chưa tồn tại rồi mở form
  const continueWithCccd = async (cccd: string) => {
    try {
      const r = await fetchSecretaries({ cccd, page: 1, pageSize: 1 });
      if (r.total > 0) return `CCCD này đã tồn tại (${r.items[0].fullName})`;
    } catch (err) {
      return parseApiError(err).message;
    }
    setAskCccd(false);
    setModal({ mode: "create", cccd });
    return null;
  };

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="bg-white shadow-sm">
      <h1 className="border-b px-4 py-4 text-xl font-light text-slate-800 sm:px-9 sm:text-2xl">Thống kê ban chấp hành đoàn</h1>

      <form onSubmit={search} className="px-4 pt-5 sm:px-[43px]">
        <div className="flex flex-wrap items-end gap-4">
          <label className="min-w-[260px] max-w-[780px] flex-1 text-xs text-slate-500">
            Đơn vị
            <select className={field} value={draft.unitId} onChange={(e) => setDraft({ ...draft, unitId: e.target.value })}>
              <option value="">Tất cả đơn vị</option>
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="w-28 rounded-sm bg-[#3d7ebf] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
            Xem
          </button>
          <button type="button" onClick={reset} className="w-28 rounded-sm bg-[#a5a5a5] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
            Làm mới
          </button>
        </div>

        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-[#1e88e5]">Bộ lọc nâng cao</summary>
          <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs text-slate-500">
              Họ tên
              <input className={field} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">
              Số điện thoại
              <input className={field} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">
              Trạng thái
              <select className={field} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                <option value="">Tất cả</option>
                <option value="ACTIVE">{STATUS_LABEL.ACTIVE}</option>
                <option value="ENDED">{STATUS_LABEL.ENDED}</option>
              </select>
            </label>
            <label className="text-xs text-slate-500">
              Nhiệm kỳ bắt đầu từ ngày
              <input type="date" className={field} value={draft.termFrom} onChange={(e) => setDraft({ ...draft, termFrom: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">
              Đến ngày
              <input type="date" className={field} value={draft.termTo} onChange={(e) => setDraft({ ...draft, termTo: e.target.value })} />
            </label>
          </div>
        </details>
      </form>

      <div className="overflow-x-auto px-4 py-5 sm:px-[43px]">
        {/* Điện thoại: hiển thị dạng thẻ thay cho bảng 15 cột */}
        <div className="grid gap-3 sm:grid-cols-2 xl:hidden">
          <button
            type="button"
            onClick={() => setAskCccd(true)}
            className="w-full rounded-sm bg-[#2196f3] py-2.5 text-xs font-bold uppercase text-white hover:opacity-90 sm:col-span-2"
          >
            + Thêm mới cán bộ
          </button>
          {items.map((s) => (
            <div key={s.id} className="rounded border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar src={s.avatarUrl} name={s.fullName} size={44} />
                  <button onClick={() => setModal({ mode: "view", id: s.id })} className="text-left text-sm font-bold uppercase text-[#1e88e5]">
                    {s.fullName}
                  </button>
                </div>
                <span className="inline-flex shrink-0 gap-1.5">
                  <IconButton label={`Sửa ${s.fullName}`} onClick={() => setModal({ mode: "edit", id: s.id })}>
                    {PencilIcon}
                  </IconButton>
                  <IconButton label={`Xóa ${s.fullName}`} onClick={() => setToDelete(s)}>
                    {TrashIcon}
                  </IconButton>
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-[88px_1fr] gap-x-2 gap-y-1 text-[13px]">
                <dt className="text-slate-500">Chức vụ</dt>
                <dd>
                  {POSITION_LABEL[s.position]}
                  {s.status === "ENDED" && <span className="text-slate-400"> ({STATUS_LABEL.ENDED})</span>}
                </dd>
                <dt className="text-slate-500">Đơn vị</dt>
                <dd>{s.unit.name}</dd>
                <dt className="text-slate-500">Ngày sinh</dt>
                <dd>{formatDate(s.dob)}</dd>
                <dt className="text-slate-500">Điện thoại</dt>
                <dd>{s.phone}</dd>
                {s.email && (
                  <>
                    <dt className="text-slate-500">Email</dt>
                    <dd className="break-all">{s.email}</dd>
                  </>
                )}
              </dl>
            </div>
          ))}
          {!list.isFetching && items.length === 0 && (
            <p className="py-8 text-center text-slate-500 sm:col-span-2">
              {list.isError ? "Không thể tải dữ liệu" : "Không tìm thấy kết quả"}
            </p>
          )}
        </div>

        <table className="hidden w-full min-w-[1100px] border-collapse text-left xl:table">
          <thead className="bg-[#2260cf] text-white">
            <tr>
              <th rowSpan={2} className={HEAD + " w-10"}>#</th>
              <th rowSpan={2} className={HEAD + " text-left"}>Họ và Tên</th>
              <th rowSpan={2} className={HEAD}>Chức vụ Đoàn</th>
              <th colSpan={2} className={HEAD}>Ngày sinh</th>
              <th rowSpan={2} className={HEAD}>Quê quán</th>
              <th rowSpan={2} className={HEAD}>Dân tộc</th>
              <th colSpan={2} className={HEAD}>Trình độ</th>
              <th rowSpan={2} className={HEAD}>Ngày vào Đoàn</th>
              <th rowSpan={2} className={HEAD}>Ngày vào Đảng</th>
              <th rowSpan={2} className={HEAD}>Chức vụ Đảng</th>
              <th rowSpan={2} className={HEAD}>Điện thoại</th>
              <th rowSpan={2} className={HEAD}>Email</th>
              <th rowSpan={2} className={HEAD + " w-28"}>
                <button
                  onClick={() => setAskCccd(true)}
                  type="button"
                  aria-label="Thêm mới cán bộ đoàn"
                  title="Thêm mới"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2196f3] text-2xl leading-none hover:opacity-90"
                >
                  +
                </button>
              </th>
            </tr>
            <tr>
              <th className={HEAD}>Nam</th>
              <th className={HEAD}>Nữ</th>
              <th className={HEAD}>Chuyên môn</th>
              <th className={HEAD}>Lý luận chính trị</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s, idx) => (
              <tr key={s.id} className="border-b bg-white hover:bg-slate-50">
                <td className={CELL + " text-center"}>{(applied.page - 1) * PAGE_SIZE + idx + 1}</td>
                <td className={CELL}>
                  <div className="flex items-center gap-2">
                    <Avatar src={s.avatarUrl} name={s.fullName} size={36} />
                    <button onClick={() => setModal({ mode: "view", id: s.id })} className="text-left font-bold uppercase hover:text-[#1e88e5] hover:underline">
                      {s.fullName}
                    </button>
                  </div>
                </td>
                <td className={CELL + " text-center"}>
                  {POSITION_LABEL[s.position]}
                  {s.status === "ENDED" && <span className="mt-1 block text-xs text-slate-400">({STATUS_LABEL.ENDED})</span>}
                </td>
                <td className={CELL + " text-center"}>{s.gender === "MALE" ? formatDate(s.dob) : ""}</td>
                <td className={CELL + " text-center"}>{s.gender === "FEMALE" ? formatDate(s.dob) : ""}</td>
                <td className={CELL + " text-center"}>
                  {[s.hometownWard, s.hometownProvince].filter(Boolean).join(" - ")}
                </td>
                <td className={CELL + " text-center"}>{s.ethnicity}</td>
                <td className={CELL + " text-center"}>{s.training}</td>
                <td className={CELL + " text-center"}>{s.politicalTheory}</td>
                <td className={CELL + " text-center"}>{s.unionJoinDate ? formatDate(s.unionJoinDate) : ""}</td>
                <td className={CELL + " text-center"}>{s.partyJoinDate ? formatDate(s.partyJoinDate) : ""}</td>
                <td className={CELL + " text-center"}>{s.partyPosition}</td>
                <td className={CELL + " text-center"}>{s.phone}</td>
                <td className={CELL + " text-center"}>{s.email}</td>
                <td className={CELL + " whitespace-nowrap text-center"}>
                  <span className="inline-flex gap-1.5">
                    <IconButton label={`Sửa ${s.fullName}`} onClick={() => setModal({ mode: "edit", id: s.id })}>
                      {PencilIcon}
                    </IconButton>
                    <IconButton label={`Xóa ${s.fullName}`} onClick={() => setToDelete(s)}>
                      {TrashIcon}
                    </IconButton>
                  </span>
                </td>
              </tr>
            ))}
            {!list.isFetching && items.length === 0 && (
              <tr>
                <td colSpan={15} className="px-4 py-10 text-center text-slate-500">
                  {list.isError ? "Không thể tải dữ liệu" : "Không tìm thấy kết quả"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>
            {list.isFetching ? "Đang tải..." : `Tổng ${total} cán bộ · Trang ${applied.page}/${pages}`}
          </span>
          <div className="flex gap-2">
            <button
              disabled={applied.page <= 1}
              onClick={() => apply({ ...applied, page: applied.page - 1 })}
              className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40"
            >
              Trước
            </button>
            <button
              disabled={applied.page >= pages}
              onClick={() => apply({ ...applied, page: applied.page + 1 })}
              className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {askCccd && <CccdDialog onCancel={() => setAskCccd(false)} onContinue={continueWithCccd} />}

      {modal && (
        <SecretaryModal
          mode={modal.mode}
          secretaryId={modal.id}
          cccd={modal.cccd}
          unitId={applied.unitId}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            refresh();
          }}
        />
      )}

      {toDelete && isInTerm(toDelete) && (
        <ConfirmDialog
          title="Không thể xóa cán bộ đang tại chức"
          confirmLabel="Sửa nhiệm kỳ"
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            setModal({ mode: "edit", id: toDelete.id });
            setToDelete(null);
          }}
        >
          <p className="font-medium text-slate-800">{toDelete.fullName}</p>
          <p>{toDelete.unit.name}</p>
          <p>
            Hãy đổi trạng thái sang “Đã kết thúc” (và nhập ngày kết thúc nhiệm kỳ) rồi xóa lại.
          </p>
        </ConfirmDialog>
      )}

      {toDelete && !isInTerm(toDelete) && (
        <ConfirmDialog
          title="Bạn có chắc chắn xóa ?"
          busy={remove.isPending}
          onCancel={() => setToDelete(null)}
          onConfirm={() => remove.mutate(toDelete)}
        >
          <p className="font-medium text-slate-800">{toDelete.fullName}</p>
          <p>{toDelete.unit.name}</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
