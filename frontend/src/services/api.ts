import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';
import { handleError, getErrorMessage } from '../utils/errorHandler';
import { showError } from '../utils/toast';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Check if it's a network error
    if (!error.response) {
      // Network error, timeout, or CORS issue
      if (error.code === 'ECONNABORTED') {
        showError('La requête a expiré. Veuillez réessayer.');
      } else if (error.code === 'ERR_NETWORK') {
        showError('Erreur de connexion. Veuillez vérifier votre connexion Internet.');
      } else {
        showError('Impossible de se connecter au serveur. Veuillez réessayer.');
      }
      return Promise.reject(error);
    }

    // Handle specific HTTP status codes
    const status = error.response.status;

    switch (status) {
      case 401:
        // Unauthorized - logout and redirect to login
        useAuthStore.getState().logout();
        window.location.href = '/login';
        showError('Session expirée. Veuillez vous reconnecter.');
        break;

      case 403:
        // Forbidden
        showError("Vous n'avez pas la permission d'effectuer cette action.");
        break;

      case 404:
        // Not found - don't show toast for all 404s, let component handle it
        console.warn('Resource not found:', error.config?.url);
        break;

      case 422:
        // Validation error
        const validationMessage = getErrorMessage(error);
        showError(validationMessage);
        break;

      case 429:
        // Too many requests
        showError('Trop de requêtes. Veuillez patienter avant de réessayer.');
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        // Server errors
        showError('Erreur serveur. Veuillez réessayer plus tard.');
        break;

      default:
        // Other errors - use the error message from backend if available
        const message = getErrorMessage(error);
        if (status !== 404) {
          // Don't show errors for 404s globally
          showError(message);
        }
    }

    return Promise.reject(error);
  }
);

// Helper function to handle API errors in components
export const handleApiError = (error: unknown, customMessage?: string) => {
  handleError(error, customMessage);
};

export default api;
