import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

interface ExtractedFormation {
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  location?: string;
  maxParticipants?: number;
}

export default function HRCatalogUploadPage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedFormations, setExtractedFormations] = useState<ExtractedFormation[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ExtractedFormation | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setExtractedFormations([]);
    } else {
      toast.error('Veuillez sélectionner un fichier PDF');
      e.target.value = '';
    }
  };

  const handleExtractPreview = async () => {
    if (!selectedFile) return;

    setExtracting(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Show processing toast
      toast('Traitement OCR en cours... Veuillez patienter (peut prendre jusqu\'à 2-3 minutes)', {
        icon: '⏳',
        duration: 5000,
      });

      // Increase timeout to 5 minutes for OCR processing
      const response = await api.post('/formations/catalog/extract-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minutes (300 seconds)
      });

      setExtractedFormations(response.data.formations);
      if (response.data.count === 0) {
        toast('Aucune formation n\'a pu être extraite du PDF. Vérifiez le format du document.', {
          icon: '⚠️',
        });
      } else {
        toast.success(`${response.data.count} formation(s) extraite(s) avec succès!`);
      }
    } catch (error: any) {
      console.error('Failed to extract formations', error);
      if (error.code === 'ECONNABORTED') {
        toast.error('Le traitement OCR prend trop de temps. Essayez avec un PDF plus petit ou contactez l\'administrateur.');
      } else {
        toast.error('Erreur lors de l\'extraction. Vérifiez que le PDF contient des informations de formations.');
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleUploadAndImport = async () => {
    if (!selectedFile) return;

    if (!confirm(`Voulez-vous importer ${extractedFormations.length} formation(s) ?`)) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Increase timeout for large PDF processing
      const response = await api.post('/formations/catalog/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minutes
      });

      toast.success(`Import terminé! ${response.data.imported} formation(s) importée(s) en mode brouillon.`, {
        duration: 4000,
      });

      // Reset form
      setSelectedFile(null);
      setExtractedFormations([]);

      // Navigate to formations page
      setTimeout(() => navigate('/formations'), 500);
    } catch (error: any) {
      console.error('Failed to import formations', error);
      toast.error(error.response?.data?.message || 'Erreur lors de l\'import des formations');
    } finally {
      setImporting(false);
    }
  };

  const handleEditFormation = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...extractedFormations[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editForm) {
      const updated = [...extractedFormations];
      updated[editingIndex] = editForm;
      setExtractedFormations(updated);
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleRemoveFormation = (index: number) => {
    if (confirm('Supprimer cette formation de la liste ?')) {
      setExtractedFormations(extractedFormations.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/formations')}
            className="mb-4 flex items-center gap-2 text-biat-primary dark:text-biat-300 hover:text-biat-accent dark:hover:text-biat-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour aux formations
          </button>
          <h1 className="text-3xl font-bold text-biat-primary dark:text-biat-300">Importer un catalogue de formations</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Téléchargez un PDF pour extraire automatiquement les formations</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">1. Sélectionnez un fichier PDF</h2>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-biat-primary dark:hover:border-biat-300 transition-colors">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>

              <div className="mb-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="px-6 py-3 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors inline-block font-medium">
                    Choisir un fichier PDF
                  </span>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {selectedFile && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg inline-block">
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setExtractedFormations([]);
                      }}
                      className="ml-4 p-2 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {selectedFile && extractedFormations.length === 0 && (
              <div className="mt-6">
                <button
                  onClick={handleExtractPreview}
                  disabled={extracting}
                  className="w-full px-6 py-4 bg-gradient-to-r from-biat-primary to-biat-accent text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                >
                  {extracting ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      Extraction en cours...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Extraire les formations
                    </>
                  )}
                </button>

                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>💡 Astuce:</strong> Le système va analyser le PDF et extraire automatiquement les formations.
                    Vous pourrez ensuite les modifier avant l'import final.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Extracted Formations */}
        {extractedFormations.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  2. Vérifiez et modifiez les formations ({extractedFormations.length})
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Vous pouvez modifier les informations avant l'import</p>
              </div>
              <button
                onClick={handleUploadAndImport}
                disabled={importing}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Import en cours...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Importer toutes les formations
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              {extractedFormations.map((formation, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
                  {editingIndex === index && editForm ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Titre</label>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary dark:bg-gray-700 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary resize-none dark:bg-gray-700 dark:text-gray-100"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Date de début</label>
                          <input
                            type="date"
                            value={editForm.startDate || ''}
                            onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary dark:bg-gray-700 dark:text-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Date de fin</label>
                          <input
                            type="date"
                            value={editForm.endDate || ''}
                            onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary dark:bg-gray-700 dark:text-gray-100"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Durée</label>
                          <input
                            type="text"
                            value={editForm.duration || ''}
                            onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                            placeholder="Ex: 3 jours"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Lieu</label>
                          <input
                            type="text"
                            value={editForm.location || ''}
                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                            placeholder="Ex: Tunis"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Max participants</label>
                          <input
                            type="number"
                            value={editForm.maxParticipants || ''}
                            onChange={(e) => setEditForm({ ...editForm, maxParticipants: parseInt(e.target.value) || undefined })}
                            placeholder="Ex: 20"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={handleSaveEdit}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          Sauvegarder
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-biat-primary dark:text-biat-300 flex-1">{formation.title}</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditFormation(index)}
                            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleRemoveFormation(index)}
                            className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">{formation.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {formation.startDate && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{new Date(formation.startDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        {formation.duration && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formation.duration}</span>
                          </div>
                        )}
                        {formation.location && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span>{formation.location}</span>
                          </div>
                        )}
                        {formation.maxParticipants && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>{formation.maxParticipants} max</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>ℹ️ Note:</strong> Les formations seront importées en mode <strong>brouillon</strong>.
                Vous devrez les activer manuellement depuis la page des formations.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
