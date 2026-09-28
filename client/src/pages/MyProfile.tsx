import { useMutation, useQuery } from "@tanstack/react-query";
import { downloadMySecretaryPdf, fetchMySecretary, parseApiError } from "../api/secretaries";
import Avatar from "../components/Avatar";
import { useToast } from "../components/Toast";
import { formatDate, GENDER_LABEL, POSITION_LABEL, STATUS_LABEL } from "../lib/constants";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 border-b py-2 text-sm sm:grid-cols-[200px_1fr]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value || "—"}</dd>
    </div>
  );
}

/** Chỉ xem, không sửa — Bí thư muốn đổi thông tin thì báo cán bộ Đoàn cấp trên (mục Quản lý Bí thư). */
export default function MyProfile() {
  const toast = useToast();
  const { data: s, isLoading, isError } = useQuery({ queryKey: ["my-secretary"], queryFn: fetchMySecretary });

  const exportPdf = useMutation({
    mutationFn: downloadMySecretaryPdf,
    onError: (err) => toast("error", parseApiError(err).message),
  });

  if (isLoading) return <div className="bg-white p-10 text-center text-slate-500 shadow-sm">Đang tải...</div>;
  if (isError || !s)
    return (
      <div className="bg-white p-10 text-center text-red-600 shadow-sm">
        Không tìm thấy hồ sơ của bạn. Liên hệ cán bộ Đoàn cấp trên nếu đây là nhầm lẫn.
      </div>
    );

  return (
    <div className="print-area bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-9">
        <h1 className="text-xl font-light text-slate-800 sm:text-2xl">Hồ sơ của tôi</h1>
        <div className="no-print flex gap-2">
          <button
            onClick={() => exportPdf.mutate()}
            disabled={exportPdf.isPending}
            className="rounded-sm bg-[#c0392b] px-5 py-2 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-50"
          >
            {exportPdf.isPending ? "Đang tải..." : "Tải PDF"}
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-sm bg-[#3d7ebf] px-5 py-2 text-xs font-bold uppercase text-white hover:opacity-90"
          >
            In hồ sơ
          </button>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-9">
        <div className="mb-6 flex items-center gap-4">
          <Avatar src={s.avatarUrl} name={s.fullName} size={88} />
          <div>
            <p className="text-lg font-bold uppercase text-slate-800">{s.fullName}</p>
            <p className="text-sm text-slate-500">
              {POSITION_LABEL[s.position]} — {s.unit.name}
            </p>
            <p className="text-sm text-slate-500">Trạng thái: {STATUS_LABEL[s.status]}</p>
          </div>
        </div>

        <h2 className="mb-1 mt-6 border-b pb-1 text-sm font-semibold text-slate-700">Thông tin cá nhân</h2>
        <dl>
          <Row label="Ngày sinh" value={formatDate(s.dob)} />
          <Row label="Giới tính" value={GENDER_LABEL[s.gender]} />
          <Row label="Dân tộc" value={s.ethnicity} />
          <Row label="Tôn giáo" value={s.religion} />
          <Row label="CCCD/CMND" value={s.cccd} />
          <Row label="Ngày cấp" value={formatDate(s.cccdIssuedDate)} />
          <Row label="Nơi cấp" value={s.cccdIssuedPlace} />
          <Row label="Số điện thoại" value={s.phone} />
          <Row label="Email" value={s.email} />
          <Row label="Địa chỉ" value={s.address} />
          <Row label="Trình độ văn hóa" value={s.education} />
          <Row label="Trình độ chuyên môn" value={s.training} />
          <Row label="Lý luận chính trị" value={s.politicalTheory} />
          <Row label="Tình trạng hôn nhân" value={s.maritalStatus} />
          <Row label="Nghề nghiệp hiện nay" value={s.occupation} />
        </dl>

        <h2 className="mb-1 mt-6 border-b pb-1 text-sm font-semibold text-slate-700">Quê quán & thường trú</h2>
        <dl>
          <Row label="Quê quán (Tỉnh/thành)" value={s.hometownProvince} />
          <Row label="Quê quán (Xã/phường)" value={s.hometownWard} />
          <Row label="Thường trú (Tỉnh/thành)" value={s.residenceProvince} />
          <Row label="Thường trú (Xã/phường)" value={s.residenceWard} />
        </dl>

        <h2 className="mb-1 mt-6 border-b pb-1 text-sm font-semibold text-slate-700">Đoàn — Đảng</h2>
        <dl>
          <Row label="Mã định danh đoàn viên" value={s.memberCode} />
          <Row label="Thời gian vào Đoàn" value={formatDate(s.unionJoinDate)} />
          <Row label="Nơi vào Đoàn" value={s.unionJoinPlace} />
          <Row label="Nơi cấp thẻ" value={s.cardIssuePlace} />
          <Row label="Thời gian vào Đảng" value={formatDate(s.partyJoinDate)} />
          <Row label="Chức vụ Đảng" value={s.partyPosition} />
        </dl>

        <h2 className="mb-1 mt-6 border-b pb-1 text-sm font-semibold text-slate-700">Nhiệm kỳ</h2>
        <dl>
          <Row label="Bắt đầu nhiệm kỳ" value={formatDate(s.termStart)} />
          <Row label="Kết thúc nhiệm kỳ" value={formatDate(s.termEnd)} />
          <Row label="Nhiệm kỳ" value={s.termLabel} />
        </dl>

        <p className="no-print mt-6 text-xs text-slate-400">
          Thông tin sai hoặc cần cập nhật? Liên hệ cán bộ Đoàn cấp trên của đơn vị để được chỉnh sửa.
        </p>
      </div>
    </div>
  );
}
