import { useState } from 'react';
import api from '../services/api';

interface FormationRequestModalProps {
  formationId?: string | null;
  formationTitle?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FormationRequestModal({
  formationId,
  formationTitle,
  onClose,
  onSuccess,
}: FormationRequestModalProps) {
  const [isCustomRequest, setIsCustomRequest] = useState(!formationId);
  const [message, setMessage] = useState('');

  // Custom formation fields
  const [customTitle, setCustomTitle] = useState('');
  const [customDetails, setCustomDetails] = useState('');
  const [customLink, setCustomLink] = useState('');
  const [customDate, setCustomDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate custom request fields
    if (isCustomRequest && !customTitle.trim()) {
      setError('Le titre de la formation est requis');
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        requesterMessage: message || undefined,
      };

      if (isCustomRequest) {
        // Custom formation request
        payload.customFormationTitle = customTitle;
        payload.customFormationDetails = customDetails || undefined;
        payload.customFormationLink = customLink || undefined;
        payload.customFormationDate = customDate || undefined;
      } else {
        // Catalog formation request
        payload.formationId = formationId;
      }

      await api.post('/formation-requests', payload);

      alert('Votre demande a été envoyée à votre manager avec succès!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit formation request', err);
      setError(
        err.response?.data?.message ||
        'Erreur lors de l\'envoi de la demande. Vérifiez que vous avez un manager assigné.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto dark:bg-black/70">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl my-8 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-biat-primary dark:text-biat-primary">
            Demander une formation
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors dark:hover:bg-gray-700 dark:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toggle between catalog and custom */}
        {formationId && (
          <div className="mb-4 flex gap-2 p-1 bg-gray-100 rounded-lg dark:bg-gray-700">
            <button
              type="button"
              onClick={() => setIsCustomRequest(false)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                !isCustomRequest
                  ? 'bg-white text-biat-primary shadow-sm dark:bg-gray-800 dark:text-biat-primary'
                  : 'text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100'
              }`}
            >
              Formation du catalogue
            </button>
            <button
              type="button"
              onClick={() => setIsCustomRequest(true)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                isCustomRequest
                  ? 'bg-white text-biat-primary shadow-sm dark:bg-gray-800 dark:text-biat-primary'
                  : 'text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100'
              }`}
            >
              Formation personnalisée
            </button>
          </div>
        )}

        {/* Catalog formation info */}
        {!isCustomRequest && formationTitle && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/30 dark:border-blue-700">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Formation:</strong> {formationTitle}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Custom formation fields */}
          {isCustomRequest && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 dark:text-gray-300">
                  Titre de la formation <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:ring-biat-primary"
                  placeholder="Ex: Formation en gestion de projet"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 dark:text-gray-300">
                  Détails de la formation
                </label>
                <textarea
                  value={customDetails}
                  onChange={(e) => setCustomDetails(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:ring-biat-primary"
                  placeholder="Décrivez brièvement le contenu, les objectifs, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 dark:text-gray-300">
                  Lien (site web, brochure, etc.)
                </label>
                <input
                  type="url"
                  value={customLink}
                  onChange={(e) => setCustomLink(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:ring-biat-primary"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 dark:text-gray-300">
                  Date souhaitée
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:ring-biat-primary"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 dark:text-gray-300">
              Message pour votre manager (optionnel)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:ring-biat-primary"
              placeholder="Expliquez pourquoi vous souhaitez suivre cette formation..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/30 dark:border-red-700">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 dark:bg-biat-primary dark:text-white dark:hover:bg-biat-accent"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white dark:border-white"></div>
                  Envoi...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Envoyer la demande
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Annuler
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/30 dark:border-yellow-700">
          <p className="text-xs text-yellow-800 dark:text-yellow-300">
            <strong>Note:</strong> Votre demande sera envoyée à votre manager pour approbation.
            Vous recevrez une notification une fois qu'elle aura été examinée.
          </p>
        </div>
      </div>
    </div>
  );
}
