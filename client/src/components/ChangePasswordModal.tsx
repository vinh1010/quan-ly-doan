import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { changePasswordApi } from "../api/auth";
import { parseApiError } from "../api/secretaries";
import { useToast } from "./Toast";

const input =
  "mt-1 w-full border-0 border-b border-slate-300 bg-transparent py-1.5 text-sm outline-none focus:border-[#1890ff]";

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const change = useMutation({
    mutationFn: () => changePasswordApi(form),
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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    change.mutate();
  };

  const field = (key: keyof typeof form, label: string, autoComplete: string) => (
    <label className="block text-xs text-slate-500">
      {label} <span className="text-red-500">*</span>
      <input
        type="password"
        autoComplete={autoComplete}
        className={input}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
      {errors[key] && <span className="mt-1 block text-xs text-red-600">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded bg-white p-6 shadow-xl">
        <h2 className="text-lg text-slate-800">Đổi mật khẩu</h2>
        {field("currentPassword", "Mật khẩu hiện tại", "current-password")}
        {field("newPassword", "Mật khẩu mới", "new-password")}
        {field("confirmPassword", "Xác nhận mật khẩu mới", "new-password")}
        <p className="text-xs text-slate-400">Tối thiểu 6 ký tự, gồm cả chữ và số.</p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={change.isPending}
            className="w-28 rounded-sm bg-[#a5a5a5] py-2 text-xs font-bold uppercase text-white hover:opacity-90"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={change.isPending}
            className="w-28 rounded-sm bg-[#3d7ebf] py-2 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
          >
            {change.isPending ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </div>
  );
}
