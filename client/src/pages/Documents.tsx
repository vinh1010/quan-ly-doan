import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUnits, parseApiError } from "../api/secretaries";
import {
  confirmDocument,
  createDocument,
  deleteDocument,
  fetchDocuments,
  forwardDocument,
  updateDocument,
  type DocInput,
  type IncomingDoc,
} from "../api/documents";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";
import { DOC_STATUS_LABEL, DOC_TYPE_LABEL, formatDate, toDateInput } from "../lib/constants";

const PAGE_SIZE = 10;
const HEAD = "border border-white/30 px-3 py-2 text-center text-[13px] font-medium";
const CELL = "px-3 py-3 text-[13px]";
const field =
  "mt-1 w-full border-0 border-b border-slate-300 bg-transparent py-1 text-sm outline-none focus:border-[#1890ff]";

const STATUS_COLOR: Record<string, string> = {
  CHUA_XU_LY: "text-red-600",
  DANG_XU_LY: "text-amber-600",
  DA_XU_LY: "text-green-700",
};

const EMPTY: DocInput = {
  number: "", summary: "", sender: "", issuedDate: "", receivedDate: new Date().toISOString().slice(0, 10),
  type: "KHAC", status: "CHUA_XU_LY", deadline: "", assignedTo: "", note: "", unitId: "",
};

function fromDoc(d: IncomingDoc): DocInput {
  return {
    number: d.number, summary: d.summary, sender: d.sender,
    issuedDate: toDateInput(d.issuedDate), receivedDate: toDateInput(d.receivedDate),
    type: d.type, status: d.status, deadline: toDateInput(d.deadline),
    assignedTo: d.assignedTo ?? "", note: d.note ?? "", unitId: String(d.unitId),
  };
}

function Err({ text }: { text?: string }) {
  return text ? <span className="mt-0.5 block text-xs text-red-600">{text}</span> : null;
}

function FormModal({ doc, onClose, onDone }: { doc?: IncomingDoc; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<DocInput>(doc ? fromDoc(doc) : EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const units = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const unitOptions = (units.data ?? []).filter((u) => u.level === "CO_SO" || u.level === "XA_PHUONG");

  const save = useMutation({
    mutationFn: () => (doc ? updateDocument(doc.id, form) : createDocument(form)),
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

  const set = (k: keyof DocInput) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="my-6 w-full max-w-2xl rounded bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg text-slate-800">{doc ? "Cập nhật công văn" : "Thêm mới công văn"}</h2>
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
          className="grid gap-3 sm:grid-cols-2"
        >
          <label className="text-xs text-slate-500">
            Số công văn <span className="text-red-500">*</span>
            <input className={field} value={form.number} onChange={set("number")} />
            <Err text={errors.number} />
          </label>
          <label className="text-xs text-slate-500">
            Nơi gửi <span className="text-red-500">*</span>
            <input className={field} value={form.sender} onChange={set("sender")} />
            <Err text={errors.sender} />
          </label>
          <label className="text-xs text-slate-500 sm:col-span-2">
            Trích yếu / nội dung <span className="text-red-500">*</span>
            <textarea className={field + " min-h-[60px]"} value={form.summary} onChange={set("summary")} />
            <Err text={errors.summary} />
          </label>
          <label className="text-xs text-slate-500">
            Ngày ban hành <span className="text-red-500">*</span>
            <input type="date" className={field} value={form.issuedDate} onChange={set("issuedDate")} />
            <Err text={errors.issuedDate} />
          </label>
          <label className="text-xs text-slate-500">
            Ngày nhận <span className="text-red-500">*</span>
            <input type="date" className={field} value={form.receivedDate} onChange={set("receivedDate")} />
            <Err text={errors.receivedDate} />
          </label>
          <label className="text-xs text-slate-500">
            Loại công văn
            <select className={field} value={form.type} onChange={set("type")}>
              {Object.entries(DOC_TYPE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Trạng thái
            <select className={field} value={form.status} onChange={set("status")}>
              {Object.entries(DOC_STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Đơn vị phụ trách <span className="text-red-500">*</span>
            <select className={field} value={form.unitId} onChange={set("unitId")}>
              <option value="">— Chọn đơn vị —</option>
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <Err text={errors.unitId} />
          </label>
          <label className="text-xs text-slate-500">
            Hạn xử lý
            <input type="date" className={field} value={form.deadline} onChange={set("deadline")} />
            <Err text={errors.deadline} />
          </label>
          <label className="text-xs text-slate-500">
            Người/bộ phận phụ trách
            <input className={field} value={form.assignedTo} onChange={set("assignedTo")} />
          </label>
          <label className="text-xs text-slate-500 sm:col-span-2">
            Ghi chú
            <textarea className={field + " min-h-[50px]"} value={form.note} onChange={set("note")} />
          </label>

          <div className="flex justify-end gap-3 pt-2 sm:col-span-2">
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

function ForwardModal({ doc, onClose, onDone }: { doc: IncomingDoc; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [toUnitId, setToUnitId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const units = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  // fetchUnits() đã lọc theo đúng phạm vi địa bàn của người dùng ở server rồi
  const unitOptions = (units.data ?? []).filter((u) => u.id !== doc.unitId);

  const forward = useMutation({
    mutationFn: () => forwardDocument(doc.id, toUnitId, note),
    onSuccess: (r) => {
      toast("success", r.message);
      onDone();
    },
    onError: (err) => {
      const e = parseApiError(err);
      setError(e.fields.toUnitId || e.message);
    },
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded bg-white p-5 shadow-xl sm:p-6">
        <h2 className="mb-1 text-lg text-slate-800">Chuyển tiếp công văn</h2>
        <p className="mb-4 text-sm text-slate-500">
          {doc.number} — đang ở <b>{doc.unit.name}</b>
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
            Chuyển đến đơn vị <span className="text-red-500">*</span>
            <select className={field} value={toUnitId} onChange={(e) => setToUnitId(e.target.value)}>
              <option value="">— Chọn đơn vị —</option>
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-500">
            Ghi chú
            <textarea className={field + " min-h-[50px]"} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <Err text={error} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={forward.isPending} className="w-28 rounded-sm bg-[#a5a5a5] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
              Hủy
            </button>
            <button type="submit" disabled={forward.isPending || !toUnitId} className="w-28 rounded-sm bg-[#3d7ebf] py-2 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-60">
              {forward.isPending ? "Đang gửi..." : "Chuyển"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDoneModal({ doc, onClose, onDone }: { doc: IncomingDoc; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [resultNote, setResultNote] = useState("");
  const [error, setError] = useState("");

  const confirm = useMutation({
    mutationFn: () => confirmDocument(doc.id, resultNote),
    onSuccess: (r) => {
      toast("success", r.message);
      onDone();
    },
    onError: (err) => setError(parseApiError(err).message),
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded bg-white p-5 shadow-xl sm:p-6">
        <h2 className="mb-1 text-lg text-slate-800">Xác nhận đã thực hiện</h2>
        <p className="mb-4 text-sm text-slate-500">
          {doc.number} — {doc.unit.name}. Sau khi xác nhận sẽ không sửa hay chuyển tiếp được nữa.
        </p>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            setError("");
            confirm.mutate();
          }}
          noValidate
          className="space-y-3"
        >
          <label className="block text-xs text-slate-500">
            Kết quả thực hiện
            <textarea
              className={field + " min-h-[70px]"}
              placeholder="Ví dụ: đã tổ chức 2 buổi sinh hoạt, 40 đoàn viên tham gia..."
              value={resultNote}
              onChange={(e) => setResultNote(e.target.value)}
            />
          </label>
          <Err text={error} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={confirm.isPending} className="w-28 rounded-sm bg-[#a5a5a5] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
              Hủy
            </button>
            <button type="submit" disabled={confirm.isPending} className="w-28 rounded-sm bg-[#1b7a3a] py-2 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-60">
              {confirm.isPending ? "Đang lưu..." : "Xác nhận"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Documents() {
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [draft, setDraft] = useState({ number: "", status: "", type: "" });
  const [applied, setApplied] = useState({ number: "", status: "", type: "", page: 1 });
  const [modal, setModal] = useState<{ doc?: IncomingDoc } | null>(null);
  const [toDelete, setToDelete] = useState<IncomingDoc | null>(null);
  const [toForward, setToForward] = useState<IncomingDoc | null>(null);
  const [toConfirm, setToConfirm] = useState<IncomingDoc | null>(null);

  // Đúng quy tắc phía server: chỉ đơn vị đang phụ trách mới xác nhận được; ADMIN xác nhận được mọi nơi.
  const canConfirm = (d: IncomingDoc) => user?.role === "ADMIN" || user?.unit?.id === d.unitId;

  const list = useQuery({
    queryKey: ["documents", applied],
    queryFn: () => fetchDocuments({ ...applied, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["documents"] });

  const remove = useMutation({
    mutationFn: (d: IncomingDoc) => deleteDocument(d.id),
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
      <h1 className="border-b px-4 py-4 text-xl font-light text-slate-800 sm:px-9 sm:text-2xl">Nhận công văn</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ ...draft, page: 1 });
        }}
        className="flex flex-wrap items-end gap-4 px-4 pt-5 sm:px-[43px]"
      >
        <label className="min-w-[200px] flex-1 text-xs text-slate-500">
          Số công văn
          <input className={field} value={draft.number} onChange={(e) => setDraft({ ...draft, number: e.target.value })} />
        </label>
        <label className="w-full text-xs text-slate-500 sm:w-44">
          Loại
          <select className={field} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            <option value="">Tất cả</option>
            {Object.entries(DOC_TYPE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="w-full text-xs text-slate-500 sm:w-44">
          Trạng thái
          <select className={field} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option value="">Tất cả</option>
            {Object.entries(DOC_STATUS_LABEL).map(([v, l]) => (
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
            setDraft({ number: "", status: "", type: "" });
            setApplied({ number: "", status: "", type: "", page: 1 });
          }}
          className="flex-1 rounded-sm bg-[#a5a5a5] py-2 text-xs font-bold uppercase text-white hover:opacity-90 sm:w-28 sm:flex-none"
        >
          Làm mới
        </button>
      </form>

      <div className="px-4 py-5 sm:px-[43px]">
        <button onClick={() => setModal({})} className="mb-4 w-full rounded-sm bg-[#2196f3] py-2.5 text-xs font-bold uppercase text-white hover:opacity-90 sm:w-auto sm:px-6">
          + Nhận công văn mới
        </button>

        <div className="grid gap-3 lg:hidden">
          {items.map((d) => (
            <div key={d.id} className="rounded border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold">{d.number}</div>
                  <div className="text-[13px] text-slate-600">{d.summary}</div>
                </div>
                <span className={`shrink-0 text-xs font-medium ${STATUS_COLOR[d.status]}`}>{DOC_STATUS_LABEL[d.status]}</span>
              </div>
              <dl className="mt-2 grid grid-cols-[100px_1fr] gap-x-2 gap-y-1 text-[13px]">
                <dt className="text-slate-500">Nơi gửi</dt>
                <dd>{d.sender}</dd>
                <dt className="text-slate-500">Loại</dt>
                <dd>{DOC_TYPE_LABEL[d.type]}</dd>
                <dt className="text-slate-500">Đơn vị</dt>
                <dd>
                  {d.unit.name}
                  {!!d._count?.forwards && <span className="ml-1 text-xs text-slate-400">(đã chuyển {d._count.forwards} lần)</span>}
                </dd>
                <dt className="text-slate-500">Ngày nhận</dt>
                <dd>{formatDate(d.receivedDate)}</dd>
                {d.deadline && (
                  <>
                    <dt className="text-slate-500">Hạn xử lý</dt>
                    <dd>{formatDate(d.deadline)}</dd>
                  </>
                )}
              </dl>
              {d.confirmedAt ? (
                <p className="mt-2 text-xs font-medium text-green-700">
                  ✓ Đã xác nhận thực hiện — {formatDate(d.confirmedAt)} bởi {d.confirmedBy?.fullName ?? d.confirmedBy?.username}
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setModal({ doc: d })} className="flex-1 rounded-sm bg-[#1e88e5] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
                    Sửa
                  </button>
                  <button onClick={() => setToForward(d)} className="flex-1 rounded-sm bg-[#8e44ad] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
                    Chuyển tiếp
                  </button>
                  {canConfirm(d) && (
                    <button onClick={() => setToConfirm(d)} className="flex-1 rounded-sm bg-[#1b7a3a] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
                      Xác nhận
                    </button>
                  )}
                  <button onClick={() => setToDelete(d)} className="flex-1 rounded-sm bg-[#c0392b] py-2 text-xs font-bold uppercase text-white hover:opacity-90">
                    Xóa
                  </button>
                </div>
              )}
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
              <th className={HEAD + " text-left"}>Số công văn</th>
              <th className={HEAD + " text-left"}>Trích yếu</th>
              <th className={HEAD}>Nơi gửi</th>
              <th className={HEAD}>Loại</th>
              <th className={HEAD}>Đơn vị</th>
              <th className={HEAD}>Ngày nhận</th>
              <th className={HEAD}>Hạn xử lý</th>
              <th className={HEAD}>Trạng thái</th>
              <th className={HEAD + " w-56"}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d, idx) => (
              <tr key={d.id} className="border-b hover:bg-slate-50">
                <td className={CELL + " text-center"}>{(applied.page - 1) * PAGE_SIZE + idx + 1}</td>
                <td className={CELL + " font-medium"}>{d.number}</td>
                <td className={CELL + " max-w-[280px]"}>{d.summary}</td>
                <td className={CELL + " text-center"}>{d.sender}</td>
                <td className={CELL + " text-center"}>{DOC_TYPE_LABEL[d.type]}</td>
                <td className={CELL + " text-center"}>
                  {d.unit.name}
                  {!!d._count?.forwards && <div className="text-xs text-slate-400">(đã chuyển {d._count.forwards} lần)</div>}
                </td>
                <td className={CELL + " text-center"}>{formatDate(d.receivedDate)}</td>
                <td className={CELL + " text-center"}>{d.deadline ? formatDate(d.deadline) : "—"}</td>
                <td className={CELL + " text-center"}>
                  <span className={STATUS_COLOR[d.status]}>{DOC_STATUS_LABEL[d.status]}</span>
                  {d.confirmedAt && <div className="mt-0.5 text-xs text-green-700">✓ Đã xác nhận</div>}
                </td>
                <td className={CELL}>
                  {d.confirmedAt ? (
                    <div className="text-center text-xs text-slate-400" title={d.resultNote ?? undefined}>
                      {formatDate(d.confirmedAt)}<br />{d.confirmedBy?.fullName ?? d.confirmedBy?.username}
                    </div>
                  ) : (
                    <div className="flex flex-wrap justify-center gap-1.5">
                      <button onClick={() => setModal({ doc: d })} className="rounded-sm bg-[#1e88e5] px-2.5 py-1.5 text-xs font-bold uppercase text-white hover:opacity-90">
                        Sửa
                      </button>
                      <button onClick={() => setToForward(d)} className="rounded-sm bg-[#8e44ad] px-2.5 py-1.5 text-xs font-bold uppercase text-white hover:opacity-90">
                        Chuyển
                      </button>
                      {canConfirm(d) && (
                        <button onClick={() => setToConfirm(d)} className="rounded-sm bg-[#1b7a3a] px-2.5 py-1.5 text-xs font-bold uppercase text-white hover:opacity-90">
                          Xác nhận
                        </button>
                      )}
                      <button onClick={() => setToDelete(d)} className="rounded-sm bg-[#c0392b] px-2.5 py-1.5 text-xs font-bold uppercase text-white hover:opacity-90">
                        Xóa
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!list.isFetching && items.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                  {list.isError ? "Không thể tải dữ liệu" : "Không tìm thấy kết quả"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>{list.isFetching ? "Đang tải..." : `Tổng ${total} công văn · Trang ${applied.page}/${pages}`}</span>
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
          doc={modal.doc}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            refresh();
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog title="Bạn có chắc chắn xóa công văn này ?" busy={remove.isPending} onCancel={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete)}>
          <p className="font-medium text-slate-800">{toDelete.number}</p>
          <p>{toDelete.summary}</p>
        </ConfirmDialog>
      )}

      {toForward && (
        <ForwardModal
          doc={toForward}
          onClose={() => setToForward(null)}
          onDone={() => {
            setToForward(null);
            refresh();
          }}
        />
      )}

      {toConfirm && (
        <ConfirmDoneModal
          doc={toConfirm}
          onClose={() => setToConfirm(null)}
          onDone={() => {
            setToConfirm(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
