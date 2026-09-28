import { Fragment, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUnits, parseApiError } from "../api/secretaries";
import {
  createEvaluation,
  deleteEvaluation,
  fetchEvaluations,
  forwardEvaluation,
  updateEvaluation,
  type EvalInput,
  type MemberEvaluation,
} from "../api/evaluations";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";
import { formatDate } from "../lib/constants";

const PAGE_SIZE = 10;
const HEAD = "border border-white/30 px-3 py-2 text-center text-[13px] font-medium";
const CELL = "px-3 py-3 text-[13px]";
const field =
  "mt-1 w-full border-0 border-b border-slate-300 bg-transparent py-1 text-sm outline-none focus:border-[#1890ff]";
const numField = field + " text-right";

const GRADES: { key: keyof Pick<EvalInput, "excellentCount" | "goodCount" | "fairCount" | "averageCount" | "weakCount">; label: string }[] = [
  { key: "excellentCount", label: "Xuất sắc" },
  { key: "goodCount", label: "Tốt" },
  { key: "fairCount", label: "Khá" },
  { key: "averageCount", label: "Trung bình" },
  { key: "weakCount", label: "Yếu" },
];

const total = (d: { excellentCount: number; goodCount: number; fairCount: number; averageCount: number; weakCount: number }) =>
  d.excellentCount + d.goodCount + d.fairCount + d.averageCount + d.weakCount;

function empty(unitId?: string): EvalInput {
  return {
    year: String(new Date().getFullYear()),
    excellentCount: "0", goodCount: "0", fairCount: "0", averageCount: "0", weakCount: "0",
    note: "", unitId: unitId ?? "",
  };
}

function fromEval(d: MemberEvaluation): EvalInput {
  return {
    year: String(d.year),
    excellentCount: String(d.excellentCount), goodCount: String(d.goodCount), fairCount: String(d.fairCount),
    averageCount: String(d.averageCount), weakCount: String(d.weakCount),
    note: d.note ?? "", unitId: String(d.unitId),
  };
}

function Err({ text }: { text?: string }) {
  return text ? <span className="mt-0.5 block text-xs text-red-600">{text}</span> : null;
}

function FormModal({ item, onClose, onDone }: { item?: MemberEvaluation; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState<EvalInput>(item ? fromEval(item) : empty(user?.unit ? String(user.unit.id) : undefined));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const units = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  // fetchUnits() đã lọc theo đúng phạm vi của người dùng ở server — với Bí thư cấp thôn sẽ chỉ có 1 lựa chọn: đơn vị của chính họ
  const unitOptions = (units.data ?? []).filter((u) => u.level === "CO_SO" || u.level === "XA_PHUONG");

  const save = useMutation({
    mutationFn: () => (item ? updateEvaluation(item.id, form) : createEvaluation(form)),
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

  const set = (k: keyof EvalInput) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };
  const totalNow = GRADES.reduce((t, g) => t + (Number(form[g.key]) || 0), 0);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="my-6 w-full max-w-xl rounded bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg text-slate-800">{item ? "Cập nhật đánh giá, xếp loại" : "Đánh giá, xếp loại Đoàn viên"}</h2>
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
          className="space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-500">
              Năm đánh giá <span className="text-red-500">*</span>
              <input type="number" className={field} value={form.year} onChange={set("year")} />
              <Err text={errors.year} />
            </label>
            <label className="text-xs text-slate-500">
              Đơn vị (cấp thôn/cơ sở) <span className="text-red-500">*</span>
              <select className={field} value={form.unitId} onChange={set("unitId")}>
                <option value="">— Chọn đơn vị —</option>
                {unitOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <Err text={errors.unitId} />
            </label>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-500">Số lượng Đoàn viên theo từng loại</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {GRADES.map((g) => (
                <label key={g.key} className="text-xs text-slate-500">
                  {g.label}
                  <input type="number" min={0} className={numField} value={form[g.key]} onChange={set(g.key)} />
                  <Err text={errors[g.key]} />
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Tổng cộng: <b>{totalNow}</b> đoàn viên
            </p>
          </div>

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
          Đánh giá năm {item.year} — đang ở <b>{item.unit.name}</b>. Sẽ chuyển lên đơn vị cấp trên trực tiếp.
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

export default function Evaluations() {
  const toast = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ year: "" });
  const [applied, setApplied] = useState({ year: "", page: 1 });
  const [modal, setModal] = useState<{ item?: MemberEvaluation } | null>(null);
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
          + Thêm đánh giá
        </button>

        <div className="grid gap-3 lg:hidden">
          {items.map((d) => (
            <div key={d.id} className="rounded border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold">Năm {d.year}</div>
                  <div className="text-[13px] text-slate-600">
                    {d.unit.name}
                    {!!d._count?.forwards && <span className="ml-1 text-xs text-slate-400">(đã chuyển {d._count.forwards} lần)</span>}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-medium text-slate-600">{total(d)} đoàn viên</span>
              </div>
              <dl className="mt-2 grid grid-cols-[100px_1fr] gap-x-2 gap-y-1 text-[13px]">
                {GRADES.map((g) => (
                  <Fragment key={g.key}>
                    <dt className="text-slate-500">{g.label}</dt>
                    <dd>{d[g.key]}</dd>
                  </Fragment>
                ))}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setModal({ item: d })} className="flex-1 rounded-sm bg-[#1e88e5] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
                  Sửa
                </button>
                <button onClick={() => setToForward(d)} className="flex-1 rounded-sm bg-[#8e44ad] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
                  Chuyển lên
                </button>
                <button onClick={() => setToDelete(d)} className="flex-1 rounded-sm bg-[#c0392b] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
                  Xóa
                </button>
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
              {GRADES.map((g) => (
                <th key={g.key} className={HEAD}>{g.label}</th>
              ))}
              <th className={HEAD}>Tổng</th>
              <th className={HEAD + " w-48"}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d, idx) => (
              <tr key={d.id} className="border-b hover:bg-slate-50">
                <td className={CELL + " text-center"}>{(applied.page - 1) * PAGE_SIZE + idx + 1}</td>
                <td className={CELL + " text-center"}>{d.year}</td>
                <td className={CELL}>
                  {d.unit.name}
                  {!!d._count?.forwards && <div className="text-xs text-slate-400">(đã chuyển {d._count.forwards} lần)</div>}
                </td>
                {GRADES.map((g) => (
                  <td key={g.key} className={CELL + " text-center"}>{d[g.key]}</td>
                ))}
                <td className={CELL + " text-center font-medium"}>{total(d)}</td>
                <td className={CELL}>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <button onClick={() => setModal({ item: d })} className="rounded-sm bg-[#1e88e5] px-2.5 py-1.5 text-xs font-bold uppercase text-white hover:opacity-90">
                      Sửa
                    </button>
                    <button onClick={() => setToForward(d)} className="rounded-sm bg-[#8e44ad] px-2.5 py-1.5 text-xs font-bold uppercase text-white hover:opacity-90">
                      Chuyển
                    </button>
                    <button onClick={() => setToDelete(d)} className="rounded-sm bg-[#c0392b] px-2.5 py-1.5 text-xs font-bold uppercase text-white hover:opacity-90">
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!list.isFetching && items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                  {list.isError ? "Không thể tải dữ liệu" : "Không tìm thấy kết quả"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>{list.isFetching ? "Đang tải..." : `Tổng ${totalCount} bản đánh giá · Trang ${applied.page}/${pages}`}</span>
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
          Bí thư cấp thôn tự nhập cho đơn vị của mình rồi bấm "Chuyển lên" để gửi lên Bí thư Đoàn xã, sau đó xã chuyển tiếp lên cấp huyện.
          Mỗi lần chuyển chỉ lên đúng 1 cấp liền trên, không bỏ qua cấp.
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

      {toDelete && (
        <ConfirmDialog title="Bạn có chắc chắn xóa bản đánh giá này ?" busy={remove.isPending} onCancel={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete)}>
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
