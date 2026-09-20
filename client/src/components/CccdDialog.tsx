import { useState, type FormEvent } from "react";

interface Props {
  onCancel: () => void;
  /** Trả về thông báo lỗi nếu CCCD không dùng được, hoặc null nếu hợp lệ. */
  onContinue: (cccd: string) => Promise<string | null>;
}

// Bước 1 của "Thêm mới": nhập số CCCD 12 số của cán bộ đoàn
export default function CccdDialog({ onCancel, onContinue }: Props) {
  const [cccd, setCccd] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{12}$/.test(cccd)) {
      setError("Vui lòng nhập CCCD định dạng 12 số");
      return;
    }
    setBusy(true);
    const msg = await onContinue(cccd);
    setBusy(false);
    if (msg) setError(msg);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-md rounded bg-white p-6 shadow-xl" noValidate>
        <h2 className="text-lg text-slate-800">Nhập số CCCD của Cán bộ đoàn</h2>
        <input
          autoFocus
          inputMode="numeric"
          maxLength={12}
          value={cccd}
          onChange={(e) => {
            setCccd(e.target.value.replace(/\D/g, ""));
            setError("");
          }}
          placeholder="Vui lòng nhập CCCD định dạng 12 số"
          aria-label="Số CCCD"
          className="mt-6 w-full border-b-2 border-[#1890ff] pb-1.5 text-sm outline-none placeholder:text-slate-400"
        />
        <p className="mt-1 h-5 text-xs text-red-600">{error}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded border border-slate-300 px-6 py-1.5 text-sm hover:bg-slate-50">
            Hủy
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded border border-[#1890ff] px-5 py-1.5 text-sm text-[#1890ff] hover:bg-blue-50 disabled:opacity-60"
          >
            {busy ? "Đang kiểm tra..." : "Tiếp tục"}
          </button>
        </div>
      </form>
    </div>
  );
}
