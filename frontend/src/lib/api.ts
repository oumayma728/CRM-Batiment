import axios from 'axios';
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = configuredBaseUrl
  ? configuredBaseUrl.replace(/\/+$/, '')
  : '/api';

// Retry configuration: handles backend cold-start (ECONNREFUSED / Network Error)
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1500; // start at 1.5 s, doubles each attempt

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

interface RetryConfig extends AxiosRequestConfig {
  _retryCount?: number;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 10000, // 10 s per attempt
});

// Intercepteur : injecte le JWT dans chaque requête
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur : retry sur erreur réseau + redirige vers /login si 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config: RetryConfig = error.config ?? {};

    // Network error = backend not ready yet (ECONNREFUSED, timeout, no response)
    // Also retry on 503 = Vite proxy couldn't reach the backend yet
    const isNetworkError = !error.response;
    const isBackendNotReady = error.response?.status === 503;

    if ((isNetworkError || isBackendNotReady) && config) {
      config._retryCount = config._retryCount ?? 0;

      if (config._retryCount < MAX_RETRIES) {
        config._retryCount += 1;
        const delay = RETRY_DELAY_MS * config._retryCount; // 1.5s, 3s, 4.5s, 6s, 7.5s
        console.warn(
          `[API] Network error — retry ${config._retryCount}/${MAX_RETRIES} in ${delay}ms…`,
        );
        await sleep(delay);
        return api(config);
      }
    }

    // HTTP 401 — token expired or invalid
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default api;
