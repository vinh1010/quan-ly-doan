import { api } from "./axios";

export interface AuthUser {
  id: number;
  username: string;
  role: "ADMIN" | "SUPERIOR" | "SECRETARY";
  fullName: string | null;
  unit: { id: number; name: string } | null;
}

export interface LoginPayload {
  username: string;
  password: string;
  role?: AuthUser["role"];
}

export const loginApi = (payload: LoginPayload) =>
  api.post<{ token: string; user: AuthUser }>("/auth/login", payload).then((r) => r.data);

export const meApi = () => api.get<{ user: AuthUser }>("/auth/me").then((r) => r.data.user);

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const changePasswordApi = (payload: ChangePasswordPayload) =>
  api.post<{ message: string }>("/auth/change-password", payload).then((r) => r.data);

export const logoutApi = () => api.post("/auth/logout");
