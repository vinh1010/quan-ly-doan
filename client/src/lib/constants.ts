export const GENDER_LABEL = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" } as const;
export const POSITION_LABEL = { BI_THU: "Bí thư Đoàn cơ sở", PHO_BI_THU: "Phó Bí thư" } as const;
export const STATUS_LABEL = { ACTIVE: "Đang hoạt động", ENDED: "Đã kết thúc" } as const;
export const ACCOUNT_STATUS_LABEL = { ACTIVE: "Kích hoạt", LOCKED: "Tạm khóa" } as const;

/** "2024-01-01T00:00:00.000Z" -> "01/01/2024" */
export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** ISO -> giá trị cho <input type="date"> */
export const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");
