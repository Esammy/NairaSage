import axios from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach access token if present
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
type PendingRequest = {
  resolve: (value?: unknown) => void;
  reject: (error: unknown) => void;
  config: {
    headers: { Authorization?: string };
  } & Record<string, unknown>;
};

let failedQueue: PendingRequest[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.config.headers.Authorization = `Bearer ${token}`;
      p.resolve(axios(p.config));
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refresh = getRefreshToken();
      if (!refresh) {
        clearAuth();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_BASE}/api/auth/token/refresh/`, { refresh });
        const { access } = res.data;
        setTokens(access, refresh);
        processQueue(null, access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return axios(originalRequest);
      } catch (err) {
        processQueue(err, null);
        clearAuth();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
