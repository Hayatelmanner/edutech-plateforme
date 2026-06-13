// frontend/src/services/api.js
// Centralized Axios instance: adds JWT to every request automatically.
import axios from 'axios';

// ⚙️ URL dynamique : utilise VITE_API_URL en production (Vercel),
//    fallback sur localhost en développement local.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach token from localStorage to each request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Force redirect
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// 📂 Base URL pour les fichiers statiques (PDFs uploadés)
// Dérivée automatiquement de l'URL de l'API (sans le /api final)
const SERVER_BASE = API_BASE_URL.replace(/\/api\/?$/, '');
export const FILES_URL = `${SERVER_BASE}/uploads`;

export default api;