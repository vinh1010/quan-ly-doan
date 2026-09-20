import type { ReactNode } from "react";

interface Props {
  title: string;
  children?: ReactNode;
  busy?: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Theo mẫu tham khảo: "Bạn có chắc chắn xóa ?" — ĐỒNG Ý (cam) / THOÁT (xanh)
export default function ConfirmDialog({ title, children, busy, confirmLabel = "Đồng ý", onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded bg-white p-6 text-center shadow-xl">
        <h2 className="text-base text-slate-800">{title}</h2>
        {children && <div className="mt-3 space-y-1 text-sm text-slate-600">{children}</div>}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={onConfirm}
            disabled={busy}
            className="w-28 rounded-sm bg-[#ff9800] py-2 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Đang xử lý..." : confirmLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={busy}
            className="w-28 rounded-sm bg-[#337ab7] py-2 text-xs font-bold uppercase text-white hover:opacity-90"
          >
            Thoát
          </button>
        </div>
      </div>
    </div>
  );
}
