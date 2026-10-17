import axios, { AxiosError } from "axios";

export const TOKEN_KEY = "darjastock_token";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/login")) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== "/login") {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
      }
    }
    return Promise.reject(error);
  }
);

export function apiError(error: unknown): string {
  const err = error as AxiosError<any>;
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => `${d.loc?.join(".") ?? ""}: ${d.msg}`).join(" | ");
  }
  return err.message || "Kayn mochkil / وقع خطأ غير متوقع";
}

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};
