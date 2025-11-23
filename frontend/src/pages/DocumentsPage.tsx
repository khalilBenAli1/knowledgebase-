import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import PDFViewer from '../components/PDFViewer';
import toast from 'react-hot-toast';

interface Document {
  id: string;
  name: string;
  originalFilename: string;
  status: string;
  version: string;
  createdAt: string;
  uploader?: { name: string };
  filePath?: string;
  ocrText?: string | null;
  ocrProcessedAt?: string | null;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [publishingDoc, setPublishingDoc] = useState<string | null>(null);
  const [publishProgress, setPublishProgress] = useState({
    ocr: false,
    parsing: false,
    publishing: false,
  });
  const { user } = useAuthStore();

  const isHR = user?.role?.name === 'Gestionnaire RH';
  // const isITAdmin = user?.role?.name === 'IT Admin'; // Reserved for future use

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await api.get('/documents');
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to load documents', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploadé avec succès!');
      loadDocuments();
    } catch (error) {
      console.error('Failed to upload document', error);
      toast.error('Erreur lors de l\'upload du document');
    } finally {
      setUploading(false);
    }
  };

  // Reserved for future use
  // const handleApprove = async (id: string) => {
  //   try {
  //     await api.post(`/documents/${id}/approve`);
  //     toast.success('Document approuvé!');
  //     loadDocuments();
  //   } catch (error) {
  //     console.error('Failed to approve document', error);
  //     toast.error('Erreur lors de l\'approbation');
  //   }
  // };

  const handlePublish = async (id: string) => {
    try {
      setPublishingDoc(id);
      setPublishProgress({ ocr: false, parsing: false, publishing: false });

      // Simulate progress steps (since backend does everything in one call)
      setTimeout(() => setPublishProgress({ ocr: true, parsing: false, publishing: false }), 500);
      setTimeout(() => setPublishProgress({ ocr: true, parsing: true, publishing: false }), 1500);

      await api.post(`/documents/${id}/publish`);

      setPublishProgress({ ocr: true, parsing: true, publishing: true });

      // Show success briefly before closing
      setTimeout(() => {
        setPublishingDoc(null);
        setPublishProgress({ ocr: false, parsing: false, publishing: false });
        toast.success('Document publié avec succès!');
        loadDocuments();
      }, 1000);
    } catch (error: any) {
      console.error('Failed to publish document', error);
      setPublishingDoc(null);
      setPublishProgress({ ocr: false, parsing: false, publishing: false });
      toast.error(error.response?.data?.message || 'Erreur lors de la publication du document');
    }
  };

  const handleDelete = async (id: string, docName: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le document "${docName}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document supprimé!');
      loadDocuments();
    } catch (error) {
      console.error('Failed to delete document', error);
      toast.error('Erreur lors de la suppression du document');
    }
  };

  // Reserved for future use
  // const handleProcess = async (id: string) => {
  //   try {
  //     await api.post(`/ingestion/process/${id}`);
  //     toast.success('Traitement du document commencé');
  //     loadDocuments();
  //   } catch (error) {
  //     console.error('Failed to process document', error);
  //     toast.error('Erreur lors du traitement');
  //   }
  // };

  const handlePreview = (doc: Document) => {
    setSelectedDocument(doc);
    setShowPreviewModal(true);
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await api.get(`/documents/${doc.id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.originalFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download document', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleViewPDF = async (doc: Document) => {
    try {
      // Check if document is PDF
      if (!doc.originalFilename.toLowerCase().endsWith('.pdf')) {
        toast.error('Seuls les fichiers PDF peuvent être prévisualisés');
        return;
      }

      toast.loading('Chargement du PDF...', { id: 'pdf-load' });

      const response = await api.get(`/documents/${doc.id}/download`, {
        responseType: 'blob',
      });

      // Check if response is valid
      if (!response.data || response.data.size === 0) {
        throw new Error('Le fichier PDF est vide ou n\'existe pas');
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      setPdfUrl(url);
      setShowPDFViewer(true);
      setShowPreviewModal(false);
      toast.success('PDF chargé!', { id: 'pdf-load' });
    } catch (error: any) {
      console.error('Failed to load PDF', error);
      toast.error(error.response?.data?.message || error.message || 'Erreur lors du chargement du PDF', { id: 'pdf-load' });
    }
  };

  const closePDFViewer = () => {
    setShowPDFViewer(false);
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl('');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      uploaded: 'bg-gray-100 text-gray-700 border border-gray-300',
      parsed: 'bg-biat-100 text-biat-700 border border-biat-300',
      awaiting_approval: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      approved: 'bg-green-100 text-green-700 border border-green-300',
      published: 'bg-biat-primary text-white border border-biat-primary',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border border-gray-300';
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      searchTerm === '' ||
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.originalFilename.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === '' || doc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const uniqueStatuses = Array.from(new Set(documents.map((doc) => doc.status)));

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="p-3 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-biat-primary dark:text-biat-300">Gestion des Documents</h1>
          {isHR && (
            <label className="bg-biat-primary text-white px-4 md:px-6 py-2 md:py-3 rounded-lg cursor-pointer hover:bg-biat-accent transition-all shadow-sm hover:shadow-md flex items-center justify-center space-x-2 text-sm md:text-base">
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>{uploading ? 'Upload...' : 'Uploader'}</span>
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.docx"
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rechercher</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par nom ou fichier..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-biat-primary"
                />
                <svg
                  className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filtrer par statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-biat-primary"
              >
                <option value="">Tous les statuts</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {filteredDocuments.length} document{filteredDocuments.length > 1 ? 's' : ''} trouvé
            {filteredDocuments.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Documents - Desktop Table */}
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-biat-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary dark:text-gray-300 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary dark:text-gray-300 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary dark:text-gray-300 uppercase tracking-wider">
                  OCR
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary dark:text-gray-300 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Aucun document trouvé
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-biat-secondary dark:text-gray-300">{doc.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{doc.originalFilename}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {doc.ocrText ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Oui
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Non
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {doc.version}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                      <button
                        onClick={() => handlePreview(doc)}
                        className="text-biat-primary hover:text-biat-accent font-medium transition-colors"
                        title="Voir"
                      >
                        <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="text-biat-primary hover:text-biat-accent font-medium transition-colors"
                        title="Télécharger"
                      >
                        <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      {(doc.status === 'uploaded' || doc.status === 'parsed' || doc.status === 'approved') && isHR && (
                        <button
                          onClick={() => handlePublish(doc.id)}
                          disabled={publishingDoc === doc.id}
                          className="text-green-600 hover:text-green-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {publishingDoc === doc.id ? 'En cours...' : 'Publier'}
                        </button>
                      )}
                      {isHR && (
                        <button
                          onClick={() => handleDelete(doc.id, doc.name)}
                          className="text-red-600 hover:text-red-800 font-medium transition-colors"
                          title="Supprimer"
                        >
                          <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Documents - Mobile Cards */}
        <div className="md:hidden space-y-4">
          {filteredDocuments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center text-gray-500 dark:text-gray-400">
              Aucun document trouvé
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                <div className="mb-3">
                  <h3 className="text-base font-semibold text-biat-secondary dark:text-gray-300 mb-1">{doc.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{doc.originalFilename}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Statut:</span>
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Version:</span>
                    <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{doc.version}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Date:</span>
                    <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{new Date(doc.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handlePreview(doc)}
                    className="flex-1 min-w-[100px] bg-biat-primary text-white px-3 py-2 rounded-lg hover:bg-biat-accent transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Voir
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="flex-1 min-w-[100px] bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Télécharger
                  </button>
                </div>

                {/* Admin Actions */}
                {(doc.status === 'uploaded' || doc.status === 'parsed' || doc.status === 'approved') && isHR && (
                  <button
                    onClick={() => handlePublish(doc.id)}
                    disabled={publishingDoc === doc.id}
                    className="w-full mt-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {publishingDoc === doc.id && (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {publishingDoc === doc.id ? 'Publication en cours...' : 'Publier'}
                  </button>
                )}
                {isHR && (
                  <button
                    onClick={() => handleDelete(doc.id, doc.name)}
                    className="w-full mt-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Supprimer
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] md:max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1 mr-4">
                <h2 className="text-lg md:text-2xl font-bold text-biat-primary dark:text-biat-300 break-words">{selectedDocument.name}</h2>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 break-all">{selectedDocument.originalFilename}</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-3 md:p-6">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 md:p-6 mb-3 md:mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Statut:</span>
                    <span className={`ml-2 px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedDocument.status)}`}>
                      {selectedDocument.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Version:</span>
                    <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">{selectedDocument.version}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Date de création:</span>
                    <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                      {new Date(selectedDocument.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Uploadé par:</span>
                    <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">{selectedDocument.uploader?.name || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* PDF Preview Placeholder */}
              <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-64 md:h-96 flex items-center justify-center">
                <div className="text-center px-4">
                  <svg className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400 mb-2 text-sm md:text-base">Prévisualisation du document</p>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-3 md:mb-4">
                    {selectedDocument.originalFilename.toLowerCase().endsWith('.pdf')
                      ? 'Cliquez sur le bouton pour ouvrir le lecteur PDF'
                      : 'Seuls les fichiers PDF peuvent être prévisualisés'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-center">
                    {selectedDocument.originalFilename.toLowerCase().endsWith('.pdf') && (
                      <button
                        onClick={() => handleViewPDF(selectedDocument)}
                        className="bg-biat-primary text-white px-4 md:px-6 py-2 rounded-lg hover:bg-biat-accent transition-all flex items-center justify-center gap-2 text-sm md:text-base shadow-md hover:shadow-lg"
                      >
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ouvrir le PDF
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(selectedDocument)}
                      className="bg-gray-600 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-gray-700 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Télécharger
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      {showPDFViewer && pdfUrl && (
        <PDFViewer fileUrl={pdfUrl} onClose={closePDFViewer} />
      )}

      {/* Publishing Progress Modal */}
      {publishingDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-biat-primary dark:text-biat-300 mb-6 text-center">
              Publication en cours...
            </h3>

            <div className="space-y-4">
              {/* OCR Step */}
              <div className="flex items-center gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  publishProgress.ocr ? 'bg-green-500' : 'bg-biat-primary'
                }`}>
                  {publishProgress.ocr ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 dark:text-gray-200">Extraction du texte (OCR)</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Lecture du document...</div>
                </div>
              </div>

              {/* Parsing Step */}
              <div className="flex items-center gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  publishProgress.parsing ? 'bg-green-500' : publishProgress.ocr ? 'bg-biat-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  {publishProgress.parsing ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : publishProgress.ocr ? (
                    <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 dark:text-gray-200">Traitement du document</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Analyse et indexation...</div>
                </div>
              </div>

              {/* Publishing Step */}
              <div className="flex items-center gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  publishProgress.publishing ? 'bg-green-500' : publishProgress.parsing ? 'bg-biat-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  {publishProgress.publishing ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : publishProgress.parsing ? (
                    <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 dark:text-gray-200">Publication</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Mise en ligne du document...</div>
                </div>
              </div>
            </div>

            {publishProgress.publishing && (
              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold">Document publié avec succès!</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
