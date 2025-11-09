import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function VerificationRequiredPage() {
  console.log('VERIFY PAGE: Function component executing (render)');

  // State for email - allows for manual entry if needed
  const [email, setEmail] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEmail, setManualEmail] = useState('');

  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  console.log('VERIFY PAGE: Render - email:', email, 'showManualEntry:', showManualEntry);

  // Initialize email from state or sessionStorage
  useEffect(() => {
    console.log('=== VerificationRequiredPage MOUNTED ===');
    console.log('VERIFY PAGE: Window location:', window.location.href);
    console.log('VERIFY PAGE: Current timestamp:', new Date().toISOString());

    try {
      // Get email from sessionStorage ONLY (more reliable)
      const storedEmail = sessionStorage.getItem('pendingVerificationEmail');

      console.log('VERIFY PAGE: Stored email from sessionStorage:', storedEmail);

      if (storedEmail) {
        console.log('VERIFY PAGE: Using stored email:', storedEmail);
        setEmail(storedEmail);
        setShowManualEntry(false);
        console.log('VERIFY PAGE: Email set, showManualEntry=false');
      } else {
        // No email found, show manual entry option
        console.log('VERIFY PAGE: No email found, showing manual entry form');
        setShowManualEntry(true);
      }
    } catch (error) {
      console.error('VERIFY PAGE: Error in useEffect:', error);
    }

    console.log('VERIFY PAGE: Setup complete - page should now stay visible');
  }, []);

  // Countdown timer for cooldown
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const handleResendVerification = async () => {
    if (!email) return;

    setResendLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const response = await api.post('/auth/resend-verification', { email });
      setMessage(response.data.message || 'Email de vérification envoyé avec succès!');
      setMessageType('success');
      setCooldownSeconds(60); // Start 60 second cooldown
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Erreur lors de l\'envoi de l\'email de vérification';
      setMessage(errorMsg);
      setMessageType('error');

      // Extract cooldown seconds from error message if present
      const match = errorMsg.match(/(\d+) secondes/);
      if (match) {
        setCooldownSeconds(parseInt(match[1]));
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleManualEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualEmail && manualEmail.includes('@')) {
      setEmail(manualEmail);
      sessionStorage.setItem('pendingVerificationEmail', manualEmail);
      setShowManualEntry(false);
      setMessage('');
    }
  };

  console.log('VERIFY PAGE: About to render JSX');

  try {
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
            Vérification email requise
          </p>
        </div>

        {/* Verification Required Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl dark:shadow-gray-900/50 p-8 border border-biat-100 dark:border-gray-700">
          {showManualEntry ? (
            /* Manual Email Entry Form */
            <>
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-6">
                <svg
                  className="w-12 h-12 text-yellow-600 dark:text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-semibold text-biat-primary dark:text-biat-accent mb-4">
                Vérification email requise
              </h2>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Veuillez entrer votre adresse email pour renvoyer le lien de vérification
              </p>

              <form onSubmit={handleManualEmailSubmit} className="space-y-4">
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="votre.email@biat.com.tn"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-biat-primary dark:bg-gray-700 dark:text-white"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-biat-primary hover:bg-biat-accent text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Continuer
                </button>
              </form>

              <Link
                to="/login"
                onClick={() => sessionStorage.removeItem('pendingVerificationEmail')}
                className="block mt-4 text-center text-biat-primary hover:text-biat-accent font-medium transition-colors"
              >
                Retour à la connexion
              </Link>
            </div>
            </>
          ) : (
            /* Normal Verification UI */
            <>
            <div className="text-center py-4">
              {/* Email Icon */}
              <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-6">
                <svg
                  className="w-12 h-12 text-yellow-600 dark:text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-semibold text-biat-primary dark:text-biat-accent mb-4">
                Veuillez vérifier votre email
              </h2>

              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Un email de vérification a été envoyé à :
              </p>

              <p className="text-biat-primary dark:text-biat-accent font-semibold mb-6">
                {email}
              </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-4 mb-6 text-left">
              <div className="flex">
                <svg className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-semibold mb-1">Vérifiez votre boîte de réception</p>
                  <p>Cliquez sur le lien dans l'email pour activer votre compte. N'oubliez pas de vérifier vos spams si vous ne le trouvez pas.</p>
                </div>
              </div>
            </div>

            {message && (
              <div className={`mb-4 p-4 rounded-lg text-sm border-l-4 ${
                messageType === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-500 dark:border-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-500 dark:border-red-400'
              }`}>
                <div className="flex">
                  {messageType === 'success' ? (
                    <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                    </svg>
                  )}
                  <span>{message}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleResendVerification}
              disabled={resendLoading || cooldownSeconds > 0}
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
              ) : cooldownSeconds > 0 ? (
                `Renvoyer dans ${cooldownSeconds}s`
              ) : (
                'Renvoyer l\'email de vérification'
              )}
            </button>

            <Link
              to="/login"
              onClick={() => sessionStorage.removeItem('pendingVerificationEmail')}
              className="block text-center text-biat-primary hover:text-biat-accent font-medium transition-colors"
            >
              Retour à la connexion
            </Link>
            </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-biat-secondary/60 dark:text-gray-400">
          <p>© 2025 Assurances BIAT. Tous droits réservés.</p>
        </div>
      </div>
    </div>
    );
  } catch (error) {
    console.error('VERIFY PAGE: RENDER ERROR:', error);
    console.trace('VERIFY PAGE: Render error stack trace');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">
          <h1>Error in VerificationRequiredPage</h1>
          <pre>{String(error)}</pre>
        </div>
      </div>
    );
  }
}
