import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  withCredentials: true
});

export const ACCESS_TOKEN_STORAGE_KEY = "itcommerce_dashboard_token";
export const REFRESH_TOKEN_STORAGE_KEY = "itcommerce_dashboard_refresh_token";
export const DEVICE_ID_STORAGE_KEY = "itcommerce_dashboard_device_id";

/** Base URL del backend sin /api (para imágenes en /uploads) */
export function getApiBase() {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  return base.replace(/\/api\/?$/, "") || "http://localhost:5000";
}

/** Convierte imageUrl del producto (ruta o URL) en URL para <img src>. Usa proxy /api-uploads en el frontend para evitar CORS. */
export function getProductImageUrl(imageUrl) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  const path = imageUrl.startsWith("/") ? imageUrl : "/" + imageUrl;
  if (typeof window !== "undefined") return "/api-uploads" + path.replace(/^\/uploads/, "");
  const base = getApiBase();
  return base + path;
}

let onUnauthorized = () => {};
let onAccessTokenChanged = () => {};
let refreshPromise = null;

export function setOnUnauthorized(fn) {
  onUnauthorized = typeof fn === "function" ? fn : () => {};
}

export function setOnAccessTokenChanged(fn) {
  onAccessTokenChanged = typeof fn === "function" ? fn : () => {};
}

export function getAuthSession() {
  if (typeof window === "undefined") return { accessToken: "", refreshToken: "", deviceId: "" };
  try {
    return {
      accessToken: localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) || "",
      refreshToken: localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || "",
      deviceId: localStorage.getItem(DEVICE_ID_STORAGE_KEY) || ""
    };
  } catch {
    return { accessToken: "", refreshToken: "", deviceId: "" };
  }
}

export function setAuthSession({ accessToken = "", refreshToken = "", deviceId = "" } = {}) {
  if (typeof window === "undefined") return;
  try {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
    else localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    if (deviceId) localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
    else localStorage.removeItem(DEVICE_ID_STORAGE_KEY);
  } catch {
    // ignore
  }
  onAccessTokenChanged(accessToken || "");
}

export function clearAuthSession() {
  setAuthSession({ accessToken: "", refreshToken: "", deviceId: "" });
}

export const getCsrfToken = () => {
  if (typeof document === "undefined") return "";
  const found = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("csrfToken="));
  return found ? decodeURIComponent(found.split("=")[1]) : "";
};

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();
  if (["post", "put", "patch", "delete"].includes(method)) {
    const token = getCsrfToken();
    if (token) config.headers["x-csrf-token"] = token;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status;
    const originalRequest = err.config || {};
    if (status !== 401) return Promise.reject(err);
    if (originalRequest.__skipAuthRefresh) return Promise.reject(err);

    const reqUrl = String(originalRequest.url || "");
    const isAuthEndpoint = reqUrl.includes("/auth/login") || reqUrl.includes("/auth/register") || reqUrl.includes("/auth/client-access");
    if (isAuthEndpoint) return Promise.reject(err);

    if (!originalRequest._retry) {
      originalRequest._retry = true;
      const { refreshToken, deviceId } = getAuthSession();
      if (refreshToken && deviceId) {
        try {
          if (!refreshPromise) {
            refreshPromise = api.post(
              "/auth/refresh",
              { refreshToken, deviceId },
              { __skipAuthRefresh: true }
            );
          }
          const { data } = await refreshPromise;
          const newAccessToken = data?.accessToken || "";
          const newRefreshToken = data?.refreshToken || refreshToken;
          const newDeviceId = data?.deviceId || deviceId;
          if (!newAccessToken) throw new Error("No se recibió access token");

          setAuthSession({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            deviceId: newDeviceId
          });

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch {
          clearAuthSession();
          onUnauthorized();
          return Promise.reject(err);
        } finally {
          refreshPromise = null;
        }
      }
    }

    clearAuthSession();
    onUnauthorized();
    return Promise.reject(err);
  }
);

export const withAuth = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});
