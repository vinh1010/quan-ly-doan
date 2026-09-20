import { api } from "./axios";

export type Gender = "MALE" | "FEMALE" | "OTHER";
export type Position = "BI_THU" | "PHO_BI_THU";
export type SecretaryStatus = "ACTIVE" | "ENDED";

export interface UnitOption {
  id: number;
  name: string;
  level: string;
  parentId: number | null;
}

export interface Secretary {
  id: number;
  fullName: string;
  dob: string;
  gender: Gender;
  phone: string;
  email: string | null;
  cccd: string;
  cccdIssuedDate: string | null;
  cccdIssuedPlace: string | null;
  ethnicity: string | null;
  religion: string | null;
  address: string | null;
  education: string | null;
  training: string | null;
  maritalStatus: string | null;
  memberCode: string | null;
  politicalTheory: string | null;
  itLevel: string | null;
  language: string | null;
  hometownProvince: string | null;
  hometownWard: string | null;
  residenceProvince: string | null;
  residenceWard: string | null;
  unionJoinDate: string | null;
  unionJoinPlace: string | null;
  cardIssuePlace: string | null;
  partyJoinDate: string | null;
  partyPosition: string | null;
  association: string | null;
  occupation: string | null;
  position: Position;
  termStart: string;
  termEnd: string | null;
  termLabel: string | null;
  status: SecretaryStatus;
  unitId: number;
  unit: { id: number; name: string; parent?: { id: number; name: string } | null };
  user: { id: number; username: string; status: "ACTIVE" | "LOCKED" } | null;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SecretaryFilters {
  name?: string;
  phone?: string;
  cccd?: string;
  unitId?: string;
  status?: string;
  termFrom?: string;
  termTo?: string;
  page: number;
  pageSize: number;
}

export interface SecretaryInput {
  fullName: string;
  dob: string;
  gender: Gender | "";
  phone: string;
  email: string;
  cccd: string;
  cccdIssuedDate: string;
  cccdIssuedPlace: string;
  ethnicity: string;
  religion: string;
  address: string;
  education: string;
  training: string;
  maritalStatus: string;
  memberCode: string;
  politicalTheory: string;
  itLevel: string;
  language: string;
  hometownProvince: string;
  hometownWard: string;
  residenceProvince: string;
  residenceWard: string;
  unionJoinDate: string;
  unionJoinPlace: string;
  cardIssuePlace: string;
  partyJoinDate: string;
  partyPosition: string;
  association: string;
  occupation: string;
  unitId: string;
  position: Position;
  termStart: string;
  termEnd: string;
  termLabel: string;
  status: SecretaryStatus;
  username: string;
  password: string;
  confirmPassword: string;
  accountStatus: "ACTIVE" | "LOCKED";
}

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined));

export const fetchUnits = (level?: string) =>
  api.get<{ items: UnitOption[] }>("/units", { params: { level } }).then((r) => r.data.items);

export const fetchSecretaries = (f: SecretaryFilters) =>
  api
    .get<{ items: Secretary[]; total: number; page: number; pageSize: number }>("/secretaries", { params: clean(f) })
    .then((r) => r.data);

export const fetchSecretary = (id: number) => api.get<{ item: Secretary }>(`/secretaries/${id}`).then((r) => r.data.item);

export const createSecretary = (v: SecretaryInput) => api.post("/secretaries", v).then((r) => r.data);

export const updateSecretary = (id: number, v: SecretaryInput) => api.put(`/secretaries/${id}`, v).then((r) => r.data);

export const deleteSecretary = (id: number) => api.delete(`/secretaries/${id}`).then((r) => r.data);

/** Lấy thông báo lỗi + lỗi theo từng trường từ phản hồi của server */
export function parseApiError(err: unknown): { message: string; fields: Record<string, string> } {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string> } } })?.response?.data;
  return { message: data?.message ?? "Không thể kết nối máy chủ", fields: data?.errors ?? {} };
}
