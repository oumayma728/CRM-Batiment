import axios from 'axios';
import { authManager } from './auth';
import { createDemoApiResponse } from './demoApi';
import { isDemoToken } from './demoMode';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = authManager.getToken();
  const url = config.url ?? '';
  const isAuthEndpoint =
    url === '/auth/login' ||
    url === '/auth/change-password' ||
    url.startsWith('/auth/login?') ||
    url.startsWith('/auth/change-password?');

  // Check demo mode from localStorage
  const isDemoMode = localStorage.getItem('baticrm_demo_mode') === 'true';

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if ((isDemoToken(token) || isDemoMode) && !isAuthEndpoint) {
    config.adapter = createDemoApiResponse;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      authManager.logout();
    }

    return Promise.reject(error);
  },
);

export default api;
