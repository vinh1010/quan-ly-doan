export const GENDER_LABEL = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" } as const;
export const POSITION_LABEL = { BI_THU: "Bí thư Đoàn cơ sở", PHO_BI_THU: "Phó Bí thư" } as const;
export const STATUS_LABEL = { ACTIVE: "Đang hoạt động", ENDED: "Đã kết thúc" } as const;
export const ACCOUNT_STATUS_LABEL = { ACTIVE: "Kích hoạt", LOCKED: "Tạm khóa" } as const;
export const DOC_TYPE_LABEL = { CHI_DAO: "Chỉ đạo", THONG_BAO: "Thông báo", MOI_HOP: "Mời họp", KHAC: "Khác" } as const;
export const DOC_STATUS_LABEL = { CHUA_XU_LY: "Chưa xử lý", DANG_XU_LY: "Đang xử lý", DA_XU_LY: "Đã xử lý" } as const;
export const GRADE_LABEL = { XUAT_SAC: "Xuất sắc", TOT: "Tốt", KHA: "Khá", TRUNG_BINH: "Trung bình", YEU: "Yếu" } as const;
export const ACTION_LABEL: Record<string, string> = {
  LOGIN: "Đăng nhập",
  LOGOUT: "Đăng xuất",
  CHANGE_PASSWORD: "Đổi mật khẩu",
  CREATE: "Thêm mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  VIEW: "Xem chi tiết",
  SEARCH: "Tìm kiếm",
  EXPORT: "Xuất dữ liệu",
  LOCK_ACCOUNT: "Khóa tài khoản",
  UNLOCK_ACCOUNT: "Kích hoạt tài khoản",
};

/** "2024-01-01T10:30:00.000Z" -> "10:30:00 01/01/2024" */
export const formatDateTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { hour12: false });

/** "2024-01-01T00:00:00.000Z" -> "01/01/2024" */
export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** ISO -> giá trị cho <input type="date"> */
export const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");
