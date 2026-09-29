import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUnits, parseApiError } from "../api/secretaries";
import { fetchMembers } from "../api/members";
import {
  approveEvaluation,
  createEvaluation,
  deleteEvaluation,
  fetchEvaluation,
  fetchEvaluations,
  forwardEvaluation,
  reopenEvaluation,
  saveGrades,
  updateEvaluation,
  type GradeInput,
  type GradeValue,
  type MemberEvaluation,
} from "../api/evaluations";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";
import { GRADE_LABEL } from "../lib/constants";

const PAGE_SIZE = 10;
const HEAD = "border border-white/30 px-3 py-2 text-center text-[13px] font-medium";
const CELL = "px-3 py-3 text-[13px]";
const field =
  "mt-1 w-full border-0 border-b border-slate-300 bg-transparent py-1 text-sm outline-none focus:border-[#1890ff]";

function Err({ text }: { text?: string }) {
  return text ? <span className="mt-0.5 block text-xs text-red-600">{text}</span> : null;
}

/* ---------- Icon gọn cho các nút thao tác (cùng kiểu với IconButton ở Ban chấp hành đoàn cơ sở) ---------- */
function IconBtn({
  label,
  color,
  onClick,
  disabled,
  children,
}: {
  label: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color} text-white hover:opacity-90 disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

const ICON_PROPS = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, "aria-hidden": true } as const;
const GradeIcon = <svg {...ICON_PROPS}><path d="M9 6h11M9 12h11M9 18h11M3 6l1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2" /></svg>;
const PencilIcon = <svg {...ICON_PROPS}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>;
const ForwardIcon = <svg {...ICON_PROPS}><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
const ApproveIcon = <svg {...ICON_PROPS}><path d="M20 6 9 17l-5-5" /></svg>;
const TrashIcon = <svg {...ICON_PROPS}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" /></svg>;
const ReopenIcon = <svg {...ICON_PROPS}><path d="M3 2v6h6M3.51 8a9 9 0 1 1 2.13 6.36" /></svg>;

/* ---------- Thêm mới / sửa thông tin đợt (năm, ghi chú) ---------- */
function FormModal({ item, onClose, onDone }: { item?: MemberEvaluation; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const [year, setYear] = useState(item ? String(item.year) : String(new Date().getFullYear()));
  const [note, setNote] = useState(item?.note ?? "");
  const [unitId, setUnitId] = useState(item ? String(item.unitId) : user?.unit ? String(user.unit.id) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const units = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const unitOptions = (units.data ?? []).filter((u) => u.level === "CO_SO" || u.level === "XA_PHUONG");

  const save = useMutation({
    mutationFn: () => (item ? updateEvaluation(item.id, { year, note }) : createEvaluation({ year, note, unitId })),
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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded bg-white p-5 shadow-xl sm:p-6">
        <h2 className="mb-4 text-lg text-slate-800">{item ? "Cập nhật đợt đánh giá" : "Tạo đợt đánh giá mới"}</h2>
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
            Năm đánh giá <span className="text-red-500">*</span>
            <input type="number" className={field} value={year} onChange={(e) => setYear(e.target.value)} />
            <Err text={errors.year} />
          </label>
          {!item && (
            <label className="block text-xs text-slate-500">
              Đơn vị (cấp thôn/cơ sở) <span className="text-red-500">*</span>
              <select className={field} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">— Chọn đơn vị —</option>
                {unitOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <Err text={errors.unitId} />
            </label>
          )}
          <label className="block text-xs text-slate-500">
            Ghi chú
            <textarea className={field + " min-h-[50px]"} value={note} onChange={(e) => setNote(e.target.value)} />
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

/* ---------- Chấm điểm từng Đoàn viên trong 1 đợt ---------- */
function GradingModal({ evalItem, onClose, onDone }: { evalItem: MemberEvaluation; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const detail = useQuery({ queryKey: ["evaluation", evalItem.id], queryFn: () => fetchEvaluation(evalItem.id) });
  const members = useQuery({
    queryKey: ["members-of-unit", evalItem.unitId],
    queryFn: () => fetchMembers({ unitId: String(evalItem.unitId), page: 1, pageSize: 200 }),
  });
  const [rows, setRows] = useState<Record<number, { grade: GradeValue | ""; note: string }> | null>(null);

  // khởi tạo bảng chấm điểm từ xếp loại đã có (chỉ 1 lần khi tải xong)
  if (rows === null && detail.data) {
    const init: Record<number, { grade: GradeValue | ""; note: string }> = {};
    for (const g of detail.data.grades ?? []) init[g.member.id] = { grade: g.grade, note: g.note ?? "" };
    setRows(init);
  }

  const save = useMutation({
    mutationFn: (grades: GradeInput[]) => saveGrades(evalItem.id, grades),
    onSuccess: (r) => {
      toast("success", r.message);
      onDone();
    },
    onError: (err) => toast("error", parseApiError(err).message),
  });

  const setRow = (memberId: number, patch: Partial<{ grade: GradeValue | ""; note: string }>) =>
    setRows((r) => ({ ...r, [memberId]: { grade: "", note: "", ...r?.[memberId], ...patch } }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const grades: GradeInput[] = Object.entries(rows ?? {})
      .filter(([, v]) => v.grade)
      .map(([memberId, v]) => ({ memberId: Number(memberId), grade: v.grade as GradeValue, note: v.note || undefined }));
    if (grades.length === 0) {
      toast("error", "Chưa chọn xếp loại cho ai");
      return;
    }
    save.mutate(grades);
  };

  const memberList = members.data?.items ?? [];
  const loading = detail.isLoading || members.isLoading;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="my-6 w-full max-w-3xl rounded bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg text-slate-800">
            Chấm điểm — Năm {evalItem.year} — {evalItem.unit.name}
          </h2>
          <button onClick={onClose} className="text-xl leading-none text-slate-500 hover:text-slate-800" aria-label="Đóng">
            ×
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-slate-500">Đang tải...</p>
        ) : memberList.length === 0 ? (
          <p className="py-8 text-center text-slate-500">
            Đơn vị này chưa có Đoàn viên nào trong danh sách. Vào mục "Đoàn viên" để thêm trước.
          </p>
        ) : (
          <form onSubmit={submit}>
            <div className="max-h-[55vh] overflow-y-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-[#2260cf] text-white">
                  <tr>
                    <th className={HEAD + " text-left"}>Họ và tên</th>
                    <th className={HEAD + " w-44"}>Xếp loại</th>
                    <th className={HEAD + " text-left"}>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {memberList.map((m) => (
                    <tr key={m.id} className="border-b hover:bg-slate-50">
                      <td className={CELL}>{m.fullName}</td>
                      <td className={CELL}>
                        <select
                          className={field + " mt-0"}
                          value={rows?.[m.id]?.grade ?? ""}
                          onChange={(e) => setRow(m.id, { grade: e.target.value as GradeValue | "" })}
                        >
                          <option value="">— Chưa chấm —</option>
                          {Object.entries(GRADE_LABEL).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </td>
                      <td className={CELL}>
                        <input
                          className={field + " mt-0"}
                          value={rows?.[m.id]?.note ?? ""}
                          onChange={(e) => setRow(m.id, { note: e.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={onClose} disabled={save.isPending} className="w-28 rounded-sm bg-[#a5a5a5] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
                Hủy
              </button>
              <button type="submit" disabled={save.isPending} className="w-32 rounded-sm bg-[#3d7ebf] py-2 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-60">
                {save.isPending ? "Đang lưu..." : "Lưu xếp loại"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ForwardModal({ item, onClose, onDone }: { item: MemberEvaluation; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const forward = useMutation({
    mutationFn: () => forwardEvaluation(item.id, note),
    onSuccess: (r) => {
      toast("success", r.message);
      onDone();
    },
    onError: (err) => setError(parseApiError(err).message),
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded bg-white p-5 shadow-xl sm:p-6">
        <h2 className="mb-1 text-lg text-slate-800">Chuyển lên cấp trên</h2>
        <p className="mb-4 text-sm text-slate-500">
          Đợt đánh giá năm {item.year} — đang ở <b>{item.unit.name}</b>. Toàn bộ xếp loại bên trong sẽ chuyển theo.
        </p>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            setError("");
            forward.mutate();
          }}
          noValidate
          className="space-y-3"
        >
          <label className="block text-xs text-slate-500">
            Ghi chú
            <textarea className={field + " min-h-[50px]"} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <Err text={error} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={forward.isPending} className="w-28 rounded-sm bg-[#a5a5a5] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
              Hủy
            </button>
            <button type="submit" disabled={forward.isPending} className="w-28 rounded-sm bg-[#8e44ad] py-2 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-60">
              {forward.isPending ? "Đang gửi..." : "Chuyển"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Danh sách thao tác cho 1 đợt, tùy trạng thái:
 * - Đã duyệt: chỉ còn "Mở lại" (khóa chấm điểm/sửa/chuyển/xóa).
 * - Chưa duyệt, ở cấp cao nhất (không còn cấp trên): "Duyệt" thay cho "Chuyển lên".
 * - Chưa duyệt, còn cấp trên: như cũ (Chấm điểm/Sửa/Chuyển lên/Xóa).
 */
function evalActions(
  d: MemberEvaluation,
  h: { grade: () => void; edit: () => void; forward: () => void; del: () => void; approve: () => void; reopen: () => void },
) {
  if (d.status === "DA_DUYET") {
    return [{ key: "reopen", label: "Mở lại", color: "bg-[#d97706]", icon: ReopenIcon, onClick: h.reopen }];
  }
  const isTop = d.unit.parentId === null;
  return [
    { key: "grade", label: "Chấm điểm", color: "bg-[#1b7a3a]", icon: GradeIcon, onClick: h.grade },
    { key: "edit", label: "Sửa", color: "bg-[#1e88e5]", icon: PencilIcon, onClick: h.edit },
    isTop
      ? { key: "approve", label: "Duyệt", color: "bg-[#1b7a3a]", icon: ApproveIcon, onClick: h.approve }
      : { key: "forward", label: "Chuyển lên", color: "bg-[#8e44ad]", icon: ForwardIcon, onClick: h.forward },
    { key: "delete", label: "Xóa", color: "bg-[#c0392b]", icon: TrashIcon, onClick: h.del },
  ];
}

function StatusBadge({ status }: { status: MemberEvaluation["status"] }) {
  if (status !== "DA_DUYET") return null;
  return (
    <span className="ml-1.5 inline-block rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700">
      Đã duyệt
    </span>
  );
}

export default function Evaluations() {
  const toast = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ year: "" });
  const [applied, setApplied] = useState({ year: "", page: 1 });
  const [modal, setModal] = useState<{ item?: MemberEvaluation } | null>(null);
  const [grading, setGrading] = useState<MemberEvaluation | null>(null);
  const [toDelete, setToDelete] = useState<MemberEvaluation | null>(null);
  const [toForward, setToForward] = useState<MemberEvaluation | null>(null);

  const list = useQuery({
    queryKey: ["evaluations", applied],
    queryFn: () => fetchEvaluations({ ...applied, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["evaluations"] });

  const remove = useMutation({
    mutationFn: (d: MemberEvaluation) => deleteEvaluation(d.id),
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

  const approve = useMutation({
    mutationFn: (d: MemberEvaluation) => approveEvaluation(d.id),
    onSuccess: (r) => {
      toast("success", r.message);
      refresh();
    },
    onError: (err) => toast("error", parseApiError(err).message),
  });

  const reopen = useMutation({
    mutationFn: (d: MemberEvaluation) => reopenEvaluation(d.id),
    onSuccess: (r) => {
      toast("success", r.message);
      refresh();
    },
    onError: (err) => toast("error", parseApiError(err).message),
  });

  const items = list.data?.items ?? [];
  const totalCount = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="bg-white shadow-sm">
      <h1 className="border-b px-4 py-4 text-xl font-light text-slate-800 sm:px-9 sm:text-2xl">Đánh giá, xếp loại Đoàn viên</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ ...draft, page: 1 });
        }}
        className="flex flex-wrap items-end gap-4 px-4 pt-5 sm:px-[43px]"
      >
        <label className="w-full text-xs text-slate-500 sm:w-44">
          Năm
          <input type="number" className={field} value={draft.year} onChange={(e) => setDraft({ year: e.target.value })} />
        </label>
        <button type="submit" className="flex-1 rounded-sm bg-[#3d7ebf] py-2 text-xs font-bold uppercase text-white hover:opacity-90 sm:w-28 sm:flex-none">
          Tìm kiếm
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft({ year: "" });
            setApplied({ year: "", page: 1 });
          }}
          className="flex-1 rounded-sm bg-[#a5a5a5] py-2 text-xs font-bold uppercase text-white hover:opacity-90 sm:w-28 sm:flex-none"
        >
          Làm mới
        </button>
      </form>

      <div className="px-4 py-5 sm:px-[43px]">
        <button onClick={() => setModal({})} className="mb-4 w-full rounded-sm bg-[#2196f3] py-2.5 text-xs font-bold uppercase text-white hover:opacity-90 sm:w-auto sm:px-6">
          + Tạo đợt đánh giá
        </button>

        <div className="grid gap-3 lg:hidden">
          {items.map((d) => (
            <div key={d.id} className="rounded border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold">
                    Năm {d.year}
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="text-[13px] text-slate-600">
                    {d.unit.name}
                    {!!d._count?.forwards && <span className="ml-1 text-xs text-slate-400">(đã chuyển {d._count.forwards} lần)</span>}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-medium text-slate-600">{d._count?.grades ?? 0} đã chấm</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {evalActions(d, {
                  grade: () => setGrading(d),
                  edit: () => setModal({ item: d }),
                  forward: () => setToForward(d),
                  del: () => setToDelete(d),
                  approve: () => approve.mutate(d),
                  reopen: () => reopen.mutate(d),
                }).map((b) => (
                  <IconBtn key={b.key} label={b.label} color={b.color} onClick={b.onClick} disabled={approve.isPending || reopen.isPending}>
                    {b.icon}
                  </IconBtn>
                ))}
              </div>
            </div>
          ))}
          {!list.isFetching && items.length === 0 && (
            <p className="py-8 text-center text-slate-500">{list.isError ? "Không thể tải dữ liệu" : "Không tìm thấy kết quả"}</p>
          )}
        </div>

        <table className="hidden w-full border-collapse text-left lg:table">
          <thead className="bg-[#2260cf] text-white">
            <tr>
              <th className={HEAD + " w-10"}>#</th>
              <th className={HEAD}>Năm</th>
              <th className={HEAD + " text-left"}>Đơn vị</th>
              <th className={HEAD}>Số Đoàn viên đã chấm</th>
              <th className={HEAD + " w-64"}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d, idx) => (
              <tr key={d.id} className="border-b hover:bg-slate-50">
                <td className={CELL + " text-center"}>{(applied.page - 1) * PAGE_SIZE + idx + 1}</td>
                <td className={CELL + " text-center"}>
                  {d.year}
                  <StatusBadge status={d.status} />
                </td>
                <td className={CELL}>
                  {d.unit.name}
                  {!!d._count?.forwards && <div className="text-xs text-slate-400">(đã chuyển {d._count.forwards} lần)</div>}
                </td>
                <td className={CELL + " text-center font-medium"}>{d._count?.grades ?? 0}</td>
                <td className={CELL}>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {evalActions(d, {
                      grade: () => setGrading(d),
                      edit: () => setModal({ item: d }),
                      forward: () => setToForward(d),
                      del: () => setToDelete(d),
                      approve: () => approve.mutate(d),
                      reopen: () => reopen.mutate(d),
                    }).map((b) => (
                      <IconBtn key={b.key} label={b.label} color={b.color} onClick={b.onClick} disabled={approve.isPending || reopen.isPending}>
                        {b.icon}
                      </IconBtn>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {!list.isFetching && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  {list.isError ? "Không thể tải dữ liệu" : "Không tìm thấy kết quả"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>{list.isFetching ? "Đang tải..." : `Tổng ${totalCount} đợt đánh giá · Trang ${applied.page}/${pages}`}</span>
          <div className="flex gap-2">
            <button disabled={applied.page <= 1} onClick={() => setApplied({ ...applied, page: applied.page - 1 })} className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40">
              Trước
            </button>
            <button disabled={applied.page >= pages} onClick={() => setApplied({ ...applied, page: applied.page + 1 })} className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40">
              Sau
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Bí thư cấp thôn tạo đợt cho đơn vị mình, bấm "Chấm điểm" để xếp loại từng Đoàn viên (cần có sẵn trong mục "Đoàn viên"),
          rồi bấm "Chuyển lên" để gửi cả đợt lên Bí thư Đoàn xã. Khi đợt đã ở Xã Phú Cát (cấp cao nhất), bấm "Duyệt" để
          chốt kết quả — sau khi duyệt sẽ khóa lại, cần "Mở lại" nếu cần chấm/sửa tiếp.
        </p>
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

      {grading && (
        <GradingModal
          evalItem={grading}
          onClose={() => setGrading(null)}
          onDone={() => {
            setGrading(null);
            refresh();
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog title="Bạn có chắc chắn xóa đợt đánh giá này ?" busy={remove.isPending} onCancel={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete)}>
          <p className="font-medium text-slate-800">Năm {toDelete.year} — {toDelete.unit.name}</p>
        </ConfirmDialog>
      )}

      {toForward && (
        <ForwardModal
          item={toForward}
          onClose={() => setToForward(null)}
          onDone={() => {
            setToForward(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
