import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchUnits, parseApiError } from "../api/secretaries";
import { downloadReport, fetchAreaReport } from "../api/system";
import { useToast } from "../components/Toast";

const HEAD = "border border-white/30 px-1.5 py-2 text-center text-xs font-medium sm:px-3 sm:text-[13px]";
const CELL = "px-1.5 py-3 text-xs sm:px-3 sm:text-[13px]";
const field =
  "mt-1 w-full border-0 border-b border-slate-300 bg-transparent py-1 text-sm outline-none focus:border-[#1890ff]";

export default function Reports() {
  const toast = useToast();
  const [unitId, setUnitId] = useState("");

  const units = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const unitOptions = (units.data ?? []).filter((u) => u.level === "HUYEN" || u.level === "XA_PHUONG");
  const report = useQuery({ queryKey: ["report-by-area", unitId], queryFn: () => fetchAreaReport(unitId) });

  const exportXlsx = useMutation({
    mutationFn: () => downloadReport(unitId),
    onSuccess: () => toast("success", "Đã xuất file Excel"),
    onError: (err) => toast("error", parseApiError(err).message),
  });

  const items = report.data?.items ?? [];
  const total = report.data?.total;

  return (
    <div className="print-area bg-white shadow-sm">
      <h1 className="border-b px-4 py-4 text-2xl font-light text-slate-800 sm:px-9">Báo cáo – Thống kê theo khu vực</h1>

      <div className="no-print flex flex-wrap items-end gap-4 px-4 pt-5 sm:px-[43px]">
        <label className="min-w-[240px] max-w-[520px] flex-1 text-xs text-slate-500">
          Khu vực
          <select className={field} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">Tất cả khu vực</option>
            {unitOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => exportXlsx.mutate()}
          disabled={exportXlsx.isPending || items.length === 0}
          className="rounded-sm bg-[#1b7a3a] px-5 py-2 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-50"
        >
          {exportXlsx.isPending ? "Đang xuất..." : "Xuất Excel"}
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-sm bg-[#a5a5a5] px-5 py-2 text-xs font-bold uppercase text-white hover:opacity-90 print:hidden"
        >
          In báo cáo
        </button>
      </div>

      <div className="overflow-x-auto px-4 py-5 sm:px-[43px]">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[#2260cf] text-white">
            <tr>
              <th className={HEAD + " w-10"}>#</th>
              <th className={HEAD + " text-left"}>Khu vực (xã/phường)</th>
              <th className={HEAD}>Số Bí thư</th>
              <th className={HEAD}>Số Phó Bí thư</th>
              <th className={HEAD}>Đoàn viên quản lý</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r, i) => (
              <tr key={r.unitId} className="border-b hover:bg-slate-50">
                <td className={CELL + " text-center"}>{i + 1}</td>
                <td className={CELL}>
                  <div className="font-medium">{r.name}</div>
                  {r.parentName && <div className="text-xs text-slate-400">{r.parentName}</div>}
                </td>
                <td className={CELL + " text-center"}>{r.secretaries}</td>
                <td className={CELL + " text-center"}>{r.deputies}</td>
                <td className={CELL + " text-center"}>{r.members}</td>
              </tr>
            ))}
            {items.length > 0 && total && (
              <tr className="bg-slate-100 font-bold">
                <td className={CELL} colSpan={2}>
                  Tổng cộng
                </td>
                <td className={CELL + " text-center"}>{total.secretaries}</td>
                <td className={CELL + " text-center"}>{total.deputies}</td>
                <td className={CELL + " text-center"}>{total.members}</td>
              </tr>
            )}
            {!report.isFetching && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  {report.isError ? "Không thể tải dữ liệu" : "Không có dữ liệu"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-slate-500">
          Chỉ tính Bí thư và Phó Bí thư đang hoạt động. Đoàn viên quản lý là tổng số đoàn viên của các đơn vị cơ sở thuộc khu vực.
        </p>
      </div>
    </div>
  );
}
