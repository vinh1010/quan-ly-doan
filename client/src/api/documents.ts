import { api } from "./axios";

export type DocType = "CHI_DAO" | "THONG_BAO" | "MOI_HOP" | "KHAC";
export type DocStatus = "CHUA_XU_LY" | "DANG_XU_LY" | "DA_XU_LY";

export interface IncomingDoc {
  id: number;
  number: string;
  summary: string;
  sender: string;
  issuedDate: string;
  receivedDate: string;
  type: DocType;
  status: DocStatus;
  deadline: string | null;
  assignedTo: string | null;
  note: string | null;
  unitId: number;
  unit: { id: number; name: string; level: string };
  createdBy: { id: number; username: string; fullName: string | null };
  createdAt: string;
  updatedAt: string;
}

export interface DocFilters {
  number?: string;
  status?: string;
  type?: string;
  unitId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export interface DocInput {
  number: string;
  summary: string;
  sender: string;
  issuedDate: string;
  receivedDate: string;
  type: DocType;
  status: DocStatus;
  deadline: string;
  assignedTo: string;
  note: string;
  unitId: string;
}

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined));

export const fetchDocuments = (f: DocFilters) =>
  api
    .get<{ items: IncomingDoc[]; total: number; page: number; pageSize: number }>("/documents", { params: clean(f) })
    .then((r) => r.data);

export const fetchDocument = (id: number) => api.get<{ item: IncomingDoc }>(`/documents/${id}`).then((r) => r.data.item);

export const createDocument = (v: DocInput) => api.post<{ message: string }>("/documents", v).then((r) => r.data);

export const updateDocument = (id: number, v: DocInput) =>
  api.put<{ message: string }>(`/documents/${id}`, v).then((r) => r.data);

export const deleteDocument = (id: number) => api.delete<{ message: string }>(`/documents/${id}`).then((r) => r.data);
