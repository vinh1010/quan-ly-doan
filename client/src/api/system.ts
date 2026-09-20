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

export const fetchAccounts = (f: AccountFilters) =>
  api.get<{ items: Account[]; total: number }>("/accounts", { params: clean(f) }).then((r) => r.data);

export const setAccountStatus = (id: number, status: AccountStatus) =>
  api.patch<{ message: string; status: AccountStatus }>(`/accounts/${id}/status`, { status }).then((r) => r.data);

export const fetchAuditLogs = (f: AuditFilters) =>
  api.get<{ items: AuditLog[]; total: number }>("/audit-logs", { params: clean(f) }).then((r) => r.data);
