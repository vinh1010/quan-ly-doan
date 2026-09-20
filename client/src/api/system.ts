import { api } from "./axios";

export type AccountStatus = "ACTIVE" | "LOCKED";

export interface Account {
  id: number;
  username: string;
  fullName: string | null;
  email: string | null;
  status: AccountStatus;
  lastLoginAt: string | null;
  createdAt: string;
  unit: { id: number; name: string } | null;
  secretary: { id: number; position: "BI_THU" | "PHO_BI_THU"; status: "ACTIVE" | "ENDED"; deletedAt: string | null } | null;
}

export interface AccountFilters {
  search?: string;
  status?: string;
  page: number;
  pageSize: number;
}

export interface AuditLog {
  id: number;
  action: string;
  target: string;
  targetId: number | null;
  detail: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  user: { id: number; username: string; fullName: string | null };
}

export interface AuditFilters {
  action?: string;
  search?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined));

export interface AreaRow {
  unitId: number;
  name: string;
  parentName: string | null;
  secretaries: number;
  deputies: number;
  members: number;
}

export interface AreaReport {
  items: AreaRow[];
  total: { secretaries: number; deputies: number; members: number };
}

export const fetchAreaReport = (unitId?: string) =>
  api.get<AreaReport>("/reports/by-area", { params: clean({ unitId }) }).then((r) => r.data);

/** Tải file Excel (cần gửi kèm token nên không dùng thẻ <a href> trực tiếp) */
export async function downloadReport(unitId?: string) {
  const res = await api.get<Blob>("/reports/export", { params: clean({ unitId }), responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bao-cao-bi-thu-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface Officer {
  id: number;
  username: string;
  fullName: string | null;
  email: string | null;
  role: "ADMIN" | "SUPERIOR";
  status: AccountStatus;
  lastLoginAt: string | null;
  createdAt: string;
  unit: { id: number; name: string; level: string } | null;
}

export interface OfficerInput {
  username: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "SUPERIOR";
  unitId: string;
  password: string;
  confirmPassword: string;
}

export const fetchOfficers = (f: { search?: string; status?: string; page: number; pageSize: number }) =>
  api.get<{ items: Officer[]; total: number }>("/officers", { params: clean(f) }).then((r) => r.data);

export const createOfficer = (v: OfficerInput) => api.post<{ message: string }>("/officers", v).then((r) => r.data);

export const setOfficerStatus = (id: number, status: AccountStatus) =>
  api.patch<{ message: string }>(`/officers/${id}/status`, { status }).then((r) => r.data);

export const resetOfficerPassword = (id: number, password: string, confirmPassword: string) =>
  api.post<{ message: string }>(`/officers/${id}/reset-password`, { password, confirmPassword }).then((r) => r.data);

export const fetchAccounts = (f: AccountFilters) =>
  api.get<{ items: Account[]; total: number }>("/accounts", { params: clean(f) }).then((r) => r.data);

export const setAccountStatus = (id: number, status: AccountStatus) =>
  api.patch<{ message: string; status: AccountStatus }>(`/accounts/${id}/status`, { status }).then((r) => r.data);

export const fetchAuditLogs = (f: AuditFilters) =>
  api.get<{ items: AuditLog[]; total: number }>("/audit-logs", { params: clean(f) }).then((r) => r.data);
