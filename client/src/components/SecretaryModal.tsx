import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createSecretary,
  fetchSecretary,
  fetchUnits,
  parseApiError,
  updateSecretary,
  type Secretary,
  type SecretaryInput,
} from "../api/secretaries";
import { useToast } from "./Toast";
import { toDateInput } from "../lib/constants";

export type ModalMode = "create" | "edit" | "view";

interface Props {
  mode: ModalMode;
  secretaryId?: number;
  cccd?: string; // dùng khi thêm mới (đã nhập ở bước trước)
  unitId?: string;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: SecretaryInput = {
  fullName: "", dob: "", gender: "", phone: "", email: "", cccd: "", cccdIssuedDate: "", cccdIssuedPlace: "",
  ethnicity: "Kinh", religion: "", address: "", education: "", training: "", maritalStatus: "",
  memberCode: "", politicalTheory: "", itLevel: "", language: "",
  hometownProvince: "", hometownWard: "", residenceProvince: "", residenceWard: "",
  unionJoinDate: "", unionJoinPlace: "", cardIssuePlace: "", partyJoinDate: "", partyPosition: "",
  association: "", occupation: "", unitId: "", position: "BI_THU", termStart: "", termEnd: "", termLabel: "",
  status: "ACTIVE", username: "", password: "", confirmPassword: "", accountStatus: "ACTIVE",
};

function fromSecretary(s: Secretary): SecretaryInput {
  const t = (v: string | null) => v ?? "";
  return {
    fullName: s.fullName, dob: toDateInput(s.dob), gender: s.gender, phone: s.phone, email: t(s.email), cccd: s.cccd,
    cccdIssuedDate: toDateInput(s.cccdIssuedDate), cccdIssuedPlace: t(s.cccdIssuedPlace), ethnicity: t(s.ethnicity),
    religion: t(s.religion), address: t(s.address), education: t(s.education), training: t(s.training),
    maritalStatus: t(s.maritalStatus), memberCode: t(s.memberCode), politicalTheory: t(s.politicalTheory),
    itLevel: t(s.itLevel), language: t(s.language), hometownProvince: t(s.hometownProvince),
    hometownWard: t(s.hometownWard), residenceProvince: t(s.residenceProvince), residenceWard: t(s.residenceWard),
    unionJoinDate: toDateInput(s.unionJoinDate), unionJoinPlace: t(s.unionJoinPlace), cardIssuePlace: t(s.cardIssuePlace),
    partyJoinDate: toDateInput(s.partyJoinDate), partyPosition: t(s.partyPosition), association: t(s.association),
    occupation: t(s.occupation), unitId: String(s.unitId), position: s.position, termStart: toDateInput(s.termStart),
    termEnd: toDateInput(s.termEnd), termLabel: t(s.termLabel), status: s.status, username: s.user?.username ?? "",
    password: "", confirmPassword: "", accountStatus: s.user?.status ?? "ACTIVE",
  };
}

const EDUCATION = ["Hệ 12/12", "Hệ 10/10", "Trung học cơ sở", "Tiểu học"];
const TRAINING = ["Sơ cấp", "Trung cấp", "Cao đẳng", "Đại học", "Cử nhân", "Kỹ sư", "Thạc sĩ", "Tiến sĩ"];
const THEORY = ["Sơ cấp", "Trung cấp", "Cao cấp", "Cử nhân"];

const control =
  "w-full border-0 border-b border-slate-300 bg-transparent py-1 text-sm text-slate-900 outline-none focus:border-[#1890ff] disabled:cursor-default disabled:border-dotted disabled:text-slate-500";

function Field({ label, required, error, children, className = "" }: {
  label: string; required?: boolean; error?: string; children: ReactNode; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] text-slate-500">
        {label}
        {required && " (*)"}
      </span>
      {children}
      {error && <span className="mt-0.5 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export default function SecretaryModal({ mode, secretaryId, cccd, unitId, onClose, onSaved }: Props) {
  const toast = useToast();
  const readOnly = mode === "view";
  const [form, setForm] = useState<SecretaryInput>({ ...EMPTY, cccd: cccd ?? "", unitId: unitId ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  const units = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const existing = useQuery({
    queryKey: ["secretary", secretaryId],
    queryFn: () => fetchSecretary(secretaryId!),
    enabled: mode !== "create" && !!secretaryId,
    gcTime: 0,
  });

  useEffect(() => {
    if (existing.data) setForm(fromSecretary(existing.data));
  }, [existing.data]);

  const save = useMutation({
    mutationFn: () => (mode === "create" ? createSecretary(form) : updateSecretary(secretaryId!, form)),
    onSuccess: (r: { message: string }) => {
      toast("success", r.message);
      onSaved();
    },
    onError: (err) => {
      const { message, fields } = parseApiError(err);
      setErrors(fields);
      setFormError(message);
    },
  });

  const set = <K extends keyof SecretaryInput>(k: K) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value as SecretaryInput[K] }));
    setErrors((er) => (er[k] ? { ...er, [k]: "" } : er));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError("");
    save.mutate();
  };

  const text = (k: keyof SecretaryInput, opts: { type?: string; required?: boolean; disabled?: boolean } = {}) => (
    <input
      className={control}
      type={opts.type ?? "text"}
      value={form[k]}
      onChange={set(k)}
      disabled={readOnly || opts.disabled}
      aria-invalid={!!errors[k]}
    />
  );
  const select = (k: keyof SecretaryInput, options: { value: string; label: string }[], blank = "— Chọn —") => (
    <select className={control} value={form[k]} onChange={set(k)} disabled={readOnly}>
      <option value="">{blank}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
  const list = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));
  const err = (k: string) => errors[k];

  const title =
    mode === "create" ? "THÊM MỚI CÁN BỘ ĐOÀN" : mode === "edit" ? "CẬP NHẬT THÔNG TIN CÁN BỘ ĐOÀN" : "THÔNG TIN CÁN BỘ ĐOÀN";
  const loading = mode !== "create" && existing.isLoading;

  return (
    <div className="print-root fixed inset-0 z-30 overflow-y-auto bg-black/40" role="dialog" aria-modal="true">
      <div className="print-area mx-auto my-6 w-full max-w-6xl bg-white shadow-xl">
        <div className="flex items-center justify-between bg-[#eeeeee] px-4 py-5">
          <h2 className="text-lg text-slate-800">{title}</h2>
          <button onClick={onClose} className="no-print text-xl leading-none text-slate-500 hover:text-slate-800" aria-label="Đóng">
            ×
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">Đang tải...</div>
        ) : existing.isError ? (
          <div className="p-10 text-center text-red-600">Không tìm thấy Bí thư</div>
        ) : (
          <form onSubmit={submit} noValidate className="px-8 py-6">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Mã định danh đoàn viên" error={err("memberCode")}>{text("memberCode")}</Field>
              <Field label="Họ tên" required error={err("fullName")}>{text("fullName")}</Field>
              <Field label="Ngày sinh" required error={err("dob")}>{text("dob", { type: "date" })}</Field>
              <Field label="Giới tính" required error={err("gender")}>
                {select("gender", [
                  { value: "MALE", label: "Nam" },
                  { value: "FEMALE", label: "Nữ" },
                  { value: "OTHER", label: "Khác" },
                ])}
              </Field>

              <Field label="Dân tộc" error={err("ethnicity")}>{text("ethnicity")}</Field>
              <Field label="CMND/CCCD" required error={err("cccd")}>
                {text("cccd", { disabled: mode === "create" })}
              </Field>
              <Field label="Ngày cấp" error={err("cccdIssuedDate")}>{text("cccdIssuedDate", { type: "date" })}</Field>
              <Field label="Nơi cấp" error={err("cccdIssuedPlace")}>{text("cccdIssuedPlace")}</Field>

              <Field label="Tôn giáo" error={err("religion")}>{text("religion")}</Field>
              <Field label="Trình độ văn hóa" error={err("education")}>{select("education", list(EDUCATION))}</Field>
              <Field label="Trình độ chuyên môn" error={err("training")}>{select("training", list(TRAINING))}</Field>
              <Field label="Lý luận chính trị" error={err("politicalTheory")}>{select("politicalTheory", list(THEORY))}</Field>

              <Field label="Quê quán (Tỉnh thành)" error={err("hometownProvince")} className="lg:col-span-2">
                {text("hometownProvince")}
              </Field>
              <Field label="Quê quán (Xã phường)" error={err("hometownWard")} className="lg:col-span-2">
                {text("hometownWard")}
              </Field>
              <Field label="Thường trú (Tỉnh thành)" error={err("residenceProvince")} className="lg:col-span-2">
                {text("residenceProvince")}
              </Field>
              <Field label="Thường trú (Xã phường)" error={err("residenceWard")} className="lg:col-span-2">
                {text("residenceWard")}
              </Field>

              <Field label="Trình độ tin học" error={err("itLevel")}>{text("itLevel")}</Field>
              <Field label="Ngoại ngữ" error={err("language")}>{text("language")}</Field>
              <Field label="Nơi vào đoàn" error={err("unionJoinPlace")}>{text("unionJoinPlace")}</Field>
              <Field label="Nơi cấp thẻ" error={err("cardIssuePlace")}>{text("cardIssuePlace")}</Field>

              <Field label="Thời gian vào Đoàn" error={err("unionJoinDate")}>{text("unionJoinDate", { type: "date" })}</Field>
              <Field label="Tổ chức sinh hoạt (Đơn vị cơ sở)" required error={err("unitId")}>
                {select(
                  "unitId",
                  (units.data ?? [])
                    .filter((u) => u.level === "CO_SO" || u.level === "XA_PHUONG")
                    .map((u) => ({ value: String(u.id), label: u.name })),
                )}
              </Field>
              <Field label="Chức vụ trong ban chấp hành" required error={err("position")}>
                {select("position", [
                  { value: "BI_THU", label: "Bí thư" },
                  { value: "PHO_BI_THU", label: "Phó Bí thư" },
                ])}
              </Field>
              <Field label="Hiệp hội" error={err("association")}>{text("association")}</Field>

              <Field label="Thời gian vào Đảng" error={err("partyJoinDate")}>{text("partyJoinDate", { type: "date" })}</Field>
              <Field label="Chức vụ Đảng" error={err("partyPosition")}>{text("partyPosition")}</Field>
              <Field label="Nghề nghiệp hiện nay" error={err("occupation")}>{text("occupation")}</Field>
              <Field label="Điện thoại" required error={err("phone")}>{text("phone")}</Field>

              <Field label="Email" error={err("email")}>{text("email", { type: "email" })}</Field>
              <Field label="Tình trạng hôn nhân" error={err("maritalStatus")}>
                {select("maritalStatus", list(["Độc thân", "Đã kết hôn", "Khác"]))}
              </Field>
              <Field label="Địa chỉ chi tiết" error={err("address")} className="lg:col-span-2">{text("address")}</Field>
            </div>

            <h3 className="mb-3 mt-8 border-b pb-1 text-sm font-semibold text-slate-700">Nhiệm kỳ</h3>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Ngày bắt đầu nhiệm kỳ" required error={err("termStart")}>{text("termStart", { type: "date" })}</Field>
              <Field label="Ngày kết thúc nhiệm kỳ" error={err("termEnd")}>{text("termEnd", { type: "date" })}</Field>
              <Field label="Nhiệm kỳ (vd. 2024 - 2027)" error={err("termLabel")}>{text("termLabel")}</Field>
              <Field label="Trạng thái" required error={err("status")}>
                {select("status", [
                  { value: "ACTIVE", label: "Đang hoạt động" },
                  { value: "ENDED", label: "Đã kết thúc" },
                ])}
              </Field>
            </div>

            <h3 className="mb-3 mt-8 border-b pb-1 text-sm font-semibold text-slate-700">Tài khoản đăng nhập</h3>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Tên đăng nhập" required={mode === "create"} error={err("username")}>
                {text("username", { disabled: mode !== "create" })}
              </Field>
              {!readOnly && (
                <>
                  <Field label={mode === "create" ? "Mật khẩu" : "Mật khẩu mới (để trống nếu không đổi)"} required={mode === "create"} error={err("password")}>
                    <input className={control} type="password" autoComplete="new-password" value={form.password} onChange={set("password")} />
                  </Field>
                  <Field label="Xác nhận mật khẩu" required={mode === "create"} error={err("confirmPassword")}>
                    <input className={control} type="password" autoComplete="new-password" value={form.confirmPassword} onChange={set("confirmPassword")} />
                  </Field>
                </>
              )}
              {mode !== "create" && (
                <Field label="Trạng thái tài khoản">
                  {select("accountStatus", [
                    { value: "ACTIVE", label: "Kích hoạt" },
                    { value: "LOCKED", label: "Tạm khóa" },
                  ])}
                </Field>
              )}
            </div>

            {formError && !Object.values(errors).some(Boolean) && (
              <div className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</div>
            )}
            {formError && Object.values(errors).some(Boolean) && (
              <div className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">Vui lòng kiểm tra lại các trường được đánh dấu</div>
            )}

            <div className="no-print mt-6 flex justify-end gap-2">
              {readOnly && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-sm bg-[#3d7ebf] px-6 py-2 text-xs font-bold uppercase text-white hover:opacity-90"
                >
                  In hồ sơ
                </button>
              )}
              {!readOnly && (
                <button
                  type="submit"
                  disabled={save.isPending}
                  className="rounded-sm bg-[#5cb85c] px-6 py-2 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
                >
                  {save.isPending ? "Đang lưu..." : mode === "create" ? "Lưu thông tin" : "Cập nhật"}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-sm bg-[#a5a5a5] px-6 py-2 text-xs font-bold uppercase text-white hover:opacity-90"
              >
                Đóng
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
