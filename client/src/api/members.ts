import { api } from "./axios";

export type MemberStatus = "ACTIVE" | "INACTIVE" | "MOVED";

export interface Member {
  id: number;
  fullName: string;
  dob: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  status: MemberStatus;
  note: string | null;
  unitId: number;
  unit: { id: number; name: string; level: string };
  createdAt: string;
  updatedAt: string;
}

export interface MemberFilters {
  name?: string;
  status?: string;
  unitId?: string;
  page: number;
  pageSize: number;
}

export interface MemberInput {
  fullName: string;
  dob: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "";
  status: MemberStatus;
  note: string;
  unitId: string;
}

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined));

export const fetchMembers = (f: MemberFilters) =>
  api
    .get<{ items: Member[]; total: number; page: number; pageSize: number }>("/members", { params: clean(f) })
    .then((r) => r.data);

export const createMember = (v: MemberInput) => api.post<{ item: Member; message: string }>("/members", v).then((r) => r.data);

export const updateMember = (id: number, v: MemberInput) =>
  api.put<{ item: Member; message: string }>(`/members/${id}`, v).then((r) => r.data);

export const deleteMember = (id: number) => api.delete<{ message: string }>(`/members/${id}`).then((r) => r.data);
