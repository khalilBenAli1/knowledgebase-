import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('Token de vérification manquant');
        return;
      }

      try {
        await api.post('/auth/verify-email', { token });
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(
          err.response?.data?.message ||
          'Erreur lors de la vérification de l\'email. Le lien est peut-être expiré.'
        );
      }
    };

    verifyEmail();
  }, [token]);

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMessage('');

    try {
      // Assuming there's an endpoint to resend verification email
      await api.post('/auth/resend-verification');
      setResendMessage('Email de vérification renvoyé avec succès!');
    } catch (err: any) {
      setResendMessage(
        err.response?.data?.message ||
        'Erreur lors de l\'envoi de l\'email de vérification'
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-biat-50 to-biat-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-block bg-biat-primary p-4 rounded-2xl mb-4 shadow-lg">
            <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-biat-primary mb-2">
            Assurances BIAT
          </h1>
          <p className="text-biat-secondary/70 dark:text-gray-300 text-lg">
            Vérification de l'email
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl dark:shadow-gray-900/50 p-8 border border-biat-100 dark:border-gray-700">
          {status === 'loading' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 mb-6">
                <svg
                  className="animate-spin h-20 w-20 text-biat-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-biat-primary mb-2">
                Vérification en cours...
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Veuillez patienter pendant que nous vérifions votre email.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
                <svg
                  className="w-12 h-12 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-green-600 dark:text-green-400 mb-2">
                Email vérifié avec succès!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Votre adresse email a été vérifiée. Vous pouvez maintenant vous connecter.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full bg-biat-primary hover:bg-biat-accent text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Se connecter
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
                <svg
                  className="w-12 h-12 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-red-600 dark:text-red-400 mb-2">
                Vérification échouée
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {errorMessage}
              </p>

              {resendMessage && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  resendMessage.includes('succès')
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-400'
                }`}>
                  {resendMessage}
                </div>
              )}

              <button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="w-full bg-biat-primary hover:bg-biat-accent text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mb-4"
              >
                {resendLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Envoi en cours...
                  </span>
                ) : (
                  'Renvoyer l\'email de vérification'
                )}
              </button>

              <Link
                to="/login"
                className="block text-center text-biat-primary hover:text-biat-accent font-medium transition-colors"
              >
                Retour à la connexion
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-biat-secondary/60 dark:text-gray-400">
          <p>© 2025 Assurances BIAT. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
}
