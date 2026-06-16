import axios from 'axios';
import { authManager } from './auth';

export const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Intercepteur pour ajouter le token automatiquement
api.interceptors.request.use((config) => {
  const token = authManager.getToken();
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('✅ Token ajouté à la requête:', config.url);
  } else {
    console.warn('⚠️ Pas de token pour:', config.url);
  }
  
  return config;
});

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => {
    console.log('✅ Succès:', response.config.url, response.status);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.error('🔒 Erreur 401 - Non autorisé');
      
      // Ne pas rediriger en boucle
      if (!window.location.pathname.includes('/login')) {
        authManager.logout();
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;