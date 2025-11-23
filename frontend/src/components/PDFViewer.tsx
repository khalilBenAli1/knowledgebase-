import React from 'react';

interface PDFViewerProps {
  fileUrl: string;
  onClose: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Aperçu du document</h2>

          <div className="flex items-center gap-2">
            {/* Download button */}
            <a
              href={fileUrl}
              download
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Télécharger"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </a>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Fermer"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* PDF Content - Using browser's native PDF viewer */}
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title="PDF Viewer"
            onError={(e) => {
              console.error('Failed to load PDF in iframe', e);
            }}
          />
        </div>

        {/* Footer with info */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            💡 Utilisez les contrôles natifs de votre navigateur pour zoomer et naviguer
          </p>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
