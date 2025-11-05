import { AxiosError } from 'axios';
import { showError } from './toast';

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  ERR_NETWORK: 'Erreur de connexion. Veuillez vérifier votre connexion Internet.',
  ERR_CONNECTION_REFUSED: 'Impossible de se connecter au serveur. Veuillez réessayer plus tard.',
  ERR_TIMEOUT: 'La requête a expiré. Veuillez réessayer.',

  // HTTP errors
  400: 'Requête invalide. Veuillez vérifier vos données.',
  401: 'Session expirée. Veuillez vous reconnecter.',
  403: "Vous n'avez pas la permission d'effectuer cette action.",
  404: 'Ressource introuvable.',
  409: 'Conflit détecté. La ressource existe déjà.',
  422: 'Données invalides. Veuillez vérifier les champs.',
  429: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
  500: 'Erreur serveur. Veuillez réessayer plus tard.',
  502: 'Service temporairement indisponible.',
  503: 'Service en maintenance. Veuillez réessayer plus tard.',
  504: 'Le serveur met trop de temps à répondre.',

  // Generic
  UNKNOWN: 'Une erreur inattendue est survenue. Veuillez réessayer.',
};

interface ErrorResponse {
  message?: string;
  error?: string;
  statusCode?: number;
}

// Get user-friendly error message
export const getErrorMessage = (error: unknown): string => {
  // If it's an Axios error
  if (error instanceof AxiosError) {
    // Check for network errors
    if (error.code === 'ERR_NETWORK') {
      return ERROR_MESSAGES.ERR_NETWORK;
    }

    if (error.code === 'ECONNREFUSED') {
      return ERROR_MESSAGES.ERR_CONNECTION_REFUSED;
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ERR_TIMEOUT') {
      return ERROR_MESSAGES.ERR_TIMEOUT;
    }

    // Check for HTTP status errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as ErrorResponse;

      // Use backend error message if available and user-friendly
      if (data?.message && data.message.length < 200) {
        return data.message;
      }

      // Use predefined message for status code
      if (ERROR_MESSAGES[status]) {
        return ERROR_MESSAGES[status];
      }
    }
  }

  // If it's a regular Error object
  if (error instanceof Error) {
    return error.message || ERROR_MESSAGES.UNKNOWN;
  }

  // If it's a string
  if (typeof error === 'string') {
    return error;
  }

  // Default fallback
  return ERROR_MESSAGES.UNKNOWN;
};

// Handle and display error
export const handleError = (error: unknown, customMessage?: string) => {
  const message = customMessage || getErrorMessage(error);
  showError(message);

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('Error:', error);
  }
};

// Validate form fields
export const validateField = (
  fieldName: string,
  value: string,
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: string) => boolean;
  }
): string | null => {
  // Required validation
  if (rules.required && !value.trim()) {
    return `Le champ ${fieldName} est requis.`;
  }

  // Min length validation
  if (rules.minLength && value.length < rules.minLength) {
    return `${fieldName} doit contenir au moins ${rules.minLength} caractères.`;
  }

  // Max length validation
  if (rules.maxLength && value.length > rules.maxLength) {
    return `${fieldName} ne doit pas dépasser ${rules.maxLength} caractères.`;
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(value)) {
    return `Format de ${fieldName} invalide.`;
  }

  // Custom validation
  if (rules.custom && !rules.custom(value)) {
    return `Validation de ${fieldName} échouée.`;
  }

  return null;
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password strength validation
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Au moins 8 caractères');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Au moins une majuscule');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Au moins une minuscule');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Au moins un chiffre');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Au moins un caractère spécial');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Retry mechanism for failed requests
export const retryRequest = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
};
