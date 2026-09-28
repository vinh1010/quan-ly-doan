import { api } from "./axios";

interface Person {
  id: number;
  username: string;
  fullName: string | null;
}

export interface EvalForward {
  id: number;
  fromUnit: { id: number; name: string };
  toUnit: { id: number; name: string };
  forwardedBy: Person;
  note: string | null;
  createdAt: string;
}

export interface MemberEvaluation {
  id: number;
  year: number;
  excellentCount: number;
  goodCount: number;
  fairCount: number;
  averageCount: number;
  weakCount: number;
  note: string | null;
  unitId: number;
  unit: { id: number; name: string; level: string; parentId: number | null };
  createdBy: Person;
  forwards?: EvalForward[];
  _count?: { forwards: number };
  createdAt: string;
  updatedAt: string;
}

export interface EvalFilters {
  year?: string;
  unitId?: string;
  page: number;
  pageSize: number;
}

export interface EvalInput {
  year: string;
  excellentCount: string;
  goodCount: string;
  fairCount: string;
  averageCount: string;
  weakCount: string;
  note: string;
  unitId: string;
}

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined));

export const fetchEvaluations = (f: EvalFilters) =>
  api
    .get<{ items: MemberEvaluation[]; total: number; page: number; pageSize: number }>("/evaluations", { params: clean(f) })
    .then((r) => r.data);

export const createEvaluation = (v: EvalInput) => api.post<{ message: string }>("/evaluations", v).then((r) => r.data);

export const updateEvaluation = (id: number, v: EvalInput) =>
  api.put<{ message: string }>(`/evaluations/${id}`, v).then((r) => r.data);

export const deleteEvaluation = (id: number) => api.delete<{ message: string }>(`/evaluations/${id}`).then((r) => r.data);

export const forwardEvaluation = (id: number, note: string) =>
  api.post<{ item: MemberEvaluation; message: string }>(`/evaluations/${id}/forward`, { note }).then((r) => r.data);
